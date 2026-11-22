import {safeAvatarUrl} from '/src/features/auth/header-auth.js';
import {createHttpClient} from '/src/shared/http-client.js';
import {v2Route} from '../routes.js';
import {ensureProjectSupportStyle,renderSupportFunding,showSupportFunding} from './support-funding.js?v=20261122supportlaunch';

const AUTH = 'https://auth.asgracing.ru';
const TIERS = [
  {id:'supporter', name:'Supporter', sponsrLevel:50024},
  {id:'vip', name:'VIP', sponsrLevel:50046},
  {id:'pro', name:'PRO', sponsrLevel:50047},
];
const SUPPORT_REQUEST = {cache:'no-store', headers:{Accept:'application/json'}};
const PRIVATE_REQUEST = {...SUPPORT_REQUEST, credentials:'include'};
const STATUS_URL = AUTH + '/v1/me/support';
const client = createHttpClient({defaultTimeoutMs:8000});
const findTier = id => TIERS.find(tier => tier.id === id);
const validDriver = id => typeof id === 'string' && /^drv_[a-z0-9]{1,64}$/.test(id);

export function startSupportPage({view, text, esc, language}) {
  ensureProjectSupportStyle();
  const perks = {
    supporter:text('Значок профиля, защита гоночного номера и роль Discord.','Profile badge, race number protection and Discord role.'),
    vip:text('Бонусы Supporter и анимированное оформление профиля. Резерв и красный ник в игровом чате готовятся.',
      'Supporter benefits and animated profile styling. Reserved slots and red chat names are in development.'),
    pro:text('Бонусы VIP. Эксклюзивные фоны и «Мой паддок» с витриной, прогрессом и карточками заездов готовятся.',
      'VIP benefits. Exclusive backgrounds and My Paddock with a race showcase, progress and race cards are in development.'),
  };
  view.innerHTML = `<div class="page-breadcrumb"><a href="${v2Route('',language)}">${text('Главная','Home')}</a><span>/</span><b>${text('Поддержка','Support')}</b></div>
    <section class="panel project-support-panel">
      <h1>${text('Поддержка ASG Racing','Support ASG Racing')}</h1>
      <p>${text('Подписка помогает оплачивать работу сайта, серверов и разработку.','Subscriptions help pay for the site, servers and development.')}</p>
      <p class="page-help">${text('Discord нужен для получения роли. Пробный доступ на 7 дней можно активировать один раз на Steam-аккаунт для уровня выше текущего.',
        'Discord is required for the Discord role. A 7-day trial is available once per Steam account for a tier above your current one.')}</p>
    </section>
    <div class="project-support-tiers">${TIERS.map(tier=>`<article class="panel project-support-panel">
      <h2>${tier.name}</h2><p>${perks[tier.id]}</p>
      <p class="page-help">${text('Для получения бонусов привяжите в настройках Sponsr тот же Steam-аккаунт, с которым входите в ASG.',
        'To receive benefits, link the same Steam account you use to sign in to ASG in your Sponsr settings.')}</p>
      <div class="project-support-actions">
        <a class="button primary" href="https://sponsr.ru/checkout/?project=asgracing&amp;lid=${tier.sponsrLevel}&amp;type=subscribe" target="_blank" rel="noopener noreferrer">${text('Оформить','Subscribe')}</a>
        <button class="button" type="button" data-support-trial="${tier.id}">${text('Попробовать бесплатно','Try for free')}</button>
      </div>
      <div class="page-help" data-trial-status role="status"></div>
    </article>`).join('')}</div>
    <section class="panel project-support-panel">
      <h2>${text('Кто поддерживает проект','Project supporters')}</h2>
      <p class="page-help">${text('Имена и аватары видны с согласия пилотов. Счётчик включает всех активных подписчиков, связанных с ASG.',
        'Names and avatars appear with the drivers’ consent. The totals include all active subscribers linked to ASG.')}</p>
      <p data-support-list-status role="status"></p>
      ${TIERS.map(tier=>`<section data-support-group="${tier.id}" hidden>
        <h3>${tier.name}</h3><ul class="project-support-list"></ul>
      </section>`).join('')}
      <button type="button" class="button" data-support-more hidden></button>
    </section>
    <section class="panel project-support-panel" data-support-funding>
      <h2>${text('Как продвигается сбор','Funding progress')}</h2>
      ${renderSupportFunding(text)}
    </section>`;
  const notice = view.querySelector('[data-support-list-status]');
  const funding = view.querySelector('[data-support-funding]');
  const groups = Object.fromEntries(TIERS.map(tier=>[tier.id,view.querySelector(`[data-support-group="${tier.id}"]`)]));
  const more = view.querySelector('[data-support-more]');
  const shown = new Set();
  let page = 1;
  let fundingLoading = false;
  wireTrial(view,text,v2Route('support/',language));
  async function refreshFunding() {
    if (document.hidden || fundingLoading) return;
    fundingLoading = true;
    try {
      const response = await client.requestJson(AUTH + '/v1/support/funding', {...SUPPORT_REQUEST, credentials:'omit'});
      if (!response || !Object.hasOwn(response,'progress')) throw new Error('missing_funding_progress');
      showSupportFunding(funding,response.progress,text);
    } catch {
      showSupportFunding(funding,null,text,text('Шкала временно недоступна','Funding progress is temporarily unavailable'));
    } finally {
      fundingLoading = false;
    }
  }
  void refreshFunding();
  setInterval(refreshFunding,300_000);
  document.addEventListener('visibilitychange',refreshFunding);
  async function load() {
    more.hidden = true;
    notice.textContent = text('Загружаем список…','Loading supporters…');
    try {
      const data = await client.requestJson(AUTH + '/v1/support?page=' + page, {...SUPPORT_REQUEST, credentials:'omit'});
      if (data?.status === 'pending') {
        notice.textContent = text('Первая сверка подписок ещё не завершена.','The first subscription check is pending.');
        return;
      }
      const counts = TIERS.map(tier=>data?.totals?.[tier.id]);
      if (counts.some(value=>!Number.isSafeInteger(value) || value < 0) || !Array.isArray(data?.entries)) {
        throw new Error('invalid_support_listing');
      }
      for (const entry of data.entries) {
        const tier = findTier(entry?.tier);
        if (!tier || !validDriver(entry.public_id) || typeof entry.display_name !== 'string' || shown.has(entry.public_id)) continue;
        const url = v2Route('driver/',language) + '?id=' + encodeURIComponent(entry.public_id);
        const avatar = safeAvatarUrl(entry.avatar_url);
        const group = groups[tier.id];
        group.querySelector('ul').insertAdjacentHTML('beforeend', `<li><a href="${url}">${avatar ? `<img src="${esc(avatar)}" width="32" height="32" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}<span>${esc(entry.display_name)}</span></a></li>`);
        group.hidden = false;
        shown.add(entry.public_id);
      }
      const total = counts.reduce((sum,count)=>sum + count,0);
      notice.textContent = text('Подписчиков: ','Subscribers: ') + total +
        ' · ' + TIERS.map((tier,index)=>`${tier.name} ${counts[index]}`).join(' · ');
      if (!total) notice.append(' · ',text('Активных подписчиков пока нет.','There are no active subscribers yet.'));
      if (!shown.size && total) notice.append(' · ',text('Имена пока скрыты.','Names are currently hidden.'));
      if (data.next_page === page + 1) {
        page = data.next_page;
        more.hidden = false;
        more.textContent = text('Показать ещё','Show more');
      }
    } catch {
      notice.textContent = text('Список поддержки временно недоступен','Supporters list temporarily unavailable');
      more.hidden = false;
      more.textContent = text('Повторить','Retry');
    }
  }
  more.addEventListener('click',()=>void load());
  void load();
}

function wireTrial(view,text,returnPath) {
  const buttons = [...view.querySelectorAll('[data-support-trial]')];
  const unavailable = text('Пробный доступ сейчас недоступен.','Trial access is currently unavailable.');
  const used = text('Пробный период для этого Steam-аккаунта уже использован.',
    'This Steam account has already used its trial.');
  for (const button of buttons) button.addEventListener('click',async () => {
    const notice = button.parentElement.nextElementSibling;
    const tier = findTier(button.dataset.supportTrial);
    let started = false;
    for (const other of buttons) {
      other.disabled = true;
      other.parentElement.nextElementSibling.replaceChildren();
    }
    notice.textContent = text('Проверяем доступ…','Checking eligibility…');
    try {
      const auth = await client.requestJson(AUTH + '/v1/me',PRIVATE_REQUEST);
      if (!auth.authenticated) {
        const login = document.createElement('a');
        login.className = 'text-link';
        login.href = AUTH + '/v1/auth/steam/start?return_path=' + encodeURIComponent(returnPath);
        login.textContent = text('Войдите через Steam, чтобы попробовать','Sign in through Steam to start a trial');
        notice.replaceChildren(login);
        return;
      }
      const {trial} = await client.requestJson(STATUS_URL,PRIVATE_REQUEST);
      if (!auth.csrf_token || !Array.isArray(trial?.eligible_tiers)) {
        notice.textContent = unavailable;
        return;
      }
      if (trial.used || !trial.eligible_tiers.includes(tier.id)) {
        notice.textContent = trial.used ? used : text('Этот уровень недоступен для пробного периода.',
          'This tier is not eligible for a trial.');
        return;
      }
      const confirmed = window.confirm(text(
        `Активировать ${tier.name} на 7 дней? Пробный период начнётся сейчас. Списаний не будет.`,
        `Start a 7-day ${tier.name} trial now? You won't be charged.`));
      if (!confirmed) {
        notice.replaceChildren();
        return;
      }
      await client.requestJson(STATUS_URL+'/trial',{
        ...PRIVATE_REQUEST,method:'POST',
        headers:{...PRIVATE_REQUEST.headers,'Content-Type':'application/json','X-CSRF-Token':auth.csrf_token},
        body:JSON.stringify({tier:tier.id}),
      });
      started = true;
      notice.textContent = text(`${tier.name} активирован на 7 дней.`,`${tier.name} is active for 7 days.`);
    } catch (error) {
      notice.textContent = error.status === 409
        ? text('Доступ изменился. Нажмите ещё раз, чтобы проверить статус.','Eligibility changed. Try again to refresh your status.')
        : unavailable;
    } finally {
      for (const other of buttons) other.disabled = started;
    }
  });
}

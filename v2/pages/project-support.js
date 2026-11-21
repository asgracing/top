import {safeAvatarUrl} from '/src/features/auth/header-auth.js';
import {createHttpClient} from '/src/shared/http-client.js';
import {v2Route} from '../routes.js';
import {ensureProjectSupportStyle,renderSupportFunding,showSupportFunding} from './support-funding.js?v=20261120funding1';

const AUTH = 'https://auth.asgracing.ru';
const TIERS = [
  {id:'supporter', name:'Supporter'},
  {id:'vip', name:'VIP'},
  {id:'pro', name:'PRO'},
];
const SUPPORT_REQUEST = {cache:'no-store', headers:{Accept:'application/json'}};
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
      <p class="page-help">${text('Для связи подписки с ASG используйте в Sponsr тот же Steam-аккаунт. Discord нужен для получения роли.',
        'Use the same Steam account on Sponsr and ASG to link your subscription. Discord is required for the Discord role.')}</p>
    </section>
    <div class="project-support-tiers">${TIERS.map(tier=>`<article class="panel project-support-panel">
      <h2>${tier.name}</h2><p>${perks[tier.id]}</p>
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
  void client.requestJson(AUTH + '/v1/support/funding', {...SUPPORT_REQUEST, credentials:'omit'})
    .then(response=>showSupportFunding(funding,response?.progress,text))
    .catch(()=>showSupportFunding(funding,null,text,text('Шкала временно недоступна','Funding progress is temporarily unavailable')));
  async function load() {
    more.hidden = true;
    notice.textContent = text('Загружаем список…','Loading supporters…');
    try {
      const data = await client.requestJson(AUTH + '/v1/support?page=' + page, {...SUPPORT_REQUEST, credentials:'omit'});
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

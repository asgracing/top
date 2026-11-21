import {formatMoscowDateTime} from '/src/shared/time.js';

const BASE = '/v1/portal-ops/support-members';
const LEVELS = {supporter:'Supporter', vip:'VIP', pro:'PRO'};

export function mountSupportMembers({root,api,auth,text}) {
  root.innerHTML = `<h3>${text('Доступ по уровням','Access by tier')}</h3>
    <p class="page-help">${text('Прогноз — активные подписки × цена тарифа, без комиссий и возвратов.',
      'Estimate: active subscriptions × tier price, before fees and refunds.')}</p>
    <ul data-member-totals></ul>
    <form class="portal-support-member-controls">
      <label class="control-field">${text('Действующий уровень','Effective tier')}<select name="tier">
        <option value="all">${text('Все тарифы','All tiers')}</option>
        ${Object.entries(LEVELS).map(([key,name])=>`<option value="${key}">${name}</option>`).join('')}
        <option value="admin">ADMIN</option>
      </select></label>
      <label class="control-field">${text('Имя пилота','Driver name')}<input name="q" type="search" maxlength="100"></label>
      <button class="button" type="submit">${text('Найти','Search')}</button>
    </form>
    <p role="status"></p><ul class="project-support-list" data-members></ul>
    <div class="control-actions"><button class="button" type="button" data-prev hidden>${text('Назад','Previous')}</button>
      <button class="button" type="button" data-next hidden>${text('Дальше','Next')}</button></div>`;
  const form = root.querySelector('form');
  const status = root.querySelector('[role="status"]');
  const totals = root.querySelector('[data-member-totals]');
  const members = root.querySelector('[data-members]');
  const previous = root.querySelector('[data-prev]');
  const next = root.querySelector('[data-next]');
  const ru = document.documentElement.lang !== 'en';
  const money = new Intl.NumberFormat(ru?'ru-RU':'en-GB',{style:'currency',currency:'RUB'});
  let generation = 0, controller, loaded = false;

  function resetRows() {
    totals.replaceChildren();
    members.replaceChildren();
    previous.hidden = next.hidden = true;
  }

  function row(entry, page, ticket) {
    const item = document.createElement('li');
    const info = document.createElement('div');
    const visibility = entry.suppressed ? text('Скрыт владельцем','Hidden by owner') :
      entry.consented ? text('Опубликован с согласия','Visible with consent') : text('Нет согласия пилота','Driver consent missing');
    const parts = [entry.display_name, entry.tier==='admin' ? 'ADMIN' : LEVELS[entry.tier]];
    if (entry.paid_tier) parts.push(text('Оплата','Paid')+' '+LEVELS[entry.paid_tier],
      text('До ','Through ')+formatMoscowDateTime(entry.paid_until,ru?'ru-RU':'en-GB')+' MSK',visibility);
    if (entry.manual_tier) parts.push(text('Ручной доступ','Manual access')+' '+LEVELS[entry.manual_tier]+' '+
      (entry.manual_ends_at ? formatMoscowDateTime(entry.manual_ends_at,ru?'ru-RU':'en-GB')+' MSK' :
        text('бессрочно','indefinitely')));
    info.textContent = parts.join(' · ');
    const button = document.createElement('button');
    button.className = 'button';
    button.type = 'button';
    button.textContent = entry.suppressed ? text('Снять ограничение','Remove restriction') : text('Скрыть из списка','Hide from list');
    button.hidden = !auth()?.permissions?.supportManage;
    button.disabled = button.hidden || (!entry.suppressed && !entry.consented);
    button.onclick = async () => {
      button.disabled = true;
      try {
        await api(BASE+'/'+encodeURIComponent(entry.public_id)+'/visibility',{
          method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':auth()?.csrfToken || ''},
          body:JSON.stringify({suppressed:!entry.suppressed,expected_revision:entry.revision}),
        });
        if (ticket===generation) await load(page);
      } catch (error) {
        if (ticket!==generation) return;
        if (error.message==='support_visibility_changed') {
          await load(page);
          return;
        }
        status.textContent = error.message==='recent_auth_required'
          ? text('Войдите через Steam заново.','Sign in with Steam again.')
          : text('Не удалось изменить публичный показ.','Could not change public visibility.');
        button.disabled = false;
      }
    };
    item.append(info);
    if (entry.paid_tier) item.append(button);
    return item;
  }

  async function load(page) {
    const permissions = auth()?.permissions;
    if (!permissions?.supportManage && !permissions?.supportFinanceManage) return;
    controller?.abort();
    controller = new AbortController();
    const ticket = ++generation;
    resetRows();
    status.textContent = text('Загружаем список…','Loading subscribers…');
    const query = new URLSearchParams({tier:form.elements.tier.value,q:form.elements.q.value.trim(),page});
    try {
      const data = await api(BASE+'?'+query,{signal:controller.signal});
      if (ticket!==generation) return;
      loaded = true;
      if (!data.totals) {
        status.textContent = text('Сверка Sponsr ещё не подтверждена.','The Sponsr check has not been confirmed yet.');
      } else {
        let count = 0, amount = 0;
        for (const [key,name] of Object.entries(LEVELS)) {
          const li = document.createElement('li');
          count += data.totals[key];
          amount += data.monthly_equivalent[key];
          li.textContent = `${name} · ${data.totals[key]} · ${money.format(data.monthly_equivalent[key]/100)}`;
          totals.append(li);
        }
        const total = document.createElement('li');
        total.textContent = `${text('Итого','Total')} · ${count} · ${money.format(amount/100)}`;
        totals.append(total);
        const confirmed = formatMoscowDateTime(data.sync.last_confirmed_at,ru?'ru-RU':'en-GB');
        status.textContent = (data.sync.status==='current' ? text('Сверка','Checked') :
          text('Последняя подтверждённая сверка','Last confirmed check')) + ' · '+confirmed+' MSK';
      }
      if (!data.entries.length) status.append(' · ',text('Пилоты не найдены','No drivers found'));
      members.replaceChildren(...data.entries.map(entry=>row(entry,page,ticket)));
      previous.hidden = page<=1;
      previous.onclick = ()=>void load(page-1);
      next.hidden = data.next_page!==page+1;
      next.onclick = ()=>void load(page+1);
    } catch {
      if (ticket!==generation) return;
      loaded = false;
      status.textContent = text('Список недоступен. Повторите поиск.','List unavailable. Try again.');
    }
  }

  form.onsubmit = event=>{event.preventDefault();void load(1);};
  form.elements.tier.onchange = ()=>void load(1);
  return {
    open(){if(!loaded)void load(1);},
    refresh(){void load(1);},
    reset(){generation++;controller?.abort();loaded=false;form.reset();resetRows();status.textContent='';},
  };
}

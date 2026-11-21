import {ensureProjectSupportStyle,renderSupportFunding,showSupportFunding} from '/v2/pages/support-funding.js?v=20261120funding1';
import {mountSupportMembers} from './support-members.js?v=20261121support1';
import {canManageSupportGrants,mountSupportGrants} from './support-grants.js?v=20261120grantpermission1';

const GROUPS = {
  operating:['Функционирование проекта','Project operations'],
  development:['Развитие проекта','Project development'],
};

function parseRoubles(value) {
  const match = /^(\d{1,10})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[1])*100 + Number((match[2] || '').padEnd(2,'0'));
  return amount <= 100_000_000_000 ? amount : null;
}

export function mountSupportBudget({root,api,auth,text,confirmAction}) {
  ensureProjectSupportStyle();
  root.classList.add('panel','project-support-panel');
  root.innerHTML = `<h2>${text('Поддержка проекта','Project support')}</h2>
    <details data-support-grants hidden></details>
    <div data-support-finance hidden>
    <section data-support-members></section>
    <h3>${text('Бюджет месяца','Monthly budget')}</h3>
    <label class="control-field">${text('Месяц отчёта, МСК','Report month, MSK')} <input type="month" min="2000-01" max="2099-12" data-month></label>
    <p data-budget-status role="status"></p>
    <p data-budget-total hidden></p>
    <form data-budget-form hidden>
      <fieldset class="portal-support-fieldset">
        <label class="control-field">${text('Подтверждённые поступления, ₽','Confirmed funding, RUB')}
          <input name="confirmed" type="text" inputmode="decimal" aria-describedby="portal-support-confirmed-help"></label>
        <p class="page-help" id="portal-support-confirmed-help">${text('Введите подтверждённую сумму за месяц. Пустое поле означает, что сумма пока неизвестна.',
          'Enter the confirmed amount for the month. Leave blank if it is unknown.')}</p>
        <div data-budget-items></div>
        <button class="button" type="button" data-add-item>${text('Добавить статью','Add cost item')}</button>
        <div class="control-actions">
          <button class="button" type="submit">${text('Сохранить черновик','Save draft')}</button>
          <button class="button primary" type="button" data-publish>${text('Опубликовать шкалу','Publish progress')}</button>
        </div>
      </fieldset>
    </form>
    <section data-budget-preview hidden>
      <h3>${text('Предпросмотр шкалы из сохранённого черновика','Progress preview from the saved draft')}</h3>
      ${renderSupportFunding(text)}
    </section>
    <details data-budget-audit hidden><summary>${text('История изменений','Change history')}</summary><ul></ul></details>
    </div>`;
  const month = root.querySelector('[data-month]');
  const form = root.querySelector('form');
  const fieldset = root.querySelector('fieldset');
  const finance = root.querySelector('[data-support-finance]');
  const status = finance.querySelector('[role="status"]');
  const total = root.querySelector('[data-budget-total]');
  const items = root.querySelector('[data-budget-items]');
  const preview = root.querySelector('[data-budget-preview]');
  const audit = root.querySelector('[data-budget-audit]');
  const publish = root.querySelector('[data-publish]');
  const supportMembers = mountSupportMembers({root:root.querySelector('[data-support-members]'),api,auth,text});
  const grants = root.querySelector('[data-support-grants]');
  const supportGrants = mountSupportGrants({root:grants,api,auth,text,confirmAction,
    onChange:()=>{if (allowed()) supportMembers.refresh();}});
  const currentMonth = () => new Intl.DateTimeFormat('sv-SE',{
    year:'numeric',month:'2-digit',timeZone:'Europe/Moscow',
  }).format(new Date());
  const moneyInput = amount => amount == null ? '' : (amount/100).toFixed(2);
  const endpoint = () => '/v1/portal-ops/support-budget/' + encodeURIComponent(month.value);
  const allowed = () => auth()?.authenticated && auth()?.permissions?.portalManage && (auth().permissions.supportManage || auth().permissions.supportFinanceManage);
  let state = null, generation = 0, activeRequest, sessionUrl = '';

  function addItem(item = {}) {
    if (items.children.length >= 50) return;
    const row = document.createElement('div');
    row.className = 'portal-support-item';
    row.innerHTML = `<label class="control-field">${text('Статья','Cost item')}<input name="item_name" maxlength="100" required></label>
      <label class="control-field">${text('Категория','Category')}<select name="group">${Object.entries(GROUPS).map(([id,label])=>
        `<option value="${id}">${text(...label)}</option>`).join('')}</select></label>
      <label class="control-field">${text('Сумма, ₽','Amount, RUB')}<input name="amount" inputmode="decimal" required></label>
      <button class="button" type="button">${text('Убрать','Remove')}</button>`;
    row.querySelector('[name="item_name"]').value = item.name || '';
    row.querySelector('[name="group"]').value = item.group || 'operating';
    row.querySelector('[name="amount"]').value = moneyInput(item.amount);
    row.querySelector('button').addEventListener('click',()=>{row.remove();publish.disabled=true;});
    items.append(row);
  }

  function render(data) {
    state = data;
    form.elements.confirmed.value = moneyInput(data.draft?.confirmed);
    items.replaceChildren();
    const defaults = [
      {name:text('Аренда сервера сайта','Website hosting')},
      {name:text('Электричество','Electricity')},
      {name:text('Интернет','Internet')},
      {name:text('Разработка','Development'),group:'development'},
    ];
    for (const item of data.draft?.items ?? defaults) addItem(item);
    total.hidden = !data.draft;
    const sum = (data.draft?.items ?? []).reduce((amount,item)=>amount+item.amount,0);
    const currency = new Intl.NumberFormat(document.documentElement.lang,{style:'currency',currency:'RUB'});
    total.textContent = text('Итого расходов по сохранённому черновику','Total expenses in saved draft')+' · '+currency.format(sum/100);
    form.hidden = false;
    preview.hidden = !data.draft;
    showSupportFunding(preview,data.preview,text,data.preview
      ? text('Предпросмотр сохранённого черновика','Saved draft preview')
      : text('Укажите подтверждённую сумму и цели для обеих частей','Enter confirmed funding and goals for both stages'));
    publish.disabled = !data.preview;
    audit.hidden = !data.history?.length;
    audit.querySelector('ul').replaceChildren(...(data.history || []).map(entry=>{
      const li=document.createElement('li');
      const time = new Date(entry.recorded_at).toLocaleString(undefined,{timeZone:'Europe/Moscow'});
      li.textContent = `№${entry.revision} · ${entry.action==='publish'?text('Публикация','Published'):text('Черновик','Draft')} · ${entry.actor_public_id} · ${time}`;
      return li;
    }));
    status.textContent = data.published ? text('У месяца есть опубликованная версия.','This month has a published report.') : '';
  }

  async function load() {
    if (!allowed() || !month.value || !month.validity.valid) return;
    activeRequest?.abort();
    activeRequest = new AbortController();
    sessionUrl = endpoint();
    state = null;
    const ticket = ++generation;
    form.hidden = preview.hidden = audit.hidden = total.hidden = true;
    status.textContent = text('Загружаем отчёт…','Loading report…');
    try {
      const result = await api(sessionUrl,{signal:activeRequest.signal});
      if (generation===ticket && allowed()) render(result);
    } catch {
      if (generation===ticket) status.textContent = text('Не удалось загрузить отчёт.','Could not load the report.');
    }
  }

  function draft() {
    const raw = form.elements.confirmed.value;
    const confirmed = parseRoubles(raw);
    if (raw.trim() && confirmed === null) return null;
    const rows = [...items.children].map(row=>({
      name:row.querySelector('[name="item_name"]').value.trim(),
      group:row.querySelector('[name="group"]').value,
      amount:parseRoubles(row.querySelector('[name="amount"]').value),
    }));
    return rows.some(item=>!item.name || item.amount===null) ? null : {confirmed,items:rows};
  }

  async function write(action) {
    if (!state || !allowed() || fieldset.disabled) return;
    const body = {expected_revision:state.revision};
    if (action==='draft') {
      body.plan = draft();
      if (!body.plan) {
        status.textContent = text('Проверьте названия и суммы статей.','Check cost item names and amounts.');
        return;
      }
    }
    const current = generation;
    fieldset.disabled = month.disabled = true;
    try {
      if (action==='publish' && !await confirmAction(text('Опубликовать шкалу из сохранённого черновика?',
        'Publish progress from the saved draft?'))) return;
      if (current!==generation || !allowed()) return;
      await api(endpoint()+'/'+action,{
        method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':auth().csrfToken},
        body:JSON.stringify(body),
      });
      if (current===generation) await load();
    } catch (error) {
      if (current!==generation) return;
      status.textContent = String(error.message)==='support_budget_conflict'
        ? text('Версия изменилась. Откройте отчёт заново перед сохранением.','The report changed. Reopen it before saving.')
        : String(error.message)==='recent_auth_required'
          ? text('Войдите через Steam заново, чтобы сохранить отчёт.','Sign in with Steam again to save the report.')
          : text('Изменение не подтверждено. Проверьте отчёт перед повтором.','The change was not confirmed. Check the report before retrying.');
    } finally {
      fieldset.disabled = month.disabled = false;
    }
  }

  form.addEventListener('submit',event=>{event.preventDefault();void write('draft');});
  form.addEventListener('input',()=>{publish.disabled=true;});
  root.querySelector('[data-add-item]').onclick=()=>{addItem();publish.disabled=true;};
  publish.onclick=()=>void write('publish');
  month.onchange=()=>void load();
  return {
    open(){
      const financeAllowed = allowed();
      const grantsAllowed = canManageSupportGrants(auth());
      if (grants.hidden && grantsAllowed && !financeAllowed) grants.open = true;
      grants.hidden = !grantsAllowed;
      finance.hidden = !financeAllowed;
      if (!financeAllowed) return;
      supportMembers.open();
      if (!month.value) month.value=currentMonth();
      if (sessionUrl===endpoint() && state) return;
      void load();
    },
    reset(){
      supportGrants.reset();
      supportMembers.reset();
      finance.hidden = grants.hidden = true;
      generation++;
      activeRequest?.abort();
      state=null;
      sessionUrl='';
      month.value='';
      form.reset();
      items.replaceChildren();
      audit.querySelector('ul').replaceChildren();
      form.hidden=preview.hidden=audit.hidden=true;
      status.textContent='';
    },
  };
}

import {formatMoscowDateTime} from '/src/shared/time.js';

const BASE = '/v1/portal-ops/support-grants';
const TITLES = {supporter:'Supporter',vip:'VIP',pro:'PRO'};

export function canManageSupportGrants(auth) {
  const permissions = auth?.permissions;
  return !!(auth?.authenticated && permissions?.portalManage &&
    (permissions.supportGrantsManage || permissions.supportManage));
}

export function mountSupportGrants({root,api,auth,text,confirmAction,onChange}) {
  root.innerHTML = `<summary>${text('Ручная выдача доступа','Manual access')}</summary>
    <form class="portal-support-member-controls" data-grant-search>
      <label class="control-field">${text('Имя или ID пилота','Driver name or ID')}
        <input name="q" type="search" required minlength="2" maxlength="100"></label>
      <button class="button" type="submit">${text('Найти','Find')}</button>
    </form>
    <p role="status"></p><ul class="project-support-list" data-grant-results></ul>
    <section data-grant-detail hidden>
      <h3></h3><p data-grant-levels></p>
      <form data-grant-form>
        <fieldset class="portal-support-fieldset">
          <label class="control-field">${text('Выдать уровень','Grant tier')}
            <select name="tier">${Object.entries(TITLES).map(([key,name])=>`<option value="${key}">${name}</option>`).join('')}</select>
          </label>
          <label class="control-field">${text('До выбранной даты включительно, МСК','Through the selected date, MSK')}
            <input type="date" name="expires_on" required></label>
          <label class="project-support-consent"><input type="checkbox" name="indefinite"> ${text('Бессрочно до отзыва','Indefinite until revoked')}</label>
          <label class="control-field">${text('Причина','Reason')}<input name="reason" required maxlength="300"></label>
          <div class="control-actions">
            <button class="button primary" type="submit">${text('Сохранить ручной доступ','Save manual access')}</button>
            <button class="button" type="button" data-revoke hidden>${text('Отозвать ручной доступ','Revoke manual access')}</button>
          </div>
        </fieldset>
      </form>
      <details data-grant-history><summary>${text('Журнал назначений','Grant history')}</summary><ul></ul></details>
    </section>`;
  const search = root.querySelector('[data-grant-search]');
  const results = root.querySelector('[data-grant-results]');
  const status = root.querySelector('[role="status"]');
  const detail = root.querySelector('[data-grant-detail]');
  const form = root.querySelector('[data-grant-form]');
  const {tier,expires_on:expiry,indefinite,reason} = form.elements;
  const revoke = root.querySelector('[data-revoke]');
  const fieldset = form.querySelector('fieldset');
  let state, generation = 0;

  function allowed() {
    return canManageSupportGrants(auth()) && auth().csrfToken;
  }

  function reportError(error) {
    status.textContent = ({
      manual_grant_changed:text('Назначение изменилось. Сверьте новую версию.','The grant changed. Review the updated version.'),
      recent_auth_required:text('Повторите вход через Steam.','Sign in through Steam again.'),
      invalid_manual_grant_date:text('Проверьте дату окончания.','Check the end date.'),
    })[error.message] || text('Результат операции не подтверждён. Проверьте назначение.','The operation is unconfirmed. Check the current grant.');
  }

  function setExpiry() {
    expiry.disabled = indefinite.checked;
    expiry.required = !indefinite.checked;
  }

  async function load(publicId) {
    const ticket = ++generation;
    if (!allowed()) return;
    state = null;
    detail.hidden = true;
    try {
      const data = await api(BASE+'/'+encodeURIComponent(publicId));
      if (ticket!==generation || !allowed()) return;
      state = data;
      detail.querySelector('h3').textContent = data.display_name+' · '+data.public_id;
      const name = level => TITLES[level] || '—';
      const when = date => formatMoscowDateTime(date,document.documentElement.lang==='en'?'en-GB':'ru-RU');
      const manualEnd = data.manual.tier
        ? (data.manual.ends_at ? ' · '+when(data.manual.ends_at) : ' · '+text('Бессрочно','Indefinite')) : '';
      detail.querySelector('[data-grant-levels]').textContent =
        `${text('Оплата','Paid')} ${name(data.paid.tier)} · ${text('Ручной доступ','Manual')} ${name(data.manual.tier)}${manualEnd} · ${text('Действующий уровень','Effective tier')} ${name(data.effective_tier)}`;
      form.reset();
      tier.value = data.manual.tier || 'supporter';
      revoke.hidden = !data.manual.tier;
      setExpiry();
      detail.querySelector('[data-grant-history] ul').replaceChildren(...data.history.map(change=>{
        const li = document.createElement('li');
        li.textContent = [when(change.changed_at), change.actor_public_id,
          change.tier ? TITLES[change.tier] : text('Отзыв','Revoked'), change.reason].join(' · ');
        return li;
      }));
      detail.hidden = false;
    } catch (error) {
      if (ticket===generation) reportError(error);
    }
  }

  search.onsubmit = async event => {
    event.preventDefault();
    const ticket = ++generation;
    if (!allowed()) return;
    state = null;
    detail.hidden = true;
    results.replaceChildren();
    status.textContent = '';
    try {
      const data = await api(BASE+'?'+new URLSearchParams({q:search.elements.q.value.trim()}));
      if (ticket!==generation || !allowed()) return;
      for (const pilot of data.entries) {
        const row = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'button';
        button.textContent = pilot.display_name+' · '+pilot.public_id;
        button.onclick = ()=>{status.textContent='';void load(pilot.public_id);};
        row.append(button);
        results.append(row);
      }
      if (!data.entries.length) status.textContent = text('Пилоты не найдены','No drivers found');
    } catch (error) {
      if (ticket===generation) reportError(error);
    }
  };

  async function save(revoking) {
    if (!state || !allowed() || fieldset.disabled) return;
    if (!reason.value.trim()) {
      reason.reportValidity();
      status.textContent = text('Укажите причину.','Enter a reason.');
      return;
    }
    const ticket = generation;
    const publicId = state.public_id;
    const body = {tier:revoking?null:tier.value, expires_on:revoking||indefinite.checked?null:expiry.value,
      confirm_indefinite:!revoking&&indefinite.checked, reason:reason.value.trim(), expected_revision:state.revision};
    fieldset.disabled = true;
    try {
      const action = revoking ? text('Отозвать ручной доступ у','Revoke manual access for') :
        text('Выдать ручной доступ пилоту','Grant manual access to');
      const duration = body.confirm_indefinite ? text(' · бессрочно',' · indefinitely') :
        body.expires_on ? ' · '+body.expires_on : '';
      const level = revoking ? '' : ' · '+TITLES[body.tier];
      if (!await confirmAction(`${action} ${state.display_name}${level}${duration}?`)) return;
      if (ticket!==generation || !allowed()) return;
      await api(BASE+'/'+encodeURIComponent(publicId),{
        method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':auth().csrfToken},
        body:JSON.stringify(body),
      });
      if (ticket===generation) {
        onChange();
        status.textContent = revoking ? text('Ручной доступ отозван.','Manual access revoked.') :
          text('Ручной доступ сохранён.','Manual access saved.');
        await load(publicId);
      }
    } catch (error) {
      if (ticket!==generation) return;
      reportError(error);
      await load(publicId);
    } finally {
      fieldset.disabled = false;
    }
  }
  indefinite.onchange = setExpiry;
  form.onsubmit = event=>{event.preventDefault();void save(false);};
  revoke.onclick = ()=>void save(true);
  return {reset(){
    generation++;
    state = null;
    root.open = false;
    detail.hidden = true;
    form.reset();
    search.reset();
    results.replaceChildren();
    detail.querySelector('[data-grant-history] ul').replaceChildren();
    status.textContent = '';
  }};
}

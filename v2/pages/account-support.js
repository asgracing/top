import {formatMoscowDateTime,parseAsgTimestamp} from '/src/shared/time.js';

import {v2Route} from '../routes.js';

const TIERS = {supporter:'Supporter',vip:'VIP',pro:'PRO'};
const STATUS_URL = 'https://auth.asgracing.ru/v1/me/support';

function currentSupport(raw, now) {
  const status = Object.hasOwn(raw,'effective') ? raw.effective
    : {tier:raw.paid?.tier,source:'sponsr',ends_at:raw.paid?.paid_until};
  if (!status || !Object.hasOwn(TIERS,status.tier) || !['manual','sponsr','trial'].includes(status.source)) return null;
  const endsAt = parseAsgTimestamp(status.ends_at);
  if (endsAt ? endsAt.getTime() <= now : status.source !== 'manual' || status.ends_at !== null) return null;
  return {tier:TIERS[status.tier],source:status.source,endsAt};
}

export function mountAccountSupport(card,{client,text,language,linked,csrfToken,signal}) {
  card.className = 'panel project-support-account';
  const heading = document.createElement('small');
  heading.textContent = text('Поддержка','Support');
  const status = document.createElement('b');
  status.setAttribute('role','status');
  const information = document.createElement('span');
  const link = document.createElement('a');
  link.className = 'text-link';
  link.href = v2Route('support/',language);
  link.textContent = text('Открыть раздел поддержки','Open support')+' ↗';
  const preference = document.createElement('div');
  card.append(heading,status,information,link,preference);
  if (!linked) {
    status.textContent = text('Профиль пилота не связан','Driver profile not linked');
    return;
  }

  async function refresh() {
    status.textContent = text('Проверяем статус…','Checking status…');
    information.replaceChildren();
    preference.replaceChildren();
    try {
      const raw = await client.requestJson(STATUS_URL,{credentials:'include',cache:'no-store',signal,
        headers:{Accept:'application/json'}});
      if (signal.aborted) return;
      if (csrfToken && Number.isSafeInteger(raw.visibility?.revision)) showPreference(raw.visibility);
      const active = currentSupport(raw,Date.now());
      if (!active) {
        status.textContent = raw.sync?.status === 'current'
          ? text('Нет активного уровня','No active tier')
          : text('Нет подтверждённого доступа','No confirmed access');
        return;
      }
      status.textContent = active.tier;
      const source = {
        manual:text('Ручное назначение','Manual access'),
        sponsr:'Sponsr',
        trial:text('Пробный доступ','Trial access')
      }[active.source];
      information.append(source,' · ');
      if (!active.endsAt) {
        information.append(text('До отзыва','Until revoked'));
        return;
      }
      const timestamp = active.endsAt.toISOString();
      const date = document.createElement('time');
      date.dateTime = timestamp;
      date.textContent = formatMoscowDateTime(timestamp,language === 'en' ? 'en-GB' : 'ru-RU') +
        text(' МСК',' MSK');
      information.append(text('До ','Until '),date);
    } catch (error) {
      if (signal.aborted) return;
      status.textContent = error.status === 401 ? text('Войдите через Steam снова','Sign in with Steam again')
        : text('Статус недоступен','Status unavailable');
      if (error.status === 401) return;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'button';
      retry.textContent = text('Повторить','Retry');
      retry.addEventListener('click',refresh,{once:true});
      information.append(retry);
    }
  }

  function showPreference(initial) {
    const label = document.createElement('label');
    label.className = 'project-support-consent';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = initial.listed === true;
    const message = document.createElement('small');
    message.setAttribute('role','status');
    label.append(checkbox, text('Показывать имя и аватар публично','Show my name and avatar publicly'));
    preference.append(label,message);
    let current = initial;
    checkbox.addEventListener('change', async () => {
      checkbox.disabled = true;
      try {
        current = await client.requestJson(STATUS_URL+'/preferences',{
          method:'POST',credentials:'include',cache:'no-store',signal,
          headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},
          body:JSON.stringify({listed:checkbox.checked,expected_revision:current.revision}),
        });
        if (!signal.aborted) message.textContent = text('Сохранено','Saved');
      } catch (error) {
        if (signal.aborted) return;
        if (error.status === 409) return refresh();
        message.textContent = text('Не удалось сохранить','Could not save');
      } finally {
        checkbox.checked = current.listed === true;
        checkbox.disabled = false;
      }
    });
  }

  void refresh();
}

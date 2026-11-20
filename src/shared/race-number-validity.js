import { formatMoscowDateTime, parseAsgTimestamp } from './time.js';

const COPY = {
  ru: { protectedUntil: 'Защищён подпиской до', staff: 'Пока вы в списке администраторов.', supportHelp: 'Новые 60 дней отсчитываются от конца защиты или более позднего заезда.', until: 'Закреплён до', remaining: 'До освобождения', help: 'Заход на игровой сервер ASG продлевает закрепление на 60 дней.', unknown: 'Срок закрепления уточняется', pending: 'Ожидается проверка срока' },
  en: { protectedUntil: 'Protected by your subscription until', staff: 'While on the ASG administrator list.', supportHelp: 'The 60-day timer restarts after protection ends or after later game activity.', until: 'Reserved until', remaining: 'Time remaining', help: 'Joining an ASG game server renews your reservation for 60 days.', unknown: 'Reservation date is being updated', pending: 'Awaiting the expiry check' }
};

export function renderRaceNumberValidity(preferences, language = 'ru', now = Date.now()) {
  const number = preferences?.raceNumber;
  if (!Number.isInteger(number) || number < 1 || number > 999) return '';
  const lang = language === 'en' ? 'en' : 'ru', copy = COPY[lang];
  const fixed=preferences.permanent===true;
  const supportEnd = parseAsgTimestamp(preferences.supportProtection);
  const indefiniteSupport = preferences.supportProtection === true;
  const supported = indefiniteSupport || supportEnd?.getTime() > now;
  const date = fixed ? null : supported ? supportEnd : parseAsgTimestamp(preferences.expiresAt);
  const delta = date && !supported ? date.getTime() - now : null;
  const state=fixed?'permanent':supported?'support':delta===null?'unknown':delta<=0?'pending':delta<=3*86400000?'warning':'active';
  const title = fixed ? (lang==='ru' ? 'Закреплён бессрочно' : 'Reserved indefinitely')
    : indefiniteSupport ? (lang==='ru' ? 'Защищён, пока действует поддержка' : 'Protected while support is active') : date
    ? `${supported ? copy.protectedUntil : copy.until} <time datetime="${date.toISOString()}">${formatMoscowDateTime(date.toISOString(), lang === 'ru' ? 'ru-RU' : 'en-GB')} ${lang === 'ru' ? 'МСК' : 'MSK'}</time>`
    : copy.unknown;
  const remaining = delta > 0
    ? `${copy.remaining}: ${new Intl.NumberFormat(lang, { style: 'unit', unit: 'day', unitDisplay: 'long' }).format(Math.ceil(delta / 86400000))}`
    : state === 'pending' ? copy.pending : '';
  const help = fixed ? copy.staff : supported ? copy.supportHelp : copy.help;
  return `<div class="race-number-validity" data-number-validity="${state}"><p><b>#${number}</b> · ${title}</p>${remaining ? `<p class="race-number-validity-remaining">${remaining}</p>` : ''}<p class="race-number-validity-help">${help}</p></div>`;
}
export function ensureRaceNumberValidityStyle(documentRef) {
  if (documentRef.querySelector('link[data-number-validity-style]')) return;
  const style = documentRef.createElement('link'); style.rel = 'stylesheet';
  style.href = '/styles/components/race-number-validity.css?v=20261031profile1';
  style.dataset.numberValidityStyle = 'true'; documentRef.head.append(style);
}

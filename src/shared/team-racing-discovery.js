import {isTeamRace, teamRaceUrl, teamRegistrationOpen} from './team-racing-client.js?v=20261009teams2';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const raceStart = event => {
  const zone = String(event.timezone || 'UTC+3').match(/^UTC([+-])(\d{1,2})(?::(\d{2}))?$/i);
  const offset = zone ? `${zone[1]}${zone[2].padStart(2,'0')}:${zone[3] || '00'}` : '+03:00';
  return Date.parse(event.starts_at || (event.date && event.start_time_local ? `${event.date}T${event.start_time_local}${offset}` : event.launch_at));
};

export function upcomingTeamRace(events, now = Date.now()) {
  return (Array.isArray(events) ? events : []).filter(event => isTeamRace(event)
    && !['cancelled','canceled','finished','completed'].includes(event.status)
    && raceStart(event) > now).sort((a,b) => raceStart(a) - raceStart(b))[0] || null;
}

export function teamEntryLabel(event, language = 'ru', now = Date.now()) {
  const ru = language !== 'en';
  return teamRegistrationOpen(event, now) ? (ru ? 'Зарегистрировать команду' : 'Register a team')
    : (ru ? 'Посмотреть составы' : 'View crews');
}

export function refreshTeamRaceLinks(root, language = 'ru', now = Date.now()) {
  for (const link of root.querySelectorAll('[data-team-cutoff]')) {
    link.textContent = teamEntryLabel({participation_mode:'team',closes_at:link.dataset.teamCutoff,
      registration_closed:link.dataset.teamClosed === 'true'}, language, now) + ' →';
  }
}

export function renderTeamRaceSpotlight(events, language = 'ru', now = Date.now()) {
  const event = upcomingTeamRace(events, now);
  if (!event) return '';
  const tx = (ru,en) => language === 'en' ? en : ru;
  const date = value => {
    const instant = typeof value === 'number' ? value : Date.parse(value);
    return Number.isFinite(instant) ? new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ru-RU',
      {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(instant) + tx(' МСК',' MSK') : tx('Уточняется','To be announced');
  };
  const cutoff = event.closes_at || event.registration_closes_at;
  const open = teamRegistrationOpen(event, now);
  return `<section class="team-race-spotlight" aria-label="${tx('Ближайшая командная гонка','Next team race')}">
    <div><span class="team-race-eyebrow">${tx('БЛИЖАЙШАЯ КОМАНДНАЯ ГОНКА','NEXT TEAM RACE')}</span>
    <h2>${escape(event.track_name || event.title || event.track_code || tx('Командная гонка','Team race'))}</h2>
    <p>${tx('Старт','Race start')}: ${escape(date(raceStart(event)))}</p>
    <p class="team-race-deadline">${open ? tx('Заявки и подтверждения до','Entries and confirmations until') : tx('Регистрация закрыта · срок','Registration closed · deadline')}: ${escape(date(cutoff))}</p>
    <p>${tx('Команда → состав → подтверждения пилотов. Админы могут участвовать.','Team → crew → driver confirmations. Admins can participate.')}</p>
    <p>${tx('Закрытие за 10 минут до открытия сервера для подготовки entry list.','Closes 10 minutes before server opening to prepare the entry list.')}</p></div>
    <a class="team-race-cta" data-team-cutoff="${escape(cutoff)}" data-team-closed="${event.registration_closed === true}" href="${escape(teamRaceUrl(event,language))}">${escape(teamEntryLabel(event,language,now))} →</a>
  </section>`;
}

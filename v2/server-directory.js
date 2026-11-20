import {countReportedPlayers, orderedServers, replaceServerCards, serverCardPilotCount} from './server-cards.js?v=20261120servercards';
import {resolveTrackBackgroundFile} from '/src/features/server-status/track-background.js';
import {serverSessionLabel} from './server-session.js?v=20261018telemetry1';
import {serverCountryFlag, serverTrackCountry} from './server-track-flags.js';

export function startServerDirectory({view, center, subscribe, esc, text, label, number, date, serverAdmission}) {
  document.querySelector('.dashboard').classList.add('page-wide');
  for (const side of document.querySelectorAll('.dashboard>aside')) side.hidden = true;
  document.body.dataset.prototypePage = 'servers';
  view.innerHTML = `<section class="server-directory" aria-labelledby="server-directory-title">
    <header class="server-directory-head"><div>
      <h1 id="server-directory-title">${text('Серверы ASG Racing', 'ASG Racing servers')}</h1>
      <p>${text('Выбери сервер, чтобы посмотреть пилотов и карту трассы.', 'Choose a server to see its drivers and live track map.')}</p></div>
      <div class="server-directory-summary" id="server-directory-summary" role="status">
        <div class="server-directory-metric server-directory-metric-servers">
          <span class="server-directory-metric-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01M12 6.5h5m-5 11h5"/></svg>
          </span>
          <div><b id="server-directory-online">—</b><span>${text('Серверы в работе', 'Servers running')}</span></div>
        </div>
        <div class="server-directory-metric server-directory-metric-drivers">
          <span class="server-directory-metric-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="3"/><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m2-16a3 3 0 0 1 0 6m1 4a4 4 0 0 1 3 4v2"/></svg>
          </span>
          <div><b id="server-directory-drivers">—</b><span>${text('Пилотов онлайн', 'Drivers online')}</span></div>
        </div>
      </div></header>
    <div class="server-directory-grid" id="server-directory-grid" tabindex="-1" aria-label="${text('Все игровые серверы', 'All game servers')}">
      <p class="page-empty" role="status">${text('Загрузка серверов…', 'Loading servers…')}</p></div>
    <p class="data-note server-directory-updated" id="server-directory-updated"></p>
  </section>`;
  const grid = view.querySelector('#server-directory-grid');
  const online = view.querySelector('#server-directory-online');
  const drivers = view.querySelector('#server-directory-drivers');
  const countries = new Intl.DisplayNames(text('ru', 'en'), {type: 'region', style: 'short'});
  const pilotLabel = text('пилотов', 'drivers');
  let signature = '';
  const unsubscribe = subscribe(model => {
    const rows = orderedServers(model.servers);
    const current = JSON.stringify([rows, model.serversStale, model.auth?.authenticated, model.auth?.driver?.sr]);
    if (current === signature) return;
    signature = current;
    const incomplete = model.serversStale || rows.some(row => row.stale);
    const onlineCount = `${incomplete ? '—' : number(rows.filter(row => row.online).length)} / ${number(rows.length)}`;
    const driversCount = String(number(countReportedPlayers(rows, model.serversStale)));
    if (online.textContent !== onlineCount) online.textContent = onlineCount;
    if (drivers.textContent !== driversCount) drivers.textContent = driversCount;
    replaceServerCards(grid, rows.map((row, index) => {
      const stale = model.serversStale || row.stale;
      const code = row.server?.track_code || row.server?.track;
      const file = resolveTrackBackgroundFile(code);
      const country = serverTrackCountry(file || code) ?? serverTrackCountry(row.track);
      const warning = serverAdmission(row);
      const state = stale ? 'stale' : row.online ? 'online' : 'offline';
      const stateLabel = stale ? text('Данные устарели', 'Stale data') : row.online ? text('Работает', 'Running') : text('Не запущен', 'Offline');
      const session = state === 'online' ? serverSessionLabel(row, label) : stateLabel;
      const name = row.key === 'hourly' ? text('Часовые гонки / ASG Racing Race', 'Hourly / ASG Racing Race') : String(row.label).replace(/^ASG Racing\s+/i, '');
      return `<button type="button" class="server-directory-card is-${state}${warning ? ' is-sr-blocked' : ''}"
        data-server="${esc(row.key)}" aria-haspopup="dialog" aria-controls="v2-modal">
        <span class="server-directory-cover${file ? '' : ' is-without-photo'}">
          ${file ? `<img src="/assets/v2-light/tracks/${file.replace(/\.jpg$/i, '.webp')}" alt=""${index < 4 ? '' : ' loading="lazy"'}>` : ''}
          <span class="server-directory-track-label">
            ${country ? `<span class="server-directory-country">${serverCountryFlag(country)}${esc(countries.of(country))}</span>` : ''}
            <span class="server-directory-track-name">${esc(row.track || text('Трасса неизвестна', 'Unknown track'))}</span>
          </span>
        </span>
        <span class="server-directory-card-body">
          <strong class="server-directory-name">${esc(name)}</strong>
          <span class="server-directory-session">
            <i class="status-dot" aria-hidden="true"></i>
            <span${state === 'online' ? ` data-live-session="${esc(row.key)}"` : ''}>${esc(session)}</span>
          </span>
          ${serverCardPilotCount(row, {stale, pilotLabel})}
          <span class="server-directory-access">SA ${esc(row.sa ?? '—')} · SR ${esc(row.sr ?? '—')}</span>
          <span class="server-directory-chevron" aria-hidden="true">›</span>
          ${warning ? `<span class="server-directory-warning">${esc(warning)}</span>` : ''}
          <span class="server-card-sr-only">${text('Пилоты и карта трассы', 'Drivers & track map')}</span>
        </span>
      </button>`;
    }).join('') || `<p class="page-empty" role="status">${text('Данные серверов пока недоступны.', 'Server data is not available yet.')}</p>`, [center]);
    view.querySelector('#server-directory-updated').textContent = model.updatedAt
      ? text('Последнее обновление: ', 'Last updated: ') + date(model.updatedAt) : '';
  });
  window.addEventListener('pagehide', unsubscribe, {once: true});
}

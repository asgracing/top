import {orderedServers, replaceServerCards} from './server-cards.js?v=20261025servers1';
import {resolveTrackBackgroundFile} from '/src/features/server-status/track-background.js';
import {serverPilotCount} from '/src/features/server-status/live-details.js?v=20261024pitmap1';
import {serverSessionLabel} from './server-session.js?v=20261018telemetry1';

export function startServerDirectory({view, center, subscribe, esc, text, label, number, date, serverAdmission}) {
  document.querySelector('.dashboard').classList.add('page-wide');
  for (const side of document.querySelectorAll('.dashboard>aside')) side.hidden = true;
  document.body.dataset.prototypePage = 'servers';
  view.innerHTML = `<section class="server-directory" aria-labelledby="server-directory-title">
    <header class="server-directory-head"><div><span class="eyebrow">ASG RACING / ACC</span>
      <h1 id="server-directory-title">${text('Серверы ASG Racing', 'ASG Racing servers')}</h1>
      <p>${text('Выбери сервер, чтобы посмотреть пилотов и карту трассы.', 'Choose a server to see its drivers and live track map.')}</p></div>
      <div class="server-directory-summary" id="server-directory-summary" role="status"></div></header>
    <div class="server-directory-grid" id="server-directory-grid" tabindex="-1" aria-label="${text('Все игровые серверы', 'All game servers')}">
      <p class="page-empty" role="status">${text('Загрузка серверов…', 'Loading servers…')}</p></div>
    <p class="data-note server-directory-updated" id="server-directory-updated"></p>
  </section>`;
  const grid = view.querySelector('#server-directory-grid');
  let signature = '';
  const unsubscribe = subscribe(model => {
    const rows = orderedServers(model.servers);
    const current = JSON.stringify([rows, model.serversStale, model.auth?.authenticated, model.auth?.driver?.sr]);
    if (current === signature) return;
    signature = current;
    const incomplete = model.serversStale || rows.some(row => row.stale);
    view.querySelector('#server-directory-summary').innerHTML = `<span><i class="status-dot" aria-hidden="true"></i>
      <b>${incomplete ? '—' : number(rows.filter(row => row.online).length)} / ${number(rows.length)}</b> ${text('работают', 'running')}</span>
      <span><b>${incomplete ? '—' : number(rows.reduce((total, row) => total + (Number(row.players) || 0), 0))}</b> ${text('пилотов онлайн', 'drivers online')}</span>`;
    replaceServerCards(grid, rows.map((row, index) => {
      const stale = model.serversStale || row.stale;
      const file = resolveTrackBackgroundFile(row.server?.track_code || row.server?.track);
      const background = file ? `url('/assets/v2-light/tracks/${file.replace(/\.jpg$/i, '.webp')}')` : 'none';
      const warning = serverAdmission(row);
      const state = stale ? 'stale' : row.online ? 'online' : 'offline';
      const stateLabel = stale ? text('Данные устарели', 'Stale data') : row.online ? text('Работает', 'Running') : text('Не запущен', 'Offline');
      const session = stale ? text('Нет свежих данных', 'No fresh data') : serverSessionLabel(row, label);
      const name = row.key === 'hourly' ? text('Часовые гонки / ASG Racing Race', 'Hourly / ASG Racing Race') : String(row.label).replace(/^ASG Racing\s+/i, '');
      return `<button type="button" class="server-directory-card is-${state}${warning ? ' is-sr-blocked' : ''}"
        data-server="${esc(row.key)}" style="--server-track-image:${esc(background)}" aria-haspopup="dialog" aria-controls="v2-modal" aria-label="${esc(row.label)}${warning ? ' · '+esc(warning) : ''}">
        <span class="server-directory-card-top"><span class="server-directory-index">${String(index + 1).padStart(2, '0')} / ${esc(row.track || '—')}</span>
          <span class="server-directory-state"><i class="status-dot" aria-hidden="true"></i>${stateLabel}</span></span>
        <strong class="server-directory-name">${esc(name)}</strong>
        <span class="server-directory-session" data-live-session="${esc(row.key)}">${esc(session)}</span>
        <span class="server-directory-card-bottom"><span><b>${esc(stale ? '—' : serverPilotCount(row.server))}</b> ${text('пилотов', 'drivers')}</span>
          <span class="server-directory-access">SA ${esc(row.sa ?? '—')} · SR ${esc(row.sr ?? '—')}</span></span>
        ${warning ? `<span class="server-directory-warning">${esc(warning)}</span>` : ''}
        <span class="server-directory-details">${text('Пилоты и карта трассы', 'Drivers & track map')} <span aria-hidden="true">↗</span></span>
      </button>`;
    }).join('') || `<p class="page-empty" role="status">${text('Данные серверов пока недоступны.', 'Server data is not available yet.')}</p>`, [center]);
    view.querySelector('#server-directory-updated').textContent = model.updatedAt
      ? text('Последнее обновление: ', 'Last updated: ') + date(model.updatedAt) : '';
  });
  window.addEventListener('pagehide', unsubscribe, {once: true});
}

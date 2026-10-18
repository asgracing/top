import {formatTelemetryLap, sessionBestLapMs, lapHighlight} from './telemetry.js?v=20261019servercols1';

// Both maintained server dialogs use the same six-column roster and timing rules.
export function renderServerRoster({server, drivers, lang, esc, renderName, renderRatings, renderCar, emptyMessage}) {
  const ru = lang === 'ru', native = server?.source === 'acc-local-telemetry';
  const headings = ru ? ['Поз.', 'Пилот', 'Лучший круг', 'Последний круг', 'Рейтинги', 'Машина']
    : ['Pos.', 'Driver', 'Best lap', 'Last lap', 'Ratings', 'Car'];
  const fastest = sessionBestLapMs(server);
  const rows = drivers.map(driver => {
    const lap = native ? driver : {}, colors = lapHighlight(lap, fastest);
    const raceNumber = driver.raceNumber ?? driver.car_number ?? driver.race_number;
    const meta = [raceNumber == null ? '' : '#'+esc(raceNumber), native ? `${ru ? 'Круги' : 'Laps'}: ${esc(driver.lap_count ?? '—')}` : ''].filter(Boolean).join(' · ');
    const title = tone => tone === 'session-best' ? (ru ? 'Лучший круг сессии' : 'Session best lap')
      : tone === 'personal-best' ? (ru ? 'Лучший круг пилота' : 'Personal best lap') : '';
    return `<tr><td class="pilot-position">${esc(Number.isInteger(driver.position) && driver.position > 0 ? driver.position : '—')}</td>
      <td class="pilot-identity">${renderName(driver)}<small class="pilot-meta">${meta}</small></td>
      <td class="pilot-best-lap server-lap is-${colors.best}" title="${title(colors.best)}">${formatTelemetryLap(lap.best_lap_ms)}</td>
      <td class="pilot-last-lap server-lap is-${colors.last}" title="${title(colors.last)}">${formatTelemetryLap(lap.last_lap_ms)}</td>
      <td class="pilot-ratings"><div class="roster-rating-pair">${renderRatings(driver)}</div></td>
      <td class="pilot-car">${renderCar(driver)}</td></tr>`;
  }).join('');
  return `<div class="server-roster-scroll" tabindex="0" role="region" aria-label="${ru ? 'Таблица пилотов, прокрутка по горизонтали' : 'Driver table, scroll horizontally'}">
    <table class="server-driver-list server-roster-table"><colgroup>${['position','name','best','last','ratings','car'].map(key=>`<col class="roster-col-${key}">`).join('')}</colgroup>
    <thead><tr>${headings.map((heading,index)=>`<th scope="col">${index === 4 ? '<div class="roster-rating-pair"><span>ELO</span><span>SR</span></div>' : esc(heading)}</th>`).join('')}</tr></thead>
    <tbody>${rows || `<tr class="empty"><td colspan="6">${esc(emptyMessage)}</td></tr>`}</tbody></table></div>`;
}

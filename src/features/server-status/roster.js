import {formatTelemetryLap, sessionBestLapMs, lapHighlight} from './telemetry.js?v=20261025direct1';
import {driverInterval, driverPitLabel, serverPilotCount} from './live-details.js?v=20261025direct1';
import {renderTrackMap} from './track-map.js?v=20261026spa2';

// Both maintained server dialogs share timing, lap-deficit and pit rendering.
export function renderServerRoster({server, drivers, lang, esc, renderName, renderRatings, renderCar, emptyMessage,
  showHeading=false,mapExpanded=true}) {
  const ru = lang === 'ru', native = server?.source === 'acc-local-telemetry';
  const intervalHeading = ['Practice','Qualifying'].includes(server?.session?.type) ? (ru ? 'К лучшему' : 'To best') : (ru ? 'Интервал' : 'Interval');
  const headings = ru ? ['Поз.', 'Пилот', intervalHeading, 'Лучший круг', 'Последний круг', 'Рейтинги', 'Машина']
    : ['Pos.', 'Driver', intervalHeading, 'Best lap', 'Last lap', 'Ratings', 'Car'];
  const fastest = sessionBestLapMs(server);
  const rows = drivers.map(driver => {
    const lap = native ? driver : {}, colors = lapHighlight(lap, fastest);
    const raceNumber = driver.raceNumber ?? driver.car_number ?? driver.race_number;
    const meta = native ? `${esc(driver.lap_count ?? '—')} ${ru ? 'кр.' : 'laps'}` : '';
    const name = driver.display_name || driver.name || driver.driver || driver.driver_name || '—';
    const pit = driverPitLabel(server, driver, lang);
    const pitBadge = {pit_entry:'PIT IN',pit_exit:'PIT OUT',pit_box:'BOX'}[driver.pit_state] || 'PIT';
    const title = tone => tone === 'session-best' ? (ru ? 'Лучший круг сессии' : 'Session best lap')
      : tone === 'personal-best' ? (ru ? 'Лучший круг пилота' : 'Personal best lap') : '';
    return `<tr><td class="pilot-position">${esc(Number.isInteger(driver.position) && driver.position > 0 ? driver.position : '—')}</td>
      <td class="pilot-identity" title="${esc(name)}"><div class="pilot-line"><span class="pilot-number">${raceNumber == null ? '—' : '#'+esc(raceNumber)}</span>${renderName(driver)}<small class="pilot-meta">${pit ? `<span class="pilot-pit" title="${esc(pit)}" aria-label="${esc(pit)}">${pitBadge}</span> ` : ''}${meta}</small></div></td>
      <td class="pilot-interval">${esc(driverInterval(server,driver,lang))}</td>
      <td class="pilot-best-lap server-lap is-${colors.best}" title="${title(colors.best)}">${formatTelemetryLap(lap.best_lap_ms)}</td>
      <td class="pilot-last-lap server-lap is-${colors.last}" title="${title(colors.last)}">${formatTelemetryLap(lap.last_lap_ms)}</td>
      <td class="pilot-ratings"><div class="roster-rating-pair">${renderRatings(driver)}</div></td>
      <td class="pilot-car" title="${esc(driver.car_name || driver.car_name_raw || '')}">${renderCar(driver)}</td></tr>`;
  }).join('');
  const heading=showHeading ? `<h3 class="server-roster-heading">${ru ? 'Пилоты на сервере' : 'Drivers on server'} <span class="small-tag">${esc(serverPilotCount(server))}</span></h3>` : '';
  return `${renderTrackMap(server,lang,Date.now(),{expanded:mapExpanded})}${heading}<div class="server-roster-scroll" tabindex="0" role="region" aria-label="${ru ? 'Таблица пилотов, прокрутка по горизонтали' : 'Driver table, scroll horizontally'}">
    <table class="server-driver-list server-roster-table"><colgroup>${['position','name','interval','best','last','ratings','car'].map(key=>`<col class="roster-col-${key}">`).join('')}</colgroup>
    <thead><tr>${headings.map((heading,index)=>`<th scope="col">${index === 5 ? '<div class="roster-rating-pair"><span>ELO</span><span>SR</span></div>' : esc(heading)}</th>`).join('')}</tr></thead>
    <tbody>${rows || `<tr class="empty"><td colspan="7">${esc(emptyMessage)}</td></tr>`}</tbody></table></div>`;
}

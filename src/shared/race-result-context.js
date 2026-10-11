// One result context for modals, standalone pages and the retained classic UI.
const installed = new WeakSet();

export function mergeResultContext(race, context = {}) {
  const merged = {...race, ...context};
  if (!merged.qualifying) return merged;
  const ratings = new Map((race.results || []).filter(row => row.public_id).map(row => [row.public_id, row]));
  const fields = ['elo', 'elo_internal_rating', 'elo_category_id', 'safety_rating_after', 'safety_rating', 'safety_category'];
  return {...merged, qualifying: {...merged.qualifying, results: (merged.qualifying.results || []).map(row => {
    const historical = ratings.get(row.public_id) || {};
    const values = Object.fromEntries(fields.filter(key => historical[key] != null).map(key => [key, historical[key]]));
    return {...row, ...values, elo: values.elo ?? values.elo_internal_rating ?? row.elo ?? row.elo_internal_rating};
  })}};
}

export function renderRaceConditions(race, {tx, label}) {
  const c = race.race_conditions || {}, tokens = [];
  const finite = value => value != null && Number.isFinite(Number(value));
  const hour = c.game_time?.hour_of_day;
  if (finite(hour)) {
    const minutes = Math.round(Number(hour) * 60);
    tokens.push(`${tx('Время в игре', 'In-game time')} ${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
  }
  for (const [key, ru, en] of [['ambient_temp_c', 'Воздух', 'Air'], ['track_temp_c', 'Трасса', 'Track']]) {
    if (finite(c[key])) tokens.push(`${tx(ru, en)} ${Number(c[key])} °C`);
  }
  for (const [key, ru, en] of [['rain', 'Дождь', 'Rain'], ['cloud_level', 'Облачность', 'Cloud cover']]) {
    if (finite(c[key])) tokens.push(`${tx(ru, en)} ${Math.round(Number(c[key]) * 100)}%`);
  }
  if (finite(c.weather_randomness)) tokens.push(`${tx('Динамика погоды', 'Weather randomness')} ${Number(c.weather_randomness)}`);
  if (finite(c.game_time?.time_multiplier)) tokens.push(`×${Number(c.game_time.time_multiplier)} ${tx('время', 'time')}`);
  const configured = Object.values(c.evidence || {}).some(field => field?.basis === 'configured');
  return `<span class="race-conditions" role="note" aria-label="${label(tx('Условия гонки', 'Race conditions'))}">${tokens.length ? tokens.map(token => `<span>${label(token)}</span>`).join('') : `<span>${label(tx('Условия недоступны', 'Conditions unavailable'))}</span>`}${tokens.length && configured ? `<small>${label(tx('Сохранённые настройки запуска', 'Saved launch settings'))}</small>` : ''}</span>`;
}

export function decorateRaceHeading(element, race, api) {
  if (!element) return;
  const title = element.querySelector('.race-title-text')?.textContent || element.textContent;
  element.classList.add('race-results-heading');
  element.innerHTML = `<span class="race-title-text">${api.label(title)}</span>${renderRaceConditions(race, api)}`;
}

export function renderResultTabs(race, raceHTML, api, id = 'race-results') {
  const {tx, label, pageDriver, raceRating} = api;
  const q = mergeResultContext(race).qualifying || {status: 'missing'};
  let qualifyingHTML;
  if (q.status === 'available' && Array.isArray(q.results) && q.results.length) {
    const rows = q.results.map(row => {
      const badge = {...row, elo_rating_delta: null, elo_delta: null, safety_delta: null, safety_rating_delta: null};
      const car = row.car_name || row.car_name_raw;
      const carHTML = api.carMarkup && (car || row.car_model_id != null) ? api.carMarkup(car, row.car_model_id) : label(car || '—');
      const gap = row.gap_ms != null && Number.isFinite(Number(row.gap_ms)) && Number(row.gap_ms) >= 0
        ? '+' + (Number(row.gap_ms) / 1000).toFixed(3) : row.gap || '—';
      return `<tr><td><b>${label(row.position ?? '—')}</b></td><td><span class="result-driver-identity">${row.race_number == null ? '' : `<small>#${label(row.race_number)}</small>`}${pageDriver(row)}</span></td><td>${label(row.best_lap || '—')}</td><td>${carHTML}</td><td>${label(gap)}</td><td>${row.elo == null ? '—' : raceRating(badge, 'elo') || '—'}</td><td>${(row.safety_rating_after ?? row.safety_rating) == null ? '—' : raceRating(badge, 'sr') || '—'}</td></tr>`;
    }).join('');
    qualifyingHTML = `<div class="page-table-scroll table-wrap"><table class="page-table results-table race-results-grid qualifying-table"><thead><tr>${['№', tx('Пилот', 'Driver'), tx('Круг квалификации', 'Qualifying lap'), tx('Машина', 'Car'), tx('Отставание', 'Gap'), 'ELO', 'SR'].map(value => `<th>${label(value)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div><p class="page-help">${label(tx('ELO и SR — сохранённый контекст этой гонки.', 'ELO and SR use this race’s saved rating context.'))}</p>`;
  } else {
    const message = q.status === 'ambiguous' ? tx('Связь с квалификацией не подтверждена.', 'The qualifying session could not be verified.') : q.status === 'not_applicable' ? tx('Заезд проходил без квалификации.', 'This event had no qualifying session.') : tx('Данные квалификации недоступны.', 'Qualifying data is unavailable.');
    qualifyingHTML = `<p class="site-empty empty" role="status">${label(message)}</p>`;
  }
  const safeId = String(id).replace(/[^a-z0-9_-]/gi, '-');
  return `<div class="result-tabs" data-result-tabs><div class="result-tablist" role="tablist" aria-label="${label(tx('Протокол сессии', 'Session results'))}">${['race', 'qualifying'].map((kind, index) => `<button type="button" role="tab" id="${safeId}-${kind}-tab" aria-controls="${safeId}-${kind}-panel" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-result-tab="${kind}">${label(kind === 'race' ? tx('Гонка', 'Race') : tx('Квалификация', 'Qualifying'))}</button>`).join('')}</div><div id="${safeId}-race-panel" role="tabpanel" aria-labelledby="${safeId}-race-tab" data-result-panel="race">${raceHTML}</div><div id="${safeId}-qualifying-panel" role="tabpanel" aria-labelledby="${safeId}-qualifying-tab" data-result-panel="qualifying" hidden>${qualifyingHTML}</div></div>`;
}

export function installResultTabs(root = document) {
  if (installed.has(root)) return;
  installed.add(root);
  if (!root.getElementById('race-result-context-style')) {
    const sheet = root.createElement('link');
    sheet.id = 'race-result-context-style'; sheet.rel = 'stylesheet';
    sheet.href = '/styles/components/race-result-context.css?v=20261011qual3';
    root.head.append(sheet);
  }
  function select(tab, focus) {
    const group = tab.closest('[data-result-tabs]');
    for (const button of group.querySelectorAll('[data-result-tab]')) {
      const selected = button === tab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    for (const panel of group.querySelectorAll('[data-result-panel]')) panel.hidden = panel.dataset.resultPanel !== tab.dataset.resultTab;
    if (focus) tab.focus();
  }
  root.addEventListener('click', event => {
    const tab = event.target.closest('[data-result-tab]');
    if (tab) { event.preventDefault(); select(tab, false); }
  });
  root.addEventListener('keydown', event => {
    const tab = event.target.closest('[data-result-tab]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...tab.closest('[data-result-tabs]').querySelectorAll('[data-result-tab]')];
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(tab) + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
    event.preventDefault(); select(tabs[index], true);
  });
}

// One result context for modals, standalone pages and the retained classic UI.
import {raceResultUrl, resultTab} from './race-result-links.js?v=20261011racelinks1';
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
  element.innerHTML = `<span class="race-heading-title"><span class="race-title-text">${api.label(title)}</span>${renderRaceCopyButton(race, api)}</span>${renderRaceConditions(race, api)}`;
}

export function renderRaceCopyButton(race, {tx, label}) {
  let url;
  try { url = raceResultUrl(race, 'race', tx('ru', 'en')); } catch { return ''; }
  const copy = tx('Скопировать ссылку', 'Copy link'), copied = tx('Ссылка скопирована', 'Link copied');
  return `<span class="race-share"><button type="button" class="race-copy-link" data-race-copy="${label(url)}" data-copy-label="${label(copy)}" data-copied-label="${label(copied)}" data-manual-label="${label(tx('Скопируй ссылку из поля', 'Copy the link from this field'))}">${label(copy)}</button><span class="race-copy-status" role="status" aria-live="polite"></span></span>`;
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
  const selected = resultTab(api.resultTab);
  return `<div class="result-tabs" data-result-tabs><div class="result-tablist" role="tablist" aria-label="${label(tx('Протокол сессии', 'Session results'))}">${['race', 'qualifying'].map(kind => `<button type="button" role="tab" id="${safeId}-${kind}-tab" aria-controls="${safeId}-${kind}-panel" aria-selected="${kind === selected}" tabindex="${kind === selected ? 0 : -1}" data-result-tab="${kind}">${label(kind === 'race' ? tx('Гонка', 'Race') : tx('Квалификация', 'Qualifying'))}</button>`).join('')}</div><div id="${safeId}-race-panel" role="tabpanel" aria-labelledby="${safeId}-race-tab" data-result-panel="race"${selected === 'race' ? '' : ' hidden'}>${raceHTML}</div><div id="${safeId}-qualifying-panel" role="tabpanel" aria-labelledby="${safeId}-qualifying-tab" data-result-panel="qualifying"${selected === 'qualifying' ? '' : ' hidden'}>${qualifyingHTML}</div></div>`;
}

export function installResultTabs(root = document) {
  if (installed.has(root)) return;
  installed.add(root);
  if (!root.getElementById('race-result-context-style')) {
    const sheet = root.createElement('link');
    sheet.id = 'race-result-context-style'; sheet.rel = 'stylesheet';
    sheet.href = '/styles/components/race-result-context.css?v=20261011racelinks1';
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
    group.dispatchEvent(new CustomEvent('race-result-tab-change', {bubbles: true, detail: {tab: tab.dataset.resultTab}}));
    if (focus) tab.focus();
  }
  root.addEventListener('click', event => {
    const copy = event.target.closest('[data-race-copy]');
    if (copy) { event.preventDefault(); void copyLink(copy); return; }
    const tab = event.target.closest('[data-result-tab]');
    if (tab) { event.preventDefault(); select(tab, false); }
  });
  async function copyLink(button) {
    const scope = button.closest('dialog,.modal-overlay,.page-panel') || root;
    const url = new URL(button.dataset.raceCopy);
    if (scope.querySelector('[data-result-tab="qualifying"][aria-selected="true"]')) url.searchParams.set('tab', 'qualifying');
    const share = button.closest('.race-share'), status = share.querySelector('.race-copy-status');
    share.querySelector('input')?.remove();
    let copied = false;
    try { await root.defaultView.navigator.clipboard.writeText(url.href); copied = true; } catch {
      const field = root.createElement('textarea'); field.value = url.href;
      field.style.cssText = 'position:fixed;left:-10000px;top:0';
      // Keep the fallback inside an open dialog, outside content made inert.
      scope.append(field); field.select();
      try { copied = root.execCommand('copy'); } catch { /* Manual copy below. */ }
      field.remove(); button.focus();
    }
    status.textContent = copied ? button.dataset.copiedLabel : button.dataset.manualLabel;
    button.textContent = copied ? button.dataset.copiedLabel : button.dataset.copyLabel;
    if (!copied) {
      const input = root.createElement('input'); input.type = 'text'; input.readOnly = true; input.value = url.href;
      input.className = 'race-share-url'; input.setAttribute('aria-label', button.dataset.copyLabel);
      share.append(input); input.focus(); input.select();
    }
  }
  root.addEventListener('keydown', event => {
    const tab = event.target.closest('[data-result-tab]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...tab.closest('[data-result-tabs]').querySelectorAll('[data-result-tab]')];
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(tab) + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
    event.preventDefault(); select(tabs[index], true);
  });
}

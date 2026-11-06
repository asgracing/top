import {isLocalDevHost} from '../../src/shared/runtime-config.js';

const ROOT = 'https://data.asgracing.ru/race-archive-shadow/v1/direct/';
const PAGE_SIZE = 10;
const KINDS = new Set(['public', 'hourly', 'monoclass', 'endurance', 'championship']);
const PREVIEW_KEY = 'asg-race-data-preview';
const positive = value => Number.isSafeInteger(value) && value > 0;

export const isArchiveRaceId = value => typeof value === 'string' && /^[a-f0-9]{16}$/.test(value);

export function archiveApiPreview() {
  if (!isLocalDevHost(globalThis.location?.hostname)) return false;
  const mode = new URLSearchParams(location.search).get('raceData');
  try {
    if (mode === 'api' || mode === 'json') sessionStorage.setItem(PREVIEW_KEY, mode);
    return sessionStorage.getItem(PREVIEW_KEY) === 'api';
  } catch {
    return mode === 'api';
  }
}

async function read(path) {
  const response = await fetch(ROOT + path, {
    cache: 'no-cache', credentials: 'omit', signal: AbortSignal.timeout(4500)
  });
  if (!response.ok) {
    const missing = response.status === 404 && (await response.json().catch(() => null))?.error === 'not_found';
    throw Object.assign(new Error(`Race archive HTTP ${response.status}`), {missing});
  }
  return response.json();
}

export async function readArchivePage(request) {
  const page = Math.min(5000, Math.max(1, Math.floor(Number(request.page)) || 1));
  const params = new URLSearchParams({page, limit: PAGE_SIZE, order: request.order === 'asc' ? 'asc' : 'desc'});
  const query = String(request.query || '').trim();
  if (query) params.set('q', query);
  if (request.track) params.set('track', request.track);
  if (request.kind) params.set('kind', request.kind);
  const data = await read('archive?' + params);
  if (data?.schema !== 1 || !positive(data.revision) || typeof data.generated_at !== 'string'
      || !positive(data.page) || !Number.isSafeInteger(data.total_items) || data.total_items < 0
      || !Number.isSafeInteger(data.archive_total) || data.archive_total < data.total_items
      || data.total_pages !== (Math.ceil(data.total_items / PAGE_SIZE) || 1) || data.page > data.total_pages
      || !Array.isArray(data.items) || data.items.length !== Math.min(PAGE_SIZE, data.total_items - (data.page - 1) * PAGE_SIZE)
      || data.items.some(row => !isArchiveRaceId(row?.race_id) || !KINDS.has(row.kind))
      || new Set(data.items.map(row => row.race_id)).size !== data.items.length) {
    throw new Error('Invalid race archive page');
  }
  return {...data, items: data.items.map(row => ({...row, _archive_kind: row.kind}))};
}

export async function readRaceProtocol(id) {
  const data = await read('races/' + id);
  const {card, protocol} = data || {};
  if (data?.race_id !== id || !positive(data.archive_revision) || card?.race_id !== id || protocol?.race_id !== id
      || !KINDS.has(card.kind) || protocol.kind !== card.kind || protocol.track_code !== card.track_code
      || protocol.finished_at !== card.finished_at || !Array.isArray(protocol.results)) {
    throw new Error('Invalid race protocol');
  }
  return {...card, ...protocol, _archive_kind: card.kind};
}

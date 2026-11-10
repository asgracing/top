const ROOT = 'https://data.asgracing.ru/race-archive-shadow/v1/site/stats/';
const HISTORIES = new Set(['race_history', 'elo_history', 'safety_history',
  'summary.elo_history', 'summary.safety_history']);
const PRIVATE_QUERY = /(?:^|\D)s?[0-9]{17}(?![0-9])|steam_[0-9]+:[0-9]+:[0-9]+|\[u:[0-9]+:[0-9]+\]|steamcommunity\.com\/(?:profiles|id)\/\S+|steam:\/\/\S+/iu;

function invalidQuery() {
  return Object.assign(new Error('Invalid statistics search'), {status: 400, code: 'invalid_query'});
}

export function publicStatsEnabled() {
  return globalThis.location?.origin === 'https://asgracing.ru';
}

async function read(route, params, request = globalThis.fetch, signal) {
  const url = new URL(route, ROOT);
  url.search = new URLSearchParams(params);
  const ranking = route === 'rankings' || route === 'bestlaps';
  const timeout = AbortSignal.timeout(ranking ? 12000 : 8000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const options = {cache: 'no-cache', credentials: 'omit', signal: requestSignal};
  let response = await request(url.href, options);
  if (ranking && [502, 504].includes(response.status) && !requestSignal.aborted) {
    await new Promise(resolve => setTimeout(resolve, 200));
    requestSignal.throwIfAborted();
    response = await request(url.href, options);
  }
  if (!response.ok) {
    const code = (await response.json().catch(() => null))?.error;
    if (response.status === 503 && code === 'stats_legacy') return null;
    if (response.status === 400 && code === 'invalid_query') throw invalidQuery();
    throw Object.assign(new Error(`Statistics HTTP ${response.status}`), {status: response.status});
  }
  const payload = await response.json();
  if (!Number.isSafeInteger(payload?.revision) || payload.revision < 1) throw new Error('Invalid statistics revision');
  return payload;
}

export async function liveRanking(kind, page, track, {query = '', sort = '', direction = 1, signal} = {}) {
  if (!publicStatsEnabled() || !['leaderboard', 'safety', 'bestlaps'].includes(kind)) return null;
  const params = {page, limit: 10};
  if (kind === 'bestlaps') params.track = track;
  else params.kind = kind;
  const search = query.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  if ([...search].length > 100 || PRIVATE_QUERY.test(search)) throw invalidQuery();
  if (search) params.q = search;
  if (sort) Object.assign(params, {sort, order: direction < 0 ? 'desc' : 'asc'});
  const result = await read(kind === 'bestlaps' ? kind : 'rankings', params, globalThis.fetch, signal);
  if (result === null) return null;
  if (!Array.isArray(result.items) || !Number.isSafeInteger(result.total_items) || result.total_items < 0
      || result.page !== Math.min(page, Math.max(1, Math.ceil(result.total_items / 10)))
      || result.items.length !== Math.min(10, result.total_items - (result.page - 1) * 10)
      || result.items.some(row => !/^drv_[0-9a-f]{12}$/.test(row?.public_id))) throw new Error('Invalid statistics page');
  return result;
}

export async function liveCarLaps(track, request, signal) {
  if (!publicStatsEnabled()) return null;
  const result = await read('cars', {track, limit: 100}, request, signal);
  if (result === null) return null;
  if (!Array.isArray(result.items) || result.items.length !== result.total_items
      || result.items.some(row => !Number.isSafeInteger(row?.car_model_id) || row.best_lap_track !== track
        || !Number.isFinite(row.best_lap_ms) || row.best_lap_ms <= 0)) throw new Error('Invalid car records');
  return new Map(result.items.map(({car_model_id, ...row}) => [car_model_id, row]));
}

async function loadHistory(root, kind, total, revision, request, signal) {
  const limit = 500;
  const pages = Math.ceil(total / limit);
  const items = [];
  async function readPage(page) {
    const result = await read(root + '/history', {kind, page, limit, revision}, request, signal);
    if (result === null) throw Object.assign(new Error('Statistics rollback during history read'), {status: 409});
    if (result.revision !== revision || result.kind !== kind || result.total_items !== total
        || result.page !== page || !Array.isArray(result.items)
        || result.items.length !== Math.min(limit, total - (page - 1) * limit)) throw new Error('Invalid statistics history');
    return result.items;
  }
  for (let page = 1; page <= pages; page += 2) {
    const batch = Array.from({length: Math.min(2, pages - page + 1)}, (_, offset) => readPage(page + offset));
    for (const rows of await Promise.all(batch)) items.push(...rows);
  }
  return items;
}

export async function liveDriverProfile(id, {withHistory = true, request = globalThis.fetch, signal} = {}) {
  if (!publicStatsEnabled() || !/^drv_[0-9a-f]{12}$/.test(id)) return null;
  const root = 'drivers/' + id;
  for (let attempt = 0; ; attempt++) {
    const data = await read(root, {}, request, signal);
    if (data === null) return null;
    if (data.profile?.public_id !== id || !data.profile.summary || !data.histories) throw new Error('Invalid statistics profile');
    const rank = data.profile.championship_rank ?? null;
    data.profile.leaderboard_rank = rank === null || (Number.isSafeInteger(rank) && rank > 0)
      ? {status: 'current', rank, revision: data.revision, generated_at: data.generated_at}
      : {status: 'unavailable'};
    if (!withHistory) return data.profile;
    const streams = Object.entries(data.histories);
    if (streams.some(([kind, value]) => !HISTORIES.has(kind) || !Number.isSafeInteger(value?.total)
        || value.total < 0 || value.total > 200000)) throw new Error('Invalid statistics histories');
    try {
      const loaded = new Map();
      for (const [kind, {total, stream, reverse}] of streams) {
        const key = JSON.stringify([stream ?? kind, reverse, total]);
        if (!loaded.has(key)) loaded.set(key, await loadHistory(root, kind, total, data.revision, request, signal));
        if (kind.startsWith('summary.')) data.profile.summary[kind.slice(8)] = loaded.get(key);
        else data.profile[kind] = loaded.get(key);
      }
      return data.profile;
    } catch (error) {
      if (error.status !== 409 || attempt > 0) throw error;
    }
  }
}

const ROOT = 'https://data.asgracing.ru/race-archive-shadow/v1/site/stats/';
const HISTORIES = new Set(['race_history', 'elo_history', 'safety_history',
  'summary.elo_history', 'summary.safety_history']);

export function publicStatsEnabled() {
  return globalThis.location?.origin === 'https://asgracing.ru';
}

async function read(route, params, request = globalThis.fetch, signal) {
  const url = new URL(route, ROOT);
  url.search = new URLSearchParams(params);
  const timeout = AbortSignal.timeout(3000);
  try {
    const response = await request(url.href, {cache: 'no-cache', credentials: 'omit',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout});
    if (response.ok) {
      const payload = await response.json();
      if (Number.isSafeInteger(payload?.revision) && payload.revision > 0) return payload;
    }
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  return null;
}

export async function liveRanking(kind, page, track) {
  if (!publicStatsEnabled() || !['leaderboard', 'safety', 'bestlaps'].includes(kind)) return null;
  const params = {page, limit: 10};
  if (kind === 'bestlaps') params.track = track;
  else params.kind = kind;
  const result = await read(kind === 'bestlaps' ? kind : 'rankings', params);
  if (!Array.isArray(result?.items) || result.page !== page || !Number.isSafeInteger(result.total_items)
      || result.items.length !== Math.min(10, result.total_items - (page - 1) * 10)
      || result.items.some(row => !/^drv_[0-9a-f]{12}$/.test(row?.public_id))) return null;
  return result;
}

export async function liveCarLaps(track, request, signal) {
  if (!publicStatsEnabled()) return null;
  const result = await read('cars', {track, limit: 100}, request, signal);
  if (!Array.isArray(result?.items) || result.items.length !== result.total_items
      || result.items.some(row => !Number.isSafeInteger(row?.car_model_id) || row.best_lap_track !== track
        || !Number.isFinite(row.best_lap_ms) || row.best_lap_ms <= 0)) return null;
  return new Map(result.items.map(({car_model_id, ...row}) => [car_model_id, row]));
}

export async function liveDriverProfile(id) {
  if (!publicStatsEnabled() || !/^drv_[0-9a-f]{12}$/.test(id)) return null;
  const root = 'drivers/' + id;
  const data = await read(root, {});
  if (data?.profile?.public_id !== id || !data.profile.summary || !data.histories) return null;
  const streams = Object.entries(data.histories);
  if (streams.some(([kind, value]) => !HISTORIES.has(kind) || !Number.isSafeInteger(value?.total)
      || value.total < 0 || value.total > 100)) return null;
  const histories = await Promise.all(streams.map(async ([kind, {total}]) => {
    if (!total) return [];
    const result = await read(root + '/history', {kind, limit: total, revision: data.revision});
    return result?.revision === data.revision && result.kind === kind && result.total_items === total
      && result.items?.length === total ? result.items : null;
  }));
  if (histories.some(items => !Array.isArray(items))) return null;
  for (const [index, [kind]] of streams.entries()) {
    if (kind.startsWith('summary.')) data.profile.summary[kind.slice(8)] = histories[index];
    else data.profile[kind] = histories[index];
  }
  return data.profile;
}

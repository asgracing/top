import { isInstanceStatusStale, parseServerStatusUpdatedAt } from './freshness.js?v=20261018telemetry1';

export function telemetrySessionLabel(server, { lang = 'ru', compact = true, now = Date.now() } = {}) {
  if (server?.source !== 'acc-local-telemetry') return null;
  if (isInstanceStatusStale(server, now) || server.status === 'offline') return '—';
  const session = server.session || {};
  const labels = lang === 'ru'
    ? {Practice:'Практика', Qualifying:'Квалификация', Race:'Гонка', waiting_for_drivers:'Ожидание', pre_session:'Подготовка', formation:'Формирование', double_file:'Стартовая процедура', overtime:'Завершение', completed:'Завершена'}
    : {Practice:'Practice', Qualifying:'Qualifying', Race:'Race', waiting_for_drivers:'Waiting', pre_session:'Preparing', formation:'Formation', double_file:'Starting procedure', overtime:'Finishing', completed:'Completed'};
  const type = compact ? ({Practice:'P', Qualifying:'Q', Race:'R'}[session.type] || '—') : (labels[session.type] || '—');
  if (session.phase !== 'session') return `${type} · ${labels[session.phase] || '—'}`;
  if (session.remaining_unlimited) return `${type} ∞`;
  if (!Number.isFinite(session.remaining_ms) || session.remaining_ms < 0) return type;
  const observed = parseServerStatusUpdatedAt(server.observed_at);
  if (!Number.isFinite(observed)) return type;
  const seconds = Math.ceil(Math.max(0, session.remaining_ms - Math.max(0, now-observed)) / 1000);
  return `${type} ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
}

export function formatTelemetryLap(ms) {
  if (!Number.isFinite(ms) || ms <= 0 || ms >= 2147483647) return '—';
  const value = Math.floor(ms);
  return `${Math.floor(value/60000)}:${String(Math.floor(value/1000)%60).padStart(2,'0')}.${String(value%1000).padStart(3,'0')}`;
}

const lapMilliseconds = value => Number.isFinite(value) && value > 0 && value < 2147483647 ? Math.floor(value) : null;

export function sessionBestLapMs(server) {
  if (server?.source !== 'acc-local-telemetry') return null;
  const laps = [...(server.classification || []), ...(server.drivers || [])]
    .map(driver => lapMilliseconds(driver.best_lap_ms)).filter(value => value !== null);
  return laps.length ? Math.min(...laps) : null;
}

export function lapHighlight(driver, sessionBest) {
  const best = lapMilliseconds(driver.best_lap_ms), last = lapMilliseconds(driver.last_lap_ms);
  return {
    best: best === null ? 'missing' : best === sessionBest ? 'session-best' : 'personal-best',
    last: last === null ? 'missing' : last === sessionBest ? 'session-best' : last === best ? 'personal-best' : 'normal'
  };
}

export async function loadPreferredServerStatus(liveUrl, legacyUrl, read) {
  try {
    const live = await read(liveUrl);
    if (live?.schema_version === 3 && live?.source === 'asg-live-telemetry-status' && live.servers && typeof live.servers === 'object') return live;
  } catch { /* Before rollout the live file is absent; retain legacy status. */ }
  return read(legacyUrl);
}

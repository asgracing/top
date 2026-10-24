import {isInstanceStatusStale,parseServerStatusUpdatedAt,serverDetailMaxAgeMs} from './freshness.js?v=20261023cadence1';

// Fine timing/pit observations must not remain "live" for the whole coarse
// roster lifetime. A slow publisher will show unknown rather than old PIT.
export const DETAIL_MAX_AGE_MS = 15_000;
const count = value => Number.isInteger(value) && value >= 0 && value <= 256 ? value : null;

export function serverPilotCount(server, now = Date.now()) {
  const capacity = count(server?.driver_capacity);
  const connected = isInstanceStatusStale(server, now) ? null : count(server?.drivers_connected)
    ?? (server?.source === 'acc-local-telemetry' && (server?.roster_complete === true || server?.telemetry_state === 'offline') ? count(server.players_online) : null);
  return `${connected ?? '—'} / ${capacity ?? '—'}`;
}

function detailFresh(server, driver, kind, now) {
  if (server?.source !== 'acc-local-telemetry' || isInstanceStatusStale(server, now)) return false;
  const observed = parseServerStatusUpdatedAt(driver?.[`${kind}_observed_at`] || server.observed_at);
  const age = now - observed;
  return Number.isFinite(age) && age >= -1000 && age <= serverDetailMaxAgeMs(server);
}

export function driverInterval(server, driver, lang = 'ru', now = Date.now()) {
  if (driver?.connected === false || driver?.position === 1 || !detailFresh(server, driver, 'timing', now)) return '—';
  if (server.session?.type !== 'Race') {
    const ms = driver.qualifying_best_delta_ms;
    return ['Practice','Qualifying'].includes(server.session?.type) && Number.isFinite(ms) && ms >= 0
      ? `+${(ms / 1000).toFixed(3)}` : '—';
  }
  const laps = driver.laps_behind_ahead;
  if (!Number.isInteger(laps) || laps < 0 || laps > 1_000_000) return '—';
  if (laps > 0) {
    const ru = lang === 'ru';
    const label = ru ? (laps % 10 === 1 && laps % 100 !== 11 ? 'круг' : [2,3,4].includes(laps % 10) && ![12,13,14].includes(laps % 100) ? 'круга' : 'кругов') : laps === 1 ? 'lap' : 'laps';
    return `+${laps} ${label}`;
  }
  const ms = driver.gap_to_ahead_ms;
  return Number.isFinite(ms) && ms >= 0 && ms <= 86_400_000 ? `+${(ms / 1000).toFixed(3)}` : '—';
}

export function driverPitLabel(server, driver, lang = 'ru', now = Date.now()) {
  if (driver?.connected === false || !detailFresh(server, driver, 'pit', now)) return null;
  const labels = lang === 'ru' ? {pit_entry:'Въезд в пит',pit_lane:'Пит-лейн',pit_exit:'Выезд из пита',pit_box:'Пит-бокс',pit:'В пите'}
    : {pit_entry:'Pit entry',pit_lane:'Pit lane',pit_exit:'Pit exit',pit_box:'Pit box',pit:'In pit'};
  return labels[driver?.pit_state] || null;
}

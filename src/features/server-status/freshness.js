export const SERVER_STATUS_MAX_AGE_MS = 10 * 60 * 1000;

// Authenticated hub reports measured producer clock skew without rewriting the
// original observation. Relay snapshots have no correction.
export function serverObservationAgeMs(server, observed, now=Date.now()) {
  const offset=server?.source_clock_offset_ms;
  const viewer=server?.viewer_clock_offset_ms;
  return now-parseServerStatusUpdatedAt(observed)-(Number.isFinite(offset)&&Math.abs(offset)<=30000?offset:0)
    -(Number.isFinite(viewer)&&Math.abs(viewer)<=86400000?viewer:0);
}

const TIMEZONE_SUFFIX_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/i;
const NAIVE_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

// Operator-selected slow telemetry remains bounded by the original observation.
// Older producers retain the established 15-second detail lifetime.
export function serverDetailMaxAgeMs(server) {
  const value = server?.detail_ttl_ms;
  return Number.isFinite(value) && value >= 15_000 && value <= 300_000 ? value : 15_000;
}

export function parseServerStatusUpdatedAt(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return Number.NaN;

  // The current publisher emits Moscow local time without an offset.
  // Preserve that contract until it starts emitting an explicit ISO timezone.
  const timestamp = NAIVE_ISO_PATTERN.test(normalized) && !TIMEZONE_SUFFIX_PATTERN.test(normalized)
    ? `${normalized}+03:00`
    : normalized;

  return Date.parse(timestamp);
}

export function isServerStatusStale(serverStatus, now = Date.now(), maxAgeMs = SERVER_STATUS_MAX_AGE_MS) {
  const updatedAt = parseServerStatusUpdatedAt(serverStatus?.updated_at);
  if (!Number.isFinite(updatedAt)) return true;
  const age = now - updatedAt;
  const limit = serverStatus?.source === 'asg-live-telemetry-status' ? Math.min(maxAgeMs, 180_000) : maxAgeMs;
  return age < -30_000 || age > limit;
}

export function isInstanceStatusStale(server, now = Date.now()) {
  if (!server || typeof server !== "object") return true;
  if (server.stale === true || ["stale", "unknown"].includes(server.status)) return true;
  if (server.source === 'acc-local-telemetry') {
    const observed = parseServerStatusUpdatedAt(server.observed_at);
    const age = serverObservationAgeMs(server,server.observed_at,now);
    return !Number.isFinite(observed) || age < -30_000 || age > Math.max(180_000, serverDetailMaxAgeMs(server)) ||
      !['live', 'offline'].includes(server.telemetry_state) ||
      (server.telemetry_state === 'live' && (server.roster_complete !== true || server.source_age_ms > 5_000));
  }
  // Legacy rows have only aggregate freshness. Bot rows carry their own clock
  // and must not become fresh because another machine published a newer file.
  if (!server.producer_epoch) return false;
  const observed = parseServerStatusUpdatedAt(server.observed_at || server.updated_at);
  return !Number.isFinite(observed) || now - observed > 180_000 ||
    server.bot_connected !== true || server.roster_complete !== true;
}

export function serverDetailsAreOpen(documentRef) {
  if (documentRef.getElementById("server-players-modal")?.getAttribute("aria-hidden") === "false") return true;
  const modal = documentRef.getElementById("v2-modal");
  return Boolean(modal?.open && ["server", "servers"].includes(modal.dataset.kind));
}

export function bindServerStatusFreshness({ windowRef, documentRef, lifecycle, refresh, isDetailsOpen = () => serverDetailsAreOpen(documentRef),isDirect=()=>false }) {
  // Fine timing expires after 15 seconds. Fetch every publication cycle while
  // the dialog is open; keep the coarse widget cadence elsewhere.
  let elapsedMs = 0;
  const timerId = windowRef.setInterval(() => {
    if (documentRef.hidden) return;
    elapsedMs += 1_000;
    if (isDirect() || elapsedMs >= (isDetailsOpen()?5_000:30_000)) {
      elapsedMs = 0;
      refresh();
    }
  }, 1_000);
  lifecycle.timer(timerId, id => windowRef.clearInterval(id));
  lifecycle.listen(documentRef, "visibilitychange", () => {
    if (!documentRef.hidden) refresh();
  });
}

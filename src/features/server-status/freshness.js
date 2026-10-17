export const SERVER_STATUS_MAX_AGE_MS = 10 * 60 * 1000;

const TIMEZONE_SUFFIX_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/i;
const NAIVE_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

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
  return now - updatedAt > maxAgeMs;
}

export function isInstanceStatusStale(server, now = Date.now()) {
  if (!server || typeof server !== "object") return true;
  if (server.stale === true || ["stale", "unknown"].includes(server.status)) return true;
  // Legacy rows have only aggregate freshness. Bot rows carry their own clock
  // and must not become fresh because another machine published a newer file.
  if (!server.producer_epoch) return false;
  const observed = parseServerStatusUpdatedAt(server.observed_at || server.updated_at);
  return !Number.isFinite(observed) || now - observed > 180_000 ||
    server.bot_connected !== true || server.roster_complete !== true;
}

export function bindServerStatusFreshness({ windowRef, documentRef, lifecycle, refresh }) {
  const timerId = windowRef.setInterval(refresh, 30_000);
  lifecycle.timer(timerId, id => windowRef.clearInterval(id));
  lifecycle.listen(documentRef, "visibilitychange", () => {
    if (!documentRef.hidden) refresh();
  });
}

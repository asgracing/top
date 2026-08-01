const ENTITY_STATUSES = new Set(["pending", "approved", "rejected", "suspended", "archived"]);
const QUEUE_STATUSES = new Set(["pending", "leased", "applied", "rejected", "expired", "dead_letter"]);
const ROLES = Object.freeze({ club: new Set(["head", "member"]), team: new Set(["captain", "member"]) });

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function boundedText(value, maxLength) {
  const text = typeof value === "string" ? value.trim() : "";
  return text && text.length <= maxLength ? text : "";
}

function safeIdentifier(value) {
  const text = boundedText(value, 160);
  return /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(text) ? text : "";
}

function safeSlug(value) {
  const text = boundedText(value, 100).toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text) ? text : "";
}

function safeInteger(value, minimum = 0, maximum = 1_000_000_000) {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum ? value : null;
}

function safeDate(value) {
  const text = boundedText(value, 64);
  return text && Number.isFinite(Date.parse(text)) ? text : null;
}

function normalizeEntity(value, type) {
  const source = plainObject(value);
  if (!source) return null;
  const publicId = safeIdentifier(source.public_id);
  const slug = safeSlug(source.slug);
  const displayName = boundedText(source.display_name, 160);
  const status = ENTITY_STATUSES.has(source.status) ? source.status : null;
  const role = ROLES[type].has(source.role) ? source.role : null;
  const rowVersion = safeInteger(source.row_version, 1);
  if (!publicId || !slug || !displayName || !status || !role || rowVersion === null) return null;
  return { type, publicId, slug, displayName, status, role, rowVersion, pendingRevision: source.pending_revision === true };
}

function normalizeNotification(value, idKey) {
  const source = plainObject(value);
  if (!source) return null;
  const id = safeIdentifier(source[idKey]);
  const status = QUEUE_STATUSES.has(source.status) ? source.status : null;
  return id && status ? { id, status, createdAt: safeDate(source.created_at) } : null;
}

function normalizeNotifications(value, idKey) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map(item => normalizeNotification(item, idKey)).filter(Boolean);
}

function normalizeSnapshot(value) {
  const source = plainObject(value);
  if (!source) return { available: false, revision: null, generatedAt: null, receivedAt: null, stale: true };
  return {
    available: source.available === true,
    revision: safeInteger(source.revision),
    generatedAt: safeDate(source.generated_at),
    receivedAt: safeDate(source.received_at),
    stale: source.stale !== false
  };
}

export function normalizeClubsTeamsAuthState(value) {
  const source = plainObject(value);
  const empty = {
    enabled: false,
    club: null,
    team: null,
    pendingCommands: 0,
    pendingAssets: 0,
    notifications: [],
    assetNotifications: [],
    snapshot: { available: false, revision: null, generatedAt: null, receivedAt: null, stale: true }
  };
  if (!source || source.enabled !== true) return empty;
  const state = plainObject(source.applied_state) || {};
  return {
    enabled: true,
    club: normalizeEntity(state.club, "club"),
    team: normalizeEntity(state.team, "team"),
    pendingCommands: safeInteger(source.pending_commands, 0, 10_000) ?? 0,
    pendingAssets: safeInteger(source.pending_assets, 0, 10_000) ?? 0,
    notifications: normalizeNotifications(source.notifications, "command_id"),
    assetNotifications: normalizeNotifications(source.asset_notifications, "asset_id"),
    snapshot: normalizeSnapshot(source.snapshot)
  };
}

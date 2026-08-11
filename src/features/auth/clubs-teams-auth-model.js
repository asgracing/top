const ENTITY_STATUSES = new Set(["pending", "approved", "rejected", "suspended", "archived"]);
const QUEUE_STATUSES = new Set(["pending", "leased", "applied", "rejected", "expired", "dead_letter"]);
const ROLES = Object.freeze({ club: new Set(["head", "member"]), team: new Set(["captain", "member"]) });
const MANAGEMENT_IDS = new WeakMap();
const ACTOR_STATE_KEYS = new Set(["public_id", "club", "team"]);
const ACTOR_STATE_ACTION_KEYS = new Set(["public_id", "club", "team", "membership_actions"]);
const ACTOR_STATE_TEAM_CLUB_KEYS = new Set(["public_id", "club", "team", "team_club_actions"]);
const ACTOR_STATE_ALL_ACTION_KEYS = new Set(["public_id", "club", "team", "membership_actions", "team_club_actions"]);
const ENTITY_KEYS = new Set(["id", "public_id", "slug", "status", "row_version", "role", "display_name", "pending_revision"]);
const LEGACY_ACTION_KEYS = new Set([
  "id", "action_type", "target_type", "target_public_id", "target_slug", "target_display_name",
  "subject_public_id", "initiated_by_public_id", "created_at", "expires_at", "resolution_role"
]);
const ACTION_KEYS = new Set([
  ...LEGACY_ACTION_KEYS,
  "subject_display_name"
]);
const MEMBERSHIP_ACTION_IDS = new WeakMap();
const TEAM_CLUB_ACTION_KEYS = new Set([
  "id", "action_type", "team_public_id", "team_slug", "team_display_name",
  "club_public_id", "club_slug", "club_display_name", "initiated_by_public_id",
  "created_at", "expires_at", "resolution_role"
]);
const TEAM_CLUB_ACTION_IDS = new WeakMap();
const PENDING_INVITE_KEYS = new Set([
  "command_id", "target_type", "subject_public_id", "status", "created_at"
]);

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

function hasExactKeys(value, expected) {
  const keys = Object.keys(value);
  return keys.length === expected.size && keys.every(key => expected.has(key));
}

function normalizeEntity(value, type) {
  const source = plainObject(value);
  if (!source || !hasExactKeys(source, ENTITY_KEYS)) return null;
  const publicId = safeIdentifier(source.public_id);
  const slug = safeSlug(source.slug);
  const displayName = boundedText(source.display_name, 160);
  const status = ENTITY_STATUSES.has(source.status) ? source.status : null;
  const role = ROLES[type].has(source.role) ? source.role : null;
  const rowVersion = safeInteger(source.row_version, 1);
  if (!publicId || !slug || !displayName || !status || !role || rowVersion === null) return null;
  const entity = { type, publicId, slug, displayName, status, role, rowVersion, pendingRevision: source.pending_revision === true };
  const managementId = safeIdentifier(source.id);
  if (managementId) MANAGEMENT_IDS.set(entity, managementId);
  return entity;
}

export function managementEntityId(entity) {
  return entity && typeof entity === "object" ? MANAGEMENT_IDS.get(entity) || null : null;
}

export function membershipActionId(action) {
  return action && typeof action === "object" ? MEMBERSHIP_ACTION_IDS.get(action) || null : null;
}

export function teamClubActionId(action) {
  return action && typeof action === "object" ? TEAM_CLUB_ACTION_IDS.get(action) || null : null;
}

function normalizeMembershipActions(value) {
  if (value === undefined) return { actions: [], valid: true };
  if (!Array.isArray(value) || value.length > 100) return { actions: [], valid: false };
  const actions = [];
  const ids = new Set();
  for (const raw of value) {
    const source = plainObject(raw);
    const hasDisplayNames = source && hasExactKeys(source, ACTION_KEYS);
    if (!source || (!hasDisplayNames && !hasExactKeys(source, LEGACY_ACTION_KEYS))) {
      return { actions: [], valid: false };
    }
    const id = safeIdentifier(source.id);
    const targetPublicId = safeIdentifier(source.target_public_id);
    const targetSlug = safeSlug(source.target_slug);
    const targetDisplayName = boundedText(source.target_display_name, 200);
    const subjectPublicId = safeIdentifier(source.subject_public_id);
    const initiatedByPublicId = safeIdentifier(source.initiated_by_public_id);
    const subjectDisplayName = hasDisplayNames
      ? boundedText(source.subject_display_name, 200)
      : subjectPublicId;
    const createdAt = safeDate(source.created_at);
    const expiresAt = safeDate(source.expires_at);
    if (
      !id || ids.has(id) || !targetPublicId || !targetSlug || !targetDisplayName
      || !subjectPublicId || !initiatedByPublicId
      || !subjectDisplayName || !createdAt || !expiresAt
      || Date.parse(expiresAt) <= Date.parse(createdAt)
      || !["request", "invitation"].includes(source.action_type)
      || !["club", "team"].includes(source.target_type)
      || !["subject", "manager", "observer"].includes(source.resolution_role)
    ) return { actions: [], valid: false };
    const action = {
      actionType: source.action_type,
      targetType: source.target_type,
      targetPublicId,
      targetSlug,
      targetDisplayName,
      subjectPublicId,
      subjectDisplayName,
      initiatedByPublicId,
      createdAt,
      expiresAt,
      resolutionRole: source.resolution_role
    };
    MEMBERSHIP_ACTION_IDS.set(action, id);
    ids.add(id);
    actions.push(action);
  }
  return { actions, valid: true };
}

function normalizeTeamClubActions(value) {
  if (value === undefined) return { actions: [], valid: true };
  if (!Array.isArray(value) || value.length > 100) return { actions: [], valid: false };
  const actions = [];
  const ids = new Set();
  for (const raw of value) {
    const source = plainObject(raw);
    if (!source || !hasExactKeys(source, TEAM_CLUB_ACTION_KEYS)) return { actions: [], valid: false };
    const id = safeIdentifier(source.id);
    const teamPublicId = safeIdentifier(source.team_public_id);
    const teamSlug = safeSlug(source.team_slug);
    const teamDisplayName = boundedText(source.team_display_name, 200);
    const clubPublicId = safeIdentifier(source.club_public_id);
    const clubSlug = safeSlug(source.club_slug);
    const clubDisplayName = boundedText(source.club_display_name, 200);
    const initiatedByPublicId = safeIdentifier(source.initiated_by_public_id);
    const createdAt = safeDate(source.created_at);
    const expiresAt = safeDate(source.expires_at);
    if (
      !id || ids.has(id) || !teamPublicId || !teamSlug || !teamDisplayName
      || !clubPublicId || !clubSlug || !clubDisplayName || !initiatedByPublicId
      || !createdAt || !expiresAt || Date.parse(expiresAt) <= Date.parse(createdAt)
      || !["request", "invitation"].includes(source.action_type)
      || !["manager", "observer"].includes(source.resolution_role)
    ) return { actions: [], valid: false };
    const action = {
      actionType: source.action_type,
      teamPublicId, teamSlug, teamDisplayName,
      clubPublicId, clubSlug, clubDisplayName,
      initiatedByPublicId, createdAt, expiresAt,
      resolutionRole: source.resolution_role
    };
    TEAM_CLUB_ACTION_IDS.set(action, id);
    ids.add(id);
    actions.push(action);
  }
  return { actions, valid: true };
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

function normalizePendingInvites(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.slice(0, 100).map(raw => {
    const source = plainObject(raw);
    if (!source || !hasExactKeys(source, PENDING_INVITE_KEYS)) return null;
    const commandId = safeIdentifier(source.command_id);
    const subjectPublicId = safeIdentifier(source.subject_public_id);
    const targetType = ["club", "team"].includes(source.target_type) ? source.target_type : null;
    const status = ["pending", "leased"].includes(source.status) ? source.status : null;
    const key = `${targetType}:${subjectPublicId}`;
    if (!commandId || !subjectPublicId || !targetType || !status || seen.has(key)) return null;
    seen.add(key);
    return {
      commandId,
      targetType,
      subjectPublicId,
      status,
      createdAt: safeDate(source.created_at)
    };
  }).filter(Boolean);
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
    pendingInvites: [],
    notifications: [],
    assetNotifications: [],
    membershipActions: [],
    teamClubActions: [],
    integrityValid: true,
    snapshot: { available: false, revision: null, generatedAt: null, receivedAt: null, stale: true }
  };
  if (!source || source.enabled !== true) return empty;
  const rawState = source.applied_state;
  const state = plainObject(rawState) || {};
  const club = normalizeEntity(state.club, "club");
  const team = normalizeEntity(state.team, "team");
  const membership = normalizeMembershipActions(state.membership_actions);
  const teamClub = normalizeTeamClubActions(state.team_club_actions);
  const integrityValid = rawState === null || rawState === undefined || (
    plainObject(rawState) !== null
    && (
      hasExactKeys(rawState, ACTOR_STATE_KEYS)
      || hasExactKeys(rawState, ACTOR_STATE_ACTION_KEYS)
      || hasExactKeys(rawState, ACTOR_STATE_TEAM_CLUB_KEYS)
      || hasExactKeys(rawState, ACTOR_STATE_ALL_ACTION_KEYS)
    )
    && Boolean(safeIdentifier(state.public_id))
    && (state.club === null || state.club === undefined || club !== null)
    && (state.team === null || state.team === undefined || team !== null)
    && membership.valid
    && teamClub.valid
  );
  return {
    enabled: true,
    club,
    team,
    pendingCommands: safeInteger(source.pending_commands, 0, 10_000) ?? 0,
    pendingAssets: safeInteger(source.pending_assets, 0, 10_000) ?? 0,
    pendingInvites: normalizePendingInvites(source.pending_invites),
    notifications: normalizeNotifications(source.notifications, "command_id"),
    assetNotifications: normalizeNotifications(source.asset_notifications, "asset_id"),
    membershipActions: membership.actions,
    teamClubActions: teamClub.actions,
    integrityValid,
    snapshot: normalizeSnapshot(source.snapshot)
  };
}

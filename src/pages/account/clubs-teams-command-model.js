import { managementEntityId, membershipActionId } from "../../features/auth/clubs-teams-auth-model.js";

const ENTITY_TYPES = new Set(["club", "team"]);
const FINAL_STATUSES = new Set(["applied", "rejected", "expired", "dead_letter"]);
const QUEUE_STATUSES = new Set(["pending", "leased", ...FINAL_STATUSES]);
const SAFE_ERROR_CODES = new Set([
  "clubs_teams_unavailable", "recent_auth_required", "driver_profile_required", "driver_banned",
  "discord_link_required", "command_type_not_allowed", "name_taken", "invalid_field", "invalid_name",
  "already_in_club", "already_in_team", "club_membership_required", "independent_team_requires_no_club",
  "version_conflict", "forbidden", "invalid_state", "identity_links_required", "asset_not_ready",
  "unexpected_field", "command_expired", "entity_not_found", "entity_not_approved", "already_member",
  "action_pending", "action_not_pending", "invalid_decision", "leadership_transfer_required"
]);

export class ClubsTeamsCommandError extends Error {
  constructor(code) {
    super(code);
    this.name = "ClubsTeamsCommandError";
    this.code = code;
  }
}

function normalizedText(value, maximum, { required = false } = {}) {
  const text = typeof value === "string" ? value.normalize("NFKC").trim() : "";
  if ((!text && required) || text.length > maximum || /\p{C}/u.test(text)) {
    throw new ClubsTeamsCommandError("invalid_fields");
  }
  return text || null;
}

function normalizedName(value) {
  const text = normalizedText(value, 80, { required: true }).split(/\s+/u).join(" ");
  if (text.length < 2) throw new ClubsTeamsCommandError("invalid_fields");
  return text;
}

function normalizedWebsite(value) {
  const text = normalizedText(value, 300);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("unsafe");
    return url.href;
  } catch {
    throw new ClubsTeamsCommandError("invalid_website");
  }
}

export function normalizeRevisionFields(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    display_name: normalizedName(source.displayName),
    short_name: normalizedText(source.shortName, 24),
    description_ru: normalizedText(source.descriptionRu, 4000),
    description_en: normalizedText(source.descriptionEn, 4000),
    website_url: normalizedWebsite(source.websiteUrl)
  };
}

function requireEntityType(value) {
  if (!ENTITY_TYPES.has(value)) throw new ClubsTeamsCommandError("invalid_entity_type");
  return value;
}

export function buildCreateEntityCommand({ entityType, currentEntity = null, clubEntity = null, fields }) {
  const type = requireEntityType(entityType);
  if (currentEntity) throw new ClubsTeamsCommandError(`already_has_${type}`);
  const payload = normalizeRevisionFields(fields);
  if (type === "team" && clubEntity) {
    const clubId = managementEntityId(clubEntity);
    if (!clubId) throw new ClubsTeamsCommandError("invalid_management_state");
    payload.club_id = clubId;
  }
  return { commandType: `${type}.create`, payload, expectedEntityVersion: null };
}

export function buildReviseEntityCommand({ entityType, entity, fields }) {
  const type = requireEntityType(entityType);
  const expectedRole = type === "club" ? "head" : "captain";
  const entityId = managementEntityId(entity);
  if (!entity || entity.type !== type || entity.role !== expectedRole || !entityId) {
    throw new ClubsTeamsCommandError("manager_required");
  }
  if (!Number.isSafeInteger(entity.rowVersion) || entity.rowVersion < 1 || entity.pendingRevision) {
    throw new ClubsTeamsCommandError("invalid_management_state");
  }
  return {
    commandType: "entity.revise",
    payload: { entity_type: type, entity_id: entityId, fields: normalizeRevisionFields(fields) },
    expectedEntityVersion: entity.rowVersion
  };
}

export function buildMembershipRequestCommand({ targetType, targetPublicId }) {
  const type = requireEntityType(targetType);
  const publicId = safeIdentifier(targetPublicId);
  if (!publicId) throw new ClubsTeamsCommandError("invalid_target");
  return {
    commandType: "membership.request",
    payload: { target_type: type, target_public_id: publicId },
    expectedEntityVersion: null
  };
}

export function buildMembershipResolveCommand({ action, decision }) {
  const actionId = membershipActionId(action);
  if (!actionId || !["subject", "manager"].includes(action?.resolutionRole)) {
    throw new ClubsTeamsCommandError("action_not_resolvable");
  }
  if (!["accepted", "rejected"].includes(decision)) throw new ClubsTeamsCommandError("invalid_decision");
  return {
    commandType: "membership.resolve",
    payload: { action_id: actionId, decision },
    expectedEntityVersion: null
  };
}

export function buildMembershipLeaveCommand(entity) {
  const type = requireEntityType(entity?.type);
  const entityId = managementEntityId(entity);
  if (!entityId || !["member"].includes(entity.role)) throw new ClubsTeamsCommandError("leave_not_allowed");
  return {
    commandType: "membership.leave",
    payload: { entity_type: type, entity_id: entityId, reason: "leave" },
    expectedEntityVersion: null
  };
}

function requireManagerEntity(entity) {
  const type = requireEntityType(entity?.type);
  const expectedRole = type === "club" ? "head" : "captain";
  const entityId = managementEntityId(entity);
  if (!entityId || entity.role !== expectedRole || entity.status !== "approved") {
    throw new ClubsTeamsCommandError("manager_required");
  }
  return { type, entityId };
}

export function buildMembershipInviteCommand({ entity, subjectPublicId }) {
  const { type, entityId } = requireManagerEntity(entity);
  const subject = safeIdentifier(subjectPublicId);
  if (!subject) throw new ClubsTeamsCommandError("invalid_subject");
  return {
    commandType: "membership.invite",
    payload: { target_type: type, target_id: entityId, subject_public_id: subject },
    expectedEntityVersion: null
  };
}

export function buildMembershipRemoveCommand({ entity, subjectPublicId }) {
  const { type, entityId } = requireManagerEntity(entity);
  const subject = safeIdentifier(subjectPublicId);
  if (!subject) throw new ClubsTeamsCommandError("invalid_subject");
  return {
    commandType: "membership.remove",
    payload: { entity_type: type, entity_id: entityId, subject_public_id: subject, reason: "removed" },
    expectedEntityVersion: null
  };
}

function safeIdentifier(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length <= 160 && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(text) ? text : null;
}

export function normalizeCommandResponse(value) {
  const root = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const source = root.command && typeof root.command === "object" && !Array.isArray(root.command) ? root.command : {};
  const id = safeIdentifier(source.command_id);
  const status = QUEUE_STATUSES.has(source.status) ? source.status : null;
  if (!id || !status) throw new ClubsTeamsCommandError("invalid_command_response");
  const receipt = source.receipt && typeof source.receipt === "object" && !Array.isArray(source.receipt) ? source.receipt : null;
  const rawCode = receipt?.error && typeof receipt.error === "object" ? receipt.error.code : null;
  return {
    id,
    status,
    final: FINAL_STATUSES.has(status),
    errorCode: SAFE_ERROR_CODES.has(rawCode) ? rawCode : null
  };
}

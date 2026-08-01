import test from "node:test";
import assert from "node:assert/strict";

import { normalizeClubsTeamsAuthState, managementEntityId } from "../../src/features/auth/clubs-teams-auth-model.js";
import {
  ClubsTeamsCommandError,
  buildCreateEntityCommand,
  buildMembershipLeaveCommand,
  buildMembershipInviteCommand,
  buildMembershipRemoveCommand,
  buildMembershipRequestCommand,
  buildMembershipResolveCommand,
  buildReviseEntityCommand,
  normalizeCommandResponse,
  normalizeRevisionFields
} from "../../src/pages/account/clubs-teams-command-model.js";

function stateWithEntities() {
  return normalizeClubsTeamsAuthState({
    enabled: true,
    applied_state: {
      club: { id: "club-internal", public_id: "club-public", slug: "asg", display_name: "ASG", status: "approved", role: "head", row_version: 4, pending_revision: false },
      team: { id: "team-internal", public_id: "team-public", slug: "factory", display_name: "Factory", status: "approved", role: "captain", row_version: 7, pending_revision: false }
    }
  });
}

test("normalizes only the complete public revision field allowlist", () => {
  assert.deepEqual(normalizeRevisionFields({
    displayName: "  ASG   Racing  ", shortName: " ASG ", descriptionRu: " Текст ",
    descriptionEn: " Text ", websiteUrl: "https://asgracing.ru/about"
  }), {
    display_name: "ASG Racing", short_name: "ASG", description_ru: "Текст",
    description_en: "Text", website_url: "https://asgracing.ru/about"
  });
  assert.throws(() => normalizeRevisionFields({ displayName: "A" }), ClubsTeamsCommandError);
  assert.throws(() => normalizeRevisionFields({ displayName: "Valid", websiteUrl: "javascript:alert(1)" }), /invalid_website/);
});

test("builds create commands and keeps management ids out of serialized auth state", () => {
  const state = stateWithEntities();
  assert.equal(managementEntityId(state.club), "club-internal");
  assert.equal(JSON.stringify(state).includes("club-internal"), false);
  const command = buildCreateEntityCommand({
    entityType: "team",
    clubEntity: state.club,
    fields: { displayName: "ASG Academy" }
  });
  assert.equal(command.commandType, "team.create");
  assert.equal(command.payload.club_id, "club-internal");
  assert.equal(command.expectedEntityVersion, null);
});

test("builds revisions only for the canonical manager and current version", () => {
  const state = stateWithEntities();
  const command = buildReviseEntityCommand({ entityType: "club", entity: state.club, fields: { displayName: "ASG Motorsport" } });
  assert.deepEqual(command.payload, {
    entity_type: "club",
    entity_id: "club-internal",
    fields: { display_name: "ASG Motorsport", short_name: null, description_ru: null, description_en: null, website_url: null }
  });
  assert.equal(command.expectedEntityVersion, 4);

  state.club.role = "member";
  assert.throws(() => buildReviseEntityCommand({ entityType: "club", entity: state.club, fields: { displayName: "No" } }), /manager_required/);
});

test("normalizes polling responses without retaining arbitrary receipts", () => {
  const normalized = normalizeCommandResponse({ command: {
    command_id: "ctc_123", status: "rejected",
    receipt: { signature: "private", error: { code: "name_taken", message: "raw backend text" }, result: { entity_id: "private" } }
  } });
  assert.deepEqual(normalized, { id: "ctc_123", status: "rejected", final: true, errorCode: "name_taken" });
  assert.equal(JSON.stringify(normalized).includes("raw backend"), false);
  assert.throws(() => normalizeCommandResponse({ command: { command_id: "<bad>", status: "applied" } }), /invalid_command_response/);
});

test("builds public-id membership requests without internal target ids", () => {
  const command = buildMembershipRequestCommand({ targetType: "club", targetPublicId: "club-public" });
  assert.deepEqual(command, {
    commandType: "membership.request",
    payload: { target_type: "club", target_public_id: "club-public" },
    expectedEntityVersion: null
  });
  assert.equal("target_id" in command.payload, false);
  assert.throws(() => buildMembershipRequestCommand({ targetType: "club", targetPublicId: "<bad>" }), /invalid_target/);
});

test("builds membership resolution and member leave commands from protected ids", () => {
  const state = normalizeClubsTeamsAuthState({
    enabled: true,
    applied_state: {
      public_id: "pilot-1",
      club: { id: "club-internal", public_id: "club-public", slug: "asg", display_name: "ASG", status: "approved", role: "member", row_version: 4, pending_revision: false },
      team: null,
      membership_actions: [{
        id: "membership-1", action_type: "invitation", target_type: "team",
        target_public_id: "team-public", target_slug: "factory", target_display_name: "Factory",
        subject_public_id: "pilot-1", initiated_by_public_id: "pilot-2",
        created_at: "2026-08-01T10:00:00Z", expires_at: "2026-08-08T10:00:00Z", resolution_role: "subject"
      }]
    }
  });
  assert.deepEqual(buildMembershipResolveCommand({ action: state.membershipActions[0], decision: "accepted" }).payload,
    { action_id: "membership-1", decision: "accepted" });
  assert.deepEqual(buildMembershipLeaveCommand(state.club).payload,
    { entity_type: "club", entity_id: "club-internal", reason: "leave" });
  state.club.role = "head";
  assert.throws(() => buildMembershipLeaveCommand(state.club), /leave_not_allowed/);
});

test("builds manager invite and remove commands from protected entity ids", () => {
  const state = stateWithEntities();
  assert.deepEqual(buildMembershipInviteCommand({ entity: state.team, subjectPublicId: "pilot-2" }).payload, {
    target_type: "team", target_id: "team-internal", subject_public_id: "pilot-2"
  });
  assert.deepEqual(buildMembershipRemoveCommand({ entity: state.club, subjectPublicId: "pilot-2" }).payload, {
    entity_type: "club", entity_id: "club-internal", subject_public_id: "pilot-2", reason: "removed"
  });
  state.team.role = "member";
  assert.throws(() => buildMembershipInviteCommand({ entity: state.team, subjectPublicId: "pilot-2" }), /manager_required/);
  assert.throws(() => buildMembershipRemoveCommand({ entity: state.club, subjectPublicId: "<bad>" }), /invalid_subject/);
});

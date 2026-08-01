import test from "node:test";
import assert from "node:assert/strict";

import { normalizeClubsTeamsAuthState, managementEntityId } from "../../src/features/auth/clubs-teams-auth-model.js";
import {
  ClubsTeamsCommandError,
  buildCreateEntityCommand,
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

import test from "node:test";
import assert from "node:assert/strict";

import { membershipActionId, normalizeClubsTeamsAuthState, teamClubActionId } from "../../src/features/auth/clubs-teams-auth-model.js";

test("normalizes the bounded public cabinet state", () => {
  const normalized = normalizeClubsTeamsAuthState({
    enabled: true,
    pending_commands: 2,
    pending_assets: 1,
    pending_invites: [{
      command_id: "cmd-invite-1", target_type: "team", subject_public_id: "pilot-2",
      status: "pending", created_at: "2026-08-01T10:00:30Z"
    }],
    applied_state: {
      public_id: "driver-public",
      club: {
        id: "internal-club-id",
        public_id: "club-public",
        slug: "asg-racing",
        status: "approved",
        row_version: 7,
        role: "head",
        display_name: "ASG Racing",
        pending_revision: true,
        logo_moderation: { status: "pending", reason: null, decided_at: null }
      },
      team: null
    },
    notifications: [{
      command_id: "cmd-1",
      status: "applied",
      created_at: "2026-08-01T10:00:00Z",
      receipt: { signature: "secret", result: { entity_id: "internal-club-id" }, error: "private" }
    }],
    asset_notifications: [{ asset_id: "asset-1", status: "pending", created_at: "2026-08-01T10:01:00Z" }],
    snapshot: {
      available: true,
      revision: 18,
      generated_at: "2026-08-01T09:59:00Z",
      received_at: "2026-08-01T10:00:00Z",
      stale: false
    }
  });

  assert.equal(normalized.club.displayName, "ASG Racing");
  assert.equal(normalized.club.publicId, "club-public");
  assert.equal(normalized.club.pendingRevision, true);
  assert.deepEqual(normalized.club.logoModeration, { status: "pending", reason: null, decidedAt: null });
  assert.equal("id" in normalized.club, false);
  assert.deepEqual(normalized.notifications, [{ id: "cmd-1", status: "applied", createdAt: "2026-08-01T10:00:00Z" }]);
  assert.equal("receipt" in normalized.notifications[0], false);
  assert.equal(JSON.stringify(normalized).includes("internal-club-id"), false);
  assert.equal(normalized.snapshot.stale, false);
  assert.deepEqual(normalized.pendingInvites, [{
    commandId: "cmd-invite-1", targetType: "team", subjectPublicId: "pilot-2",
    status: "pending", createdAt: "2026-08-01T10:00:30Z"
  }]);
});

test("fails closed for disabled or malformed state", () => {
  const disabled = normalizeClubsTeamsAuthState({ enabled: false, applied_state: { club: { display_name: "Leak" } } });
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.club, null);
  assert.equal(disabled.snapshot.stale, true);

  const malformed = normalizeClubsTeamsAuthState({
    enabled: true,
    pending_commands: -1,
    applied_state: {
      club: { public_id: "x", slug: "../evil", display_name: "Bad", status: "root", role: "owner", row_version: 0 },
      team: { public_id: "team-1", slug: "ok-team", display_name: "Team", status: "approved", role: "head", row_version: 1 }
    },
    notifications: [{ command_id: "<script>", status: "applied" }, { command_id: "ok", status: "unknown" }],
    snapshot: { available: true, stale: "false", revision: "2" }
  });
  assert.equal(malformed.club, null);
  assert.equal(malformed.team, null);
  assert.equal(malformed.integrityValid, false);
  assert.equal(malformed.pendingCommands, 0);
  assert.deepEqual(malformed.notifications, []);
  assert.equal(malformed.snapshot.stale, true);

  const unexpected = normalizeClubsTeamsAuthState({
    enabled: true,
    applied_state: { public_id: "pilot-1", club: null, team: null, is_admin: true }
  });
  assert.equal(unexpected.integrityValid, false);
});

test("bounds notifications and ignores receipt-controlled content", () => {
  const notifications = Array.from({ length: 30 }, (_, index) => ({
    command_id: `cmd-${index}`,
    status: "pending",
    created_at: "not-a-date",
    receipt: { error: `<img src=x onerror=alert(${index})>` }
  }));
  const normalized = normalizeClubsTeamsAuthState({ enabled: true, notifications });
  assert.equal(normalized.notifications.length, 20);
  assert.equal(normalized.notifications[0].createdAt, null);
  assert.equal(JSON.stringify(normalized).includes("onerror"), false);
});

test("accepts old actor state and strictly normalizes pending membership actions", () => {
  const oldState = normalizeClubsTeamsAuthState({
    enabled: true,
    applied_state: { public_id: "pilot-1", club: null, team: null }
  });
  assert.equal(oldState.integrityValid, true);
  assert.deepEqual(oldState.membershipActions, []);

  const current = normalizeClubsTeamsAuthState({
    enabled: true,
    applied_state: {
      public_id: "pilot-1",
      club: null,
      team: null,
      membership_actions: [{
        id: "action-internal",
        action_type: "invitation",
        target_type: "club",
        target_public_id: "club-public",
        target_slug: "asg-racing",
        target_display_name: "ASG Racing",
        subject_public_id: "pilot-1",
        subject_display_name: "Pilot One",
        initiated_by_public_id: "manager-1",
        created_at: "2026-08-01T10:00:00Z",
        expires_at: "2026-08-08T10:00:00Z",
        resolution_role: "subject"
      }]
    }
  });
  assert.equal(current.integrityValid, true);
  assert.equal(current.membershipActions[0].targetDisplayName, "ASG Racing");
  assert.equal(current.membershipActions[0].subjectDisplayName, "Pilot One");
  assert.equal(membershipActionId(current.membershipActions[0]), "action-internal");
  assert.equal(JSON.stringify(current).includes("action-internal"), false);
  assert.equal("id" in current.membershipActions[0], false);

  const invalid = normalizeClubsTeamsAuthState({
    enabled: true,
    applied_state: {
      public_id: "pilot-1", club: null, team: null,
      membership_actions: [{ id: "bad", action_type: "root" }]
    }
  });
  assert.equal(invalid.integrityValid, false);
  assert.deepEqual(invalid.membershipActions, []);
});

test("strictly normalizes pending team-club actions without internal ids", () => {
  const normalized = normalizeClubsTeamsAuthState({
    enabled: true,
    applied_state: {
      public_id: "club-head", club: null, team: null, membership_actions: [],
      team_club_actions: [{
        id: "teamclub-internal", action_type: "request",
        team_public_id: "team-public", team_slug: "factory", team_display_name: "Factory Team",
        club_public_id: "club-public", club_slug: "asg-racing", club_display_name: "ASG Racing",
        initiated_by_public_id: "captain", created_at: "2026-08-01T10:00:00Z",
        expires_at: "2026-08-08T10:00:00Z", resolution_role: "manager"
      }]
    }
  });
  assert.equal(normalized.integrityValid, true);
  assert.equal(normalized.teamClubActions[0].teamDisplayName, "Factory Team");
  assert.equal(teamClubActionId(normalized.teamClubActions[0]), "teamclub-internal");
  assert.equal(JSON.stringify(normalized).includes("teamclub-internal"), false);
  assert.equal("id" in normalized.teamClubActions[0], false);

  const invalid = normalizeClubsTeamsAuthState({
    enabled: true,
    applied_state: {
      public_id: "club-head", club: null, team: null,
      team_club_actions: [{ id: "bad", action_type: "request" }]
    }
  });
  assert.equal(invalid.integrityValid, false);
  assert.deepEqual(invalid.teamClubActions, []);
});

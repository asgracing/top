import test from "node:test";
import assert from "node:assert/strict";

import { normalizeClubsTeamsAuthState } from "../../src/features/auth/clubs-teams-auth-model.js";

test("normalizes the bounded public cabinet state", () => {
  const normalized = normalizeClubsTeamsAuthState({
    enabled: true,
    pending_commands: 2,
    pending_assets: 1,
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
        pending_revision: true
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
  assert.equal("id" in normalized.club, false);
  assert.deepEqual(normalized.notifications, [{ id: "cmd-1", status: "applied", createdAt: "2026-08-01T10:00:00Z" }]);
  assert.equal("receipt" in normalized.notifications[0], false);
  assert.equal(JSON.stringify(normalized).includes("internal-club-id"), false);
  assert.equal(normalized.snapshot.stale, false);
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
  assert.equal(malformed.pendingCommands, 0);
  assert.deepEqual(malformed.notifications, []);
  assert.equal(malformed.snapshot.stale, true);
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

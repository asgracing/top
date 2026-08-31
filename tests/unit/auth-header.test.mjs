import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAuthReturnPath,
  eloCategoryId,
  normalizeAuthPayload,
  safeAvatarUrl,
  safeDiscordAuthorizationUrl,
  safeDriverProfileUrl,
  srCategory
} from "../../src/features/auth/header-auth.js";

test("maps ELO thresholds to the shared C1-C6 categories", () => {
  assert.equal(eloCategoryId(1350), 1);
  assert.equal(eloCategoryId(1250), 2);
  assert.equal(eloCategoryId(1150), 3);
  assert.equal(eloCategoryId(1050), 4);
  assert.equal(eloCategoryId(950), 5);
  assert.equal(eloCategoryId(949), 6);
  assert.equal(eloCategoryId(null), null);
});

test("maps SR thresholds to A, B and C badges", () => {
  assert.equal(srCategory(5), "A");
  assert.equal(srCategory(4.93), "B");
  assert.equal(srCategory(2.49), "C");
  assert.equal(srCategory(1, "A"), "A");
  assert.equal(srCategory(null), null);
});

test("normalizes linked auth data without exposing unexpected identity fields", () => {
  const normalized = normalizeAuthPayload({
    authenticated: true,
    linked: true,
    steam_id: "76561198000000001",
    driver: {
      public_id: "drv_abc",
      display_name: "Driver One",
      profile_url: "/driver/?id=drv_abc",
      rank: 7,
      elo: 1512,
      sr: 4.2,
      private_value: "must not survive"
    },
    steam: {
      persona_name: "Steam Driver",
      avatar_url: "https://avatars.cloudflare.steamstatic.com/avatar.jpg"
    },
    csrf_token: "csrf-token",
    permissions: { moderation_issue: true, portal_manage: true, unexpected_permission: true },
    discord: {
      linked: true,
      sync_status: "synced",
      discord_id: "482924387893379082",
      access_token: "must not survive"
    },
    preferences: {
      race_number: 77,
      pending_request: null,
      can_change: true,
      next_change_at: null,
      private_value: "must not survive"
    },
    titles: {
      enabled: true,
      definitions_version: 6,
      revision: "revision-6",
      selected_achievement_id: "career_100",
      active: {
        achievement_id: "career_100",
        title: "Veteran",
        description: "Complete 100 races.",
        icon: "star"
      },
      available: [{
        achievement_id: "career_100",
        title: "Veteran",
        description: "Complete 100 races.",
        icon: "star",
        private_value: "must not survive"
      }]
    },
    clubs_teams: {
      enabled: true,
      applied_state: null,
      pending_commands: 0,
      pending_assets: 0,
      snapshot: { available: true, revision: 1, stale: false }
    }
  });

  assert.equal(normalized.authenticated, true);
  assert.deepEqual(normalized.permissions, { moderationIssue: true, portalManage: true });
  assert.equal(normalized.linked, true);
  assert.deepEqual(normalized.driver, {
    publicId: "drv_abc",
    displayName: "Driver One",
    profileUrl: "/driver/?id=drv_abc",
    rank: 7,
    elo: 1512,
    sr: 4.2,
    srCategory: "B"
  });
  assert.equal("steam_id" in normalized, false);
  assert.equal("private_value" in normalized.driver, false);
  assert.deepEqual(normalized.discord, { linked: true, syncStatus: "synced" });
  assert.deepEqual(normalized.preferences, {
    raceNumber: 77,
    pendingRequest: null,
    canChange: true,
    nextChangeAt: null,
    blockedReason: null
  });
  assert.equal("discord_id" in normalized.discord, false);
  assert.equal("access_token" in normalized.discord, false);
  assert.equal(normalized.clubsTeams.enabled, true);
  assert.equal(normalized.clubsTeams.snapshot.revision, 1);
  assert.equal(normalized.titles.selectedAchievementId, "career_100");
  assert.equal(normalized.titles.definitionsVersion, 6);
  assert.equal(normalized.titles.revision, "revision-6");
  assert.deepEqual(normalized.titles.active, {
    achievementId: "career_100",
    title: "Veteran",
    description: "Complete 100 races.",
    icon: "star",
    earnedAt: null
  });
  assert.equal("private_value" in normalized.titles.available[0], false);
});

test("hides selectable titles from an obsolete achievements catalog", () => {
  const normalized = normalizeAuthPayload({
    authenticated: true,
    linked: false,
    titles: {
      enabled: true,
      definitions_version: 5,
      selected_achievement_id: "wins_50",
      active: { achievement_id: "wins_50", title: "Victory Machine" },
      available: [{ achievement_id: "wins_50", title: "Victory Machine" }]
    }
  });
  assert.equal(normalized.titles.enabled, false);
  assert.equal(normalized.titles.selectedAchievementId, null);
  assert.equal(normalized.titles.active, null);
  assert.deepEqual(normalized.titles.available, []);
});

test("accepts only the fixed Discord OAuth authorization endpoint", () => {
  assert.equal(
    safeDiscordAuthorizationUrl("https://discord.com/oauth2/authorize?client_id=123&state=abc"),
    "https://discord.com/oauth2/authorize?client_id=123&state=abc"
  );
  assert.equal(safeDiscordAuthorizationUrl("https://evil.example/oauth2/authorize"), null);
  assert.equal(safeDiscordAuthorizationUrl("https://discord.com.evil.example/oauth2/authorize"), null);
  assert.equal(safeDiscordAuthorizationUrl("https://discord.com/api/oauth2/token"), null);
});

test("normalizes only known Discord role synchronization states", () => {
  const payload = {
    authenticated: true,
    linked: false,
    discord: { linked: true, sync_status: "unlink_pending", error_code: "private" }
  };
  assert.deepEqual(normalizeAuthPayload(payload).discord, {
    linked: true,
    syncStatus: "unlink_pending"
  });
  payload.discord.sync_status = "unexpected_server_value";
  assert.equal(normalizeAuthPayload(payload).discord.syncStatus, null);
});

test("rejects external profile and avatar URLs", () => {
  assert.equal(safeDriverProfileUrl("https://evil.example/driver/?id=x"), null);
  assert.equal(safeDriverProfileUrl("/driver/?id=drv_abc"), "/driver/?id=drv_abc");
  assert.equal(safeAvatarUrl("http://avatars.cloudflare.steamstatic.com/a.jpg"), null);
  assert.equal(safeAvatarUrl("https://steamstatic.com.evil.example/a.jpg"), null);
  assert.equal(
    safeAvatarUrl("https://avatars.cloudflare.steamstatic.com/a.jpg"),
    "https://avatars.cloudflare.steamstatic.com/a.jpg"
  );
});

test("builds a bounded local return path without fragments", () => {
  assert.equal(
    buildAuthReturnPath({ pathname: "/driver/", search: "?id=drv_abc", hash: "#private" }),
    "/driver/?id=drv_abc"
  );
  assert.equal(buildAuthReturnPath({ pathname: "//evil.example", search: "" }), "/");
  assert.equal(buildAuthReturnPath({ pathname: "/\\evil", search: "" }), "/");
});

test("keeps authenticated but unlinked Steam accounts explicit", () => {
  const normalized = normalizeAuthPayload({
    authenticated: true,
    linked: false,
    driver: null,
    steam: { persona_name: "Steam Driver", avatar_url: null },
    csrf_token: "csrf"
  });
  assert.equal(normalized.authenticated, true);
  assert.equal(normalized.linked, false);
  assert.equal(normalized.driver, null);
  assert.equal(normalized.steam.personaName, "Steam Driver");
});

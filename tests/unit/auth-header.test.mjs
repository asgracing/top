import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAuthReturnPath,
  eloCategoryId,
  normalizeAuthPayload,
  safeAvatarUrl,
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
      elo: 1512,
      sr: 4.2,
      private_value: "must not survive"
    },
    steam: {
      persona_name: "Steam Driver",
      avatar_url: "https://avatars.cloudflare.steamstatic.com/avatar.jpg"
    },
    csrf_token: "csrf-token"
  });

  assert.equal(normalized.authenticated, true);
  assert.equal(normalized.linked, true);
  assert.deepEqual(normalized.driver, {
    publicId: "drv_abc",
    displayName: "Driver One",
    profileUrl: "/driver/?id=drv_abc",
    elo: 1512,
    sr: 4.2,
    srCategory: "B"
  });
  assert.equal("steam_id" in normalized, false);
  assert.equal("private_value" in normalized.driver, false);
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

import test from "node:test";
import assert from "node:assert/strict";

import { normalizeDriverOverlayState, safeDriverOverlayUrl } from "../../account/driver-overlay.js";
import { normalizeOverlayPayload, overlayTokenFromHash, safeSteamAvatarUrl } from "../../overlay/driver/model.js";

const token = `v1.${"a".repeat(24)}.${"b".repeat(43)}`;

test("account accepts only the dedicated ASG overlay fragment URL", () => {
  const valid = `https://asgracing.ru/overlay/driver/#token=${token}`;
  assert.equal(safeDriverOverlayUrl(valid), valid);
  assert.equal(safeDriverOverlayUrl(`https://evil.example/overlay/driver/#token=${token}`), null);
  assert.equal(safeDriverOverlayUrl(`https://asgracing.ru/overlay/driver/?token=${token}`), null);
  assert.equal(normalizeDriverOverlayState({
    available: true,
    enabled: true,
    url: valid,
    settings: { show_avatar: false, show_race_number: true }
  }).settings.showAvatar, false);
});

test("OBS model validates token, payload and Steam avatar hosts", () => {
  assert.equal(overlayTokenFromHash(`#token=${token}`), token);
  assert.equal(overlayTokenFromHash("#token=broken"), null);
  assert.equal(safeSteamAvatarUrl("https://avatars.cloudflare.steamstatic.com/a.jpg"), "https://avatars.cloudflare.steamstatic.com/a.jpg");
  assert.equal(safeSteamAvatarUrl("https://evil.example/a.jpg"), null);
  assert.deepEqual(normalizeOverlayPayload({
    elo: 1420.4,
    elo_category_id: 1,
    elo_category_name: "Champion",
    sr: 9.99,
    sr_category: "A",
    race_number: 765,
    avatar_url: "https://avatars.cloudflare.steamstatic.com/a.jpg",
    display: { show_avatar: true, show_race_number: false }
  }), {
    elo: 1420,
    eloCategoryId: 1,
    eloCategoryName: "Champion",
    sr: "9.99",
    srCategory: "A",
    raceNumber: 765,
    avatarUrl: "https://avatars.cloudflare.steamstatic.com/a.jpg",
    showAvatar: true,
    showRaceNumber: false
  });
});

import assert from "node:assert/strict";
import test from "node:test";

import { loadRosterAvatarUrl } from "../../src/pages/clubs-teams/detail-page.js";

test("loads a safe Steam avatar for a public roster member", async () => {
  let requestedUrl = "";
  const client = {
    async requestJson(url) {
      requestedUrl = String(url);
      return { avatar_url: "https://avatars.cloudflare.steamstatic.com/example_full.jpg" };
    }
  };
  assert.equal(
    await loadRosterAvatarUrl({ client, publicId: "drv_avatar_test" }),
    "https://avatars.cloudflare.steamstatic.com/example_full.jpg"
  );
  assert.equal(requestedUrl, "https://auth.asgracing.ru/v1/drivers/drv_avatar_test/steam-profile");
});

test("keeps initials when the avatar response is absent or unsafe", async () => {
  const unsafeClient = { async requestJson() { return { avatar_url: "https://example.com/avatar.jpg" }; } };
  const missingClient = { async requestJson() { return { avatar_url: null }; } };
  assert.equal(await loadRosterAvatarUrl({ client: unsafeClient, publicId: "drv_unsafe_test" }), null);
  assert.equal(await loadRosterAvatarUrl({ client: missingClient, publicId: "drv_missing_test" }), null);
});

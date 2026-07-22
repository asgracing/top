import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeTrackBackgroundCode,
  resolveTrackBackgroundFile
} from "../../src/features/server-status/track-background.js";

test("resolves server backgrounds directly from ACC track codes", () => {
  assert.equal(resolveTrackBackgroundFile("monza"), "monza.jpg");
  assert.equal(resolveTrackBackgroundFile("mount_panorama"), "mount_panorama.jpg");
  assert.equal(resolveTrackBackgroundFile("Mount Panorama"), "mount_panorama.jpg");
  assert.equal(resolveTrackBackgroundFile("nurburgring_24h"), "nurburgring_24h.jpg");
});

test("normalizes safe aliases and rejects unknown assets", () => {
  assert.equal(normalizeTrackBackgroundCode(" Laguna-Seca "), "laguna_seca");
  assert.equal(resolveTrackBackgroundFile("lagunaseca"), "laguna_seca.jpg");
  assert.equal(resolveTrackBackgroundFile("../../private"), null);
  assert.equal(resolveTrackBackgroundFile("unknown_track"), null);
});

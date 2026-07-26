import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeTrackBackgroundCode,
  resolveTrackBackgroundFile,
  selectRandomTrackBackgroundFile,
  TRACK_BACKGROUND_CAROUSEL_FILES
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

test("exposes the approved unique track background carousel", () => {
  assert.deepEqual(TRACK_BACKGROUND_CAROUSEL_FILES, [
    "barcelona.jpg",
    "hungaroring.jpg",
    "imola.jpg",
    "kyalami.jpg",
    "laguna_seca.jpg",
    "misano.jpg",
    "monza.jpg",
    "mount_panorama.jpg",
    "nurburgring.jpg",
    "nurburgring_24h.jpg",
    "paul_ricard.jpg",
    "silverstone.jpg",
    "spa.jpg",
    "suzuka.jpg",
    "zandvoort.jpg",
    "zolder.jpg"
  ]);
  assert.equal(new Set(TRACK_BACKGROUND_CAROUSEL_FILES).size, TRACK_BACKGROUND_CAROUSEL_FILES.length);
});

test("selects deterministic carousel boundaries from an injected random source", () => {
  assert.equal(selectRandomTrackBackgroundFile(() => 0), "barcelona.jpg");
  assert.equal(selectRandomTrackBackgroundFile(() => 0.5), "nurburgring.jpg");
  assert.equal(selectRandomTrackBackgroundFile(() => 1), "zolder.jpg");
  assert.equal(selectRandomTrackBackgroundFile(() => Number.NaN), "barcelona.jpg");
});

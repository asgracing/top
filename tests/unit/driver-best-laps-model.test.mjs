import test from "node:test";
import assert from "node:assert/strict";
import { getDriverProfileKey, normalizeDriverBestLaps, selectDriverBestLap } from "../../src/pages/driver/best-laps-model.js";

test("uses stable driver profile key fallbacks", () => {
  assert.equal(getDriverProfileKey({ public_id: 10, player_id: 20 }), "10");
  assert.equal(getDriverProfileKey({ player_id: 20 }), "20");
  assert.equal(getDriverProfileKey({ driver: "Name" }), "Name");
});

test("normalizes alternate best-lap fields", () => {
  const items = normalizeDriverBestLaps({ bestlap_tracks: [{ track: "monza", best_lap_ms: 107123, best_lap_car_name: "Ferrari" }] }, { formatLapTime: value => `lap:${value}` });
  assert.deepEqual({ track: items[0].track_code, lap: items[0].best_lap, car: items[0].car_name }, { track: "monza", lap: "lap:107123", car: "Ferrari" });
});

test("drops incomplete laps and selects stored track", () => {
  const items = normalizeDriverBestLaps({ best_laps_by_track: [{ track_code: "empty" }, { track_code: "spa", best_lap: "2:18" }] }, { formatLapTime: String });
  assert.equal(items.length, 1);
  assert.equal(selectDriverBestLap({ public_id: 1 }, items, new Map([["1", "spa"]])).track_code, "spa");
});

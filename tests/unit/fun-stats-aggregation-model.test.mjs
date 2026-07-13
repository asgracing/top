import test from "node:test";
import assert from "node:assert/strict";
import { aggregateFunStatsFallback } from "../../src/pages/fun-stats/aggregation-model.js";

const dependencies = { isActiveResult: row => row.active !== false, makePublicDriverId: id => id ? `p-${id}` : null, formatLapTime: ms => `lap:${ms}` };

test("aggregates Fun Stats awards, summaries and lists", () => {
  const races = [{ results: [
    { player_id: 1, driver: "Alpha", position: 1, points: 25, positions_delta: 3, best_lap_ms: 90000, had_best_lap: true, car_name: "Ferrari" },
    { player_id: 2, driver: "Beta", position: 2, points: 18, positions_delta: -1, best_lap_ms: 91000, car_name: "BMW" },
    { player_id: 3, driver: "Ignored", active: false, position: 1, points: 99 },
  ] }];
  const result = aggregateFunStatsFallback({ period: "week", races, safety: [{ player_id: 2, driver: "Beta", penalty_points: 4 }], ...dependencies });
  assert.equal(result.summary.activeDrivers, 2);
  assert.equal(result.summary.overtakes, 3);
  assert.equal(result.awards.pointsBoss.driver, "Alpha");
  assert.equal(result.awards.hotLapHero.lap, "lap:90000");
  assert.equal(result.awards.chaosMagnet.driver, "Beta");
  assert.equal(result.lists.cars[0].starts, 1);
});

test("returns empty Fun Stats contracts", () => {
  const result = aggregateFunStatsFallback({ period: "month", ...dependencies });
  assert.equal(result.summary.races, 0);
  assert.equal(result.awards.pointsBoss, null);
  assert.deepEqual(result.lists.active, []);
});

test("validates aggregation dependencies", () => {
  assert.throws(() => aggregateFunStatsFallback({}), /requires result/);
});

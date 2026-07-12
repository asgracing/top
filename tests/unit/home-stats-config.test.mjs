import test from "node:test";
import assert from "node:assert/strict";
import { HOME_STATS_TABS, bestlapsColumns, createHomeStatsState, leaderboardColumns } from "../../src/pages/home/stats-config.js";

test("declares stable home statistics table columns", () => {
  assert.deepEqual(leaderboardColumns.map(column => column.key), ["rank", "driver", "elo", "safety_rating", "points", "wins", "podiums", "races", "average_finish", "best_lap", "best_lap_car_name"]);
  assert.deepEqual(bestlapsColumns.map(column => column.key), ["rank", "driver", "elo", "safety_rating", "best_lap", "car_name", "session_type", "updated_at"]);
});

test("creates isolated home statistics state", () => {
  const first = createHomeStatsState({ isHome: true });
  const second = createHomeStatsState({ isHome: false });
  first.sorts.leaderboard.key = "points";
  assert.equal(second.sorts.leaderboard.key, null);
  assert.deepEqual(first.deferredSections, { leaderboard: false, bestlaps: false, safety: false });
  assert.deepEqual(second.deferredSections, { leaderboard: true, bestlaps: true, safety: true });
});

test("maps every home tab to a panel and subtitle", () => {
  assert.deepEqual(Object.keys(HOME_STATS_TABS), ["leaderboard", "bestlaps", "safety"]);
  Object.values(HOME_STATS_TABS).forEach(tab => { assert.ok(tab.panelId); assert.ok(tab.subtitleKey); });
});

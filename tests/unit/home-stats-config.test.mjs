import test from "node:test";
import assert from "node:assert/strict";
import { HOME_STATS_TABS, bestlapsColumns, clubsTeamsColumns, createHomeStatsState, leaderboardColumns } from "../../src/pages/home/stats-config.js";

test("declares stable home statistics table columns", () => {
  assert.deepEqual(leaderboardColumns.map(column => column.key), ["rank", "driver", "elo", "safety_rating", "points", "wins", "podiums", "races", "average_finish", "club", "team"]);
  assert.equal(leaderboardColumns.at(-2).sortable, false);
  assert.equal(leaderboardColumns.at(-1).sortable, false);
  assert.deepEqual(bestlapsColumns.map(column => column.key), ["rank", "driver", "elo", "safety_rating", "best_lap", "car_name", "session_type", "updated_at"]);
  assert.deepEqual(clubsTeamsColumns.map(column => column.key), ["position", "logo", "display_name", "short_name", "total_points", "average_elo", "average_sr", "race_count"]);
});

test("creates isolated home statistics state", () => {
  const first = createHomeStatsState({ isHome: true });
  const second = createHomeStatsState({ isHome: false });
  first.sorts.leaderboard.key = "points";
  assert.equal(second.sorts.leaderboard.key, null);
  assert.deepEqual(first.deferredSections, { leaderboard: false, bestlaps: false, safety: false, clubsTeams: false });
  assert.deepEqual(second.deferredSections, { leaderboard: true, bestlaps: true, safety: true, clubsTeams: true });
});

test("maps every home tab to a panel and subtitle", () => {
  assert.deepEqual(Object.keys(HOME_STATS_TABS), ["leaderboard", "bestlaps", "safety", "clubsTeams"]);
  Object.values(HOME_STATS_TABS).forEach(tab => { assert.ok(tab.panelId); assert.ok(tab.subtitleKey); });
});

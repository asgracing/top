import test from "node:test";
import assert from "node:assert/strict";
import { filterBestlapsByTrack, filterHomeRowsByDriver, processBestlaps, processLeaderboard } from "../../src/pages/home/stats-model.js";

const rows = [{ driver: "Álvaro", points: 2 }, { driver: "Иван Петров", points: 3 }, { driver: "Other", points: 1 }];
const sortRows = data => [...data].sort((a, b) => b.points - a.points);

test("filters home rows by localized driver text without mutating input", () => {
  assert.deepEqual(filterHomeRowsByDriver(rows, "иван", { locale: "ru" }).map(row => row.driver), ["Иван Петров"]);
  assert.notEqual(filterHomeRowsByDriver(rows, ""), rows);
});

test("filters best laps by normalized track code or track name", () => {
  const laps = [{ track_code: "Monza" }, { track: "spa" }, { track_code: "monza" }];
  assert.equal(filterBestlapsByTrack(laps, " MONZA ").length, 2);
  assert.equal(filterBestlapsByTrack(laps, "").length, 3);
});

test("processes leaderboard through the injected stable sorter", () => {
  const result = processLeaderboard({ rows, search: "", sortState: {}, columns: [], sortRows, locale: "en" });
  assert.deepEqual(result.map(row => row.points), [3, 2, 1]);
});

test("applies track and driver filters before best-lap sorting", () => {
  const laps = [{ driver: "One", track_code: "monza", points: 1 }, { driver: "Two", track: "monza", points: 3 }, { driver: "Two", track: "spa", points: 9 }];
  const result = processBestlaps({ rows: laps, trackFilter: "monza", search: "two", sortState: {}, columns: [], sortRows, locale: "en" });
  assert.deepEqual(result.map(row => row.points), [3]);
});

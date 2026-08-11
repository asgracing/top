import test from "node:test";
import assert from "node:assert/strict";
import { filterBestlapsByTrack, filterClubsTeamsRows, filterHomeRowsByDriver, processBestlaps, processLeaderboard } from "../../src/pages/home/stats-model.js";

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

test("filters clubs and teams by localized name, slug or tag", () => {
  const entities = [{ public_id: "one", display_name: "ASG Racing", slug: "asg-racing" }, { public_id: "two", display_name: "Север", slug: "north" }];
  const tags = new Map([["one", "ASG"], ["two", "СВР"]]);
  const options = { locale: "ru", getTag: row => tags.get(row.public_id) };
  assert.deepEqual(filterClubsTeamsRows(entities, "свр", options).map(row => row.public_id), ["two"]);
  assert.deepEqual(filterClubsTeamsRows(entities, "asg-racing", options).map(row => row.public_id), ["one"]);
  assert.notEqual(filterClubsTeamsRows(entities, "", options), entities);
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

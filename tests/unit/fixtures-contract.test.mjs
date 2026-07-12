import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const fixture = JSON.parse(await readFile(new URL("../fixtures/top-data-v2.json", import.meta.url), "utf8"));

test("top data fixture contains every home statistics table", () => {
  for (const key of ["leaderboard", "bestlaps", "safety"]) assert.ok(Array.isArray(fixture[key]), `${key} must be an array`);
});

test("leaderboard regression fixture covers extreme layout values", () => {
  const row = fixture.leaderboard[0];
  assert.ok(row.rank >= 10000, "fixture must retain a five-digit rank");
  assert.match(row.driver, /\[[^\]]+\]$/);
  assert.ok(row.best_lap_car_name.length >= 20, "fixture must retain a long car name");
});

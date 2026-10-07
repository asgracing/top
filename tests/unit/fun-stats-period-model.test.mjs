import test from "node:test";
import assert from "node:assert/strict";
import { getFunStatsPeriodWindow, getLatestRaceDate, selectFunStatsPeriodRaces } from "../../src/pages/fun-stats/period-model.js";

test("uses the latest valid race as the period anchor", () => {
  const latest = getLatestRaceDate([{ finished_at: "2026-07-01T10:00:00Z" }, { date: "2026-07-05T12:00:00Z" }, { date: "bad" }]);
  assert.equal(latest.toISOString(), "2026-07-05T12:00:00.000Z");
});

test("creates seven and thirty day windows", () => {
  const races = [{ finished_at: "2026-07-10T12:00:00Z" }];
  const week = getFunStatsPeriodWindow("week", races);
  const month = getFunStatsPeriodWindow("month", races);
  assert.equal(week.start.toISOString(), "2026-07-03T21:00:00.000Z");
  assert.equal(month.start.toISOString(), "2026-06-10T21:00:00.000Z");
  assert.equal(week.end.toISOString(), month.end.toISOString());
});

test("uses Moscow midnight independently of the process timezone", () => {
  const week = getFunStatsPeriodWindow("week", [{ finished_at: "2026-09-09T21:30:00Z" }]);
  assert.equal(week.start.toISOString(), "2026-09-03T21:00:00.000Z");
});

test("treats legacy timestamps without an offset as Moscow wall time", () => {
  const latest = getLatestRaceDate([{ finished_at: "2026-09-09T18:13:42" }]);
  assert.equal(latest.toISOString(), "2026-09-09T15:13:42.000Z");
});

test("selects period races newest first without mutating input", () => {
  const races = [{ date: "2026-07-01T12:00:00Z" }, { finished_at: "2026-07-10T12:00:00Z" }, { date: "2026-07-09T12:00:00Z" }];
  const selected = selectFunStatsPeriodRaces("week", races);
  assert.deepEqual(selected.map(row => row.finished_at || row.date), ["2026-07-10T12:00:00Z", "2026-07-09T12:00:00Z"]);
  assert.equal(races[0].date, "2026-07-01T12:00:00Z");
});

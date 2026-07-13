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
  assert.equal(week.start.getDate(), 4);
  assert.equal(month.start.getDate(), 11);
  assert.equal(week.end.toISOString(), month.end.toISOString());
});

test("selects period races newest first without mutating input", () => {
  const races = [{ date: "2026-07-01T12:00:00Z" }, { finished_at: "2026-07-10T12:00:00Z" }, { date: "2026-07-09T12:00:00Z" }];
  const selected = selectFunStatsPeriodRaces("week", races);
  assert.deepEqual(selected.map(row => row.finished_at || row.date), ["2026-07-10T12:00:00Z", "2026-07-09T12:00:00Z"]);
  assert.equal(races[0].date, "2026-07-01T12:00:00Z");
});

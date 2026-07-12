import test from "node:test";
import assert from "node:assert/strict";
import { getNestedTableValue, parseTableLapTime, parseTableNumber, sortTableRows } from "../../src/shared/table-model.js";

test("parses localized numbers and missing values", () => {
  assert.equal(parseTableNumber("2,75"), 2.75);
  assert.equal(parseTableNumber("-"), Number.POSITIVE_INFINITY);
});

test("parses minute and hour lap times", () => {
  assert.equal(parseTableLapTime("1:47.250"), 107250);
  assert.equal(parseTableLapTime("1:02:03.004"), 3723004);
});

test("reads nested column values", () => {
  assert.equal(getNestedTableValue({ penalties: { driveThrough: 2 } }, "penalties.driveThrough"), 2);
});

test("sorts rows by lap time with rank tie-break", () => {
  const rows = [{ rank: 2, lap: "1:48.000" }, { rank: 3, lap: "1:47.000" }, { rank: 1, lap: "1:47.000" }];
  assert.deepEqual(sortTableRows(rows, { key: "lap", direction: "asc" }, [{ key: "lap", type: "time" }]).map(row => row.rank), [1, 3, 2]);
});

test("keeps missing ELO values last in both directions", () => {
  const rows = [{ id: "missing" }, { id: "low", elo: 900 }, { id: "high", elo: 1100 }];
  const columns = [{ key: "elo", type: "number" }];
  const getEloValue = row => row.elo ?? null;
  assert.deepEqual(sortTableRows(rows, { key: "elo", direction: "asc" }, columns, { getEloValue }).map(row => row.id), ["low", "high", "missing"]);
  assert.deepEqual(sortTableRows(rows, { key: "elo", direction: "desc" }, columns, { getEloValue }).map(row => row.id), ["high", "low", "missing"]);
});

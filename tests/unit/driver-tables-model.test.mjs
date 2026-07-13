import test from "node:test";
import assert from "node:assert/strict";
import { buildDriverRaceTableState, buildDriverTrackTableState, DRIVER_RACE_COLUMNS, DRIVER_TRACK_COLUMNS } from "../../src/pages/driver/tables-model.js";

const paginateRows = (rows, page, pageSize) => ({ items: rows.slice(0, pageSize), page, totalPages: 1, totalItems: rows.length, startIndex: rows.length ? 1 : 0, endIndex: rows.length });
const sortRows = rows => [...rows].reverse();

test("defines immutable driver table contracts", () => {
  assert.equal(DRIVER_RACE_COLUMNS.length, 11);
  assert.equal(DRIVER_TRACK_COLUMNS.length, 7);
  assert.ok(Object.isFrozen(DRIVER_RACE_COLUMNS[0]));
});

test("driver race state excludes uncounted rows and finds the fastest lap", () => {
  const state = buildDriverRaceTableState({
    rows: [{ race_id: "a", best_lap_ms: 100 }, { race_id: "b", best_lap_ms: 90 }, { race_id: "x", best_lap_ms: 10, counted_for_stats: false }],
    sort: {}, page: 1, pageSize: 10, sortRows, paginateRows,
  });
  assert.deepEqual(state.items.map(row => row.race_id), ["b", "a"]);
  assert.equal(state.fastestLapMs, 90);
  assert.equal(state.countedRows.length, 2);
});

test("driver track state delegates sorting and pagination", () => {
  const state = buildDriverTrackTableState({ rows: [{ track: "spa" }, { track: "monza" }], sort: {}, page: 1, pageSize: 1, sortRows, paginateRows });
  assert.deepEqual(state.items.map(row => row.track), ["monza"]);
  assert.equal(state.totalItems, 2);
});

test("driver table models validate their dependencies", () => {
  assert.throws(() => buildDriverRaceTableState({}), /sorter and paginator/);
  assert.throws(() => buildDriverTrackTableState({}), /sorter and paginator/);
});

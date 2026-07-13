import test from "node:test";
import assert from "node:assert/strict";
import { buildRacesPageState, processRaces, RACES_COLUMNS } from "../../src/pages/races/model.js";

test("declares the races table contract", () => {
  assert.deepEqual(RACES_COLUMNS.map(column => column.key), ["finished_at", "track", "winner", "participants_count", "average_elo", "best_lap"]);
  assert.equal(Object.isFrozen(RACES_COLUMNS), true);
});

test("preserves server ordering for paged archives", () => {
  const rows = [{ race_id: 2 }, { race_id: 1 }];
  const result = processRaces({ rows, archiveMeta: { page: 1 } });
  assert.deepEqual(result, rows);
  assert.notEqual(result, rows);
});

test("sorts fallback rows newest first through the shared sorter", () => {
  const rows = [{ race_id: 1 }];
  let received;
  processRaces({ rows, sortRows: (...args) => { received = args; return rows; } });
  assert.deepEqual(received[1], { key: "finished_at", direction: "desc" });
  assert.equal(received[2], RACES_COLUMNS);
});

test("rejects a missing fallback sorter", () => {
  assert.throws(() => processRaces({ rows: [] }), /row sorter/);
});

test("normalizes server pagination metadata", () => {
  const result = buildRacesPageState({ rows: [{ id: 1 }], page: 4, archiveMeta: { page: 2, total_pages: 8, total_items: 77, start_index: 11, end_index: 20 } });
  assert.deepEqual({ page: result.page, totalPages: result.totalPages, totalItems: result.totalItems, serverPaged: result.serverPaged }, { page: 2, totalPages: 8, totalItems: 77, serverPaged: true });
});

test("delegates local pagination", () => {
  const result = buildRacesPageState({ rows: [1, 2], page: 2, pageSize: 1, paginateRows: (rows, page, size) => ({ items: rows.slice(1), page, totalPages: 2, totalItems: rows.length, startIndex: 2, endIndex: 2, size }) });
  assert.equal(result.serverPaged, false);
  assert.deepEqual(result.items, [2]);
});

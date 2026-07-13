import test from "node:test";
import assert from "node:assert/strict";
import { processRaces, RACES_COLUMNS } from "../../src/pages/races/model.js";

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

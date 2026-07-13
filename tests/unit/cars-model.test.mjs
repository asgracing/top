import test from "node:test";
import assert from "node:assert/strict";
import { CARS_COLUMNS, processCars } from "../../src/pages/cars/model.js";

test("declares the complete cars table contract", () => {
  assert.deepEqual(CARS_COLUMNS.map(column => column.key), [
    "car_name", "races", "wins", "win_rate", "podiums", "unique_drivers",
    "average_finish", "fastest_lap_awards", "best_lap"
  ]);
  assert.equal(Object.isFrozen(CARS_COLUMNS), true);
});

test("processes cars through the shared sorter", () => {
  const rows = [{ car_name: "B" }, { car_name: "A" }];
  const sortState = { key: "car_name", direction: "asc" };
  let received;
  const result = processCars({ rows, sortState, sortRows: (...args) => { received = args; return [rows[1], rows[0]]; } });
  assert.deepEqual(result.map(row => row.car_name), ["A", "B"]);
  assert.equal(received[0], rows);
  assert.equal(received[1], sortState);
  assert.equal(received[2], CARS_COLUMNS);
});

test("normalizes invalid rows and rejects a missing sorter", () => {
  assert.deepEqual(processCars({ rows: null, sortState: {}, sortRows: rows => rows }), []);
  assert.throws(() => processCars({}), /row sorter/);
});

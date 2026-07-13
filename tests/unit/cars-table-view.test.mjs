import test from "node:test";
import assert from "node:assert/strict";
import { createCarsTableView } from "../../src/pages/cars/table-view.js";

function setup() {
  const table = { innerHTML: "" };
  const calls = [];
  const view = createCarsTableView({
    documentRef: { getElementById: () => table }, columns: [{ key: "wins" }], translate: key => key,
    escapeHtml: String, renderHeaders: () => "<th>Wins</th>", bindHeaders: (...args) => calls.push(["bind", ...args]),
    renderCarImage: () => "<img>", renderCarLink: value => value, renderDriverLink: value => value,
    formatPercent: value => `${value}%`, formatAverageFinish: String, getBestLapClass: active => active ? "best" : "",
    replaceWithTextState: (...args) => calls.push(["state", ...args]), setLoadingMarkup: (...args) => calls.push(["loading", ...args])
  });
  return { view, table, calls };
}

test("renders cars rows and highlights the fastest lap", () => {
  const { view, table, calls } = setup();
  view.render({ rows: [{ car_name: "Ferrari", wins: 2, best_lap: "1:47", best_lap_ms: 107000 }], sortState: {}, fastestLapMs: 107000, onSort() {} });
  assert.match(table.innerHTML, /Ferrari/);
  assert.match(table.innerHTML, /class="best"/);
  assert.equal(calls[0][0], "bind");
});

test("delegates loading and empty states", () => {
  const { view, calls } = setup();
  view.render({ loading: true });
  view.render({ rows: [] });
  assert.deepEqual(calls.map(call => call[0]), ["loading", "state"]);
});

test("rejects incomplete dependencies", () => {
  assert.throws(() => createCarsTableView({}), /complete rendering dependencies/);
});

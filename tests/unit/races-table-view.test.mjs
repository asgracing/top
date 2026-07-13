import test from "node:test";
import assert from "node:assert/strict";
import { createRacesTableView } from "../../src/pages/races/table-view.js";

function setup() {
  const table = { innerHTML: "" };
  const wrap = { style: {} };
  const calls = [];
  const view = createRacesTableView({
    documentRef: { getElementById: id => id === "races-table" ? table : wrap }, translate: key => key === "racesCols" ? ["Date", "Track"] : key,
    escapeHtml: String, formatDateTime: value => value, humanizeTrack: value => `track:${value}`,
    renderDriverLink: value => value, bindInteractiveRows: (...args) => calls.push(["rows", ...args]),
    renderPagination: (...args) => calls.push(["pagination", ...args]), replaceWithTextState: (...args) => calls.push(["state", ...args])
  });
  return { view, table, wrap, calls };
}

test("renders race rows and pagination", () => {
  const { view, table, calls } = setup();
  view.render({ items: [{ track: "monza", winner: "Driver" }], page: 1, totalPages: 2, totalItems: 1, startIndex: 1, endIndex: 1 }, { onOpen() {}, onPage() {} });
  assert.match(table.innerHTML, /track:monza/);
  assert.deepEqual(calls.map(call => call[0]), ["rows", "pagination"]);
});

test("renders empty state and hides pagination", () => {
  const { view, wrap, calls } = setup();
  view.render({ items: [], totalItems: 0 });
  assert.equal(wrap.style.display, "none");
  assert.equal(calls[0][0], "state");
});

test("rejects incomplete dependencies", () => {
  assert.throws(() => createRacesTableView({}), /complete rendering dependencies/);
});

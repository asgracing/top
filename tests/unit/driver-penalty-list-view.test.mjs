import test from "node:test";
import assert from "node:assert/strict";
import { renderDriverPenaltyList } from "../../src/pages/driver/penalty-list-view.js";

test("renders an empty driver penalty state", () => {
  assert.match(renderDriverPenaltyList({}, { escapeHtml: String }), /empty-box/);
});

test("orders driver penalties by descending count and escapes values", () => {
  const markup = renderDriverPenaltyList({ Contact: 2, Cut: 5 }, { escapeHtml: value => `safe:${value}` });
  assert.ok(markup.indexOf("safe:Cut") < markup.indexOf("safe:Contact"));
  assert.match(markup, /safe:5/);
});

test("requires an escaping dependency", () => {
  assert.throws(() => renderDriverPenaltyList({}, {}), /escaping dependency/);
});

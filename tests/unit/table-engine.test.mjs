import test from "node:test";
import assert from "node:assert/strict";
import { createTableDefinition, renderSortableHeaders, renderTableShell, renderTableState } from "../../src/features/stats/table-engine.js";

test("renders a shared table shell and colgroup", () => {
  const html = renderTableShell({ className: "leaderboard-stats-table", columns: [{ className: "rank-column" }, { className: "driver-column" }], headerHtml: "<th>Rank</th><th>Driver</th>", rowsHtml: "<tr><td>1</td><td>A</td></tr>" });
  assert.match(html, /stats-table leaderboard-stats-table/); assert.match(html, /<col class="rank-column">/); assert.match(html, /<tbody><tr>/);
});
test("sanitizes structural class names", () => {
  const html = renderTableShell({ className: "x\" onclick=bad", columns: [{ className: "safe bad" }] });
  assert.doesNotMatch(html.match(/class="([^"]+)"/)?.[1] || "", /["= ]{2,}|=/);
  assert.doesNotMatch(html, /onclick=/);
});
test("renders normalized states", () => {
  assert.match(renderTableState({ kind: "loading", message: "Wait" }), /data-table-state="loading"/);
  assert.match(renderTableState({ kind: "unknown", message: "None" }), /data-table-state="empty"/);
});
test("validates table definitions", () => {
  assert.throws(() => createTableDefinition({ name: "x", columns: [{ key: "a" }, { key: "a" }] }), TypeError);
  assert.equal(createTableDefinition({ name: "x", columns: [{ key: "a" }] }).columns[0].key, "a");
});
test("renders accessible sortable headers from column metadata", () => {
  const html = renderSortableHeaders({ columns: [{ key: "rank", className: "rank-column", align: "center" }], labels: ["Position"], sortState: { key: "rank", direction: "desc" } });
  assert.match(html, /rank-column cell-center sortable sort-desc/);
  assert.match(html, /aria-sort="descending"/);
  assert.match(html, />Position<\/th>/);
});

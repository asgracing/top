import test from "node:test";
import assert from "node:assert/strict";
import { HOME_LOADING_TEXT_IDS, HOME_TABLE_VIEW_STATES, applyHomeTableViewState } from "../../src/pages/home/view-state-config.js";

test("declares every home statistics table view state", () => {
  assert.deepEqual(HOME_TABLE_VIEW_STATES.map(item => item.tableId), ["leaderboard-table", "bestlaps-table", "safety-table"]);
  assert.equal(new Set(HOME_LOADING_TEXT_IDS).size, HOME_LOADING_TEXT_IDS.length);
});

test("applies loading state and hides pagination", () => {
  const calls = [];
  const elements = Object.fromEntries(HOME_TABLE_VIEW_STATES.map(item => [item.paginationId, { style: {} }]));
  applyHomeTableViewState({ documentRef: { getElementById: id => elements[id] || null }, state: "loading", translate: key => key, setLoadingMarkup: (...args) => calls.push(args), replaceWithTextState() {} });
  assert.equal(calls.length, 3);
  Object.values(elements).forEach(element => assert.equal(element.style.display, "none"));
});

test("applies localized error state to every table", () => {
  const calls = [];
  const elements = {};
  HOME_TABLE_VIEW_STATES.forEach(item => { elements[item.tableId] = { id: item.tableId }; elements[item.paginationId] = { style: {} }; });
  applyHomeTableViewState({ documentRef: { getElementById: id => elements[id] }, state: "error", translate: key => `t:${key}`, setLoadingMarkup() {}, replaceWithTextState: (...args) => calls.push(args) });
  assert.deepEqual(calls.map(call => call[2]), ["t:errorLeaderboard", "t:errorBestlaps", "t:errorLoading"]);
});

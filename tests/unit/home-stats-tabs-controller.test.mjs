import test from "node:test";
import assert from "node:assert/strict";
import { createHomeStatsTabsController, resolveHomeStatsTabFromHref, resolveNextHomeStatsTab } from "../../src/pages/home/stats-tabs-controller.js";

test("resolves section hashes to home statistics tabs", () => {
  assert.equal(resolveHomeStatsTabFromHref("#bestlaps"), "bestlaps");
  assert.equal(resolveHomeStatsTabFromHref("#worst-safety"), "safety");
  assert.equal(resolveHomeStatsTabFromHref("#championship"), "leaderboard");
});

test("resolves wrapped keyboard navigation for home statistics tabs", () => {
  const keys = ["leaderboard", "bestlaps", "safety"];
  assert.equal(resolveNextHomeStatsTab(keys, "leaderboard", "ArrowLeft"), "safety");
  assert.equal(resolveNextHomeStatsTab(keys, "safety", "ArrowRight"), "leaderboard");
  assert.equal(resolveNextHomeStatsTab(keys, "bestlaps", "Home"), "leaderboard");
  assert.equal(resolveNextHomeStatsTab(keys, "bestlaps", "End"), "safety");
  assert.equal(resolveNextHomeStatsTab(keys, "bestlaps", "Enter"), null);
});

test("rejects an unknown active tab without changing state", () => {
  const documentRef = { body: { classList: { toggle() {} } }, getElementById() { return null; }, querySelector() { return null; } };
  const controller = createHomeStatsTabsController({ documentRef, tabs: { leaderboard: { panelId: "championship", subtitleKey: "x" } }, isEnabled: () => false, translate: value => value, scrollToTabs() {} });
  assert.equal(controller.setActive("missing"), false);
  assert.equal(controller.activeTab, "leaderboard");
});

test("updates active tab through the public controller contract", () => {
  const documentRef = { body: { classList: { toggle() {} } }, getElementById() { return null; }, querySelector() { return null; } };
  const controller = createHomeStatsTabsController({ documentRef, tabs: { leaderboard: { panelId: "a" }, safety: { panelId: "b" } }, isEnabled: () => false, translate: value => value, scrollToTabs() {} });
  assert.equal(controller.setActive("safety"), true);
  assert.equal(controller.activeTab, "safety");
});

import test from "node:test";
import assert from "node:assert/strict";
import { createHomeStatsTabsController, resolveHomeStatsTabFromHref } from "../../src/pages/home/stats-tabs-controller.js";

test("resolves section hashes to home statistics tabs", () => {
  assert.equal(resolveHomeStatsTabFromHref("#bestlaps"), "bestlaps");
  assert.equal(resolveHomeStatsTabFromHref("#worst-safety"), "safety");
  assert.equal(resolveHomeStatsTabFromHref("#championship"), "leaderboard");
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

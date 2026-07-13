import test from "node:test";
import assert from "node:assert/strict";
import { createFunStatsPage } from "../../src/pages/fun-stats/index.js";

test("composes the Fun Stats data and error lifecycle", async () => {
  const calls = [];
  const page = createFunStatsPage({ initializeData: async () => calls.push("data"), handleError: error => calls.push(error.message) });
  await page.initialize();
  page.handleError(new Error("failed"));
  assert.deepEqual(calls, ["data", "failed"]);
  assert.ok(Object.isFrozen(page));
});

test("validates the Fun Stats lifecycle contract", () => {
  assert.throws(() => createFunStatsPage({}), /requires data/);
});

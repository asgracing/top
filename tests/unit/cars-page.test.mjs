import test from "node:test";
import assert from "node:assert/strict";
import { createCarsPage } from "../../src/pages/cars/index.js";

test("composes the Cars page lifecycle", async () => {
  const calls = [];
  const page = createCarsPage({ initializeData: async () => calls.push("data"), handleError: () => calls.push("error") });
  await page.initialize();
  page.handleError(new Error("failed"));
  assert.deepEqual(calls, ["data", "error"]);
  assert.ok(Object.isFrozen(page));
});

test("validates Cars page dependencies", () => {
  assert.throws(() => createCarsPage({}), /requires data/);
});

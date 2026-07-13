import test from "node:test";
import assert from "node:assert/strict";
import { createDriverPage } from "../../src/pages/driver/index.js";

test("composes the Driver page lifecycle", async () => {
  const calls = [];
  const page = createDriverPage({ initializeData: async () => calls.push("data"), handleError: () => calls.push("error") });
  await page.initialize();
  page.handleError(new Error("failed"));
  assert.deepEqual(calls, ["data", "error"]);
});

test("validates Driver page dependencies", () => assert.throws(() => createDriverPage({}), /requires data/));

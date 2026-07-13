import test from "node:test";
import assert from "node:assert/strict";
import { createNewsPage } from "../../src/pages/news/index.js";

test("composes the News page lifecycle", async () => {
  const calls = [];
  const page = createNewsPage({ initializeData: async () => calls.push("data"), handleError: () => calls.push("error") });
  await page.initialize(); page.handleError(new Error("failed"));
  assert.deepEqual(calls, ["data", "error"]);
});

test("validates News page dependencies", () => assert.throws(() => createNewsPage({}), /requires data/));

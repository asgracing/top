import test from "node:test";
import assert from "node:assert/strict";
import { createCommunityPage } from "../../src/pages/community/index.js";

test("composes the Community page lifecycle", async () => {
  const calls = [];
  const page = createCommunityPage({ initializeData: async () => calls.push("data"), handleError: () => calls.push("error") });
  await page.initialize(); page.handleError(new Error("failed"));
  assert.deepEqual(calls, ["data", "error"]);
});

test("validates Community page dependencies", () => assert.throws(() => createCommunityPage({}), /requires data/));

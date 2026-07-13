import test from "node:test";
import assert from "node:assert/strict";
import { createRacesPage } from "../../src/pages/races/index.js";

test("composes the Races page lifecycle", async () => {
  const calls = [];
  const page = createRacesPage({ initializeData: async () => calls.push("data"), handleError: () => calls.push("error") });
  await page.initialize();
  page.handleError(new Error("failed"));
  assert.deepEqual(calls, ["data", "error"]);
});

test("validates Races page dependencies", () => {
  assert.throws(() => createRacesPage({}), /requires data/);
});

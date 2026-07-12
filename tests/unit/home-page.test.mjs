import test from "node:test";
import assert from "node:assert/strict";
import { createHomePage } from "../../src/pages/home/index.js";

test("exposes the complete home feature lifecycle", async () => {
  const calls = [];
  const page = createHomePage({
    initializeData: async () => calls.push("data"),
    initializeControllers: () => calls.push("controllers"),
    setupDeferred: () => calls.push("deferred"),
    handleError: error => calls.push(error.message)
  });
  page.mountControllers();
  page.setupDeferred();
  await page.initialize();
  page.handleError(new Error("error"));
  assert.deepEqual(calls, ["controllers", "deferred", "data", "error"]);
});

test("forwards the initializer result", async () => {
  const page = createHomePage({ initializeData: () => 42, initializeControllers() {}, setupDeferred() {}, handleError() {} });
  assert.equal(await page.initialize(), 42);
});

test("rejects incomplete home feature dependencies", () => {
  assert.throws(() => createHomePage({ initializeData() {}, initializeControllers() {}, setupDeferred() {} }), /requires handleError/);
});

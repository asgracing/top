import test from "node:test";
import assert from "node:assert/strict";
import { createPageOrchestrator } from "../../src/runtime/page-orchestrator.js";

test("runs only the selected page initializer", async () => {
  const calls = [];
  const orchestrator = createPageOrchestrator({ page: "home", initializers: { home: () => calls.push("home"), races: () => calls.push("races") } });
  assert.deepEqual(await orchestrator.initialize(), { ok: true, error: null });
  assert.deepEqual(calls, ["home"]);
});

test("routes initializer failures to the selected handler", async () => {
  const failure = new Error("failed");
  const handled = [];
  const logged = [];
  const orchestrator = createPageOrchestrator({
    page: "driver",
    initializers: { driver: async () => { throw failure; } },
    errorHandlers: { driver: error => handled.push(error) },
    logger: { error: error => logged.push(error) }
  });
  assert.deepEqual(await orchestrator.initialize(), { ok: false, error: failure });
  assert.deepEqual(handled, [failure]);
  assert.deepEqual(logged, [failure]);
});

test("allows a page without a visual error handler", async () => {
  const orchestrator = createPageOrchestrator({ page: "news", initializers: { news: () => Promise.reject(new Error("offline")) }, logger: null });
  assert.equal((await orchestrator.initialize()).ok, false);
});

test("rejects a missing page initializer", () => {
  assert.throws(() => createPageOrchestrator({ page: "cars", initializers: {} }), /Missing data initializer/);
});

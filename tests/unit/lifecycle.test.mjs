import test from "node:test";
import assert from "node:assert/strict";
import { createLifecycle } from "../../src/shared/lifecycle.js";

test("destroys resources once in reverse order", () => {
  const lifecycle = createLifecycle(); const calls = [];
  lifecycle.add(() => calls.push("first")); lifecycle.add(() => calls.push("second")); lifecycle.destroy(); lifecycle.destroy();
  assert.deepEqual(calls, ["second", "first"]); assert.equal(lifecycle.size, 0);
});
test("removes registered event listeners", () => {
  const lifecycle = createLifecycle(); const target = new EventTarget(); let calls = 0;
  lifecycle.listen(target, "change", () => calls++); target.dispatchEvent(new Event("change")); lifecycle.destroy(); target.dispatchEvent(new Event("change"));
  assert.equal(calls, 1);
});
test("aborts owned controllers", () => {
  const lifecycle = createLifecycle(); const controller = lifecycle.abort(); lifecycle.destroy(); assert.equal(controller.signal.aborted, true);
});

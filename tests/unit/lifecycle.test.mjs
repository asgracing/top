import test from "node:test";
import assert from "node:assert/strict";
import { bindPageHideCleanup, createLifecycle } from "../../src/shared/lifecycle.js";

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
test("preserves resources while the page is stored in the back-forward cache", () => {
  const lifecycle = createLifecycle();
  const windowRef = new EventTarget();
  let disposed = 0;
  lifecycle.add(() => disposed++);
  bindPageHideCleanup(lifecycle, windowRef);
  const cachedPageHide = new Event("pagehide");
  Object.defineProperty(cachedPageHide, "persisted", { value: true });
  windowRef.dispatchEvent(cachedPageHide);
  assert.equal(lifecycle.destroyed, false);
  assert.equal(disposed, 0);
  const finalPageHide = new Event("pagehide");
  Object.defineProperty(finalPageHide, "persisted", { value: false });
  windowRef.dispatchEvent(finalPageHide);
  assert.equal(lifecycle.destroyed, true);
  assert.equal(disposed, 1);
});

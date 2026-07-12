import test from "node:test";
import assert from "node:assert/strict";
import { collectActiveModalBranches, getFocusableElements } from "../../src/shared/modal-controller.js";

test("collects every ancestor branch without traversing modal descendants", () => {
  const body = { parentElement: null };
  const shell = { parentElement: body };
  const modal = { parentElement: shell };
  const dialog = { parentElement: modal };
  const branches = collectActiveModalBranches(body, new Set([modal]));
  assert.equal(branches.has(body), true);
  assert.equal(branches.has(shell), true);
  assert.equal(branches.has(modal), true);
  assert.equal(branches.has(dialog), false);
});

test("filters hidden focus targets", () => {
  const visible = { hasAttribute: () => false, getAttribute: () => null };
  const hidden = { hasAttribute: name => name === "hidden", getAttribute: () => null };
  const ariaHidden = { hasAttribute: () => false, getAttribute: name => name === "aria-hidden" ? "true" : null };
  assert.deepEqual(getFocusableElements({ querySelectorAll: () => [visible, hidden, ariaHidden] }), [visible]);
});

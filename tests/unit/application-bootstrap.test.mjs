import test from "node:test";
import assert from "node:assert/strict";
import { runWhenDocumentReady } from "../../src/runtime/application-bootstrap.js";

test("starts immediately when the document is already ready", () => {
  let calls = 0;
  const controller = runWhenDocumentReady({ readyState: "complete", addEventListener() {} }, () => { calls += 1; });
  assert.equal(calls, 1);
  assert.equal(controller.started, true);
  assert.equal(controller.start(), false);
});

test("waits for DOMContentLoaded while parsing and starts only once", () => {
  let listener;
  let options;
  let calls = 0;
  const documentRef = { readyState: "loading", addEventListener(type, callback, value) { assert.equal(type, "DOMContentLoaded"); listener = callback; options = value; } };
  const controller = runWhenDocumentReady(documentRef, () => { calls += 1; });
  assert.equal(calls, 0);
  assert.deepEqual(options, { once: true });
  listener();
  listener();
  assert.equal(calls, 1);
  assert.equal(controller.started, true);
});

test("rejects an invalid bootstrap contract", () => {
  assert.throws(() => runWhenDocumentReady(null, () => {}), /requires a document/);
  assert.throws(() => runWhenDocumentReady({ addEventListener() {} }, null), /requires a document/);
});

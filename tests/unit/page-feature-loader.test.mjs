import test from "node:test";
import assert from "node:assert/strict";
import { getPageFeaturePaths, loadPageFeatures } from "../../src/runtime/page-feature-loader.js";

test("home loads only the shared Driver Preview feature set", async () => {
  const calls = [];
  const features = await loadPageFeatures("home", async path => { calls.push(path); return {}; });
  assert.deepEqual(calls, getPageFeaturePaths("home"));
  assert.ok(calls.includes("../pages/driver/preview-view.js"));
  assert.ok(!calls.some(path => /tables-|penalty-|\/index\.js$/.test(path)));
  assert.deepEqual(features, {});
});

test("loads and merges only the selected page modules", async () => {
  const paths = getPageFeaturePaths("driver");
  const calls = [];
  const features = await loadPageFeatures("driver", async path => { calls.push(path); return { [path]: true }; });
  assert.deepEqual(calls, paths);
  assert.equal(Object.keys(features).length, paths.length);
  assert.ok(Object.isFrozen(features));
});

test("rejects an invalid importer", async () => {
  await assert.rejects(loadPageFeatures("cars", null), /requires an importer/);
});

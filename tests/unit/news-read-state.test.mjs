import test from "node:test";
import assert from "node:assert/strict";
import {
  NEWS_READ_LEGACY_STORAGE_KEY,
  NEWS_READ_STORAGE_KEY,
  loadNewsReadState,
  markNewsRead
} from "../../news-read-state.js";

function memoryStorage(entries = []) {
  const data = new Map(entries);
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    data
  };
}

test("merges legacy and namespaced news read state without losing entries", () => {
  const storage = memoryStorage([
    [NEWS_READ_LEGACY_STORAGE_KEY, JSON.stringify({ legacy: 100 })],
    [NEWS_READ_STORAGE_KEY, JSON.stringify({ version: 1, value: { current: 200 }, expiresAt: 0 })]
  ]);
  assert.deepEqual(loadNewsReadState(storage), { legacy: 100, current: 200 });
  assert.deepEqual(JSON.parse(storage.getItem(NEWS_READ_LEGACY_STORAGE_KEY)), { legacy: 100, current: 200 });
  assert.deepEqual(JSON.parse(storage.getItem(NEWS_READ_STORAGE_KEY)).value, { legacy: 100, current: 200 });
});

test("marks a news item in both storage formats", () => {
  const storage = memoryStorage();
  assert.equal(markNewsRead(storage, { slug: "release" }, 123), true);
  assert.equal(loadNewsReadState(storage).release, 123);
  assert.equal(JSON.parse(storage.getItem(NEWS_READ_LEGACY_STORAGE_KEY)).release, 123);
  assert.equal(JSON.parse(storage.getItem(NEWS_READ_STORAGE_KEY)).value.release, 123);
});

test("ignores corrupt storage values and items without identifiers", () => {
  const storage = memoryStorage([
    [NEWS_READ_LEGACY_STORAGE_KEY, "{bad"],
    [NEWS_READ_STORAGE_KEY, JSON.stringify({ version: 0, value: { stale: 1 } })]
  ]);
  assert.deepEqual(loadNewsReadState(storage), {});
  assert.equal(markNewsRead(storage, {}, 123), false);
});

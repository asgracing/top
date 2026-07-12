import test from "node:test";
import assert from "node:assert/strict";
import { createStorage } from "../../src/shared/storage.js";

function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key), data };
}

test("namespaces and restores stored values", () => {
  const backend = memoryStorage();
  const storage = createStorage("asg", backend, () => 1000);
  assert.equal(storage.set("lang", "ru"), true);
  assert.equal(storage.get("lang"), "ru");
  assert.equal(backend.data.has("asg:lang"), true);
});
test("expires TTL values and removes their records", () => {
  const backend = memoryStorage();
  let time = 1000;
  const storage = createStorage("asg", backend, () => time);
  storage.set("vote", { done: true }, { ttlMs: 50 });
  time = 1051;
  assert.equal(storage.get("vote", "expired"), "expired");
  assert.equal(backend.data.has("asg:vote"), false);
});
test("returns fallback for corrupt or unknown records", () => {
  const backend = memoryStorage();
  backend.setItem("asg:broken", "{bad");
  backend.setItem("asg:old", JSON.stringify({ version: 0, value: "old" }));
  const storage = createStorage("asg", backend);
  assert.equal(storage.get("broken", "fallback"), "fallback");
  assert.equal(storage.get("old", "fallback"), "fallback");
});
test("migrates a legacy key without overwriting a current value", () => {
  const backend = memoryStorage();
  backend.setItem("asgLang", "ru");
  const storage = createStorage("asg", backend);
  assert.equal(storage.migrateLegacy("lang", "asgLang"), true);
  assert.equal(storage.get("lang"), "ru");
  assert.equal(backend.getItem("asgLang"), null);
  backend.setItem("asgLang", "en");
  assert.equal(storage.migrateLegacy("lang", "asgLang"), false);
  assert.equal(storage.get("lang"), "ru");
});
test("supports transforms and rejects invalid migrations", () => {
  const backend = memoryStorage();
  backend.setItem("volume", "75");
  const storage = createStorage("asg", backend);
  assert.equal(storage.migrateLegacy("volume", "volume", value => Number(value) / 100), true);
  assert.equal(storage.get("volume"), 0.75);
  backend.setItem("broken", "x");
  assert.equal(storage.migrateLegacy("broken", "broken", () => undefined), false);
});

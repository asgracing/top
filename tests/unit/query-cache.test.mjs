import test from "node:test";
import assert from "node:assert/strict";
import { createLatestRequestGuard, createQueryCache } from "../../src/shared/query-cache.js";

test("deduplicates concurrent loads", async () => {
  const cache = createQueryCache(); let calls = 0;
  const loader = async () => { calls += 1; await Promise.resolve(); return "data"; };
  const [a, b] = await Promise.all([cache.query("home", loader), cache.query("home", loader)]);
  assert.equal(a, "data"); assert.equal(b, "data"); assert.equal(calls, 1);
});
test("respects TTL and force refresh", async () => {
  let time = 100; let calls = 0; const cache = createQueryCache({ now: () => time });
  const loader = async () => ++calls;
  assert.equal(await cache.query("x", loader, { ttlMs: 50 }), 1);
  time = 120; assert.equal(await cache.query("x", loader, { ttlMs: 50 }), 1);
  assert.equal(await cache.query("x", loader, { ttlMs: 50, force: true }), 2);
});
test("returns stale value while refreshing", async () => {
  let time = 0; let resolveRefresh; const cache = createQueryCache({ now: () => time });
  await cache.query("x", async () => "old", { ttlMs: 1 }); time = 2;
  const stale = await cache.query("x", () => new Promise(resolve => { resolveRefresh = resolve; }), { ttlMs: 1, staleWhileRevalidate: true });
  assert.equal(stale, "old"); resolveRefresh("new"); await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(cache.peek("x"), "new");
});
test("evicts least recently used entries", async () => {
  const cache = createQueryCache({ maxEntries: 2 });
  await cache.query("a", async () => 1); await cache.query("b", async () => 2); await cache.query("c", async () => 3);
  assert.equal(cache.size, 2); assert.equal(cache.peek("a"), undefined);
});
test("identifies only the latest request token", () => {
  const guard = createLatestRequestGuard(); const first = guard.next("leaderboard"); const second = guard.next("leaderboard");
  assert.equal(guard.isCurrent(first), false); assert.equal(guard.isCurrent(second), true); guard.invalidate("leaderboard"); assert.equal(guard.isCurrent(second), false);
});

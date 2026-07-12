import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCommunityLikesPayload, normalizeDonationsPayload, normalizeDriverProfile, normalizeHomePayload, normalizeHourlyAnnouncement, normalizeManifest, normalizeNewsPayload, normalizePagedTablePayload, normalizeServerStatus, SchemaError } from "../../src/shared/data-schema.js";

test("normalizes home table values", () => {
  const data = normalizeHomePayload({ leaderboard: [{ rank: "12", driver: " Driver ", points: "7" }], bestlaps: [], safety: [] });
  assert.equal(data.leaderboard[0].rank, 12);
  assert.equal(data.leaderboard[0].driver, "Driver");
  assert.equal(data.leaderboard[0].points, 7);
  assert.equal(data.leaderboard[0].best_lap_car_name, "-");
});
test("rejects an incompatible home array", () => assert.throws(() => normalizeHomePayload({ leaderboard: "broken" }), error => error instanceof SchemaError && error.schema === "home payload"));
test("drops non-object table rows", () => assert.deepEqual(normalizeHomePayload({ leaderboard: [null, "bad"], bestlaps: [], safety: [] }).leaderboard, []));
test("normalizes manifest defaults", () => assert.deepEqual(normalizeManifest({ generated_at: "v1" }), { generated_at: "v1", version: "v1", home: "home.json", tables: {} }));
test("normalizes paged metadata", () => {
  const page = normalizePagedTablePayload({ items: [{ driver: "A", rank: 1 }], page: "2", page_size: "10", total_items: "21" }, "leaderboard");
  assert.equal(page.page, 2);
  assert.equal(page.total_pages, 3);
  assert.equal(page.items[0].points, 0);
});
test("normalizes optional application payloads", () => {
  assert.equal(normalizeServerStatus({ online: true }).online, true);
  assert.equal(normalizeHourlyAnnouncement({ track_code: "monza" }).track_name, "monza");
  assert.deepEqual(normalizeDriverProfile({ driver: "A" }).races, []);
  assert.equal(normalizeNewsPayload([{ id: 1 }, null]).items.length, 1);
  assert.deepEqual(normalizeDonationsPayload({ ok: true }).items, []);
  assert.deepEqual(normalizeCommunityLikesPayload({}).items, {});
});
test("rejects incompatible optional payloads", () => {
  assert.throws(() => normalizeNewsPayload({ items: "bad" }), SchemaError);
  assert.throws(() => normalizeDonationsPayload({ ok: false, error: "failed" }), SchemaError);
  assert.throws(() => normalizeCommunityLikesPayload({ items: [] }), SchemaError);
});

import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import { createDriverAffiliationsLoader as createSnapshotLoader } from "../../src/pages/clubs-teams/affiliation-index-cache.js";
import * as legacyFacade from "../../src/pages/clubs-teams/affiliation-index.js";
import * as frozenLegacy from "../../v2/boot/chunks/affiliation-index-ARRNG442.js";
import { validateCurrentPointer } from "../../src/pages/clubs-teams/catalog-model.js";
import { validateEntityDetail } from "../../src/pages/clubs-teams/detail-model.js";

// Exercise the actual canonical callbacks without importing the DOM application.
const appSource = await fs.readFile(new URL("../../app.js", import.meta.url), "utf8");
const callbackSource = appSource.slice(appSource.indexOf("const DRIVER_AFFILIATION_DETAIL_PATH"), appSource.indexOf("let driverAffiliationsLoader = null;"));
assert.ok(callbackSource.startsWith("const DRIVER_AFFILIATION_DETAIL_PATH"));
const { buildDriverAffiliationIndex, driverAffiliationSource } = Function(callbackSource + "\nreturn { buildDriverAffiliationIndex, driverAffiliationSource };")();
const createDriverAffiliationsLoader = ({ requestJson, dataBaseUrl }) => createSnapshotLoader(
  driverAffiliationSource(requestJson, dataBaseUrl, validateCurrentPointer, validateEntityDetail)
);

const fixture = new URL("../fixtures/clubs-teams-public/", import.meta.url);
const read = async path => JSON.parse(await fs.readFile(new URL(path, fixture), "utf8"));
const originalPointer = await read("current.json");
const club = await read("snapshots/fixture-run-1/details/clubs/asg-racing.json");
const team = await read("snapshots/fixture-run-1/details/teams/asg-factory.json");
const manifestFile = path => ({ path, bytes: 100, sha256: "d".repeat(64) });
const manifestFor = (pointer, paths) => ({
  schema_version: 1, kind: "clubs_teams_public_snapshot", rating_run_id: pointer.rating_run_id,
  completed_at: pointer.completed_at, content_sha256: pointer.content_sha256,
  files: paths.map(manifestFile)
});

function source() {
  const state = { pointer: structuredClone(originalPointer), details: [structuredClone(club), structuredClone(team)], calls: [], fail: null, manifest: null };
  state.requestJson = async url => {
    const pathname = new URL(url).pathname;
    state.calls.push(pathname);
    await Promise.resolve();
    if (state.fail?.(pathname)) throw new Error("fixture_unavailable");
    if (pathname.endsWith("/current.json")) return structuredClone(state.pointer);
    if (pathname.endsWith("/manifest.json")) return state.manifest || manifestFor(state.pointer,
      state.details.map(row => `details/${row.entity_type}s/${row.slug}.json`));
    const row = state.details.find(row => pathname.endsWith(`/${row.slug}.json`));
    assert.ok(row, `Unexpected fixture request: ${pathname}`);
    return structuredClone(row);
  };
  state.loader = createDriverAffiliationsLoader({ requestJson: state.requestJson, dataBaseUrl: "https://fixture.test/" });
  return state;
}

test("preserves both memberships, stable public IDs, role data and original overwrite order", () => {
  const details = [club, team];
  const before = structuredClone(details);
  const index = buildDriverAffiliationIndex(details);
  for (const detail of details) for (const member of detail.roster) {
    assert.deepEqual(index.get(member.public_id)?.[detail.entity_type], { display_name: detail.display_name, slug: detail.slug });
  }
  assert.deepEqual(details, before);
  const repeated = buildDriverAffiliationIndex([
    { entity_type: "club", slug: "first", display_name: "Первый", roster: [{ public_id: " stable-id " }] },
    { entity_type: "team", slug: "team", display_name: "Team", roster: [{ public_id: "stable-id" }] },
    { entity_type: "club", slug: "last", display_name: "Последний", roster: [{ public_id: "stable-id" }] }
  ]).get("stable-id");
  assert.equal(repeated.club.slug, "last");assert.equal(repeated.team.slug, "team");
  assert.ok(Object.isFrozen(repeated));assert.ok(Object.isFrozen(repeated.club));
});

test("shares concurrent profile/home loads and reuses index after checking the current pointer", async () => {
  const state = source();
  const [home, profile] = await Promise.all([state.loader(), state.loader()]);
  assert.equal(home, profile);assert.equal(state.calls.length, 4);
  assert.equal(home.entities.get(club.public_id).roster[0].role, club.roster[0].role);
  assert.equal(await state.loader(), home);
  assert.equal(state.calls.length, 5);assert.ok(state.calls.at(-1).endsWith("/current.json"));
});

test("new accepted snapshot refreshes joins/leaves and names without reusing old relationships", async () => {
  const state = source();const old = await state.loader();
  const removed = club.roster[0].public_id;
  state.pointer = { ...state.pointer, rating_run_id: "fixture-run-2", manifest: "snapshots/fixture-run-2/manifest.json", content_sha256: "c".repeat(64) };
  state.details = state.details.map(row => ({ ...row, rating: { ...row.rating, rating_run_id: "fixture-run-2" }, roster: row.roster.filter(member => member.public_id !== removed) }));
  state.details[0].roster.push({ public_id: "driver-joined", display_name: "Новый пилот", role: "member" });
  state.details[0].display_name = "Новое имя";
  const current = await state.loader();
  assert.notEqual(current, old);assert.equal(current.affiliations.has(removed), false);
  assert.equal(current.affiliations.get("driver-joined").club.display_name, "Новое имя");
  assert.equal(current.entities.get(club.public_id).public_id, club.public_id);
  assert.equal(state.calls.length, 8);
});

test("pointer failure after success rejects instead of silently returning stale membership; retry recovers", async () => {
  const state = source();const initial = await state.loader();
  state.fail = path => path.endsWith("/current.json");
  await assert.rejects(state.loader(), /fixture_unavailable/);
  state.fail = null;
  assert.equal(await state.loader(), initial);assert.equal(state.calls.length, 6);
});

test("partial or rejected details remain a usable fallback and are retried, never cached permanently", async () => {
  const state = source();state.fail = path => path.endsWith(`/${team.slug}.json`);
  const partial = await state.loader();
  assert.equal(partial.entities.has(team.public_id), false);assert.equal(partial.entities.has(club.public_id), true);
  state.fail = null;state.details[1].status = "rejected";
  const invalid = await state.loader();assert.equal(invalid.entities.has(team.public_id), false);
  state.details[1].status = "approved";
  const complete = await state.loader();assert.equal(complete.entities.has(team.public_id), true);
  assert.notEqual(complete, partial);assert.equal(state.calls.length, 12);
  assert.equal(await state.loader(), complete);assert.equal(state.calls.length, 13);
});

test("malformed manifest fallback is retried and paths outside existing detail namespace are ignored", async () => {
  const state = source();state.manifest = {};
  assert.equal((await state.loader()).affiliations.size, 0);
  state.manifest = { files: [
    { path: `details/clubs/${club.slug}.json` }, { path: "../outside.json" }, { path: "details/clubs/not..safe.json" }
  ] };
  assert.equal((await state.loader()).entities.size, 1);
  assert.equal(state.calls.some(path => path.includes("outside") || path.includes("not..safe")), false);
});

test("oversized manifest rejects before fetching any entity and remains retryable", async () => {
  const state = source();
  state.manifest = manifestFor(state.pointer, Array.from({ length: 2049 }, (_, i) => `details/clubs/entity-${i}.json`));
  await assert.rejects(state.loader(), /affiliation_manifest_budget/);
  assert.equal(state.calls.length, 2);
  assert.equal(state.calls.some(path => path.includes("/details/")), false);
  state.manifest = null;assert.equal((await state.loader()).entities.size, 2);
});

test("explicit invalidation refreshes the same public revision after a known mutation", async () => {
  const state = source();const initial = await state.loader();
  state.loader.invalidate();
  const refreshed = await state.loader();
  assert.notEqual(refreshed, initial);assert.deepEqual(refreshed, initial);assert.equal(state.calls.length, 8);
});

test("malformed and foreign-snapshot manifests never cache a complete-empty result", async () => {
  for (const bad of [
    { files: [] },
    manifestFor(originalPointer, ["foreign/path.json"]),
    { ...manifestFor(originalPointer, []), rating_run_id: "foreign-run" },
    { ...manifestFor(originalPointer, []), content_sha256: "e".repeat(64) },
    { ...manifestFor(originalPointer, []), snapshot_id: "foreign-snapshot" },
    { ...manifestFor(originalPointer, []), completed_at: "2020-01-01T00:00:00Z" }
  ]) {
    const state = source();state.manifest = bad;
    assert.equal((await state.loader()).entities.size, 0);
    state.manifest = null;
    assert.equal((await state.loader()).entities.size, 2);
    assert.equal(state.calls.length, 6);
  }
});

test("a coherent empty snapshot may cache legitimate non-detail files without inventing membership", async () => {
  const state = source();state.details = [];
  state.manifest = manifestFor(state.pointer, [
    "catalog/clubs/page-1.json", "catalog/teams/page-1.json", "ratings/general/teams/page-1.json",
    "ratings/seasons/june-2026/clubs/page-1.json", `assets/${"a".repeat(64)}.png`
  ]);
  const initial = await state.loader();assert.equal(initial.affiliations.size, 0);
  assert.equal(await state.loader(), initial);assert.equal(state.calls.length, 3);
  const noFiles = source();noFiles.details = [];
  const empty = await noFiles.loader();assert.equal(await noFiles.loader(), empty);
});

test("invalidation during an old load cannot populate or clear a newer snapshot cache", async () => {
  const state = source();let release, entered;
  const gate = new Promise(resolve => { release = resolve; });
  const reached = new Promise(resolve => { entered = resolve; });
  const requester = state.requestJson;let held = false;
  const loader = createDriverAffiliationsLoader({ dataBaseUrl: "https://fixture.test", requestJson: async url => {
    if (String(url).endsWith("/manifest.json") && !held) { held = true;entered();await gate; }
    return requester(url);
  } });
  const old = loader();const refused = assert.rejects(old, /affiliation_snapshot_invalidated/);
  await reached;loader.invalidate();const current = await loader();
  release();await refused;
  assert.equal(await loader(), current);
});

test("breaking helper interface uses a new query key and synchronized runtime versions", async () => {
  assert.ok(appSource.includes("affiliation-index-cache.js?v=20261114affiliations2"));
  const build = await fs.readFile(new URL("../../scripts/build-v2.mjs", import.meta.url), "utf8");
  const home = await fs.readFile(new URL("../../v2/home.js", import.meta.url), "utf8");
  assert.match(build, /const runtimeVersion = '20261117reports1'/);
  const bootVersion = build.match(/const bootVersion = '([^']+)'/)?.[1];
  assert.match(bootVersion, /^\d{8}\w+$/);
  for (const variant of ['hourly', 'archive', 'stats', 'raceModal']) {
    assert.equal(build.match(new RegExp(`const ${variant}BootVersion = '([^']+)'`))?.[1], bootVersion);
  }
  assert.ok(home.includes("runtime/home.js?v=20261117reports1"));
});
test("old cached helper and late old-URL facade preserve the published requestJson/base API", async () => {
  assert.equal(legacyFacade.createDriverAffiliationsLoader, frozenLegacy.createDriverAffiliationsLoader);
  assert.equal(legacyFacade.buildDriverAffiliationIndex, frozenLegacy.buildDriverAffiliationIndex);
  for (const factory of [frozenLegacy.createDriverAffiliationsLoader, legacyFacade.createDriverAffiliationsLoader]) {
    const state = source();
    const load = factory({ requestJson: state.requestJson, dataBaseUrl: "https://fixture.test" });
    const result = await load();
    assert.equal(result.entities.size, 2);assert.equal(state.calls.length, 4);
    for (const detail of state.details) for (const member of detail.roster) {
      assert.equal(result.affiliations.get(member.public_id)[detail.entity_type].slug, detail.slug);
    }
  }
});

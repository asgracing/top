import assert from "node:assert/strict";
import test from "node:test";

import {
  CatalogContractError,
  catalogEntityTypeFromTab,
  catalogTabFromEntityType,
  filterCatalogEntries,
  mergeCatalogPages,
  resolveCatalogAssetUrl,
  validateCatalogPage,
  validateCurrentPointer
} from "../../src/pages/clubs-teams/catalog-model.js";

const runId = "rating-run-1";
const digest = "a".repeat(64);

test("maps the canonical /teams tab query to entity types", () => {
  assert.equal(catalogEntityTypeFromTab("clubs"), "club");
  assert.equal(catalogEntityTypeFromTab("teams"), "team");
  assert.equal(catalogEntityTypeFromTab("unexpected"), "club");
  assert.equal(catalogTabFromEntityType("team"), "teams");
  assert.throws(() => catalogTabFromEntityType("driver"), CatalogContractError);
});

function pointer(overrides = {}) {
  return {
    schema_version: 1,
    kind: "clubs_teams_public_current",
    rating_run_id: runId,
    completed_at: "2026-07-29T12:00:00Z",
    manifest: `snapshots/${runId}/manifest.json`,
    content_sha256: "b".repeat(64),
    ...overrides
  };
}

function entry(overrides = {}) {
  return {
    position: 1,
    public_id: "clb-public-1",
    slug: "asg-racing",
    display_name: "ASG Racing",
    total_points: 125.5,
    race_count: 10,
    average_elo: 1170.25,
    average_sr: 4.75,
    members_count: 8,
    asset: {
      url: `snapshots/${runId}/assets/${digest}.png`,
      content_sha256: digest,
      media_type: "image/png",
      byte_size: 1024,
      width: 256,
      height: 256
    },
    ...overrides
  };
}

function page(overrides = {}) {
  return {
    schema_version: 1,
    kind: "clubs_teams_catalog_page",
    context: "general",
    entity_type: "club",
    rating_run_id: runId,
    completed_at: "2026-07-29T12:00:00Z",
    page: 1,
    total_pages: 1,
    total: 1,
    entries: [entry()],
    ...overrides
  };
}

test("validates immutable pointer and rejects traversal-like run ids", () => {
  assert.equal(validateCurrentPointer(pointer()).rating_run_id, runId);
  assert.throws(
    () => validateCurrentPointer(pointer({
      rating_run_id: "../run",
      manifest: "snapshots/../run/manifest.json"
    })),
    CatalogContractError
  );
});

test("normalizes an allowlisted catalog page and asset", () => {
  const validated = validateCatalogPage(page(), {
    entityType: "club",
    page: 1,
    ratingRunId: runId
  });
  assert.equal(validated.entries[0].display_name, "ASG Racing");
  assert.equal(validated.entries[0].asset.content_sha256, digest);
});

test("rejects assets outside the active immutable snapshot", () => {
  assert.throws(
    () => validateCatalogPage(page({
      entries: [entry({ asset: { ...entry().asset, url: "https://evil.invalid/logo.png" } })]
    }), { entityType: "club", page: 1, ratingRunId: runId }),
    /outside the active snapshot/
  );
});

test("merges complete pages and rejects duplicates", () => {
  const first = validateCatalogPage(page({
    total_pages: 2,
    total: 2
  }), { entityType: "club", page: 1, ratingRunId: runId });
  const second = validateCatalogPage(page({
    page: 2,
    total_pages: 2,
    total: 2,
    entries: [entry()]
  }), { entityType: "club", page: 2, ratingRunId: runId });
  assert.throws(() => mergeCatalogPages([first, second], "club"), /duplicate/);
});

test("filters teams by their club and resolves only exact asset URL", () => {
  const rows = [
    { ...entry(), entity_type: "team", club: { display_name: "Night Club" } },
    { ...entry({ public_id: "team-2", display_name: "Sunset" }), entity_type: "team", club: null }
  ];
  assert.deepEqual(filterCatalogEntries(rows, "night"), [rows[0]]);
  const url = resolveCatalogAssetUrl(
    "https://data.asgracing.ru/public-cache-clubs-teams",
    runId,
    entry().asset
  );
  assert.equal(
    url,
    `https://data.asgracing.ru/public-cache-clubs-teams/snapshots/${runId}/assets/${digest}.png`
  );
  assert.equal(resolveCatalogAssetUrl("https://data.asgracing.ru", runId, {
    ...entry().asset,
    url: "https://evil.invalid/logo.png"
  }), null);
});

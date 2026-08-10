import assert from "node:assert/strict";
import test from "node:test";

import { CatalogContractError } from "../../src/pages/clubs-teams/catalog-model.js";
import {
  loadPublicRatingSnapshot,
  normalizeRatingContext,
  validateRatingPage
} from "../../src/pages/clubs-teams/rating-model.js";

const runId = "rating-run-1";
const snapshotId = `${runId}-profile-digest`;

function entry(entityType) {
  return {
    position: 1,
    public_id: `${entityType}-public-1`,
    slug: entityType === "club" ? "asg-racing" : "asg-factory",
    display_name: entityType === "club" ? "ASG Racing" : "ASG Factory",
    total_points: 55.5,
    race_count: 5,
    average_elo: 1200,
    average_sr: 5.2,
    members_count: 4,
    ...(entityType === "team" ? { club: null } : {}),
    asset: null
  };
}

function page(entityType, overrides = {}) {
  return {
    schema_version: 1,
    kind: "clubs_teams_rating_page",
    context: "hourly",
    season_id: null,
    entity_type: entityType,
    limit: 10,
    offset: 0,
    rating_run_id: runId,
    completed_at: "2026-07-29T12:00:00Z",
    context_version: 1,
    page: 1,
    total_pages: 1,
    total: 1,
    entries_sha256: "a".repeat(64),
    entries: [entry(entityType)],
    ...overrides
  };
}

function pointer() {
  return {
    schema_version: 1,
    kind: "clubs_teams_public_current",
    rating_run_id: runId,
    snapshot_id: snapshotId,
    completed_at: "2026-07-29T12:00:00Z",
    manifest: `snapshots/${snapshotId}/manifest.json`,
    content_sha256: "b".repeat(64)
  };
}

test("normalizes only the three canonical rating contexts", () => {
  assert.equal(normalizeRatingContext("hourly"), "hourly");
  assert.equal(normalizeRatingContext("CHAMPIONSHIP"), "championship");
  assert.equal(normalizeRatingContext("season"), "general");
  assert.equal(normalizeRatingContext("../hourly"), "general");
});

test("validates a context page and its immutable run binding", () => {
  const result = validateRatingPage(page("team"), {
    entityType: "team", context: "hourly", page: 1, ratingRunId: runId
  });
  assert.equal(result.context, "hourly");
  assert.equal(result.entries[0].display_name, "ASG Factory");
  assert.throws(() => validateRatingPage(page("team", { rating_run_id: "other-run" }), {
    entityType: "team", context: "hourly", page: 1, ratingRunId: runId
  }), CatalogContractError);
  assert.throws(() => validateRatingPage(page("team", { offset: 10 }), {
    entityType: "team", context: "hourly", page: 1, ratingRunId: runId
  }), /offset/);
  assert.throws(() => validateRatingPage(page("team"), {
    entityType: "team", context: "season", page: 1, ratingRunId: runId
  }), /context/);
});

test("loads clubs and teams from one active context snapshot", async () => {
  const requested = [];
  const client = {
    async requestJson(url) {
      requested.push(url.href);
      if (url.pathname.endsWith("current.json")) return pointer();
      return url.pathname.includes("/clubs/") ? page("club") : page("team");
    }
  };
  const result = await loadPublicRatingSnapshot({
    client,
    dataBaseUrl: "https://data.asgracing.ru/public-cache-clubs-teams",
    context: "hourly"
  });
  assert.equal(result.context, "hourly");
  assert.equal(result.clubs.length, 1);
  assert.equal(result.teams.length, 1);
  assert.deepEqual(requested, [
    "https://data.asgracing.ru/public-cache-clubs-teams/current.json",
    `https://data.asgracing.ru/public-cache-clubs-teams/snapshots/${snapshotId}/ratings/hourly/clubs/page-1.json`,
    `https://data.asgracing.ru/public-cache-clubs-teams/snapshots/${snapshotId}/ratings/hourly/teams/page-1.json`
  ]);
});

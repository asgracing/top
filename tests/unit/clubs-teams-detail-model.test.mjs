import assert from "node:assert/strict";
import test from "node:test";

import { CatalogContractError } from "../../src/pages/clubs-teams/catalog-model.js";
import {
  entityDetailHref,
  entitySlugFromLocation,
  loadEntityDetail,
  validateEntityDetail
} from "../../src/pages/clubs-teams/detail-model.js";

const runId = "rating-run-1";
const snapshotId = `${runId}-profile-digest`;

function detail(overrides = {}) {
  return {
    schema_version: 1,
    kind: "clubs_teams_club_detail",
    entity_type: "club",
    public_id: "club-public-1",
    slug: "asg-racing",
    display_name: "ASG Racing",
    short_name: "ASG",
    description_ru: "Описание",
    description_en: "Description",
    website_url: "https://asgracing.ru/",
    status: "approved",
    asset: null,
    rating: {
      rating_run_id: runId,
      position: 1,
      total_points: 125.5,
      race_count: 10,
      average_elo: 1170.25,
      average_sr: 4.75,
      members_count: 2
    },
    roster: [
      { public_id: "driver-public-1", display_name: "Driver One", role: "head", elo: 1101, safety_rating: 9.99 },
      { public_id: "driver-public-2", display_name: "Driver Two", role: "member" }
    ],
    club: null,
    teams: [
      { public_id: "team-public-1", slug: "asg-factory", display_name: "ASG Factory" }
    ],
    recent_races: [
      {
        race_uid: "race-1",
        race_started_at: "2026-07-29T12:00:00Z",
        points: 25.5,
        track_code: "monza",
        race_format: "hourly",
        competition_mode: "general"
      }
    ],
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

test("resolves static-host query routes and future rewritten pretty paths", () => {
  assert.equal(entitySlugFromLocation({ pathname: "/clubs/", search: "?slug=asg-racing", entityType: "club" }), "asg-racing");
  assert.equal(entitySlugFromLocation({ pathname: "/clubs/asg-racing/", entityType: "club" }), "asg-racing");
  assert.equal(entitySlugFromLocation({ pathname: "/teams/detail/", search: "?slug=asg-factory", entityType: "team" }), "asg-factory");
  assert.equal(entityDetailHref("club", "asg-racing"), "../clubs/?slug=asg-racing");
  assert.equal(entityDetailHref("team", "asg-factory"), "../teams/detail/?slug=asg-factory");
});

test("validates a complete approved detail bound to the active rating run", () => {
  const result = validateEntityDetail(detail(), { entityType: "club", slug: "asg-racing", ratingRunId: runId });
  assert.equal(result.rating.position, 1);
  assert.equal(result.roster[0].role, "head");
  assert.equal(result.roster[0].elo, 1101);
  assert.equal(result.roster[0].safety_rating, 9.99);
  assert.equal(result.roster[1].elo, null);
  assert.equal(result.teams[0].slug, "asg-factory");
  assert.equal(result.recent_races[0].track_code, "monza");
});

test("rejects mismatched snapshots, unsafe websites and duplicate roster members", () => {
  assert.throws(() => validateEntityDetail(detail({ rating: { ...detail().rating, rating_run_id: "other-run" } }), {
    entityType: "club", slug: "asg-racing", ratingRunId: runId
  }), /outside the active snapshot/);
  assert.throws(() => validateEntityDetail(detail({ website_url: "javascript:alert(1)" }), {
    entityType: "club", slug: "asg-racing", ratingRunId: runId
  }), CatalogContractError);
  assert.throws(() => validateEntityDetail(detail({ roster: [detail().roster[0], detail().roster[0]] }), {
    entityType: "club", slug: "asg-racing", ratingRunId: runId
  }), /duplicate member/);
});

test("loads detail only from the immutable active snapshot path", async () => {
  const requested = [];
  const client = {
    async requestJson(url) {
      requested.push(url.href);
      return requested.length === 1 ? pointer() : detail();
    }
  };
  const result = await loadEntityDetail({
    client,
    dataBaseUrl: "https://data.asgracing.ru/public-cache-clubs-teams",
    entityType: "club",
    slug: "asg-racing"
  });
  assert.equal(result.detail.display_name, "ASG Racing");
  assert.deepEqual(requested, [
    "https://data.asgracing.ru/public-cache-clubs-teams/current.json",
    `https://data.asgracing.ru/public-cache-clubs-teams/snapshots/${snapshotId}/details/clubs/asg-racing.json`
  ]);
});

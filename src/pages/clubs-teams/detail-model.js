import {
  CatalogContractError,
  resolveCatalogAssetUrl,
  validateCurrentPointer
} from "./catalog-model.js";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,127}$/;
const PUBLIC_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const ENTITY_TYPES = new Set(["club", "team"]);
const ROLES = new Set(["head", "captain", "member"]);
const MAX_ROSTER = 1000;
const MAX_RELATED_TEAMS = 1000;
const MAX_RECENT_RACES = 100;

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CatalogContractError(`${label} must be an object`);
  }
  return value;
}

function text(value, label, { max = 4000, pattern = null } = {}) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized || normalized.length > max || (pattern && !pattern.test(normalized))) {
    throw new CatalogContractError(`${label} is invalid`);
  }
  return normalized;
}

function nullableText(value, label, options = {}) {
  return value === null || value === undefined || value === ""
    ? null
    : text(value, label, options);
}

function integer(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new CatalogContractError(`${label} is invalid`);
  }
  return value;
}

function number(value, label, { min = 0 } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) {
    throw new CatalogContractError(`${label} is invalid`);
  }
  return value;
}

function nullableNumber(value, label) {
  return value === null ? null : number(value, label);
}

function boundedArray(value, label, max) {
  if (!Array.isArray(value) || value.length > max) {
    throw new CatalogContractError(`${label} is invalid`);
  }
  return value;
}

function publicEntityRef(value, label) {
  const row = object(value, label);
  return Object.freeze({
    public_id: text(row.public_id, `${label}.public_id`, { pattern: PUBLIC_ID_PATTERN }),
    slug: text(row.slug, `${label}.slug`, { max: 128, pattern: SLUG_PATTERN }),
    display_name: text(row.display_name, `${label}.display_name`, { max: 200 })
  });
}

function website(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = text(value, "detail.website_url", { max: 300 });
  try {
    const parsed = new URL(normalized);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
      throw new Error("unsafe");
    }
    return parsed.href;
  } catch {
    throw new CatalogContractError("detail.website_url is invalid");
  }
}

function rating(value, entityType, ratingRunId) {
  if (value === null || value === undefined) return null;
  const row = object(value, "detail.rating");
  if (row.rating_run_id !== ratingRunId) {
    throw new CatalogContractError("detail.rating is outside the active snapshot");
  }
  return Object.freeze({
    position: integer(row.position, "detail.rating.position", { min: 1 }),
    total_points: number(row.total_points, "detail.rating.total_points"),
    race_count: integer(row.race_count, "detail.rating.race_count"),
    average_elo: nullableNumber(row.average_elo, "detail.rating.average_elo"),
    average_sr: nullableNumber(row.average_sr, "detail.rating.average_sr"),
    members_count: integer(row.members_count, "detail.rating.members_count"),
    entity_type: entityType
  });
}

function roster(value) {
  const ids = new Set();
  return Object.freeze(boundedArray(value, "detail.roster", MAX_ROSTER).map((raw, index) => {
    const row = object(raw, `detail.roster[${index}]`);
    const publicId = text(row.public_id, `detail.roster[${index}].public_id`, { pattern: PUBLIC_ID_PATTERN });
    const role = text(row.role, `detail.roster[${index}].role`, { max: 16 });
    if (ids.has(publicId) || !ROLES.has(role)) {
      throw new CatalogContractError("detail.roster contains an invalid or duplicate member");
    }
    ids.add(publicId);
    return Object.freeze({
      public_id: publicId,
      display_name: text(row.display_name, `detail.roster[${index}].display_name`, { max: 200 }),
      role
    });
  }));
}

function recentRaces(value) {
  const ids = new Set();
  return Object.freeze(boundedArray(value, "detail.recent_races", MAX_RECENT_RACES).map((raw, index) => {
    const row = object(raw, `detail.recent_races[${index}]`);
    const raceUid = text(row.race_uid, `detail.recent_races[${index}].race_uid`, { max: 200 });
    if (ids.has(raceUid)) throw new CatalogContractError("detail.recent_races contains duplicate race_uid");
    ids.add(raceUid);
    return Object.freeze({
      race_uid: raceUid,
      race_started_at: nullableText(row.race_started_at, "recent race date", { max: 40 }),
      points: number(row.points, "recent race points"),
      track_code: nullableText(row.track_code, "recent race track", { max: 100 }),
      race_format: nullableText(row.race_format, "recent race format", { max: 100 }),
      competition_mode: nullableText(row.competition_mode, "recent race mode", { max: 100 })
    });
  }));
}

export function normalizeEntitySlug(value) {
  return text(value, "slug", { max: 128, pattern: SLUG_PATTERN });
}

export function entitySlugFromLocation({ pathname = "", search = "", entityType }) {
  if (!ENTITY_TYPES.has(entityType)) throw new CatalogContractError("entityType is invalid");
  const querySlug = new URLSearchParams(search).get("slug");
  if (querySlug) return normalizeEntitySlug(querySlug);
  const parts = String(pathname).split("/").filter(Boolean);
  const marker = entityType === "club" ? "clubs" : "teams";
  const markerIndex = parts.lastIndexOf(marker);
  const candidate = markerIndex >= 0 ? parts[markerIndex + 1] : "";
  if (!candidate || candidate === "detail") return null;
  return normalizeEntitySlug(candidate);
}

export function entityDetailHref(entityType, slug, { siteBase = "../" } = {}) {
  const normalizedSlug = normalizeEntitySlug(slug);
  if (entityType === "club") return `${siteBase}clubs/?slug=${encodeURIComponent(normalizedSlug)}`;
  if (entityType === "team") return `${siteBase}teams/detail/?slug=${encodeURIComponent(normalizedSlug)}`;
  throw new CatalogContractError("entityType is invalid");
}

export function validateEntityDetail(value, { entityType, slug, ratingRunId }) {
  if (!ENTITY_TYPES.has(entityType)) throw new CatalogContractError("entityType is invalid");
  const normalizedSlug = normalizeEntitySlug(slug);
  const row = object(value, "detail");
  if (
    row.schema_version !== 1
    || row.kind !== `clubs_teams_${entityType}_detail`
    || row.entity_type !== entityType
    || row.slug !== normalizedSlug
    || row.status !== "approved"
  ) {
    throw new CatalogContractError("detail identity is invalid");
  }
  const relatedTeams = entityType === "club"
    ? Object.freeze(boundedArray(row.teams, "detail.teams", MAX_RELATED_TEAMS).map((item, index) => publicEntityRef(item, `detail.teams[${index}]`)))
    : null;
  const relatedClub = entityType === "team" && row.club !== null
    ? publicEntityRef(row.club, "detail.club")
    : null;
  const asset = row.asset === null || row.asset === undefined
    ? null
    : Object.freeze({
      url: text(row.asset.url, "detail.asset.url", { max: 400 }),
      content_sha256: text(row.asset.content_sha256, "detail.asset.content_sha256", { max: 64, pattern: /^[a-f0-9]{64}$/ }),
      media_type: text(row.asset.media_type, "detail.asset.media_type", { max: 20 }),
      byte_size: integer(row.asset.byte_size, "detail.asset.byte_size", { min: 1, max: 204800 }),
      width: integer(row.asset.width, "detail.asset.width", { min: 1, max: 1024 }),
      height: integer(row.asset.height, "detail.asset.height", { min: 1, max: 1024 })
    });
  if (asset && !["image/png", "image/jpeg"].includes(asset.media_type)) {
    throw new CatalogContractError("detail.asset.media_type is invalid");
  }
  return Object.freeze({
    entity_type: entityType,
    public_id: text(row.public_id, "detail.public_id", { pattern: PUBLIC_ID_PATTERN }),
    slug: normalizedSlug,
    display_name: text(row.display_name, "detail.display_name", { max: 200 }),
    short_name: nullableText(row.short_name, "detail.short_name", { max: 24 }),
    description_ru: nullableText(row.description_ru, "detail.description_ru", { max: 4000 }),
    description_en: nullableText(row.description_en, "detail.description_en", { max: 4000 }),
    website_url: website(row.website_url),
    asset,
    rating: rating(row.rating, entityType, ratingRunId),
    roster: roster(row.roster),
    club: relatedClub,
    teams: relatedTeams,
    recent_races: recentRaces(row.recent_races)
  });
}

export async function loadEntityDetail({ client, dataBaseUrl, entityType, slug }) {
  const normalizedSlug = normalizeEntitySlug(slug);
  const pointer = validateCurrentPointer(await client.requestJson(
    new URL("current.json", `${String(dataBaseUrl).replace(/\/+$/, "")}/`),
    { retries: 1, cache: "no-store" }
  ));
  const snapshotRoot = new URL(`snapshots/${pointer.rating_run_id}/`, `${String(dataBaseUrl).replace(/\/+$/, "")}/`);
  const detail = validateEntityDetail(await client.requestJson(
    new URL(`details/${entityType}s/${encodeURIComponent(normalizedSlug)}.json`, snapshotRoot),
    { retries: 1, cache: "no-store" }
  ), { entityType, slug: normalizedSlug, ratingRunId: pointer.rating_run_id });
  const assetUrl = resolveCatalogAssetUrl(dataBaseUrl, pointer.rating_run_id, detail.asset);
  if (detail.asset && !assetUrl) throw new CatalogContractError("detail asset is outside the active snapshot");
  return Object.freeze({ pointer, detail, assetUrl });
}

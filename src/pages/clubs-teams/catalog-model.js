const SNAPSHOT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,127}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ENTITY_TYPES = new Set(["club", "team"]);
const MAX_PAGES = 100;

export class CatalogContractError extends Error {
  constructor(message) {
    super(message);
    this.name = "CatalogContractError";
  }
}

export function catalogEntityTypeFromTab(value) {
  return value === "teams" ? "team" : "club";
}

export function catalogTabFromEntityType(value) {
  if (!ENTITY_TYPES.has(value)) throw new CatalogContractError("entityType is invalid");
  return `${value}s`;
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CatalogContractError(`${label} must be an object`);
  }
  return value;
}

function text(value, label, pattern = null) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized || (pattern && !pattern.test(normalized))) {
    throw new CatalogContractError(`${label} is invalid`);
  }
  return normalized;
}

function integer(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new CatalogContractError(`${label} is invalid`);
  }
  return value;
}

function finiteNumber(value, label, { min = 0 } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) {
    throw new CatalogContractError(`${label} is invalid`);
  }
  return value;
}

function nullableNumber(value, label) {
  return value === null ? null : finiteNumber(value, label);
}

function optionalClub(value) {
  if (value === null || value === undefined) return null;
  const row = object(value, "entry.club");
  return Object.freeze({
    public_id: text(row.public_id, "entry.club.public_id"),
    slug: text(row.slug, "entry.club.slug", SLUG_PATTERN),
    display_name: text(row.display_name, "entry.club.display_name")
  });
}

function optionalAsset(value, expectedRunId) {
  if (value === null || value === undefined) return null;
  const row = object(value, "entry.asset");
  const digest = text(row.content_sha256, "entry.asset.content_sha256", SHA256_PATTERN);
  const mediaType = text(row.media_type, "entry.asset.media_type");
  if (!["image/png", "image/jpeg"].includes(mediaType)) {
    throw new CatalogContractError("entry.asset.media_type is invalid");
  }
  const extension = mediaType === "image/png" ? "png" : "jpg";
  const expectedUrl = `snapshots/${expectedRunId}/assets/${digest}.${extension}`;
  if (text(row.url, "entry.asset.url") !== expectedUrl) {
    throw new CatalogContractError("entry.asset.url is outside the active snapshot");
  }
  return Object.freeze({
    url: expectedUrl,
    content_sha256: digest,
    media_type: mediaType,
    byte_size: integer(row.byte_size, "entry.asset.byte_size", { min: 1, max: 204800 }),
    width: integer(row.width, "entry.asset.width", { min: 1, max: 1024 }),
    height: integer(row.height, "entry.asset.height", { min: 1, max: 1024 })
  });
}

export function validateCurrentPointer(value) {
  const pointer = object(value, "current pointer");
  if (pointer.schema_version !== 1 || pointer.kind !== "clubs_teams_public_current") {
    throw new CatalogContractError("unsupported current pointer");
  }
  const runId = text(pointer.rating_run_id, "rating_run_id", SNAPSHOT_ID_PATTERN);
  if (pointer.manifest !== `snapshots/${runId}/manifest.json`) {
    throw new CatalogContractError("current manifest path is invalid");
  }
  return Object.freeze({
    schema_version: 1,
    kind: pointer.kind,
    rating_run_id: runId,
    completed_at: text(pointer.completed_at, "completed_at"),
    manifest: pointer.manifest,
    content_sha256: text(pointer.content_sha256, "content_sha256", SHA256_PATTERN)
  });
}

export function validateCatalogPage(value, {
  entityType,
  page,
  ratingRunId
}) {
  const payload = object(value, "catalog page");
  const normalizedType = text(entityType, "entityType");
  if (!ENTITY_TYPES.has(normalizedType)) {
    throw new CatalogContractError("entityType is invalid");
  }
  if (
    payload.schema_version !== 1
    || payload.kind !== "clubs_teams_catalog_page"
    || payload.context !== "general"
    || payload.entity_type !== normalizedType
    || payload.rating_run_id !== ratingRunId
  ) {
    throw new CatalogContractError("catalog page identity is invalid");
  }
  const normalizedPage = integer(payload.page, "page", { min: 1, max: MAX_PAGES });
  if (normalizedPage !== page) throw new CatalogContractError("catalog page number changed");
  const totalPages = integer(payload.total_pages, "total_pages", { min: 1, max: MAX_PAGES });
  if (normalizedPage > totalPages) throw new CatalogContractError("catalog page exceeds total_pages");
  const total = integer(payload.total, "total", { min: 0 });
  if (!Array.isArray(payload.entries)) throw new CatalogContractError("entries must be an array");
  const entries = payload.entries.map((raw, index) => {
    const entry = object(raw, `entries[${index}]`);
    const normalized = {
      entity_type: normalizedType,
      position: integer(entry.position, "entry.position", { min: 1 }),
      public_id: text(entry.public_id, "entry.public_id"),
      slug: text(entry.slug, "entry.slug", SLUG_PATTERN),
      display_name: text(entry.display_name, "entry.display_name"),
      total_points: finiteNumber(entry.total_points, "entry.total_points"),
      race_count: integer(entry.race_count, "entry.race_count", { min: 0 }),
      average_elo: nullableNumber(entry.average_elo, "entry.average_elo"),
      average_sr: nullableNumber(entry.average_sr, "entry.average_sr"),
      members_count: integer(entry.members_count, "entry.members_count", { min: 0 }),
      asset: optionalAsset(entry.asset, ratingRunId)
    };
    if (normalizedType === "team") normalized.club = optionalClub(entry.club);
    return Object.freeze(normalized);
  });
  return Object.freeze({
    entity_type: normalizedType,
    page: normalizedPage,
    total_pages: totalPages,
    total,
    completed_at: text(payload.completed_at, "completed_at"),
    entries: Object.freeze(entries)
  });
}

export function mergeCatalogPages(pages, entityType) {
  if (!Array.isArray(pages) || !pages.length) {
    throw new CatalogContractError("catalog pages are required");
  }
  const ordered = [...pages].sort((left, right) => left.page - right.page);
  const totalPages = ordered[0].total_pages;
  const total = ordered[0].total;
  if (
    ordered.length !== totalPages
    || ordered.some((item, index) => (
      item.entity_type !== entityType
      || item.page !== index + 1
      || item.total_pages !== totalPages
      || item.total !== total
    ))
  ) {
    throw new CatalogContractError("catalog pages are incomplete or inconsistent");
  }
  const entries = ordered.flatMap(item => item.entries);
  if (entries.length !== total) {
    throw new CatalogContractError("catalog total does not match entries");
  }
  const publicIds = new Set(entries.map(item => item.public_id));
  if (publicIds.size !== entries.length) {
    throw new CatalogContractError("catalog contains duplicate public_id");
  }
  return Object.freeze(entries);
}

export function filterCatalogEntries(entries, query) {
  const needle = String(query || "").trim().toLocaleLowerCase();
  if (!needle) return [...entries];
  return entries.filter(entry => (
    entry.display_name.toLocaleLowerCase().includes(needle)
    || entry.slug.toLocaleLowerCase().includes(needle)
    || entry.club?.display_name?.toLocaleLowerCase().includes(needle)
  ));
}

export function resolveCatalogAssetUrl(dataBaseUrl, ratingRunId, asset) {
  if (!asset) return null;
  try {
    const base = new URL(`${String(dataBaseUrl).replace(/\/+$/, "")}/`);
    const resolved = new URL(asset.url, base);
    const expected = new URL(
      `snapshots/${ratingRunId}/assets/${asset.content_sha256}.${asset.media_type === "image/png" ? "png" : "jpg"}`,
      base
    );
    return resolved.href === expected.href && resolved.origin === base.origin
      ? resolved.href
      : null;
  } catch {
    return null;
  }
}

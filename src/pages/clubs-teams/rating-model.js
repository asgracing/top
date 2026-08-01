import {
  CatalogContractError,
  mergeCatalogPages,
  validateCatalogPage,
  validateCurrentPointer
} from "./catalog-model.js";

export const RATING_CONTEXTS = Object.freeze(["general", "hourly", "championship"]);
const CONTEXTS = new Set(RATING_CONTEXTS);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export function normalizeRatingContext(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return CONTEXTS.has(normalized) ? normalized : "general";
}

function integer(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new CatalogContractError(`${label} is invalid`);
  }
  return value;
}

export function validateRatingPage(value, { entityType, context, page, ratingRunId }) {
  const requestedContext = String(context || "").trim().toLowerCase();
  if (!CONTEXTS.has(requestedContext)) {
    throw new CatalogContractError("rating context is invalid");
  }
  const normalizedContext = requestedContext;
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || value.kind !== "clubs_teams_rating_page"
    || value.context !== normalizedContext
    || value.season_id !== null
    || value.entity_type !== entityType
    || value.rating_run_id !== ratingRunId
    || typeof value.entries_sha256 !== "string"
    || !SHA256_PATTERN.test(value.entries_sha256)
  ) {
    throw new CatalogContractError("rating page identity is invalid");
  }
  const limit = integer(value.limit, "rating page limit", { min: 1, max: 100 });
  const offset = integer(value.offset, "rating page offset");
  if (offset !== (page - 1) * limit) {
    throw new CatalogContractError("rating page offset is invalid");
  }
  const normalized = validateCatalogPage({
    ...value,
    kind: "clubs_teams_catalog_page",
    context: "general"
  }, { entityType, page, ratingRunId });
  return Object.freeze({
    ...normalized,
    context: normalizedContext,
    context_version: integer(value.context_version, "rating context version", { min: 1 }),
    limit,
    offset,
    entries_sha256: value.entries_sha256
  });
}

async function loadPages({ client, snapshotRoot, entityType, context, ratingRunId }) {
  const fetchPage = async page => validateRatingPage(
    await client.requestJson(new URL(`ratings/${context}/${entityType}s/page-${page}.json`, snapshotRoot), {
      retries: 1,
      cache: "no-store"
    }),
    { entityType, context, page, ratingRunId }
  );
  const first = await fetchPage(1);
  const remaining = await Promise.all(
    Array.from({ length: first.total_pages - 1 }, (_, index) => fetchPage(index + 2))
  );
  return mergeCatalogPages([first, ...remaining], entityType);
}

export async function loadPublicRatingSnapshot({ client, dataBaseUrl, context = "general" }) {
  const normalizedContext = normalizeRatingContext(context);
  const base = `${String(dataBaseUrl).replace(/\/+$/, "")}/`;
  const pointer = validateCurrentPointer(await client.requestJson(
    new URL("current.json", base),
    { retries: 1, cache: "no-store" }
  ));
  const snapshotRoot = new URL(`snapshots/${pointer.rating_run_id}/`, base);
  const [clubs, teams] = await Promise.all([
    loadPages({ client, snapshotRoot, entityType: "club", context: normalizedContext, ratingRunId: pointer.rating_run_id }),
    loadPages({ client, snapshotRoot, entityType: "team", context: normalizedContext, ratingRunId: pointer.rating_run_id })
  ]);
  return Object.freeze({ context: normalizedContext, pointer, clubs, teams });
}

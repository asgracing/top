import {normalizeHomePayload, SchemaError} from "/src/shared/data-schema.js";

export function homeOverviewDescriptor(manifest) {
  const overview = manifest?.home_overview;
  return overview?.schema_version === 1 &&
    overview.path === "home-overview.json" &&
    /^[a-f0-9]{64}$/.test(overview.revision || "") ? overview : null;
}

const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);

export function normalizeHomeOverview(payload, revision) {
  if (payload?.overview_revision !== revision ||
      !isRecord(payload.global_stats) ||
      !isRecord(payload.tables) ||
      !Array.isArray(payload.online) ||
      !Object.hasOwn(payload, "driver_of_the_day") ||
      !Object.hasOwn(payload, "latest_hourly_race")) {
    throw new SchemaError("home overview", ["missing fields or mismatched revision"]);
  }
  return normalizeHomePayload(payload);
}

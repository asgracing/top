export class SchemaError extends Error {
  constructor(schema, issues) {
    super(`Invalid ${schema}: ${issues.join("; ")}`);
    this.name = "SchemaError";
    this.schema = schema;
    this.issues = issues;
  }
}

const objectOrNull = value => value && typeof value === "object" && !Array.isArray(value) ? value : null;
const finiteNumber = (value, fallback = null) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const text = (value, fallback = "") => value == null ? fallback : String(value).trim();

function assertOptionalArray(source, key, issues) {
  if (source[key] !== undefined && !Array.isArray(source[key])) issues.push(`${key} must be an array`);
}

export function normalizeDriverRow(row, tableName) {
  const source = objectOrNull(row);
  if (!source) return null;
  const common = { ...source, driver: text(source.driver, "-"), rank: finiteNumber(source.rank, 0) };
  if (tableName === "leaderboard") return { ...common, points: finiteNumber(source.points, 0), wins: finiteNumber(source.wins, 0), podiums: finiteNumber(source.podiums, 0), races: finiteNumber(source.races, 0), average_finish: finiteNumber(source.average_finish), best_lap: text(source.best_lap, "-"), best_lap_car_name: text(source.best_lap_car_name ?? source.car_name, "-") };
  if (tableName === "bestlaps") return { ...common, best_lap: text(source.best_lap, "-"), car_name: text(source.car_name ?? source.best_lap_car_name, "-"), session_type: text(source.session_type, "-") };
  if (tableName === "safety") return { ...common, safety_rating: finiteNumber(source.safety_rating), races_count: finiteNumber(source.races_count, 0), total_delta: finiteNumber(source.total_delta, 0), total_invalid_laps: finiteNumber(source.total_invalid_laps, 0), total_counted_penalties: finiteNumber(source.total_counted_penalties, 0), total_incident_points: finiteNumber(source.total_incident_points, 0) };
  return common;
}

export function normalizeTableItems(items, tableName) {
  if (!Array.isArray(items)) throw new SchemaError(`${tableName} table`, ["items must be an array"]);
  return items.map(row => normalizeDriverRow(row, tableName)).filter(Boolean);
}

export function normalizeHomePayload(payload) {
  const source = objectOrNull(payload);
  if (!source) throw new SchemaError("home payload", ["payload must be an object"]);
  const issues = [];
  ["leaderboard", "bestlaps", "safety", "online", "race_activity"].forEach(key => assertOptionalArray(source, key, issues));
  if (issues.length) throw new SchemaError("home payload", issues);
  return { ...source, leaderboard: normalizeTableItems(source.leaderboard || [], "leaderboard"), bestlaps: normalizeTableItems(source.bestlaps || [], "bestlaps"), safety: normalizeTableItems(source.safety || [], "safety") };
}

export function normalizeManifest(payload) {
  const source = objectOrNull(payload);
  if (!source) throw new SchemaError("manifest", ["payload must be an object"]);
  return { ...source, version: text(source.version || source.generated_at), home: text(source.home, "home.json"), tables: objectOrNull(source.tables) || {} };
}

export function normalizePagedTablePayload(payload, tableName, fallbackPage = 1, fallbackPageSize = 10) {
  const source = objectOrNull(payload);
  if (!source) throw new SchemaError(`${tableName} page`, ["payload must be an object"]);
  const items = normalizeTableItems(source.items || [], tableName);
  const page = Math.max(1, finiteNumber(source.page, fallbackPage));
  const pageSize = Math.max(1, finiteNumber(source.page_size, fallbackPageSize));
  const totalItems = Math.max(items.length, finiteNumber(source.total_items, items.length));
  return { ...source, items, page, page_size: pageSize, total_items: totalItems, total_pages: Math.max(1, finiteNumber(source.total_pages, Math.ceil(totalItems / pageSize))) };
}

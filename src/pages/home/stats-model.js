function normalize(value, locale = "en") {
  return String(value ?? "").trim().toLocaleLowerCase(locale === "ru" ? "ru" : "en");
}

export function filterHomeRowsByDriver(rows, search, { locale = "en" } = {}) {
  const source = Array.isArray(rows) ? rows : [];
  const query = normalize(search, locale);
  if (!query) return [...source];
  return source.filter(row => normalize(row?.driver, locale).includes(query));
}

export function filterBestlapsByTrack(rows, trackFilter) {
  const source = Array.isArray(rows) ? rows : [];
  const track = normalize(trackFilter);
  if (!track) return [...source];
  return source.filter(row => normalize(row?.track_code || row?.track) === track);
}

function processRows({ rows, search, sortState, columns, sortRows, locale }) {
  const filtered = filterHomeRowsByDriver(rows, search, { locale });
  return sortRows(filtered, sortState, columns);
}

export function processLeaderboard(options) {
  return processRows(options);
}

export function processBestlaps(options) {
  return processRows({ ...options, rows: filterBestlapsByTrack(options.rows, options.trackFilter) });
}

export function processSafety(options) {
  return processRows(options);
}

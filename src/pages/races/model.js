export const RACES_COLUMNS = Object.freeze([
  { key: "finished_at", type: "string" },
  { key: "track", type: "string" },
  { key: "winner", type: "string" },
  { key: "participants_count", type: "number" },
  { key: "average_elo", type: "number" },
  { key: "best_lap", type: "time" }
].map(column => Object.freeze(column)));

export function processRaces({ rows = [], archiveMeta = null, sortRows }) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  if (archiveMeta) return [...normalizedRows];
  if (typeof sortRows !== "function") throw new TypeError("Races processing requires a row sorter");
  return sortRows(normalizedRows, { key: "finished_at", direction: "desc" }, RACES_COLUMNS);
}

export function buildRacesPageState({ rows = [], archiveMeta = null, page = 1, pageSize, paginateRows }) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  if (archiveMeta) {
    return Object.freeze({
      items: normalizedRows,
      page: archiveMeta.page || page,
      totalPages: archiveMeta.total_pages || 1,
      totalItems: archiveMeta.total_items || 0,
      startIndex: archiveMeta.start_index || 0,
      endIndex: archiveMeta.end_index || 0,
      serverPaged: true
    });
  }
  if (typeof paginateRows !== "function") throw new TypeError("Races page state requires a paginator");
  return Object.freeze({ ...paginateRows(normalizedRows, page, pageSize), serverPaged: false });
}

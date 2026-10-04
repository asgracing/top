export const DRIVER_RACE_COLUMNS = Object.freeze([
  { key: "finished_at", type: "string" },
  { key: "track", type: "string" },
  { key: "start_position", type: "number" },
  { key: "position", type: "number" },
  { key: "positions_delta", type: "number" },
  { key: "points", type: "number" },
  { key: "best_lap", type: "time" },
  { key: "car_name", type: "string" },
  { key: "gap", type: "string" },
  { key: "elo_rating_delta", type: "number" },
  { key: "safety_rating", type: "number" },
].map(Object.freeze));

export const DRIVER_TRACK_COLUMNS = Object.freeze([
  { key: "track", type: "string" },
  { key: "races", type: "number" },
  { key: "wins", type: "number" },
  { key: "podiums", type: "number" },
  { key: "points", type: "number" },
  { key: "average_finish", type: "number" },
  { key: "best_lap", type: "time" },
].map(Object.freeze));

export function buildDriverRaceTableState({ rows = [], sort, page, pageSize, sortRows, paginateRows }) {
  if (typeof sortRows !== "function" || typeof paginateRows !== "function") {
    throw new TypeError("Driver race table requires sorter and paginator dependencies");
  }
  const countedRows = (Array.isArray(rows) ? rows : []).filter(row => row?.counted_for_stats !== false && row?.counted_for_stats !== 0);
  const sortedRows = sortRows(countedRows, sort, DRIVER_RACE_COLUMNS);
  const bestLapValues = countedRows.map(row => Number(row?.best_lap_ms)).filter(value => Number.isFinite(value) && value > 0);
  return Object.freeze({
    ...paginateRows(sortedRows, page, pageSize),
    countedRows,
    fastestLapMs: bestLapValues.length ? Math.min(...bestLapValues) : null,
  });
}

export function buildDriverTrackTableState({ rows = [], sort, page, pageSize, sortRows, paginateRows }) {
  if (typeof sortRows !== "function" || typeof paginateRows !== "function") {
    throw new TypeError("Driver track table requires sorter and paginator dependencies");
  }
  const normalizedRows = Array.isArray(rows) ? rows : [];
  return Object.freeze({ ...paginateRows(sortRows(normalizedRows, sort, DRIVER_TRACK_COLUMNS), page, pageSize) });
}

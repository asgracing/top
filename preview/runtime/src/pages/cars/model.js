export const CARS_COLUMNS = Object.freeze([
  { key: "car_name", type: "string" },
  { key: "races", type: "number" },
  { key: "wins", type: "number" },
  { key: "win_rate", type: "number" },
  { key: "podiums", type: "number" },
  { key: "unique_drivers", type: "number" },
  { key: "average_finish", type: "number" },
  { key: "fastest_lap_awards", type: "number" },
  { key: "best_lap", type: "time" }
].map(column => Object.freeze(column)));

export function processCars({ rows = [], sortState, sortRows }) {
  if (typeof sortRows !== "function") throw new TypeError("Cars processing requires a row sorter");
  return sortRows(Array.isArray(rows) ? rows : [], sortState, CARS_COLUMNS);
}

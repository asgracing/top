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

export function buildRacesSummary({ rows = [], archiveSummary = null, isActiveResult, getCarName }) {
  const races = Array.isArray(rows) ? rows : [];
  const latestRace = races[0] || null;
  if (archiveSummary) {
    const latest = archiveSummary.latest_race || latestRace;
    return Object.freeze({
      total: archiveSummary.total_races || archiveSummary.total_items || "-",
      averageActive: archiveSummary.average_active_drivers ?? "-",
      averageOvertakes: archiveSummary.average_overtakes ?? "-",
      topWinner: archiveSummary.top_winner || null,
      latestRace: latest,
      latestBestLap: latest?.winner_best_lap || latest?.best_lap || "-",
      latestBestLapCar: latest?.winner_best_lap_car_name || latest?.best_lap_car_name || ""
    });
  }
  if (typeof isActiveResult !== "function" || typeof getCarName !== "function") {
    throw new TypeError("Fallback races summary requires result dependencies");
  }
  const winners = new Map();
  let activeTotal = 0;
  let overtakesTotal = 0;
  for (const race of races) {
    if (race?.winner) {
      const key = race.winner_public_id || race.winner;
      const current = winners.get(key) || { count: 0, name: race.winner, public_id: race.winner_public_id };
      current.count += 1;
      winners.set(key, current);
    }
    const active = (race?.results || []).filter(isActiveResult);
    activeTotal += active.length;
    overtakesTotal += active.reduce((sum, row) => sum + Math.max(0, row?.positions_delta ?? 0), 0);
  }
  const topWinner = [...winners.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0] || null;
  const winnerRow = latestRace?.results?.find(row =>
    (latestRace.winner_public_id && row.public_id === latestRace.winner_public_id) || row.driver === latestRace.winner
  ) || null;
  return Object.freeze({
    total: races.length || "-",
    averageActive: races.length ? (activeTotal / races.length).toFixed(2) : "-",
    averageOvertakes: races.length ? (overtakesTotal / races.length).toFixed(2) : "-",
    topWinner,
    latestRace,
    latestBestLap: winnerRow?.best_lap || "-",
    latestBestLapCar: getCarName(winnerRow)
  });
}

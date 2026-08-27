import test from "node:test";
import assert from "node:assert/strict";
import { buildRacesPageState, buildRacesSummary, filterRaces, normalizeRaceServerName, processRaces, RACES_COLUMNS, splitRaceServerLabel } from "../../src/pages/races/model.js";

test("declares the races table contract", () => {
  assert.deepEqual(RACES_COLUMNS.map(column => column.key), ["finished_at", "track", "server_name", "winner", "participants_count", "average_elo", "best_lap"]);
  assert.equal(Object.isFrozen(RACES_COLUMNS), true);
});

test("normalizes public server names and the Race exception", () => {
  assert.equal(normalizeRaceServerName("ASG Racing Monza - Live Leaderboard"), "Monza - Live Leaderboard");
  assert.equal(normalizeRaceServerName("ASG Racing Nordschleife - Live Leaderboard - Nordschleife - Live Leaderboard"), "Nordschleife - Live Leaderboard");
  assert.equal(normalizeRaceServerName("ASG Racing Race, password 'privet'"), "Race");
  assert.equal(normalizeRaceServerName("ASG Racing Spa - SA Gainer 3 (Q 10"), "Spa - SA Gainer 3");
  assert.deepEqual(splitRaceServerLabel("ASG Racing Spa - SA Gainer 3"), { primary: "Spa", secondary: "SA Gainer 3" });
});

test("searches races by track, server, winner, date and time", () => {
  const rows = [{ track: "monza", server_name: "ASG Racing Monza - Live Leaderboard", winner: "Alice", finished_at: "2026-08-27T18:45:00Z" }];
  const options = { humanizeTrack: () => "Монца", formatDateTime: () => "27.08.2026, 21:45", locale: "ru" };
  for (const query of ["монца", "live leaderboard", "alice", "27.08.2026", "21:45"]) {
    assert.equal(filterRaces(rows, query, options).length, 1, query);
  }
  assert.equal(filterRaces(rows, "spa", options).length, 0);
});

test("preserves server ordering for paged archives", () => {
  const rows = [{ race_id: 2 }, { race_id: 1 }];
  const result = processRaces({ rows, archiveMeta: { page: 1 } });
  assert.deepEqual(result, rows);
  assert.notEqual(result, rows);
});

test("sorts fallback rows newest first through the shared sorter", () => {
  const rows = [{ race_id: 1 }];
  let received;
  processRaces({ rows, sortRows: (...args) => { received = args; return rows; } });
  assert.deepEqual(received[1], { key: "finished_at", direction: "desc" });
  assert.equal(received[2], RACES_COLUMNS);
});

test("rejects a missing fallback sorter", () => {
  assert.throws(() => processRaces({ rows: [] }), /row sorter/);
});

test("normalizes server pagination metadata", () => {
  const result = buildRacesPageState({ rows: [{ id: 1 }], page: 4, archiveMeta: { page: 2, total_pages: 8, total_items: 77, start_index: 11, end_index: 20 } });
  assert.deepEqual({ page: result.page, totalPages: result.totalPages, totalItems: result.totalItems, serverPaged: result.serverPaged }, { page: 2, totalPages: 8, totalItems: 77, serverPaged: true });
});

test("delegates local pagination", () => {
  const result = buildRacesPageState({ rows: [1, 2], page: 2, pageSize: 1, paginateRows: (rows, page, size) => ({ items: rows.slice(1), page, totalPages: 2, totalItems: rows.length, startIndex: 2, endIndex: 2, size }) });
  assert.equal(result.serverPaged, false);
  assert.deepEqual(result.items, [2]);
});

test("normalizes an archive summary", () => {
  const result = buildRacesSummary({ rows: [], archiveSummary: { total_races: 10, average_active_drivers: 20, top_winner: { name: "A" }, latest_race: { winner: "B", winner_best_lap: "1:47" } } });
  assert.deepEqual({ total: result.total, averageActive: result.averageActive, latestBestLap: result.latestBestLap }, { total: 10, averageActive: 20, latestBestLap: "1:47" });
});

test("calculates a fallback summary from race results", () => {
  const rows = [{ winner: "A", winner_public_id: "1", results: [{ driver: "A", public_id: "1", positions_delta: 3, best_lap: "1:48", car_name: "Car" }] }];
  const result = buildRacesSummary({ rows, isActiveResult: () => true, getCarName: row => row?.car_name || "" });
  assert.equal(result.topWinner.count, 1);
  assert.equal(result.averageActive, "1.00");
  assert.equal(result.averageOvertakes, "3.00");
  assert.equal(result.latestBestLapCar, "Car");
});

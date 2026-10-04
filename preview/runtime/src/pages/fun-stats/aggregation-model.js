function createDriverRecord(row, makePublicDriverId) {
  return {
    publicId: row?.public_id || makePublicDriverId(row?.player_id), playerId: row?.player_id || null, driver: row?.driver || "-",
    starts: 0, points: 0, wins: 0, podiums: 0, fastestLapAwards: 0, finishTotal: 0, finishSamples: 0,
    positionsGain: 0, penaltyPoints: 0, penaltyCount: 0,
  };
}

export function aggregateFunStatsFallback({ period, races = [], safety = [], isActiveResult, makePublicDriverId, formatLapTime }) {
  if (typeof isActiveResult !== "function" || typeof makePublicDriverId !== "function" || typeof formatLapTime !== "function") {
    throw new TypeError("Fun Stats aggregation requires result, driver id and lap time dependencies");
  }
  const driverMap = new Map();
  const carMap = new Map();
  let overtakesTotal = 0;
  let fastestLapRecord = null;
  for (const race of Array.isArray(races) ? races : []) {
    for (const row of (race?.results || []).filter(isActiveResult)) {
      const key = row?.public_id || makePublicDriverId(row?.player_id) || row?.driver || "unknown_driver";
      const record = driverMap.get(key) || createDriverRecord(row, makePublicDriverId);
      record.starts += 1;
      record.points += row?.points ?? 0;
      record.wins += row?.position === 1 ? 1 : 0;
      record.podiums += typeof row?.position === "number" && row.position <= 3 ? 1 : 0;
      record.fastestLapAwards += row?.had_best_lap ? 1 : 0;
      if (typeof row?.position === "number" && row.position > 0) { record.finishTotal += row.position; record.finishSamples += 1; }
      record.positionsGain += Math.max(0, row?.positions_delta ?? 0);
      record.penaltyPoints += row?.penalty_points ?? 0;
      record.penaltyCount += row?.penalty_count ?? 0;
      driverMap.set(key, record);
      overtakesTotal += Math.max(0, row?.positions_delta ?? 0);
      const carName = row?.car_name || "-";
      const carRecord = carMap.get(carName) || { car: carName, starts: 0, wins: 0 };
      carRecord.starts += 1;
      carRecord.wins += row?.position === 1 ? 1 : 0;
      carMap.set(carName, carRecord);
      const lapMs = Number(row?.best_lap_ms);
      if (lapMs > 0 && (!fastestLapRecord || lapMs < fastestLapRecord.bestLapMs)) {
        fastestLapRecord = { bestLapMs: lapMs, lap: row.best_lap || formatLapTime(lapMs), driver: row.driver || "-", publicId: row.public_id || makePublicDriverId(row.player_id), playerId: row.player_id || null };
      }
    }
  }
  const drivers = [...driverMap.values()];
  const cars = [...carMap.values()];
  const cleanPool = drivers.filter(driver => driver.starts >= (period === "month" ? 4 : 2));
  const stablePool = drivers.filter(driver => driver.starts >= (period === "month" ? 5 : 3) && driver.finishSamples > 0).map(driver => ({ ...driver, averageFinish: driver.finishTotal / driver.finishSamples }));
  const chaos = [...(Array.isArray(safety) ? safety : [])].sort((a, b) => (b?.penalty_points ?? 0) - (a?.penalty_points ?? 0) || (b?.penalty_count ?? 0) - (a?.penalty_count ?? 0))[0] || null;
  const byName = (a, b) => a.driver.localeCompare(b.driver);
  const fastestLapLeader = [...drivers].sort((a, b) => b.fastestLapAwards - a.fastestLapAwards || b.points - a.points || byName(a, b))[0] || null;
  return Object.freeze({
    summary: { races: races.length, activeDrivers: drivers.length, fastestLapLeader, overtakes: overtakesTotal },
    awards: {
      pointsBoss: [...drivers].sort((a, b) => b.points - a.points || b.wins - a.wins || byName(a, b))[0] || null,
      grindKing: [...drivers].sort((a, b) => b.starts - a.starts || b.points - a.points || byName(a, b))[0] || null,
      podiumHunter: [...drivers].sort((a, b) => b.podiums - a.podiums || b.wins - a.wins || byName(a, b))[0] || null,
      comebackHero: [...drivers].sort((a, b) => b.positionsGain - a.positionsGain || b.starts - a.starts || byName(a, b))[0] || null,
      cleanOperator: [...cleanPool].sort((a, b) => a.penaltyPoints - b.penaltyPoints || b.starts - a.starts || b.points - a.points || byName(a, b))[0] || null,
      hotLapHero: fastestLapRecord,
      chaosMagnet: chaos ? { driver: chaos.driver || "-", publicId: chaos.public_id || makePublicDriverId(chaos.player_id), playerId: chaos.player_id || null, penaltyPoints: chaos.penalty_points ?? 0 } : null,
      garageFavorite: [...cars].sort((a, b) => b.starts - a.starts || b.wins - a.wins || a.car.localeCompare(b.car))[0] || null,
    },
    lists: {
      active: [...drivers].sort((a, b) => b.starts - a.starts || b.points - a.points || byName(a, b)).slice(0, 5),
      movers: [...drivers].sort((a, b) => b.positionsGain - a.positionsGain || b.starts - a.starts || byName(a, b)).slice(0, 5),
      clean: [...cleanPool].sort((a, b) => a.penaltyPoints - b.penaltyPoints || b.starts - a.starts || b.points - a.points || byName(a, b)).slice(0, 5),
      stable: [...stablePool].sort((a, b) => a.averageFinish - b.averageFinish || b.starts - a.starts || byName(a, b)).slice(0, 5),
      fastest: [...drivers].sort((a, b) => b.fastestLapAwards - a.fastestLapAwards || b.points - a.points || byName(a, b)).slice(0, 5),
      cars: [...cars].sort((a, b) => b.starts - a.starts || b.wins - a.wins || a.car.localeCompare(b.car)).slice(0, 5),
    },
  });
}

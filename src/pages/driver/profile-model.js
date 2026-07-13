function getRankClass(rank) {
  return rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "rank-default";
}

export function buildDriverRankInfo(profile, rankingRows = []) {
  const rows = Array.isArray(rankingRows) ? rankingRows : [];
  const index = profile?.public_id && rows.length ? rows.findIndex(row => row?.public_id === profile.public_id) : -1;
  const liveRow = index >= 0 ? rows[index] : null;
  const liveRank = liveRow?.rank || (index >= 0 ? index + 1 : null);
  if (liveRank) return Object.freeze({ rank: liveRank, rankClass: getRankClass(liveRank), change: liveRow?.rank_change || liveRow?.latest_changes?.championship_rank || null });
  const summaryRank = profile?.summary?.championship_rank;
  if (!summaryRank) return null;
  return Object.freeze({ rank: summaryRank, rankClass: getRankClass(summaryRank), change: profile?.summary?.latest_changes?.championship_rank || null });
}

export function getDriverFavoriteCar(profile) {
  const history = Array.isArray(profile?.race_history) ? profile.race_history : [];
  const counts = new Map();
  for (const row of history) {
    const name = String(row?.car_name || "").trim();
    if (name) counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null;
}

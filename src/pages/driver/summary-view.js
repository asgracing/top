function requireFunctions(dependencies, names) {
  if (!dependencies || names.some(name => typeof dependencies[name] !== "function")) {
    throw new TypeError("Driver summary view requires complete rendering dependencies");
  }
}

export function renderDriverHeroTitle(profile, rankInfo, eloSource, dependencies) {
  if (!profile) return "-";
  requireFunctions(dependencies, ["escapeHtml", "escapeAttribute", "translate", "renderEloBadge", "renderTrendBadge"]);
  const { escapeHtml, escapeAttribute, translate, renderEloBadge, renderTrendBadge } = dependencies;
  return `
    <span class="driver-title-name">${escapeHtml(profile.driver || "-")}</span>
    ${renderEloBadge(eloSource, { showCategoryName: true })}
    ${rankInfo ? `<span class="driver-rank-pill ${escapeHtml(rankInfo.rankClass)}" title="${escapeAttribute(translate("driverRankingPosition"))}"><span class="driver-rank-label">${escapeHtml(translate("driverRankingPosition"))}:</span><span class="driver-rank-value">#${escapeHtml(rankInfo.rank)}</span>${renderTrendBadge(rankInfo.change, "championship_rank", { compact: true })}</span>` : ""}
  `;
}

export function renderDriverStatsCards(model, dependencies) {
  requireFunctions(dependencies, ["escapeHtml", "escapeAttribute", "translate", "renderStatValueWithTrend", "renderPositionsDelta"]);
  const { escapeHtml, escapeAttribute, translate, renderStatValueWithTrend, renderPositionsDelta } = dependencies;
  if (!model) return `<div class="empty-box">${escapeHtml(translate("driverNoData"))}</div>`;
  const { summary = {}, favoriteCarMarkup = "", bestLap = "-", bestLapTrack = null, bestLapTrackSelect = "", bestLapCar = "", averagePace = "-", averagePaceTrack = null, averagePaceTrackSelect = "" } = model;
  const card = (label, value) => `<div class="driver-stat-card"><div class="driver-stat-label">${escapeHtml(translate(label))}</div><div class="driver-stat-value">${value}</div></div>`;
  return `
    ${card("driverSummaryPoints", renderStatValueWithTrend(escapeHtml(summary.points ?? 0), summary.latest_changes?.points, "points"))}
    ${card("driverSummaryAvgFinish", renderStatValueWithTrend(escapeHtml(summary.average_finish ?? "-"), summary.latest_changes?.average_finish, "average_finish"))}
    ${card("driverSummaryAvgPoints", escapeHtml(summary.average_points_per_race ?? 0))}
    ${card("driverSummaryRaces", renderStatValueWithTrend(escapeHtml(summary.races ?? 0), summary.latest_changes?.races, "races"))}
    ${card("driverSummaryWins", escapeHtml(summary.wins ?? 0))}
    ${card("driverWinRate", `${escapeHtml(summary.win_rate ?? 0)}%`)}
    ${card("driverSummaryAvgGain", renderStatValueWithTrend(renderPositionsDelta(summary.average_positions_delta), summary.latest_changes?.average_positions_delta, "average_positions_delta"))}
    ${card("driverSummaryPodiums", renderStatValueWithTrend(escapeHtml(summary.podiums ?? 0), summary.latest_changes?.podiums, "podiums"))}
    ${card("driverPodiumRate", `${escapeHtml(summary.podium_rate ?? 0)}%`)}
    <div class="driver-stat-card">
      <div class="driver-stat-label driver-stat-label-with-control" title="${escapeAttribute(translate("driverSummaryBestLapTooltip"))}"><span>${escapeHtml(translate("driverSummaryBestLap"))}</span>${bestLapTrackSelect}</div>
      <div class="driver-stat-mainline driver-stat-bestlap-mainline"><div class="driver-stat-value driver-stat-value-bestlap">${renderStatValueWithTrend(escapeHtml(bestLap), bestLapTrack ? null : summary.latest_changes?.best_lap_ms, "best_lap_ms")}</div>${bestLapCar ? `<div class="driver-stat-side driver-stat-bestlap-car">${escapeHtml(bestLapCar)}</div>` : ""}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label driver-stat-label-with-control" title="${escapeAttribute(translate("driverSummaryAvgPaceTooltip"))}"><span>${escapeHtml(translate("driverSummaryAvgPace"))}</span>${averagePaceTrackSelect}</div>
      <div class="driver-stat-value">${renderStatValueWithTrend(escapeHtml(averagePace), averagePaceTrack ? null : summary.latest_changes?.average_pace_ms, "average_pace_ms")}</div>
    </div>
    ${card("driverFavoriteCar", favoriteCarMarkup)}
  `;
}

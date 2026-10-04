export function createFunStatsPageView(dependencies) {
  const required = ["translate", "escapeHtml", "replaceTokens", "renderLoadingMarkup", "replaceWithTextState", "aggregate", "renderSummaryCard", "renderAwardCard", "renderListCard", "renderDriverLink", "renderCarLink"];
  if (!dependencies?.documentRef || required.some(name => typeof dependencies[name] !== "function")) throw new TypeError("Fun Stats page view requires complete dependencies");
  const { documentRef, translate, escapeHtml, replaceTokens, renderLoadingMarkup, replaceWithTextState, aggregate, renderSummaryCard, renderAwardCard, renderListCard, renderDriverLink, renderCarLink } = dependencies;

  function render({ loading = false, period = "week" } = {}) {
    const summaryEl = documentRef.getElementById("fun-stats-summary");
    const awardsEl = documentRef.getElementById("fun-stats-awards");
    const leaderboardsEl = documentRef.getElementById("fun-stats-leaderboards");
    const rangeEl = documentRef.getElementById("fun-stats-range");
    if (!summaryEl || !awardsEl || !leaderboardsEl || !rangeEl) return false;

    if (loading) {
      summaryEl.innerHTML = renderLoadingMarkup(translate("loading"));
      awardsEl.innerHTML = renderLoadingMarkup(translate("loading"));
      leaderboardsEl.replaceChildren();
      rangeEl.textContent = translate("loading");
      return true;
    }

    documentRef.querySelectorAll("[data-fun-period]").forEach(button => {
      const active = button.dataset.funPeriod === period;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    const data = aggregate(period);
    rangeEl.textContent = `${translate("funStatsWindowLabel")}: ${data.rangeLabel}`;
    summaryEl.innerHTML = [
      renderSummaryCard(escapeHtml(translate("funStatsSummaryRaces")), escapeHtml(data.summary.races)),
      renderSummaryCard(escapeHtml(translate("funStatsSummaryDrivers")), escapeHtml(data.summary.activeDrivers)),
      renderSummaryCard(escapeHtml(translate("funStatsSummaryFastestLapsLeader")), data.summary.fastestLapLeader ? escapeHtml(replaceTokens(translate("funStatsSummaryFastestLapsLeaderNote"), { value: data.summary.fastestLapLeader.fastestLapAwards })) : "-", data.summary.fastestLapLeader?.driver || "", "fun-summary-card-driver-note"),
      renderSummaryCard(escapeHtml(translate("funStatsSummaryOvertakes")), escapeHtml(data.summary.overtakes)),
    ].join("");
    if (!data.summary.races) {
      replaceWithTextState(awardsEl, "empty", translate("funStatsEmpty"));
      leaderboardsEl.replaceChildren();
      return true;
    }

    const linkDriver = item => renderDriverLink(item.driver, item.publicId, "driver-link driver-link-heading", item.playerId);
    const { pointsBoss, grindKing, podiumHunter, comebackHero, cleanOperator, hotLapHero, chaosMagnet, garageFavorite } = data.awards;
    awardsEl.innerHTML = [
      pointsBoss && renderAwardCard("funStatsAwardPointsBoss", linkDriver(pointsBoss), replaceTokens(translate("funStatsAwardPointsBossNote"), { value: pointsBoss.points }), "accent"),
      grindKing && renderAwardCard("funStatsAwardGrindKing", linkDriver(grindKing), replaceTokens(translate("funStatsAwardGrindKingNote"), { value: grindKing.starts }), "warm"),
      podiumHunter && renderAwardCard("funStatsAwardPodiumHunter", linkDriver(podiumHunter), replaceTokens(translate("funStatsAwardPodiumHunterNote"), { value: podiumHunter.podiums }), "gold"),
      comebackHero && renderAwardCard("funStatsAwardComebackHero", linkDriver(comebackHero), replaceTokens(translate("funStatsAwardComebackHeroNote"), { value: comebackHero.positionsGain }), "cool"),
      cleanOperator && renderAwardCard("funStatsAwardCleanOperator", linkDriver(cleanOperator), replaceTokens(translate("funStatsAwardCleanOperatorNote"), { value: cleanOperator.penaltyPoints, starts: cleanOperator.starts }), "clean"),
      hotLapHero && renderAwardCard("funStatsAwardHotLapHero", linkDriver(hotLapHero), replaceTokens(translate("funStatsAwardHotLapHeroNote"), { lap: hotLapHero.lap }), "accent"),
      chaosMagnet && renderAwardCard("funStatsAwardChaosMagnet", linkDriver(chaosMagnet), replaceTokens(translate("funStatsAwardChaosMagnetNote"), { value: chaosMagnet.penaltyPoints }), "danger"),
      garageFavorite && renderAwardCard("funStatsAwardGarageFavorite", renderCarLink(garageFavorite.car, "driver-link driver-link-heading"), replaceTokens(translate("funStatsAwardGarageFavoriteNote"), { value: garageFavorite.starts }), "neutral"),
    ].filter(Boolean).join("");

    const driverItems = (items, valueKey) => items.map(item => ({ label: renderDriverLink(item.driver, item.publicId, "driver-link", item.playerId), value: item[valueKey] }));
    leaderboardsEl.innerHTML = [
      renderListCard("funStatsListActive", driverItems(data.lists.active, "starts"), item => replaceTokens(translate("funStatsListStartsValue"), { value: item.value })),
      renderListCard("funStatsListMovers", driverItems(data.lists.movers, "positionsGain"), item => replaceTokens(translate("funStatsListGainValue"), { value: item.value })),
      renderListCard("funStatsListClean", driverItems(data.lists.clean, "penaltyPoints"), item => replaceTokens(translate("funStatsListPenaltyValue"), { value: item.value })),
      renderListCard("funStatsListStable", driverItems(data.lists.stable, "averageFinish"), item => replaceTokens(translate("funStatsListAvgFinishValue"), { value: Number(item.value).toFixed(2) })),
      renderListCard("funStatsListFastest", driverItems(data.lists.fastest, "fastestLapAwards"), item => replaceTokens(translate("funStatsListFastestLapValue"), { value: item.value })),
      renderListCard("funStatsListCars", data.lists.cars.map(item => ({ label: renderCarLink(item.car, "driver-link"), value: item.starts })), item => replaceTokens(translate("funStatsListCarValue"), { value: item.value })),
    ].join("");
    return true;
  }
  return Object.freeze({ render });
}

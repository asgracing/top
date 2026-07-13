export function createDriverPageView(dependencies) {
  const required = ["translate", "renderLoadingMarkup", "setLoadingMarkup", "replaceWithTextState", "buildHeroTitle", "buildStatsMarkup", "buildHighlightsMarkup", "renderRaceHistory", "renderTrackStats", "renderPenaltyList", "bindStats", "setDocumentTitle"];
  if (!dependencies?.documentRef || required.some(name => typeof dependencies[name] !== "function")) {
    throw new TypeError("Driver page view requires complete dependencies");
  }
  const { documentRef, translate, renderLoadingMarkup, setLoadingMarkup, replaceWithTextState, buildHeroTitle, buildStatsMarkup, buildHighlightsMarkup, renderRaceHistory, renderTrackStats, renderPenaltyList, bindStats, setDocumentTitle } = dependencies;

  function render({ loading = false, profile = null } = {}) {
    const nameEl = documentRef.getElementById("driver-page-name");
    const subtitleEl = documentRef.getElementById("driver-page-subtitle");
    const statsEl = documentRef.getElementById("driver-stat-cards");
    const highlightsEl = documentRef.getElementById("driver-highlights");
    if (!nameEl || !subtitleEl || !statsEl || !highlightsEl) return false;

    if (loading) {
      nameEl.textContent = "-";
      subtitleEl.textContent = translate("driverPreviewSubtitle");
      statsEl.innerHTML = renderLoadingMarkup(translate("driverLoading"));
      highlightsEl.replaceChildren();
      setLoadingMarkup("driver-races-table", "driverLoading");
      setLoadingMarkup("driver-tracks-table", "driverLoading");
      renderPenaltyList("driver-penalty-reasons", {}, "driverPenaltyReason");
      renderPenaltyList("driver-penalty-types", {}, "driverPenaltyType");
      return true;
    }

    if (!profile) {
      nameEl.textContent = "-";
      subtitleEl.textContent = translate("driverNoData");
      replaceWithTextState(statsEl, "empty", translate("driverNoData"));
      highlightsEl.replaceChildren();
      renderRaceHistory();
      renderTrackStats();
      renderPenaltyList("driver-penalty-reasons", {}, "driverPenaltyReason");
      renderPenaltyList("driver-penalty-types", {}, "driverPenaltyType");
      return true;
    }

    setDocumentTitle(`${profile.driver} | ${translate("pageTitleDriver")}`);
    nameEl.innerHTML = buildHeroTitle(profile);
    subtitleEl.textContent = translate("driverPageSubtitle");
    statsEl.innerHTML = buildStatsMarkup(profile);
    highlightsEl.innerHTML = buildHighlightsMarkup(profile);
    renderRaceHistory();
    renderTrackStats();
    renderPenaltyList("driver-penalty-reasons", profile.penalties?.reasons, "driverPenaltyReason");
    renderPenaltyList("driver-penalty-types", profile.penalties?.types, "driverPenaltyType");
    bindStats(statsEl, profile);
    return true;
  }

  return Object.freeze({ render });
}

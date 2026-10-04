export function createDriverStatsController({
  bestLapSelection,
  averagePaceSelection,
  getSelectionKey,
  renderStats,
  openBestLapsModal,
  applyBestLapsButtonText,
  translate,
}) {
  if (!(bestLapSelection instanceof Map) || !(averagePaceSelection instanceof Map) || [getSelectionKey, renderStats, openBestLapsModal, applyBestLapsButtonText, translate].some(value => typeof value !== "function")) {
    throw new TypeError("Driver stats controller requires complete dependencies");
  }

  function bind(root, profile) {
    if (!root?.querySelectorAll) return;
    const button = root.querySelector?.("[data-driver-bestlap-tracks]");
    if (button && button.dataset.bound !== "true") {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const items = Array.isArray(profile?.best_laps_by_track)
          ? profile.best_laps_by_track
          : Array.isArray(profile?.bestlap_tracks) ? profile.bestlap_tracks : [];
        openBestLapsModal(items, button, { title: translate("bestLapTracksTitle"), subtitle: translate("driverBestLapTracksSubtitle") });
      });
      button.dataset.bound = "true";
      applyBestLapsButtonText(root);
    }

    bindSelects(root, profile, "[data-bestlap-track]", "bestlapTrack", bestLapSelection);
    bindSelects(root, profile, "[data-average-pace-track]", "averagePaceTrack", averagePaceSelection);
  }

  function bindSelects(root, profile, selector, datasetKey, selection) {
    root.querySelectorAll(selector).forEach(select => {
      if (select.dataset.bound === "true") return;
      select.addEventListener("change", () => {
        selection.set(select.dataset[datasetKey] || getSelectionKey(profile), select.value);
        const container = select.closest?.(".driver-stats-grid") || root;
        if (!container) return;
        container.innerHTML = renderStats(profile);
        bind(container, profile);
      });
      select.dataset.bound = "true";
    });
  }

  return Object.freeze({ bind });
}

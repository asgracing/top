export function createDriverPreviewView(dependencies) {
  const required = ["translate", "replaceWithTextState", "buildHeroTitle", "buildStatsMarkup", "buildHighlightsMarkup", "bindStats", "renderPortrait"];
  if (!dependencies?.documentRef || required.some(name => typeof dependencies[name] !== "function")) {
    throw new TypeError("Driver preview view requires complete dependencies");
  }
  const { documentRef, translate, replaceWithTextState, buildHeroTitle, buildStatsMarkup, buildHighlightsMarkup, bindStats, renderPortrait } = dependencies;

  function render(state) {
    const titleEl = documentRef.getElementById("driver-preview-title");
    const statsEl = documentRef.getElementById("driver-preview-stats");
    const highlightsEl = documentRef.getElementById("driver-preview-highlights");
    const actionEl = documentRef.getElementById("driver-preview-link");
    if (!titleEl || !statsEl || !highlightsEl || !actionEl) return false;

    if (!state) {
      renderPortrait(null, null);
      titleEl.textContent = "-";
      replaceWithTextState(statsEl, "loading", translate("driverLoading"));
      highlightsEl.replaceChildren();
      actionEl.hidden = true;
      return true;
    }

    const profile = state.profile;
    if (state.loading) {
      renderPortrait(null, null);
      titleEl.textContent = state.driver || "-";
      replaceWithTextState(statsEl, "loading", translate("driverLoading"));
      highlightsEl.replaceChildren();
    } else if (!profile || state.error) {
      renderPortrait(null, null);
      titleEl.textContent = state.driver || "-";
      replaceWithTextState(statsEl, "empty", translate("driverNoData"));
      highlightsEl.replaceChildren();
    } else {
      renderPortrait(profile, state.avatarUrl);
      titleEl.innerHTML = buildHeroTitle(profile);
      statsEl.innerHTML = buildStatsMarkup(profile);
      highlightsEl.innerHTML = buildHighlightsMarkup(profile);
      bindStats(statsEl, profile);
    }

    if (state.href) {
      actionEl.href = state.href;
      actionEl.hidden = false;
    } else {
      actionEl.hidden = true;
    }
    return true;
  }

  return Object.freeze({ render });
}

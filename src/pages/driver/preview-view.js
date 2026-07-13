export function createDriverPreviewView(dependencies) {
  const required = ["translate", "replaceWithTextState", "buildHeroTitle", "buildStatsMarkup", "buildHighlightsMarkup", "bindStats"];
  if (!dependencies?.documentRef || required.some(name => typeof dependencies[name] !== "function")) {
    throw new TypeError("Driver preview view requires complete dependencies");
  }
  const { documentRef, translate, replaceWithTextState, buildHeroTitle, buildStatsMarkup, buildHighlightsMarkup, bindStats } = dependencies;

  function render(state) {
    const titleEl = documentRef.getElementById("driver-preview-title");
    const subtitleEl = documentRef.getElementById("driver-preview-subtitle");
    const statsEl = documentRef.getElementById("driver-preview-stats");
    const highlightsEl = documentRef.getElementById("driver-preview-highlights");
    const actionEl = documentRef.getElementById("driver-preview-link");
    if (!titleEl || !subtitleEl || !statsEl || !highlightsEl || !actionEl) return false;

    if (!state) {
      titleEl.textContent = "-";
      subtitleEl.textContent = translate("driverPreviewSubtitle");
      replaceWithTextState(statsEl, "loading", translate("driverLoading"));
      highlightsEl.replaceChildren();
      actionEl.hidden = true;
      return true;
    }

    const profile = state.profile;
    if (state.loading) {
      titleEl.textContent = state.driver || "-";
      subtitleEl.textContent = translate("driverPreviewSubtitle");
      replaceWithTextState(statsEl, "loading", translate("driverLoading"));
      highlightsEl.replaceChildren();
    } else if (!profile || state.error) {
      titleEl.textContent = state.driver || "-";
      subtitleEl.textContent = translate("driverPreviewSubtitle");
      replaceWithTextState(statsEl, "empty", translate("driverNoData"));
      highlightsEl.replaceChildren();
    } else {
      titleEl.innerHTML = buildHeroTitle(profile);
      subtitleEl.textContent = translate("driverPreviewSubtitle");
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

export function createDriverPreviewView(dependencies) {
  const required = ["translate", "replaceWithTextState", "buildHeroTitle", "buildStatsMarkup", "buildHighlightsMarkup", "bindStats", "renderPortrait"];
  if (!dependencies?.documentRef || required.some(name => typeof dependencies[name] !== "function")) throw new TypeError("Driver preview view requires complete dependencies");
  const { documentRef, translate, replaceWithTextState, buildHeroTitle, buildStatsMarkup, buildHighlightsMarkup, bindStats, renderPortrait } = dependencies;

  function render(state) {
    const titleEl = documentRef.getElementById("driver-preview-title"), profileTitleEl = documentRef.getElementById("driver-preview-profile-title"), profileTitleIconEl = documentRef.getElementById("driver-preview-profile-title-icon"), profileTitleTextEl = documentRef.getElementById("driver-preview-profile-title-text"), statsEl = documentRef.getElementById("driver-preview-stats"), highlightsEl = documentRef.getElementById("driver-preview-highlights"), actionEl = documentRef.getElementById("driver-preview-link"), actionRowEl = documentRef.getElementById("driver-preview-action-row");
    if (!titleEl || !profileTitleEl || !profileTitleIconEl || !profileTitleTextEl || !statsEl || !highlightsEl || !actionEl || !actionRowEl) return false;

    const renderProfileTitle = value => {
      const active = value && typeof value === "object" ? value : null;
      profileTitleEl.hidden = !active;
      profileTitleIconEl.textContent = active?.icon || "✦";
      profileTitleTextEl.textContent = active?.title || "";
      profileTitleEl.title = active?.description || "";
    };

    if (!state) {
      renderPortrait(null, null);
      renderProfileTitle(null);
      titleEl.textContent = "-";
      replaceWithTextState(statsEl, "loading", translate("driverLoading"));
      highlightsEl.replaceChildren();
      actionEl.hidden = true;
      return true;
    }

    const profile = state.profile;
    if (state.loading) {
      renderPortrait(null, null);
      renderProfileTitle(state.title);
      titleEl.textContent = state.driver || "-";
      replaceWithTextState(statsEl, "loading", translate("driverLoading"));
      highlightsEl.replaceChildren();
    } else if (!profile || state.error) {
      renderPortrait(null, null);
      renderProfileTitle(state.title);
      titleEl.textContent = state.driver || "-";
      replaceWithTextState(statsEl, "empty", translate("driverNoData"));
      highlightsEl.replaceChildren();
    } else {
      renderPortrait(profile, state.avatarUrl);
      renderProfileTitle(state.title);
      titleEl.innerHTML = buildHeroTitle(profile);
      actionRowEl.replaceChildren?.();
      const findTitlePart = selector => typeof titleEl.querySelector === "function" ? titleEl.querySelector(selector) : null;
      [findTitlePart(".driver-hero-meta-row"), findTitlePart(".driver-race-number-pill"), actionEl, findTitlePart(".driver-title-affiliations")].forEach(element => element && actionRowEl.append?.(element));
      statsEl.innerHTML = buildStatsMarkup(profile);
      highlightsEl.innerHTML = buildHighlightsMarkup(profile);
      bindStats(statsEl, profile);
    }

    if (state.href) { actionEl.href = state.href; actionEl.hidden = false; }
    else actionEl.hidden = true;
    return true;
  }

  return Object.freeze({ render });
}

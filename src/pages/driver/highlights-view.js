export function renderDriverHighlights(profile, {
  getSafetyInfo, findSafetySource, renderRecentForm, renderSafetyBadge, translate, escapeHtml,
}) {
  const dependencies = [getSafetyInfo, findSafetySource, renderRecentForm, renderSafetyBadge, translate, escapeHtml];
  if (dependencies.some(dependency => typeof dependency !== "function")) {
    throw new TypeError("Driver highlights require complete rendering dependencies");
  }
  if (!profile) return "";
  const summary = profile.summary || {};
  const safetySource = getSafetyInfo(profile) ? profile : findSafetySource(profile.public_id, profile.player_id);
  return `
    <div class="driver-highlight-card">
      <div class="driver-highlight-label">${escapeHtml(translate("driverRecentForm"))}</div>
      <div class="driver-highlight-value">${renderRecentForm(profile.recent_form)}</div>
    </div>
    <div class="driver-highlight-card">
      <div class="driver-highlight-label">${escapeHtml(translate("driverSummaryFastestLaps"))}</div>
      <div class="driver-highlight-value">${escapeHtml(summary.fastest_lap_awards ?? 0)}</div>
    </div>
    <div class="driver-highlight-card">
      <div class="driver-highlight-label">${escapeHtml(translate("safetyRatingTitle"))}</div>
      <div class="driver-highlight-value">${renderSafetyBadge(safetySource) || `<span class="empty-inline">-</span>`}</div>
    </div>
  `;
}

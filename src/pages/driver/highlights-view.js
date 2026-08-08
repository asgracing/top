export function renderDriverHighlights(profile, { getSafetyInfo, findSafetySource, renderRecentForm, renderSafetyBadge, renderStrikes, translate, escapeHtml }) {
  const dependencies = [getSafetyInfo, findSafetySource, renderRecentForm, renderSafetyBadge, renderStrikes, translate, escapeHtml];
  if (dependencies.some(fn => typeof fn !== "function")) throw new TypeError("Missing driver dependencies");
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
    <div class="driver-highlight-card"><div class="driver-highlight-label">${escapeHtml(translate("safetyRatingTitle"))}</div>
      <div class="driver-highlight-value driver-safety-strikes-row"><span class="driver-safety-badge-slot">${renderSafetyBadge(safetySource) || `<span class="empty-inline">-</span>`}</span>${renderStrikes(profile)}</div></div>
  `;
}

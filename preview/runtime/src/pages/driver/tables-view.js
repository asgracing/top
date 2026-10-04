function requireDependencies(dependencies, names) {
  if (!dependencies || names.some(name => typeof dependencies[name] !== "function")) {
    throw new TypeError("Driver table view requires complete rendering dependencies");
  }
}

export function renderDriverRaceTableMarkup(rows, fastestLapMs, dependencies) {
  const names = ["escapeHtml", "escapeAttribute", "formatDateTimeLocal", "humanizeTrackName", "formatStartPosition", "renderStatValueWithTrend", "renderPositionsDelta", "getBestLapClass", "renderCarLink", "renderEloDeltaCell", "renderSafetyRaceCell", "translate"];
  requireDependencies(dependencies, names);
  const { escapeHtml, escapeAttribute, formatDateTimeLocal, humanizeTrackName, formatStartPosition, renderStatValueWithTrend, renderPositionsDelta, getBestLapClass, renderCarLink, renderEloDeltaCell, renderSafetyRaceCell, translate } = dependencies;
  return (Array.isArray(rows) ? rows : []).map(row => `
    <tr
      class="is-interactive-row"
      data-race-id="${escapeAttribute(row.race_id || "")}"
      tabindex="0"
      role="button"
      aria-label="${escapeAttribute(`${translate("openRaceDetailsLabel")}: ${humanizeTrackName(row.track)}`)}"
    >
      <td>${escapeHtml(formatDateTimeLocal(row.finished_at))}</td>
      <td>${escapeHtml(humanizeTrackName(row.track))}</td>
      <td>${escapeHtml(formatStartPosition(row))}</td>
      <td>${renderStatValueWithTrend(escapeHtml(row.position ?? "-"), row.rank_change, "championship_rank")}</td>
      <td>${renderPositionsDelta(row.positions_delta)}</td>
      <td>${escapeHtml(row.points ?? 0)}</td>
      <td><span class="${getBestLapClass(row.best_lap_ms === fastestLapMs)}">${escapeHtml(row.best_lap ?? "-")}</span></td>
      <td>
        <div>${renderCarLink(row.car_name ?? "-", "driver-link driver-link-subtle")}</div>
        <div class="race-note">${row.counted_for_stats === false ? escapeHtml(translate("notCountedBadge")) : ""}</div>
      </td>
      <td>${escapeHtml(row.gap ?? "-")}</td>
      <td>${renderEloDeltaCell(row)}</td>
      <td>${renderSafetyRaceCell(row)}</td>
    </tr>
  `).join("");
}

export function renderDriverTrackTableMarkup(rows, dependencies) {
  requireDependencies(dependencies, ["escapeHtml", "humanizeTrackName"]);
  const { escapeHtml, humanizeTrackName } = dependencies;
  return (Array.isArray(rows) ? rows : []).map(row => `
    <tr>
      <td>${escapeHtml(humanizeTrackName(row.track))}</td>
      <td>${escapeHtml(row.races ?? 0)}</td>
      <td>${escapeHtml(row.wins ?? 0)}</td>
      <td>${escapeHtml(row.podiums ?? 0)}</td>
      <td>${escapeHtml(row.points ?? 0)}</td>
      <td>${escapeHtml(row.average_finish ?? "-")}</td>
      <td>${escapeHtml(row.best_lap ?? "-")}</td>
    </tr>
  `).join("");
}

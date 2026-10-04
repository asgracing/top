export function createCarsTableView({
  documentRef, columns, translate, escapeHtml, renderHeaders, bindHeaders,
  renderCarImage, renderCarLink, renderDriverLink, formatPercent,
  formatAverageFinish, getBestLapClass, replaceWithTextState, setLoadingMarkup
}) {
  const dependencies = [translate, escapeHtml, renderHeaders, bindHeaders, renderCarImage,
    renderCarLink, renderDriverLink, formatPercent, formatAverageFinish, getBestLapClass,
    replaceWithTextState, setLoadingMarkup];
  if (!documentRef || !Array.isArray(columns) || dependencies.some(dependency => typeof dependency !== "function")) {
    throw new TypeError("Cars table view requires complete rendering dependencies");
  }

  return Object.freeze({
    render({ rows = [], sortState, fastestLapMs = null, loading = false, onSort } = {}) {
      const table = documentRef.getElementById("cars-table");
      if (!table) return;
      if (loading) {
        setLoadingMarkup("cars-table", "loading");
        return;
      }
      const normalizedRows = Array.isArray(rows) ? rows : [];
      if (!normalizedRows.length) {
        replaceWithTextState(table, "empty", translate("emptyRaces"));
        return;
      }
      const headers = renderHeaders(columns, translate("carsCols"), sortState);
      const body = normalizedRows.map(row => `<tr>
        <td><span class="car-label-inline">${renderCarImage(row, { className: "car-thumb car-thumb-inline", alt: row.car_name || "" })}${renderCarLink(row.car_name || "—", "driver-link")}</span></td>
        <td>${escapeHtml(row.races ?? 0)}</td><td>${escapeHtml(row.wins ?? 0)}</td>
        <td>${escapeHtml(formatPercent(row.win_rate))}</td><td>${escapeHtml(row.podiums ?? 0)}</td>
        <td>${escapeHtml(row.unique_drivers ?? 0)}</td><td>${escapeHtml(formatAverageFinish(row.average_finish))}</td>
        <td>${escapeHtml(row.fastest_lap_awards ?? 0)}</td>
        <td><div class="${getBestLapClass(row.best_lap_ms === fastestLapMs)}">${escapeHtml(row.best_lap || "—")}</div>
        <div class="race-note">${renderDriverLink(row.best_lap_driver || "—", row.best_lap_public_id, "driver-link driver-link-subtle")}</div></td>
      </tr>`).join("");
      table.innerHTML = `<table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>`;
      if (typeof onSort === "function") bindHeaders("#cars-table th.sortable", sortState, onSort);
    }
  });
}

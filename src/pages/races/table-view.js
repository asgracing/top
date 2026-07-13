export function createRacesTableView({
  documentRef, translate, escapeHtml, formatDateTime, humanizeTrack,
  renderDriverLink, bindInteractiveRows, renderPagination, replaceWithTextState
}) {
  const dependencies = [translate, escapeHtml, formatDateTime, humanizeTrack, renderDriverLink,
    bindInteractiveRows, renderPagination, replaceWithTextState];
  if (!documentRef || dependencies.some(dependency => typeof dependency !== "function")) {
    throw new TypeError("Races table view requires complete rendering dependencies");
  }
  return Object.freeze({
    render(result, { locale = "en", onOpen, onPage } = {}) {
      const table = documentRef.getElementById("races-table");
      const wrap = documentRef.getElementById("races-pagination-wrap");
      if (!table || !wrap || !result) return;
      if (!result.totalItems) {
        replaceWithTextState(table, "empty", translate("emptyRaces"));
        wrap.style.display = "none";
        return;
      }
      const headers = translate("racesCols").map(label => `<th>${escapeHtml(label)}</th>`).join("");
      const rows = result.items.map((race, index) => `<tr class="is-interactive-row" data-race-index="${escapeHtml(index)}" tabindex="0" role="button" aria-label="${escapeHtml(`${translate("openRaceDetailsLabel")}: ${humanizeTrack(race.track)}`)}">
        <td>${escapeHtml(formatDateTime(race.finished_at, locale))}</td>
        <td><div class="race-track-cell"><span class="race-track-name">${escapeHtml(humanizeTrack(race.track))}</span></div></td>
        <td><span class="race-winner">${renderDriverLink(race.winner || translate("noWinner"), race.winner_public_id, "driver-link")}</span></td>
        <td>${escapeHtml(race.participants_count ?? "-")}</td><td>${escapeHtml(race.average_elo ?? "-")}</td>
        <td><div>${escapeHtml(race.best_lap || "-")}</div><div class="race-note">${renderDriverLink(race.best_lap_driver || "-", race.best_lap_public_id, "driver-link driver-link-subtle")}</div></td>
      </tr>`).join("");
      table.innerHTML = `<table class="races-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
      if (typeof onOpen === "function") bindInteractiveRows(table, "tbody tr[data-race-index]", row => onOpen(result.items[Number(row.dataset.raceIndex)] || null, row));
      renderPagination("races-pagination", "races-pagination-info", "races-pagination-wrap", result.page, result.totalPages,
        result.totalItems, result.startIndex, result.endIndex, page => onPage?.(page, table));
    }
  });
}

export const HOME_TABLE_VIEW_STATES = Object.freeze([
  { tableId: "leaderboard-table", paginationId: "leaderboard-pagination-wrap", loadingKey: "loadingLeaderboard", errorKey: "errorLeaderboard" },
  { tableId: "bestlaps-table", paginationId: "bestlaps-pagination-wrap", loadingKey: "loadingBestLaps", errorKey: "errorBestlaps" },
  { tableId: "safety-table", paginationId: "safety-pagination-wrap", loadingKey: "loadingSafety", errorKey: "errorLoading" }
]);

export const HOME_LOADING_TEXT_IDS = Object.freeze([
  "drivers-count", "servers-online-count", "serverPlayersValue", "best-lap-highlight", "best-lap-note",
  "hourly-track-value", "hourly-starts-value", "hourly-votes-summary", "hero-hourly-winner-name", "hero-hourly-winner-meta"
]);

export function applyHomeTableViewState({ documentRef, state, translate, setLoadingMarkup, replaceWithTextState }) {
  HOME_TABLE_VIEW_STATES.forEach(config => {
    const pagination = documentRef.getElementById(config.paginationId);
    if (state === "loading") setLoadingMarkup(config.tableId, config.loadingKey);
    else {
      const table = documentRef.getElementById(config.tableId);
      if (table) replaceWithTextState(table, "error", translate(config.errorKey));
    }
    if (pagination) pagination.style.display = "none";
  });
}

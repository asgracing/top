export function createBansPageView({
  documentRef,
  translate,
  escapeHtml,
  formatDateTime,
  replaceWithTextState,
  setLoadingMarkup
}) {
  if (!documentRef || typeof translate !== "function" || typeof escapeHtml !== "function"
    || typeof formatDateTime !== "function" || typeof replaceWithTextState !== "function"
    || typeof setLoadingMarkup !== "function") {
    throw new TypeError("Bans page view requires complete rendering dependencies");
  }

  function renderSummary(data, locale) {
    const totalEl = documentRef.getElementById("bans-total-count");
    const latestEl = documentRef.getElementById("bans-latest-date");
    if (totalEl) totalEl.textContent = String(data.length);
    if (latestEl) latestEl.textContent = data[0]?.banned_at
      ? formatDateTime(data[0].banned_at, locale)
      : "—";
  }

  function renderTable(data, locale) {
    const tableEl = documentRef.getElementById("bans-table");
    if (!tableEl) return;
    if (!data.length) {
      replaceWithTextState(tableEl, "empty", translate("bansEmpty"));
      return;
    }
    const headers = translate("bansCols").map(label => `<th>${escapeHtml(label)}</th>`).join("");
    const rows = data.map(item => `
      <tr>
        <td>${escapeHtml(item.name || "—")}</td>
        <td>${escapeHtml(item.banned_at ? formatDateTime(item.banned_at, locale) : "—")}</td>
      </tr>
    `).join("");
    tableEl.innerHTML = `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  return Object.freeze({
    render({ data = [], locale = "en", loading = false } = {}) {
      if (loading) {
        setLoadingMarkup("bans-table", "loading");
        return;
      }
      const normalizedData = Array.isArray(data) ? data : [];
      renderSummary(normalizedData, locale);
      renderTable(normalizedData, locale);
    }
  });
}

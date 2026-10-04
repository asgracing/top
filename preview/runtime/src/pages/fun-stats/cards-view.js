function requireDependencies({ escapeHtml, translate }) {
  if (typeof escapeHtml !== "function" || typeof translate !== "function") {
    throw new TypeError("Fun Stats cards require escaping and translation dependencies");
  }
}

export function renderFunStatsAwardCard({ labelKey, titleMarkup, note, accent = "default" }, dependencies) {
  requireDependencies(dependencies);
  const { escapeHtml, translate } = dependencies;
  return `
    <article class="fun-award-card fun-award-card-${escapeHtml(accent)}">
      <div class="fun-award-label">${escapeHtml(translate(labelKey))}</div>
      <div class="fun-award-title">${titleMarkup}</div>
      <div class="fun-award-note">${escapeHtml(note)}</div>
    </article>
  `;
}

export function renderFunStatsSummaryCard({ labelMarkup, valueMarkup, note = "", extraClass = "" }, dependencies) {
  requireDependencies(dependencies);
  const { escapeHtml } = dependencies;
  return `
    <article class="fun-summary-card ${escapeHtml(extraClass)}">
      <div class="fun-summary-label">${labelMarkup}</div>
      <div class="fun-summary-value">${valueMarkup}</div>
      ${note ? `<div class="fun-summary-note">${escapeHtml(note)}</div>` : ""}
    </article>
  `;
}

export function renderFunStatsListCard({ titleKey, items = [], valueFormatter }, dependencies) {
  requireDependencies(dependencies);
  if (typeof valueFormatter !== "function") throw new TypeError("Fun Stats list requires a value formatter");
  const { escapeHtml, translate } = dependencies;
  const listMarkup = items.length
    ? items.map((item, index) => `
        <li class="fun-list-item">
          <span class="fun-list-rank">#${index + 1}</span>
          <span class="fun-list-main">${item.label}</span>
          <span class="fun-list-side">${escapeHtml(valueFormatter(item))}</span>
        </li>
      `).join("")
    : `<li class="fun-list-item fun-list-item-empty">${escapeHtml(translate("funStatsEmpty"))}</li>`;
  return `
    <article class="fun-list-card">
      <div class="fun-list-title">${escapeHtml(translate(titleKey))}</div>
      <ul class="fun-list">${listMarkup}</ul>
    </article>
  `;
}

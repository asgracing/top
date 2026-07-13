export function renderDriverPenaltyList(entries, { escapeHtml }) {
  if (typeof escapeHtml !== "function") throw new TypeError("Driver penalty list requires an escaping dependency");
  const items = Object.entries(entries || {}).sort((a, b) => Number(b[1]) - Number(a[1]));
  if (!items.length) return `<div class="empty-box">-</div>`;
  return items.map(([name, value]) => `
    <div class="penalty-item">
      <span class="penalty-name">${escapeHtml(name)}</span>
      <span class="penalty-value">${escapeHtml(value)}</span>
    </div>
  `).join("");
}

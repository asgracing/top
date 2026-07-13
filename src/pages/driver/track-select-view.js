export function renderDriverTrackSelect({
  items,
  selectedTrackCode,
  selectionKey,
  dataAttribute,
  label,
  escapeHtml,
  escapeAttribute,
  formatTrackName,
}) {
  if (!Array.isArray(items) || items.length <= 1) return "";
  if (typeof escapeHtml !== "function" || typeof escapeAttribute !== "function" || typeof formatTrackName !== "function") {
    throw new TypeError("Driver track select requires escaping and track formatting dependencies");
  }
  const attributeName = String(dataAttribute || "").trim();
  if (!/^data-[a-z0-9-]+$/.test(attributeName)) throw new TypeError("Driver track select requires a safe data attribute");

  const options = items.map(item => `
    <option value="${escapeAttribute(item.track_code)}" ${item.track_code === selectedTrackCode ? "selected" : ""}>${escapeHtml(formatTrackName(item.track_code))}</option>
  `).join("");
  return `
    <select class="driver-stat-track-select" ${attributeName}="${escapeAttribute(selectionKey)}" title="${escapeAttribute(label)}" aria-label="${escapeAttribute(label)}">
      ${options}
    </select>
  `;
}

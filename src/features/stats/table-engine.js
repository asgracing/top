const escapeClass = value => String(value || "").replace(/[^a-zA-Z0-9_-]/g, "");

export function renderTableShell({ className = "", columns = [], headerHtml = "", rowsHtml = "" } = {}) {
  const classes = ["stats-table", escapeClass(className)].filter(Boolean).join(" ");
  const colgroup = columns.length ? `<colgroup>${columns.map(column => `<col class="${escapeClass(column.className)}">`).join("")}</colgroup>` : "";
  return `<table class="${classes}">${colgroup}<thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

export function renderTableState({ kind, message }) {
  const safeKind = ["loading", "empty", "error"].includes(kind) ? kind : "empty";
  return `<div class="${safeKind === "loading" ? "loading" : "empty-box"}" data-table-state="${safeKind}">${String(message ?? "-")}</div>`;
}

export function createTableDefinition({ name, columns }) {
  if (!name || !Array.isArray(columns) || !columns.length) throw new TypeError("Table definition requires a name and columns");
  const keys = new Set();
  for (const column of columns) {
    if (!column?.key || keys.has(column.key)) throw new TypeError(`Invalid or duplicate column key: ${column?.key || ""}`);
    keys.add(column.key);
  }
  return Object.freeze({ name, columns: Object.freeze(columns.map(column => Object.freeze({ ...column }))) });
}

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

export function renderSortableHeaders({ columns, labels = [], sortState = {}, escapeText = String }) {
  return columns.map((column, index) => {
    const sortable = column.sortable !== false;
    const active = sortable && sortState.key === column.key;
    const directionClass = active && sortState.direction ? `sort-${sortState.direction}` : "";
    const ariaSort = active ? (sortState.direction === "asc" ? "ascending" : "descending") : "none";
    const classes = [escapeClass(column.className), escapeClass(column.align ? `cell-${column.align}` : ""), sortable ? "sortable" : "", directionClass].filter(Boolean).join(" ");
    const attributes = sortable ? ` data-sort-key="${escapeText(column.key)}" tabindex="0" role="button" aria-sort="${ariaSort}"` : "";
    return `<th class="${classes}"${attributes}>${escapeText(labels[index] ?? column.label ?? column.key)}</th>`;
  }).join("");
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

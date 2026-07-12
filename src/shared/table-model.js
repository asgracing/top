export function normalizeTableText(value, locale = "en") {
  return String(value ?? "").trim().toLocaleLowerCase(locale === "ru" ? "ru" : "en");
}

export function parseTableNumber(value) {
  if (value === null || value === undefined || value === "" || value === "-") return Number.POSITIVE_INFINITY;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : Number.POSITIVE_INFINITY;
}

export function parseTableLapTime(value) {
  if (!value || value === "-") return Number.POSITIVE_INFINITY;
  const parts = String(value).trim().split(":");
  if (parts.length !== 2 && parts.length !== 3) return Number.POSITIVE_INFINITY;
  const hours = parts.length === 3 ? Number(parts[0]) : 0;
  const minutes = Number(parts[parts.length - 2]);
  const [secondsValue, millisValue = "0"] = parts.at(-1).split(".");
  const seconds = Number(secondsValue);
  const millis = Number(millisValue);
  return [hours, minutes, seconds, millis].every(Number.isFinite)
    ? hours * 3600000 + minutes * 60000 + seconds * 1000 + millis
    : Number.POSITIVE_INFINITY;
}

export function getNestedTableValue(row, key) {
  if (!key.includes(".")) return row?.[key];
  return key.split(".").reduce((value, part) => value?.[part], row);
}

export function sortTableRows(rows, sortState, columns, { locale = "en", getEloValue = () => null } = {}) {
  const source = Array.isArray(rows) ? rows : [];
  if (!sortState?.key || !sortState?.direction) return [...source];
  const column = columns.find(item => item.key === sortState.key);
  if (!column) return [...source];
  const direction = sortState.direction;
  const comparable = row => {
    if (column.key === "elo") return getEloValue(row);
    const value = getNestedTableValue(row, column.key);
    if (column.type === "number") return parseTableNumber(value);
    if (column.type === "time") return parseTableLapTime(value);
    return normalizeTableText(value, locale);
  };
  return [...source].sort((a, b) => {
    const av = comparable(a);
    const bv = comparable(b);
    const aMissingElo = column.key === "elo" && !Number.isFinite(av);
    const bMissingElo = column.key === "elo" && !Number.isFinite(bv);
    if (aMissingElo !== bMissingElo) return aMissingElo ? 1 : -1;
    if (av < bv) return direction === "asc" ? -1 : 1;
    if (av > bv) return direction === "asc" ? 1 : -1;
    const rankDifference = parseTableNumber(a?.rank) - parseTableNumber(b?.rank);
    return Number.isFinite(rankDifference) ? rankDifference : 0;
  });
}

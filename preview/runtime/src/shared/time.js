export const ASG_TIME_ZONE = "Europe/Moscow";
const LEGACY_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseAsgTimestamp(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const normalized = LEGACY_ISO_PATTERN.test(text) || DATE_ONLY_PATTERN.test(text)
    ? `${text.replace(" ", "T")}${DATE_ONLY_PATTERN.test(text) ? "T00:00:00" : ""}+03:00`
    : text;
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatMoscowDateTime(value, locale = "en-GB", options = {}) {
  const date = parseAsgTimestamp(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", timeZone: ASG_TIME_ZONE,
    ...options
  }).format(date);
}

export function formatMoscowDate(value, locale = "en-GB", options = {}) {
  const date = parseAsgTimestamp(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric", month: "short", timeZone: ASG_TIME_ZONE, ...options
  }).format(date);
}

export function moscowDateParts(value) {
  const date = parseAsgTimestamp(value);
  if (!date) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
    hourCycle: "h23", timeZone: ASG_TIME_ZONE
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { year: values.year, month: values.month, day: values.day, hour: values.hour };
}

export function moscowDateKey(value) {
  const parts = moscowDateParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : null;
}

export function moscowHourKey(value) {
  return moscowDateParts(value)?.hour ?? null;
}

export function moscowDayStart(value) {
  const key = moscowDateKey(value);
  return key ? new Date(`${key}T00:00:00+03:00`) : null;
}

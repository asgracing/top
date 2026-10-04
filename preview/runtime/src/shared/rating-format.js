export function formatRatingMetric(value, maximumFractionDigits = 0) {
  const numeric = value === null || value === undefined || value === "" ? NaN : Number(value);
  if (!Number.isFinite(numeric)) return "—";
  const digits = Math.max(0, Math.min(6, Math.trunc(Number(maximumFractionDigits) || 0)));
  const formatted = digits
    ? numeric.toFixed(digits).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")
    : numeric.toFixed(0);
  return formatted === "-0" ? "0" : formatted;
}

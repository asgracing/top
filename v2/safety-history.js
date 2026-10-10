const numeric = value => value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const first = (...values) => values.map(numeric).find(value => value !== null) ?? null;

// History records belong to the rating ledger. Race details can be generated
// later with different telemetry, so they must not replace ledger components.
export function safetyHistoryComponents(history, details = null) {
  const incidents = first(history.incident_penalty_delta, history.safety_incident_penalty_delta);
  const clean = first(history.base_delta, history.safety_base_delta);
  const penalties = first(history.penalty_delta, history.safety_penalty_delta);
  const comparisons = [
    [first(history.new_sr, history.safety_rating), numeric(details?.rating)],
    [first(history.delta_sr, history.safety_delta), numeric(details?.delta)],
    [incidents, numeric(details?.incidents)],
    [clean, numeric(details?.clean)],
    [penalties, numeric(details?.penalties)]
  ];
  const stale = comparisons.some(([ledger, protocol]) => ledger !== null && protocol !== null && Math.abs(ledger - protocol) > .00001);
  const matching = stale ? null : details;
  return {
    clean: first(clean, matching?.clean),
    incidents: first(incidents, matching?.incidents),
    penalties: first(penalties, matching?.penalties),
    stale
  };
}

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const MAX_PILOT_INDEX_SIZE = 50_000;

function text(value, maximum) {
  const result = typeof value === "string" ? value.normalize("NFKC").trim() : "";
  return result && result.length <= maximum && !/\p{C}/u.test(result) ? result : "";
}

export function normalizePilotIndex(value) {
  if (!Array.isArray(value) || value.length > MAX_PILOT_INDEX_SIZE) throw new TypeError("invalid_pilot_index");
  const seen = new Set();
  const pilots = [];
  for (const row of value) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const publicId = text(row.public_id, 160);
    const displayName = text(row.driver, 160);
    if (!ID_PATTERN.test(publicId) || !displayName || seen.has(publicId)) continue;
    seen.add(publicId);
    pilots.push(Object.freeze({ publicId, displayName }));
  }
  return Object.freeze(pilots);
}

export function searchPilots(pilots, query, { excludedPublicIds = [], deferredPublicIds = [] } = {}) {
  const needle = text(query, 80).toLocaleLowerCase();
  if (needle.length < 2) return [];
  const excluded = new Set(excludedPublicIds);
  const deferred = new Set(deferredPublicIds);
  const matches = pilots.filter(pilot => !excluded.has(pilot.publicId) && (
    pilot.displayName.toLocaleLowerCase().includes(needle)
    || pilot.publicId.toLocaleLowerCase().includes(needle)
  ));
  if (!deferred.size) return matches;
  return [
    ...matches.filter(pilot => !deferred.has(pilot.publicId)),
    ...matches.filter(pilot => deferred.has(pilot.publicId))
  ];
}

export function filterPilots(pilots, query, options = {}) {
  const limit = Math.max(1, Math.min(200, Number(options.limit) || 50));
  return searchPilots(pilots, query, options).slice(0, limit);
}

export async function loadPilotIndex({ client, dataBaseUrl }) {
  const base = `${String(dataBaseUrl || "").replace(/\/+$/, "")}/`;
  const value = await client.requestJson(new URL("v2/drivers/drivers.json", base), {
    retries: 1,
    cache: "no-store",
    timeoutMs: 60_000
  });
  return normalizePilotIndex(value);
}

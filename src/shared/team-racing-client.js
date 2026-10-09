export const isTeamRace = event => event?.participation_mode === "team";

export function teamRegistrationOpen(event, now = Date.now()) {
  const cutoff = Date.parse(event?.closes_at || event?.registration_closes_at || "");
  return isTeamRace(event) && Number.isFinite(cutoff) && now < cutoff && event.registration_closed !== true;
}

export function teamRaceUrl(event, language = "ru") {
  return `/hourly/team/?event=${encodeURIComponent(event?.occurrence_id || event?.event_id || "")}&lang=${language === "en" ? "en" : "ru"}`;
}

export function createTeamRacingClient({ fetchImpl = globalThis.fetch, base = "https://auth.asgracing.ru" } = {}) {
  async function request(path, options = {}) {
    const res = await fetchImpl(base + path, {credentials:"include", cache:"no-store", ...options,
      headers:{Accept:"application/json", ...options.headers}});
    const body = await res.json();
    if (!res.ok) throw Object.assign(new Error(typeof body.detail === "string" ? body.detail : "unavailable"), {httpStatus:res.status});
    return body;
  }
  return {
    state: () => request("/v1/team-racing/events"),
    me: () => request("/v1/me"),
    command: (commandId) => request(`/v1/team-racing/commands/${encodeURIComponent(commandId)}`),
    mutate: (action, payload, version, csrf, idempotencyKey) => request("/v1/team-racing/commands", {
      method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({ action, payload, expected_version: version, idempotency_key: idempotencyKey })
    })
  };
}

// The server remains authoritative; these checks explain errors before queuing.
export const activeRegistrations = event => (event?.registrations || []).filter(row => row.status !== 'withdrawn');
export function entryDraft(team, registration, actor) {
  return { car_model: registration?.car_model ?? null, captain_public_id: registration?.captain_public_id || actor,
    roster: registration ? registration.roster.map(p => p.public_id) : [actor].filter(id => team.members.some(p => p.public_id === id)), version: registration?.version ?? null };
}
export function validateEntry(event, team, draft, actor, registration) {
  const roster = draft.roster;
  if (!roster.length || roster.length > event.max_drivers || new Set(roster).size !== roster.length) return 'invalid_roster';
  if (!registration && !roster.includes(actor)) return 'creator_not_in_roster';
  if (!roster.includes(draft.captain_public_id)) return 'captain_not_in_roster';
  const members = roster.map(id => team.members.find(p => p.public_id === id));
  if (members.some(p => !p)) return 'not_team_member';
  if (members.some(p => p.eligible !== true)) return 'driver_not_eligible';
  if (!Number.isInteger(draft.car_model) || !event.allowed_car_models.includes(draft.car_model)) return 'car_not_allowed';
  const captain = members.find(p => p.public_id === draft.captain_public_id);
  if (!Number.isInteger(captain.race_number) || captain.race_number < 1 || captain.race_number > 998) return 'captain_number_unavailable';
  const others = activeRegistrations(event).filter(row => row.team_id !== team.team_id);
  if (others.some(row => row.roster.some(p => roster.includes(p.public_id)))) return 'pilot_already_registered';
  if (others.some(row => row.race_number === captain.race_number)) return 'race_number_conflict';
  if (Number.isFinite(event.max_cars) && others.length >= event.max_cars) return 'grid_full';
  if (Number.isFinite(event.max_connections) && others.reduce((sum, row) => sum + row.roster.length, 0) + roster.length > event.max_connections) return 'team_connection_capacity_exceeded';
  return null;
}
export function entryChanged(draft, registration) {
  return !registration || draft.car_model !== registration.car_model || draft.captain_public_id !== registration.captain_public_id || draft.roster.length !== registration.roster.length || registration.roster.some(p => !draft.roster.includes(p.public_id));
}

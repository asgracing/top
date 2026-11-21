// Published race results for the V2 profile workspace. No entitlement or owner claims.
export const TRACKS = Object.freeze({ monza: 'Monza', suzuka: 'Suzuka', barcelona: 'Barcelona', nurburgring_24h: 'Nürburgring 24h', nurburgring: 'Nürburgring', spa: 'Spa-Francorchamps', imola: 'Imola', zolder: 'Zolder', silverstone: 'Silverstone' });
export const raceKey = race => `${race.source}:${race.id}`;
export const finite = value => typeof value === 'number' && Number.isFinite(value);
export const positive = value => finite(value) && value > 0;
export function lapTime(ms) {
  if (!positive(ms)) return '—';
  const rounded = Math.round(ms);
  return `${Math.floor(rounded / 60000)}:${String(Math.floor(rounded % 60000 / 1000)).padStart(2, '0')}.${String(rounded % 1000).padStart(3, '0')}`;
}
export function quantile(values, q) {
  const ordered = values.filter(finite).sort((a, b) => a - b);
  if (!ordered.length) return null;
  const position = (ordered.length - 1) * q;
  const low = Math.floor(position), high = Math.ceil(position);
  return ordered[low] + (ordered[high] - ordered[low]) * (position - low);
}
export function validateBundle(bundle) {
  if (!/^drv_[a-z0-9]+$/i.test(bundle?.profile?.public_id || '') || !Array.isArray(bundle.races) || !Number.isFinite(Date.parse(bundle.source?.read_at))) throw new Error('Invalid profile source');
  if (bundle.source.counted_races !== bundle.races.length) throw new Error('Incomplete history');
  if (new Set(bundle.races.map(raceKey)).size !== bundle.races.length) throw new Error('Duplicate race identity');
  if (bundle.races.some(race => !/^[a-z0-9_-]{1,160}$/i.test(race.id) || !Number.isFinite(Date.parse(race.date)))) throw new Error('Invalid race identity/date');
  const fields = ['start','finish','positions','points','bestLapMs','eloBefore','eloAfter','eloDelta','srBefore','srAfter','srDelta','laps','invalid'];
  if (bundle.races.some(race => !/^[a-z0-9_-]+$/.test(race.source) || typeof race.car !== 'string' || typeof race.track !== 'string' || fields.some(field => race[field] != null && !finite(race[field])))) throw new Error('Invalid race value');
  return bundle;
}
export function initialShowcase(races) {
  const latestWin = races.find(race => race.finish === 1) || races[0];
  const comeback = [...races].filter(race => finite(race.positions)).sort((a, b) => b.positions - a.positions)[0];
  const endurance = races.find(race => race.track === 'nurburgring_24h' && race.finish === 1) || races.find(race => race.track !== latestWin?.track);
  return [...new Set([latestWin, comeback, endurance].filter(Boolean).map(raceKey))].slice(0, 3);
}
export function readPreferences(storage, profileId, races) {
  const fallback = { cover: 'track', pins: initialShowcase(races), target: '1:46.000' };
  try {
    const raw = JSON.parse(storage.getItem(`asg-profile-workspace:v1:${profileId}`));
    if (!raw || typeof raw !== 'object') return fallback;
    const allowed = new Set(races.map(raceKey));
    return { cover: ['track', 'carbon', 'night', 'gold'].includes(raw.cover) ? raw.cover : fallback.cover,
      pins: Array.isArray(raw.pins) ? [...new Set(raw.pins.filter(key => allowed.has(key)))].slice(0, 3) : fallback.pins,
      target: typeof raw.target === 'string' && /^\d{1,2}:[0-5]\d\.\d{3}$/.test(raw.target) ? raw.target : fallback.target };
  } catch { return fallback; }
}
export function writePreferences(storage, profileId, value) {
  try { storage.setItem(`asg-profile-workspace:v1:${profileId}`, JSON.stringify(value)); return true; }
  catch { return false; }
}
export function selectRaces(bundle, { track, car, days = 90 }) {
  const end = Date.parse(bundle.source.read_at), from = end - days * 86400000;
  return bundle.races.filter(race => race.track === track && race.car === car && Date.parse(race.date) >= from && Date.parse(race.date) <= end).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}
export function progressReport(races) {
  const timed = races.filter(race => positive(race.bestLapMs));
  const midpoint = Math.floor(timed.length / 2);
  const early = quantile(timed.slice(0, midpoint).map(race => race.bestLapMs), .5);
  const late = quantile(timed.slice(midpoint).map(race => race.bestLapMs), .5);
  const sr = races.filter(race => positive(race.laps) && finite(race.invalid) && race.invalid >= 0 && race.invalid <= race.laps);
  const laps = sr.reduce((sum, race) => sum + race.laps, 0), invalid = sr.reduce((sum, race) => sum + race.invalid, 0);
  const elo = races.filter(race => finite(race.eloDelta));
  const values = timed.map(race => race.bestLapMs);
  return { races: races.length, timed, best: values.length ? Math.min(...values) : null,
    median: quantile(values, .5), spread: values.length >= 4 ? quantile(values, .75) - quantile(values, .25) : null,
    improvement: timed.length >= 6 ? early - late : null, early, late,
    wins: races.filter(race => race.finish === 1).length,
    podiums: races.filter(race => positive(race.finish) && race.finish <= 3).length,
    positions: races.filter(race => finite(race.positions)).reduce((sum, race) => sum + race.positions, 0),
    eloDelta: elo.length ? elo.reduce((sum, race) => sum + race.eloDelta, 0) : null, eloCoverage: elo.length,
    srCoverage: sr.length, validShare: laps ? (laps - invalid) / laps * 100 : null, laps, invalid };
}
export function parseTarget(value) {
  const match = /^(\d{1,2}):([0-5]\d)\.(\d{3})$/.exec(String(value).trim());
  if (!match) return null;
  const ms = Number(match[1]) * 60000 + Number(match[2]) * 1000 + Number(match[3]);
  return positive(ms) ? ms : null;
}
export function chartPoints(races, width = 760, height = 160) {
  const values = races.filter(race => positive(race.bestLapMs));
  if (!values.length) return [];
  const min = Math.min(...values.map(race => race.bestLapMs)), max = Math.max(...values.map(race => race.bestLapMs));
  const span = Math.max(max - min, 500);
  return values.map((race, index) => ({ ...race, x: values.length === 1 ? width / 2 : 22 + index / (values.length - 1) * (width - 44), y: 16 + (race.bestLapMs - min) / span * (height - 32) }));
}

// Reuse the full, revision-checked profile already loaded by the existing page.
// No network, fixture IDs or payment decisions belong in this adapter.
export function bundleFromProfile(profile, now = new Date().toISOString()) {
  const numeric = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
  const safety = new Map((profile?.safety_history || []).map(row => [row.race_id, row]));
  const rows = (profile?.race_history || []).filter(row => row.counted_for_stats !== false && row.race_id && Number.isFinite(Date.parse(row.finished_at)));
  const races = rows.map(row => {
    const sr = safety.get(row.race_id);
    return {id:String(row.race_id),source:String(row.source || 'legacy'),date:row.finished_at,
      track:String(row.track_code || row.track || ''),car:String(row.car_name || '—'),carId:numeric(row.car_model_id),
      start:numeric(row.start_position),finish:numeric(row.position),positions:numeric(row.positions_delta),points:numeric(row.points),
      bestLapMs:numeric(row.best_lap_ms),bestLap:row.best_lap,
      eloAfter:numeric(row.elo),eloBefore:numeric(row.elo) !== null && numeric(row.elo_rating_delta) !== null ? Number(row.elo)-Number(row.elo_rating_delta) : null,
      eloDelta:numeric(row.elo_rating_delta),srBefore:numeric(sr?.old_sr),srAfter:numeric(sr?.new_sr),srDelta:numeric(sr?.delta_sr),
      laps:numeric(sr?.completed_laps),invalid:numeric(sr?.invalid_laps),incidentStatus:sr?.incident_binding_status || null};
  }).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
  return validateBundle({profile:{...profile},races,source:{read_at:now,counted_races:races.length,
    revision:profile.leaderboard_rank?.revision ?? null,generated_at:profile.leaderboard_rank?.generated_at ?? null,
    profile_url:`https://asgracing.ru/driver/?id=${encodeURIComponent(profile.public_id)}`}});
}

export function getDriverProfileKey(profile) {
  return String(profile?.public_id || profile?.player_id || profile?.driver || "driver");
}

export function normalizeDriverBestLaps(profile, { formatLapTime }) {
  if (typeof formatLapTime !== "function") throw new TypeError("Driver best laps require a time formatter");
  const source = Array.isArray(profile?.best_laps_by_track)
    ? profile.best_laps_by_track
    : Array.isArray(profile?.bestlap_tracks) ? profile.bestlap_tracks : [];
  return source.map(item => {
    const trackCode = String(item?.track_code || item?.track || item?.best_lap_track || "").trim();
    if (!trackCode) return null;
    const lapMs = Number(item?.best_lap_ms || 0);
    const lapLabel = item?.best_lap || (lapMs > 0 ? formatLapTime(lapMs) : "");
    if (!lapLabel) return null;
    return {
      ...item,
      track_code: trackCode,
      best_lap: lapLabel,
      best_lap_ms: lapMs > 0 ? lapMs : null,
      car_name: item?.best_lap_car_name || item?.car_name || item?.car_name_raw || item?.best_lap_car_name_raw || ""
    };
  }).filter(Boolean);
}

export function selectDriverBestLap(profile, items, selections) {
  const normalizedItems = Array.isArray(items) ? items : [];
  if (!normalizedItems.length) return null;
  const selected = selections?.get?.(getDriverProfileKey(profile));
  return normalizedItems.find(item => item.track_code === selected) || normalizedItems[0];
}

export function normalizeDriverAveragePace(profile, { formatLapTime }) {
  if (typeof formatLapTime !== "function") throw new TypeError("Driver average pace requires a time formatter");
  const source = Array.isArray(profile?.average_pace_by_track)
    ? profile.average_pace_by_track
    : Array.isArray(profile?.average_pace_tracks) ? profile.average_pace_tracks : [];
  return source.map(item => {
    const trackCode = String(item?.track_code || item?.track || "").trim();
    if (!trackCode) return null;
    const paceMs = Number(item?.average_pace_ms || 0);
    const paceLabel = item?.average_pace || (paceMs > 0 ? formatLapTime(paceMs) : "");
    if (!paceLabel) return null;
    return { ...item, track_code: trackCode, average_pace: paceLabel, average_pace_ms: paceMs > 0 ? paceMs : null, sample_races: Number(item?.sample_races || 0) };
  }).filter(Boolean);
}

export function selectDriverAveragePace(profile, items, selections) {
  const normalizedItems = Array.isArray(items) ? items : [];
  if (!normalizedItems.length) return null;
  const selected = selections?.get?.(getDriverProfileKey(profile));
  return normalizedItems.find(item => item.track_code === selected) || normalizedItems[0];
}

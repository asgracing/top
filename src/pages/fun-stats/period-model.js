export function getLatestRaceDate(races = []) {
  const timestamps = (Array.isArray(races) ? races : [])
    .map(race => new Date(race?.finished_at || race?.date || "").getTime())
    .filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)) : null;
}

export function getFunStatsPeriodWindow(period, races = [], now = new Date()) {
  const days = period === "month" ? 30 : 7;
  const anchor = getLatestRaceDate(races) || now;
  const end = new Date(anchor);
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return Object.freeze({ start, end });
}

export function selectFunStatsPeriodRaces(period, races = [], now = new Date()) {
  const { start, end } = getFunStatsPeriodWindow(period, races, now);
  const startTime = start.getTime();
  const endTime = end.getTime();
  return (Array.isArray(races) ? races : [])
    .filter(race => {
      const time = new Date(race?.finished_at || race?.date || "").getTime();
      return Number.isFinite(time) && time >= startTime && time <= endTime;
    })
    .sort((a, b) => new Date(b?.finished_at || b?.date || 0).getTime() - new Date(a?.finished_at || a?.date || 0).getTime());
}

import { moscowDayStart, parseAsgTimestamp } from "../../shared/time.js";

export function getLatestRaceDate(races = []) {
  const timestamps = (Array.isArray(races) ? races : [])
    .map(race => parseAsgTimestamp(race?.finished_at || race?.date)?.getTime())
    .filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)) : null;
}

export function getFunStatsPeriodWindow(period, races = [], now = new Date()) {
  const days = period === "month" ? 30 : 7;
  const anchor = getLatestRaceDate(races) || now;
  const end = new Date(anchor);
  const start = moscowDayStart(anchor);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return Object.freeze({ start, end });
}

export function selectFunStatsPeriodRaces(period, races = [], now = new Date()) {
  const { start, end } = getFunStatsPeriodWindow(period, races, now);
  const startTime = start.getTime();
  const endTime = end.getTime();
  return (Array.isArray(races) ? races : [])
    .filter(race => {
      const time = parseAsgTimestamp(race?.finished_at || race?.date)?.getTime();
      return Number.isFinite(time) && time >= startTime && time <= endTime;
    })
    .sort((a, b) => (parseAsgTimestamp(b?.finished_at || b?.date)?.getTime() || 0)
      - (parseAsgTimestamp(a?.finished_at || a?.date)?.getTime() || 0));
}

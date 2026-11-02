const DAY = 86_400_000;
const key = date => date.toISOString().slice(0, 10);
const parsedDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && key(date) === value ? date : null;
};
const count = value => value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;

// Published dates already represent Moscow calendar days. UTC arithmetic keeps
// those date keys intact in every visitor's timezone, including DST boundaries.
function bounds(date, scale) {
  const start = new Date(date), end = new Date(date);
  if (scale === 'weeks') {
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
    end.setTime(start.getTime() + 6 * DAY);
  } else if (scale === 'months') {
    start.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
  }
  return { start: key(start), end: key(end), calendarDays: Math.round((end - start) / DAY) + 1 };
}

export function buildActivityHistory(rawDays = [], scale = 'days') {
  if (!['days', 'weeks', 'months'].includes(scale)) throw new Error('Unknown activity scale');
  const days = new Map();
  for (const day of rawDays) {
    if (parsedDate(day?.date)) days.set(day.date, { ...day, unique_players: count(day.unique_players) });
  }
  const dates = [...days.keys()].sort();
  if (!dates.length) return [];
  const groups = new Map(), end = parsedDate(dates.at(-1));
  for (let date = parsedDate(dates[0]); date <= end; date = new Date(date.getTime() + DAY)) {
    const period = bounds(date, scale);
    if (!groups.has(period.start)) groups.set(period.start, { ...period, key: period.start, days: [] });
    const day = days.get(key(date));
    if (day) groups.get(period.start).days.push(day);
  }
  return [...groups.values()].map(period => {
    const measured = period.days.filter(day => day.unique_players !== null);
    const maximum = measured.length ? Math.max(...measured.map(day => day.unique_players)) : null;
    return {
      ...period,
      average: measured.length ? measured.reduce((sum, day) => sum + day.unique_players, 0) / measured.length : null,
      maximum,
      peakDate: measured.find(day => day.unique_players === maximum)?.date || null,
      observedDays: measured.length,
      partial: measured.length < period.calendarDays,
      races: period.days.length ? period.days.reduce((sum, day) => sum + (count(day.races) || 0), 0) : null,
      latestDate: period.days.at(-1)?.date || period.end
    };
  });
}

export function activityPage(periods, page = 0, size = 14) {
  const maxPage = Math.max(0, Math.ceil(periods.length / size) - 1);
  page = Math.max(0, Math.min(maxPage, page));
  const end = periods.length - page * size;
  return { page, maxPage, periods: periods.slice(Math.max(0, end - size), end) };
}

export function activityPageForDate(periods, date, size = 14) {
  const index = periods.findIndex(period => period.start <= date && period.end >= date);
  return index < 0 ? 0 : Math.floor((periods.length - 1 - index) / size);
}

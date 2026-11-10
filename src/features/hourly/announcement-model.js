import { parseAsgTimestamp } from "../../shared/time.js";

const INACTIVE = new Set([
  "cancelled", "canceled", "disabled", "postponed", "completed",
  "finished", "archived", "failed", "missed", "unscheduled",
]);

function isSameEvent(left, right) {
  if (!left || !right) return false;
  const leftId = left.occurrence_id || left.event_id;
  const rightId = right.occurrence_id || right.event_id;
  if (leftId && rightId) return leftId === rightId;
  return Boolean(left.date && left.start_time_local
    && left.date === right.date && left.start_time_local === right.start_time_local);
}

function availableSlot(item, now) {
  if (!item?.date || !item.start_time_local || INACTIVE.has(String(item.status || "").toLowerCase())) {
    return null;
  }
  const start = parseAsgTimestamp(`${item.date}T${item.start_time_local}`);
  if (!start) return null;
  const opening = parseAsgTimestamp(item.launch_at || item.launch_at_local) || start;
  const window = Number(item.server_window_minutes);
  const race = Number(item.race_duration_minutes || 0);
  const qualifying = Number(item.qualifying_duration_minutes || 0);
  const end = Number.isFinite(window) && window > 0
    ? Math.max(opening.getTime() + window * 60000, start.getTime())
    : start.getTime() + (race + qualifying) * 60000;
  return Number.isFinite(end) && now <= end ? { item, opening: opening.getTime() } : null;
}

export function upcomingHourlySlots(schedule, now = Date.now()) {
  if (!Array.isArray(schedule?.items)) return [];
  return schedule.items.map(item => availableSlot(item, now)).filter(Boolean)
    .sort((left, right) => left.opening - right.opening)
    .map(({ item }) => item);
}

export function selectNextHourlyAnnouncement(announcement, schedule, now = Date.now()) {
  if (!Array.isArray(schedule?.items)) {
    return availableSlot(announcement, now)?.item ?? null;
  }
  const [item] = upcomingHourlySlots(schedule, now);
  if (!item) return null;
  return isSameEvent(item, announcement) ? { ...announcement, ...item } : item;
}

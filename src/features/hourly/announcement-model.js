function isSameEvent(left, right) {
  if (!left || !right) return false;
  if (left.event_id && right.event_id && left.event_id === right.event_id) return true;
  return left.date === right.date && left.start_time_local === right.start_time_local;
}

export function selectNextHourlyAnnouncement(announcement, schedule) {
  const items = Array.isArray(schedule?.items) ? schedule.items : [];
  if (!items.length) return announcement;

  const matchingItem = announcement
    ? items.find(item => isSameEvent(item, announcement))
    : null;
  const nextItem = matchingItem || items[0];

  return {
    ...(announcement || {}),
    ...nextItem,
  };
}

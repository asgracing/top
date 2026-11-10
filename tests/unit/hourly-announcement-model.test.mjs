import test from "node:test";
import assert from "node:assert/strict";
import { selectNextHourlyAnnouncement, upcomingHourlySlots } from "../../src/features/hourly/announcement-model.js";

const before = Date.parse("2026-11-10T18:45:00+03:00");
const slot = (day, track, extra = {}) => ({
  event_id: `hourly_2026-11-${day}_2000`,
  date: `2026-11-${day}`,
  start_time_local: "20:00",
  launch_at_local: `2026-11-${day} 19:00`,
  server_window_minutes: 180,
  track_name: track,
  status: "scheduled",
  ...extra,
});

test("skips expired rows even when one still matches the announcement", () => {
  const announcement = {
    ...slot("08", "Spa"),
    car_restriction: { mode: "single_model", car_model_id: 99 },
    weather: { name: "old event" },
  };
  const items = [slot("08", "Spa"), slot("09", "Laguna Seca"), slot("10", "Monza")];
  assert.deepEqual(selectNextHourlyAnnouncement(announcement, { items }, before), items[2]);
});

test("enriches a matching announcement with authoritative schedule fields", () => {
  const announcement = {
    ...slot("10", "Old track value"),
    title: "Hourly Race",
  };
  const schedule = { items: [slot("10", "Monza", { voting_disabled: false })] };
  const result = selectNextHourlyAnnouncement(announcement, schedule, before);
  assert.equal(result.track_name, "Monza");
  assert.equal(result.title, "Hourly Race");
  assert.equal(result.voting_disabled, false);
});

test("keeps today's active window before selecting tomorrow", () => {
  const current = slot("10", "Monza");
  const next = slot("11", "Nürburgring");
  const schedule = { items: [next, current] };
  assert.deepEqual(upcomingHourlySlots(schedule, Date.parse("2026-11-10T21:59:00+03:00")), [current, next]);
  assert.equal(selectNextHourlyAnnouncement(current, schedule, Date.parse("2026-11-10T22:01:00+03:00")), next);
});

test("ignores cancellation and postponement, and respects revised times and ID", () => {
  const cancelled = slot("10", "Monza", { status: "cancelled" });
  const postponed = slot("11", "Spa", { status: "postponed" });
  const replacement = slot("10", "Suzuka", {
    event_id: "endurance_2026-11-10_2100", start_time_local: "21:00", launch_at_local: "2026-11-10 20:00",
  });
  assert.equal(selectNextHourlyAnnouncement({ ...cancelled, title: "Old event" },
    { items: [postponed, cancelled, replacement] }, before), replacement);
});

test("uses a still-valid announcement only if the calendar is unavailable", () => {
  const announcement = slot("10", "Monza");
  assert.equal(selectNextHourlyAnnouncement(announcement, null, before), announcement);
  assert.equal(selectNextHourlyAnnouncement(slot("08", "Spa"), null, before), null);
  assert.equal(selectNextHourlyAnnouncement(announcement, { items: [] }, before), null);
});

import test from "node:test";
import assert from "node:assert/strict";
import { selectNextHourlyAnnouncement } from "../../src/features/hourly/announcement-model.js";

test("uses the first scheduled event when the announcement is stale", () => {
  const announcement = {
    event_id: "hourly_2026-08-27_2000",
    date: "2026-08-27",
    start_time_local: "20:00",
    track_name: "Monza",
    title: "Hourly Race",
  };
  const schedule = {
    items: [{
      event_id: "hourly_2026-08-28_2000",
      date: "2026-08-28",
      start_time_local: "20:00",
      track_name: "Suzuka",
    }],
  };

  assert.deepEqual(selectNextHourlyAnnouncement(announcement, schedule), {
    ...announcement,
    ...schedule.items[0],
  });
});

test("enriches a matching announcement with authoritative schedule fields", () => {
  const announcement = {
    event_id: "hourly_2026-08-28_2000",
    date: "2026-08-28",
    start_time_local: "20:00",
    track_name: "Old track value",
    title: "Hourly Race",
  };
  const schedule = {
    items: [{
      event_id: "hourly_2026-08-28_2000",
      date: "2026-08-28",
      start_time_local: "20:00",
      track_name: "Suzuka",
      voting_disabled: false,
    }],
  };

  const result = selectNextHourlyAnnouncement(announcement, schedule);
  assert.equal(result.track_name, "Suzuka");
  assert.equal(result.title, "Hourly Race");
  assert.equal(result.voting_disabled, false);
});

test("falls back to the announcement when the schedule is unavailable", () => {
  const announcement = { date: "2026-08-28", track_name: "Suzuka" };
  assert.equal(selectNextHourlyAnnouncement(announcement, null), announcement);
});

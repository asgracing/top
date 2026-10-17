import test from "node:test";
import assert from "node:assert/strict";

import {
  SERVER_STATUS_MAX_AGE_MS,
  isServerStatusStale,
  isInstanceStatusStale,
  parseServerStatusUpdatedAt
} from "../../src/features/server-status/freshness.js";

test("one fresh publisher cannot refresh another server's expired snapshot", () => {
  const now = Date.parse("2026-10-17T12:00:00Z");
  const row = {producer_epoch:"fixture",observed_at:"2026-10-17T11:55:00Z",bot_connected:true,roster_complete:true};
  assert.equal(isServerStatusStale({updated_at:new Date(now).toISOString()},now),false);
  assert.equal(isInstanceStatusStale(row,now),true);
  assert.equal(isInstanceStatusStale({...row,observed_at:"2026-10-17T11:59:00Z"},now),false);
  assert.equal(isInstanceStatusStale({...row,observed_at:"2026-10-17T11:59:00Z",bot_connected:false},now),true);
  assert.equal(isInstanceStatusStale({status:"stale",players_online:null},now),true);
  assert.equal(isInstanceStatusStale({status:"online",players_online:0},now),false);
});

test("treats status as stale only after ten minutes", () => {
  const updatedAt = Date.parse("2026-08-25T12:00:00Z");
  const status = { updated_at: "2026-08-25T12:00:00Z" };

  assert.equal(isServerStatusStale(status, updatedAt + SERVER_STATUS_MAX_AGE_MS), false);
  assert.equal(isServerStatusStale(status, updatedAt + SERVER_STATUS_MAX_AGE_MS + 1), true);
});

test("interprets publisher timestamps without an offset as Moscow time", () => {
  assert.equal(
    parseServerStatusUpdatedAt("2026-08-25T15:00:00"),
    Date.parse("2026-08-25T12:00:00Z")
  );
});

test("preserves explicit ISO timezones", () => {
  assert.equal(
    parseServerStatusUpdatedAt("2026-08-25T15:00:00+05:00"),
    Date.parse("2026-08-25T10:00:00Z")
  );
});

test("fails closed when the update timestamp is missing or invalid", () => {
  assert.equal(isServerStatusStale({}, Date.now()), true);
  assert.equal(isServerStatusStale({ updated_at: "not-a-date" }, Date.now()), true);
});

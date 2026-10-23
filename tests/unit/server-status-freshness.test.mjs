import test from "node:test";
import assert from "node:assert/strict";

import {
  SERVER_STATUS_MAX_AGE_MS,
  bindServerStatusFreshness,
  serverDetailsAreOpen,
  isServerStatusStale,
  isInstanceStatusStale,
  parseServerStatusUpdatedAt
} from "../../src/features/server-status/freshness.js";

test("details refresh follows either maintained dialog, excluding other V2 modals", () => {
  const nodes = {}, doc = {getElementById:id=>nodes[id]};
  assert.equal(serverDetailsAreOpen(doc), false);
  nodes['server-players-modal'] = {getAttribute:()=> 'false'};
  assert.equal(serverDetailsAreOpen(doc), true);
  delete nodes['server-players-modal'];
  nodes['v2-modal'] = {open:true,dataset:{kind:'server'}};
  assert.equal(serverDetailsAreOpen(doc), true);
  nodes['v2-modal'].dataset.kind = 'servers';
  assert.equal(serverDetailsAreOpen(doc), true);
  nodes['v2-modal'].dataset.kind = 'driver';
  assert.equal(serverDetailsAreOpen(doc), false);
  nodes['v2-modal'].dataset.kind = 'server';nodes['v2-modal'].open = false;
  assert.equal(serverDetailsAreOpen(doc), false);
});

test("open details stay within timing TTL, closed widgets poll slowly and hidden pages pause", () => {
  let tick, interval, cleanup, visibility, detailsOpen = false, refreshes = 0;
  const documentRef = {hidden:false};
  const windowRef = {
    setInterval(callback, ms) { tick = callback; interval = ms; return 42; },
    clearInterval(id) { assert.equal(id, 42); }
  };
  const lifecycle = {
    timer(id, callback) { cleanup = () => callback(id); },
    listen(target, event, callback) { assert.equal(target, documentRef); assert.equal(event, 'visibilitychange'); visibility = callback; }
  };
  bindServerStatusFreshness({windowRef, documentRef, lifecycle, refresh:()=>refreshes++, isDetailsOpen:()=>detailsOpen});
  assert.equal(interval, 5000);
  for (let i=0;i<5;i++) tick();
  assert.equal(refreshes, 0);
  tick(); assert.equal(refreshes, 1);
  detailsOpen = true;
  for (let i=0;i<6;i++) tick();
  assert.equal(refreshes, 7);
  documentRef.hidden = true;
  for (let i=0;i<6;i++) tick();
  visibility(); assert.equal(refreshes, 7);
  documentRef.hidden = false;
  visibility(); assert.equal(refreshes, 8);
  cleanup();
});

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

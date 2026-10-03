import test from "node:test";
import assert from "node:assert/strict";
import { moscowDay, nextMoscowMidnight, refreshUrl, startDailyRefresh } from "../../overlay/daily-refresh.js";

test("refresh follows Moscow midnight regardless of the computer timezone", () => {
  const before = Date.parse("2026-10-03T20:59:59Z");
  const midnight = Date.parse("2026-10-03T21:00:00Z");
  assert.equal(nextMoscowMidnight(before), midnight);
  assert.equal(moscowDay(midnight), moscowDay(before) + 1);
  assert.equal(nextMoscowMidnight(midnight), Date.parse("2026-10-04T21:00:00Z"));
});

test("refresh preserves OBS settings and the private token fragment", () => {
  const url = new URL(refreshUrl("https://asgracing.ru/overlay/driver/?layout=bar&overlayRefresh=old#token=secret", 123));
  assert.equal(url.searchParams.get("layout"), "bar");
  assert.deepEqual(url.searchParams.getAll("overlayRefresh"), ["123"]);
  assert.equal(url.hash, "#token=secret");
});

function fixture() {
  let now = Date.parse("2026-10-03T20:59:59Z");
  let timer;
  let delay;
  const calls = [];
  const navigations = [];
  const events = {};
  const resources = [
    { initiatorType: "script", name: "https://asgracing.ru/overlay/driver/app.js?v=1" },
    { initiatorType: "script", name: "https://asgracing.ru/overlay/driver/model.js?v=1" },
    { initiatorType: "link", name: "https://asgracing.ru/styles/components/rating-palette.css?v=1" },
    { initiatorType: "fetch", name: "https://auth.asgracing.ru/v1/driver-overlay" },
    { initiatorType: "script", name: "https://other.example/external.js" }
  ];
  const win = {
    Date: { now: () => now },
    setTimeout: (fn, ms) => { timer = fn; delay = ms; return 1; },
    clearTimeout: () => {},
    document: { addEventListener: (event, fn) => { events[event] = fn; } },
    addEventListener: (event, fn) => { events[event] = fn; },
    performance: { getEntriesByType: () => resources },
    fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) }; },
    location: { origin: "https://asgracing.ru", href: "https://asgracing.ru/overlay/driver/#token=secret", replace: url => navigations.push(url) }
  };
  return { win, calls, navigations, events, setTime: value => { now = Date.parse(value); }, run: () => timer(), delay: () => delay };
}

test("midnight revalidates local assets and navigates once; API and external resources are excluded", async () => {
  const f = fixture();
  startDailyRefresh(f.win);
  assert.equal(f.delay(), 1000);
  await f.run();
  assert.equal(f.calls.length, 0);
  f.setTime("2026-10-03T21:00:00Z");
  await f.run();
  assert.equal(f.calls.length, 3);
  assert.ok(f.calls.every(call => call.options.cache === "reload" && call.options.credentials === "omit"));
  assert.equal(f.navigations.length, 1);
  assert.ok(f.navigations[0].endsWith("#token=secret"));
  await f.run();
  assert.equal(f.navigations.length, 1);
});

test("offline failure preserves the overlay and retries; delayed timers catch up after midnight", async () => {
  const f = fixture();
  startDailyRefresh(f.win);
  f.setTime("2026-10-05T10:00:00Z");
  f.win.fetch = async () => { throw new Error("offline"); };
  await f.run();
  assert.equal(f.navigations.length, 0);
  assert.equal(f.delay(), 60_000);
  f.win.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
  await f.run();
  assert.equal(f.navigations.length, 1);
});

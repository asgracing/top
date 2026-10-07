import test from "node:test";
import assert from "node:assert/strict";
import { formatMoscowDateTime, moscowDateKey, moscowHourKey, parseAsgTimestamp } from "../../src/shared/time.js";

test("normalizes explicit UTC and legacy Moscow timestamps", () => {
  assert.equal(parseAsgTimestamp("2026-09-09T18:30:00Z").toISOString(), "2026-09-09T18:30:00.000Z");
  assert.equal(parseAsgTimestamp("2026-09-09T21:30:00").toISOString(), "2026-09-09T18:30:00.000Z");
  assert.equal(parseAsgTimestamp("2026-09-09 21:30:00").toISOString(), "2026-09-09T18:30:00.000Z");
});

test("creates Moscow calendar keys across the UTC day boundary", () => {
  assert.equal(moscowDateKey("2026-09-09T21:30:00Z"), "2026-09-10");
  assert.equal(moscowHourKey("2026-09-09T21:30:00Z"), "00");
});

test("formats in Moscow regardless of process timezone", () => {
  assert.match(formatMoscowDateTime("2026-09-09T21:30:00Z", "en-GB"), /10\/09\/2026, 00:30/);
});

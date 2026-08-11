import test from "node:test";
import assert from "node:assert/strict";

import { filterPilots, loadPilotIndex, normalizePilotIndex, searchPilots } from "../../src/pages/account/pilot-search-model.js";

test("normalizes only bounded public pilot identity fields", () => {
  const pilots = normalizePilotIndex([
    { public_id: "pilot-1", driver: " Driver One ", steam_id: "private" },
    { public_id: "<bad>", driver: "Bad" },
    { public_id: "pilot-1", driver: "Duplicate" }
  ]);
  assert.deepEqual(pilots, [{ publicId: "pilot-1", displayName: "Driver One" }]);
  assert.equal(JSON.stringify(pilots).includes("private"), false);
});

test("accepts the current production-sized pilot index and keeps a hard upper bound", () => {
  const productionSized = Array.from({ length: 23_478 }, (_, index) => ({
    public_id: `pilot-${index}`,
    driver: `Driver ${index}`
  }));
  assert.equal(normalizePilotIndex(productionSized).length, 23_478);
  assert.throws(
    () => normalizePilotIndex(Array.from({ length: 50_001 }, () => null)),
    /invalid_pilot_index/
  );
});

test("filters pilots by name or public id and excludes current roster", () => {
  const pilots = normalizePilotIndex([
    { public_id: "pilot-1", driver: "Alice Driver" },
    { public_id: "pilot-2", driver: "Bob Driver" }
  ]);
  assert.deepEqual(filterPilots(pilots, "driver", { excludedPublicIds: ["pilot-1"] }), [
    { publicId: "pilot-2", displayName: "Bob Driver" }
  ]);
  assert.deepEqual(filterPilots(pilots, "pilo", { excludedPublicIds: [] }).length, 2);
  assert.deepEqual(filterPilots(pilots, "a"), []);
});

test("returns all matches and moves already invited pilots below available pilots", () => {
  const pilots = normalizePilotIndex(Array.from({ length: 75 }, (_, index) => ({
    public_id: `pilot-${index}`,
    driver: `ASG Driver ${index}`
  })));
  const matches = searchPilots(pilots, "asg", {
    excludedPublicIds: ["pilot-0"],
    deferredPublicIds: ["pilot-1", "pilot-2"]
  });
  assert.equal(matches.length, 74);
  assert.equal(matches[0].publicId, "pilot-3");
  assert.deepEqual(matches.slice(-2).map(pilot => pilot.publicId), ["pilot-1", "pilot-2"]);
  assert.equal(filterPilots(pilots, "asg").length, 50);
  assert.equal(filterPilots(pilots, "asg", { limit: 70 }).length, 70);
});

test("loads the canonical public driver index path", async () => {
  let requested = "";
  let requestedOptions = null;
  const pilots = await loadPilotIndex({
    dataBaseUrl: "https://data.asgracing.ru/top-data",
    client: { async requestJson(url, options) { requested = String(url); requestedOptions = options; return [{ public_id: "pilot-1", driver: "Driver" }]; } }
  });
  assert.equal(requested, "https://data.asgracing.ru/top-data/v2/drivers/drivers.json");
  assert.equal(requestedOptions.timeoutMs, 60_000);
  assert.equal(pilots[0].publicId, "pilot-1");
});

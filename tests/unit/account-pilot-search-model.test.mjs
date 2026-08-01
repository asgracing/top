import test from "node:test";
import assert from "node:assert/strict";

import { filterPilots, loadPilotIndex, normalizePilotIndex } from "../../src/pages/account/pilot-search-model.js";

test("normalizes only bounded public pilot identity fields", () => {
  const pilots = normalizePilotIndex([
    { public_id: "pilot-1", driver: " Driver One ", steam_id: "private" },
    { public_id: "<bad>", driver: "Bad" },
    { public_id: "pilot-1", driver: "Duplicate" }
  ]);
  assert.deepEqual(pilots, [{ publicId: "pilot-1", displayName: "Driver One" }]);
  assert.equal(JSON.stringify(pilots).includes("private"), false);
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

test("loads the canonical public driver index path", async () => {
  let requested = "";
  const pilots = await loadPilotIndex({
    dataBaseUrl: "https://data.asgracing.ru/top-data",
    client: { async requestJson(url) { requested = String(url); return [{ public_id: "pilot-1", driver: "Driver" }]; } }
  });
  assert.equal(requested, "https://data.asgracing.ru/top-data/v2/drivers/drivers.json");
  assert.equal(pilots[0].publicId, "pilot-1");
});

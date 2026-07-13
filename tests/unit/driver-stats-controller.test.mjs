import test from "node:test";
import assert from "node:assert/strict";
import { createDriverStatsController } from "../../src/pages/driver/stats-controller.js";

function element(dataset = {}) {
  const listeners = {};
  return { dataset, value: "spa", addEventListener(type, callback) { listeners[type] = callback; }, closest() { return null; }, listeners };
}

test("binds Driver track selections and rerenders their container", () => {
  const best = element({ bestlapTrack: "driver-1" });
  const average = element({ averagePaceTrack: "driver-1" });
  const root = {
    innerHTML: "",
    querySelector: () => null,
    querySelectorAll: selector => selector.includes("bestlap") ? [best] : [average],
  };
  const bestLapSelection = new Map();
  const averagePaceSelection = new Map();
  const controller = createDriverStatsController({ bestLapSelection, averagePaceSelection, getSelectionKey: () => "fallback", renderStats: () => "updated", openBestLapsModal() {}, applyBestLapsButtonText() {}, translate: key => key });
  controller.bind(root, {});
  best.listeners.change();
  average.listeners.change();
  assert.equal(bestLapSelection.get("driver-1"), "spa");
  assert.equal(averagePaceSelection.get("driver-1"), "spa");
  assert.equal(root.innerHTML, "updated");
});

test("opens Driver best-laps modal once with localized copy", () => {
  const button = element();
  const root = { querySelector: () => button, querySelectorAll: () => [] };
  let payload;
  const controller = createDriverStatsController({ bestLapSelection: new Map(), averagePaceSelection: new Map(), getSelectionKey: () => "key", renderStats: () => "", openBestLapsModal: (...args) => { payload = args; }, applyBestLapsButtonText() {}, translate: key => `t:${key}` });
  controller.bind(root, { best_laps_by_track: ["lap"] });
  button.listeners.click({ preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(payload[0], ["lap"]);
  assert.equal(payload[2].title, "t:bestLapTracksTitle");
  assert.equal(button.dataset.bound, "true");
});

test("validates Driver stats controller dependencies", () => {
  assert.throws(() => createDriverStatsController({}), /complete dependencies/);
});

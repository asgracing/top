import assert from "node:assert/strict";
import test from "node:test";

import {
  championshipStatusTone,
  normalizeChampionshipStatus
} from "../../src/pages/hourly/championship-status.js";

test("keeps scheduled championships separate from active and finished seasons", () => {
  assert.equal(normalizeChampionshipStatus("scheduled"), "scheduled");
  assert.equal(normalizeChampionshipStatus("upcoming"), "scheduled");
  assert.equal(normalizeChampionshipStatus("active"), "active");
  assert.equal(normalizeChampionshipStatus("finished"), "finished");
});

test("uses completed styling for archived championships", () => {
  assert.equal(championshipStatusTone("archived"), "finished");
});

import test from "node:test";
import assert from "node:assert/strict";

import { formatRatingMetric } from "../../src/shared/rating-format.js";

test("formats club and team ratings with a decimal point", () => {
  assert.equal(formatRatingMetric(1101.5, 1), "1101.5");
  assert.equal(formatRatingMetric(9.99, 2), "9.99");
});

test("removes insignificant rating zeroes and handles missing values", () => {
  assert.equal(formatRatingMetric(1101, 1), "1101");
  assert.equal(formatRatingMetric(1100, 0), "1100");
  assert.equal(formatRatingMetric(9.9, 2), "9.9");
  assert.equal(formatRatingMetric(null, 2), "—");
});

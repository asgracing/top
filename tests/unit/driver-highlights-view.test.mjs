import test from "node:test";
import assert from "node:assert/strict";
import { renderDriverHighlights } from "../../src/pages/driver/highlights-view.js";

const dependencies = {
  getSafetyInfo: profile => profile.safety,
  findSafetySource: () => ({ safety: true }),
  renderRecentForm: form => `form:${form}`,
  renderSafetyBadge: source => source?.safety ? "SAFE" : "",
  renderStrikes: profile => `STRIKES:${Math.max(0, Math.min(3, profile?.strikes?.active || 0))}`,
  translate: key => `t:${key}`,
  escapeHtml: value => `e:${value}`,
};

test("renders Driver highlights with fallback safety source", () => {
  const markup = renderDriverHighlights({ public_id: "p1", recent_form: "WW", strikes: { active: 2, maximum: 3 }, summary: { fastest_lap_awards: 3 } }, dependencies);
  assert.match(markup, /form:WW/);
  assert.match(markup, /e:3/);
  assert.match(markup, /SAFE/);
  assert.match(markup, /STRIKES:2/);
  assert.match(markup, /driver-safety-card/);
  assert.match(markup, /e:t:driverStrikes/);
  assert.doesNotMatch(markup, /driver-safety-strikes-row/);
});

test("clamps public strike count to three", () => {
  const markup = renderDriverHighlights({ strikes: { active: 99 }, summary: {} }, dependencies);
  assert.match(markup, /STRIKES:3/);
});

test("renders an empty Driver highlights contract", () => {
  assert.equal(renderDriverHighlights(null, dependencies), "");
  assert.throws(() => renderDriverHighlights({}, {}), /dependencies/);
});

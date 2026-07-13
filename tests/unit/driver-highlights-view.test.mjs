import test from "node:test";
import assert from "node:assert/strict";
import { renderDriverHighlights } from "../../src/pages/driver/highlights-view.js";

const dependencies = {
  getSafetyInfo: profile => profile.safety,
  findSafetySource: () => ({ safety: true }),
  renderRecentForm: form => `form:${form}`,
  renderSafetyBadge: source => source?.safety ? "SAFE" : "",
  translate: key => `t:${key}`,
  escapeHtml: value => `e:${value}`,
};

test("renders Driver highlights with fallback safety source", () => {
  const markup = renderDriverHighlights({ public_id: "p1", recent_form: "WW", summary: { fastest_lap_awards: 3 } }, dependencies);
  assert.match(markup, /form:WW/);
  assert.match(markup, /e:3/);
  assert.match(markup, /SAFE/);
});

test("renders an empty Driver highlights contract", () => {
  assert.equal(renderDriverHighlights(null, dependencies), "");
  assert.throws(() => renderDriverHighlights({}, {}), /complete rendering dependencies/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { renderDriverTrackSelect } from "../../src/pages/driver/track-select-view.js";

const dependencies = {
  escapeHtml: value => `h:${value}`,
  escapeAttribute: value => `a:${value}`,
  formatTrackName: value => `track:${value}`,
};

test("does not render a selector when there is no choice", () => {
  assert.equal(renderDriverTrackSelect({ items: [{ track_code: "spa" }], ...dependencies }), "");
});

test("renders the selected driver track with an explicit data contract", () => {
  const markup = renderDriverTrackSelect({
    items: [{ track_code: "spa" }, { track_code: "monza" }],
    selectedTrackCode: "monza",
    selectionKey: "driver-1",
    dataAttribute: "data-bestlap-track",
    label: "Best lap track",
    ...dependencies,
  });
  assert.match(markup, /data-bestlap-track="a:driver-1"/);
  assert.match(markup, /value="a:monza" selected/);
  assert.match(markup, /track:spa/);
});

test("rejects unsafe dynamic attribute names", () => {
  assert.throws(() => renderDriverTrackSelect({
    items: [{ track_code: "spa" }, { track_code: "monza" }],
    dataAttribute: "onclick",
    ...dependencies,
  }), /safe data attribute/);
});

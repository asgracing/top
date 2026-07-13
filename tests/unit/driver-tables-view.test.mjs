import test from "node:test";
import assert from "node:assert/strict";
import { renderDriverRaceTableMarkup, renderDriverTrackTableMarkup } from "../../src/pages/driver/tables-view.js";

const escapeHtml = value => `e:${value}`;

test("renders Driver race rows with interaction and cell helpers", () => {
  const markup = renderDriverRaceTableMarkup([{ race_id: "r&1", track: "spa", position: 2, points: 18, best_lap_ms: 90000, best_lap: "1:30", car_name: "GT3" }], 90000, {
    escapeHtml,
    escapeAttribute: value => `a:${value}`,
    formatDateTimeLocal: () => "date",
    humanizeTrackName: value => `track:${value}`,
    formatStartPosition: () => 4,
    renderStatValueWithTrend: value => `trend:${value}`,
    renderPositionsDelta: value => `delta:${value}`,
    getBestLapClass: active => active ? "best" : "",
    renderCarLink: value => `car:${value}`,
    renderEloDeltaCell: () => "elo",
    renderSafetyRaceCell: () => "safety",
    translate: key => `t:${key}`,
  });
  assert.match(markup, /data-race-id="a:r&1"/);
  assert.match(markup, /class="best"/);
  assert.match(markup, /trend:e:2/);
  assert.match(markup, /car:GT3/);
});

test("renders Driver track rows and validates dependencies", () => {
  const markup = renderDriverTrackTableMarkup([{ track: "monza", races: 3, wins: 1, podiums: 2, points: 42, average_finish: 2.5, best_lap: "1:48" }], {
    escapeHtml,
    humanizeTrackName: value => `track:${value}`,
  });
  assert.match(markup, /e:track:monza/);
  assert.match(markup, /e:42/);
  assert.throws(() => renderDriverRaceTableMarkup([], null, {}), /complete rendering dependencies/);
});

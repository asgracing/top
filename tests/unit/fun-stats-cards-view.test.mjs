import test from "node:test";
import assert from "node:assert/strict";
import { renderFunStatsAwardCard, renderFunStatsListCard, renderFunStatsSummaryCard } from "../../src/pages/fun-stats/cards-view.js";

const dependencies = { escapeHtml: value => `safe:${value}`, translate: key => `t:${key}` };

test("renders Fun Stats award and summary cards", () => {
  const award = renderFunStatsAwardCard({ labelKey: "award", titleMarkup: "<b>Driver</b>", note: "10 pts", accent: "gold" }, dependencies);
  const summary = renderFunStatsSummaryCard({ labelMarkup: "Races", valueMarkup: "12", note: "week" }, dependencies);
  assert.match(award, /fun-award-card-safe:gold/);
  assert.match(award, /<b>Driver<\/b>/);
  assert.match(summary, /safe:week/);
});

test("renders ranked and empty Fun Stats lists", () => {
  const ranked = renderFunStatsListCard({ titleKey: "active", items: [{ label: "Driver", value: 3 }], valueFormatter: item => item.value }, dependencies);
  const empty = renderFunStatsListCard({ titleKey: "active", items: [], valueFormatter: String }, dependencies);
  assert.match(ranked, /#1/);
  assert.match(ranked, /safe:3/);
  assert.match(empty, /safe:t:funStatsEmpty/);
});

test("validates Fun Stats card dependencies", () => {
  assert.throws(() => renderFunStatsSummaryCard({}, {}), /dependencies/);
  assert.throws(() => renderFunStatsListCard({}, dependencies), /value formatter/);
});

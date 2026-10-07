import test from "node:test";
import assert from "node:assert/strict";
import { renderDriverHeroTitle, renderDriverStatsCards } from "../../src/pages/driver/summary-view.js";

const dependencies = {
  escapeHtml: value => `e:${value}`,
  escapeAttribute: value => `a:${value}`,
  translate: key => `t:${key}`,
  renderEloBadge: () => "ELO",
  renderTrendBadge: () => "TREND",
  isDriverBanned: profile => profile?.is_banned === true,
  renderBannedBadge: () => "BANNED_BADGE",
  renderStatValueWithTrend: value => `stat:${value}`,
  renderPositionsDelta: value => `positions:${value}`,
};

test("renders Driver hero identity, ELO and rank", () => {
  const markup = renderDriverHeroTitle({ driver: "Alex", race_number: 77 }, { rank: 4, rankClass: "up", change: 2 }, {}, dependencies);
  assert.match(markup, /e:Alex/);
  assert.match(markup, /class="driver-title-primary"/);
  assert.match(markup, /class="[^"]*driver-hero-ratings/);
  assert.match(markup, /driver-race-number-pill[^>]*>#e:77/);
  assert.match(markup, /ELO[\s\S]*driver-race-number-pill/);
  assert.match(markup, /ELO/);
  assert.match(markup, /e:t:driverRankingShort/);
  assert.match(markup, /#e:4/);
  assert.match(markup, /TREND/);
});

test("does not render an invalid race number", () => {
  const markup = renderDriverHeroTitle({ driver: "Alex", race_number: 1000 }, null, {}, dependencies);
  assert.doesNotMatch(markup, /driver-race-number-pill/);
});

test("renders a banned badge next to the Driver name", () => {
  const markup = renderDriverHeroTitle({ driver: "Alex", is_banned: true }, null, {}, dependencies);
  assert.match(markup, /driver-title-primary[\s\S]*BANNED_BADGE/);
});

test("renders Driver statistic cards from a prepared model", () => {
  const markup = renderDriverStatsCards({ summary: { points: 42, win_rate: 25 }, favoriteCarMarkup: "CAR", bestLap: "1:48", bestLapTrackSelect: "SELECT", averagePace: "1:50" }, dependencies);
  assert.match(markup, /stat:e:42/);
  assert.match(markup, /e:25%/);
  assert.match(markup, /SELECT/);
  assert.match(markup, /CAR/);
});

test("renders empty state and validates dependencies", () => {
  assert.match(renderDriverStatsCards(null, dependencies), /driverNoData/);
  assert.throws(() => renderDriverHeroTitle({}, null, null, {}), /complete rendering dependencies/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createFunStatsPageView } from "../../src/pages/fun-stats/page-view.js";

function fixture(races = 0) {
  const elements = Object.fromEntries(["fun-stats-summary", "fun-stats-awards", "fun-stats-leaderboards", "fun-stats-range"].map(id => [id, { innerHTML: "", textContent: "", replaceChildren() { this.innerHTML = ""; } }]));
  const button = { dataset: { funPeriod: "week" }, classList: { toggle(_name, active) { button.active = active; } }, setAttribute(_name, value) { button.pressed = value; } };
  const calls = [];
  const data = { rangeLabel: "range", summary: { races, activeDrivers: 2, overtakes: 4, fastestLapLeader: null }, awards: {}, lists: { active: [], movers: [], clean: [], stable: [], fastest: [], cars: [] } };
  const dependencies = { documentRef: { getElementById: id => elements[id], querySelectorAll: () => [button] }, translate: key => key, escapeHtml: String, replaceTokens: text => text, renderLoadingMarkup: text => `loading:${text}`, replaceWithTextState: (...args) => calls.push(args), aggregate: () => data, renderSummaryCard: (...args) => `summary:${args[1]}`, renderAwardCard: () => "award", renderListCard: key => `list:${key}`, renderDriverLink: value => value, renderCarLink: value => value };
  return { elements, button, calls, dependencies };
}

test("renders Fun Stats loading state", () => {
  const { elements, dependencies } = fixture();
  createFunStatsPageView(dependencies).render({ loading: true });
  assert.equal(elements["fun-stats-summary"].innerHTML, "loading:loading");
});

test("renders empty Fun Stats data and active period", () => {
  const { button, calls, dependencies } = fixture(0);
  createFunStatsPageView(dependencies).render({ period: "week" });
  assert.equal(button.active, true);
  assert.equal(button.pressed, "true");
  assert.equal(calls[0][1], "empty");
});

test("renders populated Fun Stats leaderboards and validates dependencies", () => {
  const { elements, dependencies } = fixture(3);
  createFunStatsPageView(dependencies).render({ period: "week" });
  assert.match(elements["fun-stats-leaderboards"].innerHTML, /funStatsListCars/);
  assert.throws(() => createFunStatsPageView({}), /complete dependencies/);
});

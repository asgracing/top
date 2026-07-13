import test from "node:test";
import assert from "node:assert/strict";
import { createDriverPageView } from "../../src/pages/driver/page-view.js";

function fixture() {
  const elements = Object.fromEntries(["driver-page-name", "driver-page-subtitle", "driver-stat-cards", "driver-highlights"].map(id => [id, { textContent: "", innerHTML: "", replaceChildren() { this.innerHTML = ""; } }]));
  const calls = [];
  const dependencies = {
    documentRef: { getElementById: id => elements[id] },
    translate: key => `t:${key}`,
    renderLoadingMarkup: text => `loading:${text}`,
    setLoadingMarkup: (...args) => calls.push(["loading", ...args]),
    replaceWithTextState: (...args) => calls.push(["state", ...args]),
    buildHeroTitle: () => "HERO",
    buildStatsMarkup: () => "STATS",
    buildHighlightsMarkup: () => "HIGHLIGHTS",
    renderRaceHistory: () => calls.push(["races"]),
    renderTrackStats: () => calls.push(["tracks"]),
    renderPenaltyList: (...args) => calls.push(["penalty", ...args]),
    bindStats: (...args) => calls.push(["bind", ...args]),
    setDocumentTitle: title => calls.push(["title", title]),
  };
  return { elements, calls, dependencies };
}

test("renders Driver loading state", () => {
  const { elements, calls, dependencies } = fixture();
  createDriverPageView(dependencies).render({ loading: true });
  assert.equal(elements["driver-stat-cards"].innerHTML, "loading:t:driverLoading");
  assert.equal(calls.filter(call => call[0] === "loading").length, 2);
});

test("renders and binds a ready Driver profile", () => {
  const { elements, calls, dependencies } = fixture();
  const profile = { driver: "Alex", penalties: { reasons: { contact: 1 } } };
  createDriverPageView(dependencies).render({ profile });
  assert.equal(elements["driver-page-name"].innerHTML, "HERO");
  assert.equal(elements["driver-stat-cards"].innerHTML, "STATS");
  assert.ok(calls.some(call => call[0] === "bind" && call[2] === profile));
  assert.ok(calls.some(call => call[0] === "title" && call[1] === "Alex | t:pageTitleDriver"));
});

test("validates Driver page view dependencies", () => {
  assert.throws(() => createDriverPageView({}), /complete dependencies/);
});

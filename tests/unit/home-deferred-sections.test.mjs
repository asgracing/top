import test from "node:test";
import assert from "node:assert/strict";
import { HOME_DEFERRED_SECTION_MAP, createHomeDeferredSectionsController } from "../../src/pages/home/deferred-sections.js";

test("reveals every section immediately for tab mode or missing observer", () => {
  const state = { leaderboard: false, bestlaps: false, safety: false };
  createHomeDeferredSectionsController({ initialState: state }).setup({ isHome: true, tabsEnabled: true, windowRef: {}, documentRef: {} });
  assert.deepEqual(state, { leaderboard: true, bestlaps: true, safety: true });
});

test("observes mapped sections and reveals each one once", () => {
  const observed = [];
  const unobserved = [];
  let callback;
  const elements = Object.keys(HOME_DEFERRED_SECTION_MAP).map(id => ({ id }));
  class Observer { constructor(next) { callback = next; } observe(el) { observed.push(el.id); } unobserve(el) { unobserved.push(el.id); } disconnect() {} }
  const revealed = [];
  const state = { leaderboard: false, bestlaps: false, safety: false };
  const controller = createHomeDeferredSectionsController({ initialState: state, onReveal: key => revealed.push(key) });
  controller.setup({ isHome: true, tabsEnabled: false, windowRef: { IntersectionObserver: Observer }, documentRef: { getElementById: id => elements.find(el => el.id === id) } });
  callback([{ isIntersecting: true, target: elements[1] }]);
  callback([{ isIntersecting: true, target: elements[1] }]);
  assert.deepEqual(observed, Object.keys(HOME_DEFERRED_SECTION_MAP));
  assert.deepEqual(revealed, ["bestlaps"]);
  assert.deepEqual(unobserved, ["bestlaps"]);
});

test("does nothing outside home", () => {
  const state = { leaderboard: true, bestlaps: true, safety: true };
  createHomeDeferredSectionsController({ initialState: state }).setup({ isHome: false, tabsEnabled: false, windowRef: {}, documentRef: {} });
  assert.deepEqual(state, { leaderboard: true, bestlaps: true, safety: true });
});

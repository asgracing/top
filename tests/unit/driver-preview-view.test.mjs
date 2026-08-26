import test from "node:test";
import assert from "node:assert/strict";
import { createDriverPreviewView } from "../../src/pages/driver/preview-view.js";

function fixture() {
  const moved = { meta: {}, raceNumber: {}, affiliations: {} };
  const appended = [];
  const elements = Object.fromEntries(["driver-preview-title", "driver-preview-subtitle", "driver-preview-profile-title", "driver-preview-profile-title-icon", "driver-preview-profile-title-text", "driver-preview-stats", "driver-preview-highlights", "driver-preview-link", "driver-preview-action-row"].map(id => [id, { textContent: "", innerHTML: "", hidden: false, href: "", title: "", replaceChildren() { this.innerHTML = ""; }, append(value) { appended.push(value); } }]));
  elements["driver-preview-title"].querySelector = selector => ({ ".driver-hero-meta-row": moved.meta, ".driver-race-number-pill": moved.raceNumber, ".driver-title-affiliations": moved.affiliations })[selector] || null;
  const calls = [];
  return {
    elements,
    calls, moved, appended,
    dependencies: {
      documentRef: { getElementById: id => elements[id] },
      translate: key => `t:${key}`,
      replaceWithTextState: (...args) => calls.push(args),
      buildHeroTitle: () => "HERO",
      buildStatsMarkup: () => "STATS",
      buildHighlightsMarkup: () => "HIGHLIGHTS",
      bindStats: (...args) => calls.push(["bind", ...args]),
      renderPortrait: (...args) => calls.push(["portrait", ...args]),
    },
  };
}

test("renders an idle Driver preview as loading and hides its action", () => {
  const { elements, calls, dependencies } = fixture();
  createDriverPreviewView(dependencies).render(null);
  assert.equal(elements["driver-preview-link"].hidden, true);
  assert.deepEqual(calls[0], ["portrait", null, null]);
  assert.ok(calls.some(call => call[1] === "loading"));
});

test("renders a ready Driver preview and binds its controls", () => {
  const { elements, calls, moved, appended, dependencies } = fixture();
  const profile = { driver: "Alex" };
  createDriverPreviewView(dependencies).render({ profile, href: "/driver/alex", avatarUrl: "https://avatars.steamstatic.com/avatar.jpg", title: { icon: "👑", title: "Grand Slam", description: "Pole, fastest lap and victory." } });
  assert.equal(elements["driver-preview-title"].innerHTML, "HERO");
  assert.equal(elements["driver-preview-stats"].innerHTML, "STATS");
  assert.equal(elements["driver-preview-link"].hidden, false);
  assert.equal(elements["driver-preview-profile-title"].hidden, false);
  assert.equal(elements["driver-preview-profile-title-icon"].textContent, "👑");
  assert.equal(elements["driver-preview-profile-title-text"].textContent, "Grand Slam");
  assert.equal(elements["driver-preview-profile-title"].title, "Pole, fastest lap and victory.");
  assert.deepEqual(appended, [moved.meta, moved.raceNumber, elements["driver-preview-link"], moved.affiliations]);
  assert.ok(calls.some(call => call[0] === "portrait" && call[1] === profile && call[2] === "https://avatars.steamstatic.com/avatar.jpg"));
  assert.ok(calls.some(call => call[0] === "bind" && call[2] === profile));
});

test("validates Driver preview dependencies", () => {
  assert.throws(() => createDriverPreviewView({}), /complete dependencies/);
});

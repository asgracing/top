import test from "node:test";
import assert from "node:assert/strict";
import { createDriverPreviewView } from "../../src/pages/driver/preview-view.js";

function fixture() {
  const elements = Object.fromEntries(["driver-preview-title", "driver-preview-subtitle", "driver-preview-stats", "driver-preview-highlights", "driver-preview-link"].map(id => [id, { textContent: "", innerHTML: "", hidden: false, href: "", replaceChildren() { this.innerHTML = ""; } }]));
  const calls = [];
  return {
    elements,
    calls,
    dependencies: {
      documentRef: { getElementById: id => elements[id] },
      translate: key => `t:${key}`,
      replaceWithTextState: (...args) => calls.push(args),
      buildHeroTitle: () => "HERO",
      buildStatsMarkup: () => "STATS",
      buildHighlightsMarkup: () => "HIGHLIGHTS",
      bindStats: (...args) => calls.push(["bind", ...args]),
    },
  };
}

test("renders an idle Driver preview as loading and hides its action", () => {
  const { elements, calls, dependencies } = fixture();
  createDriverPreviewView(dependencies).render(null);
  assert.equal(elements["driver-preview-link"].hidden, true);
  assert.equal(calls[0][1], "loading");
});

test("renders a ready Driver preview and binds its controls", () => {
  const { elements, calls, dependencies } = fixture();
  const profile = { driver: "Alex" };
  createDriverPreviewView(dependencies).render({ profile, href: "/driver/alex" });
  assert.equal(elements["driver-preview-title"].innerHTML, "HERO");
  assert.equal(elements["driver-preview-stats"].innerHTML, "STATS");
  assert.equal(elements["driver-preview-link"].hidden, false);
  assert.ok(calls.some(call => call[0] === "bind" && call[2] === profile));
});

test("validates Driver preview dependencies", () => {
  assert.throws(() => createDriverPreviewView({}), /complete dependencies/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createTopGuideController, resolveTopGuideSteps } from "../../src/pages/home/top-guide.js";
import { createLifecycle } from "../../src/shared/lifecycle.js";

class FakeElement extends EventTarget {
  constructor(tagName, ownerDocument) {
    super();
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.style = {};
    this.hidden = false;
    this.disabled = false;
    this.textContent = "";
    this.className = "";
    this.id = "";
    this.attributes = new Map();
  }
  append(...children) { this.children.push(...children); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  focus() { this.ownerDocument.activeElement = this; }
  remove() { this.removed = true; }
  matches(selector) { return selector === ".btn-last-races" && this.className.includes("btn-last-races"); }
  getBoundingClientRect() { return this.rect || { top: 20, left: 30, right: 230, bottom: 120, width: 200, height: 100 }; }
}

class FakeDocument extends EventTarget {
  constructor(targets = {}) {
    super();
    this.targets = targets;
    this.documentElement = { clientHeight: 800 };
    this.body = new FakeElement("body", this);
    this.activeElement = null;
  }
  createElement(tagName) { return new FakeElement(tagName, this); }
  querySelector(selector) { return this.targets[selector] || null; }
  getById(id) {
    const visit = element => {
      if (element.id === id) return element;
      for (const child of element.children) {
        const match = visit(child);
        if (match) return match;
      }
      return null;
    };
    return visit(this.body);
  }
}

class FakeMediaQuery extends EventTarget {
  constructor(matches) { super(); this.matches = matches; }
}

class FakeWindow extends EventTarget {
  constructor(matches = true) {
    super();
    this.innerWidth = 1366;
    this.innerHeight = 768;
    this.scrollY = 0;
    this.media = new FakeMediaQuery(matches);
    this.scrollCalls = [];
  }
  matchMedia() { return this.media; }
  scrollTo(options) { this.scrollCalls.push(options); }
  setTimeout() { return 1; }
  clearTimeout() {}
}

function createHarness({ seen = true, desktop = true, targets } = {}) {
  const documentRef = new FakeDocument(targets);
  const windowRef = new FakeWindow(desktop);
  const lifecycle = createLifecycle();
  const values = new Map([["topGuideSeen", seen]]);
  const storage = {
    get: (key, fallback) => values.has(key) ? values.get(key) : fallback,
    set: (key, value) => { values.set(key, value); return true; }
  };
  const controller = createTopGuideController({
    documentRef,
    windowRef,
    lifecycle,
    storage,
    translate: key => key,
    replaceTokens: (text, replacements) => `${text}:${replacements.current}/${replacements.total}`,
    steps: [
      { targetSelector: ".hero", titleKey: "title1", textKey: "text1", scrollBlock: "nearest" },
      { targetSelector: ".missing", titleKey: "title2", textKey: "text2", scrollBlock: "center" }
    ]
  });
  return { controller, documentRef, windowRef, lifecycle, values };
}

test("resolves only guide steps that still have DOM targets", () => {
  const target = {};
  const documentRef = { querySelector: selector => selector === ".present" ? target : null };
  const steps = resolveTopGuideSteps(documentRef, [
    { targetSelector: ".present" },
    { targetSelector: ".missing" }
  ]);
  assert.equal(steps.length, 1);
  assert.equal(steps[0].target, target);
});

test("manual launch works after seen state and completes the available steps", () => {
  const targetDocument = new FakeDocument();
  const target = new FakeElement("section", targetDocument);
  target.rect = { top: 20, left: 30, right: 230, bottom: 120, width: 200, height: 100 };
  const harness = createHarness({ targets: { ".hero": target } });
  harness.controller.mount();

  assert.equal(harness.controller.open(0, { force: true }), true);
  assert.equal(harness.controller.active, true);
  assert.equal(harness.documentRef.getById("top-guide").hidden, false);
  assert.equal(harness.documentRef.getById("top-guide-progress").textContent, "topGuideProgress:1/1");
  assert.equal(harness.documentRef.getById("top-guide-highlight").style.width, "216px");

  harness.documentRef.getById("top-guide-next").dispatchEvent(new Event("click"));
  assert.equal(harness.controller.active, false);
  assert.equal(harness.values.get("topGuideSeen"), true);
  harness.lifecycle.destroy();
});

test("Escape closes without marking the guide as completed", () => {
  const targetDocument = new FakeDocument();
  const target = new FakeElement("section", targetDocument);
  const harness = createHarness({ seen: false, targets: { ".hero": target } });
  harness.controller.mount();
  harness.controller.open(0, { force: true });
  const escape = new Event("keydown");
  Object.defineProperty(escape, "key", { value: "Escape" });
  harness.documentRef.dispatchEvent(escape);
  assert.equal(harness.controller.active, false);
  assert.equal(harness.values.get("topGuideSeen"), false);
  harness.lifecycle.destroy();
});

test("keeps the guide unavailable below the desktop breakpoint", () => {
  const targetDocument = new FakeDocument();
  const target = new FakeElement("section", targetDocument);
  const harness = createHarness({ desktop: false, targets: { ".hero": target } });
  harness.controller.mount();
  assert.equal(harness.controller.open(0, { force: true }), false);
  assert.equal(harness.documentRef.getById("top-guide-launcher").hidden, true);
  harness.lifecycle.destroy();
});

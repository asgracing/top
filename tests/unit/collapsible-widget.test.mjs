import test from "node:test";
import assert from "node:assert/strict";

import { createCollapsibleWidget } from "../../src/shared/collapsible-widget.js";

function fixture(saved = null) {
  const classes = new Set();
  const listeners = new Map();
  const attributes = new Map();
  const writes = [];
  const root = { classList: { toggle: (name, active) => active ? classes.add(name) : classes.delete(name) } };
  const toggle = {
    title: "",
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: type => listeners.delete(type),
    setAttribute: (name, value) => attributes.set(name, value)
  };
  const content = { hidden: false };
  const storage = { get: (_key, fallback) => saved ?? fallback, set: (key, value) => writes.push([key, value]) };
  return { root, toggle, content, storage, classes, listeners, attributes, writes };
}

test("collapses a widget, persists the choice and keeps an accessible expand control", () => {
  const item = fixture();
  const controller = createCollapsibleWidget({
    ...item,
    storageKey: "serversCollapsed",
    getLabels: () => ({ name: "Servers", collapse: "Collapse", expand: "Expand" })
  });
  item.listeners.get("click")();
  assert.equal(controller.collapsed, true);
  assert.equal(item.content.hidden, true);
  assert.equal(item.classes.has("is-collapsed"), true);
  assert.equal(item.attributes.get("aria-expanded"), "false");
  assert.equal(item.attributes.get("aria-label"), "Expand: Servers");
  assert.deepEqual(item.writes, [["serversCollapsed", true]]);
});

test("restores a saved donation widget state instead of the responsive default", () => {
  const item = fixture(false);
  const controller = createCollapsibleWidget({ ...item, storageKey: "donationAlertsCollapsed", initialCollapsed: true });
  assert.equal(controller.collapsed, false);
  assert.equal(item.content.hidden, false);
});

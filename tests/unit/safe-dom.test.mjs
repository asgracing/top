import test from "node:test";
import assert from "node:assert/strict";
import { element, safeUrl, setTrustedHtml, tableStateElement, trustedHtml } from "../../src/shared/safe-dom.js";

function fakeDocument() {
  return { baseURI: "https://asgracing.ru/", createElement: tagName => ({ tagName, attrs: {}, children: [], setAttribute(name, value) { this.attrs[name] = value; }, append(...children) { this.children.push(...children); } }) };
}
test("creates text nodes without HTML parsing", () => {
  const node = element(fakeDocument(), "div", { text: "<img onerror=bad>", attrs: { onclick: "bad", title: "ok" } });
  assert.equal(node.textContent, "<img onerror=bad>"); assert.equal(node.attrs.onclick, undefined); assert.equal(node.attrs.title, "ok");
});
test("allows only safe URL protocols", () => {
  assert.equal(safeUrl("javascript:alert(1)", "https://asgracing.ru/"), null);
  assert.equal(safeUrl("/driver/", "https://asgracing.ru/"), "/driver/");
});
test("requires an explicit trusted HTML token", () => {
  const node = {};
  assert.throws(() => setTrustedHtml(node, "<b>x</b>"), TypeError);
  setTrustedHtml(node, trustedHtml("<b>x</b>")); assert.equal(node.innerHTML, "<b>x</b>");
});
test("creates normalized table state elements", () => {
  const node = tableStateElement(fakeDocument(), { kind: "error", message: "Failed" });
  assert.equal(node.className, "empty-box"); assert.equal(node.attrs["data-table-state"], "error"); assert.equal(node.textContent, "Failed");
});

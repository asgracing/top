import test from "node:test";
import assert from "node:assert/strict";
import { createBansPage, createBansPageView } from "../../src/pages/bans/index.js";

function setup() {
  const elements = new Map([
    ["bans-total-count", { textContent: "" }],
    ["bans-latest-date", { textContent: "" }],
    ["bans-table", { innerHTML: "" }]
  ]);
  const calls = [];
  const view = createBansPageView({
    documentRef: { getElementById: id => elements.get(id) || null },
    translate: key => key === "bansCols" ? ["Driver", "Date"] : "No bans",
    escapeHtml: value => String(value).replaceAll("<", "&lt;"),
    formatDateTime: (value, locale) => `${locale}:${value}`,
    replaceWithTextState: (...args) => calls.push(["state", ...args]),
    setLoadingMarkup: (...args) => calls.push(["loading", ...args])
  });
  return { view, elements, calls };
}

test("renders bans summary and escaped table rows", () => {
  const { view, elements } = setup();
  view.render({ data: [{ name: "<Driver>", banned_at: "2026-07-13" }], locale: "ru" });
  assert.equal(elements.get("bans-total-count").textContent, "1");
  assert.equal(elements.get("bans-latest-date").textContent, "ru:2026-07-13");
  assert.match(elements.get("bans-table").innerHTML, /&lt;Driver>/);
});

test("delegates loading and empty states", () => {
  const { view, calls } = setup();
  view.render({ loading: true });
  view.render({ data: [] });
  assert.deepEqual(calls.map(call => call.slice(0, 3)), [
    ["loading", "bans-table", "loading"],
    ["state", { innerHTML: "" }, "empty"]
  ]);
});

test("rejects incomplete rendering dependencies", () => {
  assert.throws(() => createBansPageView({}), /complete rendering dependencies/);
});

test("composes and validates the Bans page lifecycle", async () => {
  const calls = [];
  const page = createBansPage({ initializeData: async () => calls.push("data"), handleError: () => calls.push("error") });
  await page.initialize(); page.handleError(new Error("failed"));
  assert.deepEqual(calls, ["data", "error"]);
  assert.throws(() => createBansPage({}), /requires data/);
});

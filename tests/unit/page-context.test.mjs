import test from "node:test";
import assert from "node:assert/strict";
import { PAGE_IDS, applyPageContext, createPageContext, readPageContext } from "../../src/runtime/page-context.js";

test("creates explicit context for every site page", () => {
  for (const page of PAGE_IDS) {
    const context = createPageContext(page);
    assert.equal(context.page, page);
    assert.equal(context.isHome, page === "home");
    assert.equal(context.siteBasePath, page === "home" ? "./" : "../");
  }
});

test("rejects a missing or unknown page identity", () => {
  assert.throws(() => createPageContext(), /Unknown page context/);
  assert.throws(() => createPageContext("hourly"), /Unknown page context/);
});

test("applies and reads page identity through the document root", () => {
  const documentRef = { documentElement: { dataset: {} } };
  const applied = applyPageContext(documentRef, "driver");
  assert.equal(documentRef.documentElement.dataset.page, "driver");
  assert.deepEqual(readPageContext(documentRef), applied);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createNewsPageView } from "../../src/pages/news/page-view.js";

function setup() {
  const listeners = {};
  const nodes = new Map(["news-feed", "news-article", "news-page-title", "news-page-subtitle"].map(id => [id, {
    hidden: false, innerHTML: "", textContent: "", dataset: {}, addEventListener: (type, listener) => { listeners[type] = listener; }
  }]));
  const reads = [];
  const view = createNewsPageView({
    documentRef: { getElementById: id => nodes.get(id) }, translate: key => key,
    escapeHtml: value => String(value).replaceAll("<", "&lt;"), escapeAttribute: String,
    formatDateTime: value => `date:${value}`, getArticleHref: slug => `/news/?article=${slug}`,
    getListHref: () => "/news/", renderThumb: item => `<thumb>${item.title}</thumb>`,
    markRead: item => reads.push(item.slug), onReadStateChanged: () => reads.push("changed")
  });
  return { view, nodes, reads };
}

test("renders escaped news list", () => {
  const { view, nodes } = setup();
  view.render({ items: [{ slug: "one", title: "<Title>", summary: "Summary", published_at: "now" }] });
  assert.match(nodes.get("news-feed").innerHTML, /&lt;Title>/);
  assert.equal(nodes.get("news-article").hidden, true);
});

test("renders article and updates its read state", () => {
  const { view, nodes, reads } = setup();
  view.render({ items: [{ slug: "one", title: "Title", published_at: "now", body: ["Body"] }], slug: "one" });
  assert.deepEqual(reads, ["one", "changed"]);
  assert.match(nodes.get("news-article").innerHTML, /<p>Body<\/p>/);
});

test("renders missing article state", () => {
  const { view, nodes } = setup();
  view.render({ items: [], slug: "missing" });
  assert.match(nodes.get("news-article").innerHTML, /newsArticleMissing/);
});

test("rejects incomplete dependencies", () => {
  assert.throws(() => createNewsPageView({}), /complete rendering dependencies/);
});

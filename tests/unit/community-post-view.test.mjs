import test from "node:test";
import assert from "node:assert/strict";
import { renderCommunityPostCard, renderCommunityTextBlocks } from "../../src/pages/community/post-view.js";

const deps = {
  getLocalizedValue: (value, fallback) => value || fallback,
  getPostKey: post => String(post.id || ""), normalizeImages: images => images || [],
  formatDate: (date, locale) => `${locale}:${date}`, renderText: text => `<p>${text}</p>`,
  translate: key => key, escapeHtml: value => String(value).replaceAll("<", "&lt;"),
  escapeAttribute: value => String(value), locale: "ru"
};

test("renders localized community post actions", () => {
  const html = renderCommunityPostCard({ id: 7, date: "today", title: "Title", text: "Story" }, deps);
  assert.match(html, /data-community-like-post-id="7"/);
  assert.match(html, /ru:today/);
});

test("renders escaped community gallery", () => {
  const html = renderCommunityPostCard({ title: "Title", images: [{ src: "<photo>", alt: "<alt>" }] }, deps);
  assert.match(html, /data-community-image-src="&lt;photo>"/);
  assert.match(html, /alt="&lt;alt>"/);
});

test("rejects incomplete dependencies", () => {
  assert.throws(() => renderCommunityPostCard({}, {}), /complete rendering dependencies/);
});

test("renders escaped community paragraphs and lists", () => {
  const escapeHtml = value => String(value).replaceAll("<", "&lt;");
  assert.equal(renderCommunityTextBlocks("one\n\n<two>", { escapeHtml }), "<p>one</p><p>&lt;two></p>");
  assert.equal(renderCommunityTextBlocks([{ type: "list", items: ["A", "<B>"] }], { escapeHtml }), "<ul><li>A</li><li>&lt;B></li></ul>");
});

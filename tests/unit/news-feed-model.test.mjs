import test from "node:test";
import assert from "node:assert/strict";
import { countUnreadNews, sortPublishedNews } from "../../src/shared/news-feed-model.js";

const predicates = {
  isPublished: item => item.published !== false,
  isExpired: item => item.expired === true
};

test("filters unavailable news without mutating the source", () => {
  const source = [{ id: 1 }, null, { id: 2, published: false }, { id: 3, expired: true }];
  assert.deepEqual(sortPublishedNews(source, predicates).map(item => item.id), [1]);
  assert.equal(source.length, 4);
});

test("sorts pinned, priority and newest news in that order", () => {
  const items = [
    { id: "old", priority: 1, published_at: "2026-01-01" },
    { id: "new", priority: 1, published_at: "2026-07-13" },
    { id: "priority", priority: 5, published_at: "2025-01-01" },
    { id: "pinned", is_pinned: true, published_at: "2024-01-01" }
  ];
  assert.deepEqual(sortPublishedNews(items, predicates).map(item => item.id), ["pinned", "priority", "new", "old"]);
});

test("counts unread items only in the visible feed", () => {
  const items = [{ read: false }, { read: true }, { read: false, expired: true }];
  assert.equal(countUnreadNews(items, { ...predicates, isRead: item => item.read }), 1);
});

test("rejects missing predicates", () => {
  assert.throws(() => sortPublishedNews([]), /publication predicates/);
  assert.throws(() => countUnreadNews([], predicates), /read predicate/);
});

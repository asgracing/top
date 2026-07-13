import test from "node:test";
import assert from "node:assert/strict";
import { getCommunityLikesText, getCommunityPostKey, sortCommunityPosts } from "../../src/pages/community/feed-model.js";

test("uses explicit id and date fallback for community keys", () => {
  assert.equal(getCommunityPostKey({ id: 42, date: "later" }), "42");
  assert.equal(getCommunityPostKey({ date: "2026-07-13" }), "2026-07-13");
});

test("sorts community posts newest first without mutation", () => {
  const posts = [{ id: "old", date: "2025-01-01" }, { id: "new", date: "2026-07-13" }];
  assert.deepEqual(sortCommunityPosts(posts).map(post => post.id), ["new", "old"]);
  assert.equal(posts[0].id, "old");
});

test("selects localized community like states", () => {
  const deps = { translate: key => key, replaceTokens: (value, tokens) => `${value}:${tokens.value}` };
  assert.equal(getCommunityLikesText({ loading: true }, deps), "communityLikesLoading");
  assert.equal(getCommunityLikesText({ likes: 0 }, deps), "communityLikesZero");
  assert.equal(getCommunityLikesText({ likes: 1 }, deps), "communityLikesOne:1");
  assert.equal(getCommunityLikesText({ likes: 5 }, deps), "communityLikesMany:5");
  assert.equal(getCommunityLikesText({ failed: true }, deps), "communityLikesFailed");
});

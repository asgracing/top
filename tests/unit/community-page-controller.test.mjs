import test from "node:test";
import assert from "node:assert/strict";
import { createCommunityPageController } from "../../src/pages/community/page-controller.js";

function setup() {
  const listeners = {};
  const list = { innerHTML: "", dataset: {}, contains: () => true, addEventListener: (type, listener) => { listeners[type] = listener; } };
  const calls = [];
  const controller = createCommunityPageController({
    documentRef: { getElementById: () => list }, sortPosts: posts => [...posts].reverse(),
    renderPost: post => `<post>${post.id}</post>`, renderLoading: () => "loading", renderEmpty: () => "empty",
    submitLike: id => calls.push(["like", id]), updateLightbox: () => calls.push(["lightbox"]),
    renderLikes: () => calls.push(["likes"])
  });
  return { controller, list, listeners, calls };
}

test("renders sorted posts and post-render callbacks", () => {
  const { controller, list, calls } = setup();
  controller.render({ posts: [{ id: 1 }, { id: 2 }] });
  assert.equal(list.innerHTML, "<post>2</post><post>1</post>");
  assert.deepEqual(calls, [["lightbox"], ["likes"]]);
});

test("renders loading and empty states", () => {
  const { controller, list } = setup();
  controller.render({ loading: true });
  assert.equal(list.innerHTML, "loading");
  controller.render({ posts: [] });
  assert.equal(list.innerHTML, "empty");
});

test("binds delegated like clicks only once", () => {
  const { controller, listeners, calls } = setup();
  controller.render({ posts: [{ id: 1 }] });
  controller.render({ posts: [{ id: 2 }] });
  listeners.click({ target: { closest: () => ({ dataset: { communityLikePostId: "2" } }) }, preventDefault() {} });
  assert.deepEqual(calls.filter(call => call[0] === "like"), [["like", "2"]]);
});

test("rejects incomplete dependencies", () => {
  assert.throws(() => createCommunityPageController({}), /complete dependencies/);
});

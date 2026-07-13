export function createCommunityPageController({
  documentRef, sortPosts, renderPost, renderLoading, renderEmpty,
  submitLike, updateLightbox, renderLikes
}) {
  const dependencies = [sortPosts, renderPost, renderLoading, renderEmpty, submitLike, updateLightbox, renderLikes];
  if (!documentRef || dependencies.some(dependency => typeof dependency !== "function")) {
    throw new TypeError("Community page controller requires complete dependencies");
  }

  let currentPosts = [];

  function bindLikes(list) {
    if (list.dataset.likesBound === "true") return;
    list.addEventListener("click", event => {
      const button = event.target?.closest?.("[data-community-like-post-id]");
      if (!button || !list.contains(button)) return;
      event.preventDefault();
      void submitLike(button.dataset.communityLikePostId);
    });
    list.dataset.likesBound = "true";
  }

  return Object.freeze({
    render({ posts = [], loading = false } = {}) {
      const list = documentRef.getElementById("community-feed");
      if (!list) return;
      if (loading) {
        list.innerHTML = renderLoading();
        return;
      }
      currentPosts = sortPosts(Array.isArray(posts) ? posts : []);
      list.innerHTML = currentPosts.length ? currentPosts.map(renderPost).join("") : renderEmpty();
      updateLightbox();
      bindLikes(list);
      renderLikes();
    },
    getPosts() {
      return [...currentPosts];
    }
  });
}

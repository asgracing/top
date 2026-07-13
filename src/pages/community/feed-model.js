export function getCommunityPostKey(post) {
  return String(post?.id || post?.date || "").trim();
}

export function sortCommunityPosts(posts) {
  return [...(Array.isArray(posts) ? posts : [])].sort((a, b) => {
    const bTime = new Date(b?.date || 0).getTime();
    const aTime = new Date(a?.date || 0).getTime();
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  });
}

export function getCommunityLikesText(state, { translate, replaceTokens }) {
  if (typeof translate !== "function" || typeof replaceTokens !== "function") {
    throw new TypeError("Community likes text requires localization dependencies");
  }
  if (state?.failed) return translate("communityLikesFailed");
  if (!state || state.loading || typeof state.likes !== "number") return translate("communityLikesLoading");
  if (state.likes <= 0) return translate("communityLikesZero");
  return replaceTokens(translate(state.likes === 1 ? "communityLikesOne" : "communityLikesMany"), { value: state.likes });
}

export function renderCommunityTextBlocks(text, { escapeHtml }) {
  if (typeof escapeHtml !== "function") throw new TypeError("Community text blocks require escaping");
  const blocks = Array.isArray(text) ? text : String(text || "").split(/\n{2,}/);
  return blocks.map(block => {
    if (typeof block === "string") {
      const paragraph = block.trim();
      return paragraph ? `<p>${escapeHtml(paragraph)}</p>` : "";
    }
    if (!block || typeof block !== "object") return "";
    if (block.type === "list" && Array.isArray(block.items)) {
      const items = block.items.map(item => String(item || "").trim()).filter(Boolean).map(item => `<li>${escapeHtml(item)}</li>`).join("");
      return items ? `<ul>${items}</ul>` : "";
    }
    const paragraph = String(block.text || "").trim();
    return paragraph ? `<p>${escapeHtml(paragraph)}</p>` : "";
  }).join("");
}

export function renderCommunityPostCard(post, {
  getLocalizedValue, getPostKey, normalizeImages, formatDate,
  renderText, translate, escapeHtml, escapeAttribute, locale
}) {
  const dependencies = [getLocalizedValue, getPostKey, normalizeImages, formatDate,
    renderText, translate, escapeHtml, escapeAttribute];
  if (dependencies.some(dependency => typeof dependency !== "function")) {
    throw new TypeError("Community post view requires complete rendering dependencies");
  }
  const title = getLocalizedValue(post?.title, "-");
  const postId = getPostKey(post);
  const text = getLocalizedValue(post?.text, "");
  const images = normalizeImages(post?.images);
  const dateLabel = formatDate(post?.date, locale);
  return `
    <article class="community-feed-card reveal">
      <div class="community-feed-copy">
        <time class="community-feed-date" datetime="${escapeAttribute(post?.date || "")}">${escapeHtml(dateLabel)}</time>
        <h3 class="community-feed-title">${escapeHtml(title)}</h3>
        <div class="community-feed-text">${renderText(text)}</div>
        ${postId ? `<div class="community-feed-actions">
          <button class="community-like-btn" type="button" data-community-like-post-id="${escapeHtml(postId)}" aria-pressed="false">
            <span class="community-like-heart" aria-hidden="true">&hearts;</span>
            <span data-community-like-label>${escapeHtml(translate("communityLikeButton"))}</span>
          </button>
          <span class="community-like-count" data-community-like-count>${escapeHtml(translate("communityLikesLoading"))}</span>
        </div>` : ""}
      </div>
      ${images.length ? `<div class="community-feed-gallery community-feed-gallery-${images.length}">${images.map(image => {
        const alt = getLocalizedValue(image.alt, title);
        const src = String(image.src || "");
        return `<figure class="community-feed-photo"><button class="community-feed-photo-btn" type="button" data-community-image-src="${escapeHtml(src)}" data-community-image-alt="${escapeHtml(alt)}" aria-label="${escapeHtml(translate("communityOpenImageLabel"))}: ${escapeHtml(alt)}"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" /></button></figure>`;
      }).join("")}</div>` : ""}
    </article>`;
}

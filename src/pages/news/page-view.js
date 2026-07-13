export function createNewsPageView({
  documentRef, translate, escapeHtml, escapeAttribute, formatDateTime,
  getArticleHref, getListHref, renderThumb, markRead, onReadStateChanged
}) {
  const dependencies = [translate, escapeHtml, escapeAttribute, formatDateTime, getArticleHref,
    getListHref, renderThumb, markRead, onReadStateChanged];
  if (!documentRef || dependencies.some(dependency => typeof dependency !== "function")) {
    throw new TypeError("News page view requires complete rendering dependencies");
  }

  const elements = () => ({
    list: documentRef.getElementById("news-feed"),
    article: documentRef.getElementById("news-article"),
    title: documentRef.getElementById("news-page-title"),
    subtitle: documentRef.getElementById("news-page-subtitle")
  });
  let currentItems = [];

  function renderBody(blocks) {
    return (Array.isArray(blocks) ? blocks : [blocks]).map(block => {
      if (typeof block === "string") return `<p>${escapeHtml(block)}</p>`;
      if (block?.type === "list" && Array.isArray(block.items)) {
        return `<ul>${block.items.map(item => `<li>${escapeHtml(String(item || ""))}</li>`).join("")}</ul>`;
      }
      if (block?.type === "link" && block.href) {
        const href = String(block.href).trim();
        return `<p><a class="news-inline-link" href="${escapeHtml(href)}">${escapeHtml(String(block.label || href).trim())}</a></p>`;
      }
      return "";
    }).join("");
  }

  function renderList(items, refs) {
    refs.title.textContent = translate("newsPageTitle");
    refs.subtitle.textContent = translate("newsPageSubtitle");
    refs.article.hidden = true;
    refs.list.hidden = false;
    refs.list.innerHTML = items.length ? items.map(item => `
      <article class="news-feed-card">
        <a class="news-feed-card-link" href="${escapeHtml(getArticleHref(item.slug))}" data-news-open-slug="${escapeHtml(item.slug)}">
          ${renderThumb(item, "news-feed-thumb")}
          <div class="news-feed-copy">
            <time class="news-feed-date" datetime="${escapeAttribute(item.published_at || "")}">${escapeHtml(formatDateTime(item.published_at))}</time>
            <h2 class="news-feed-title">${escapeHtml(item.title)}</h2>
            <p class="news-feed-summary">${escapeHtml(item.summary || "")}</p>
            <span class="news-feed-cta">${escapeHtml(translate("newsReadMore"))}</span>
          </div>
        </a>
      </article>`).join("") : `<div class="empty-box">${escapeHtml(translate("newsListEmpty"))}</div>`;
  }

  function renderDetail(item, refs) {
    markRead(item);
    onReadStateChanged();
    refs.title.textContent = item.title;
    refs.subtitle.textContent = formatDateTime(item.published_at);
    refs.list.hidden = true;
    refs.article.hidden = false;
    refs.article.innerHTML = `
      <a class="news-back-link" href="${escapeHtml(getListHref())}">${escapeHtml(translate("newsBackToList"))}</a>
      <article class="news-article-card">
        ${item.cover_image_url ? `<div class="news-article-cover-wrap"><img class="news-article-cover" src="${escapeHtml(item.cover_image_url)}" alt="${escapeHtml(item.image_alt || item.title)}" loading="lazy" /></div>` : ""}
        <div class="news-article-body">${renderBody(item.body)}</div>
      </article>`;
  }

  function renderMissing(refs) {
    refs.title.textContent = translate("newsPageTitle");
    refs.subtitle.textContent = "";
    refs.list.hidden = true;
    refs.article.hidden = false;
    refs.article.innerHTML = `<a class="news-back-link" href="${escapeHtml(getListHref())}">${escapeHtml(translate("newsBackToList"))}</a><div class="empty-box">${escapeHtml(translate("newsArticleMissing"))}</div>`;
  }

  return Object.freeze({
    render({ items = [], slug = "" } = {}) {
      const refs = elements();
      if (Object.values(refs).some(element => !element)) return;
      const normalizedItems = Array.isArray(items) ? items : [];
      currentItems = normalizedItems;
      const item = slug ? normalizedItems.find(entry => entry.slug === slug) : null;
      if (item) renderDetail(item, refs);
      else if (slug) renderMissing(refs);
      else renderList(normalizedItems, refs);

      if (refs.list.dataset.bound !== "true") {
        refs.list.addEventListener("click", event => {
          const link = event.target?.closest?.("[data-news-open-slug]");
          const selected = link && currentItems.find(entry => entry.slug === link.dataset.newsOpenSlug);
          if (selected) markRead(selected);
        });
        refs.list.dataset.bound = "true";
      }
    }
  });
}

export function sortPublishedNews(items, { isPublished, isExpired } = {}) {
  if (typeof isPublished !== "function" || typeof isExpired !== "function") {
    throw new TypeError("News feed sorting requires publication predicates");
  }
  return [...(Array.isArray(items) ? items : [])]
    .filter(Boolean)
    .filter(isPublished)
    .filter(item => !isExpired(item))
    .sort((a, b) => {
      if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) return a.is_pinned ? -1 : 1;
      const priorityDifference = (Number(b.priority) || 0) - (Number(a.priority) || 0);
      if (priorityDifference) return priorityDifference;
      return (Date.parse(String(b.published_at || "")) || 0)
        - (Date.parse(String(a.published_at || "")) || 0);
    });
}

export function countUnreadNews(items, { isPublished, isExpired, isRead } = {}) {
  if (typeof isRead !== "function") throw new TypeError("Unread news count requires a read predicate");
  return sortPublishedNews(items, { isPublished, isExpired }).filter(item => !isRead(item)).length;
}

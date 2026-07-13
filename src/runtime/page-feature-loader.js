const PAGE_FEATURE_PATHS = Object.freeze({
  bans: ["../pages/bans/index.js"],
  cars: ["../pages/cars/model.js", "../pages/cars/table-view.js", "../pages/cars/summary-view.js", "../pages/cars/index.js"],
  community: ["../pages/community/feed-model.js", "../pages/community/post-view.js", "../pages/community/page-controller.js", "../pages/community/index.js"],
  driver: ["../pages/driver/best-laps-model.js", "../pages/driver/track-select-view.js", "../pages/driver/penalty-list-view.js", "../pages/driver/tables-model.js", "../pages/driver/tables-view.js", "../pages/driver/highlights-view.js", "../pages/driver/summary-view.js", "../pages/driver/stats-controller.js", "../pages/driver/profile-model.js", "../pages/driver/index.js"],
  "fun-stats": ["../pages/fun-stats/period-model.js", "../pages/fun-stats/cards-view.js", "../pages/fun-stats/aggregation-model.js", "../pages/fun-stats/index.js"],
  news: ["../pages/news/page-view.js", "../pages/news/index.js"],
  races: ["../pages/races/model.js", "../pages/races/table-view.js", "../pages/races/summary-view.js", "../pages/races/index.js"],
});

export async function loadPageFeatures(page, importer = path => import(path)) {
  if (typeof importer !== "function") throw new TypeError("Page feature loader requires an importer");
  const paths = PAGE_FEATURE_PATHS[page] || [];
  const modules = await Promise.all(paths.map(path => importer(path)));
  return Object.freeze(Object.assign({}, ...modules));
}

export function getPageFeaturePaths(page) {
  return [...(PAGE_FEATURE_PATHS[page] || [])];
}

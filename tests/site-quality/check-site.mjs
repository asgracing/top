import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const [html, legacyCss, heroLayoutCss, heroServerSummaryCss, js, pageFeatureLoader] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "styles.css"), "utf8"),
  readFile(resolve(root, "styles/components/hero-layout.css"), "utf8"),
  readFile(resolve(root, "styles/components/hero-server-summary.css"), "utf8"),
  readFile(resolve(root, "app.js"), "utf8"),
  readFile(resolve(root, "src/runtime/page-feature-loader.js"), "utf8")
]);
const css = `${legacyCss}\n${heroLayoutCss}\n${heroServerSummaryCss}`;
const failures = [];
const pageFeatureIsLoaded = path => pageFeatureLoader.includes(`"${path}"`);
const pageEntrypoints = {
  home: ["index.html", "./src/entrypoints/home.js"],
  races: ["races/index.html", "../src/entrypoints/races.js"],
  driver: ["driver/index.html", "../src/entrypoints/driver.js"],
  cars: ["cars/index.html", "../src/entrypoints/cars.js"],
  "fun-stats": ["fun-stats/index.html", "../src/entrypoints/fun-stats.js"],
  community: ["community/index.html", "../src/entrypoints/community.js"],
  news: ["news/index.html", "../src/entrypoints/news.js"],
  bans: ["bans/index.html", "../src/entrypoints/bans.js"]
};
for (const [page, [htmlPath, entrySrc]] of Object.entries(pageEntrypoints)) {
  const [pageHtml, entrySource] = await Promise.all([
    readFile(resolve(root, htmlPath), "utf8"),
    readFile(resolve(root, `src/entrypoints/${page}.js`), "utf8")
  ]);
  if (!pageHtml.includes(`type="module" src="${entrySrc}`)) failures.push(`${page} page is missing its module entrypoint`);
  if (/src=["'][^"']*app\.js/.test(pageHtml)) failures.push(`${page} page still loads app.js directly`);
  if (!entrySource.includes(`bootstrapLegacyPage("${page}")`)) failures.push(`${page} entrypoint has the wrong page identity`);
}
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicates.length) failures.push(`Duplicate HTML ids: ${duplicates.join(", ")}`);

const dialogTags = [...html.matchAll(/<[^>]+\brole="dialog"[^>]*>/g)].map(match => match[0]);
for (const [index, tag] of dialogTags.entries()) {
  if (!/\baria-modal="true"/.test(tag)) failures.push(`Dialog ${index + 1} is missing aria-modal="true"`);
  const labelledBy = tag.match(/\baria-labelledby="([^"]+)"/)?.[1];
  if (!labelledBy) failures.push(`Dialog ${index + 1} is missing aria-labelledby`);
  else if (!ids.includes(labelledBy)) failures.push(`Dialog ${index + 1} references missing label id: ${labelledBy}`);
  const describedBy = tag.match(/\baria-describedby="([^"]+)"/)?.[1];
  if (describedBy && !ids.includes(describedBy)) failures.push(`Dialog ${index + 1} references missing description id: ${describedBy}`);
}
if (/<th[^>]*\brole="button"/i.test(html) || /<th[^>]*\brole=["']button["']/i.test(js)) {
  failures.push("Sortable table headers must use nested native buttons instead of th role=button");
}
if (!css.includes(".table-sort-button:focus-visible")) failures.push("Sortable table buttons are missing a visible focus style");
if (!css.includes("@media (pointer: coarse)")) failures.push("Coarse-pointer touch targets are missing");
if (!js.includes('readPageContext(document)')) failures.push("Legacy application is missing the explicit page context");
if (!js.includes("await loadPageFeatures(PAGE_CONTEXT.page)") || /from "\.\/src\/pages\/(?:bans|cars|community|driver|races)\//.test(js)) failures.push("Child page features must be loaded only for the active route");
if (!pageFeatureIsLoaded("../pages/fun-stats/aggregation-model.js") || !js.includes("aggregateFunStatsFallback({") || js.includes("const driverMap = new Map()")) failures.push("Fun Stats fallback aggregation must use only its route-loaded model");
if (!pageFeatureIsLoaded("../pages/fun-stats/index.js") || !js.includes("const funStatsPage = IS_FUN_STATS_PAGE ? createFunStatsPage({")) failures.push("Fun Stats lifecycle must use its route-loaded page module");
for (const [path, factory] of [
  ["../pages/cars/index.js", "createCarsPage"], ["../pages/races/index.js", "createRacesPage"],
  ["../pages/driver/index.js", "createDriverPage"], ["../pages/news/index.js", "createNewsPage"],
  ["../pages/community/index.js", "createCommunityPage"], ["../pages/bans/index.js", "createBansPage"],
]) {
  if (!pageFeatureIsLoaded(path) || !js.includes(`${factory}({`)) failures.push(`${factory} must compose a route-loaded page lifecycle`);
}
if (js.slice(0, 1000).includes("window.location.pathname")) failures.push("Application bootstrap must not infer its page from pathname");
if (!js.includes("runWhenDocumentReady(document")) failures.push("Application must use the tested async document bootstrap");
if (!js.includes('from "./src/shared/modal-controller.js"') || js.includes("function createModalController({")) failures.push("Modal focus and inert behavior must live outside app.js");
if (!js.includes('from "./src/shared/table-model.js"') || js.includes("function parseNumeric(") || js.includes("function parseLapTime(")) failures.push("Shared table sorting model must live outside app.js");
if (!pageFeatureIsLoaded("../pages/bans/index.js") || js.includes("function renderBansTable()") || js.includes("function renderBansSummary()") || js.includes("const bansPageView = createBansPageView")) failures.push("Bans page rendering must live outside app.js and initialize after shared DOM modules");
if (!js.includes('from "./src/shared/news-feed-model.js"') || js.includes("return [...items]")) failures.push("Shared news feed sorting model must live outside app.js");
if (/^import .*\.\/src\/pages\/(?!home\/)/m.test(js)) failures.push("Shared runtime must not statically import child page modules");
if (!pageFeatureIsLoaded("../pages/news/page-view.js") || js.includes("function renderNewsListPage(") || js.includes("function renderNewsDetailPage(")) failures.push("News page rendering must live outside app.js");
if (!pageFeatureIsLoaded("../pages/community/feed-model.js") || js.includes("const sortedPosts = [...posts].sort")) failures.push("Community feed model must live outside app.js");
if (!pageFeatureIsLoaded("../pages/community/post-view.js") || js.includes('class="community-feed-card reveal"')) failures.push("Community post rendering must live outside app.js");
if (js.includes("const blocks = Array.isArray(text)")) failures.push("Community text block rendering must live outside app.js");
if (!pageFeatureIsLoaded("../pages/community/page-controller.js") || js.includes("function bindCommunityLikeControls()") || js.includes("const communityPageController = createCommunityPageController")) failures.push("Community page lifecycle must use a lazy external controller");
if (!pageFeatureIsLoaded("../pages/cars/model.js") || js.includes("const carsColumns = [") || js.includes("function filterCars(")) failures.push("Cars table model must live outside app.js");
if (!pageFeatureIsLoaded("../pages/cars/table-view.js") || js.includes('bindSortableHeaders("#cars-table') || js.includes("const carsTableView = createCarsTableView")) failures.push("Cars table rendering must use a lazy external view");
if (!pageFeatureIsLoaded("../pages/cars/summary-view.js") || js.includes('document.getElementById("cars-total-count")') || js.includes("const carsSummaryView = createCarsSummaryView")) failures.push("Cars summary must use a lazy external view");
if (!pageFeatureIsLoaded("../pages/races/model.js") || js.includes("const racesColumns = [") || js.includes("function filterRaces(") || js.includes("const isV2PagedArchive") || js.includes("const winnerCounts = new Map()")) failures.push("Races table, pagination and summary model must live outside app.js");
if (!pageFeatureIsLoaded("../pages/races/table-view.js") || js.includes('table class="races-table"') || js.includes("const racesTableView = createRacesTableView")) failures.push("Races table rendering must use a lazy external view");
if (!pageFeatureIsLoaded("../pages/races/summary-view.js") || js.includes('document.getElementById("races-total-count")') || js.includes("const racesSummaryView = createRacesSummaryView")) failures.push("Races summary rendering must use a lazy external view");
if (!pageFeatureIsLoaded("../pages/driver/best-laps-model.js") || js.includes("item?.best_lap_track ||")) failures.push("Driver best-lap selection model must live outside app.js");
if (!pageFeatureIsLoaded("../pages/driver/profile-model.js") || js.includes("const counts = new Map()")) failures.push("Driver rank and favorite-car models must live outside app.js");
if (!pageFeatureIsLoaded("../pages/driver/highlights-view.js") || js.includes('class="driver-highlight-card"')) failures.push("Driver highlights markup must live outside app.js");
if (!pageFeatureIsLoaded("../pages/driver/tables-view.js") || js.includes('class="is-interactive-row"\n      data-race-id')) failures.push("Driver table row markup must live outside app.js");
if (!pageFeatureIsLoaded("../pages/driver/summary-view.js") || js.includes('class="driver-stat-card"') || js.includes('class="driver-title-name"')) failures.push("Driver hero and summary markup must live outside app.js");
if (!pageFeatureIsLoaded("../pages/driver/stats-controller.js") || js.includes("function bindDriverBestlapTracksButton(") || js.includes("function bindBestLapTrackSelect(") || js.includes("function bindAveragePaceTrackSelect(")) failures.push("Driver statistic interactions must use the external controller");
if (!pageFeatureIsLoaded("../pages/driver/page-view.js") || js.includes("if (topLoadState.driver) {")) failures.push("Driver page DOM states must use the external view");
if (!pageFeatureIsLoaded("../pages/driver/preview-view.js") || js.includes('document.getElementById("driver-preview-title")')) failures.push("Driver preview DOM states must use the external view");
if (!pageFeatureIsLoaded("../pages/fun-stats/period-controller.js") || js.includes('button.addEventListener("click", () => {\n      const nextPeriod = button.dataset.funPeriod')) failures.push("Fun Stats period controls must use the external lifecycle controller");
if (!pageFeatureIsLoaded("../pages/fun-stats/page-view.js") || js.includes("pointsBoss && renderFunStatsAwardCard")) failures.push("Fun Stats DOM rendering must use the external page view");
if (js.includes("Array.isArray(profile?.average_pace_by_track)")) failures.push("Driver average-pace selection model must live outside app.js");
if (!js.includes("function initializeSharedControls()") || !js.includes("function initializeHomeControllers()") || !js.includes("function initializePageControllers()")) failures.push("Application init must keep shared and page controller initialization separated");
if (!js.includes("async function initializeHomeData()") || !js.includes("function applyHomeSiteData(data)")) failures.push("Home data loading and application must stay outside the shared init body");
if (!js.includes("const pageDataInitializers = Object.freeze({") || !js.includes("const pageOrchestrator = createPageOrchestrator({")) failures.push("Page data initialization must use the explicit runtime orchestrator");
if (!js.includes("const pageInitializationErrorHandlers = Object.freeze({")) failures.push("Page initialization errors must use the explicit handler registry");
if (!js.includes("function initializeWindowLifecycle()") || /window\.addEventListener\("(?:storage|resize|pagehide)"/.test(js)) failures.push("Global window listeners must be owned by the application lifecycle");
if (!js.includes('from "./src/pages/home/stats-config.js"') || /const (?:leaderboardColumns|bestlapsColumns|HOME_STATS_TABS)\s*=/.test(js)) failures.push("Home statistics configuration must live outside app.js");
if (!js.includes('from "./src/pages/home/stats-model.js"') || js.includes("const trackFiltered = bestlapsTrackFilter")) failures.push("Home statistics filtering must live outside app.js");
if (!js.includes('from "./src/pages/home/deferred-sections.js"') || js.includes("topHomeDeferredObserver")) failures.push("Home deferred-section observation must live outside app.js");
if (!js.includes('from "./src/pages/home/stats-tabs-controller.js"') || js.includes("combinedStatsTabsBound") || js.includes("hostedCombinedStatsTab")) failures.push("Home statistics tab behavior must live outside app.js");
if (!js.includes('from "./src/pages/home/index.js"') || !js.includes("const homePage = createHomePage({")) failures.push("Home lifecycle must be composed through the home page module");
if (!js.includes('from "./src/pages/home/view-state-config.js"') || js.includes('["leaderboard-table", "leaderboard-pagination-wrap", "errorLeaderboard"]')) failures.push("Home loading and error table states must live outside app.js");
if (!css.includes("@layer reset, base, layout, components, pages, utilities, legacy, overrides;")) failures.push("CSS must declare the controlled R11 cascade order");
if (!css.includes("@layer legacy {") || !css.includes("} /* end legacy */")) failures.push("Unmigrated CSS must remain inside the explicit legacy layer");
if (css.indexOf("@layer legacy {") >= css.indexOf("} /* end legacy */") || css.indexOf("@layer overrides {") <= css.indexOf("} /* end legacy */")) failures.push("Consolidated CSS must follow the complete legacy migration boundary");
if (/\.hero-server-total-stat\s*,\s*\.support-sticky-widget/.test(css)) failures.push("Hero total players card must not be part of the hidden legacy support group");
if (!html.includes('./styles/components/hero-server-summary.css?v=20260713r11css1')) failures.push("Home must load the extracted hero server summary component after styles.css");
if (legacyCss.includes("Consolidated hero server summary") || !heroServerSummaryCss.includes(".hero-server-total-stat")) failures.push("Hero server summary must have one physical component source");
if (!html.includes('./styles/components/hero-layout.css?v=20260713r11css2') || !heroLayoutCss.includes("@media (min-width: 1181px)")) failures.push("Home must load the extracted responsive hero layout component");
if (legacyCss.includes(".hero-hourly-card.is-championship-event {") && legacyCss.slice(legacyCss.indexOf("@layer overrides {")).includes(".hero-hourly-card.is-championship-event {")) failures.push("Final championship hero skin must live outside the legacy stylesheet");
const budgets = {
  important: [(css.match(/!important/g) || []).length, 12],
  mediaQuery: [(css.match(/@media\b/g) || []).length, 56],
  zIndex: [(css.match(/\bz-index\s*:/g) || []).length, 48],
  hexColor: [(css.match(/#[0-9a-f]{3,8}\b/gi) || []).length, 252],
  silentCatch: [(js.match(/\.catch\(\(\)\s*=>\s*null\)/g) || []).length, 28],
  inlineStyle: [(html.match(/\bstyle=/g) || []).length, 10],
  directFetch: [(js.match(/\bfetch\s*\(/g) || []).length, 0],
  innerHtmlWrite: [(js.match(/\.innerHTML\s*=/g) || []).length, 91],
};
for (const [name, [actual, maximum]] of Object.entries(budgets)) if (actual > maximum) failures.push(`${name} budget exceeded: ${actual} > ${maximum}`);
if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
else console.log(JSON.stringify({ ids: ids.length, dialogs: dialogTags.length, ...Object.fromEntries(Object.entries(budgets).map(([key, [value]]) => [key, value])) }, null, 2));

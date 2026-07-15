import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const [html, tokensCss, baseCss, siteBackgroundCss, topNavigationCss, languageSwitchCss, buttonsCss, heroFoundationCss, heroActionsCss, heroStatsCss, serverStickyLayoutCss, sectionsCss, supportWidgetCss, tableControlsCss, topThreeCss, tablesCss, paginationCss, modalsCss, serverPlayersModalCss, todayStatsModalCss, activityControlsCss, activitySummaryCss, hourlyEventModalCss, driverDayModalCss, footerCss, utilitiesCss, responsiveCss, legacyCss, heroLayoutCss, heroServerSummaryCss, js, pageFeatureLoader] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "styles/tokens.css"), "utf8"),
  readFile(resolve(root, "styles/base.css"), "utf8"),
  readFile(resolve(root, "styles/components/site-background.css"), "utf8"),
  readFile(resolve(root, "styles/components/top-navigation.css"), "utf8"),
  readFile(resolve(root, "styles/components/language-switch.css"), "utf8"),
  readFile(resolve(root, "styles/components/buttons.css"), "utf8"),
  readFile(resolve(root, "styles/components/hero-foundation.css"), "utf8"),
  readFile(resolve(root, "styles/components/hero-actions.css"), "utf8"),
  readFile(resolve(root, "styles/components/hero-stats.css"), "utf8"),
  readFile(resolve(root, "styles/components/server-sticky-layout.css"), "utf8"),
  readFile(resolve(root, "styles/components/sections.css"), "utf8"),
  readFile(resolve(root, "styles/components/support-widget.css"), "utf8"),
  readFile(resolve(root, "styles/components/table-controls.css"), "utf8"),
  readFile(resolve(root, "styles/components/top-three.css"), "utf8"),
  readFile(resolve(root, "styles/components/tables.css"), "utf8"),
  readFile(resolve(root, "styles/components/pagination.css"), "utf8"),
  readFile(resolve(root, "styles/components/modals.css"), "utf8"),
  readFile(resolve(root, "styles/components/server-players-modal.css"), "utf8"),
  readFile(resolve(root, "styles/components/today-stats-modal.css"), "utf8"),
  readFile(resolve(root, "styles/components/activity-controls.css"), "utf8"),
  readFile(resolve(root, "styles/components/activity-summary.css"), "utf8"),
  readFile(resolve(root, "styles/components/hourly-event-modal.css"), "utf8"),
  readFile(resolve(root, "styles/components/driver-day-modal.css"), "utf8"),
  readFile(resolve(root, "styles/components/footer.css"), "utf8"),
  readFile(resolve(root, "styles/utilities.css"), "utf8"),
  readFile(resolve(root, "styles/responsive.css"), "utf8"),
  readFile(resolve(root, "styles.css"), "utf8"),
  readFile(resolve(root, "styles/components/hero-layout.css"), "utf8"),
  readFile(resolve(root, "styles/components/hero-server-summary.css"), "utf8"),
  readFile(resolve(root, "app.js"), "utf8"),
  readFile(resolve(root, "src/runtime/page-feature-loader.js"), "utf8")
]);
const css = `${tokensCss}\n${baseCss}\n${siteBackgroundCss}\n${topNavigationCss}\n${languageSwitchCss}\n${buttonsCss}\n${heroFoundationCss}\n${heroActionsCss}\n${heroStatsCss}\n${serverStickyLayoutCss}\n${sectionsCss}\n${supportWidgetCss}\n${tableControlsCss}\n${topThreeCss}\n${tablesCss}\n${paginationCss}\n${modalsCss}\n${serverPlayersModalCss}\n${todayStatsModalCss}\n${activityControlsCss}\n${activitySummaryCss}\n${hourlyEventModalCss}\n${driverDayModalCss}\n${footerCss}\n${utilitiesCss}\n${legacyCss}\n${responsiveCss}\n${heroLayoutCss}\n${heroServerSummaryCss}`;
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
  const tokenHref = page === "home" ? "./styles/tokens.css?v=20260713r11tokens1" : "../styles/tokens.css?v=20260713r11tokens1";
  if (!pageHtml.includes(tokenHref)) failures.push(`${page} page is missing the shared token stylesheet`);
  const baseHref = page === "home" ? "./styles/base.css?v=20260713r11base1" : "../styles/base.css?v=20260713r11base1";
  if (!pageHtml.includes(baseHref)) failures.push(`${page} page is missing the shared base stylesheet`);
  const backgroundHref = page === "home" ? "./styles/components/site-background.css?v=20260713r11background1" : "../styles/components/site-background.css?v=20260713r11background1";
  if (!pageHtml.includes(backgroundHref)) failures.push(`${page} page is missing the shared site background stylesheet`);
  const navigationHref = page === "home" ? "./styles/components/top-navigation.css?v=20260713r11nav1" : "../styles/components/top-navigation.css?v=20260713r11nav1";
  if (!pageHtml.includes(navigationHref)) failures.push(`${page} page is missing the shared top navigation stylesheet`);
  const languageHref = page === "home" ? "./styles/components/language-switch.css?v=20260713r11lang1" : "../styles/components/language-switch.css?v=20260713r11lang1";
  if (!pageHtml.includes(languageHref)) failures.push(`${page} page is missing the shared language switch stylesheet`);
  const buttonsHref = page === "home" ? "./styles/components/buttons.css?v=20260713r11buttons1" : "../styles/components/buttons.css?v=20260713r11buttons1";
  if (!pageHtml.includes(buttonsHref)) failures.push(`${page} page is missing the shared button stylesheet`);
  const heroHref = page === "home" ? "./styles/components/hero-foundation.css?v=20260713r11hero1" : "../styles/components/hero-foundation.css?v=20260713r11hero1";
  if (!pageHtml.includes(heroHref)) failures.push(`${page} page is missing the shared hero foundation stylesheet`);
  const heroActionsHref = page === "home" ? "./styles/components/hero-actions.css?v=20260713r11heroactions1" : "../styles/components/hero-actions.css?v=20260713r11heroactions1";
  if (!pageHtml.includes(heroActionsHref)) failures.push(`${page} page is missing the shared hero actions stylesheet`);
  const heroStatsHref = page === "home" ? "./styles/components/hero-stats.css?v=20260713r11herostats3" : "../styles/components/hero-stats.css?v=20260713r11herostats3";
  if (!pageHtml.includes(heroStatsHref)) failures.push(`${page} page is missing the shared hero stats stylesheet`);
  const serverStickyLayoutHref = page === "home" ? "./styles/components/server-sticky-layout.css?v=20260715r11serversticky1" : "../styles/components/server-sticky-layout.css?v=20260715r11serversticky1";
  if (!pageHtml.includes(serverStickyLayoutHref)) failures.push(`${page} page is missing the server sticky layout stylesheet`);
  const sectionsHref = page === "home" ? "./styles/components/sections.css?v=20260715r11sections1" : "../styles/components/sections.css?v=20260715r11sections1";
  if (!pageHtml.includes(sectionsHref)) failures.push(`${page} page is missing the shared sections stylesheet`);
  const supportWidgetHref = page === "home" ? "./styles/components/support-widget.css?v=20260715r11support1" : "../styles/components/support-widget.css?v=20260715r11support1";
  if (!pageHtml.includes(supportWidgetHref)) failures.push(`${page} page is missing the support widget stylesheet`);
  const tableControlsHref = page === "home" ? "./styles/components/table-controls.css?v=20260715r11tablecontrols1" : "../styles/components/table-controls.css?v=20260715r11tablecontrols1";
  if (!pageHtml.includes(tableControlsHref)) failures.push(`${page} page is missing the table controls stylesheet`);
  const topThreeHref = page === "home" ? "./styles/components/top-three.css?v=20260715r11topthree1" : "../styles/components/top-three.css?v=20260715r11topthree1";
  if (!pageHtml.includes(topThreeHref)) failures.push(`${page} page is missing the Top-3 stylesheet`);
  const tablesHref = page === "home" ? "./styles/components/tables.css?v=20260715r11tables1" : "../styles/components/tables.css?v=20260715r11tables1";
  if (!pageHtml.includes(tablesHref)) failures.push(`${page} page is missing the shared tables stylesheet`);
  const paginationHref = page === "home" ? "./styles/components/pagination.css?v=20260715r11pagination1" : "../styles/components/pagination.css?v=20260715r11pagination1";
  if (!pageHtml.includes(paginationHref)) failures.push(`${page} page is missing the shared pagination stylesheet`);
  const modalsHref = page === "home" ? "./styles/components/modals.css?v=20260715r11modals1" : "../styles/components/modals.css?v=20260715r11modals1";
  if (!pageHtml.includes(modalsHref)) failures.push(`${page} page is missing the modal foundation stylesheet`);
  const serverPlayersModalHref = page === "home" ? "./styles/components/server-players-modal.css?v=20260715r11serverplayers1" : "../styles/components/server-players-modal.css?v=20260715r11serverplayers1";
  if (!pageHtml.includes(serverPlayersModalHref)) failures.push(`${page} page is missing the server players modal stylesheet`);
  const todayStatsModalHref = page === "home" ? "./styles/components/today-stats-modal.css?v=20260715r11todaystats1" : "../styles/components/today-stats-modal.css?v=20260715r11todaystats1";
  if (!pageHtml.includes(todayStatsModalHref)) failures.push(`${page} page is missing the today stats modal stylesheet`);
  const activityControlsHref = page === "home" ? "./styles/components/activity-controls.css?v=20260715r11activitycontrols1" : "../styles/components/activity-controls.css?v=20260715r11activitycontrols1";
  if (!pageHtml.includes(activityControlsHref)) failures.push(`${page} page is missing the activity controls stylesheet`);
  const activitySummaryHref = page === "home" ? "./styles/components/activity-summary.css?v=20260715r11activitysummary1" : "../styles/components/activity-summary.css?v=20260715r11activitysummary1";
  if (!pageHtml.includes(activitySummaryHref)) failures.push(`${page} page is missing the activity summary stylesheet`);
  const hourlyEventModalHref = page === "home" ? "./styles/components/hourly-event-modal.css?v=20260715r11hourlymodal1" : "../styles/components/hourly-event-modal.css?v=20260715r11hourlymodal1";
  if (!pageHtml.includes(hourlyEventModalHref)) failures.push(`${page} page is missing the hourly event modal stylesheet`);
  for (const href of [
    `${page === "home" ? "./" : "../"}styles/components/driver-day-modal.css?v=20260715r11driverday1`,
    `${page === "home" ? "./" : "../"}styles/components/footer.css?v=20260715r11footer1`,
    `${page === "home" ? "./" : "../"}styles/utilities.css?v=20260715r11utilities1`,
    `${page === "home" ? "./" : "../"}styles/responsive.css?v=20260715r11responsive1`
  ]) if (!pageHtml.includes(href)) failures.push(`${page} page is missing R11 stylesheet ${href}`);
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
if (!css.includes("@layer tokens, reset, base, layout, components, pages, utilities, legacy, overrides;")) failures.push("CSS must declare the controlled R11 cascade order");
if (!css.includes("@layer legacy {") || !css.includes("} /* end legacy */")) failures.push("Unmigrated CSS must remain inside the explicit legacy layer");
if (css.indexOf("@layer legacy {") >= css.indexOf("} /* end legacy */") || css.indexOf("@layer overrides {") <= css.indexOf("} /* end legacy */")) failures.push("Consolidated CSS must follow the complete legacy migration boundary");
if (/\.hero-server-total-stat\s*,\s*\.support-sticky-widget/.test(css)) failures.push("Hero total players card must not be part of the hidden legacy support group");
if (!html.includes('./styles/components/hero-server-summary.css?v=20260715r12cards3')) failures.push("Home must load the extracted hero server summary component after styles.css");
if (legacyCss.includes("Consolidated hero server summary") || !heroServerSummaryCss.includes(".hero-server-total-stat")) failures.push("Hero server summary must have one physical component source");
if (!heroServerSummaryCss.includes("grid-template-columns: minmax(0, 1fr) auto;") || !heroServerSummaryCss.includes("font-variant-numeric: tabular-nums;")) failures.push("Hero paired mini stats must reserve independent label and numeric columns");
if (!heroServerSummaryCss.includes("grid-template-rows: repeat(2, minmax(62px, auto));") || !heroServerSummaryCss.includes(".hero-side-compact > .hero-server-total-stat") || !heroServerSummaryCss.includes(".hero-side-compact > .mini-stat-drivers-count") || !heroServerSummaryCss.includes("grid-template-columns: repeat(2, minmax(0, 1fr));")) failures.push("Hero mini stats must preserve the explicit desktop 2x2 grid");
if (html.includes('<div class="hero-stats-row">') || heroServerSummaryCss.includes("overflow-wrap: anywhere")) failures.push("Hero mini stats must not use the conflicting nested grid or letter-by-letter label wrapping");
if (!html.includes('./styles/components/hero-layout.css?v=20260715r12mobile6') || !heroLayoutCss.includes("@media (min-width: 1181px)")) failures.push("Home must load the extracted responsive hero layout component");
if (!heroLayoutCss.includes(".hero-actions.hero-actions-stacked-mobile > .hero-side") || !heroLayoutCss.includes("flex-direction: column;") || !heroLayoutCss.includes("order: 4;")) failures.push("Mobile hero actions must use an explicit non-overlapping vertical flow");
if (!/\.hero-grid\s*\{\s*display:\s*flex;\s*flex-direction:\s*column;/s.test(heroLayoutCss) || !heroLayoutCss.includes("grid-area: auto;") || !heroLayoutCss.includes(".support-inline-widget.support-center-widget { order: 3; }")) failures.push("Mobile hero sections must use normal vertical flow without overlapping grid areas");
if (legacyCss.includes(".hero-hourly-card.is-championship-event {") && legacyCss.slice(legacyCss.indexOf("@layer overrides {")).includes(".hero-hourly-card.is-championship-event {")) failures.push("Final championship hero skin must live outside the legacy stylesheet");
if (!tokensCss.includes("@layer tokens {") || !tokensCss.includes("--layer-modal-priority: 100000;") || legacyCss.includes("--bg: #0b0f14")) failures.push("Design tokens must have one physical source in styles/tokens.css");
if (!baseCss.includes("@layer reset {") || !baseCss.includes("@layer base {") || !baseCss.includes("@layer layout {") || legacyCss.includes("/* ===== RESET / BASE ===== */")) failures.push("Reset and shared document foundations must have one physical source in styles/base.css");
if (!siteBackgroundCss.includes("@layer components {") || !siteBackgroundCss.includes(".site-video-bg") || legacyCss.includes("/* ===== VIDEO BACKGROUND ===== */")) failures.push("Video background and sound-control foundations must have one physical component source");
if (!topNavigationCss.includes("@layer components {") || !topNavigationCss.includes(".top-nav") || legacyCss.includes("/* ===== TOP NAVIGATION ===== */")) failures.push("Top navigation foundation must have one physical component source");
if (!languageSwitchCss.includes("@layer components {") || !languageSwitchCss.includes(".lang-switch") || legacyCss.includes("/* ===== LANGUAGE SWITCH ===== */")) failures.push("Language switch and shared focus foundation must have one physical component source");
if (!buttonsCss.includes("@layer components {") || !buttonsCss.includes(".btn-primary") || legacyCss.includes("/* ===== BUTTONS ===== */")) failures.push("Shared buttons and CTA states must have one physical component source");
if (!heroFoundationCss.includes("@layer components {") || !heroFoundationCss.includes(".hero-card") || legacyCss.includes("/* ===== HERO ===== */")) failures.push("Shared hero foundation must have one physical component source");
if (!heroActionsCss.includes("@layer components {") || !heroActionsCss.includes(".hero-actions") || legacyCss.includes("/* ===== HERO ACTIONS + ONLINE WIDGET ===== */")) failures.push("Hero actions and online widget foundation must have one physical component source");
if (!heroStatsCss.includes("@layer components {") || !heroStatsCss.includes(".hero-side-compact") || !heroStatsCss.includes(".mini-stat") || legacyCss.includes("/* ===== HERO MINI STATS ===== */")) failures.push("Hero mini stats and related widgets must have one physical component source");
if (!serverStickyLayoutCss.includes("@layer components {") || !serverStickyLayoutCss.includes(".server-sticky-widget") || !serverStickyLayoutCss.includes(".server-sticky-card") || legacyCss.includes("/* ===== FINAL SERVER STICKY GRID 0605 ===== */")) failures.push("Compact server sticky layout must have one physical component source");
if (!sectionsCss.includes("@layer components {") || !sectionsCss.includes(".section-header") || !sectionsCss.includes(".combined-stats-shell") || legacyCss.includes("/* ===== SECTIONS ===== */")) failures.push("Shared section and combined stats shells must have one physical component source");
if (!supportWidgetCss.includes("@layer components {") || !supportWidgetCss.includes(".support-widget-card") || !supportWidgetCss.includes("@keyframes supportWidgetPulse") || legacyCss.includes(".support-sticky-widget {")) failures.push("Support widget foundation must have one physical component source");
if (html.includes("support-sticky-widget") || css.includes(".support-sticky-widget") || css.includes(".support-mobile-")) failures.push("Legacy support variants must be removed after the inline support migration");
if ((html.match(/class="support-inline-widget\b/g) || []).length !== 1) failures.push("Home must expose exactly one inline support component");
if (!tableControlsCss.includes("@layer components {") || !tableControlsCss.includes(".table-tools") || !tableControlsCss.includes(".search-input") || !tableControlsCss.includes(".filter-select") || legacyCss.includes(".car-thumb {")) failures.push("Shared table controls must have one physical component source");
if (!/\.car-thumb\s*\{\s*display:\s*block;/.test(tableControlsCss) || !topThreeCss.includes("/* ===== TOP 3 ===== */")) failures.push("Table control migration boundaries are invalid");
if (!topThreeCss.includes("@layer components {") || !topThreeCss.includes("/* ===== TOP 3 ===== */") || !topThreeCss.includes(".cards-top3") || !topThreeCss.includes(".pilot-card") || legacyCss.includes("/* ===== TOP 3 ===== */")) failures.push("Top-3 cards must have one physical component source");
if (!/\.cards-top3\s*\{\s*display:\s*grid;/.test(topThreeCss) || !tablesCss.includes("/* ===== TABLES ===== */")) failures.push("Top-3 migration boundaries are invalid");
if (!tablesCss.includes("@layer components {") || !tablesCss.includes("/* ===== TABLES ===== */") || !tablesCss.includes(".table-card") || !tablesCss.includes("th.sortable") || legacyCss.includes("/* ===== TABLES ===== */")) failures.push("Shared table system must have one physical component source");
if (!/\.table-card\s*\{\s*overflow:\s*hidden;/.test(tablesCss) || !paginationCss.includes("/* ===== PAGINATION ===== */")) failures.push("Table system migration boundaries are invalid");
if (!paginationCss.includes("@layer components {") || !paginationCss.includes(".pagination-wrap") || !paginationCss.includes(".page-btn.active") || !paginationCss.includes(".page-btn:disabled") || legacyCss.includes("/* ===== PAGINATION ===== */")) failures.push("Shared pagination must have one physical component source");
if (!/\.pagination-wrap\s*\{\s*display:\s*flex;/.test(paginationCss) || !modalsCss.includes("/* ===== MODALS ===== */")) failures.push("Pagination migration boundaries are invalid");
if (!modalsCss.includes("@layer components {") || !modalsCss.includes(".modal-overlay") || !modalsCss.includes(".modal-overlay.is-open") || !modalsCss.includes(".modal-close") || legacyCss.includes("/* ===== MODALS ===== */")) failures.push("Modal foundation must have one physical component source");
if (!/\.modal-overlay\s*\{[^}]*pointer-events:\s*none;/s.test(modalsCss) || !/\.modal-overlay\.is-open\s*\{[^}]*pointer-events:\s*auto;/s.test(modalsCss) || !serverPlayersModalCss.includes(".server-players-list {")) failures.push("Modal interaction and migration boundaries are invalid");
if (!serverPlayersModalCss.includes("@layer components {") || !serverPlayersModalCss.includes(".server-player-row") || !serverPlayersModalCss.includes(".server-player-name") || !serverPlayersModalCss.includes(".server-player-car") || legacyCss.includes(".server-players-list {")) failures.push("Server players modal content must have one physical component source");
if (!/\.server-players-list\s*\{\s*display:\s*grid;/.test(serverPlayersModalCss) || !todayStatsModalCss.includes(".today-stats-grid {")) failures.push("Server players modal migration boundaries are invalid");
if (!todayStatsModalCss.includes("@layer components {") || !todayStatsModalCss.includes(".today-stat-card") || !todayStatsModalCss.includes(".today-stats-details") || !todayStatsModalCss.includes(".today-detail-sub") || /\.today-stats-grid\s*\{\s*display:\s*grid;/.test(legacyCss)) failures.push("Today stats modal content must have one physical component source");
if (!/\.today-stats-grid\s*\{\s*display:\s*grid;/.test(todayStatsModalCss) || !activityControlsCss.includes(".activity-controls {")) failures.push("Today stats modal migration boundaries are invalid");
if (!activityControlsCss.includes("@layer components {") || !activityControlsCss.includes(".activity-month-picker") || !activityControlsCss.includes(".activity-month-card") || !activityControlsCss.includes(".activity-day-pill") || /\.activity-controls\s*\{\s*display:\s*grid;/.test(legacyCss)) failures.push("Activity controls must have one physical component source");
if (!activitySummaryCss.includes(".activity-summary-grid {")) failures.push("Activity controls migration boundary is invalid");
if (!activitySummaryCss.includes("@layer components {") || !activitySummaryCss.includes(".activity-hours-list") || !activitySummaryCss.includes(".activity-hour-bar-stage") || /\.activity-summary-grid\s*\{\s*display:\s*grid;/.test(legacyCss)) failures.push("Activity summary must have one physical component source");
if (!hourlyEventModalCss.includes("body.modal-open {") || !hourlyEventModalCss.includes("#hourly-details-modal") || !hourlyEventModalCss.includes(".event-details-v2")) failures.push("Hourly event modal must have one physical component source");
if (!driverDayModalCss.includes("/* ===== DRIVER OF THE DAY MODAL ===== */") || !driverDayModalCss.includes(".driver-day-grid")) failures.push("Driver of the day modal must have one physical component source");
if (!footerCss.includes("/* ===== FOOTER ===== */") || !footerCss.includes(".footer {") || !footerCss.includes(".footer-inner")) failures.push("Footer must have one physical component source");
if (!utilitiesCss.includes("/* ===== UTILITY / STATE ===== */") || !responsiveCss.includes("/* ===== RESPONSIVE ===== */")) failures.push("Utility and responsive layers must have explicit physical sources");
if (!legacyCss.includes("/* ===== FUN STATS PAGE ===== */")) failures.push("Responsive migration boundary is invalid");
for (const [className, imageName] of [["monza", "main.jpg"], ["sunset", "sunset.jpg"], ["spa", "spa.jpg"], ["nurburgring", "nurburgring.jpg"], ["nurburgring24h", "Nurburgring24h.jpg"], ["silverstone", "silverstone.jpg"]]) {
  if (!heroStatsCss.includes(`.server-sticky-card-${className}`) || !heroStatsCss.includes(`url("../../assets/${imageName}")`)) failures.push(`Server card ${className} is missing its explicit class-based background image`);
}
const budgets = {
  important: [(css.match(/!important/g) || []).length, 12],
  mediaQuery: [(css.match(/@media\b/g) || []).length, 59],
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

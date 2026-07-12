const IS_RACES_PAGE = /\/races(?:\/|\/index\.html)?$/i.test(window.location.pathname);
const IS_DRIVER_PAGE = /\/driver(?:\/|\/index\.html)?$/i.test(window.location.pathname);
const IS_CARS_PAGE = /\/cars(?:\/|\/index\.html)?$/i.test(window.location.pathname);
const IS_FUN_STATS_PAGE = /\/fun-stats(?:\/|\/index\.html)?$/i.test(window.location.pathname);
const IS_COMMUNITY_PAGE = /\/community(?:\/|\/index\.html)?$/i.test(window.location.pathname);
const IS_NEWS_PAGE = /\/news(?:\/|\/index\.html)?$/i.test(window.location.pathname);
const IS_BANS_PAGE = /\/bans(?:\/|\/index\.html)?$/i.test(window.location.pathname);
const SITE_BASE_PATH = (IS_RACES_PAGE || IS_DRIVER_PAGE || IS_CARS_PAGE || IS_FUN_STATS_PAGE || IS_COMMUNITY_PAGE || IS_NEWS_PAGE || IS_BANS_PAGE) ? "../" : "./";
const httpClientModulePromise = import("./src/shared/http-client.js");
const dataSchemaModulePromise = import("./src/shared/data-schema.js");
const storageModulePromise = import("./src/shared/storage.js");
const queryCacheModulePromise = import("./src/shared/query-cache.js");
let appStorage = null;
let jsonQueryCache = null;
let tableRequestGuard = null;
const tableRequestControllers = new Map();
const requestJson = async (url, options = {}) => {
  const { createHttpClient } = await httpClientModulePromise;
  requestJson.client ||= createHttpClient({ defaultTimeoutMs: 12000 });
  return requestJson.client.requestJson(url, options);
};
const CAR_IMAGE_BASE_PATH = `${SITE_BASE_PATH}assets/car-icons`;
const pageParams = new URLSearchParams(window.location.search);
function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}
const IS_ASG_PUBLIC_SITE = /(^|\.)asgracing\.ru$/i.test(window.location.hostname);
const IS_LOCAL_DEV_HOST = /^(localhost|127\.0\.0\.1|::1)$/i.test(window.location.hostname);
const DEFAULT_TOP_DATA_BASE_URL = IS_ASG_PUBLIC_SITE
  ? "https://data.asgracing.ru/top-data"
  : IS_LOCAL_DEV_HOST
    ? "https://data.asgracing.ru/top-data"
  : window.location.hostname === "asgracing.github.io"
    ? "https://asgracing.github.io/top-data"
    : "/top-data";
const DEFAULT_HOURLY_DATA_BASE_URL = IS_ASG_PUBLIC_SITE
  ? "https://data.asgracing.ru/hourly-data"
  : IS_LOCAL_DEV_HOST
    ? "https://data.asgracing.ru/hourly-data"
  : window.location.hostname === "asgracing.github.io"
    ? "https://asgracing.github.io/hourly-data"
    : "/hourly-data";
const getDevRuntimeParam = key => IS_LOCAL_DEV_HOST ? pageParams.get(key) : null;
const TOP_DATA_BASE_URL = getDevRuntimeParam("topDataBase") || DEFAULT_TOP_DATA_BASE_URL;
const TOP_API_BASE_URL = normalizeBaseUrl(getDevRuntimeParam("topApiBase"));
const TOP_DATA_V2_BASE_URL = TOP_API_BASE_URL || `${TOP_DATA_BASE_URL}/v2`;
const TOP_API_ROOT_URL = TOP_API_BASE_URL.replace(/\/top-data\/v2$/i, "");
const HOURLY_DATA_BASE_URL = normalizeBaseUrl(getDevRuntimeParam("hourlyApiBase")) || DEFAULT_HOURLY_DATA_BASE_URL;
const TOP_BANS_DATA_URL = `${TOP_DATA_BASE_URL}/bans.json`;
const LOCAL_NEWS_DATA_URL = `${SITE_BASE_PATH}news-content/news.json`;
const topDataV2ManifestUrl = `${TOP_DATA_V2_BASE_URL}/manifest.json`;
const serverStatusUrl = getDevRuntimeParam("serverStatusUrl") || (TOP_API_ROOT_URL ? `${TOP_API_ROOT_URL}/server-status` : `${TOP_DATA_BASE_URL}/server_status.json`);
const donationsApiUrl = "https://donations.asgracing.workers.dev/recent";
const hourlyAnnouncementUrl = `${HOURLY_DATA_BASE_URL}/announcement.json`;
const hourlyScheduleUrl = `${HOURLY_DATA_BASE_URL}/schedule.json`;
const hourlyVotesApiUrl = "https://hourly-votes.asgracing.workers.dev";
const communityLikesApiUrl =
  document.querySelector('meta[name="community-likes-api"]')?.getAttribute("content")?.trim() || "";
const HOURLY_SITE_BASE_URL = "/hourly";
const TWITCH_CHANNEL_NAME = "asgracing";
const TWITCH_CHANNEL_URL = `https://www.twitch.tv/${TWITCH_CHANNEL_NAME}`;
const TWITCH_LAUNCHER_SESSION_HIDE_KEY = "asgTwitchLauncherHidden";
const TWITCH_LIVE_PREVIEW_URL = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${TWITCH_CHANNEL_NAME}-440x248.jpg`;
const YOUTUBE_CHANNEL_HANDLE = "@ASGRacingACC";
const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@ASGRacingACC";
const YOUTUBE_LIVE_URL = `${YOUTUBE_CHANNEL_URL}/live`;
const YOUTUBE_LIVE_AUTO_DETECT = false;
const TWITCH_WIDGET_CHECK_INTERVAL_MS = 120000;
const TOP_GUIDE_STORAGE_KEY = "asgTopGuideSeen";
const TOP_GUIDE_MEDIA_QUERY = "(min-width: 1280px)";
const BG_VIDEO_VOLUME_STORAGE_KEY = "asgBgVideoVolume";
const BG_VIDEO_PLAYBACK_STORAGE_KEY = "asgBgVideoPlaybackEnabled";
const BG_VIDEO_PLAYLIST_STORAGE_KEY = "asgBgVideoPlaylist";
const BG_VIDEO_INDEX_STORAGE_KEY = "asgBgVideoIndex";
const SERVER_CARD_BACKGROUNDS = {
  main: `${SITE_BASE_PATH}assets/main.jpg`,
  sunset: `${SITE_BASE_PATH}assets/sunset.jpg`,
  monza: `${SITE_BASE_PATH}assets/main.jpg`,
  spa: `${SITE_BASE_PATH}assets/spa.jpg`,
  nurburgring: `${SITE_BASE_PATH}assets/nurburgring.jpg`,
  nurburgring24h: `${SITE_BASE_PATH}assets/Nurburgring24h.jpg`,
  silverstone: `${SITE_BASE_PATH}assets/silverstone.jpg`
};
const ACC_CONNECT_SERVER_FALLBACKS = {
  main: {
    hostname: "95.165.92.3",
    port: null,
    name: "ASG Racing Main",
    persistent: true
  },
  hourly: {
    hostname: "95.165.92.3",
    port: null,
    name: "ASG Racing 1H Race",
    persistent: true
  }
};
const SERVER_STATUS_LABELS_BY_ID = {
  "assetto-corsa-competizione-dedic": "ASG Racing Monza - SA Gainer 2",
  "assetto-corsa-competizione-dedic-2": "ASG Racing Nordschleife Practice",
  "assetto-corsa-competizione-dedic-3": "ASG Racing Nurburgring - Live Leaderboard",
  "assetto-corsa-competizione-dedic-4": "ASG Racing Nordschleife - Live Leaderboard",
  "assetto-corsa-competizione-dedic-5": "ASG Racing Spa - Dynamic Weather",
  "assetto-corsa-competizione-dedic-6": "ASG Racing Spa - Live Leaderboard"
};
const SERVER_STATUS_ORDER_BY_ID = {
  hourly: 0
};
const PAGE_SIZE = 10;
const VOTER_ID_STORAGE_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const HOURLY_VOTE_STATE_STORAGE_KEY = "hourlyVoteStateByEventId";
const HOURLY_VOTE_STATE_STORAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const NEWS_READ_STORAGE_KEY = "asgReadNewsIds.v2";

async function initializeAppStorage() {
  const { createStorage } = await storageModulePromise;
  appStorage = createStorage("asg.top.v1", window.localStorage);
  appStorage.migrateLegacy("language", "asgLang", value => ["ru", "en"].includes(value) ? value : undefined);
  appStorage.migrateLegacy("backgroundVideoVolume", BG_VIDEO_VOLUME_STORAGE_KEY, value => clampBackgroundVideoVolume(Number(value) / 100));
  appStorage.migrateLegacy("backgroundVideoPlayback", BG_VIDEO_PLAYBACK_STORAGE_KEY, value => !["0", "false", "off", "no"].includes(String(value).trim().toLowerCase()));
  appStorage.migrateLegacy("topGuideSeen", TOP_GUIDE_STORAGE_KEY, value => value === "1");
  appStorage.migrateLegacy("newsReadState", NEWS_READ_STORAGE_KEY, value => {
    try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" ? parsed : undefined; } catch { return undefined; }
  });
  appStorage.migrateLegacy("hourlyVoteState", HOURLY_VOTE_STATE_STORAGE_KEY, value => {
    try { const parsed = JSON.parse(value); return parsed?.items && typeof parsed.items === "object" ? normalizeHourlyVoteStateItems(parsed.items) : undefined; } catch { return undefined; }
  });
  currentLang = appStorage.get("language", currentLang);
}

async function initializeQueryRuntime() {
  const { createQueryCache, createLatestRequestGuard } = await queryCacheModulePromise;
  jsonQueryCache ||= createQueryCache({ maxEntries: 80 });
  tableRequestGuard ||= createLatestRequestGuard();
}

async function invalidateRuntimeQueries(prefix = "json:") {
  await initializeQueryRuntime();
  jsonQueryCache.invalidatePrefix(prefix);
}

function getLegalUrls() {
  const fallbackBase =
    document.querySelector('meta[name="legal-base-path"]')?.getAttribute("content")?.trim() || SITE_BASE_PATH;
  return window.ASGLegal?.getUrls?.() || {
    privacy: `${fallbackBase}privacy/`,
    cookies: `${fallbackBase}cookies/`
  };
}

function buildHourlyVoteLegalNoteHtml() {
  const { privacy } = getLegalUrls();
  if (currentLang === "ru") {
    return `Для голосования используется ID браузера. <a href="${escapeHtml(privacy)}">Подробнее</a>`;
  }
  return `Voting uses a browser ID. <a href="${escapeHtml(privacy)}">Details</a>`;
}

function getExpiringStorageValue(storageKey, ttlMs) {
  const now = Date.now();

  try {
    const rawValue = localStorage.getItem(storageKey);

    if (rawValue) {
      try {
        const parsed = JSON.parse(rawValue);
        if (parsed && typeof parsed.value === "string") {
          if (!parsed.expiresAt || Number(parsed.expiresAt) > now) {
            return parsed.value;
          }
        }
      } catch (error) {
        if (rawValue.trim()) {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              value: rawValue.trim(),
              createdAt: now,
              expiresAt: now + ttlMs
            })
          );
          return rawValue.trim();
        }
      }
    }

    const generated = `browser-${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        value: generated,
        createdAt: now,
        expiresAt: now + ttlMs
      })
    );
    return generated;
  } catch (error) {
    return `browser-${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function loadHourlyStoredVoteState() {
  if (appStorage) return normalizeHourlyVoteStateItems(appStorage.get("hourlyVoteState", {}));
  try {
    const rawValue = localStorage.getItem(HOURLY_VOTE_STATE_STORAGE_KEY);
    if (!rawValue) return {};
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") return {};
    if (parsed.expiresAt && Number(parsed.expiresAt) <= Date.now()) {
      localStorage.removeItem(HOURLY_VOTE_STATE_STORAGE_KEY);
      return {};
    }
    return parsed.items && typeof parsed.items === "object" ? parsed.items : {};
  } catch (error) {
    return {};
  }
}

function normalizeHourlyVoteStateItems(items) {
  return Object.fromEntries(
    Object.entries(items || {})
      .filter(([eventId, state]) => eventId && state && typeof state === "object")
      .map(([eventId, state]) => [
        eventId,
        {
          event_id: state.event_id || eventId,
          votes: typeof state.votes === "number" ? state.votes : 0,
          already_voted: Boolean(state.already_voted)
        }
      ])
  );
}

function saveHourlyStoredVoteState(items) {
  if (appStorage) {
    appStorage.set("hourlyVoteState", normalizeHourlyVoteStateItems(items), { ttlMs: HOURLY_VOTE_STATE_STORAGE_TTL_MS });
    return;
  }
  try {
    localStorage.setItem(
      HOURLY_VOTE_STATE_STORAGE_KEY,
      JSON.stringify({
        items: normalizeHourlyVoteStateItems(items),
        updatedAt: Date.now(),
        expiresAt: Date.now() + HOURLY_VOTE_STATE_STORAGE_TTL_MS
      })
    );
  } catch (error) {
    // Vote cache is only a UI sync layer between pages.
  }
}

function mergeHourlyStoredVoteStateItems(items) {
  const mergedItems = {
    ...loadHourlyStoredVoteState(),
    ...normalizeHourlyVoteStateItems(items)
  };
  saveHourlyStoredVoteState(mergedItems);
  return mergedItems;
}

function applyHourlyAnnouncementVoteState(state) {
  if (!state || typeof state !== "object") return false;
  hourlyVotesCount = typeof state.votes === "number" ? state.votes : 0;
  hourlyVoteAlreadyVoted = Boolean(state.already_voted);
  hourlyVoteFailed = false;
  return true;
}

function applyHourlyAnnouncementVoteStateFromCache(announcement = hourlyAnnouncementData) {
  const eventId = buildHourlyAnnouncementEventId(announcement);
  if (!eventId) return false;
  return applyHourlyAnnouncementVoteState(loadHourlyStoredVoteState()[eventId]);
}

function syncHourlyVoteStateFromStorage() {
  if (!applyHourlyAnnouncementVoteStateFromCache()) return;
  renderHourlyHeroCard();
  renderHourlyHeroModal();
}

function resolveInitialLanguage() {
  const urlLang = new URLSearchParams(window.location.search).get("lang");
  if (urlLang && translations[urlLang]) return urlLang;

  let storedLang = null;
  try {
    storedLang = localStorage.getItem("asgLang");
  } catch (error) {
    storedLang = null;
  }
  if (storedLang && translations[storedLang]) return storedLang;

  const browserLanguages = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language];

  const preferred = browserLanguages
    .map(value => String(value || "").trim().toLowerCase())
    .find(Boolean);

  return preferred && preferred.startsWith("ru") ? "ru" : "en";
}

let leaderboardData = [];
let bestlapsData = [];
let bestlapTracksData = [];
let bestlapTrackLeadersData = [];
let todayStatsData = null;
let safetyData = [];
let driverOfDayData = null;
let racesData = [];
let carsData = [];
let bansData = [];
let topDataV2Manifest = null;
let topDataV2Version = "";
let topDataV2TableMeta = null;
const topDataV2TableLoadPromises = new Map();
const topDataV2PagedTables = {
  leaderboard: null,
  bestlaps: null
};
let latestHourlyRaceData = null;
let racesArchiveMeta = null;
const IS_TOP_HOME_PAGE = !(IS_RACES_PAGE || IS_DRIVER_PAGE || IS_CARS_PAGE || IS_FUN_STATS_PAGE || IS_COMMUNITY_PAGE || IS_NEWS_PAGE || IS_BANS_PAGE);
const topLoadState = {
  home: IS_TOP_HOME_PAGE,
  hourly: IS_TOP_HOME_PAGE,
  races: IS_RACES_PAGE,
  driver: IS_DRIVER_PAGE,
  cars: IS_CARS_PAGE,
  funStats: IS_FUN_STATS_PAGE,
  community: IS_COMMUNITY_PAGE,
  news: IS_NEWS_PAGE,
  bans: IS_BANS_PAGE
};
const topHomeDeferredSections = {
  leaderboard: !IS_TOP_HOME_PAGE,
  bestlaps: !IS_TOP_HOME_PAGE,
  safety: !IS_TOP_HOME_PAGE
};
let topHomeDeferredObserver = null;
const TOP_DEV_FLAGS = Object.freeze({
  combinedStatsTabs: true
});
const HOME_STATS_TABS = Object.freeze({
  leaderboard: {
    panelId: "championship",
    subtitleKey: "combinedStatsSubtitleLeaderboard"
  },
  bestlaps: {
    panelId: "bestlaps",
    subtitleKey: "combinedStatsSubtitleBestlaps"
  },
  safety: {
    panelId: "worst-safety",
    subtitleKey: "combinedStatsSubtitleSafety"
  }
});
let activeHomeStatsTab = "leaderboard";
let combinedStatsTabsBound = false;
let combinedStatsLinksBound = false;
let hostedCombinedStatsTab = null;

function renderLoadingMarkup(label = "") {
  return `<div class="loading">${escapeHtml(label || t("loading"))}</div>`;
}

function setLoadingMarkup(containerId, labelKey = "loading") {
  const element = document.getElementById(containerId);
  if (!element) return;
  element.innerHTML = renderLoadingMarkup(t(labelKey));
}

function setLoadingText(elementId, labelKey = "loading") {
  const element = document.getElementById(elementId);
  if (element) element.textContent = t(labelKey);
}

function scrollTopTargetBelowHeader(target, { behavior = "smooth", extraOffset = 8 } = {}) {
  const element = typeof target === "string" ? document.getElementById(target) : target;
  if (!(element instanceof HTMLElement)) return;

  const topNav = document.getElementById("top-nav");
  const navHeight = topNav?.getBoundingClientRect?.().height || 0;
  const absoluteTop = window.scrollY + element.getBoundingClientRect().top;
  const targetTop = Math.max(0, absoluteTop - navHeight - extraOffset);
  window.scrollTo({ top: targetTop, behavior });
}

function isCombinedStatsTabsExperimentEnabled() {
  return IS_TOP_HOME_PAGE && TOP_DEV_FLAGS.combinedStatsTabs;
}

function updateCombinedStatsTabsUI() {
  const enabled = isCombinedStatsTabsExperimentEnabled();
  document.body.classList.toggle("experiment-combined-stats", enabled);

  const subtitleEl = document.getElementById("combined-stats-subtitle");
  if (subtitleEl && enabled) {
    const subtitleKey = HOME_STATS_TABS[activeHomeStatsTab]?.subtitleKey || "championshipSubtitle";
    subtitleEl.textContent = t(subtitleKey);
  }

  Object.entries(HOME_STATS_TABS).forEach(([tabKey, config]) => {
    const button = document.querySelector(`[data-stats-tab="${tabKey}"]`);
    const panel = document.getElementById(config.panelId);
    const isActive = enabled ? tabKey === activeHomeStatsTab : true;

    if (button) {
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.tabIndex = isActive ? 0 : -1;
    }

    if (panel) {
      panel.classList.toggle("is-active", isActive);
      panel.hidden = enabled ? !isActive : false;
    }
  });

  const toolsHost = document.getElementById("combined-stats-active-tools");
  if (toolsHost) {
    const hostedPanelId = hostedCombinedStatsTab ? HOME_STATS_TABS[hostedCombinedStatsTab]?.panelId : null;
    toolsHost.querySelectorAll(".table-tools").forEach((tools) => {
      const panelId = tools.dataset.originPanelId || hostedPanelId;
      if (panelId && !tools.dataset.originPanelId) {
        tools.dataset.originPanelId = panelId;
      }
      const panel = panelId ? document.getElementById(panelId) : null;
      const header = panel?.querySelector(".section-header");
      if (header) header.appendChild(tools);
    });
    hostedCombinedStatsTab = null;

    const activePanel = document.getElementById(HOME_STATS_TABS[activeHomeStatsTab]?.panelId || "championship");
    const activeTools = activePanel?.querySelector(".table-tools");

    if (enabled && activeTools) {
      toolsHost.appendChild(activeTools);
      hostedCombinedStatsTab = activeHomeStatsTab;
    } else {
      Object.values(HOME_STATS_TABS).forEach(({ panelId }) => {
        const panel = document.getElementById(panelId);
        const header = panel?.querySelector(".section-header");
        const tools = panel?.querySelector(".table-tools");
        if (header && tools) header.appendChild(tools);
      });
      hostedCombinedStatsTab = null;
    }
  }
}

function setActiveCombinedStatsTab(tabKey) {
  if (!HOME_STATS_TABS[tabKey]) return;
  activeHomeStatsTab = tabKey;
  updateCombinedStatsTabsUI();
}

function bindCombinedStatsTabs() {
  if (combinedStatsTabsBound) return;
  combinedStatsTabsBound = true;

  document.querySelectorAll("[data-stats-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveCombinedStatsTab(button.dataset.statsTab || "leaderboard");
    });
  });

  Object.values(HOME_STATS_TABS).forEach(({ panelId }) => {
    const panel = document.getElementById(panelId);
    const tools = panel?.querySelector(".table-tools");
    if (tools && !tools.dataset.originPanelId) {
      tools.dataset.originPanelId = panelId;
    }
  });

  if (combinedStatsLinksBound) return;
  combinedStatsLinksBound = true;

  document.addEventListener("click", (event) => {
    if (!isCombinedStatsTabsExperimentEnabled()) return;
    const link = event.target?.closest?.('a[href="#championship"], a[href="#bestlaps"], a[href="#worst-safety"]');
    if (!link) return;

    const href = String(link.getAttribute("href") || "");
    const tabKey = href === "#bestlaps"
      ? "bestlaps"
      : href === "#worst-safety"
        ? "safety"
        : "leaderboard";

    event.preventDefault();
    setActiveCombinedStatsTab(tabKey);
    scrollTopTargetBelowHeader("combined-stats-shell");
  });
}

function renderDeferredHomeTableLoading(tableId, paginationWrapId, labelKey) {
  setLoadingMarkup(tableId, labelKey);
  const wrap = document.getElementById(paginationWrapId);
  if (wrap) wrap.style.display = "none";
}

function applyInitialTopLoadingState() {
  if (IS_DRIVER_PAGE) {
    const statsEl = document.getElementById("driver-stat-cards");
    if (statsEl) statsEl.innerHTML = renderLoadingMarkup(t("driverLoading"));
    setLoadingMarkup("driver-races-table", "driverLoading");
    setLoadingMarkup("driver-tracks-table", "driverLoading");
    return;
  }

  if (IS_CARS_PAGE) {
    setLoadingMarkup("cars-table", "loading");
    return;
  }

  if (IS_FUN_STATS_PAGE) {
    setLoadingMarkup("fun-stats-summary", "loading");
    setLoadingMarkup("fun-stats-awards", "loading");
    setLoadingText("fun-stats-range", "loading");
    return;
  }

  if (IS_COMMUNITY_PAGE) {
    setLoadingMarkup("community-feed", "loading");
    return;
  }

  if (IS_NEWS_PAGE) {
    setLoadingMarkup("news-feed", "loading");
    return;
  }

  if (IS_BANS_PAGE) {
    setLoadingMarkup("bans-table", "loading");
    return;
  }

  if (IS_RACES_PAGE) {
    setLoadingMarkup("races-table", "loading");
    return;
  }

  const top3El = document.getElementById("top3-content");
  if (top3El) top3El.innerHTML = renderLoadingMarkup(t("loading"));

  renderDeferredHomeTableLoading("leaderboard-table", "leaderboard-pagination-wrap", "loadingLeaderboard");
  renderDeferredHomeTableLoading("bestlaps-table", "bestlaps-pagination-wrap", "loadingBestLaps");
  renderDeferredHomeTableLoading("safety-table", "safety-pagination-wrap", "loadingSafety");

  setLoadingText("drivers-count");
  setLoadingText("servers-online-count");
  setLoadingText("serverPlayersValue");
  setLoadingText("best-lap-highlight");
  setLoadingText("best-lap-note");
  setLoadingText("hourly-track-value");
  setLoadingText("hourly-starts-value");
  setLoadingText("hourly-votes-summary");
  setLoadingText("hero-hourly-winner-name");
  setLoadingText("hero-hourly-winner-meta");

  const onlineChartEl = document.getElementById("online-chart");
  const onlineRangeEl = document.getElementById("online-range");
  const onlineScaleEl = document.getElementById("online-scale");
  if (onlineChartEl) onlineChartEl.innerHTML = `<div class="hero-online-empty">${escapeHtml(t("loading"))}</div>`;
  if (onlineRangeEl) onlineRangeEl.textContent = t("loading");
  if (onlineScaleEl) onlineScaleEl.innerHTML = `<span>0</span>`;

  const serverCardsEl = document.querySelector(".server-sticky-cards");
  if (serverCardsEl) serverCardsEl.innerHTML = renderLoadingMarkup(t("loading"));
}

function setupTopHomeDeferredSections() {
  if (!IS_TOP_HOME_PAGE || topHomeDeferredObserver) return;
  if (isCombinedStatsTabsExperimentEnabled()) {
    topHomeDeferredSections.leaderboard = true;
    topHomeDeferredSections.bestlaps = true;
    topHomeDeferredSections.safety = true;
    return;
  }
  if (!("IntersectionObserver" in window)) {
    topHomeDeferredSections.leaderboard = true;
    topHomeDeferredSections.bestlaps = true;
    topHomeDeferredSections.safety = true;
    return;
  }

  const sectionMap = {
    championship: "leaderboard",
    bestlaps: "bestlaps",
    "worst-safety": "safety"
  };

  topHomeDeferredObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const key = sectionMap[entry.target.id];
      if (!key || topHomeDeferredSections[key]) return;
      topHomeDeferredSections[key] = true;
      topHomeDeferredObserver?.unobserve(entry.target);
      rerenderUI();
    });
  }, { rootMargin: "240px 0px" });

  Object.keys(sectionMap).forEach((sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) topHomeDeferredObserver.observe(element);
  });
}
let racesArchiveSummary = null;
let funStatsApiData = null;
let leaderboardPage = 1;
let bestlapsPage = 1;
let safetyPage = 1;
let racesPage = 1;
let currentLang = "en";
let leaderboardSearch = "";
let bestlapsSearch = "";
let bestlapsTrackFilter = "monza";
let safetySearch = "";
let racesSearch = "";
let racesTrackFilter = "";
let carsSearch = "";
let carsMinRacesFilter = "0";
let driverRaceSort = { key: "finished_at", direction: "desc" };
let driverTrackSort = { key: "points", direction: "desc" };
let driverRacePage = 1;
let driverTrackPage = 1;
let leaderboardSort = { key: null, direction: null };
let bestlapsSort = { key: null, direction: null };
let safetySort = { key: null, direction: null };
let carsSort = { key: "wins", direction: "desc" };
let onlineData = [];
let hourlyAnnouncementData = null;
let hourlyScheduleData = null;
let hourlyVotesCount = null;
let hourlyVoteAlreadyVoted = false;
let hourlyVotePending = false;
let hourlyVoteFailed = false;
let raceActivityInsights = null;
let selectedRace = null;
let driverIndexData = [];
let driverProfileData = null;
let driverPreviewState = null;
const bestLapTrackSelection = new Map();
const averagePaceTrackSelection = new Map();
let eloModalState = null;
let safetyModalState = null;
let safetyModalRequestId = 0;
let srBreakdownPopoverState = null;
let srBreakdownPopoverRequestId = 0;
let communityLightboxState = null;
let communityLikeStateByPostId = {};
const pendingCommunityLikePostIds = new Set();
let newsFeedData = [];
let newsFeedSourceUrl = LOCAL_NEWS_DATA_URL;
let newsModalController = null;
let donationAlertsData = null;
let donationAlertsLoading = false;
let donationAlertsFailed = false;
let driverPreviewModalController = null;
let eloModalController = null;
let safetyModalController = null;
let bestlapTracksModalController = null;
let bestlapTracksModalState = null;
let hourlyHeroModalController = null;
let onlineActivityModalController = null;
let serverPlayersModalController = null;
let serverPlayersModalMode = "mainPlayers";
let selectedServerPlayersKey = "main";
let communityLightboxController = null;
let selectedActivityDate = null;
let selectedActivityMonth = null;
let twitchWidgetCheckTimer = null;
let twitchWidgetState = {
  initialized: false,
  live: false,
  expanded: false,
  dismissed: true,
  launcherHiddenForSession: false,
  checking: false,
  platform: null,
  embedUrl: "",
  openUrl: TWITCH_CHANNEL_URL
};
let topGuideState = {
  initialized: false,
  active: false,
  stepIndex: 0,
  highlightedElement: null,
  mediaQuery: null
};
let backgroundVideoSoundState = {
  supported: false,
  available: false,
  playbackEnabled: true,
  enabled: false,
  volume: 0.5
};
let funStatsPeriod = "week";
let serverStatusData = null;
const driverProfileCache = new Map();
const raceDetailsCache = new Map();
const HOURLY_TRACK_BACKGROUNDS = {
  monza: `${HOURLY_SITE_BASE_URL}/assets/tracks/monza.jpg`,
  silverstone: `${HOURLY_SITE_BASE_URL}/assets/tracks/silverstone.jpg`,
  spa: `${HOURLY_SITE_BASE_URL}/assets/tracks/spa.jpg`,
  nurburgring: `${HOURLY_SITE_BASE_URL}/assets/tracks/nurburgring.jpg`,
  nurburgring_24h: `${HOURLY_SITE_BASE_URL}/assets/tracks/nurburgring_24h.jpg`,
  nurburgring24h: `${HOURLY_SITE_BASE_URL}/assets/tracks/nurburgring_24h.jpg`,
  "nurburgring-24h": `${HOURLY_SITE_BASE_URL}/assets/tracks/nurburgring_24h.jpg`,
  nordschl: `${HOURLY_SITE_BASE_URL}/assets/tracks/nurburgring_24h.jpg`,
  nordschleife: `${HOURLY_SITE_BASE_URL}/assets/tracks/nurburgring_24h.jpg`
};
const HOURLY_WEATHER_ICON_PATHS = {
  clouds: `${HOURLY_SITE_BASE_URL}/assets/weather/cloudness.png`,
  rain: `${HOURLY_SITE_BASE_URL}/assets/weather/rain.png`,
  random: `${HOURLY_SITE_BASE_URL}/assets/weather/random.png`
};

function clampBackgroundVideoVolume(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0.5;
  return Math.min(1, Math.max(0, numericValue));
}

function loadBackgroundVideoVolume() {
  if (appStorage) return clampBackgroundVideoVolume(appStorage.get("backgroundVideoVolume", 0.5));
  try {
    const storedVolume = localStorage.getItem(BG_VIDEO_VOLUME_STORAGE_KEY);
    if (storedVolume === null) return 0.5;
    return clampBackgroundVideoVolume(Number(storedVolume) / 100);
  } catch (error) {
    return 0.5;
  }
}

function saveBackgroundVideoVolume(volume) {
  if (appStorage) {
    appStorage.set("backgroundVideoVolume", clampBackgroundVideoVolume(volume));
    return;
  }
  try {
    localStorage.setItem(BG_VIDEO_VOLUME_STORAGE_KEY, String(Math.round(clampBackgroundVideoVolume(volume) * 100)));
  } catch (error) {
    // Volume persistence is nice to have; playback should keep working if storage is blocked.
  }
}

function loadBackgroundVideoPlaybackEnabled() {
  if (appStorage) return Boolean(appStorage.get("backgroundVideoPlayback", true));
  try {
    const storedValue = localStorage.getItem(BG_VIDEO_PLAYBACK_STORAGE_KEY);
    if (storedValue === null) return true;
    return !["0", "false", "off", "no"].includes(String(storedValue).trim().toLowerCase());
  } catch (error) {
    return true;
  }
}

function saveBackgroundVideoPlaybackEnabled(enabled) {
  if (appStorage) {
    appStorage.set("backgroundVideoPlayback", Boolean(enabled));
    return;
  }
  try {
    localStorage.setItem(BG_VIDEO_PLAYBACK_STORAGE_KEY, enabled ? "true" : "false");
  } catch (error) {
    // Playback persistence is optional.
  }
}

const translations = {
  en: {
    closeLabel: "Close",
    homeAriaLabel: "ASG Racing home",
    langSwitcherLabel: "Language switcher",
    btnNews: "News",
    newsBellAriaLabel: "Open notifications",
    newsBellUnreadLabel: "{count} unread notifications",
    newsBellEmpty: "No new notifications yet.",
    newsModalTitle: "Notifications",
    newsModalSubtitle: "Latest updates, maintenance notes and community news.",
    newsModalOpenAll: "Open all news",
    newsPageEyebrow: "Newsroom",
    newsPageTitle: "News",
    newsPageSubtitle: "Updates, maintenance notes and fresh announcements from ASG Racing.",
    btnBans: "Ban List",
    bansPageEyebrow: "Moderation",
    bansPageTitle: "Ban List",
    bansPageSubtitle: "Public list of banned drivers from the ASG Racing servers. Steam IDs stay private.",
    bansSummaryTotal: "Drivers banned",
    bansSummaryLatest: "Latest ban",
    bansTableTitle: "Banned Drivers",
    bansTableSubtitle: "Public moderation list without Steam IDs, sorted by latest ban date.",
    bansEmpty: "No public bans found yet.",
    bansCols: ["Driver", "Banned at"],
    newsBackToList: "Back to all news",
    newsArticleMissing: "This news entry was not found.",
    newsListEmpty: "No news published yet.",
    newsReadMore: "Read more",
    navGroupRacing: "Racing",
    navGroupStats: "Stats",
    navGroupCommunity: "Community",
    navMore: "More",
    navMoreAriaLabel: "Open extra navigation",
    openRaceDetailsLabel: "Open race details",
    openDriverPreviewLabel: "Open driver quick view",
    onlineTitle: "Online by date",
    onlineNoData: "No data",
    onlineActivityTitle: "Prime time by day",
    onlineActivityOpenLabel: "Open race activity details",
    onlineActivityEmpty: "Not enough race data yet.",
    onlineActivitySubtitle: "{date} · activity {score}/100",
    onlineActivityPrimeTime: "Prime time {hour} · score {score}",
    onlineActivityHoursTitle: "Hourly activity, unique drivers",
    onlineActivityMonthLabel: "Month",
    onlineActivityUniqueLabel: "Unique drivers",
    onlineActivityRacesLabel: "Races",
    onlineActivityAvgPlayersLabel: "Avg drivers per race",
    onlineActivityScoreLabel: "Activity",
    onlineActivityTracksLabel: "Tracks",
    onlineActivityActiveDaysLabel: "Active days",
    onlineActivityMonthScoreLabel: "Month activity",
    onlineActivityMonthCardTitle: "{month} · {score}/100",
    onlineActivityMonthCardMeta: "{days} active days · {races} races · avg {avg}",
    onlineActivityHourRaces: "{value} races",
    onlineActivityHourUnique: "{value} unique",
    donationsWidgetTitle: "Project supporters:",
    donationsWidgetGoalEyebrow: "Fundraising goal",
    donationsWidgetSpecialThanks: "Special thanks",
    donationsWidgetSupportAria: "Support ASG Racing on DonationAlerts",
    donationsWidgetLoading: "Loading supporters...",
    donationsWidgetEmpty: "No supporters yet.",
    donationsWidgetError: "Supporters are unavailable.",
    heroEyebrow: "ACC Public Leaderboard",
    hourlyEyebrow: "Next 1-Hour Race",
    hourlyStartsLabel: "Starts",
    hourlyTrackLabel: "",
    hourlyOpenBtn: "1-Hour Race!",
    hourlyVoteBtn: "I want to race!",
    hourlyVoteDone: "You're in",
    hourlyVoteSending: "Saving...",
    hourlyVoteFailed: "Try again",
    hourlyNoEvent: "No scheduled event yet",
    hourlyVotesZero: "No registrations yet",
    hourlyVotesOne: "{value} registered driver",
    hourlyVotesMany: "{value} registered drivers",
    hourlyPromoTitle: "x5 points for the race!!!",
    hourlyPromoNote: "The hourly event hits the championship harder.",
    hourlyLastWinnerLabel: "Last hourly winner",
    hourlyLastWinnerEmpty: "No completed hourly race yet",
    todayStatsBtn: "Today Stats",
    todayStatsEyebrow: "Daily overview",
    todayStatsTitle: "Today's Statistics",
    todayUniquePlayers: "Unique drivers today",
    todayRaces: "Races today",
    todaySessions: "Sessions today",
    todayPoints: "Points earned today",
    todayWins: "Wins today",
    todayPodiums: "Podiums today",
    todayAvgPlayers: "Avg players per race",
    todayTracks: "Tracks raced today",
    todayBestLap: "Best lap today",
    todayMostActive: "Most active driver",
    todayMostSuccessful: "Most successful driver",
    driverOfDayBtn: "Driver of the day: {driver}",
    driverOfDayEyebrow: "Top performer today",
    driverOfDayTitle: "Driver of the Day",
    driverOfDayName: "Driver",
    driverOfDayPoints: "Points today",
    driverOfDayRaces: "Races today",
    driverOfDayWins: "Wins today",
    driverOfDayAvgFinish: "Average finish",
    driverOfDayAvgGain: "Avg pos delta",
    driverOfDayBestLap: "Best lap today",
    driverOfDayBestLapTrack: "Track",
    driverOfDayNoData: "No race data for today yet.",
    htmlLang: "en",
    pageTitle: "ASG Racing ACC Leaderboard | Assetto Corsa Competizione Stats",
    pageTitleRaces: "ASG Racing Last Races | Assetto Corsa Competizione Results",
    pageTitleCars: "ASG Racing Cars | Assetto Corsa Competizione Stats",
    pageTitleFunStats: "ASG Racing Fun Stats | Weekly and Monthly ACC Stories",
    pageTitleCommunity: "ASG Racing Community | Event Stories and Photos",
    pageTitleNews: "ASG Racing News | Updates and Announcements",
    pageTitleBans: "ASG Racing Ban List | Public Moderation Board",
    metaDescription:
      "ASG Racing ACC Leaderboard - race stats, wins, podiums and best laps from the public Assetto Corsa Competizione server.",
    metaDescriptionRaces:
      "Latest ASG Racing ACC race results with winner, track, best lap and full finishing order.",
    metaDescriptionCars:
      "ASG Racing car statistics with wins, win rate, podiums, drivers and best lap by car model.",
    metaDescriptionDriver:
      "Driver profile with race history, best lap, points and safety stats from ASG Racing ACC.",
    metaDescriptionFunStats:
      "Weekly and monthly fun stats from ASG Racing ACC: comeback heroes, clean racers, hot laps, grind leaders and more.",
    metaDescriptionCommunity:
      "Community stories from ASG Racing ACC events with short recaps, photos and highlights from recent races.",
    metaDescriptionNews:
      "Latest ASG Racing updates, announcements and technical news from the ACC community site.",
    metaDescriptionBans:
      "Public ASG Racing ban list with banned driver names and ban dates. Steam IDs are hidden.",
    ogDescription:
      "Race stats, wins, podiums and best laps from the ASG Racing server in Assetto Corsa Competizione.",
    ogDescriptionRaces:
      "Latest race sessions from ASG Racing with winner, track, best lap and full finishing order.",
    ogDescriptionCars:
      "Performance overview by car model with wins, podiums, usage and best lap data from ASG Racing ACC.",
    ogDescriptionDriver:
      "Driver profile with race history, points, best lap and safety stats from ASG Racing ACC.",
    ogDescriptionFunStats:
      "Weekly and monthly stories from the ASG Racing server: points bosses, comeback heroes, clean racers and hot lap heroes.",
    ogDescriptionCommunity:
      "Community stories from ASG Racing ACC events with short recaps, photos and highlights from recent races.",
    ogDescriptionNews:
      "Latest ASG Racing updates, announcements and technical notes from the ACC community site.",
    ogDescriptionBans:
      "Public ASG Racing ban list with banned driver names and ban dates. Steam IDs are hidden.",
    twitterDescription:
      "Races, wins, podiums and best laps from the public ACC server of ASG Racing.",
    twitterDescriptionRaces:
      "Latest race sessions from ASG Racing with winner, track, best lap and full finishing order.",
    twitterDescriptionCars:
      "Performance overview by car model with wins, podiums, usage and best lap data from ASG Racing ACC.",
    twitterDescriptionDriver:
      "Driver profile with race history, points, best lap and safety stats from ASG Racing ACC.",
    twitterDescriptionFunStats:
      "Weekly and monthly ASG Racing fun stats with the most active, fastest and wildest drivers on the server.",
    twitterDescriptionCommunity:
      "ASG Racing community event recaps, photos and highlights from recent ACC races.",
    twitterDescriptionNews:
      "Latest ASG Racing updates, announcements and technical notes.",
    twitterDescriptionBans:
      "Public ASG Racing ban list with banned driver names and ban dates. Steam IDs are hidden.",
    ogLocale: "en_US",
    heroTitle: "\u{1F3C1} ASG Racing Leaderboard",
    heroSubtitle:
      "<strong>ASG Racing</strong> is an ACC community of enthusiasts. The public server runs 24/7 on Monza, and we also host daily one-hour events at 14:00 and 20:00 MSK. Data is automatically updated based on dedicated server results.",
    btnChampionship: "Rating",
    btnChampionshipEvent: "Championship",
    btnRules: "Rules",
    rulesBadge: "Internal Racing Rules",
    rulesTitle: "Mandatory for all closed ASG Racing events",
    rulesLead:
      "Below are the internal rules for closed races dated June 2026. Every participant is required to follow them in full.",
    rulesSectionTitle: "Internal rules for closed races, June 2026",
    rulesPenaltyTitle: "Penalties",
    rulesItem1:
      "It is strictly forbidden to cross the pit entry or pit exit line with any part of the car.",
    rulesItem2:
      "A fight for position is considered started if the overtaking car gets its front bumper alongside the leading car before the corner. The overlap zone begins at the rear wheel of the car ahead.",
    rulesItem3:
      "The start of the corner is the moment steering input begins to change the car from straight-line motion toward the turn.",
    rulesItem4: "Entering the overlap zone under braking is allowed.",
    rulesItem5:
      "If the cars enter a corner as described in rule No. 2, both drivers must leave enough room in the turn, at least one car width to the white line.",
    rulesItem6: "Only one change of line is allowed while defending a position.",
    rulesItem7: "Blocking another car by any means is prohibited.",
    rulesItem8:
      "Blue flags must be obeyed. If shown a blue flag, you are strongly advised to let the faster car through before the next corner and must do so within one sector.",
    rulesItem9:
      "If a car gains an advantage in attack or defense by leaving the track during a fight, that car must give the position back to the rival.",
    rulesItem10:
      "A car is considered to have left the racing surface if none of its wheels remain in contact with the track, including the boundary lines.",
    rulesItem11:
      "Drivers must take all necessary actions to avoid contact with rival cars.",
    rulesItem12:
      "An overtake is considered completed when there is no overlap and both cars can follow the optimal line for the situation without contact.",
    rulesPenalty1: "15 seconds for contact.",
    rulesPenalty2: "Drive-through (DT) for a collision that causes car damage.",
    rulesPenalty3: "SG30 for actions that lead to a mass crash.",
    rulesPenalty4: "15 seconds for ignoring blue flags.",
    rulesPenalty5:
      "DT for repeated ignoring of blue flags / DSQ for blatant and intentional ignoring.",
    rulesPenalty6:
      "15 seconds for not giving the position back after gaining advantage off track in a fight (see rule 9).",
    rulesPenalty7:
      "DT for crossing the pit entry or pit exit line (see rule 1).",
    rulesPenalty8: "15 seconds for blocking another car.",
    rulesPenalty9:
      "DT for an unsafe rejoin to the racing surface that causes a collision.",
    rulesPenalty10: "15 seconds for repeated line changes while battling.",
    rulesPenalty11:
      "DT for the third contact after two previous 15-second penalties under item 1.",
    rulesPenalty12: "Disqualification for unsafe driving and repeated mistakes.",
    rulesPenalty13: "DT for intentional blocking.",
    btnLastRaces: "Race Archive",
    btnSpecialEvent: "Special Event",
    btnCars: "Cars",
    btnFunStats: "Fun Stats",
    btnCommunity: "Community",
    lastRacesBtn: "Last Races",
    btnBackHome: "Back to Home",
    btnBestLaps: "Best Laps",
    btnWorstSafety: "Worst Safety",
    btnAboutServer: "About Server",
    serversLabel: "Servers",
    serversOnlineLabel: "Servers online",
    serversOnlineTooltip: "Show server status",
    serverPlayersCountLabel: "players",
    serverStatusLabel: "Server",
    serverStatusOnline: "ONLINE",
    serverStatusOffline: "OFFLINE",
    serverStatusDegraded: "DEGRADED",
    serverTotalPlayersLabel: "Total players",
    serverTotalPlayersNote: "Servers",
    serversWidgetTitle: "Server status",
    serverMainLabel: "Main",
    serverSunsetLabel: "Sunset",
    serverHourlyLabel: "Hourly",
    serverConnectBtn: "Connect",
    serverConnectHowTo: "How to?",
    serverConnectUnavailable: "Add public server IP/host to enable direct connect",
    serverPlayersEyebrow: "Live server",
    playersOnlineTitle: "Players online",
    playersOnlineEmpty: "No players online.",
    playersOnlineUpdated: "Updated {time}",
    driversCountLabel: "Drivers in leaderboard",
    driversCountNote: "Unique participants included in the stats.",
    bestLapHighlightLabel: "Best lap record",
    bestLapTracksButton: "Best laps by track",
    bestLapTracksTitle: "Best laps by track",
    bestLapTracksSubtitle: "One fastest recorded lap for each track.",
    driverBestLapTracksSubtitle: "Driver best recorded lap for each track.",
    bestLapTracksTooltip: "Open a track-by-track list of best laps with driver, car and lap time.",
    bestlapsTrackFilterLabel: "Track",
    bestLapNoteFallback: "Best lap highlight will appear here.",
    bestLapNoteTemplate: "{driver} · {track}",
    top3Title: "Top 3 Drivers",
    top3Subtitle: "Current championship leaders by points.",
    championshipTitle: "Rating",
    championshipSubtitle: "Row click opens quick view. Name opens full profile.",
    combinedStatsSubtitleLeaderboard: "Row: quick view. Name: full profile.",
    statsHubTitle: "Driver Stats",
    supportWidgetTitle: "Support ASG Racing",
    supportWidgetText: "If you enjoy the server, streams and stats site, you can help the project keep rolling with a quick support drop.",
    supportWidgetButton: "Support the project",
    supportWidgetButtonAria: "Open DonationAlerts support page for ASG Racing",
    supportWidgetQrNote: "Open DonationAlerts or scan the QR code from your phone.",
    bgVideoSoundToggleTitle: "Watch with sound",
    bgVideoSoundToggleNote: "Dim the site and unmute the clip",
    bgVideoSoundToggleTitleActive: "Back to site",
    bgVideoSoundToggleNoteActive: "Mute the clip and restore the page",
    bgVideoSoundToggleAria: "Play the background video with sound and dim the site",
    bgVideoSoundToggleAriaActive: "Mute the background video and return the site to normal mode",
    bgVideoVolumeLabel: "Volume",
    bgVideoVolumeAria: "Background video volume",
    bgVideoPlaybackToggleAria: "Disable the background video on this site",
    bgVideoPlaybackToggleAriaActive: "Enable the background video on this site",
    bgVideoPlaybackStateOn: "ON",
    bgVideoPlaybackStateOff: "OFF",
    bestLapsTitle: "Best Laps",
    bestLapsSubtitle: "Row click opens quick view. Name opens full profile.",
    combinedStatsSubtitleBestlaps: "Row: quick view. Name: full profile.",
    worstSafetyTitle: "Worst Safety",
    worstSafetySubtitle: "Penalty count, penalty points and breakdown by penalty type.",
    combinedStatsSubtitleSafety: "SR, penalties and incidents.",
    aboutTitle: "About ASG Racing Server",
    aboutSubtitle: "Assetto Corsa Competizione public racing server",
    aboutP1:
      "<strong>ASG Racing</strong> is a public <strong>Assetto Corsa Competizione</strong> server where drivers compete on popular GT3 tracks, improve their lap times and compare their statistics with other racers.",
    aboutP2: "This page automatically publishes the server leaderboard including:",
    aboutList1: "\u2022 number of races",
    aboutList2: "\u2022 wins",
    aboutList3: "\u2022 podium finishes",
    aboutList4: "\u2022 average finish position",
    aboutList5: "\u2022 best laps",
    aboutP3:
      "Statistics are generated automatically from <strong>ACC Dedicated Server</strong> result files. After each race the data is recalculated and published on the website.",
    pointsTitle: "How points are calculated",
    pointsP1: "Race points depend on how many drivers are classified in that race:",
    pointsList1: "25+ drivers - base GT scale 25/18/15/12/10/8/6/4/2/1",
    pointsList2: "20-24 / 15-19 / 10-14 drivers - the same scale is reduced so the winner gets 20 / 15 / 10 points",
    pointsList3: "5-9 drivers - the winner gets 5 points, with the rest of the scale reduced proportionally",
    pointsList4: "1-4 drivers - the winner gets points equal to the number of classified drivers",
    pointsP2:
      "All scaled values are rounded to whole points: 0.1-0.5 rounds down, 0.6-0.9 rounds up. The fastest lap always gives <strong>+1 point</strong>.",
    bestLapsInfoTitle: "Best laps",
    bestLapsInfoP1:
      "The <strong>Best Laps</strong> table contains the fastest lap times recorded both in qualifying and in race sessions. This makes it easy to compare the outright pace of the drivers.",
    joinTitle: "Join the server",
    joinP1: "To participate in races and appear in the leaderboard, join the server:",
    joinP1b: "Open the ACC server browser and search for these server names:",
    serverName: "ASG Racing ACC Public Server",
    serverName1: "ASG Racing Live Leaderboard",
    serverName2: "ASG Racing Monza - SA Gainer",
    serverName3: "ASG Racing Monza - SA Gainer 2",
    serverName4: "ASG Racing Nordschleife Practice",
    serverName5: "ASG Racing Nurburgring - Live Leaderboard",
    serverName6: "ASG Racing Nordschleife - Live Leaderboard",
    serverName7: "ASG Racing Spa - SA Gainer 3",
    serverName8: "ASG Racing Spa - Live Leaderboard",
    joinP2: "Community news and communication are available in our channels:",
    joinCommunityTelegram: "Telegram: race announcements, reminders, voting, results and quick updates.",
    joinCommunityDiscord: "Discord: voice chat, finding rivals, setup talk and race communication.",
    communityTelegramTitle: "Telegram",
    communityTelegramText: "The fastest way to catch race announcements, reminders, voting, results and all the live ASG Racing movement.",
    communityTelegramCta: "Join and stay in the loop",
    communityDiscordTitle: "Discord",
    communityDiscordText: "Voice chat, race talk, setup discussion, finding rivals and the kind of community energy that keeps you coming back.",
    communityDiscordCta: "Jump into the paddock",
    communityYoutubeTitle: "YouTube",
    communityYoutubeText: "Race replays, highlights and content worth rewatching after the checkered flag drops.",
    communityYoutubeCta: "Watch the highlights",
    communityTwitchTitle: "Twitch",
    communityTwitchText: "Race replays, highlights and content worth rewatching after the checkered flag drops.",
    communityTwitchCta: "Watch on Twitch",
    twitchWidgetTitle: "ASG Racing is streaming now!",
    twitchWidgetOpen: "Open stream",
    twitchWidgetExpand: "Bigger",
    twitchWidgetCollapse: "Smaller",
    twitchWidgetHide: "Hide",
    twitchWidgetShow: "Open stream",
    topGuideLauncher: "New here?",
    topGuideDismiss: "Skip",
    topGuideBack: "Back",
    topGuideNext: "Next",
    topGuideDone: "Got it",
    topGuideProgress: "Step {current} of {total}",
    topGuideStepWelcomeTitle: "Welcome to the server stats",
    topGuideStepWelcomeText: "This page brings together ASG Racing server stats, live info, race history and quick links to the community.",
    topGuideStepChampionshipTitle: "Start with the championship",
    topGuideStepChampionshipText: "This is the main leaderboard. Use it to find yourself, compare points and quickly jump into a full driver profile.",
    topGuideStepSearchTitle: "Find yourself in the top",
    topGuideStepSearchText: "Use this search field to jump straight to your name in the standings instead of scanning the full table manually.",
    topGuideStepProfileTitle: "Open your full driver stats",
    topGuideStepProfileText: "Click your name inside the championship table to open a full driver profile with race history, pace and detailed statistics.",
    topGuideStepRacesTitle: "Open the latest races",
    topGuideStepRacesText: "This button takes you to the recent race archive, where every session has a full result sheet and finishing order.",
    topGuideStepHourlyTitle: "Hourly events live here",
    topGuideStepHourlyText: "This card shows the next hourly event: track, start time, registrations and more detailed slot info.",
    communityTiktokTitle: "TikTok",
    communityTiktokText: "Short, punchy moments: overtakes, chaos, emotions and the most addictive ASG Racing clips.",
    communityTiktokCta: "Catch the best moments",
    footerText:
      "Statistics are generated from ACC Dedicated Server result files and published via GitHub Pages.",
    loading: "Loading...",
    loadingRaces: "Loading races...",
    loadingLeaderboard: "Loading leaderboard...",
    loadingBestLaps: "Loading best laps...",
    loadingSafety: "Loading safety...",
    emptyTop3: "No top-3 data available yet.",
    emptyLeaderboard: "No leaderboard data yet.",
    emptyBestLaps: "No best lap data yet.",
    emptySafety: "No penalty data yet.",
    emptyRaces: "No race results yet.",
    emptySearch: "No matching drivers found.",
    errorLoading: "Data loading error.",
    errorLeaderboard: "Failed to load leaderboard.json",
    errorBestlaps: "Failed to load bestlaps.json",
    racesEyebrow: "Race archive",
    racesPageTitle: "Last Races",
    racesPageSubtitle: "Latest race sessions from ASG Racing. Click any row to open the full result sheet.",
    racesSearchPlaceholder: "Search track or driver...",
    racesTrackFilterAll: "All tracks",
    clearFilters: "Clear filters",
    resultsCount: "Results: {count}",
    filterSearchLabel: "Search",
    filterTrackLabel: "Track",
    filterCarLabel: "Car",
    filterMinRacesLabel: "Min races",
    emptyFilteredRaces: "No races match the current filters.",
    emptyFilteredCars: "No cars match the current filters.",
    carsEyebrow: "Car stats",
    carsPageTitle: "Cars",
    carsPageSubtitle: "Performance overview by car model based on recorded race results.",
    carsSearchPlaceholder: "Search car model...",
    carsMinRacesLabel: "Min races",
    carsSummaryTotal: "Car models",
    carsSummaryTopWinner: "Top winner",
    carsSummaryMostUsed: "Most used",
    metaLabelRaces: "Races",
    metaLabelWins: "Wins",
    carsTableTitle: "Cars Table",
    carsTableSubtitle: "Sorted by wins, podiums and race count.",
    carsCols: ["Car", "Races", "Wins", "Win Rate", "Podiums", "Drivers", "Avg Finish", "Fastest Laps", "Best Lap"],
    funStatsEyebrow: "Weekly and monthly pulse",
    funStatsPageTitle: "Fun Stats",
    funStatsPageSubtitle:
      "Not just wins and podiums. This page highlights the busiest, fastest, cleanest and most chaotic stories from recent ASG Racing races.",
    communityEyebrow: "Community journal",
    communityPageTitle: "Community",
    communityPageSubtitle:
      "Short stories from ASG Racing events: what happened, who showed up, and the moments worth remembering after the session.",
    communityFeedTitle: "Latest Stories",
    communityFeedSubtitle: "Newest posts first. Each story is a compact recap with 1-2 photos.",
    communityEmpty: "Community stories will appear here soon.",
    communityOpenImageLabel: "Open full-size image",
    communityLikeButton: "Like",
    communityLikedButton: "Liked",
    communityLikesZero: "No likes yet",
    communityLikesOne: "{value} like",
    communityLikesMany: "{value} likes",
    communityLikesLoading: "Loading likes...",
    communityLikesFailed: "Likes are unavailable",
    funStatsWeekTab: "Last 7 days",
    funStatsMonthTab: "Last 30 days",
    funStatsPeriodSwitcherLabel: "Period switcher",
    funStatsWindowLabel: "Data window",
    funStatsSummaryRaces: "Races held",
    funStatsSummaryDrivers: "Active drivers",
    funStatsSummaryFastestLapsLeader: "Fastest lap leader",
    funStatsSummaryOvertakes: "Positions gained",
    funStatsAwardsTitle: "Fun Awards",
    funStatsAwardsSubtitle: "A lighter weekly and monthly view of who made noise on the server.",
    funStatsLeaderboardsTitle: "Quick Rankings",
    funStatsLeaderboardsSubtitle: "Top names and trends for the selected period.",
    funStatsEmpty: "Not enough race data for this period yet.",
    funStatsListActive: "Most active drivers",
    funStatsListMovers: "Biggest movers",
    funStatsListClean: "Cleanest racers",
    funStatsListStable: "Most consistent",
    funStatsListFastest: "Fastest lap kings",
    funStatsListCars: "Most used cars",
    funStatsAwardPointsBoss: "Points Boss",
    funStatsAwardGrindKing: "Grind King",
    funStatsAwardPodiumHunter: "Podium Hunter",
    funStatsAwardComebackHero: "Comeback Hero",
    funStatsAwardCleanOperator: "Clean Operator",
    funStatsAwardHotLapHero: "Hot Lap Hero",
    funStatsAwardChaosMagnet: "Chaos Magnet",
    funStatsAwardGarageFavorite: "Garage Favorite",
    funStatsAwardPointsBossNote: "{value} pts scored in the selected period.",
    funStatsAwardGrindKingNote: "{value} race starts logged.",
    funStatsAwardPodiumHunterNote: "{value} podium finishes collected.",
    funStatsAwardComebackHeroNote: "+{value} positions gained across races.",
    funStatsAwardCleanOperatorNote: "{value} penalty pts across {starts} starts.",
    funStatsAwardHotLapHeroNote: "{lap} on Monza.",
    funStatsAwardChaosMagnetNote: "{value} penalty pts received.",
    funStatsAwardGarageFavoriteNote: "{value} starts with this car.",
    funStatsSummaryFastestLapsLeaderNote: "{value} times",
    funStatsListStartsValue: "{value} starts",
    funStatsListGainValue: "+{value} positions",
    funStatsListPenaltyValue: "{value} penalty pts",
    funStatsListAvgFinishValue: "avg finish {value}",
    funStatsListFastestLapValue: "{value} fastest laps",
    funStatsListCarValue: "{value} starts",
    racesSummaryTotal: "Total races",
    racesSummaryAvgActive: "Avg active finishers",
    racesSummaryAvgOvertakes: "Avg overtakes",
    racesSummaryTopWinner: "Top winner",
    racesSummaryLatestWinner: "Latest winner",
    racesSummaryLastWinnerBestLap: "Winner best lap",
    racesTableTitle: "Race Results",
    racesTableSubtitle: "Row click opens quick view. Name opens full profile.",
    raceModalEyebrow: "Race details",
    racesCols: ["Date", "Track", "Winner", "Drivers", "Avg ELO", "Best Lap"],
    raceModalCols: ["Pos", "Start", "\u0394 Pos", "Driver", "Best Lap", "Car", "Gap", "\u0394ELO", "SR", "Pts"],
    notCountedBadge: "Not counted",
    countedBadge: "Counted",
    raceSummaryTrack: "Track",
    raceSummaryWinner: "Winner",
    raceSummaryDrivers: "Drivers",
    raceSummaryBestLap: "Best lap",
    raceSummaryStatus: "Status",
    racePenaltyShort: "Pen pts",
    raceBestLapBadge: "Fastest lap",
    noWinner: "No winner",
    pageTitleDriver: "ASG Racing Driver Profile | Assetto Corsa Competizione Stats",
    driverEyebrow: "Driver profile",
    driverPreviewEyebrow: "Driver quick view",
    driverPreviewSubtitle: "Key pace and results from the ASG Racing server.",
    driverPreviewOpenPage: "Go to driver page",
    driverPreviewRowHint: "Row click opens quick view",
    driverPreviewLinkHint: "Name opens full profile",
    driverPageSubtitle: "Personal race history, pace and safety metrics from the ASG Racing server.",
    driverSummaryPoints: "Points",
    driverSummaryAvgPoints: "Avg points / race",
    driverSummaryAvgGain: "Avg pos delta",
    driverSummaryRaces: "Races",
    driverSummaryWins: "Wins",
    driverSummaryPodiums: "Podiums",
    driverSummaryAvgFinish: "Avg finish",
    driverSummaryBestLap: "Best lap",
    driverSummaryBestLapTrack: "Track for best lap",
    driverSummaryBestLapTooltip: "Fastest recorded lap on the selected track",
    driverSummaryAvgPace: "Average pace",
    driverSummaryAvgPaceTrack: "Track for average pace",
    driverSummaryAvgPaceTooltip: "Average lap from the last 5 counted races on the selected track",
    driverSummaryPenaltyPoints: "Penalty points",
    driverSummaryFastestLaps: "Fastest lap awards",
    driverSectionOverview: "Overview",
    driverSectionRaces: "Race History",
    driverSectionRacesSubtitle: "Row click opens quick view.",
    driverSectionTracks: "Track Stats",
    driverSectionPenalties: "Penalty Breakdown",
    driverRecentForm: "Recent form",
    driverMostRacedTrack: "Most raced track",
    driverFavoriteCar: "Favorite car",
    bannedLabel: "BANNED",
    driverWinRate: "Win rate",
    driverPodiumRate: "Podium rate",
    driverRankingPosition: "Ranking position",
    driverNoData: "Driver profile not found.",
    driverLoading: "Loading driver profile...",
    driverRaceCols: ["Date", "Track", "Start", "Pos", "\u0394 Pos", "Points", "Best Lap", "Car", "Gap", "\u0394ELO", "SR"],
    driverTrackCols: ["Track", "Races", "Wins", "Podiums", "Points", "Avg finish", "Best lap"],
    driverPenaltyReason: "Reason",
    driverPenaltyType: "Type",
    leaderboardCols: [
      "#",
      "Driver",
      "ELO",
      "SR",
      "Points",
      "Wins",
      "Podiums",
      "Races",
      "Avg Finish",
      "Best Lap",
      "Car"
    ],
    bestlapsCols: ["#", "Driver", "ELO", "SR", "Best Lap", "Car", "Session", "Updated"],
    safetyBaseCols: ["#", "Driver", "SR", "Category", "Races", "\u0394 SR", "Invalid Laps", "Auto Penalties", "Incidents"],
    leaderboardSearchPlaceholder: "Search driver...",
    bestlapsSearchPlaceholder: "Search driver...",
    safetySearchPlaceholder: "Search driver...",
    metaLabels: {
      points: "Points",
      wins: "Wins",
      podiums: "Podiums",
      races: "Races",
      bestLap: "Best lap"
    },
    sessionRace: "Race",
    sessionQualifying: "Quali",
    paginationShown: "Showing {start}-{end} of {total}",
    prev: "< Prev",
    next: "Next >"
  },
  ru: {
    closeLabel: "Закрыть",
    homeAriaLabel: "Главная ASG Racing",
    langSwitcherLabel: "Переключение языка",
    btnNews: "Новости",
    newsBellAriaLabel: "Открыть уведомления",
    newsBellUnreadLabel: "{count} непрочитанных уведомлений",
    newsBellEmpty: "Пока нет новых уведомлений.",
    newsModalTitle: "Уведомления",
    newsModalSubtitle: "Последние обновления, техработы и новости сообщества.",
    newsModalOpenAll: "Открыть все новости",
    newsPageEyebrow: "Лента новостей",
    newsPageTitle: "Новости",
    newsPageSubtitle: "Обновления, технические заметки и свежие объявления ASG Racing.",
    btnBans: "Баны",
    bansPageEyebrow: "Модерация",
    bansPageTitle: "Список банов",
    bansPageSubtitle: "Публичный список забаненных пилотов серверов ASG Racing. Steam ID не публикуются.",
    bansSummaryTotal: "Всего в бане",
    bansSummaryLatest: "Последний бан",
    bansTableTitle: "Забаненные пилоты",
    bansTableSubtitle: "Публичный список модерации без Steam ID, отсортирован по дате бана.",
    bansEmpty: "Пока нет публичных записей о банах.",
    bansCols: ["Пилот", "Дата бана"],
    newsBackToList: "Ко всем новостям",
    newsArticleMissing: "Такая новость не найдена.",
    newsListEmpty: "Новостей пока нет.",
    newsReadMore: "Читать полностью",
    navGroupRacing: "Гонки",
    navGroupStats: "Статистика",
    navGroupCommunity: "Сообщество",
    navMore: "Ещё",
    navMoreAriaLabel: "Открыть дополнительную навигацию",
    openRaceDetailsLabel: "Открыть детали гонки",
    openDriverPreviewLabel: "Открыть быстрое превью пилота",
    onlineTitle: "Онлайн по датам",
    onlineNoData: "Нет данных",
    onlineActivityTitle: "Пик активности по дням",
    onlineActivityOpenLabel: "Открыть активность гонок",
    onlineActivityEmpty: "Пока недостаточно данных по гонкам.",
    onlineActivitySubtitle: "{date} · активность {score}/100",
    onlineActivityPrimeTime: "Пик активности {hour} · индекс {score}",
    onlineActivityHoursTitle: "Почасовая активность: уникальные пилоты",
    onlineActivityMonthLabel: "Месяц",
    onlineActivityUniqueLabel: "Уникальные пилоты",
    onlineActivityRacesLabel: "Гонки",
    onlineActivityAvgPlayersLabel: "Среднее пилотов на гонку",
    onlineActivityScoreLabel: "Активность",
    onlineActivityTracksLabel: "Трассы",
    onlineActivityActiveDaysLabel: "Активные дни",
    onlineActivityMonthScoreLabel: "Активность месяца",
    onlineActivityMonthCardTitle: "{month} · {score}/100",
    onlineActivityMonthCardMeta: "{days} активных дней · {races} гонок · ср. {avg}",
    onlineActivityHourRaces: "{value} гонок",
    onlineActivityHourUnique: "{value} уникальных",
    donationsWidgetTitle: "Поддержали проект:",
    donationsWidgetGoalEyebrow: "Цель сбора",
    donationsWidgetSpecialThanks: "Особая благодарность",
    donationsWidgetSupportAria: "Поддержать ASG Racing через DonationAlerts",
    donationsWidgetLoading: "Загружаем донаты...",
    donationsWidgetEmpty: "Донатов пока нет.",
    donationsWidgetError: "Донаты сейчас недоступны.",
    heroEyebrow: "Чемпионат публичного сервера ACC",
    hourlyEyebrow: "Ближайшая часовая гонка",
    hourlyStartsLabel: "Старт",
    hourlyTrackLabel: "",
    hourlyOpenBtn: "Часовая гонка!",
    hourlyVoteBtn: "Я хочу поехать!",
    hourlyVoteDone: "Ты в списке",
    hourlyVoteSending: "Сохраняем...",
    hourlyVoteFailed: "Повтори позже",
    hourlyNoEvent: "Пока нет запланированного события",
    hourlyVotesZero: "Нет регистраций",
    hourlyVotesOne: "{value} участник",
    hourlyVotesMany: "{value} участников",
    hourlyPromoTitle: "x5 очков за гонку!!!",
    hourlyPromoNote: "Часовой заезд сильнее влияет на чемпионат.",
    hourlyLastWinnerLabel: "Последний победитель",
    hourlyLastWinnerEmpty: "Пока нет завершенной часовой гонки",
    todayStatsBtn: "Статистика за сегодня",
    todayStatsEyebrow: "Сводка дня",
    todayStatsTitle: "Статистика за сегодня",
    todayUniquePlayers: "Уникальных пилотов сегодня",
    todayRaces: "Гонок сегодня",
    todaySessions: "Сессий сегодня",
    todayPoints: "Очков заработано сегодня",
    todayWins: "Побед сегодня",
    todayPodiums: "Подиумов сегодня",
    todayAvgPlayers: "Среднее пилотов на гонку",
    todayTracks: "Трассы сегодня",
    todayBestLap: "Лучший круг сегодня",
    todayMostActive: "Самый активный пилот",
    todayMostSuccessful: "Самый успешный пилот",
    driverOfDayBtn: "Пилот дня: {driver}",
    driverOfDayEyebrow: "Лучший пилот дня",
    driverOfDayTitle: "Пилот дня",
    driverOfDayName: "Пилот",
    driverOfDayPoints: "Очки за сегодня",
    driverOfDayRaces: "Гонок сегодня",
    driverOfDayWins: "Побед сегодня",
    driverOfDayAvgFinish: "Ср. финиш",
    driverOfDayAvgGain: "Ср. изменение поз.",
    driverOfDayBestLap: "Лучший круг сегодня",
    driverOfDayBestLapTrack: "Трасса",
    driverOfDayNoData: "Сегодня ещё нет данных по гонкам.",
    htmlLang: "ru",
    pageTitleFunStats: "ASG Racing Fun Stats | Недельные и месячные истории ACC",
    pageTitleCars: "ASG Racing Cars | Статистика Assetto Corsa Competizione",
    pageTitleCommunity: "ASG Racing Сообщество | Истории и фото мероприятий",
    pageTitleNews: "ASG Racing Новости | Обновления и объявления",
    pageTitleBans: "ASG Racing Список банов | Публичная доска модерации",
    btnCars: "Машины",
    btnFunStats: "Фан-стата",
    btnCommunity: "Сообщество",
    carsEyebrow: "Статистика машин",
    carsPageTitle: "Машины",
    carsPageSubtitle: "Обзор результатов по моделям машин на основе сохраненных гоночных результатов.",
    carsSearchPlaceholder: "Поиск по модели машины...",
    carsMinRacesLabel: "Мин. гонок",
    carsSummaryTotal: "Моделей машин",
    carsSummaryTopWinner: "Лидер по победам",
    carsSummaryMostUsed: "Самая популярная",
    metaLabelRaces: "Гонки",
    metaLabelWins: "Победы",
    carsTableTitle: "Таблица машин",
    carsTableSubtitle: "Сортировка по клику на заголовки столбцов.",
    carsCols: ["Машина", "Гонки", "Победы", "Процент побед", "Подиумы", "Пилоты", "Ср. финиш", "Лучшие круги", "Лучший круг"],
    funStatsEyebrow: "Пульс недели и месяца",
    funStatsPageTitle: "Фан-статистика",
    funStatsPageSubtitle:
      "Не только победы и подиумы. Здесь собраны самые живые истории последних гонок ASG Racing: активность, камбэки, чистые заезды, быстрые круги и немного хаоса.",
    communityEyebrow: "Журнал сообщества",
    communityPageTitle: "Сообщество",
    communityPageSubtitle:
      "Короткие истории с мероприятий ASG Racing: что происходило, кто участвовал и какие моменты хочется вспомнить после финиша.",
    communityFeedTitle: "Последние истории",
    communityFeedSubtitle: "Новые записи сверху. Каждая история - компактный отчет с 1-2 фотографиями.",
    communityEmpty: "Скоро здесь появятся истории сообщества.",
    communityOpenImageLabel: "Открыть изображение полностью",
    communityLikeButton: "Лайк",
    communityLikedButton: "Лайк поставлен",
    communityLikesZero: "Пока нет лайков",
    communityLikesOne: "{value} лайк",
    communityLikesMany: "{value} лайков",
    communityLikesLoading: "Загружаем лайки...",
    communityLikesFailed: "Лайки недоступны",
    funStatsWeekTab: "Последние 7 дней",
    funStatsMonthTab: "Последние 30 дней",
    funStatsPeriodSwitcherLabel: "Переключатель периода",
    funStatsWindowLabel: "Период данных",
    funStatsSummaryRaces: "Проведено гонок",
    funStatsSummaryDrivers: "Активных пилотов",
    funStatsSummaryFastestLapsLeader: "Лидер по быстрым кругам",
    funStatsSummaryOvertakes: "Отыгранных позиций",
    funStatsAwardsTitle: "Фан-награды",
    funStatsAwardsSubtitle: "Более живой недельный и месячный взгляд на то, что происходило на сервере.",
    funStatsLeaderboardsTitle: "Быстрые рейтинги",
    funStatsLeaderboardsSubtitle: "Главные имена и тренды за выбранный период.",
    funStatsEmpty: "Пока недостаточно данных за этот период.",
    funStatsListActive: "Самые активные пилоты",
    funStatsListMovers: "Главные камбэкеры",
    funStatsListClean: "Самые чистые гонщики",
    funStatsListStable: "Самые стабильные",
    funStatsListFastest: "Короли быстрых кругов",
    funStatsListCars: "Самые популярные машины",
    funStatsAwardPointsBoss: "Босс по очкам",
    funStatsAwardGrindKing: "Король наката",
    funStatsAwardPodiumHunter: "Охотник за подиумами",
    funStatsAwardComebackHero: "Герой камбэков",
    funStatsAwardCleanOperator: "Чистый пилот",
    funStatsAwardHotLapHero: "Герой быстрого круга",
    funStatsAwardChaosMagnet: "Магнит для хаоса",
    funStatsAwardGarageFavorite: "Любимчик гаража",
    funStatsAwardPointsBossNote: "{value} очков за выбранный период.",
    funStatsAwardGrindKingNote: "{value} стартов за период.",
    funStatsAwardPodiumHunterNote: "{value} подиумов собрано.",
    funStatsAwardComebackHeroNote: "+{value} отыгранных позиций по сумме гонок.",
    funStatsAwardCleanOperatorNote: "{value} штрафных очков за {starts} стартов.",
    funStatsAwardHotLapHeroNote: "{lap} на Monza.",
    funStatsAwardChaosMagnetNote: "{value} штрафных очков получено.",
    funStatsAwardGarageFavoriteNote: "{value} стартов на этой машине.",
    funStatsSummaryFastestLapsLeaderNote: "{value} раз",
    funStatsListStartsValue: "{value} стартов",
    funStatsListGainValue: "+{value} позиций",
    funStatsListPenaltyValue: "{value} штраф. очков",
    funStatsListAvgFinishValue: "ср. финиш {value}",
    funStatsListFastestLapValue: "{value} быстрых кругов",
    funStatsListCarValue: "{value} стартов",
    pageTitle: "ASG Racing ACC Leaderboard | Статистика Assetto Corsa Competizione",
    pageTitleRaces: "ASG Racing Последние гонки | Результаты Assetto Corsa Competizione",
    metaDescription:
      "ASG Racing ACC Leaderboard - статистика гонок, побед, подиумов и лучших кругов на публичном сервере Assetto Corsa Competizione.",
    metaDescriptionRaces:
      "Последние результаты гонок ASG Racing ACC: победитель, трасса, лучший круг и полный порядок финиша.",
    metaDescriptionCars:
      "Статистика машин ASG Racing: победы, процент побед, подиумы, пилоты и лучший круг по каждой модели.",
    metaDescriptionDriver:
      "Профиль пилота ASG Racing ACC с историей гонок, лучшим кругом, очками и штрафами.",
    metaDescriptionFunStats:
      "Недельная и месячная фан-статистика ASG Racing ACC: камбэки, чистые гонщики, быстрые круги, активность и самые яркие истории сервера.",
    metaDescriptionCommunity:
      "Истории сообщества ASG Racing ACC: короткие отчеты о мероприятиях, фотографии и яркие моменты прошедших гонок.",
    metaDescriptionNews:
      "Последние обновления, объявления и технические новости ASG Racing ACC.",
    metaDescriptionBans:
      "Публичный список банов ASG Racing с именами пилотов и датой бана. Steam ID скрыты.",
    ogDescription:
      "Статистика гонок, побед, подиумов и лучших кругов на сервере ASG Racing в Assetto Corsa Competizione.",
    ogDescriptionRaces:
      "Последние гоночные сессии ASG Racing: победитель, трасса, лучший круг и полный порядок финиша.",
    ogDescriptionCars:
      "Обзор результатов по моделям машин: победы, подиумы, популярность и лучшие круги ASG Racing ACC.",
    ogDescriptionDriver:
      "Профиль пилота ASG Racing с историей гонок, очками, лучшим кругом и штрафами.",
    ogDescriptionFunStats:
      "Недельные и месячные истории ASG Racing: лидеры по очкам, камбэки, чистые гонщики, быстрые круги и самые активные пилоты.",
    ogDescriptionCommunity:
      "Истории сообщества ASG Racing ACC: короткие отчеты о мероприятиях, фотографии и яркие моменты прошедших гонок.",
    ogDescriptionNews:
      "Последние обновления, объявления и технические заметки ASG Racing ACC.",
    ogDescriptionBans:
      "Публичный список банов ASG Racing с именами пилотов и датой бана. Steam ID скрыты.",
    twitterDescription:
      "Гонки, победы, подиумы и лучшие круги на публичном ACC сервере ASG Racing.",
    twitterDescriptionRaces:
      "Последние гоночные сессии ASG Racing: победитель, трасса, лучший круг и полный порядок финиша.",
    twitterDescriptionCars:
      "Обзор результатов по моделям машин: победы, подиумы, популярность и лучшие круги ASG Racing ACC.",
    twitterDescriptionDriver:
      "Профиль пилота ASG Racing с историей гонок, очками, лучшим кругом и штрафами.",
    twitterDescriptionFunStats:
      "Фановая недельная и месячная статистика ASG Racing с самыми активными, быстрыми и безумными пилотами сервера.",
    twitterDescriptionCommunity:
      "Истории сообщества ASG Racing: отчеты, фотографии и хайлайты прошедших ACC-заездов.",
    twitterDescriptionNews:
      "Последние обновления, объявления и технические заметки ASG Racing ACC.",
    twitterDescriptionBans:
      "Публичный список банов ASG Racing с именами пилотов и датой бана. Steam ID скрыты.",
    ogLocale: "ru_RU",
    heroTitle: "\u{1F3C1} ASG Racing Leaderboard",
    heroSubtitle:
      "<strong>ASG Racing</strong> - сообщество энтузиастов ACC. Открытый сервер работает 24/7 на трассе Monza. Мы также проводим ежедневные часовые заезды в 14:00 и 20:00 МСК. Данные обновляются автоматически на основе файлов результатов ACC Dedicated Server.",
    btnChampionship: "Рейтинг",
    btnChampionshipEvent: "Чемпионат",
    btnRules: "Правила",
    rulesBadge: "Внутренние гоночные правила",
    rulesTitle: "Обязательны к соблюдению на закрытых гонках ASG Racing",
    rulesLead:
      "Ниже опубликованы внутренние правила для закрытых гонок от июня 2026. Все участники обязаны соблюдать их в полном объеме.",
    rulesSectionTitle: "Внутренние правила для закрытых гонок от июня 2026",
    rulesPenaltyTitle: "Штрафы",
    rulesItem1:
      "Строго запрещено пересекать любой частью автомобиля линию разметки на въезде и выезде из питлейна.",
    rulesItem2:
      "Борьба за позицию считается начавшейся, если обгоняющий автомобиль до поворота \"вошел в базу\" впередиидущего автомобиля своим габаритом (передним бампером). База начинается от заднего колеса автомобиля.",
    rulesItem3:
      "Началом поворота считается момент, когда происходит движение рулем для изменения прямолинейного движения в сторону поворота.",
    rulesItem4: "На торможении можно \"входить в базу\".",
    rulesItem5:
      "Если автомобили входят в поворот так, как это описано в пункте №2 (обгоняющий успел \"войти в базу\"), то оба пилота обязаны оставлять достаточное место в повороте (как минимум одну ширину автомобиля до белой ленточки).",
    rulesItem6: "В борьбе за позицию разрешено только одно изменение траектории.",
    rulesItem7: "Блокирование автомобиля любыми способами - запрещено.",
    rulesItem8:
      "Соблюдение синих флагов обязательно. В случае, если вам показали синий флаг, настоятельно рекомендуется пропустить догоняющую машину до поворота, обязательно пропустить в течение 1 сектора.",
    rulesItem9:
      "В случае, если во время борьбы один из автомобилей получил преимущество в обороне или нападении за счет выезда за пределы трассы - этот автомобиль должен уступить позицию сопернику.",
    rulesItem10:
      "Автомобиль будет считаться покинувшим Гоночную дорожку, если ни одно его колесо не будет соприкасаться с Гоночной дорожкой, включая линии, обозначающие её границу.",
    rulesItem11:
      "Гонщики обязаны предпринимать все необходимые действия для избегания контактов с автомобилями соперников.",
    rulesItem12:
      "Обгон считается завершенным, если отсутствует перекрытие, и движение автомобилей по оптимальной в данной ситуации траектории не приведет к контакту.",
    rulesPenalty1: "15 секунд за контакт",
    rulesPenalty2: "Проезд по питлейну (DT), за столкновение повреждением авто",
    rulesPenalty3: "SG30 за действия, которые привели к массовой аварии",
    rulesPenalty4: "15 секунд за игнорирование синих флагов",
    rulesPenalty5:
      "DT за повторное игнорирование синих флагов / DSQ за злостное и намеренное игнорирование",
    rulesPenalty6:
      "15 секунд за непредоставление позиции в случае выезда за пределы трассы в борьбе (см пункт 9)",
    rulesPenalty7:
      "DT за пересечение линии разметки на въезде или выезде из питов (см пункт 1)",
    rulesPenalty8: "15 секунд за блокирование автомобиля",
    rulesPenalty9:
      "DT за небезопасное возвращение на гоночную дорожку, повлекшее за собой столкновение",
    rulesPenalty10: "15 секунд за неоднократную смену траектории в борьбе",
    rulesPenalty11: "DT за 3-ий контакт после 2-ух по п.1 15 сек",
    rulesPenalty12: "Дисквалификация = за небезопасную езду и повторение ошибок",
    rulesPenalty13: "DT за намеренное блокирование автомобиля",
    btnLastRaces: "Архив гонок",
    btnSpecialEvent: "Спец. ивент",
    lastRacesBtn: "Последние гонки",
    btnBackHome: "Главная",
    btnBestLaps: "Лучшие круги",
    btnWorstSafety: "Штрафы",
    btnAboutServer: "О сервере",
    serversLabel: "Серверы",
    serversOnlineLabel: "Серверы онлайн",
    serversOnlineTooltip: "Показать статус серверов",
    serverPlayersCountLabel: "игроков",
    serverStatusLabel: "Сервер",
    serverStatusOnline: "ОНЛАЙН",
    serverStatusOffline: "ОФФЛАЙН",
    serverStatusDegraded: "ЧАСТИЧНО",
    serverTotalPlayersLabel: "Всего игроков",
    serverTotalPlayersNote: "Серверы",
    serversWidgetTitle: "Статус серверов",
    serverMainLabel: "Главный",
    serverSunsetLabel: "Sunset",
    serverHourlyLabel: "Часовая",
    serverConnectBtn: "Подключиться",
    serverConnectHowTo: "Как подключиться?",
    serverConnectUnavailable: "Укажите публичный IP/host сервера, чтобы включить прямое подключение",
    serverPlayersEyebrow: "Live сервер",
    playersOnlineTitle: "Игроки онлайн",
    playersOnlineEmpty: "Сейчас на сервере никого нет.",
    playersOnlineUpdated: "Обновлено {time}",
    driversCountLabel: "Пилотов в рейтинге",
    driversCountNote: "Уникальные участники, попавшие в статистику.",
    bestLapHighlightLabel: "Лучший круг",
    bestLapTracksButton: "Лучшие круги треков",
    bestLapTracksTitle: "Лучшие круги треков",
    bestLapTracksSubtitle: "По одному лучшему кругу для каждой трассы.",
    driverBestLapTracksSubtitle: "Лучший круг пилота на каждой трассе.",
    bestLapTracksTooltip: "Открыть список лучших кругов по трассам: пилот, машина и время круга.",
    bestlapsTrackFilterLabel: "Трасса",
    bestLapNoteFallback: "Лучший круг будет показан здесь.",
    bestLapNoteTemplate: "{driver} · {track}",
    top3Title: "Топ-3 пилота",
    top3Subtitle: "Текущие лидеры чемпионата по очкам.",
    championshipTitle: "Рейтинг",
    championshipSubtitle: "Строка открывает быстрый просмотр, имя пилота ведёт в полный профиль.",
    combinedStatsSubtitleLeaderboard: "Строка: быстро. Имя: профиль.",
    statsHubTitle: "Статистика пилотов",
    supportWidgetTitle: "Поддержать ASG Racing",
    supportWidgetText: "Если тебе нравится сервер, стримы и сайт со статистикой, можно быстро поддержать проект донатом и помочь ему двигаться дальше.",
    supportWidgetButton: "Поддержать проект",
    supportWidgetButtonAria: "Открыть страницу поддержки ASG Racing в DonationAlerts",
    supportWidgetQrNote: "Открой DonationAlerts по кнопке или отсканируй QR-код с телефона.",
    bgVideoSoundToggleTitle: "Смотреть со звуком",
    bgVideoSoundToggleNote: "Сделать сайт почти прозрачным и включить звук",
    bgVideoSoundToggleTitleActive: "Вернуть сайт",
    bgVideoSoundToggleNoteActive: "Выключить звук и вернуть обычный режим",
    bgVideoSoundToggleAria: "Включить фоновое видео со звуком и сделать сайт почти прозрачным",
    bgVideoSoundToggleAriaActive: "Выключить звук фонового видео и вернуть обычный режим сайта",
    bgVideoVolumeLabel: "Громкость",
    bgVideoVolumeAria: "Громкость фонового видео",
    bgVideoPlaybackToggleAria: "Полностью отключить фоновое видео на сайте",
    bgVideoPlaybackToggleAriaActive: "Снова включить фоновое видео на сайте",
    bgVideoPlaybackStateOn: "ON",
    bgVideoPlaybackStateOff: "OFF",
    bestLapsTitle: "Лучшие круги",
    bestLapsSubtitle: "Строка открывает быстрый просмотр, имя пилота ведёт в полный профиль.",
    combinedStatsSubtitleBestlaps: "Строка: быстро. Имя: профиль.",
    worstSafetyTitle: "Штрафы и нарушения",
    worstSafetySubtitle: "Количество штрафов, штрафные баллы и разбивка по типам нарушений.",
    combinedStatsSubtitleSafety: "SR, штрафы и инциденты.",
    aboutTitle: "О сервере ASG Racing",
    aboutSubtitle: "Публичный сервер Assetto Corsa Competizione",
    aboutP1:
      "<strong>ASG Racing</strong> - это публичный сервер <strong>Assetto Corsa Competizione</strong>, где пилоты соревнуются на популярных GT3 трассах, улучшают свои времена круга и сравнивают статистику с другими пилотами.",
    aboutP2: "На этой странице автоматически публикуется рейтинг сервера, включающий:",
    aboutList1: "\u2022 количество гонок",
    aboutList2: "\u2022 победы",
    aboutList3: "\u2022 подиумы",
    aboutList4: "\u2022 средний финиш",
    aboutList5: "\u2022 лучшие круги",
    aboutP3:
      "Статистика обновляется автоматически на основе файлов результатов <strong>ACC Dedicated Server</strong>. После каждой гонки данные пересчитываются и публикуются на сайте.",
    pointsTitle: "Как считается рейтинг",
    pointsP1: "Очки за гонку зависят от числа пилотов, попавших в классификацию этой гонки:",
    pointsList1: "25+ пилотов - базовая GT-шкала 25/18/15/12/10/8/6/4/2/1",
    pointsList2: "20-24 / 15-19 / 10-14 пилотов - та же шкала уменьшается так, чтобы победитель получил 20 / 15 / 10 очков",
    pointsList3: "5-9 пилотов - победитель получает 5 очков, остальные места уменьшаются пропорционально",
    pointsList4: "1-4 пилота - победитель получает число очков, равное числу классифицированных пилотов",
    pointsP2:
      "Все дробные значения округляются до целых: 0.1-0.5 вниз, 0.6-0.9 вверх. За лучший круг пилот всегда получает <strong>+1 очко</strong>.",
    bestLapsInfoTitle: "Лучшие круги",
    bestLapsInfoP1:
      "Таблица <strong>лучших кругов</strong> содержит лучшие времена круга, показанные как в квалификации, так и в гонках. Это позволяет сравнить абсолютную скорость пилотов.",
    joinTitle: "Присоединиться к серверу",
    joinP1: "Чтобы участвовать в гонках и попасть в таблицу лидеров, подключайтесь к серверу:",
    joinP1b: "Открой браузер серверов ACC и ищи следующие названия:",
    serverName: "ASG Racing ACC Public Server",
    serverName1: "ASG Racing Live Leaderboard",
    serverName2: "ASG Racing Monza - SA Gainer",
    serverName3: "ASG Racing Monza - SA Gainer 2",
    serverName4: "ASG Racing Nordschleife Practice",
    serverName5: "ASG Racing Nurburgring - Live Leaderboard",
    serverName6: "ASG Racing Nordschleife - Live Leaderboard",
    serverName7: "ASG Racing Spa - SA Gainer 3",
    serverName8: "ASG Racing Spa - Live Leaderboard",
    joinP2: "Общение и новости сервера доступны в наших сообществах:",
    joinCommunityTelegram: "Telegram: анонсы гонок, напоминания, голосования, результаты и быстрые обновления по серверу.",
    joinCommunityDiscord: "Discord: голосовое общение, поиск соперников, разговоры про сетапы и коммуникация во время гонок.",
    communityTelegramTitle: "Telegram",
    communityTelegramText: "Самый быстрый способ не пропускать анонсы гонок, сборы, напоминания, голосования, результаты и весь движ ASG Racing.",
    communityTelegramCta: "Влететь в движ",
    communityDiscordTitle: "Discord",
    communityDiscordText: "Голос, общение, поиск соперников, разговоры про сетапы и то самое чувство живого паддока между заездами.",
    communityDiscordCta: "Зайти в паддок",
    communityYoutubeTitle: "YouTube",
    communityYoutubeText: "Записи гонок, хайлайты и моменты, которые хочется пересматривать уже после клетчатого флага.",
    communityYoutubeCta: "Смотреть хайлайты",
    communityTwitchTitle: "Twitch",
    communityTwitchText: "Записи гонок, хайлайты и моменты, которые хочется пересматривать уже после клетчатого флага.",
    communityTwitchCta: "Смотреть на Twitch",
    twitchWidgetTitle: "ASG Racing сейчас стримит!",
    twitchWidgetOpen: "Открыть стрим",
    twitchWidgetExpand: "Больше",
    twitchWidgetCollapse: "Меньше",
    twitchWidgetHide: "Свернуть",
    twitchWidgetShow: "Развернуть стрим",
    topGuideLauncher: "Впервые здесь?",
    topGuideDismiss: "Пропустить",
    topGuideBack: "Назад",
    topGuideNext: "Дальше",
    topGuideDone: "Понятно",
    topGuideProgress: "Шаг {current} из {total}",
    topGuideStepWelcomeTitle: "Добро пожаловать в статистику сервера",
    topGuideStepWelcomeText: "Здесь собрана статистика ASG Racing: рейтинг пилотов, статус сервера, история гонок и быстрые переходы в комьюнити.",
    topGuideStepChampionshipTitle: "Начните с чемпионата",
    topGuideStepChampionshipText: "Это главный рейтинг пилотов. Здесь можно найти себя, сравнить очки и перейти в полный профиль пилота.",
    topGuideStepSearchTitle: "Найди себя в топе",
    topGuideStepSearchText: "Используйте это поле поиска, чтобы быстро найти себя в таблице, а не просматривать весь рейтинг вручную.",
    topGuideStepProfileTitle: "Открой детальную статистику пилота",
    topGuideStepProfileText: "Кликните по своему имени в таблице чемпионата, чтобы открыть полный профиль пилота с историей гонок, темпом и детальной статистикой.",
    topGuideStepRacesTitle: "Здесь последние гонки",
    topGuideStepRacesText: "Эта кнопка ведет в архив недавних гонок, где у каждого заезда есть полный протокол и порядок финиша.",
    topGuideStepHourlyTitle: "А здесь часовые гонки",
    topGuideStepHourlyText: "В этой карточке показана ближайшая часовая гонка: трасса, время старта, регистрации и подробности слота.",
    communityTiktokTitle: "TikTok",
    communityTiktokText: "Короткие яркие моменты: обгоны, хаос, эмоции и самые цепляющие эпизоды ASG Racing.",
    communityTiktokCta: "Поймать лучшие моменты",
    footerText:
      "Данные собираются из файлов результатов ACC Dedicated Server и публикуются через GitHub Pages.",
    loading: "Загрузка...",
    loadingRaces: "Загрузка гонок...",
    loadingLeaderboard: "Загрузка таблицы чемпионата...",
    loadingBestLaps: "Загрузка лучших кругов...",
    loadingSafety: "Загрузка штрафов...",
    emptyTop3: "Пока нет данных для топ-3.",
    emptyLeaderboard: "Пока нет данных рейтинга.",
    emptyBestLaps: "Пока нет данных по лучшим кругам.",
    emptySafety: "Пока нет данных по штрафам.",
    emptyRaces: "Пока нет данных о гонках.",
    emptySearch: "Совпадений не найдено.",
    errorLoading: "Ошибка загрузки данных.",
    errorLeaderboard: "Не удалось загрузить таблицу чемпионата.",
    errorBestlaps: "Не удалось загрузить лучшие круги.",
    racesEyebrow: "Архив гонок",
    racesPageTitle: "Последние гонки",
    racesPageSubtitle: "Последние гоночные сессии ASG Racing. Нажмите на строку, чтобы открыть полный протокол.",
    racesSearchPlaceholder: "Поиск по трассе или пилоту...",
    racesTrackFilterAll: "Все трассы",
    clearFilters: "Сбросить фильтры",
    resultsCount: "Результатов: {count}",
    filterSearchLabel: "Поиск",
    filterTrackLabel: "Трасса",
    filterCarLabel: "Машина",
    filterMinRacesLabel: "Мин. гонок",
    emptyFilteredRaces: "Нет гонок, подходящих под текущие фильтры.",
    emptyFilteredCars: "Нет машин, подходящих под текущие фильтры.",
    racesSummaryTotal: "Всего гонок",
    racesSummaryAvgActive: "Ср. активных пилотов",
    racesSummaryAvgOvertakes: "Ср. обгонов",
    racesSummaryTopWinner: "Лучший победитель",
    racesSummaryLatestWinner: "Последний победитель",
    racesSummaryLastWinnerBestLap: "Лучший круг победителя",
    racesTableTitle: "Результаты гонок",
    racesTableSubtitle: "Клик по строке открывает окно деталей. Имя открывает полный профиль.",
    raceModalEyebrow: "Детали гонки",
    racesCols: ["Дата", "Трасса", "Победитель", "Пилоты", "Ср. ELO", "Лучший круг"],
    raceModalCols: ["Поз.", "Старт", "\u0394 Поз.", "Пилот", "Лучший круг", "Машина", "Отставание", "\u0394ELO", "SR", "Очки"],
    notCountedBadge: "Не засчитано",
    countedBadge: "Засчитано",
    raceSummaryTrack: "Трасса",
    raceSummaryWinner: "Победитель",
    raceSummaryDrivers: "Пилотов",
    raceSummaryBestLap: "Лучший круг",
    raceSummaryStatus: "Статус",
    racePenaltyShort: "Штр. очки",
    raceBestLapBadge: "Быстрый круг",
    noWinner: "Нет победителя",
    pageTitleDriver: "ASG Racing Профиль пилота | Статистика Assetto Corsa Competizione",
    driverEyebrow: "Профиль пилота",
    driverPreviewEyebrow: "Быстрый просмотр пилота",
    driverPreviewSubtitle: "Ключевые показатели темпа и результатов на сервере ASG Racing.",
    driverPreviewOpenPage: "Перейти на страницу пилота",
    driverPreviewRowHint: "Клик по строке открывает окно деталей",
    driverPreviewLinkHint: "Имя открывает полный профиль",
    driverPageSubtitle: "Личная история гонок, темп и штрафная статистика на сервере ASG Racing.",
    driverSummaryPoints: "Очки",
    driverSummaryAvgPoints: "Ср. очков / гонку",
    driverSummaryAvgGain: "Ср. изменение поз.",
    driverSummaryRaces: "Гонки",
    driverSummaryWins: "Победы",
    driverSummaryPodiums: "Подиумы",
    driverSummaryAvgFinish: "Ср. финиш",
    driverSummaryBestLap: "Лучший круг",
    driverSummaryBestLapTrack: "Трасса для лучшего круга",
    driverSummaryBestLapTooltip: "Лучший записанный круг на выбранной трассе",
    driverSummaryAvgPace: "Средний темп",
    driverSummaryAvgPaceTrack: "Трасса для среднего темпа",
    driverSummaryAvgPaceTooltip: "Средний круг за 5 последних зачтенных гонок на выбранной трассе",
    driverSummaryPenaltyPoints: "Штрафные очки",
    driverSummaryFastestLaps: "Лучшие круги в гонке",
    driverSectionOverview: "Обзор",
    driverSectionRaces: "История гонок",
    driverSectionRacesSubtitle: "Клик по строке открывает окно деталей.",
    driverSectionTracks: "Статистика по трассам",
    driverSectionPenalties: "Разбор штрафов",
    driverRecentForm: "Последние результаты",
    driverMostRacedTrack: "Любимая трасса",
    driverFavoriteCar: "Любимая машина",
    bannedLabel: "ЗАБАНЕН",
    driverWinRate: "Процент побед",
    driverPodiumRate: "Процент подиумов",
    driverRankingPosition: "Позиция в рейтинге",
    driverNoData: "Профиль пилота не найден.",
    driverLoading: "Загрузка профиля пилота...",
    driverRaceCols: ["Дата", "Трасса", "Старт", "Поз", "\u0394 Поз.", "Очки", "Лучший круг", "Машина", "Отставание", "\u0394ELO", "SR"],
    driverTrackCols: ["Трасса", "Гонки", "Победы", "Подиумы", "Очки", "Ср. финиш", "Лучший круг"],
    driverPenaltyReason: "Причина",
    driverPenaltyType: "Тип",
    leaderboardCols: [
      "№",
      "Пилот",
      "ELO",
      "SR",
      "Очки",
      "Победы",
      "Подиумы",
      "Гонки",
      "Ср. финиш",
      "Лучший круг",
      "Машина"
    ],
    bestlapsCols: ["№", "Пилот", "ELO", "SR", "Лучший круг", "Машина", "Сессия", "Обновлено"],
    safetyBaseCols: ["№", "Пилот", "SR", "Категория", "Гонки", "\u0394 SR", "Грязные круги", "Автоштрафы", "Инциденты"],
    leaderboardSearchPlaceholder: "Поиск пилота...",
    bestlapsSearchPlaceholder: "Поиск пилота...",
    safetySearchPlaceholder: "Поиск пилота...",
    metaLabels: {
      points: "Очки",
      wins: "Победы",
      podiums: "Подиумы",
      races: "Гонки",
      bestLap: "Лучший круг"
    },
    sessionRace: "Гонка",
    sessionQualifying: "Квала",
    paginationShown: "Показано {start}-{end} из {total}",
    prev: "< Назад",
    next: "Вперёд >"
  }
};

Object.assign(translations.en, {
  updatedPrefix: "Updated",
  todayRacesNote: "Races today: {value}",
  todayPointsNote: "Points today: {value}",
  heroFunnelTitle: "Monza 24/7, daily events, beginner-friendly help",
  heroFunnelNote: "<a class=\"hero-funnel-link hero-funnel-link-telegram\" href=\"https://t.me/+JUymrENgddcyMTdi\" target=\"_blank\" rel=\"noopener noreferrer\">Telegram</a> and <a class=\"hero-funnel-link hero-funnel-link-discord\" href=\"https://discord.gg/cEPFHXXtTC\" target=\"_blank\" rel=\"noopener noreferrer\">Discord</a> are the most convenient ways to stay in touch with the community. Here you will find reminders, results, voting, and live sim racing conversations.",
  joinTelegramBtn: "Join Telegram",
  joinDiscordBtn: "Join Discord",
  heroOpenHourlyBtn: "Next hourly event",
  hourlyModalEyebrow: "Slot details",
  hourlyOpenDetailsLabel: "Open hourly event details",
  hourlyServerLabel: "Server",
  hourlyPasswordLabel: "Password",
  hourlyDateTimeLabel: "Date + time",
  hourlyEntryLabel: "Entry",
  hourlyFormatLabel: "Format",
  hourlyPitstopLabel: "Pitstop",
  hourlyRefuelLabel: "Refuel",
  hourlyTyresLabel: "Tyres",
  hourlyWeatherLabel: "Weather",
  hourlyPasswordNone: "No password",
  hourlyUnknownValue: "--",
  hourlyEntrySlots: "{value} slots",
  hourlyEntrySafety: "SAFETY {value}",
  hourlyEntryTrackMedals: "{value} medals",
  hourlyEntryRacecraft: "RC {value}",
  hourlyPitNoMandatory: "No mandatory stop",
  hourlyMandatoryPitstopCount: "{value} mandatory stop",
  hourlyMandatoryPitstopCountPlural: "{value} mandatory stops",
  hourlyPitWindow: "Window {value}m",
  hourlyPitRefuelAllowed: "Refuel allowed",
  hourlyPitRefuelFixed: "Fixed refuel time",
  hourlyRefuelMandatory: "Refuel required",
  hourlyRefuelNone: "No refuel",
  hourlyTyresMandatory: "Tyre change required",
  hourlyTyresSets: "{value} sets",
  hourlyTyresNone: "No tyre rule",
  hourlyWeatherTemp: "{value}°C",
  hourlyWeatherClouds: "Clouds {value}%",
  hourlyWeatherRain: "Rain {value}%",
  hourlyWeatherRandom: "Random {value}"
});

Object.assign(translations.ru, {
  updatedPrefix: "Обновлено",
  todayRacesNote: "Гонок за сегодня: {value}",
  todayPointsNote: "Очков за сегодня: {value}",
  heroFunnelTitle: "Monza 24/7, ежедневные заезды, помощь новичкам",
  heroFunnelNote: "<a class=\"hero-funnel-link hero-funnel-link-telegram\" href=\"https://t.me/+JUymrENgddcyMTdi\" target=\"_blank\" rel=\"noopener noreferrer\">Telegram</a> и <a class=\"hero-funnel-link hero-funnel-link-discord\" href=\"https://discord.gg/cEPFHXXtTC\" target=\"_blank\" rel=\"noopener noreferrer\">Discord</a> - самые удобные способы общения в комьюнити. Здесь ты найдёшь напоминания, результаты, голосования и живое общение на симрейсинговые темы.",
  joinTelegramBtn: "Вступить в Telegram",
  joinDiscordBtn: "Вступить в Discord",
  heroOpenHourlyBtn: "Ближайшая часовая гонка",
  hourlyModalEyebrow: "Детали слота",
  hourlyOpenDetailsLabel: "Открыть детали часовой гонки",
  hourlyServerLabel: "Сервер",
  hourlyPasswordLabel: "Пароль",
  hourlyDateTimeLabel: "Дата + время",
  hourlyEntryLabel: "Вход",
  hourlyFormatLabel: "Формат",
  hourlyPitstopLabel: "Пит-стоп",
  hourlyRefuelLabel: "Заправка",
  hourlyTyresLabel: "Шины",
  hourlyWeatherLabel: "Погода",
  hourlyPasswordNone: "Без пароля",
  hourlyUnknownValue: "--",
  hourlyEntrySlots: "{value} слотов",
  hourlyEntrySafety: "SAFETY {value}",
  hourlyEntryTrackMedals: "{value} медалей",
  hourlyEntryRacecraft: "RC {value}",
  hourlyPitNoMandatory: "Без обязательного пит-стопа",
  hourlyMandatoryPitstopCount: "{value} обязательный пит-стоп",
  hourlyMandatoryPitstopCountPlural: "{value} обязательных пит-стопа",
  hourlyPitWindow: "Окно {value}м",
  hourlyPitRefuelAllowed: "Заправка разрешена",
  hourlyPitRefuelFixed: "Фикс. время заправки",
  hourlyRefuelMandatory: "Заправка обязательна",
  hourlyRefuelNone: "Без заправки",
  hourlyTyresMandatory: "Смена шин обязательна",
  hourlyTyresSets: "{value} комплектов",
  hourlyTyresNone: "Без правила по шинам",
  hourlyWeatherTemp: "{value}°C",
  hourlyWeatherClouds: "Облака {value}%",
  hourlyWeatherRain: "Дождь {value}%",
  hourlyWeatherRandom: "Случайность {value}"
});

Object.assign(translations.en, {
  eloColumn: "ELO",
  eloTitle: "ELO rating",
  eloModalEyebrow: "Driver strength",
  eloModalSubtitle: "Rating history across counted races.",
  eloCurrentRating: "Current ELO",
  eloCategoryLabel: "Rank",
  eloNoData: "ELO data is not available yet.",
  eloHistoryEmpty: "No ELO history for this driver yet.",
  eloPeriodAll: "All",
  eloPeriod365: "1Y",
  eloPeriod180: "180D",
  eloPeriod90: "90D",
  eloPeriod30: "30D",
  eloPeriod7: "7D",
  eloPeriod1: "1D",
  eloPrevPeriod: "Previous period",
  eloNextPeriod: "Next period",
  eloGridLow: "Low",
  eloGridMedium: "Medium",
  eloGridHigh: "High",
  eloGridLabel: "Grid",
  eloAboutTitle: "ELO rating",
  eloAboutP1: "ELO is recalculated after counted races. Finish position is compared with lobby strength, so beating stronger rivals gives more rating and losing to weaker rivals removes more ELO.",
  eloAboutP2: "Ranks are based on ELO thresholds: C1 1350+, C2 1250+, C3 1150+, C4 1050+, C5 950+, C6 below 950.",
  eloCategory1: "Category 1 — Champion",
  eloCategory2: "Category 2 — Platinum",
  eloCategory3: "Category 3 — Gold",
  eloCategory4: "Category 4 — Silver",
  eloCategory5: "Category 5 — Bronze",
  eloCategory6: "Category 6 — Rookie"
});

Object.assign(translations.ru, {
  eloColumn: "ELO",
  eloTitle: "ELO рейтинг",
  eloModalEyebrow: "Сила пилота",
  eloModalSubtitle: "История изменения рейтинга по засчитанным гонкам.",
  eloCurrentRating: "Текущий ELO",
  eloCategoryLabel: "Ранг",
  eloNoData: "Данные ELO пока недоступны.",
  eloHistoryEmpty: "У этого пилота пока нет истории ELO.",
  eloPeriodAll: "Все",
  eloPeriod365: "1Г",
  eloPeriod180: "180Д",
  eloPeriod90: "90Д",
  eloPeriod30: "30Д",
  eloPeriod7: "7Д",
  eloPeriod1: "1Д",
  eloPrevPeriod: "Предыдущий период",
  eloNextPeriod: "Следующий период",
  eloGridLow: "Низкая",
  eloGridMedium: "Средняя",
  eloGridHigh: "Высокая",
  eloGridLabel: "Сетка",
  eloAboutTitle: "ELO рейтинг",
  eloAboutP1: "ELO пересчитывается после зачтенных гонок. Финиш сравнивается с силой лобби: победа над сильными соперниками дает больше рейтинга, проигрыш слабым снимает больше ELO.",
  eloAboutP2: "Ранги считаются по порогам ELO: C1 1350+, C2 1250+, C3 1150+, C4 1050+, C5 950+, C6 ниже 950.",
  eloCategory1: "Категория 1 — Чемпион",
  eloCategory2: "Категория 2 — Платина",
  eloCategory3: "Категория 3 — Золото",
  eloCategory4: "Категория 4 — Серебро",
  eloCategory5: "Категория 5 — Бронза",
  eloCategory6: "Категория 6 — Новичок"
});

Object.assign(translations.en, {
  btnWorstSafety: "Safety Rating",
  safetyRatingTitle: "Safety Rating",
  safetyModalEyebrow: "Racecraft",
  safetyModalSubtitle: "Safety Rating history across counted races.",
  safetyCurrentRating: "Current SR",
  safetyCategoryLabel: "Category",
  safetyNoData: "Safety Rating data is not available yet.",
  safetyHistoryEmpty: "This driver has no Safety Rating history yet.",
  safetyCategoryA: "Category A",
  safetyCategoryB: "Category B",
  safetyCategoryC: "Category C",
  safetyAboutTitle: "Safety Rating",
  safetyAboutP1: "SR v2 starts from 3.00 and is recalculated only from counted race finishes. A race changes SR only if the driver covers at least 50% of the leader's distance. The scale is capped to 1.00-9.99: A is 5.00+, B is 2.50-4.99, C is below 2.50.",
  safetyAboutP2: "Clean-lap score: 0 invalid laps = +0.10 SR, 1-3 = +0.05, 4-5 = 0.00, 6+ = -0.025 per lap above 5. Automatic race penalties for Cutting, PitSpeeding, and Trolling are counted with x0.5 weight. Incidents use a separate scale and matter more: 0 points = +0.10, 1-2 = +0.05, 3 = 0.00, 4 = -0.02, 5-6 = -0.05, 7-9 = -0.10, 10-13 = -0.18, 14+ = -0.30. Manual/admin penalties are ignored.",
  safetyCategoryRangeA: "A - clean",
  safetyCategoryRangeB: "B - stable",
  safetyCategoryRangeC: "C - risky",
  safetyReasonTitle: "Why SR changed",
  safetyReasonCompletedLaps: "Completed laps",
  safetyReasonValidInvalid: "Valid / invalid laps",
  safetyReasonDistance: "Race distance",
  safetyReasonBaseDelta: "Clean-race delta",
  safetyReasonPenaltyDelta: "Penalty delta",
  safetyReasonIncidentDelta: "Incident delta",
  safetyReasonFinalDelta: "Final delta",
  safetyReasonAutoPenalties: "Automatic penalties",
  safetyReasonIncidents: "Incidents",
  safetyReasonIncidentBursts: "Incident bursts",
  safetyReasonIncidentClusters: "Incident clusters",
  safetyReasonIgnoredPenalties: "Ignored penalties",
  safetyBreakdownSr: "SR",
  safetyBreakdownClean: "Clean",
  safetyBreakdownPenalties: "Penalties",
  safetyBreakdownIncidents: "Incidents",
  safetyBreakdownIncidentPoints: "Incident points",
  safetyBreakdownOpenRace: "Open race details",
  safetyBreakdownLoading: "Loading SR breakdown...",
  safetyBreakdownNoData: "SR breakdown is not available for this race yet.",
  safetySummaryTitle: "Safety Rating summary",
  safetySummaryRaces: "Counted SR races",
  safetySummaryTotalDelta: "Total SR delta",
  safetySummaryTotalLaps: "Total laps",
  safetySummaryInvalidLaps: "Invalid laps",
  safetySummaryInvalidRate: "Invalid lap rate",
  safetySummaryAutoPenalties: "Automatic penalties",
  safetySummaryIncidents: "Incidents",
  safetySummaryIncidentBursts: "Incident bursts",
  safetySummaryIncidentClusters: "Incident clusters",
  worstSafetyTitle: "Safety Rating",
  worstSafetySubtitle: "Driver safety score based on invalid laps, automatic race penalties, and incidents.",
  loadingSafety: "Loading Safety Rating...",
  emptySafety: "No Safety Rating data yet."
});

Object.assign(translations.ru, {
  btnWorstSafety: "Safety Rating",
  safetyRatingTitle: "Рейтинг безопасности",
  safetyModalEyebrow: "Безопасность пилота",
  safetyModalSubtitle: "История изменения Safety Rating по зачтенным гонкам.",
  safetyCurrentRating: "Текущий SR",
  safetyCategoryLabel: "Категория",
  safetyNoData: "Данные Safety Rating пока недоступны.",
  safetyHistoryEmpty: "У этого пилота пока нет истории Safety Rating.",
  safetyCategoryA: "Категория A",
  safetyCategoryB: "Категория B",
  safetyCategoryC: "Категория C",
  safetyAboutTitle: "Safety Rating",
  safetyAboutP1: "SR v2 стартует с 3.00 и считается только по зачтенным финишам гонок. Гонка влияет на SR, только если пилот проехал не меньше 50% дистанции лидера. Диапазон рейтинга ограничен 1.00-9.99: A - 5.00+, B - 2.50-4.99, C - ниже 2.50.",
  safetyAboutP2: "Шкала за чистоту кругов: 0 грязных кругов = +0.10 SR, 1-3 = +0.05, 4-5 = 0.00, 6+ = -0.025 за каждый круг сверх 5. Автоштрафы за Cutting, PitSpeeding и Trolling учитываются с весом x0.5. Инциденты считаются отдельно и влияют сильнее: 0 очков = +0.10, 1-2 = +0.05, 3 = 0.00, 4 = -0.02, 5-6 = -0.05, 7-9 = -0.10, 10-13 = -0.18, 14+ = -0.30. Ручные штрафы админов не учитываются.",
  safetyCategoryRangeA: "A - чисто",
  safetyCategoryRangeB: "B - стабильно",
  safetyCategoryRangeC: "C - риск",
  safetyReasonTitle: "Почему изменился SR",
  safetyReasonCompletedLaps: "Пройдено кругов",
  safetyReasonValidInvalid: "Валидные / грязные круги",
  safetyReasonDistance: "Дистанция гонки",
  safetyReasonBaseDelta: "Дельта за чистоту",
  safetyReasonPenaltyDelta: "Дельта за штрафы",
  safetyReasonIncidentDelta: "Дельта за инциденты",
  safetyReasonFinalDelta: "Итоговая дельта",
  safetyReasonAutoPenalties: "Автоштрафы",
  safetyReasonIncidents: "Инциденты",
  safetyReasonIncidentBursts: "Серии инцидентов",
  safetyReasonIncidentClusters: "Кластеры инцидентов",
  safetyReasonIgnoredPenalties: "Игнор. штрафы",
  safetyBreakdownSr: "SR",
  safetyBreakdownClean: "Чистота",
  safetyBreakdownPenalties: "Штрафы",
  safetyBreakdownIncidents: "Инциденты",
  safetyBreakdownIncidentPoints: "Очки инцидентов",
  safetyBreakdownOpenRace: "Открыть детали гонки",
  safetyBreakdownLoading: "Загрузка расшифровки SR...",
  safetyBreakdownNoData: "Расшифровка SR для этой гонки пока недоступна.",
  safetySummaryTitle: "Статистика Safety Rating",
  safetySummaryRaces: "Гонок в SR",
  safetySummaryTotalDelta: "Суммарная дельта SR",
  safetySummaryTotalLaps: "Всего кругов",
  safetySummaryInvalidLaps: "Грязные круги",
  safetySummaryInvalidRate: "Доля грязных кругов",
  safetySummaryAutoPenalties: "Автоштрафы",
  safetySummaryIncidents: "Инциденты",
  safetySummaryIncidentBursts: "Серии инцидентов",
  safetySummaryIncidentClusters: "Кластеры инцидентов",
  worstSafetyTitle: "Safety Rating",
  worstSafetySubtitle: "Оценка безопасности пилота по грязным кругам, автоматическим гоночным штрафам и инцидентам.",
  loadingSafety: "Загрузка Safety Rating...",
  emptySafety: "Пока нет данных Safety Rating."
});

currentLang = resolveInitialLanguage();

const leaderboardColumns = [
  { key: "rank", type: "number", className: "rank-column" },
  { key: "driver", type: "string", className: "driver-column" },
  { key: "elo", type: "number", className: "elo-column" },
  { key: "safety_rating", type: "number", className: "sr-column" },
  { key: "points", type: "number", className: "points-column" },
  { key: "wins", type: "number", className: "wins-column" },
  { key: "podiums", type: "number", className: "podiums-column" },
  { key: "races", type: "number", className: "races-column" },
  { key: "average_finish", type: "number", className: "avg-finish-column" },
  { key: "best_lap", type: "time", className: "best-lap-column" },
  { key: "best_lap_car_name", type: "string", className: "car-column" }
];

const bestlapsColumns = [
  { key: "rank", type: "number" },
  { key: "driver", type: "string" },
  { key: "elo", type: "number" },
  { key: "safety_rating", type: "number" },
  { key: "best_lap", type: "time" },
  { key: "car_name", type: "string" },
  { key: "session_type", type: "string" },
  { key: "updated_at", type: "string" }
];

const racesColumns = [
  { key: "finished_at", type: "string" },
  { key: "track", type: "string" },
  { key: "winner", type: "string" },
  { key: "participants_count", type: "number" },
  { key: "average_elo", type: "number" },
  { key: "best_lap", type: "time" }
];

const carsColumns = [
  { key: "car_name", type: "string" },
  { key: "races", type: "number" },
  { key: "wins", type: "number" },
  { key: "win_rate", type: "number" },
  { key: "podiums", type: "number" },
  { key: "unique_drivers", type: "number" },
  { key: "average_finish", type: "number" },
  { key: "fastest_lap_awards", type: "number" },
  { key: "best_lap", type: "time" }
];

const carModelNames = {
  0: "Porsche 991 GT3 R",
  1: "Mercedes-AMG GT3",
  2: "Ferrari 488 GT3",
  3: "Audi R8 LMS",
  4: "Lamborghini Huracan GT3",
  5: "McLaren 650S GT3",
  6: "Nissan GT-R Nismo GT3 2018",
  7: "BMW M6 GT3",
  8: "Bentley Continental GT3 2018",
  9: "Porsche 991II GT3 Cup",
  10: "Nissan GT-R Nismo GT3 2017",
  11: "Bentley Continental GT3 2016",
  12: "Aston Martin V12 Vantage GT3",
  13: "Lamborghini Gallardo R-EX",
  14: "Jaguar G3",
  15: "Lexus RC F GT3",
  16: "Lamborghini Huracan Evo (2019)",
  17: "Honda NSX GT3",
  18: "Lamborghini Huracan SuperTrofeo",
  19: "Audi R8 LMS Evo (2019)",
  20: "AMR V8 Vantage (2019)",
  21: "Honda NSX Evo (2019)",
  22: "McLaren 720S GT3 (2019)",
  23: "Porsche 911II GT3 R (2019)",
  24: "Ferrari 488 GT3 Evo 2020",
  25: "Mercedes-AMG GT3 2020",
  26: "Ferrari 488 Challenge Evo",
  27: "BMW M2 CS Racing",
  28: "Porsche 911 GT3 Cup (Type 992)",
  29: "Lamborghini Huracan Super Trofeo EVO2",
  30: "BMW M4 GT3",
  31: "Audi R8 LMS GT3 evo II",
  32: "Ferrari 296 GT3",
  33: "Lamborghini Huracan Evo2",
  34: "Porsche 992 GT3 R",
  35: "McLaren 720S GT3 Evo 2023",
  36: "Ford Mustang GT3"
};

const driverRaceColumns = [
  { key: "finished_at", type: "string" },
  { key: "track", type: "string" },
  { key: "start_position", type: "number" },
  { key: "position", type: "number" },
  { key: "positions_delta", type: "number" },
  { key: "points", type: "number" },
  { key: "best_lap", type: "time" },
  { key: "car_name", type: "string" },
  { key: "gap", type: "string" },
  { key: "elo_rating_delta", type: "number" },
  { key: "safety_rating", type: "number" }
];

const driverTrackColumns = [
  { key: "track", type: "string" },
  { key: "races", type: "number" },
  { key: "wins", type: "number" },
  { key: "podiums", type: "number" },
  { key: "points", type: "number" },
  { key: "average_finish", type: "number" },
  { key: "best_lap", type: "time" }
];


function getSafetyPenaltyKeys(data = []) {
  const keys = new Set();
  data.forEach(row => {
    const penalties = row?.penalties && typeof row.penalties === "object" ? row.penalties : {};
    Object.keys(penalties).forEach(key => keys.add(key));
  });
  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

function formatShortDate(dateStr) {
  if (!dateStr) return "-";
  const [year, month, day] = String(dateStr).split("-");
  if (!day || !month) return dateStr;
  return `${day}.${month}`;
}

function getLast7DaysOnline(data) {
  if (!Array.isArray(data)) return [];

  return [...data]
    .filter(item => item && item.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7)
    .map(item => ({
      date: item.date,
      label: formatShortDate(item.date),
      value: Number(item.unique_players) || 0
    }));
}

function getOnlineWidgetMaxValue(items = []) {
  const values = items
    .map(item => Number(item?.value) || 0)
    .filter(value => Number.isFinite(value));

  return Math.max(1, ...values);
}

function buildOnlineScaleValues(maxValue) {
  const safeMax = Math.max(1, Number(maxValue) || 1);
  return [
    safeMax,
    Math.round(safeMax * 0.67),
    Math.round(safeMax * 0.33),
    0
  ];
}

function getOnlineBarHeightPercent(value, maxValue) {
  const safeValue = Number(value) || 0;
  if (!Number.isFinite(safeValue) || safeValue <= 0) return 0;

  const safeMax = Math.max(1, Number(maxValue) || 1);
  const percent = (safeValue / safeMax) * 100;
  return Math.min(100, Math.max(0, Number(percent.toFixed(2))));
}

function normalizeActivityScore(value, maxValue) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const safeMax = Math.max(1, Number(maxValue) || 1);
  return Math.round((value / safeMax) * 100);
}

function buildRaceActivityInsights(races = []) {
  const dayMap = new Map();

  races.forEach(race => {
    const finishedAt = race?.finished_at;
    if (!finishedAt) return;

    const finishedDate = new Date(finishedAt);
    if (Number.isNaN(finishedDate.getTime())) return;

    const dayKey = finishedAt.slice(0, 10);
    const hourKey = String(finishedDate.getHours()).padStart(2, "0");
    const participants = Array.isArray(race?.results) ? race.results : [];
    const participantsCount = Number.isFinite(race?.participants_count)
      ? race.participants_count
      : participants.length;

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, {
        date: dayKey,
        races: 0,
        entries: 0,
        uniquePlayers: new Set(),
        tracks: new Set(),
        hours: new Map(),
        participants: new Map()
      });
    }

    const dayEntry = dayMap.get(dayKey);
    dayEntry.races += 1;
    dayEntry.entries += participantsCount;
    if (race?.track) dayEntry.tracks.add(race.track);

    if (!dayEntry.hours.has(hourKey)) {
      dayEntry.hours.set(hourKey, {
        hour: hourKey,
        label: `${hourKey}:00`,
        races: 0,
        entries: 0,
        uniquePlayers: new Set()
      });
    }

    const hourEntry = dayEntry.hours.get(hourKey);
    hourEntry.races += 1;
    hourEntry.entries += participantsCount;

    participants.forEach(result => {
      const playerId = result?.player_id;
      if (!playerId) return;

      dayEntry.uniquePlayers.add(playerId);
      hourEntry.uniquePlayers.add(playerId);

      if (!dayEntry.participants.has(playerId)) {
        dayEntry.participants.set(playerId, {
          player_id: playerId,
          public_id: result?.public_id || findPublicIdByPlayerId(playerId),
          driver: result?.driver || findDriverNameByPlayerId(playerId) || "-",
          races: 0,
          points: 0,
          wins: 0,
          average_finish_sum: 0,
          average_finish_count: 0,
          average_finish: null,
          best_lap: null,
          best_lap_ms: null
        });
      }

      const participantEntry = dayEntry.participants.get(playerId);
      participantEntry.races += 1;
      participantEntry.points += Number(result?.points) || 0;

      const position = Number(result?.position);
      if (Number.isFinite(position) && position > 0) {
        participantEntry.average_finish_sum += position;
        participantEntry.average_finish_count += 1;
        participantEntry.average_finish = Number(
          (participantEntry.average_finish_sum / participantEntry.average_finish_count).toFixed(2)
        );
        if (position === 1) participantEntry.wins += 1;
      }

      const bestLapMs = Number(result?.best_lap_ms);
      if (Number.isFinite(bestLapMs) && bestLapMs > 0) {
        if (!Number.isFinite(participantEntry.best_lap_ms) || bestLapMs < participantEntry.best_lap_ms) {
          participantEntry.best_lap_ms = bestLapMs;
          participantEntry.best_lap = result?.best_lap || participantEntry.best_lap;
        }
      }
    });
  });

  const dayEntries = [...dayMap.values()];
  const maxDayRaces = Math.max(1, ...dayEntries.map(day => day.races || 0));
  const maxDayEntries = Math.max(1, ...dayEntries.map(day => day.entries || 0));
  const maxDayUnique = Math.max(1, ...dayEntries.map(day => day.uniquePlayers.size || 0));
  const allHours = dayEntries.flatMap(day => [...day.hours.values()]);
  const maxHourRaces = Math.max(1, ...allHours.map(hour => hour.races || 0));
  const maxHourEntries = Math.max(1, ...allHours.map(hour => hour.entries || 0));
  const maxHourUnique = Math.max(1, ...allHours.map(hour => hour.uniquePlayers.size || 0));

  return dayEntries
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map(day => {
      const normalizedRaces = normalizeActivityScore(day.races, maxDayRaces);
      const normalizedEntries = normalizeActivityScore(day.entries, maxDayEntries);
      const normalizedUnique = normalizeActivityScore(day.uniquePlayers.size, maxDayUnique);
      const activityScore = Math.round(normalizedUnique * 0.45 + normalizedEntries * 0.4 + normalizedRaces * 0.15);

      const hours = Array.from({ length: 24 }, (_, index) => {
        const key = String(index).padStart(2, "0");
        const bucket = day.hours.get(key) || {
          hour: key,
          label: `${key}:00`,
          races: 0,
          entries: 0,
          uniquePlayers: new Set()
        };
        const normalizedHourRaces = normalizeActivityScore(bucket.races, maxHourRaces);
        const normalizedHourEntries = normalizeActivityScore(bucket.entries, maxHourEntries);
        const normalizedHourUnique = normalizeActivityScore(bucket.uniquePlayers.size, maxHourUnique);
        const hourScore = Math.round(normalizedHourUnique * 0.5 + normalizedHourEntries * 0.35 + normalizedHourRaces * 0.15);

        return {
          hour: key,
          label: bucket.label,
          races: bucket.races,
          entries: bucket.entries,
          unique_players: bucket.uniquePlayers.size,
          activity_score: hourScore
        };
      });

      const peakHour = [...hours].sort((a, b) =>
        (b.activity_score - a.activity_score) ||
        (b.entries - a.entries) ||
        (b.unique_players - a.unique_players) ||
        (b.races - a.races) ||
        String(a.hour).localeCompare(String(b.hour))
      )[0] || null;

      const participants = [...day.participants.values()]
        .sort((a, b) =>
          (b.races - a.races) ||
          (b.points - a.points) ||
          (b.wins - a.wins) ||
          ((a.average_finish ?? 9999) - (b.average_finish ?? 9999)) ||
          String(a.driver || "").localeCompare(String(b.driver || ""))
        )
        .map(item => ({
          player_id: item.player_id,
          public_id: item.public_id,
          driver: item.driver,
          races: item.races,
          points: item.points,
          wins: item.wins,
          average_finish: item.average_finish,
          best_lap: item.best_lap
        }));

      return {
        date: day.date,
        races: day.races,
        entries: day.entries,
        unique_players: day.uniquePlayers.size,
        avg_players_per_race: day.races ? Number((day.entries / day.races).toFixed(2)) : 0,
        activity_score: activityScore,
        tracks: [...day.tracks].sort((a, b) => String(a).localeCompare(String(b))),
        peak_hour: peakHour && peakHour.activity_score > 0 ? peakHour : null,
        hours,
        participants
      };
    });
}

function renderOnlineWidget() {
  const chartEl = document.getElementById("online-chart");
  const scaleEl = document.getElementById("online-scale");
  const rangeEl = document.getElementById("online-range");
  const titleEl = document.querySelector(".hero-online-title");
  const cardEl = document.getElementById("hero-online-card");

  if (titleEl) titleEl.textContent = t("onlineTitle");
  if (cardEl) cardEl.setAttribute("aria-label", t("onlineActivityOpenLabel"));
  if (!chartEl || !scaleEl || !rangeEl) return;

  if (topLoadState.home && !onlineData.length) {
    chartEl.innerHTML = `<div class="hero-online-empty">${escapeHtml(t("loading"))}</div>`;
    scaleEl.innerHTML = `<span>0</span>`;
    rangeEl.textContent = t("loading");
    return;
  }

  const prepared = getLast7DaysOnline(onlineData);

  if (!prepared.length) {
    chartEl.innerHTML = `<div class="hero-online-empty">${escapeHtml(t("onlineNoData"))}</div>`;
    scaleEl.innerHTML = `<span>0</span>`;
    rangeEl.textContent = "-";
    return;
  }

  const maxValue = getOnlineWidgetMaxValue(prepared);
  scaleEl.innerHTML = buildOnlineScaleValues(maxValue)
    .map(value => `<span>${escapeHtml(value)}</span>`)
    .join("");

  chartEl.innerHTML = prepared.map(item => {
    const heightPercent = getOnlineBarHeightPercent(item.value, maxValue);
    return `
      <div class="hero-online-bar-group" title="${escapeHtml(item.label)} - ${escapeHtml(item.value)}">
        <div class="hero-online-bar-stage">
          <div class="hero-online-bar" style="height:${heightPercent}%"></div>
        </div>
        <div class="hero-online-date">${escapeHtml(item.label)}</div>
      </div>
    `;
  }).join("");

  const first = prepared[0];
  const last = prepared[prepared.length - 1];
  rangeEl.textContent = `${first.label} - ${last.label}`;
}

function createHourlyModalToken(label, tone = "default", icon = "") {
  return { label, tone, icon };
}

function renderHourlyModalTokens(tokens = []) {
  const safeTokens = tokens.filter(token => token && token.label);
  const normalized = safeTokens.length
    ? safeTokens
    : [createHourlyModalToken(t("hourlyUnknownValue"), "muted")];

  return `<div class="hourly-modal-token-list">${normalized.map(token => `
    <span class="hourly-modal-token hourly-modal-token-${escapeHtml(token.tone || "default")}">
      ${token.icon ? `<img class="hourly-modal-token-icon" src="${escapeHtml(token.icon)}" alt="" aria-hidden="true" />` : ""}
      <span>${escapeHtml(token.label)}</span>
    </span>
  `).join("")}</div>`;
}

function getHourlyVotesLabel() {
  if (typeof hourlyVotesCount === "number") {
    return replaceTokens(
      t(hourlyVotesCount === 1 ? "hourlyVotesOne" : hourlyVotesCount > 1 ? "hourlyVotesMany" : "hourlyVotesZero"),
      { value: hourlyVotesCount }
    );
  }
  if (hourlyVoteFailed) return t("hourlyVoteFailed");
  return "—";
}

function formatHourlyMandatoryPitstopCount(value) {
  if (typeof value !== "number" || value <= 0) return t("hourlyPitNoMandatory");
  return value === 1
    ? replaceTokens(t("hourlyMandatoryPitstopCount"), { value })
    : replaceTokens(t("hourlyMandatoryPitstopCountPlural"), { value });
}

function buildHourlyEntryTokens(server) {
  if (!server || typeof server !== "object") return [];

  const tokens = [];
  if (server.car_group) tokens.push(createHourlyModalToken(server.car_group, "primary"));
  if (typeof server.max_car_slots === "number" && server.max_car_slots > 0) {
    tokens.push(createHourlyModalToken(replaceTokens(t("hourlyEntrySlots"), { value: server.max_car_slots })));
  }
  if (typeof server.safety_rating_requirement === "number" && server.safety_rating_requirement > 0) {
    tokens.push(createHourlyModalToken(replaceTokens(t("hourlyEntrySafety"), { value: server.safety_rating_requirement }), "muted"));
  }
  if (typeof server.track_medals_requirement === "number" && server.track_medals_requirement > 0) {
    tokens.push(createHourlyModalToken(replaceTokens(t("hourlyEntryTrackMedals"), { value: server.track_medals_requirement }), "muted"));
  }
  if (typeof server.racecraft_rating_requirement === "number" && server.racecraft_rating_requirement > 0) {
    tokens.push(createHourlyModalToken(replaceTokens(t("hourlyEntryRacecraft"), { value: server.racecraft_rating_requirement }), "muted"));
  }
  return tokens;
}

function buildHourlyFormatTokens(session) {
  if (!session || typeof session !== "object") return [];

  const tokens = [];
  if (typeof session.qualifying_duration_minutes === "number" && session.qualifying_duration_minutes > 0) {
    tokens.push(createHourlyModalToken(`Q ${session.qualifying_duration_minutes}m`, "primary"));
  }
  if (typeof session.race_duration_minutes === "number" && session.race_duration_minutes > 0) {
    tokens.push(createHourlyModalToken(`R ${session.race_duration_minutes}m`, "primary"));
  }
  if (!tokens.length && session.format_label) {
    session.format_label
      .split(" + ")
      .map(part => part.trim())
      .filter(Boolean)
      .forEach(part => tokens.push(createHourlyModalToken(part, "primary")));
  }

  const preRaceMinutes = minutesFromSeconds(session.pre_race_waiting_time_seconds);
  if (preRaceMinutes && preRaceMinutes > 0) {
    tokens.push(createHourlyModalToken(`Pre ${preRaceMinutes}m`, "muted"));
  }

  return tokens;
}

function buildHourlyPitstopTokens(rules) {
  if (!rules || typeof rules !== "object") return [];

  const tokens = [
    createHourlyModalToken(
      formatHourlyMandatoryPitstopCount(rules.mandatory_pitstop_count),
      rules.mandatory_pitstop_count > 0 ? "primary" : "muted"
    )
  ];
  if (typeof rules.pit_window_length_minutes === "number" && rules.pit_window_length_minutes > 0) {
    tokens.push(createHourlyModalToken(replaceTokens(t("hourlyPitWindow"), { value: rules.pit_window_length_minutes })));
  }
  return tokens;
}

function buildHourlyRefuelTokens(rules) {
  if (!rules || typeof rules !== "object") return [];

  const tokens = [];
  if (rules.refuelling_allowed_in_race) tokens.push(createHourlyModalToken(t("hourlyPitRefuelAllowed")));
  if (rules.refuelling_time_fixed) tokens.push(createHourlyModalToken(t("hourlyPitRefuelFixed"), "muted"));
  if (rules.mandatory_pitstop_refuelling_required) tokens.push(createHourlyModalToken(t("hourlyRefuelMandatory"), "primary"));
  if (!tokens.length) tokens.push(createHourlyModalToken(t("hourlyRefuelNone"), "muted"));
  return tokens;
}

function buildHourlyTyreTokens(rules) {
  if (!rules || typeof rules !== "object") return [];

  const tokens = [];
  if (rules.mandatory_pitstop_tyre_change_required) tokens.push(createHourlyModalToken(t("hourlyTyresMandatory"), "primary"));
  if (typeof rules.tyre_set_count === "number" && rules.tyre_set_count > 0) {
    tokens.push(createHourlyModalToken(replaceTokens(t("hourlyTyresSets"), { value: rules.tyre_set_count }), "muted"));
  }
  if (!tokens.length) tokens.push(createHourlyModalToken(t("hourlyTyresNone"), "muted"));
  return tokens;
}

function buildHourlyWeatherTokens(weather) {
  if (!weather || typeof weather !== "object") return [];

  const tokens = [];
  if (typeof weather.ambient_temp_c === "number") {
    tokens.push(createHourlyModalToken(replaceTokens(t("hourlyWeatherTemp"), { value: weather.ambient_temp_c })));
  }
  const cloudPercent = percentValue(weather.cloud_level);
  if (cloudPercent !== null) {
    tokens.push(createHourlyModalToken(`${cloudPercent}%`, "muted", HOURLY_WEATHER_ICON_PATHS.clouds));
  }
  const rainPercent = percentValue(weather.rain_level);
  if (rainPercent !== null) {
    tokens.push(createHourlyModalToken(`${rainPercent}%`, "muted", HOURLY_WEATHER_ICON_PATHS.rain));
  }
  if (typeof weather.weather_randomness === "number") {
    tokens.push(createHourlyModalToken(String(weather.weather_randomness), "muted", HOURLY_WEATHER_ICON_PATHS.random));
  }
  return tokens;
}

function formatHourlyGameTimeValue(gameTime) {
  if (!gameTime || typeof gameTime !== "object") return "";
  const hourValue = gameTime.hour_of_day ?? gameTime.game_time_hour;
  const hour = typeof hourValue === "number" && !Number.isNaN(hourValue)
    ? `${String(Math.max(0, Math.min(23, Math.round(hourValue)))).padStart(2, "0")}:00`
    : "";
  let label = "";
  if (currentLang === "ru" && gameTime.label_ru) label = String(gameTime.label_ru);
  else if (gameTime.label) label = String(gameTime.label);
  else {
    const code = String(gameTime.code || gameTime.profile_id || "").trim().toLowerCase();
    if (code === "morning") label = currentLang === "ru" ? "Утро" : "Morning";
    else if (code === "day") label = currentLang === "ru" ? "День" : "Day";
    else if (code === "evening") label = currentLang === "ru" ? "Вечер" : "Evening";
    else if (code === "night") label = currentLang === "ru" ? "Ночь" : "Night";
    else if (code) label = code.replace(/[_-]+/g, " ");
  }
  if (label && hour) return `${label} · ${hour}`;
  return label || hour || "";
}

function getHourlyGameTimeIconName(gameTime, fallbackHour) {
  const code = String(gameTime?.code || gameTime?.profile_id || "").trim().toLowerCase();
  if (["morning", "day", "evening", "night"].includes(code)) return code;
  const hour = Number(gameTime?.hour_of_day ?? gameTime?.game_time_hour ?? fallbackHour);
  if (!Number.isFinite(hour)) return "day";
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function getHourlyGameTimeIconSvg(name) {
  if (name === "morning") return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 5v3M5.6 10.2l2.1 2.1M18.4 10.2l-2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (name === "evening") return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M4 14h16M7 14a5 5 0 0 0 10 0M12 19v2M5.6 18.5l2.1-2.1M18.4 18.5l-2.1-2.1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (name === "night") return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M19.2 15.3A7.7 7.7 0 0 1 8.7 4.8 7.8 7.8 0 1 0 19.2 15.3Z" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.8 4.2v2.4M16.6 5.4H19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="12" r="4.25" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12h-2.5M18.54 5.46l-1.77 1.77M7.23 16.77l-1.77 1.77M18.54 18.54l-1.77-1.77M7.23 7.23 5.46 5.46" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`;
}

function getHourlyWeatherMetricIconName(metric, percent) {
  if (percent === null || percent === undefined || percent === "") return metric;
  const value = Number(percent);
  if (!Number.isFinite(value)) return metric;
  if (metric === "cloud") {
    if (value <= 25) return "cloud-clear";
    if (value <= 59) return "cloud-mixed";
    if (value <= 79) return "cloud-heavy";
    return "cloud-overcast";
  }
  if (value <= 1) return "rain-none";
  if (value <= 10) return "rain-light";
  if (value <= 34) return "rain-medium";
  if (value <= 59) return "rain-heavy";
  return "rain-storm";
}

function getHourlyWeatherMetricIconSvg(name) {
  if (name === "cloud-clear") return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.5 1.5m9.8 9.8 1.5 1.5m0-12.8-1.5 1.5M7.1 16.9l-1.5 1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  if (name === "cloud-mixed") return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 2.8v1.3M3 8h1.3m.2-3.5 1 1M13 4.5l-1 1M7.8 18.5h9.3a3.6 3.6 0 0 0 .37-7.18 4.8 4.8 0 0 0-9.4-.65 3.95 3.95 0 0 0-.27 7.83Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (name === "cloud-heavy") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 18.2h9a4 4 0 0 0 .42-7.98A5.25 5.25 0 0 0 6.35 9.3a3.75 3.75 0 0 0 .85 8.9Z" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (name === "cloud-overcast") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.7h8.7a3.5 3.5 0 0 0 .35-6.98 4.6 4.6 0 0 0-8.98-.6 3.8 3.8 0 0 0-.07 7.58Z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7.2 19h9.4a3.7 3.7 0 0 0 .38-7.38 4.9 4.9 0 0 0-9.57-.65A4 4 0 0 0 7.2 19Z" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="1.8"/></svg>`;
  if (name === "rain-none") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5c2.8 3.5 4.2 5.9 4.2 7.8a4.2 4.2 0 1 1-8.4 0c0-1.9 1.4-4.3 4.2-7.8Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m5 5 14 14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`;
  if (name === "rain-light") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.3c3 3.8 4.5 6.3 4.5 8.3a4.5 4.5 0 1 1-9 0c0-2 1.5-4.5 4.5-8.3Z" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-width="1.8"/></svg>`;
  const drops = name === "rain-medium" ? "M12 17.5l-.8 2.2" : name === "rain-heavy" ? "M8.5 17.3l-.8 2.4m4.8-2.4-.8 2.4m4.8-2.4-.8 2.4" : "M7.5 17l-.9 2.8m4-2.8-.9 2.8m4-2.8-.9 2.8m4-2.8-.9 2.8";
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.1 15.3h9.3a3.6 3.6 0 0 0 .35-7.18A5 5 0 0 0 7 7.45a3.95 3.95 0 0 0 .1 7.85Z" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="${drops}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}

function getHourlyEventDetailsV2Text(key) {
  const copy = {
    eyebrow: { en: "Event details", ru: "Детали события" },
    connection: { en: "Connection", ru: "Подключение" },
    format: { en: "Event format", ru: "Формат события" },
    conditions: { en: "Race conditions", ru: "Условия гонки" },
    classLabel: { en: "Class", ru: "Класс" },
    slotsLabel: { en: "Slots", ru: "Слоты" },
    safetyLabel: { en: "Safety Rating", ru: "Safety Rating" },
    preparationLabel: { en: "Preparation", ru: "Подготовка" },
    qualifyingLabel: { en: "Qualifying", ru: "Квалификация" },
    raceLabel: { en: "Race", ru: "Гонка" },
    gameTimeLabel: { en: "In-game time", ru: "Игровое время" },
    timeMultiplierLabel: { en: "Time acceleration", ru: "Ускорение времени" },
    pitWindowLabel: { en: "Pit window", ru: "Окно пит-стопа" },
    refuelAllowedLabel: { en: "Refuel", ru: "Заправка" },
    mandatoryRefuelLabel: { en: "Mandatory refuel", ru: "Обязательная заправка" },
    fixedRefuelLabel: { en: "Fixed refuel time", ru: "Фикс. время заправки" },
    temperatureLabel: { en: "Temperature", ru: "Температура" },
    cloudsLabel: { en: "Cloud cover", ru: "Облачность" },
    rainLabel: { en: "Rain chance", ru: "Вероятность дождя" },
    randomnessLabel: { en: "Randomness", ru: "Изменчивость" },
    notAvailable: { en: "N/A", ru: "н/д" },
    allowed: { en: "allowed", ru: "разрешена" },
    forbidden: { en: "forbidden", ru: "запрещена" },
    yes: { en: "yes", ru: "да" },
    no: { en: "no", ru: "нет" },
    details: { en: "Details", ru: "Подробнее" }
  };
  return copy[key]?.[currentLang] || copy[key]?.en || key;
}

function getHourlyEventDetailsV2IconSvg(name) {
  if (name.startsWith("cloud-") || name.startsWith("rain-")) return getHourlyWeatherMetricIconSvg(name);
  if (["morning", "day", "evening", "night"].includes(name)) return getHourlyGameTimeIconSvg(name);
  const icons = {
    calendar: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M8 3v3M16 3v3M4 9h16M5.75 5.75h12.5a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H5.75a2 2 0 0 1-2-2V7.75a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    copy: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M9 9h11v11H9z" fill="none" stroke="currentColor" stroke-width="1.8"></path><path d="M4 4h11v11H4z" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg>`,
    check: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M5 12.5 9.2 16.7 19 7.5" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    close: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"></path></svg>`,
    server: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M4.75 6.5h14.5M4.75 12h14.5M4.75 17.5h14.5M6.75 4.75h10.5a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    flag: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="m5 4 11 2.5-4 4 4 3.5-4 4L16 20 5 17.5V4Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    wrench: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="m14.4 6.6 3-3a2.12 2.12 0 0 1 3 3l-3 3M13 8l3 3-8.75 8.75H4.25v-3L13 8Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    timer: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="13" r="7.25" fill="none" stroke="currentColor" stroke-width="1.9"></circle><path d="M12 13V9.25M9.25 2.75h5.5M14.75 5.5l1.5-1.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    stopwatch: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="13" r="7.25" fill="none" stroke="currentColor" stroke-width="1.9"></circle><path d="M9.25 2.75h5.5M12 13l3.25-2.25M14.75 5.5l1.5-1.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    play: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.9"></circle><path d="m10.25 8.75 5 3.25-5 3.25V8.75Z" fill="currentColor"></path></svg>`,
    sun: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="12" r="4.25" fill="none" stroke="currentColor" stroke-width="1.9"></circle><path d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12h-2.5M18.54 5.46l-1.77 1.77M7.23 16.77l-1.77 1.77M18.54 18.54l-1.77-1.77M7.23 7.23 5.46 5.46" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path></svg>`,
    fast: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="m4.5 6.75 6.5 5.25-6.5 5.25V6.75Zm8.5 0 6.5 5.25-6.5 5.25V6.75Z" fill="currentColor"></path></svg>`,
    fuel: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M6.25 5.25h7.5a1.5 1.5 0 0 1 1.5 1.5v10.5a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5V6.75a1.5 1.5 0 0 1 1.5-1.5Zm9-1.5 3 3v7.25a1.75 1.75 0 0 1-3.5 0V12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    drop: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 4.25c3.4 4.16 5.1 6.95 5.1 9.1A5.1 5.1 0 1 1 6.9 13.35c0-2.15 1.7-4.94 5.1-9.1Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    tyre: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="12" r="7.25" fill="none" stroke="currentColor" stroke-width="1.9"></circle><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.9"></circle></svg>`,
    temp: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M10.25 6a2.25 2.25 0 1 1 4.5 0v7.2a4 4 0 1 1-4.5 0V6Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12.5 10v5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path></svg>`,
    cloud: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M7.25 18.25h9a4 4 0 0 0 .42-7.98A5.25 5.25 0 0 0 6.4 9.35 3.75 3.75 0 0 0 7.25 18.25Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    rain: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M7.25 15.5h9a4 4 0 0 0 .42-7.98A5.25 5.25 0 0 0 6.4 6.6a3.75 3.75 0 0 0 .85 8.9Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 17.75 8.25 20M13 17.75 12.25 20M17 17.75 16.25 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path></svg>`,
    wind: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M4 9.25h9.5a2.75 2.75 0 1 0-2.7-3.25M4 14h13.5a2.25 2.25 0 1 1-2.2 2.75M4 18.25h7.5a2.25 2.25 0 1 0-2.2 2.75" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    users: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M8.5 11.25a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Zm7 2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.75 18c.5-2.55 2.66-4.25 5.25-4.25S13.75 15.45 14.25 18M13.25 18c.38-1.78 1.88-3 3.75-3s3.37 1.22 3.75 3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`
  };
  return icons[name] || icons.server;
}

function buildHourlyEventDetailsV2Icon(name, className = "") {
  return `<span class="event-details-v2-icon${className ? ` ${className}` : ""}" aria-hidden="true">${getHourlyEventDetailsV2IconSvg(name)}</span>`;
}

function formatHourlyEventDetailsHour(value) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return getHourlyEventDetailsV2Text("notAvailable");
  const hour = ((Math.round(normalized) % 24) + 24) % 24;
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatHourlyEventDetailsBool(value, truthyKey, falsyKey) {
  if (value === true) return getHourlyEventDetailsV2Text(truthyKey);
  if (value === false) return getHourlyEventDetailsV2Text(falsyKey);
  return getHourlyEventDetailsV2Text("notAvailable");
}

function formatHourlyEventDetailsMinutes(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? `${Math.round(value)} мин`
    : getHourlyEventDetailsV2Text("notAvailable");
}

function formatHourlyEventDetailsMultiplier(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? `x${value}`
    : getHourlyEventDetailsV2Text("notAvailable");
}

function formatHourlyEventDetailsPercent(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value)}%`
    : getHourlyEventDetailsV2Text("notAvailable");
}

function formatHourlyEventDetailsTemperature(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value)}°C`
    : getHourlyEventDetailsV2Text("notAvailable");
}

function formatHourlyEventDetailsPitstopCount(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return getHourlyEventDetailsV2Text("notAvailable");
  }
  return currentLang === "ru" ? `${Math.round(value)} обязательный` : `${Math.round(value)} mandatory`;
}

function getHourlyEventDetailsValue(value) {
  if (value === null || value === undefined || value === "") return getHourlyEventDetailsV2Text("notAvailable");
  return String(value);
}

function buildHourlyEventDetailsV2Row(label, value, iconName, options = {}) {
  const rowClass = options.rowClass ? ` ${options.rowClass}` : "";
  const accentClass = options.accent ? " event-details-v2-info-label-accent" : "";
  const valueAccentClass = options.accent ? " event-details-v2-info-value-accent" : "";
  const iconAccentClass = options.accent ? " event-details-v2-info-icon-accent" : "";
  return `
    <div class="event-details-v2-info-row${rowClass}">
      <div class="event-details-v2-info-label${accentClass}">
        ${buildHourlyEventDetailsV2Icon(iconName, `event-details-v2-info-icon${iconAccentClass}`)}
        <span>${escapeHtml(label)}</span>
      </div>
      <div class="event-details-v2-info-value${valueAccentClass}">${value}</div>
    </div>
  `;
}

function buildHourlyEventDetailsV2Card(title, iconName, className, rowsHtml) {
  return `
    <section class="event-details-v2-card ${escapeHtml(className)}">
      <div class="event-details-v2-card-header">
        ${buildHourlyEventDetailsV2Icon(iconName, "event-details-v2-card-icon")}
        <h4 class="event-details-v2-card-title">${escapeHtml(title)}</h4>
      </div>
      <div class="event-details-v2-card-body">${rowsHtml}</div>
    </section>
  `;
}

function bindHourlyEventDetailsV2(root) {
  root.querySelectorAll("[data-copy-target]").forEach(button => {
    if (button.dataset.bound === "true") return;
    button.addEventListener("click", async () => {
      const target = document.getElementById(button.dataset.copyTarget || "");
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.textContent || "");
        button.classList.add("is-copied");
        window.setTimeout(() => button.classList.remove("is-copied"), 1200);
      } catch (error) {
        console.warn("hourly modal copy failed.", error);
      }
    });
    button.dataset.bound = "true";
  });

  const voteButton = root.querySelector("[data-hourly-v2-vote]");
  if (voteButton && voteButton.dataset.bound !== "true") {
    voteButton.addEventListener("click", event => {
      event.stopPropagation();
      if (hourlyVoteAlreadyVoted) return;
      void submitHourlyHeroVote();
    });
    voteButton.dataset.bound = "true";
  }

  const unvoteButton = root.querySelector("[data-hourly-v2-unvote]");
  if (unvoteButton && unvoteButton.dataset.bound !== "true") {
    unvoteButton.addEventListener("click", event => {
      event.stopPropagation();
      if (!hourlyVoteAlreadyVoted) return;
      void submitHourlyHeroUnvote();
    });
    unvoteButton.dataset.bound = "true";
  }
}

function applyHourlyModalTrackBackground(trackCode) {
  const modalCard = document.querySelector("#hourly-details-modal .modal-card-slot");
  if (!modalCard) return;

  const backgroundUrl = HOURLY_TRACK_BACKGROUNDS[String(trackCode || "").trim().toLowerCase()];
  modalCard.style.setProperty("--modal-track-photo", backgroundUrl ? `url("${backgroundUrl}")` : "none");
}

function renderHourlyHeroModal() {
  const modalCardEl = document.querySelector("#hourly-details-modal .modal-card-slot");
  const headerEl = document.querySelector("#hourly-details-modal .modal-header");
  const titleEl = document.getElementById("hourly-details-title");
  const subtitleEl = document.getElementById("hourly-details-subtitle");
  const contentEl = document.getElementById("hourly-details-content");
  if (!modalCardEl || !headerEl || !titleEl || !subtitleEl || !contentEl) return;

  const data = hourlyAnnouncementData;
  if (!data?.track_name && !data?.event_id) {
    applyHourlyModalTrackBackground("");
    titleEl.textContent = t("hourlyNoEvent");
    subtitleEl.textContent = "—";
    contentEl.innerHTML = `<div class="empty-box">${escapeHtml(t("hourlyNoEvent"))}</div>`;
    modalCardEl.classList.remove("is-event-details-v2");
    headerEl.classList.remove("event-details-v2-legacy-header");
    return;
  }

  const server = data?.server || {};
  const session = data?.session || {};
  const rules = data?.rules || {};
  const weather = data?.weather || {};
  const startTime = getHourlyLocalizedField(data, "start_time_local", "—");
  const timezone = getHourlyLocalizedField(data, "timezone", "UTC+3");
  const passwordId = `hourly-modal-password-v2-${escapeAttribute(buildHourlyAnnouncementEventId(data) || data?.track_code || "slot")}`;
  const canVote = Boolean(data?.event_id || data?.track_name);
  const gameTimeRaw = session.hour_of_day ?? session.game_hour_of_day ?? session.session_hour ?? session.time_of_day_hour;
  const gameTimeValue = formatHourlyGameTimeValue(data?.game_time)
    || formatHourlyEventDetailsHour(gameTimeRaw);
  const timeMultiplierRaw = session.time_multiplier ?? session.timeMultiplier ?? session.session_time_multiplier ?? session.time_scale;
  const preparationMinutes = minutesFromSeconds(session.pre_race_waiting_time_seconds);
  const qualifyingMinutes = typeof session.qualifying_duration_minutes === "number" ? session.qualifying_duration_minutes : null;
  const raceMinutes = typeof session.race_duration_minutes === "number" ? session.race_duration_minutes : null;
  const slotCount = typeof server.max_car_slots === "number" ? server.max_car_slots : null;
  const safetyRating = typeof server.safety_rating_requirement === "number" ? server.safety_rating_requirement : null;
  const pitWindow = typeof rules.pit_window_length_minutes === "number" ? rules.pit_window_length_minutes : null;
  const tyres = typeof rules.tyre_set_count === "number" ? rules.tyre_set_count : null;
  const temp = typeof weather.ambient_temp_c === "number" ? weather.ambient_temp_c : null;
  const clouds = percentValue(weather.cloud_level);
  const rain = percentValue(weather.rain_level);
  const randomness = typeof weather.weather_randomness === "number" ? weather.weather_randomness : null;
  const voteLabel = hourlyVotePending
    ? t("hourlyVoteSending")
    : hourlyVoteAlreadyVoted
      ? t("hourlyVoteDone")
      : t("hourlyVoteBtn");

  modalCardEl.classList.add("is-event-details-v2");
  headerEl.classList.add("event-details-v2-legacy-header");

  applyHourlyModalTrackBackground(data?.track_code);
  titleEl.textContent = getHourlyLocalizedField(data, "track_name", t("hourlyUnknownValue"));
  subtitleEl.textContent = `${formatDateOnlyForHourly(data?.date)} • ${`${startTime} ${timezone}`.trim()}`;

  const connectionRows = [
    buildHourlyEventDetailsV2Row(t("hourlyServerLabel"), escapeHtml(server.name || server.full_name || t("hourlyUnknownValue")), "server"),
    buildHourlyEventDetailsV2Row(
      t("hourlyPasswordLabel"),
      `<div class="event-details-v2-password-row"><span class="event-details-v2-password" id="${passwordId}">${escapeHtml(server.password || t("hourlyPasswordNone"))}</span><button class="event-details-v2-copy-button" type="button" data-copy-target="${passwordId}" aria-label="${escapeHtml(t("hourlyPasswordLabel"))}">${buildHourlyEventDetailsV2Icon("copy", "event-details-v2-info-icon hero-copy-icon-copy")}${buildHourlyEventDetailsV2Icon("check", "event-details-v2-info-icon hero-copy-icon-done")}</button></div>`,
      "copy"
    ),
    buildHourlyEventDetailsV2Row(getHourlyEventDetailsV2Text("classLabel"), `<span class="event-details-v2-class-badge">${escapeHtml(server.car_group || getHourlyEventDetailsV2Text("notAvailable"))}</span>`, "flag"),
    buildHourlyEventDetailsV2Row(getHourlyEventDetailsV2Text("slotsLabel"), escapeHtml(getHourlyEventDetailsValue(slotCount)), "users"),
    buildHourlyEventDetailsV2Row(getHourlyEventDetailsV2Text("safetyLabel"), escapeHtml(getHourlyEventDetailsValue(safetyRating)), "flag")
  ].join("");

  const formatRows = [
    buildHourlyEventDetailsV2Row(getHourlyEventDetailsV2Text("preparationLabel"), escapeHtml(formatHourlyEventDetailsMinutes(preparationMinutes)), "timer"),
    buildHourlyEventDetailsV2Row(getHourlyEventDetailsV2Text("qualifyingLabel"), escapeHtml(formatHourlyEventDetailsMinutes(qualifyingMinutes)), "stopwatch"),
    buildHourlyEventDetailsV2Row(getHourlyEventDetailsV2Text("raceLabel"), escapeHtml(formatHourlyEventDetailsMinutes(raceMinutes)), "play"),
    buildHourlyEventDetailsV2Row(getHourlyEventDetailsV2Text("gameTimeLabel"), escapeHtml(gameTimeValue), getHourlyGameTimeIconName(data?.game_time, gameTimeRaw)),
    buildHourlyEventDetailsV2Row(getHourlyEventDetailsV2Text("timeMultiplierLabel"), escapeHtml(formatHourlyEventDetailsMultiplier(timeMultiplierRaw)), "fast")
  ].join("");

  const conditionsRows = [
    buildHourlyEventDetailsV2Row(t("hourlyPitstopLabel"), escapeHtml(formatHourlyEventDetailsPitstopCount(rules.mandatory_pitstop_count)), "wrench", { accent: true }),
    buildHourlyEventDetailsV2Row(getHourlyEventDetailsV2Text("pitWindowLabel"), escapeHtml(formatHourlyEventDetailsMinutes(pitWindow)), "timer", { accent: true }),
    buildHourlyEventDetailsV2Row(getHourlyEventDetailsV2Text("refuelAllowedLabel"), escapeHtml(formatHourlyEventDetailsBool(Boolean(rules.refuelling_allowed_in_race), "allowed", "forbidden")), "fuel"),
    buildHourlyEventDetailsV2Row(getHourlyEventDetailsV2Text("mandatoryRefuelLabel"), escapeHtml(formatHourlyEventDetailsBool(rules.mandatory_pitstop_refuelling_required, "yes", "no")), "drop"),
    buildHourlyEventDetailsV2Row(getHourlyEventDetailsV2Text("fixedRefuelLabel"), escapeHtml(formatHourlyEventDetailsBool(rules.refuelling_time_fixed, "yes", "no")), "timer"),
    buildHourlyEventDetailsV2Row(t("hourlyTyresLabel"), escapeHtml(getHourlyEventDetailsValue(tyres)), "tyre", { rowClass: " event-details-v2-divider-row" }),
    buildHourlyEventDetailsV2Row(getHourlyEventDetailsV2Text("temperatureLabel"), escapeHtml(formatHourlyEventDetailsTemperature(temp)), "temp"),
    buildHourlyEventDetailsV2Row(getHourlyEventDetailsV2Text("cloudsLabel"), escapeHtml(formatHourlyEventDetailsPercent(clouds)), getHourlyWeatherMetricIconName("cloud", clouds)),
    buildHourlyEventDetailsV2Row(getHourlyEventDetailsV2Text("rainLabel"), escapeHtml(formatHourlyEventDetailsPercent(rain)), getHourlyWeatherMetricIconName("rain", rain)),
    buildHourlyEventDetailsV2Row(getHourlyEventDetailsV2Text("randomnessLabel"), escapeHtml(getHourlyEventDetailsValue(randomness)), "wind")
  ].join("");

  const detailsLinkHtml = data?.details_url
    ? `<a class="event-details-v2-details-link" href="${escapeHtml(data.details_url)}">${escapeHtml(getHourlyEventDetailsV2Text("details"))}</a>`
    : "";

  contentEl.innerHTML = `
    <div class="event-details-v2">
      <div class="event-details-v2-background"></div>
      <div class="event-details-v2-shade"></div>
      <div class="event-details-v2-inner">
        <header class="event-details-v2-header">
          <div class="event-details-v2-title-block">
            <div class="event-details-v2-eyebrow">${escapeHtml(getHourlyEventDetailsV2Text("eyebrow"))}</div>
            <h2 class="event-details-v2-title">${escapeHtml(getHourlyLocalizedField(data, "track_name", t("hourlyUnknownValue")))}</h2>
          </div>
          <div class="event-details-v2-date-time">
            ${buildHourlyEventDetailsV2Icon("calendar", "event-details-v2-date-time-icon")}
            <span>${escapeHtml(formatDateOnlyForHourly(data?.date))}</span>
            <span aria-hidden="true">•</span>
            <span>${escapeHtml(`${startTime} ${timezone}`.trim())}</span>
          </div>
        </header>
        <div class="event-details-v2-grid">
          ${buildHourlyEventDetailsV2Card(getHourlyEventDetailsV2Text("connection"), "server", "event-details-v2-card-connection", connectionRows)}
          ${buildHourlyEventDetailsV2Card(getHourlyEventDetailsV2Text("format"), "flag", "event-details-v2-card-format", formatRows)}
          ${buildHourlyEventDetailsV2Card(getHourlyEventDetailsV2Text("conditions"), "wrench", "event-details-v2-card-conditions", conditionsRows)}
        </div>
        <footer class="event-details-v2-footer">
          <button
            class="event-details-v2-participation-button${hourlyVoteAlreadyVoted ? " is-voted" : ""}"
            type="button"
            data-hourly-v2-vote="true"
            ${(!canVote || hourlyVotePending || hourlyVoteAlreadyVoted) ? "disabled" : ""}
          >
            ${buildHourlyEventDetailsV2Icon("check", "event-details-v2-participation-icon")}
            <span>${escapeHtml(voteLabel)}</span>
          </button>
          ${
            hourlyVoteAlreadyVoted
              ? `<button class="event-details-v2-cancel-button" type="button" data-hourly-v2-unvote="true" aria-label="${escapeHtml(t("hourlyUnvoteBtn"))}" ${hourlyVotePending ? "disabled" : ""}>${buildHourlyEventDetailsV2Icon("close", "event-details-v2-cancel-icon")}</button>`
              : `<div class="event-details-v2-cancel-placeholder" aria-hidden="true"></div>`
          }
          <div class="event-details-v2-participant-count">
            ${buildHourlyEventDetailsV2Icon("users", "event-details-v2-participant-icon")}
            <span>${escapeHtml(getHourlyVotesLabel())}</span>
          </div>
          <div class="event-details-v2-voting-notice">${buildHourlyVoteLegalNoteHtml()}</div>
          ${detailsLinkHtml}
        </footer>
      </div>
    </div>
  `;

  bindHourlyEventDetailsV2(contentEl);
}
function renderHourlyHeroCard() {
  const startsEl = document.getElementById("hourly-starts-value");
  const trackEl = document.getElementById("hourly-track-value");
  const votesEl = document.getElementById("hourly-votes-summary");
  const cardEl = document.getElementById("hero-hourly-card");
  const voteBtn = document.getElementById("hourly-vote-btn");
  const unvoteBtn = document.getElementById("hourly-unvote-btn");

  if (!startsEl || !trackEl || !votesEl || !cardEl || !voteBtn || !unvoteBtn) return;

  if (topLoadState.hourly && !hourlyAnnouncementData) {
    trackEl.textContent = t("loading");
    startsEl.textContent = t("loading");
    votesEl.textContent = t("loading");
    voteBtn.textContent = t("loading");
    voteBtn.disabled = true;
    voteBtn.hidden = false;
    unvoteBtn.hidden = true;
    return;
  }

  const data = hourlyAnnouncementData;
  const isChampionship = isHourlyChampionshipEvent(data);
  trackEl.textContent = data?.track_name || t("hourlyNoEvent");
  startsEl.textContent = formatHeroHourlyDateTime(data?.date, data?.start_time_local, data?.timezone);
  const trackCode = String(data?.track_code || "").trim().toLowerCase();
  const backgroundUrl = HOURLY_TRACK_BACKGROUNDS[trackCode];
  cardEl.style.setProperty("--hero-hourly-track-photo", backgroundUrl ? `url("${backgroundUrl}")` : "none");
  cardEl.classList.toggle("is-championship-event", isChampionship);
  const eyebrowEl = document.getElementById("hourly-eyebrow");
  if (eyebrowEl) {
    eyebrowEl.textContent = isChampionship ? getActiveChampionshipTitle(data) : t("hourlyEyebrow");
  }

  votesEl.textContent = getHourlyVotesLabel();

  let legalNoteEl = document.getElementById("hourly-vote-legal-note");
  if (!legalNoteEl) {
    legalNoteEl = document.createElement("div");
    legalNoteEl.className = "legal-inline-note";
    legalNoteEl.id = "hourly-vote-legal-note";
    voteBtn.parentElement?.insertAdjacentElement("afterend", legalNoteEl);
  }
  legalNoteEl.innerHTML = buildHourlyVoteLegalNoteHtml();
  legalNoteEl.hidden = false;

  voteBtn.textContent = hourlyVotePending
    ? t("hourlyVoteSending")
    : hourlyVoteAlreadyVoted
      ? t("hourlyVoteDone")
      : t("hourlyVoteBtn");

  voteBtn.hidden = false;
  voteBtn.disabled = (!data?.event_id && !data?.track_name) || hourlyVotePending || hourlyVoteAlreadyVoted;
  voteBtn.classList.toggle("is-voted", hourlyVoteAlreadyVoted);
  voteBtn.classList.toggle("pulse-attention", !hourlyVoteAlreadyVoted && !hourlyVotePending && Boolean(data?.event_id || data?.track_name));
  unvoteBtn.hidden = !hourlyVoteAlreadyVoted;
  unvoteBtn.disabled = hourlyVotePending;
  unvoteBtn.setAttribute("aria-label", t("hourlyUnvoteBtn"));
  cardEl.setAttribute(
    "aria-label",
    `${t("hourlyOpenDetailsLabel")}: ${data?.track_name || t("hourlyNoEvent")}`
  );
  cardEl.setAttribute("aria-disabled", (!data?.event_id && !data?.track_name) ? "true" : "false");
  updateTopChampionshipLink();

  if (!voteBtn.dataset.bound) {
    voteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      void submitHourlyHeroVote();
    });
    voteBtn.addEventListener("keydown", (event) => {
      event.stopPropagation();
    });
    voteBtn.dataset.bound = "true";
  }
  if (!unvoteBtn.dataset.bound) {
    unvoteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      void submitHourlyHeroUnvote();
    });
    unvoteBtn.addEventListener("keydown", (event) => {
      event.stopPropagation();
    });
    unvoteBtn.dataset.bound = "true";
  }
}
function isHourlyRace(race) {
  const sourceText = [
    race?.result_source,
    race?.race_type,
    race?.source_file,
    race?.race_id,
    race?.server_name,
    race?.meta_data
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return sourceText.includes("hourly");
}

function getLatestHourlyRace() {
  if (latestHourlyRaceData) return latestHourlyRaceData;
  return (Array.isArray(racesData) ? racesData : [])
    .filter(isHourlyRace)
    .sort((a, b) => new Date(b?.finished_at || b?.date || 0).getTime() - new Date(a?.finished_at || a?.date || 0).getTime())[0] || null;
}

function getRaceWinnerResult(race) {
  const results = Array.isArray(race?.results) ? race.results : [];
  return results.find(row => row?.position === 1)
    || results.find(row => row?.public_id && row.public_id === race?.winner_public_id)
    || results[0]
    || null;
}

function renderHourlyWinnerCard() {
  const cardEl = document.getElementById("hero-hourly-winner-card");
  const nameEl = document.getElementById("hero-hourly-winner-name");
  const metaEl = document.getElementById("hero-hourly-winner-meta");
  const mediaEl = document.getElementById("hero-hourly-winner-media");
  if (!cardEl || !nameEl || !metaEl || !mediaEl) return;

  if (topLoadState.hourly && !latestHourlyRaceData) {
    cardEl.classList.add("is-empty");
    nameEl.textContent = t("loading");
    metaEl.textContent = t("loading");
    mediaEl.innerHTML = "";
    return;
  }

  const race = getLatestHourlyRace();
  if (!race) {
    cardEl.classList.add("is-empty");
    nameEl.textContent = t("hourlyLastWinnerEmpty");
    metaEl.textContent = "—";
    mediaEl.innerHTML = "";
    return;
  }

  const winnerResult = getRaceWinnerResult(race) || {
    player_id: race.winner_player_id,
    public_id: race.winner_public_id,
    driver: race.winner,
    car_model_id: race.winner_car_model_id,
    car_name_raw: race.winner_car_name_raw,
    car_name: race.winner_car_name
  };
  const winnerName = race.winner || winnerResult?.driver || "—";
  const winnerPublicId = race.winner_public_id || winnerResult?.public_id || null;
  const winnerPlayerId = winnerResult?.player_id || null;
  const carName = winnerResult?.car_name || winnerResult?.car_name_raw || "";
  const trackName = race.track_name || humanizeTrackName(race.track || race.track_code || "");
  const raceDate = formatDateTimeLocal(race.finished_at || race.date, currentLang);

  cardEl.classList.remove("is-empty");
  nameEl.innerHTML = renderDriverLink(winnerName, winnerPublicId, "driver-link driver-link-heading", winnerPlayerId);
  metaEl.textContent = [trackName, raceDate, carName].filter(Boolean).join(" · ") || "—";
  mediaEl.innerHTML = renderCarImage(
    winnerResult || {},
    { className: "hero-hourly-winner-car", alt: carName || winnerName }
  );
}

function normalizeHourlyEventId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function canonicalizeHourlyEventId(value) {
  const normalized = normalizeHourlyEventId(value);
  const match = normalized.match(/^hourly_(\d{4}-\d{2}-\d{2})_(\d{4})(?:_.+)?$/);
  if (!match) return normalized;
  return `hourly_${match[1]}_${match[2]}`;
}

function buildHourlyAnnouncementEventId(item) {
  const explicitId = canonicalizeHourlyEventId(item?.event_id);
  if (explicitId) return explicitId;
  const date = String(item?.date || "").trim();
  const time = String(item?.start_time_local || "").trim().replace(":", "");
  if (!date || !time) return "";
  return normalizeHourlyEventId(`hourly_${date}_${time}`);
}

async function loadHourlyVotes(announcement) {
  const eventId = buildHourlyAnnouncementEventId(announcement);
  if (!eventId) {
    hourlyVotesCount = null;
    hourlyVoteAlreadyVoted = false;
    hourlyVoteFailed = false;
    return;
  }
  applyHourlyAnnouncementVoteStateFromCache(announcement);
  try {
    const url = new URL("/votes", hourlyVotesApiUrl);
    url.searchParams.set("event_ids", eventId);
    url.searchParams.set("voter_id", getHourlyBrowserVoterId());
    const payload = await requestJson(url, { cache: "no-store", retries: 1 });
    const item = payload?.items?.[eventId];
    applyHourlyAnnouncementVoteState(item);
    mergeHourlyStoredVoteStateItems({ [eventId]: item });
  } catch (error) {
    console.warn("hourly votes are unavailable.", error);
    hourlyVotesCount = null;
    hourlyVoteAlreadyVoted = false;
    hourlyVoteFailed = true;
  }
}

async function submitHourlyHeroVote() {
  const eventId = buildHourlyAnnouncementEventId(hourlyAnnouncementData);
  if (!eventId || hourlyVotePending || hourlyVoteAlreadyVoted) return;

  hourlyVotePending = true;
  hourlyVoteFailed = false;
  renderHourlyHeroCard();
  renderHourlyHeroModal();

  try {
    const payload = await requestJson(new URL("/vote", hourlyVotesApiUrl), {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        event_id: eventId,
        track: hourlyAnnouncementData?.track_name || hourlyAnnouncementData?.track_code || "-",
        date: hourlyAnnouncementData?.date || "",
        time: hourlyAnnouncementData?.start_time_local || "",
        voter_id: getHourlyBrowserVoterId()
      })
    });
      await invalidateRuntimeQueries();
      const nextState = {
        event_id: eventId,
        votes: typeof payload?.votes === "number" ? payload.votes : hourlyVotesCount,
      already_voted: Boolean(payload?.already_voted)
    };
    applyHourlyAnnouncementVoteState(nextState);
    mergeHourlyStoredVoteStateItems({ [eventId]: nextState });
  } catch (error) {
    console.warn("hourly hero vote failed.", error);
    hourlyVoteFailed = true;
  } finally {
    hourlyVotePending = false;
    renderHourlyHeroCard();
    renderHourlyHeroModal();
  }
}

async function submitHourlyHeroUnvote() {
  const eventId = buildHourlyAnnouncementEventId(hourlyAnnouncementData);
  if (!eventId || hourlyVotePending || !hourlyVoteAlreadyVoted) return;

  hourlyVotePending = true;
  hourlyVoteFailed = false;
  renderHourlyHeroCard();
  renderHourlyHeroModal();

  try {
    const payload = await requestJson(new URL("/unvote", hourlyVotesApiUrl), {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        event_id: eventId,
        voter_id: getHourlyBrowserVoterId()
      })
    });
    await invalidateRuntimeQueries();
    const nextState = {
      event_id: eventId,
      votes: typeof payload?.votes === "number" ? payload.votes : hourlyVotesCount,
      already_voted: Boolean(payload?.already_voted)
    };
    applyHourlyAnnouncementVoteState(nextState);
    mergeHourlyStoredVoteStateItems({ [eventId]: nextState });
  } catch (error) {
    console.warn("hourly hero unvote failed.", error);
    hourlyVoteFailed = true;
  } finally {
    hourlyVotePending = false;
    renderHourlyHeroCard();
    renderHourlyHeroModal();
  }
}

function getSafetyColumns() {
  return [
    { key: "rank", type: "number", label: t("safetyBaseCols")[0] },
    { key: "driver", type: "string", label: t("safetyBaseCols")[1] },
    { key: "safety_rating", type: "number", label: t("safetyBaseCols")[2] },
    { key: "safety_category", type: "string", label: t("safetyBaseCols")[3] },
    { key: "races_count", type: "number", label: t("safetyBaseCols")[4] },
    { key: "total_delta", type: "number", label: t("safetyBaseCols")[5] },
    { key: "total_invalid_laps", type: "number", label: t("safetyBaseCols")[6] },
    { key: "total_counted_penalties", type: "number", label: t("safetyBaseCols")[7] },
    { key: "total_incident_points", type: "number", label: t("safetyBaseCols")[8] }
  ];
}

function t(key) {
  return translations[currentLang][key] ?? translations.en[key] ?? key;
}

function tForLang(lang, key) {
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}

function replaceTokens(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function getHourlyLocalizedField(item, key, fallback = null) {
  if (!item || typeof item !== "object") return fallback ?? t("hourlyUnknownValue");

  const directLocalized = item[`${key}_${currentLang}`];
  if (typeof directLocalized === "string" && directLocalized.trim()) return directLocalized;

  const raw = item[key];
  if (typeof raw === "string" && raw.trim()) return raw;
  if (raw && typeof raw === "object") {
    const nested = raw[currentLang] ?? raw.en ?? raw.ru;
    if (typeof nested === "string" && nested.trim()) return nested;
  }

  return fallback ?? t("hourlyUnknownValue");
}

function percentValue(value) {
  return typeof value === "number" && !Number.isNaN(value) ? Math.round(value * 100) : null;
}

function minutesFromSeconds(value) {
  return typeof value === "number" && !Number.isNaN(value) ? Math.round(value / 60) : null;
}

function getHourlyBrowserVoterId() {
  const storageKey = "hourlyVoteVoterId";
  return getExpiringStorageValue(storageKey, VOTER_ID_STORAGE_TTL_MS);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value) {
  return encodeURIComponent(String(value ?? ""));
}

function formatDonationAmount(amount, currency) {
  const numericAmount = Number(amount);
  const safeCurrency = String(currency || "RUB").trim().toUpperCase() || "RUB";
  if (!Number.isFinite(numericAmount)) return safeCurrency;

  try {
    return new Intl.NumberFormat(currentLang === "ru" ? "ru-RU" : "en-US", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: numericAmount % 1 === 0 ? 0 : 2
    }).format(numericAmount);
  } catch (error) {
    return `${numericAmount.toLocaleString(currentLang === "ru" ? "ru-RU" : "en-US")} ${safeCurrency}`;
  }
}

function renderDonationAlertsWidget() {
  const listEl = document.getElementById("donation-alerts-list");
  const goalEl = document.getElementById("donation-alerts-goal");
  const goalFallbackEl = document.getElementById("donation-alerts-goal-fallback");
  if (!listEl) return;

  if (goalEl) {
    const goal = donationAlertsData?.goal;
    const raisedAmount = Number(goal?.raised_amount);
    const goalAmount = Number(goal?.goal_amount);
    if (goal && Number.isFinite(raisedAmount) && Number.isFinite(goalAmount) && goalAmount > 0) {
      const percent = Math.max(0, Math.min(100, Math.round((raisedAmount / goalAmount) * 100)));
      goalEl.hidden = false;
      if (goalFallbackEl) goalFallbackEl.hidden = true;
      goalEl.innerHTML = `
        <div class="donation-alerts-goal-eyebrow">${escapeHtml(t("donationsWidgetGoalEyebrow"))}</div>
        <div class="donation-alerts-goal-title">${escapeHtml(goal.title || t("donationsWidgetGoalEyebrow"))}</div>
        <div class="donation-alerts-goal-meter" aria-hidden="true">
          <span style="width:${percent}%"></span>
        </div>
        <div class="donation-alerts-goal-row">
          <span>${escapeHtml(formatDonationAmount(raisedAmount, goal.currency))}</span>
          <span>${escapeHtml(formatDonationAmount(goalAmount, goal.currency))}</span>
        </div>
      `;
    } else {
      goalEl.hidden = true;
      goalEl.innerHTML = "";
      if (goalFallbackEl) goalFallbackEl.hidden = true;
    }
  }

  if (donationAlertsLoading && !donationAlertsData) {
    listEl.innerHTML = `<div class="donation-alerts-state">${escapeHtml(t("donationsWidgetLoading"))}</div>`;
    return;
  }

  if (donationAlertsFailed && !donationAlertsData) {
    listEl.innerHTML = `<div class="donation-alerts-state">${escapeHtml(t("donationsWidgetError"))}</div>`;
    return;
  }

  const items = Array.isArray(donationAlertsData?.items) ? donationAlertsData.items : [];
  if (!items.length) {
    listEl.innerHTML = `<div class="donation-alerts-state">${escapeHtml(t("donationsWidgetEmpty"))}</div>`;
    return;
  }

  listEl.innerHTML = items.map(item => {
    const message = String(item?.message || "").trim();
    const createdAt = item?.created_at ? formatDateTimeLocal(item.created_at, currentLang) : "";
    return `
      <article class="donation-alerts-item">
        <div class="donation-alerts-item-top">
          <div class="donation-alerts-name">${escapeHtml(item?.username || "Anonymous")}</div>
          <div class="donation-alerts-amount">${escapeHtml(formatDonationAmount(item?.amount, item?.currency))}</div>
        </div>
        ${message ? `<div class="donation-alerts-message">${escapeHtml(message)}</div>` : ""}
        ${createdAt ? `<div class="donation-alerts-time">${escapeHtml(createdAt)}</div>` : ""}
      </article>
    `;
  }).join("");
}

async function initDonationAlertsWidget() {
  const listEl = document.getElementById("donation-alerts-list");
  if (!listEl || listEl.dataset.bound === "true") return;

  listEl.dataset.bound = "true";
  donationAlertsLoading = true;
  donationAlertsFailed = false;
  renderDonationAlertsWidget();

  try {
    const rawData = await requestJson(donationsApiUrl, { cache: "no-store", retries: 1 });
    const { normalizeDonationsPayload } = await dataSchemaModulePromise;
    const data = normalizeDonationsPayload(rawData);
    donationAlertsData = data;
    donationAlertsFailed = false;
  } catch (error) {
    donationAlertsFailed = true;
  } finally {
    donationAlertsLoading = false;
    renderDonationAlertsWidget();
  }
}

function formatDateOnlyForHourly(dateString, lang = currentLang) {
  if (!dateString) return tForLang(lang, "hourlyUnknownValue");

  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const date = new Date(`${dateString}T00:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow"
  }).format(date);
}

function formatHeroHourlyDateTime(dateString, timeString, timezoneString) {
  const safeTime = String(timeString || "").trim();
  const safeTimezone = String(timezoneString || "").trim();
  if (!dateString && !safeTime && !safeTimezone) return "—";

  const [year, month, day] = String(dateString || "").split("-");
  if (year && month && day) {
    const formattedDate = `${day}.${month}.${year}`;
    const tail = [safeTime, safeTimezone].filter(Boolean).join(" ");
    return tail ? `${formattedDate} ${tail}` : formattedDate;
  }

  const fallback = [dateString, safeTime, safeTimezone].filter(Boolean).join(" ");
  return fallback || "—";
}

function getTwitchEmbedParents() {
  const hosts = new Set();
  const hostname = String(window.location.hostname || "").trim();
  if (hostname) hosts.add(hostname);
  hosts.add("localhost");
  hosts.add("127.0.0.1");
  return [...hosts];
}

function buildTwitchPlayerUrl() {
  const url = new URL("https://player.twitch.tv/");
  url.searchParams.set("channel", TWITCH_CHANNEL_NAME);
  url.searchParams.set("autoplay", "false");
  getTwitchEmbedParents().forEach(parent => url.searchParams.append("parent", parent));
  return url.toString();
}

function extractYouTubeEmbedUrl(oembedPayload) {
  const html = String(oembedPayload?.html || "");
  const match = html.match(/src="([^"]+)"/i);
  if (!match?.[1]) return "";
  try {
    const url = new URL(match[1]);
    url.searchParams.set("autoplay", "0");
    url.searchParams.set("rel", "0");
    return url.toString();
  } catch {
    return "";
  }
}

async function detectYouTubeLive() {
  try {
    const oembedUrl = new URL("https://www.youtube.com/oembed");
    oembedUrl.searchParams.set("url", YOUTUBE_LIVE_URL);
    oembedUrl.searchParams.set("format", "json");
    const payload = await requestJson(oembedUrl.toString(), { cache: "no-store", mode: "cors", retries: 1 });
    const embedUrl = extractYouTubeEmbedUrl(payload);
    if (!embedUrl) return { live: false };
    return {
      live: true,
      platform: "youtube",
      embedUrl,
      openUrl: YOUTUBE_LIVE_URL
    };
  } catch {
    return { live: false };
  }
}

async function detectActiveLiveStream() {
  if (YOUTUBE_LIVE_AUTO_DETECT) {
    const youtubeLive = await detectYouTubeLive();
    if (youtubeLive.live) return youtubeLive;
  }

  const twitchLive = await detectTwitchLive();
  if (twitchLive) {
    return {
      live: true,
      platform: "twitch",
      embedUrl: buildTwitchPlayerUrl(),
      openUrl: TWITCH_CHANNEL_URL
    };
  }

  return {
    live: false,
    platform: null,
    embedUrl: "",
    openUrl: TWITCH_CHANNEL_URL
  };
}

function ensureTwitchWidget() {
  if (twitchWidgetState.initialized) return;
  twitchWidgetState.launcherHiddenForSession = isTwitchLauncherHiddenForSession();

  const root = document.createElement("aside");
  root.className = "twitch-widget";
  root.id = "twitch-widget";
  root.hidden = true;
  root.innerHTML = `
    <div class="twitch-widget-shell">
      <div class="twitch-widget-header">
        <div class="twitch-widget-actions">
          <a
            class="twitch-widget-open"
            id="twitch-widget-open"
            href="${escapeHtml(TWITCH_CHANNEL_URL)}"
            target="_blank"
            rel="noopener noreferrer"
          >${escapeHtml(t("twitchWidgetOpen"))}</a>
          <button
            class="twitch-widget-expand"
            id="twitch-widget-expand"
            type="button"
            aria-expanded="false"
          >${escapeHtml(t("twitchWidgetExpand"))}</button>
          <button
            class="twitch-widget-hide"
            id="twitch-widget-hide"
            type="button"
          >${escapeHtml(t("twitchWidgetHide"))}</button>
        </div>
        <a
          class="twitch-widget-title-wrap"
          id="twitch-widget-link"
          href="${escapeHtml(TWITCH_CHANNEL_URL)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="twitch-widget-title" id="twitch-widget-title">${escapeHtml(t("twitchWidgetTitle"))}</span>
        </a>
      </div>
        <div class="twitch-widget-player-wrap">
          <iframe
            id="twitch-widget-frame"
            title="ASG Racing Twitch stream"
            allowfullscreen
          scrolling="no"
          allow="autoplay; fullscreen"
          src="about:blank"
          ></iframe>
        </div>
      </div>
      <div class="twitch-widget-launcher-wrap" id="twitch-widget-launcher-wrap">
        <button
          class="twitch-widget-launcher"
          id="twitch-widget-launcher"
          type="button"
        >${escapeHtml(t("twitchWidgetShow"))}</button>
        <button
          class="twitch-widget-launcher-close"
          id="twitch-widget-launcher-close"
          type="button"
          aria-label="Hide stream button"
        >&times;</button>
      </div>
    `;

    document.body.appendChild(root);

  const expandBtn = root.querySelector("#twitch-widget-expand");
  if (expandBtn) {
    expandBtn.addEventListener("click", (event) => {
      event.preventDefault();
      twitchWidgetState.expanded = !twitchWidgetState.expanded;
      renderTwitchWidget();
    });
  }

  const hideBtn = root.querySelector("#twitch-widget-hide");
  if (hideBtn) {
    hideBtn.addEventListener("click", (event) => {
      event.preventDefault();
      twitchWidgetState.dismissed = true;
      twitchWidgetState.expanded = false;
      renderTwitchWidget();
    });
  }

  const launcherBtn = root.querySelector("#twitch-widget-launcher");
  if (launcherBtn) {
    launcherBtn.addEventListener("click", (event) => {
      event.preventDefault();
      if (!twitchWidgetState.live) {
        const targetUrl = twitchWidgetState.openUrl || TWITCH_CHANNEL_URL;
        window.open(targetUrl, "_blank", "noopener,noreferrer");
        return;
      }
      twitchWidgetState.dismissed = false;
      renderTwitchWidget();
    });
  }

  const launcherCloseBtn = root.querySelector("#twitch-widget-launcher-close");
  if (launcherCloseBtn) {
    launcherCloseBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      twitchWidgetState.launcherHiddenForSession = true;
      hideTwitchLauncherForSession();
      renderTwitchWidget();
    });
  }

  twitchWidgetState.initialized = true;
  renderTwitchWidget();
}

function isTwitchLauncherHiddenForSession() {
  try {
    return window.sessionStorage.getItem(TWITCH_LAUNCHER_SESSION_HIDE_KEY) === "1";
  } catch (error) {
    return false;
  }
}

function hideTwitchLauncherForSession() {
  try {
    window.sessionStorage.setItem(TWITCH_LAUNCHER_SESSION_HIDE_KEY, "1");
  } catch (error) {
    // Session-only hiding is optional; the widget should keep working if storage is blocked.
  }
}

function renderTwitchWidget() {
  if (!twitchWidgetState.initialized) return;

  const root = document.getElementById("twitch-widget");
  const frame = document.getElementById("twitch-widget-frame");
  const titleEl = document.getElementById("twitch-widget-title");
  const openEl = document.getElementById("twitch-widget-open");
  const expandEl = document.getElementById("twitch-widget-expand");
  const hideEl = document.getElementById("twitch-widget-hide");
  const launcherEl = document.getElementById("twitch-widget-launcher");
  const launcherWrapEl = document.getElementById("twitch-widget-launcher-wrap");
  const launcherCloseEl = document.getElementById("twitch-widget-launcher-close");
  const titleWrapEl = document.getElementById("twitch-widget-link");
  const shellEl = root.querySelector(".twitch-widget-shell");
  if (!root || !frame || !titleEl || !openEl || !expandEl || !hideEl || !launcherEl || !launcherWrapEl || !shellEl) return;

  titleEl.textContent = t("twitchWidgetTitle");
  openEl.textContent = t("twitchWidgetOpen");
  const activeOpenUrl = twitchWidgetState.openUrl || TWITCH_CHANNEL_URL;
  openEl.setAttribute("href", activeOpenUrl);
  if (titleWrapEl) titleWrapEl.setAttribute("href", activeOpenUrl);
  expandEl.textContent = twitchWidgetState.expanded ? t("twitchWidgetCollapse") : t("twitchWidgetExpand");
  expandEl.setAttribute("aria-expanded", twitchWidgetState.expanded ? "true" : "false");
  expandEl.setAttribute("aria-label", twitchWidgetState.expanded ? t("twitchWidgetCollapse") : t("twitchWidgetExpand"));
  hideEl.textContent = t("twitchWidgetHide");
  launcherEl.textContent = t("twitchWidgetShow");
  launcherEl.setAttribute("aria-label", t("twitchWidgetShow"));
  if (launcherCloseEl) launcherCloseEl.setAttribute("aria-label", t("twitchWidgetHide"));
  root.classList.toggle("is-platform-youtube", twitchWidgetState.platform === "youtube");
  root.classList.toggle("is-platform-twitch", twitchWidgetState.platform === "twitch");

  if (!twitchWidgetState.live) {
      root.hidden = twitchWidgetState.launcherHiddenForSession;
      root.classList.add("is-visible", "is-collapsed");
      root.classList.remove("is-expanded");
      shellEl.hidden = true;
      launcherWrapEl.hidden = twitchWidgetState.launcherHiddenForSession;
      if (frame.getAttribute("src") !== "about:blank") frame.setAttribute("src", "about:blank");
      return;
    }

    root.hidden = twitchWidgetState.dismissed && twitchWidgetState.launcherHiddenForSession;
    root.classList.add("is-visible");
    root.classList.toggle("is-expanded", twitchWidgetState.expanded && !twitchWidgetState.dismissed);
    root.classList.toggle("is-collapsed", twitchWidgetState.dismissed);
    shellEl.hidden = twitchWidgetState.dismissed;
    launcherWrapEl.hidden = !twitchWidgetState.dismissed || twitchWidgetState.launcherHiddenForSession;

    if (twitchWidgetState.dismissed) {
      if (frame.getAttribute("src") !== "about:blank") frame.setAttribute("src", "about:blank");
      return;
    }

    if (frame.getAttribute("src") !== twitchWidgetState.embedUrl) frame.setAttribute("src", twitchWidgetState.embedUrl);
  }

function detectTwitchLive() {
  return new Promise(resolve => {
    const image = new Image();
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timeoutId = window.setTimeout(() => finish(false), 8000);

    image.onload = () => {
      window.clearTimeout(timeoutId);
      const resolvedUrl = String(image.currentSrc || image.src || "").toLowerCase();
      const looksOfflinePlaceholder =
        resolvedUrl.includes("404_preview") ||
        resolvedUrl.includes("404-processing") ||
        resolvedUrl.includes("404_") ||
        resolvedUrl.includes("/404");
      finish(!looksOfflinePlaceholder);
    };
    image.onerror = () => {
      window.clearTimeout(timeoutId);
      finish(false);
    };
    image.src = `${TWITCH_LIVE_PREVIEW_URL}?ts=${Date.now()}`;
  });
}

async function refreshTwitchWidgetState() {
  if (twitchWidgetState.checking) return;
  twitchWidgetState.checking = true;

  try {
    const wasLive = twitchWidgetState.live;
    const previousPlatform = twitchWidgetState.platform;
    const result = await detectActiveLiveStream();
    twitchWidgetState.live = result.live;
    twitchWidgetState.platform = result.platform;
    twitchWidgetState.embedUrl = result.embedUrl || "";
    twitchWidgetState.openUrl = result.openUrl || TWITCH_CHANNEL_URL;
    if (!result.live) {
      twitchWidgetState.expanded = false;
      twitchWidgetState.dismissed = true;
    }
    if (!wasLive && result.live) {
      twitchWidgetState.expanded = false;
    }
    if (previousPlatform && previousPlatform !== result.platform) {
      twitchWidgetState.dismissed = false;
    }
    renderTwitchWidget();
  } finally {
    twitchWidgetState.checking = false;
  }
}

function initTwitchWidget() {
  ensureTwitchWidget();
  void refreshTwitchWidgetState();

  if (twitchWidgetCheckTimer) window.clearInterval(twitchWidgetCheckTimer);
  twitchWidgetCheckTimer = window.setInterval(() => {
    void refreshTwitchWidgetState();
  }, TWITCH_WIDGET_CHECK_INTERVAL_MS);

  if (!document.body.dataset.twitchVisibilityBound) {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) void refreshTwitchWidgetState();
    });
    document.body.dataset.twitchVisibilityBound = "true";
  }
}

function shouldEnableTopGuide() {
  return !IS_RACES_PAGE && !IS_DRIVER_PAGE && !IS_CARS_PAGE && !IS_FUN_STATS_PAGE && !IS_COMMUNITY_PAGE && !IS_BANS_PAGE;
}

function isTopGuideDesktop() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia(TOP_GUIDE_MEDIA_QUERY).matches;
}

function getTopGuideSteps() {
  return [
    {
      targetSelector: ".hero-card",
      titleKey: "topGuideStepWelcomeTitle",
      textKey: "topGuideStepWelcomeText",
      scrollBlock: "nearest"
    },
    {
      targetSelector: "#championship",
      titleKey: "topGuideStepChampionshipTitle",
      textKey: "topGuideStepChampionshipText",
      scrollBlock: "center"
    },
    {
      targetSelector: "#leaderboard-search",
      titleKey: "topGuideStepSearchTitle",
      textKey: "topGuideStepSearchText",
      scrollBlock: "center"
    },
    {
      targetSelector: "#leaderboard-table",
      titleKey: "topGuideStepProfileTitle",
      textKey: "topGuideStepProfileText",
      scrollBlock: "center"
    },
    {
      targetSelector: ".btn-last-races",
      titleKey: "topGuideStepRacesTitle",
      textKey: "topGuideStepRacesText",
      scrollBlock: "center"
    },
    {
      targetSelector: "#hero-hourly-card",
      titleKey: "topGuideStepHourlyTitle",
      textKey: "topGuideStepHourlyText",
      scrollBlock: "center"
    }
  ];
}

function clearTopGuideHighlight() {
  if (topGuideState.highlightedElement) {
    topGuideState.highlightedElement.classList.remove("top-guide-highlight");
    topGuideState.highlightedElement = null;
  }
}

function setTopGuideSeen() {
  if (appStorage) {
    appStorage.set("topGuideSeen", true);
    return;
  }
  try {
    localStorage.setItem(TOP_GUIDE_STORAGE_KEY, "1");
  } catch {
    // Ignore storage issues.
  }
}

function hasSeenTopGuide() {
  if (appStorage) return Boolean(appStorage.get("topGuideSeen", false));
  try {
    return localStorage.getItem(TOP_GUIDE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function scrollTopGuideTargetIntoView(target, block = "center") {
  if (!target || typeof target.getBoundingClientRect !== "function") return;

  const rect = target.getBoundingClientRect();
  const targetTop = rect.top + window.scrollY;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const navOffset = 96;
  let nextScrollTop = targetTop - navOffset;

  if (block === "center") {
    nextScrollTop = targetTop - Math.max(120, (viewportHeight - rect.height) / 2);
  }

  window.scrollTo({
    top: Math.max(0, nextScrollTop),
    behavior: "smooth"
  });
}

function closeTopGuide(markSeen = true) {
  topGuideState.active = false;
  clearTopGuideHighlight();
  if (markSeen) setTopGuideSeen();
  renderTopGuide();
}

function openTopGuide(stepIndex = 0, force = false) {
  if (!topGuideState.initialized || !shouldEnableTopGuide() || !isTopGuideDesktop()) return;
  if (!force && hasSeenTopGuide()) return;

  const steps = getTopGuideSteps();
  topGuideState.stepIndex = Math.max(0, Math.min(stepIndex, steps.length - 1));
  topGuideState.active = true;
  renderTopGuide();
}

function setTopGuideStep(nextStepIndex) {
  const steps = getTopGuideSteps();
  if (!steps.length) return;

  if (nextStepIndex >= steps.length) {
    closeTopGuide(true);
    return;
  }

  topGuideState.stepIndex = Math.max(0, Math.min(nextStepIndex, steps.length - 1));
  renderTopGuide();
}

function renderTopGuide() {
  if (!topGuideState.initialized) return;

  const root = document.getElementById("top-guide");
  const launcher = document.getElementById("top-guide-launcher");
  const scrim = document.getElementById("top-guide-scrim");
  const titleEl = document.getElementById("top-guide-title");
  const bodyEl = document.getElementById("top-guide-body");
  const progressEl = document.getElementById("top-guide-progress");
  const backBtn = document.getElementById("top-guide-back");
  const nextBtn = document.getElementById("top-guide-next");
  const skipBtn = document.getElementById("top-guide-skip");

  if (!root || !launcher || !scrim || !titleEl || !bodyEl || !progressEl || !backBtn || !nextBtn || !skipBtn) return;

  launcher.textContent = t("topGuideLauncher");
  launcher.setAttribute("aria-label", t("topGuideLauncher"));
  skipBtn.textContent = t("topGuideDismiss");
  backBtn.textContent = t("topGuideBack");

  if (!shouldEnableTopGuide() || !isTopGuideDesktop()) {
    topGuideState.active = false;
    clearTopGuideHighlight();
    root.hidden = true;
    scrim.hidden = true;
    launcher.hidden = true;
    return;
  }

  const steps = getTopGuideSteps();
  const step = steps[topGuideState.stepIndex];
  const total = steps.length;

  launcher.hidden = topGuideState.active;
  root.hidden = !topGuideState.active;
  scrim.hidden = !topGuideState.active;

  if (!topGuideState.active || !step) {
    clearTopGuideHighlight();
    return;
  }

  titleEl.textContent = t(step.titleKey);
  bodyEl.textContent = t(step.textKey);
  progressEl.textContent = replaceTokens(t("topGuideProgress"), {
    current: topGuideState.stepIndex + 1,
    total
  });
  backBtn.disabled = topGuideState.stepIndex === 0;
  nextBtn.textContent = topGuideState.stepIndex === total - 1 ? t("topGuideDone") : t("topGuideNext");

  clearTopGuideHighlight();
  const target = document.querySelector(step.targetSelector);
  if (target) {
    target.classList.add("top-guide-highlight");
    topGuideState.highlightedElement = target;
    scrollTopGuideTargetIntoView(target, step.scrollBlock);
  }
}

function ensureTopGuide() {
  if (topGuideState.initialized || !shouldEnableTopGuide()) return;

  const scrim = document.createElement("div");
  scrim.className = "top-guide-scrim";
  scrim.id = "top-guide-scrim";
  scrim.hidden = true;

  const root = document.createElement("aside");
  root.className = "top-guide";
  root.id = "top-guide";
  root.hidden = true;
  root.innerHTML = `
    <div class="top-guide-progress" id="top-guide-progress"></div>
    <h3 class="top-guide-title" id="top-guide-title"></h3>
    <p class="top-guide-body" id="top-guide-body"></p>
    <div class="top-guide-actions">
      <button class="top-guide-btn top-guide-btn-ghost" id="top-guide-skip" type="button"></button>
      <button class="top-guide-btn top-guide-btn-secondary" id="top-guide-back" type="button"></button>
      <button class="top-guide-btn top-guide-btn-primary" id="top-guide-next" type="button"></button>
    </div>
  `;

  const launcher = document.createElement("button");
  launcher.className = "top-guide-launcher";
  launcher.id = "top-guide-launcher";
  launcher.type = "button";

  document.body.appendChild(scrim);
  document.body.appendChild(root);
  document.body.appendChild(launcher);

  root.querySelector("#top-guide-skip")?.addEventListener("click", () => closeTopGuide(true));
  root.querySelector("#top-guide-back")?.addEventListener("click", () => setTopGuideStep(topGuideState.stepIndex - 1));
  root.querySelector("#top-guide-next")?.addEventListener("click", () => setTopGuideStep(topGuideState.stepIndex + 1));
  launcher.addEventListener("click", () => openTopGuide(0, true));

  topGuideState.mediaQuery = window.matchMedia?.(TOP_GUIDE_MEDIA_QUERY) || null;
  topGuideState.mediaQuery?.addEventListener?.("change", () => {
    if (!isTopGuideDesktop()) {
      topGuideState.active = false;
      clearTopGuideHighlight();
    }
    renderTopGuide();
  });

  window.addEventListener("resize", () => {
    if (topGuideState.active) renderTopGuide();
  });

  topGuideState.initialized = true;
  renderTopGuide();

  if (!hasSeenTopGuide()) {
    window.setTimeout(() => openTopGuide(0, true), 500);
  }
}

function sha1(input) {
  const text = unescape(encodeURIComponent(String(input ?? "")));
  const words = [];
  const bitLength = text.length * 8;

  for (let i = 0; i < text.length; i += 1) {
    words[i >> 2] |= text.charCodeAt(i) << (24 - (i % 4) * 8);
  }

  words[bitLength >> 5] |= 0x80 << (24 - (bitLength % 32));
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

  const rotateLeft = (value, shift) => (value << shift) | (value >>> (32 - shift));

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let i = 0; i < words.length; i += 16) {
    const w = new Array(80);
    for (let j = 0; j < 16; j += 1) w[j] = words[i + j] | 0;
    for (let j = 16; j < 80; j += 1) w[j] = rotateLeft(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let j = 0; j < 80; j += 1) {
      let f;
      let k;

      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (rotateLeft(a, 5) + f + e + k + w[j]) | 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  return [h0, h1, h2, h3, h4]
    .map(value => (value >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

function makePublicDriverId(playerId) {
  if (!playerId) return null;
  return `drv_${sha1(playerId).slice(0, 12)}`;
}

function withCurrentDataParams(href) {
  const url = new URL(href, window.location.href);
  if (IS_LOCAL_DEV_HOST) {
    ["topApiBase", "hourlyApiBase", "serverStatusUrl", "topDataBase", "data"].forEach(key => {
      const value = pageParams.get(key);
      if (value) url.searchParams.set(key, value);
    });
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function getDriverProfileHref(publicId, playerId = null) {
  const resolvedId = publicId || makePublicDriverId(playerId);
  if (!resolvedId) return null;
  return withCurrentDataParams(`${SITE_BASE_PATH}driver/?id=${encodeURIComponent(resolvedId)}`);
}

function getCarsPageHref(carName) {
  if (!carName) return null;
  return withCurrentDataParams(`${SITE_BASE_PATH}cars/?car=${encodeURIComponent(carName)}`);
}

function renderDriverLink(name, publicId, className = "driver-link", playerId = null) {
  const safeName = escapeHtml(name || "-");
  const href = getDriverProfileHref(publicId, playerId);
  if (!href) {
    return `<span class="${escapeHtml(className)}">${safeName}</span>`;
  }
  return `<a class="${escapeHtml(className)}" href="${href}">${safeName}</a>`;
}

function renderCarLink(name, className = "driver-link") {
  const safeName = escapeHtml(name || "-");
  const href = getCarsPageHref(name);
  if (!href) {
    return `<span class="${escapeHtml(className)}">${safeName}</span>`;
  }
  return `<a class="${escapeHtml(className)}" href="${href}">${safeName}</a>`;
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getDriverPreviewRowData(row) {
  const publicId = row?.public_id || makePublicDriverId(row?.player_id);
  if (!publicId) return null;

  return {
    publicId,
    playerId: row?.player_id || null,
    driver: row?.driver || "-",
    href: getDriverProfileHref(publicId, row?.player_id),
  };
}

const ELO_CATEGORY_FALLBACKS = {
  1: { threshold: 1350, labelKey: "eloCategory1", short: "C1" },
  2: { threshold: 1250, labelKey: "eloCategory2", short: "C2" },
  3: { threshold: 1150, labelKey: "eloCategory3", short: "C3" },
  4: { threshold: 1050, labelKey: "eloCategory4", short: "C4" },
  5: { threshold: 950, labelKey: "eloCategory5", short: "C5" },
  6: { threshold: null, labelKey: "eloCategory6", short: "C6" }
};

function getEloCategoryId(value) {
  const explicit = Number(value?.elo_category_id ?? value?.summary?.elo_category_id);
  if (Number.isFinite(explicit) && explicit >= 1 && explicit <= 6) return explicit;
  const rating = Number(value?.elo ?? value?.summary?.elo ?? value?.elo_internal_rating ?? value?.summary?.elo_internal_rating);
  if (!Number.isFinite(rating)) return null;
  if (rating >= 1350) return 1;
  if (rating >= 1250) return 2;
  if (rating >= 1150) return 3;
  if (rating >= 1050) return 4;
  if (rating >= 950) return 5;
  return 6;
}

function getEloCategoryName(value, categoryId = null) {
  const id = categoryId || getEloCategoryId(value);
  if (id) return t(ELO_CATEGORY_FALLBACKS[id]?.labelKey || "eloCategory6");
  const explicit = value?.elo_category_name || value?.summary?.elo_category_name;
  return explicit ? String(explicit) : "";
}

function getEloCategoryDisplayName(value, categoryId = null) {
  return getEloCategoryName(value, categoryId)
    .replace(/^Category\s+\d+\s+[—-]\s*/i, "")
    .replace(/^Категория\s+\d+\s+[—-]\s*/i, "")
    .trim();
}

function normalizeEloHistory(source) {
  const history = source?.elo_history || source?.summary?.elo_history || [];
  if (!Array.isArray(history)) return [];
  return history
    .map((item, index) => {
      const rating = Number(item?.new_rating ?? item?.rating ?? item?.elo);
      if (!Number.isFinite(rating)) return null;
      const date = parseEloHistoryDate(item?.finished_at || item?.date || item?.race_file);
      return {
        index,
        rating,
        delta: Number(item?.rating_delta),
        date,
        label: item?.race_file || item?.date || `#${index + 1}`
      };
    })
    .filter(Boolean);
}

function getEloInfo(source) {
  if (!source || typeof source !== "object") return null;
  const summary = source.summary || {};
  const rating = Number(
    source.elo
    ?? summary.elo
    ?? source.elo_internal_rating
    ?? summary.elo_internal_rating
    ?? source.elo_rating_after
    ?? source.elo_after
    ?? source.new_rating
  );
  if (!Number.isFinite(rating)) return null;
  const categoryId = getEloCategoryId(source) || 6;
  return {
    rating: Math.round(rating),
    internalRating: Number(source.elo_internal_rating ?? summary.elo_internal_rating),
    rd: Number(source.elo_rd ?? summary.elo_rd),
    categoryId,
    categoryName: getEloCategoryName(source, categoryId),
    categoryDisplayName: getEloCategoryDisplayName(source, categoryId),
    categoryShort: ELO_CATEGORY_FALLBACKS[categoryId]?.short || `C${categoryId}`,
    history: normalizeEloHistory(source),
    driver: source.driver || summary.driver || source.name || "-",
    publicId: source.public_id || summary.public_id || null,
    playerId: source.player_id || summary.player_id || null
  };
}

function getEloRowClass(source) {
  const info = getEloInfo(source);
  return info ? `elo-row elo-cat-${info.categoryId}` : "";
}

function findEloSource(publicId, playerId = null) {
  const pagedItems = Object.values(topDataV2PagedTables || {}).flatMap((state) =>
    Array.isArray(state?.result?.items) ? state.result.items : []
  );
  const matches = [
    driverProfileData,
    driverPreviewState?.profile,
    ...(Array.isArray(leaderboardData) ? leaderboardData : []),
    ...(Array.isArray(bestlapsData) ? bestlapsData : []),
    ...(Array.isArray(driverIndexData) ? driverIndexData : []),
    ...pagedItems
  ];
  return matches.find(item => {
    if (!item) return false;
    return (publicId && item.public_id === publicId) || (playerId && item.player_id === playerId);
  }) || null;
}

function renderEloBadge(source, { compact = false, showCategoryName = false } = {}) {
  const info = getEloInfo(source);
  if (!info) return "";
  const valueText = showCategoryName && info.categoryDisplayName
    ? `${info.rating} / ${info.categoryDisplayName}`
    : String(info.rating);
  return `
    <button
      class="elo-badge elo-cat-${escapeHtml(info.categoryId)} ${compact ? "elo-badge-compact" : ""}"
      type="button"
      data-elo-public-id="${escapeAttribute(info.publicId || "")}"
      data-elo-player-id="${escapeAttribute(info.playerId || "")}"
      title="${escapeAttribute(`${t("eloTitle")}: ${info.rating} · ${info.categoryName}`)}"
    >
      <span class="elo-badge-rank">${escapeHtml(info.categoryShort)}</span>
      <span class="elo-badge-value">${escapeHtml(valueText)}</span>
    </button>
  `;
}

function normalizeSafetyCategory(value) {
  const explicit = String(value?.safety_category ?? value?.summary?.safety_category ?? "").trim().toUpperCase();
  if (["A", "B", "C"].includes(explicit)) return explicit;
  const rating = Number(value?.safety_rating ?? value?.summary?.safety_rating ?? value?.safety_rating_after);
  if (!Number.isFinite(rating)) return null;
  if (rating >= 5) return "A";
  if (rating >= 2.5) return "B";
  return "C";
}

function getSafetyCategoryName(category) {
  const key = `safetyCategory${String(category || "").toUpperCase()}`;
  return t(key);
}

function normalizeSafetyHistory(source) {
  const history = source?.safety_history || source?.summary?.safety_history || [];
  if (!Array.isArray(history)) return [];
  return history
    .map((item, index) => {
      const rating = Number(item?.new_sr ?? item?.safety_rating ?? item?.rating);
      if (!Number.isFinite(rating)) return null;
      return {
        index,
        rating,
        delta: Number(item?.delta_sr ?? item?.rating_delta),
        date: parseEloHistoryDate(item?.finished_at || item?.date || item?.race_file),
        label: item?.race_file || item?.race_id || `#${index + 1}`,
        raceId: item?.race_id || item?.raceId || null,
        raceFile: item?.race_file || item?.raceFile || null,
        finishedAt: item?.finished_at || item?.date || null
      };
    })
    .filter(Boolean);
}

function getSafetyInfo(source) {
  if (!source || typeof source !== "object") return null;
  const summary = source.summary || {};
  const rawHistory = Array.isArray(source.safety_history)
    ? source.safety_history
    : Array.isArray(summary.safety_history)
      ? summary.safety_history
      : [];
  const isRaceSpecific = Boolean(
    source.race_id && (
      source.safety_rating_after !== undefined
      || source.safety_delta !== undefined
      || source.safety_completed_laps !== undefined
      || source.safety_invalid_laps !== undefined
      || source.safety_base_delta !== undefined
      || source.safety_final_delta !== undefined
    )
  );
  const rating = Number(
    (isRaceSpecific ? source.safety_rating_after : undefined)
    ?? source.safety_rating
    ?? summary.safety_rating
    ?? source.new_sr
  );
  if (!Number.isFinite(rating)) return null;
  const category = normalizeSafetyCategory(source) || "C";
  const completedLaps = isRaceSpecific ? (source.safety_completed_laps ?? summary.safety_completed_laps) : undefined;
  const invalidLaps = isRaceSpecific ? (source.safety_invalid_laps ?? summary.safety_invalid_laps) : undefined;
  const validLaps = source.safety_valid_laps
    ?? summary.safety_valid_laps
    ?? (Number.isFinite(Number(completedLaps)) && Number.isFinite(Number(invalidLaps))
      ? Math.max(0, Number(completedLaps) - Number(invalidLaps))
      : undefined);
  return {
    rating: rating.toFixed(2),
    ratingNumber: rating,
    delta: Number(isRaceSpecific ? source.safety_delta : (source.safety_last_delta ?? summary.safety_last_delta)),
    category,
    categoryName: getSafetyCategoryName(category),
    history: normalizeSafetyHistory(source),
    driver: source.driver || summary.driver || source.name || "-",
    publicId: source.public_id || summary.public_id || null,
    playerId: source.player_id || summary.player_id || null,
    explanation: source.safety_explanation || summary.safety_explanation || "",
    validLaps,
    invalidLaps,
    completedLaps,
      leaderLaps: isRaceSpecific ? (source.safety_leader_laps ?? summary.safety_leader_laps) : undefined,
      distanceRatio: isRaceSpecific ? (source.safety_distance_ratio ?? summary.safety_distance_ratio) : undefined,
      baseDelta: isRaceSpecific ? (source.safety_base_delta ?? summary.safety_base_delta) : undefined,
      baseReason: isRaceSpecific ? (source.safety_base_reason ?? summary.safety_base_reason) : undefined,
      penaltyDelta: isRaceSpecific ? (source.safety_penalty_delta ?? summary.safety_penalty_delta) : undefined,
      incidentPenaltyDelta: isRaceSpecific ? (source.safety_incident_penalty_delta ?? summary.safety_incident_penalty_delta) : undefined,
      finalDelta: isRaceSpecific ? (source.safety_final_delta ?? summary.safety_final_delta) : undefined,
      finalReason: isRaceSpecific ? (source.safety_final_reason ?? summary.safety_final_reason) : undefined,
      countedPenalties: isRaceSpecific ? (source.safety_counted_penalties ?? summary.safety_counted_penalties) : undefined,
      ignoredPenalties: isRaceSpecific ? (source.safety_ignored_penalties ?? summary.safety_ignored_penalties) : undefined,
      incidentPoints: isRaceSpecific ? (source.safety_incident_points ?? summary.safety_incident_points ?? source.incident_points) : undefined,
      incidentEffectivePoints: isRaceSpecific ? (source.safety_incident_effective_points ?? summary.safety_incident_effective_points ?? source.incident_effective_points) : undefined,
      incidentClustersCount: isRaceSpecific ? (source.safety_incident_clusters_count ?? summary.safety_incident_clusters_count ?? source.incident_clusters_count) : undefined,
      incidentBurstsCount: isRaceSpecific ? (source.safety_incident_bursts_count ?? summary.safety_incident_bursts_count ?? source.incident_bursts_count) : undefined,
      incidentBindingStatus: isRaceSpecific ? (source.safety_incident_binding_status ?? summary.safety_incident_binding_status) : undefined,
      totalDelta: source.safety_total_delta ?? summary.safety_total_delta ?? source.total_delta,
      totalLaps: source.safety_total_laps ?? summary.safety_total_laps ?? source.total_laps,
      totalInvalidLaps: source.safety_total_invalid_laps ?? summary.safety_total_invalid_laps ?? source.total_invalid_laps,
      invalidLapRate: source.safety_invalid_lap_rate ?? summary.safety_invalid_lap_rate ?? source.invalid_lap_rate,
      totalCountedPenalties: source.safety_total_counted_penalties ?? summary.safety_total_counted_penalties ?? source.total_counted_penalties,
      totalIncidentPoints: source.safety_total_incident_points ?? summary.safety_total_incident_points ?? source.total_incident_points,
      totalIncidentClusters: source.safety_total_incident_clusters ?? summary.safety_total_incident_clusters ?? source.total_incident_clusters,
      totalIncidentBursts: source.safety_total_incident_bursts ?? summary.safety_total_incident_bursts ?? source.total_incident_bursts,
      racesCount: source.safety_races ?? summary.safety_races ?? source.races_count,
      isRaceSpecific,
      raceId: isRaceSpecific ? (source.race_id || summary.race_id || null) : null
    };
}

function formatSafetyDetailValue(value, formatter = null) {
  if (value === null || value === undefined || value === "") return "-";
  if (formatter) return formatter(value);
  return String(value);
}

function renderSafetyReasonDetails(info) {
  const deltaFormatter = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return `${numeric > 0 ? "+" : ""}${numeric.toFixed(2)}`;
  };
  const percentFormatter = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return `${Math.round(numeric * 100)}%`;
  };
    if (!info.isRaceSpecific) {
      const rows = [
        ["safetySummaryRaces", formatSafetyDetailValue(info.racesCount)],
        ["safetySummaryTotalDelta", formatSafetyDetailValue(info.totalDelta, deltaFormatter)],
        ["safetySummaryTotalLaps", formatSafetyDetailValue(info.totalLaps)],
        ["safetySummaryInvalidLaps", formatSafetyDetailValue(info.totalInvalidLaps)],
        ["safetySummaryInvalidRate", formatSafetyDetailValue(info.invalidLapRate, percentFormatter)],
        ["safetySummaryAutoPenalties", formatSafetyDetailValue(info.totalCountedPenalties)],
        ["safetySummaryIncidents", formatSafetyDetailValue(info.totalIncidentPoints)],
        ["safetySummaryIncidentBursts", formatSafetyDetailValue(info.totalIncidentBursts)],
        ["safetySummaryIncidentClusters", formatSafetyDetailValue(info.totalIncidentClusters)]
      ];
    const hasAny = rows.some(([, value]) => value !== "-");
    if (!hasAny) return "";
    return `
      <div class="safety-reason-card">
        <div class="safety-reason-title">${escapeHtml(t("safetySummaryTitle"))}</div>
        <dl>
          ${rows.map(([labelKey, value]) => `
            <div>
              <dt>${escapeHtml(t(labelKey))}</dt>
              <dd>${escapeHtml(value)}</dd>
            </div>
          `).join("")}
        </dl>
      </div>
    `;
  }
    const rows = [
      ["safetyReasonCompletedLaps", formatSafetyDetailValue(info.completedLaps)],
      ["safetyReasonValidInvalid", `${formatSafetyDetailValue(info.validLaps)} / ${formatSafetyDetailValue(info.invalidLaps)}`],
      ["safetyReasonDistance", formatSafetyDetailValue(info.distanceRatio, percentFormatter)],
      ["safetyReasonBaseDelta", formatSafetyDetailValue(info.baseDelta, deltaFormatter)],
      ["safetyReasonPenaltyDelta", formatSafetyDetailValue(info.penaltyDelta, deltaFormatter)],
      ["safetyReasonIncidentDelta", formatSafetyDetailValue(info.incidentPenaltyDelta, deltaFormatter)],
      ["safetyReasonFinalDelta", formatSafetyDetailValue(info.finalDelta ?? info.delta, deltaFormatter)],
      ["safetyReasonAutoPenalties", formatSafetyDetailValue(info.countedPenalties)],
      ["safetyReasonIncidents", formatSafetyDetailValue(info.incidentPoints)],
      ["safetyReasonIncidentBursts", formatSafetyDetailValue(info.incidentBurstsCount)],
      ["safetyReasonIncidentClusters", formatSafetyDetailValue(info.incidentClustersCount)],
      ["safetyReasonIgnoredPenalties", formatSafetyDetailValue(info.ignoredPenalties)]
    ];
  const text = info.finalReason || info.baseReason || info.explanation || "";
  const hasAny = text || rows.some(([, value]) => value !== "-");
  if (!hasAny) return "";
  return `
    <div class="safety-reason-card">
      <div class="safety-reason-title">${escapeHtml(t("safetyReasonTitle"))}</div>
      ${text ? `<p>${escapeHtml(text)}</p>` : ""}
      <dl>
        ${rows.map(([labelKey, value]) => `
          <div>
            <dt>${escapeHtml(t(labelKey))}</dt>
            <dd>${escapeHtml(value)}</dd>
          </div>
        `).join("")}
      </dl>
    </div>
  `;
}

function formatSafetyBreakdownDelta(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0.00";
  return `${numeric > 0 ? "+" : ""}${numeric.toFixed(2)}`;
}

function hasInlineSafetyBreakdown(source) {
  return Boolean(
    source?.race_id && (
      source?.safety_base_delta !== undefined
      || source?.safety_penalty_delta !== undefined
      || source?.safety_incident_penalty_delta !== undefined
      || source?.safety_final_delta !== undefined
      || source?.safety_delta !== undefined
    )
  );
}

function buildSafetyBreakdownModel(source) {
  const info = getSafetyInfo(source);
  if (!info?.isRaceSpecific) return null;
  const sr = Number(info.finalDelta ?? info.delta ?? 0);
  const penalties = Number(info.penaltyDelta ?? 0);
  const incidents = Number(info.incidentPenaltyDelta ?? 0);
  const clean = Number((sr - penalties - incidents).toFixed(2));
  return {
    raceId: source?.race_id || info.raceId || null,
    raceFile: source?.source_file || source?.race_file || null,
    finishedAt: source?.finished_at || null,
    track: source?.track || source?.track_code || null,
    driver: source?.driver || info.driver || "-",
    sr,
    clean,
    penalties,
    incidents,
    incidentPoints: Number.isFinite(Number(info.incidentPoints)) ? Number(info.incidentPoints) : 0
  };
}

function getSafetyBreakdownRaceSummaryMarkup(model) {
  const summaryParts = [];
  if (model?.track) summaryParts.push(humanizeTrackName(model.track));
  if (model?.finishedAt) summaryParts.push(formatDateTimeLocal(model.finishedAt, currentLang));
  return summaryParts.length
    ? `<div class="sr-breakdown-summary">${escapeHtml(summaryParts.join(" / "))}</div>`
    : "";
}

function renderSafetyBreakdownContent(model, { canOpenRace = false } = {}) {
  if (!model) {
    return `
      <div class="sr-breakdown-empty">${escapeHtml(t("safetyBreakdownNoData"))}</div>
    `;
  }
  const rows = [
    [t("safetyBreakdownSr"), formatSafetyBreakdownDelta(model.sr)],
    [t("safetyBreakdownClean"), formatSafetyBreakdownDelta(model.clean)],
    [t("safetyBreakdownPenalties"), formatSafetyBreakdownDelta(model.penalties)],
    [t("safetyBreakdownIncidents"), formatSafetyBreakdownDelta(model.incidents)],
    [t("safetyBreakdownIncidentPoints"), String(model.incidentPoints ?? 0)]
  ];
  return `
    ${getSafetyBreakdownRaceSummaryMarkup(model)}
    <dl class="sr-breakdown-table">
      ${rows.map(([label, value]) => `
        <div class="sr-breakdown-row">
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `).join("")}
    </dl>
    ${canOpenRace && model.raceId ? `
      <button type="button" class="btn btn-secondary sr-breakdown-open-race" data-sr-breakdown-open-race="${escapeAttribute(model.raceId)}">
        ${escapeHtml(t("safetyBreakdownOpenRace"))}
      </button>
    ` : ""}
  `;
}

function findRaceResultParticipant(details, publicId = null, playerId = null) {
  const results = Array.isArray(details?.results) ? details.results : [];
  return results.find(row =>
    (publicId && row?.public_id === publicId) || (playerId && row?.player_id === playerId)
  ) || null;
}

async function resolveSafetyBreakdownSource({ source = null, publicId = null, playerId = null, raceId = null } = {}) {
  if (hasInlineSafetyBreakdown(source)) return source;
  const resolvedRaceId = raceId || source?.race_id || null;
  if (!resolvedRaceId) return null;
  try {
    const details = await loadRaceDetailsCached({
      race_id: resolvedRaceId,
      source_file: source?.race_file || source?.source_file || null
    });
    const participant = findRaceResultParticipant(details, publicId || source?.public_id || null, playerId || source?.player_id || null);
    return participant
      ? { ...participant, race_id: details?.race_id || resolvedRaceId, source_file: details?.source_file || source?.race_file || source?.source_file || null }
      : null;
  } catch (error) {
    console.warn("Failed to resolve SR breakdown source.", error);
    return null;
  }
}

function findSafetySource(publicId, playerId = null, raceId = null) {
  const pagedItems = Object.values(topDataV2PagedTables || {}).flatMap((state) =>
    Array.isArray(state?.result?.items) ? state.result.items : []
  );
  const selectedRaceMatch = raceId
    ? [
        ...(Array.isArray(selectedRace?.results) ? selectedRace.results : []),
        ...(Array.isArray(driverProfileData?.race_history) ? driverProfileData.race_history : [])
      ].find(item =>
        item && item.race_id === raceId && ((publicId && item.public_id === publicId) || (playerId && item.player_id === playerId))
      )
    : null;
  if (selectedRaceMatch) return selectedRaceMatch;
  const matches = [
    driverProfileData,
    driverPreviewState?.profile,
    ...(Array.isArray(leaderboardData) ? leaderboardData : []),
    ...(Array.isArray(bestlapsData) ? bestlapsData : []),
    ...(Array.isArray(safetyData) ? safetyData : []),
    ...(Array.isArray(driverIndexData) ? driverIndexData : []),
    ...pagedItems
  ];
  const matchedItems = matches.filter(item => {
    if (!item) return false;
    return (publicId && item.public_id === publicId) || (playerId && item.player_id === playerId);
  });
  if (!matchedItems.length) return null;

  const scoreSafetySource = (item) => {
    let score = 0;
    if (Array.isArray(item?.summary?.safety_history)) score += 120;
    if (Array.isArray(item?.safety_history)) score += 100;
    if (Array.isArray(item?.race_history)) score += 80;
    if (raceId && item?.race_id === raceId) score += 60;
    if (hasInlineSafetyBreakdown(item)) score += 40;
    const rating = Number(item?.safety_rating ?? item?.summary?.safety_rating ?? item?.safety_rating_after);
    if (Number.isFinite(rating)) score += 20;
    return score;
  };

  return matchedItems.sort((left, right) => scoreSafetySource(right) - scoreSafetySource(left))[0] || null;
}

function renderSafetyBadge(source, { compact = false, showDelta = false, breakdownMode = "modal" } = {}) {
  const info = getSafetyInfo(source);
  if (!info) return "";
  const delta = Number(info.delta);
  const deltaText = showDelta && Number.isFinite(delta) && delta !== 0
    ? ` <span class="sr-badge-delta ${delta > 0 ? "positive" : "negative"}">(${delta > 0 ? "+" : ""}${delta.toFixed(2)})</span>`
    : "";
  return `
    <button
      class="sr-badge sr-cat-${escapeHtml(info.category)} ${compact ? "sr-badge-compact" : ""}"
      type="button"
      data-sr-public-id="${escapeAttribute(info.publicId || "")}"
      data-sr-player-id="${escapeAttribute(info.playerId || "")}"
      data-sr-race-id="${escapeAttribute(source?.race_id || "")}"
      data-sr-breakdown-mode="${escapeAttribute(breakdownMode)}"
      title="${escapeAttribute(`${t("safetyRatingTitle")}: ${info.category} ${info.rating}`)}"
    >
      <span class="sr-badge-value"><strong>${escapeHtml(info.category)}</strong> ${escapeHtml(info.rating)}</span>${deltaText}
    </button>
  `;
}

function renderSafetyCell(row) {
  return renderSafetyBadge(row, { compact: true }) || `<span class="empty-inline">-</span>`;
}

function renderSafetyRaceCell(row) {
  return renderSafetyBadge(row, { compact: true, showDelta: true, breakdownMode: "inline" }) || `<span class="empty-inline">-</span>`;
}

function isDriverBanned(source) {
  if (!source || typeof source !== "object") return false;
  return Boolean(source.is_banned || source.banned || source.ban || source.summary?.is_banned || source.summary?.ban);
}

function renderBannedBadge({ compact = false } = {}) {
  return `<span class="banned-badge${compact ? " banned-badge-compact" : ""}">${escapeHtml(t("bannedLabel"))}</span>`;
}

function renderCarOrBanned(row, fallback = "-") {
  if (isDriverBanned(row)) return renderBannedBadge({ compact: true });
  return escapeHtml(row?.best_lap_car_name ?? row?.car_name ?? fallback);
}

function parseEloHistoryDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const isoDate = new Date(raw);
  if (!Number.isNaN(isoDate.getTime())) return isoDate;
  const match = raw.match(/(\d{2})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/);
  if (!match) return null;
  const year = 2000 + Number(match[1]);
  return new Date(year, Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6]));
}

function buildDriverPreviewRowClass(row) {
  return ["is-interactive-row", "is-driver-preview-row", getEloRowClass(row)].filter(Boolean).join(" ");
}

function buildDriverPreviewRowAttributes(row) {
  const preview = getDriverPreviewRowData(row);
  if (!preview) return "";

  return [
    `class="${escapeAttribute(buildDriverPreviewRowClass(row))}"`,
    'tabindex="0"',
    'role="button"',
    `aria-label="${escapeAttribute(`${t("openDriverPreviewLabel")}: ${preview.driver}`)}"`,
    `data-driver-preview="true"`,
    `data-public-id="${escapeAttribute(preview.publicId)}"`,
    `data-player-id="${escapeAttribute(preview.playerId || "")}"`,
    `data-driver-name="${escapeAttribute(preview.driver)}"`
  ].join(" ");
}

function renderDriverNameMeta() {
  return "";
}

function sessionLabel(value) {
  const v = String(value || "").toUpperCase();
  if (v === "R") return `<span class="pill pill-session-r">${escapeHtml(t("sessionRace"))}</span>`;
  if (v === "Q") return `<span class="pill pill-session-q">${escapeHtml(t("sessionQualifying"))}</span>`;
  return `<span class="pill">${escapeHtml(v || "-")}</span>`;
}

function normalizeString(value) {
  return String(value ?? "").trim().toLocaleLowerCase(currentLang === "ru" ? "ru" : "en");
}

function parseNumeric(value) {
  if (value === null || value === undefined || value === "" || value === "-") {
    return Number.POSITIVE_INFINITY;
  }
  const num = Number(String(value).replace(",", "."));
  return Number.isFinite(num) ? num : Number.POSITIVE_INFINITY;
}

function parseLapTime(value) {
  if (!value || value === "-") return Number.POSITIVE_INFINITY;
  const str = String(value).trim();
  const parts = str.split(":");

  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const secParts = parts[1].split(".");
    const seconds = Number(secParts[0] || 0);
    const millis = Number(secParts[1] || 0);
    if ([minutes, seconds, millis].every(Number.isFinite)) {
      return minutes * 60000 + seconds * 1000 + millis;
    }
  }

  if (parts.length === 3) {
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const secParts = parts[2].split(".");
    const seconds = Number(secParts[0] || 0);
    const millis = Number(secParts[1] || 0);
    if ([hours, minutes, seconds, millis].every(Number.isFinite)) {
      return hours * 3600000 + minutes * 60000 + seconds * 1000 + millis;
    }
  }

  return Number.POSITIVE_INFINITY;
}

function formatLapTimeFromMs(value) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  const totalMs = Math.round(value);
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const milliseconds = totalMs % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

function getNestedValue(row, key) {
  if (!key.includes(".")) return row?.[key];
  return key.split(".").reduce((acc, part) => acc?.[part], row);
}

function getSortableEloValue(row) {
  const info = getEloInfo(row);
  if (info && Number.isFinite(info.rating) && info.rating > 0) return info.rating;
  const fallback = parseNumeric(
    row?.elo
    ?? row?.summary?.elo
    ?? row?.elo_internal_rating
    ?? row?.summary?.elo_internal_rating
  );
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}

function compareEloValues(a, b, direction) {
  const av = getSortableEloValue(a);
  const bv = getSortableEloValue(b);
  const aMissing = !Number.isFinite(av);
  const bMissing = !Number.isFinite(bv);

  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  if (av < bv) return direction === "asc" ? -1 : 1;
  if (av > bv) return direction === "asc" ? 1 : -1;
  return 0;
}

function getComparableValue(row, column) {
  if (column.key === "elo") {
    return getSortableEloValue(row);
  }
  const value = getNestedValue(row, column.key);
  switch (column.type) {
    case "number":
      return parseNumeric(value);
    case "time":
      return parseLapTime(value);
    default:
      return normalizeString(value);
  }
}

function filterByDriver(data, search) {
  const query = normalizeString(search);
  if (!query) return [...data];
  return data.filter(row => normalizeString(row.driver).includes(query));
}

function sortData(data, sortState, columns) {
  if (!sortState.key || !sortState.direction) return [...data];
  const column = columns.find(col => col.key === sortState.key);
  if (!column) return [...data];

  return [...data].sort((a, b) => {
    if (column.key === "elo") {
      const eloDiff = compareEloValues(a, b, sortState.direction);
      if (eloDiff !== 0) return eloDiff;
    }
    const av = getComparableValue(a, column);
    const bv = getComparableValue(b, column);
    if (av < bv) return sortState.direction === "asc" ? -1 : 1;
    if (av > bv) return sortState.direction === "asc" ? 1 : -1;
    const rankDiff = parseNumeric(a.rank) - parseNumeric(b.rank);
    return Number.isFinite(rankDiff) ? rankDiff : 0;
  });
}

function cycleSort(sortState, key) {
  if (sortState.key !== key) return { key, direction: "asc" };
  return { key, direction: sortState.direction === "asc" ? "desc" : "asc" };
}

function getSortClass(sortState, key) {
  if (sortState.key !== key) return "";
  return sortState.direction === "asc" ? "sort-asc" : "sort-desc";
}

function getAriaSort(sortState, key) {
  if (sortState.key !== key || !sortState.direction) return "none";
  return sortState.direction === "asc" ? "ascending" : "descending";
}

function bindSortableHeaders(selector, sortState, onSort) {
  document.querySelectorAll(selector).forEach(th => {
    th.addEventListener("click", () => onSort(th.dataset.sortKey));
    th.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSort(th.dataset.sortKey);
      }
    });
    th.setAttribute("aria-sort", getAriaSort(sortState, th.dataset.sortKey));
  });
}

function renderSortableHeaders(columns, labels, sortState) {
  return columns.map((col, index) => `
    <th class="${escapeHtml(col.className || "")} ${col.sortable === false ? "" : "sortable"} ${col.sortable === false ? "" : getSortClass(sortState, col.key)}" ${col.sortable === false ? "" : `data-sort-key="${escapeHtml(col.key)}" tabindex="0" role="button" aria-sort="${getAriaSort(sortState, col.key)}"`}>
      ${escapeHtml(Array.isArray(labels) ? labels[index] : col.label ?? col.key)}
    </th>
  `).join("");
}

function bindInteractiveRows(container, selector, onOpen, { ignoreSelector = "a" } = {}) {
  container.querySelectorAll(selector).forEach(row => {
    const openRow = (event) => {
      if (event.target.closest(ignoreSelector)) return;
      onOpen(row, event);
    };

    row.addEventListener("click", openRow);
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openRow(event);
    });
  });
}

function getProcessedLeaderboard() {
  return sortData(
    filterByDriver(leaderboardData, leaderboardSearch),
    leaderboardSort,
    leaderboardColumns
  );
}

function getProcessedBestlaps() {
  const trackFiltered = bestlapsTrackFilter
    ? bestlapsData.filter(row => String(row?.track_code || row?.track || "").trim().toLowerCase() === bestlapsTrackFilter)
    : bestlapsData;
  return sortData(
    filterByDriver(trackFiltered, bestlapsSearch),
    bestlapsSort,
    bestlapsColumns
  );
}

function getProcessedSafety() {
  return sortData(
    filterByDriver(safetyData, safetySearch),
    safetySort,
    getSafetyColumns()
  );
}

function getProcessedCars() {
  return sortData(
    filterCars(carsData),
    carsSort,
    carsColumns
  );
}

function getLatestRaceDate(data = racesData) {
  const timestamps = (Array.isArray(data) ? data : [])
    .map(race => new Date(race?.finished_at || race?.date || "").getTime())
    .filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)) : null;
}

function getFunStatsPeriodWindow(period) {
  const days = period === "month" ? 30 : 7;
  const anchor = getLatestRaceDate() || new Date();
  const end = new Date(anchor);
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return { start, end };
}

function getFunStatsPeriodRaces(period) {
  const { start, end } = getFunStatsPeriodWindow(period);
  const startTime = start.getTime();
  const endTime = end.getTime();

  return (Array.isArray(racesData) ? racesData : [])
    .filter(race => {
      const time = new Date(race?.finished_at || race?.date || "").getTime();
      return Number.isFinite(time) && time >= startTime && time <= endTime;
    })
    .sort((a, b) => new Date(b?.finished_at || 0).getTime() - new Date(a?.finished_at || 0).getTime());
}

function createFunDriverRecord(row) {
  return {
    publicId: row?.public_id || makePublicDriverId(row?.player_id),
    playerId: row?.player_id || null,
    driver: row?.driver || "-",
    starts: 0,
    points: 0,
    wins: 0,
    podiums: 0,
    fastestLapAwards: 0,
    finishTotal: 0,
    finishSamples: 0,
    positionsGain: 0,
    penaltyPoints: 0,
    penaltyCount: 0
  };
}

function aggregateFunStats(period) {
  const apiData = funStatsApiData?.[period];
  if (apiData && typeof apiData === "object") {
    const start = apiData.range_start ? formatDateLocal(apiData.range_start, currentLang) : "";
    const end = apiData.range_end ? formatDateLocal(apiData.range_end, currentLang) : "";
    return {
      ...apiData,
      rangeLabel: start && end ? `${start} - ${end}` : "-"
    };
  }

  const periodRaces = getFunStatsPeriodRaces(period);
  const { start, end } = getFunStatsPeriodWindow(period);
  const driverMap = new Map();
  const carMap = new Map();
  let overtakesTotal = 0;
  let fastestLapRecord = null;

  periodRaces.forEach(race => {
    const activeResults = (race?.results || []).filter(isActiveRaceResult);

    activeResults.forEach(row => {
      const key = row?.public_id || makePublicDriverId(row?.player_id) || row?.driver || "unknown_driver";
      const record = driverMap.get(key) || createFunDriverRecord(row);
      record.starts += 1;
      record.points += row?.points ?? 0;
      record.wins += row?.position === 1 ? 1 : 0;
      record.podiums += typeof row?.position === "number" && row.position <= 3 ? 1 : 0;
      record.fastestLapAwards += row?.had_best_lap ? 1 : 0;
      if (typeof row?.position === "number" && row.position > 0) {
        record.finishTotal += row.position;
        record.finishSamples += 1;
      }
      record.positionsGain += Math.max(0, row?.positions_delta ?? 0);
      record.penaltyPoints += row?.penalty_points ?? 0;
      record.penaltyCount += row?.penalty_count ?? 0;
      driverMap.set(key, record);

      overtakesTotal += Math.max(0, row?.positions_delta ?? 0);

      const carName = row?.car_name || "-";
      const carRecord = carMap.get(carName) || { car: carName, starts: 0, wins: 0 };
      carRecord.starts += 1;
      carRecord.wins += row?.position === 1 ? 1 : 0;
      carMap.set(carName, carRecord);

      if (typeof row?.best_lap_ms === "number" && row.best_lap_ms > 0) {
        if (!fastestLapRecord || row.best_lap_ms < fastestLapRecord.bestLapMs) {
          fastestLapRecord = {
            bestLapMs: row.best_lap_ms,
            lap: row.best_lap || formatLapTimeFromMs(row.best_lap_ms),
            driver: row.driver || "-",
            publicId: row.public_id || makePublicDriverId(row.player_id),
            playerId: row.player_id || null
          };
        }
      }
    });
  });

  const drivers = [...driverMap.values()];
  const cars = [...carMap.values()];
  const cleanPool = drivers.filter(driver => driver.starts >= (period === "month" ? 4 : 2));
  const stablePool = drivers
    .filter(driver => driver.starts >= (period === "month" ? 5 : 3) && driver.finishSamples > 0)
    .map(driver => ({
      ...driver,
      averageFinish: driver.finishTotal / driver.finishSamples
    }));
  const chaosMagnet = [...(Array.isArray(safetyData) ? safetyData : [])]
    .sort((a, b) => (b?.penalty_points ?? 0) - (a?.penalty_points ?? 0) || (b?.penalty_count ?? 0) - (a?.penalty_count ?? 0))
    [0] || null;
  const fastestLapLeader = [...drivers]
    .sort((a, b) => b.fastestLapAwards - a.fastestLapAwards || b.points - a.points || a.driver.localeCompare(b.driver))[0] || null;

  return {
    rangeLabel: `${formatDateLocal(start, currentLang)} - ${formatDateLocal(end, currentLang)}`,
    summary: {
      races: periodRaces.length,
      activeDrivers: drivers.length,
      fastestLapLeader,
      overtakes: overtakesTotal
    },
    awards: {
      pointsBoss: [...drivers].sort((a, b) => b.points - a.points || b.wins - a.wins || a.driver.localeCompare(b.driver))[0] || null,
      grindKing: [...drivers].sort((a, b) => b.starts - a.starts || b.points - a.points || a.driver.localeCompare(b.driver))[0] || null,
      podiumHunter: [...drivers].sort((a, b) => b.podiums - a.podiums || b.wins - a.wins || a.driver.localeCompare(b.driver))[0] || null,
      comebackHero: [...drivers].sort((a, b) => b.positionsGain - a.positionsGain || b.starts - a.starts || a.driver.localeCompare(b.driver))[0] || null,
      cleanOperator: [...cleanPool].sort((a, b) => a.penaltyPoints - b.penaltyPoints || b.starts - a.starts || b.points - a.points || a.driver.localeCompare(b.driver))[0] || null,
      hotLapHero: fastestLapRecord,
      chaosMagnet: chaosMagnet
        ? {
            driver: chaosMagnet.driver || "-",
            publicId: chaosMagnet.public_id || makePublicDriverId(chaosMagnet.player_id),
            playerId: chaosMagnet.player_id || null,
            penaltyPoints: chaosMagnet.penalty_points ?? 0
          }
        : null,
      garageFavorite: [...cars].sort((a, b) => b.starts - a.starts || b.wins - a.wins || a.car.localeCompare(b.car))[0] || null
    },
    lists: {
      active: [...drivers].sort((a, b) => b.starts - a.starts || b.points - a.points || a.driver.localeCompare(b.driver)).slice(0, 5),
      movers: [...drivers].sort((a, b) => b.positionsGain - a.positionsGain || b.starts - a.starts || a.driver.localeCompare(b.driver)).slice(0, 5),
      clean: [...cleanPool].sort((a, b) => a.penaltyPoints - b.penaltyPoints || b.starts - a.starts || b.points - a.points || a.driver.localeCompare(b.driver)).slice(0, 5),
      stable: [...stablePool].sort((a, b) => a.averageFinish - b.averageFinish || b.starts - a.starts || a.driver.localeCompare(b.driver)).slice(0, 5),
      fastest: [...drivers].sort((a, b) => b.fastestLapAwards - a.fastestLapAwards || b.points - a.points || a.driver.localeCompare(b.driver)).slice(0, 5),
      cars: [...cars].sort((a, b) => b.starts - a.starts || b.wins - a.wins || a.car.localeCompare(b.car)).slice(0, 5)
    }
  };
}

function renderFunStatsAwardCard(labelKey, titleMarkup, note, accent = "default") {
  return `
    <article class="fun-award-card fun-award-card-${escapeHtml(accent)}">
      <div class="fun-award-label">${escapeHtml(t(labelKey))}</div>
      <div class="fun-award-title">${titleMarkup}</div>
      <div class="fun-award-note">${escapeHtml(note)}</div>
    </article>
  `;
}

function renderFunStatsSummaryCard(labelMarkup, valueMarkup, note = "", extraClass = "") {
  return `
    <article class="fun-summary-card ${escapeHtml(extraClass)}">
      <div class="fun-summary-label">${labelMarkup}</div>
      <div class="fun-summary-value">${valueMarkup}</div>
      ${note ? `<div class="fun-summary-note">${escapeHtml(note)}</div>` : ""}
    </article>
  `;
}

function renderFunStatsListCard(titleKey, items, valueFormatter) {
  const listMarkup = items.length
    ? items.map((item, index) => `
        <li class="fun-list-item">
          <span class="fun-list-rank">#${index + 1}</span>
          <span class="fun-list-main">${item.label}</span>
          <span class="fun-list-side">${escapeHtml(valueFormatter(item))}</span>
        </li>
      `).join("")
    : `<li class="fun-list-item fun-list-item-empty">${escapeHtml(t("funStatsEmpty"))}</li>`;

  return `
    <article class="fun-list-card">
      <div class="fun-list-title">${escapeHtml(t(titleKey))}</div>
      <ul class="fun-list">${listMarkup}</ul>
    </article>
  `;
}

function renderFunStatsPage() {
  const summaryEl = document.getElementById("fun-stats-summary");
  const awardsEl = document.getElementById("fun-stats-awards");
  const leaderboardsEl = document.getElementById("fun-stats-leaderboards");
  const rangeEl = document.getElementById("fun-stats-range");
  const toggleButtons = document.querySelectorAll("[data-fun-period]");

  if (!summaryEl || !awardsEl || !leaderboardsEl || !rangeEl) return;

  if (topLoadState.funStats) {
    summaryEl.innerHTML = renderLoadingMarkup(t("loading"));
    awardsEl.innerHTML = renderLoadingMarkup(t("loading"));
    leaderboardsEl.innerHTML = "";
    rangeEl.textContent = t("loading");
    return;
  }

  toggleButtons.forEach(button => {
    const active = button.dataset.funPeriod === funStatsPeriod;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });

  const data = aggregateFunStats(funStatsPeriod);
  rangeEl.textContent = `${t("funStatsWindowLabel")}: ${data.rangeLabel}`;

  summaryEl.innerHTML = `
    ${renderFunStatsSummaryCard(
      escapeHtml(t("funStatsSummaryRaces")),
      escapeHtml(data.summary.races)
    )}
    ${renderFunStatsSummaryCard(
      escapeHtml(t("funStatsSummaryDrivers")),
      escapeHtml(data.summary.activeDrivers)
    )}
    ${renderFunStatsSummaryCard(
      escapeHtml(t("funStatsSummaryFastestLapsLeader")),
      data.summary.fastestLapLeader
        ? escapeHtml(replaceTokens(t("funStatsSummaryFastestLapsLeaderNote"), { value: data.summary.fastestLapLeader.fastestLapAwards }))
        : "-",
      data.summary.fastestLapLeader
        ? data.summary.fastestLapLeader.driver
        : ""
      ,
      "fun-summary-card-driver-note"
    )}
    ${renderFunStatsSummaryCard(
      escapeHtml(t("funStatsSummaryOvertakes")),
      escapeHtml(data.summary.overtakes)
    )}
  `;

  if (!data.summary.races) {
    awardsEl.innerHTML = `<div class="empty-box">${escapeHtml(t("funStatsEmpty"))}</div>`;
    leaderboardsEl.innerHTML = "";
    return;
  }

  const { pointsBoss, grindKing, podiumHunter, comebackHero, cleanOperator, hotLapHero, chaosMagnet, garageFavorite } = data.awards;

  awardsEl.innerHTML = [
    pointsBoss && renderFunStatsAwardCard(
      "funStatsAwardPointsBoss",
      renderDriverLink(pointsBoss.driver, pointsBoss.publicId, "driver-link driver-link-heading", pointsBoss.playerId),
      replaceTokens(t("funStatsAwardPointsBossNote"), { value: pointsBoss.points }),
      "accent"
    ),
    grindKing && renderFunStatsAwardCard(
      "funStatsAwardGrindKing",
      renderDriverLink(grindKing.driver, grindKing.publicId, "driver-link driver-link-heading", grindKing.playerId),
      replaceTokens(t("funStatsAwardGrindKingNote"), { value: grindKing.starts }),
      "warm"
    ),
    podiumHunter && renderFunStatsAwardCard(
      "funStatsAwardPodiumHunter",
      renderDriverLink(podiumHunter.driver, podiumHunter.publicId, "driver-link driver-link-heading", podiumHunter.playerId),
      replaceTokens(t("funStatsAwardPodiumHunterNote"), { value: podiumHunter.podiums }),
      "gold"
    ),
    comebackHero && renderFunStatsAwardCard(
      "funStatsAwardComebackHero",
      renderDriverLink(comebackHero.driver, comebackHero.publicId, "driver-link driver-link-heading", comebackHero.playerId),
      replaceTokens(t("funStatsAwardComebackHeroNote"), { value: comebackHero.positionsGain }),
      "cool"
    ),
    cleanOperator && renderFunStatsAwardCard(
      "funStatsAwardCleanOperator",
      renderDriverLink(cleanOperator.driver, cleanOperator.publicId, "driver-link driver-link-heading", cleanOperator.playerId),
      replaceTokens(t("funStatsAwardCleanOperatorNote"), { value: cleanOperator.penaltyPoints, starts: cleanOperator.starts }),
      "clean"
    ),
    hotLapHero && renderFunStatsAwardCard(
      "funStatsAwardHotLapHero",
      renderDriverLink(hotLapHero.driver, hotLapHero.publicId, "driver-link driver-link-heading", hotLapHero.playerId),
      replaceTokens(t("funStatsAwardHotLapHeroNote"), { lap: hotLapHero.lap }),
      "accent"
    ),
    chaosMagnet && renderFunStatsAwardCard(
      "funStatsAwardChaosMagnet",
      renderDriverLink(chaosMagnet.driver, chaosMagnet.publicId, "driver-link driver-link-heading", chaosMagnet.playerId),
      replaceTokens(t("funStatsAwardChaosMagnetNote"), { value: chaosMagnet.penaltyPoints }),
      "danger"
    ),
    garageFavorite && renderFunStatsAwardCard(
      "funStatsAwardGarageFavorite",
      renderCarLink(garageFavorite.car, "driver-link driver-link-heading"),
      replaceTokens(t("funStatsAwardGarageFavoriteNote"), { value: garageFavorite.starts }),
      "neutral"
    )
  ].filter(Boolean).join("");

  leaderboardsEl.innerHTML = [
    renderFunStatsListCard(
      "funStatsListActive",
      data.lists.active.map(item => ({
        label: renderDriverLink(item.driver, item.publicId, "driver-link", item.playerId),
        value: item.starts
      })),
      item => replaceTokens(t("funStatsListStartsValue"), { value: item.value })
    ),
    renderFunStatsListCard(
      "funStatsListMovers",
      data.lists.movers.map(item => ({
        label: renderDriverLink(item.driver, item.publicId, "driver-link", item.playerId),
        value: item.positionsGain
      })),
      item => replaceTokens(t("funStatsListGainValue"), { value: item.value })
    ),
    renderFunStatsListCard(
      "funStatsListClean",
      data.lists.clean.map(item => ({
        label: renderDriverLink(item.driver, item.publicId, "driver-link", item.playerId),
        value: item.penaltyPoints
      })),
      item => replaceTokens(t("funStatsListPenaltyValue"), { value: item.value })
    ),
    renderFunStatsListCard(
      "funStatsListStable",
      data.lists.stable.map(item => ({
        label: renderDriverLink(item.driver, item.publicId, "driver-link", item.playerId),
        value: item.averageFinish
      })),
      item => replaceTokens(t("funStatsListAvgFinishValue"), { value: Number(item.value).toFixed(2) })
    ),
    renderFunStatsListCard(
      "funStatsListFastest",
      data.lists.fastest.map(item => ({
        label: renderDriverLink(item.driver, item.publicId, "driver-link", item.playerId),
        value: item.fastestLapAwards
      })),
      item => replaceTokens(t("funStatsListFastestLapValue"), { value: item.value })
    ),
    renderFunStatsListCard(
      "funStatsListCars",
      data.lists.cars.map(item => ({
        label: renderCarLink(item.car, "driver-link"),
        value: item.starts
      })),
      item => replaceTokens(t("funStatsListCarValue"), { value: item.value })
    )
  ].join("");
}

function bindFunStatsControls() {
  document.querySelectorAll("[data-fun-period]").forEach(button => {
    button.addEventListener("click", () => {
      const nextPeriod = button.dataset.funPeriod;
      if (!nextPeriod || nextPeriod === funStatsPeriod) return;
      funStatsPeriod = nextPeriod;
      renderFunStatsPage();
      applyRevealAnimations();
    });
  });
}

function getLocalizedCommunityValue(value, fallback = "") {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value[currentLang] ?? value.en ?? value.ru ?? fallback;
  }
  return value ?? fallback;
}

function normalizeCommunityImages(images = []) {
  return Array.isArray(images)
    ? images.filter(image => image && image.src).slice(0, 2)
    : [];
}

function isCommunityLightboxDesktop() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(min-width: 900px)").matches;
}

function formatCommunityDateLong(dateString, lang = currentLang) {
  if (!dateString) return "-";

  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  const formatted = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
  return lang === "ru" ? formatted.replace(/\s*г\.$/, "") : formatted;
}

function formatNewsDateTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).padStart(4, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function getCommunityPostId(post) {
  return String(post?.id || post?.date || "").trim();
}

function getCommunityBrowserVoterId() {
  return getExpiringStorageValue("communityLikeVoterId", VOTER_ID_STORAGE_TTL_MS);
}

function getCommunityLikesLabel(state) {
  if (state?.failed) return t("communityLikesFailed");
  if (!state || state.loading || typeof state.likes !== "number") return t("communityLikesLoading");
  if (state.likes <= 0) return t("communityLikesZero");
  return replaceTokens(t(state.likes === 1 ? "communityLikesOne" : "communityLikesMany"), { value: state.likes });
}

function renderCommunityLikes() {
  document.querySelectorAll("[data-community-like-post-id]").forEach(button => {
    const postId = button.dataset.communityLikePostId;
    const state = communityLikeStateByPostId[postId] || { likes: null, already_liked: false, loading: Boolean(communityLikesApiUrl) };
    const isPending = pendingCommunityLikePostIds.has(postId);
    const alreadyLiked = Boolean(state.already_liked);
    const labelEl = button.querySelector("[data-community-like-label]");
    const countEl = button.closest(".community-feed-actions")?.querySelector("[data-community-like-count]");

    button.classList.toggle("is-liked", alreadyLiked);
    button.disabled = !communityLikesApiUrl || isPending || alreadyLiked || state.failed;
    button.setAttribute("aria-pressed", alreadyLiked ? "true" : "false");
    if (labelEl) labelEl.textContent = alreadyLiked ? t("communityLikedButton") : t("communityLikeButton");
    if (countEl) countEl.textContent = isPending ? t("communityLikesLoading") : getCommunityLikesLabel(state);
  });
}

function getCommunityPostIds() {
  return (Array.isArray(window.ASG_COMMUNITY_POSTS) ? window.ASG_COMMUNITY_POSTS : [])
    .map(getCommunityPostId)
    .filter(Boolean);
}

async function loadCommunityLikes() {
  const postIds = getCommunityPostIds();
  if (!communityLikesApiUrl || !postIds.length) {
    renderCommunityLikes();
    return;
  }

  postIds.forEach(postId => {
    communityLikeStateByPostId[postId] = {
      ...(communityLikeStateByPostId[postId] || {}),
      loading: true,
      failed: false
    };
  });
  renderCommunityLikes();

  try {
    const url = new URL("/likes", communityLikesApiUrl);
    url.searchParams.set("post_ids", postIds.join(","));
    url.searchParams.set("voter_id", getCommunityBrowserVoterId());
    const rawPayload = await requestJson(url, { cache: "no-store", retries: 1 });
    const { normalizeCommunityLikesPayload } = await dataSchemaModulePromise;
    const payload = normalizeCommunityLikesPayload(rawPayload);
    const items = payload?.items && typeof payload.items === "object" ? payload.items : {};
    communityLikeStateByPostId = {
      ...communityLikeStateByPostId,
      ...Object.fromEntries(postIds.map(postId => {
        const item = items[postId] || {};
        return [postId, {
          likes: typeof item.likes === "number" ? item.likes : 0,
          already_liked: Boolean(item.already_liked),
          loading: false,
          failed: false
        }];
      }))
    };
  } catch (error) {
    console.warn("community likes are unavailable.", error);
    postIds.forEach(postId => {
      communityLikeStateByPostId[postId] = {
        ...(communityLikeStateByPostId[postId] || {}),
        loading: false,
        failed: true
      };
    });
  } finally {
    renderCommunityLikes();
  }
}

async function submitCommunityLike(postId) {
  if (!communityLikesApiUrl || !postId || pendingCommunityLikePostIds.has(postId)) return;
  const state = communityLikeStateByPostId[postId] || {};
  if (state.already_liked) return;

  pendingCommunityLikePostIds.add(postId);
  renderCommunityLikes();

  try {
    const payload = await requestJson(new URL("/like", communityLikesApiUrl), {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        post_id: postId,
        voter_id: getCommunityBrowserVoterId()
      })
    });
    await invalidateRuntimeQueries();
    communityLikeStateByPostId[postId] = {
      likes: typeof payload?.likes === "number" ? payload.likes : (state.likes || 0),
      already_liked: Boolean(payload?.already_liked),
      loading: false,
      failed: false
    };
  } catch (error) {
    console.warn("community like failed.", error);
    communityLikeStateByPostId[postId] = {
      ...state,
      loading: false,
      failed: true
    };
  } finally {
    pendingCommunityLikePostIds.delete(postId);
    renderCommunityLikes();
  }
}

function renderCommunityPost(post) {
  const title = getLocalizedCommunityValue(post?.title, "-");
  const postId = getCommunityPostId(post);
  const text = getLocalizedCommunityValue(post?.text, "");
  const images = normalizeCommunityImages(post?.images);
  const dateLabel = formatCommunityDateLong(post?.date, currentLang);

  return `
    <article class="community-feed-card reveal">
      <div class="community-feed-copy">
        <time class="community-feed-date" datetime="${escapeAttribute(post?.date || "")}">${escapeHtml(dateLabel)}</time>
        <h3 class="community-feed-title">${escapeHtml(title)}</h3>
        <div class="community-feed-text">
          ${renderCommunityTextBlocks(text)}
        </div>
        ${postId ? `
          <div class="community-feed-actions">
            <button
              class="community-like-btn"
              type="button"
              data-community-like-post-id="${escapeHtml(postId)}"
              aria-pressed="false"
            >
              <span class="community-like-heart" aria-hidden="true">&hearts;</span>
              <span data-community-like-label>${escapeHtml(t("communityLikeButton"))}</span>
            </button>
            <span class="community-like-count" data-community-like-count>${escapeHtml(t("communityLikesLoading"))}</span>
          </div>
        ` : ""}
      </div>
      ${images.length ? `
        <div class="community-feed-gallery community-feed-gallery-${images.length}">
          ${images.map(image => {
            const alt = getLocalizedCommunityValue(image.alt, title);
            const src = String(image.src || "");
            return `
              <figure class="community-feed-photo">
                <button
                  class="community-feed-photo-btn"
                  type="button"
                  data-community-image-src="${escapeHtml(src)}"
                  data-community-image-alt="${escapeHtml(alt)}"
                  aria-label="${escapeHtml(t("communityOpenImageLabel"))}: ${escapeHtml(alt)}"
                >
                  <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />
                </button>
              </figure>
            `;
          }).join("")}
        </div>
      ` : ""}
    </article>
  `;
}

function renderCommunityPage() {
  const listEl = document.getElementById("community-feed");
  if (!listEl) return;

  if (topLoadState.community) {
    listEl.innerHTML = renderLoadingMarkup(t("loading"));
    return;
  }

  const posts = Array.isArray(window.ASG_COMMUNITY_POSTS) ? window.ASG_COMMUNITY_POSTS : [];
  const sortedPosts = [...posts].sort((a, b) => {
    const bTime = new Date(b?.date || 0).getTime();
    const aTime = new Date(a?.date || 0).getTime();
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  });

  listEl.innerHTML = sortedPosts.length
    ? sortedPosts.map(renderCommunityPost).join("")
    : `<div class="empty-box">${escapeHtml(t("communityEmpty"))}</div>`;
  updateCommunityLightboxAvailability();
  bindCommunityLikeControls();
  renderCommunityLikes();
}

function bindCommunityLikeControls() {
  const listEl = document.getElementById("community-feed");
  if (!listEl || listEl.dataset.likesBound === "true") return;

  listEl.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-community-like-post-id]");
    if (!button || !listEl.contains(button)) return;
    event.preventDefault();
    void submitCommunityLike(button.dataset.communityLikePostId);
  });

  listEl.dataset.likesBound = "true";
}

function updateCommunityLightboxAvailability() {
  const isEnabled = isCommunityLightboxDesktop();
  document.querySelectorAll("[data-community-image-src]").forEach(button => {
    button.disabled = !isEnabled;
  });
}

function renderCommunityLightbox() {
  const imageEl = document.getElementById("community-lightbox-image");
  if (!imageEl) return;

  if (!communityLightboxState?.src) {
    imageEl.removeAttribute("src");
    imageEl.alt = "";
    return;
  }

  imageEl.src = communityLightboxState.src;
  imageEl.alt = communityLightboxState.alt || "";
}

function openCommunityLightbox(src, alt, trigger = null) {
  if (!communityLightboxController || !isCommunityLightboxDesktop() || !src) return;
  communityLightboxState = { src, alt: alt || "" };
  communityLightboxController.open(trigger);
}

function bindCommunityLightboxTriggers() {
  const listEl = document.getElementById("community-feed");
  if (!listEl || listEl.dataset.lightboxBound === "true") return;

  listEl.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-community-image-src]");
    if (!button || !listEl.contains(button)) return;
    openCommunityLightbox(button.dataset.communityImageSrc, button.dataset.communityImageAlt, button);
  });

  listEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const button = event.target?.closest?.("[data-community-image-src]");
    if (!button || !listEl.contains(button)) return;
    event.preventDefault();
    openCommunityLightbox(button.dataset.communityImageSrc, button.dataset.communityImageAlt, button);
  });

  listEl.dataset.lightboxBound = "true";
}

function initCommunityLightbox() {
  communityLightboxController = createModalController({
    modalId: "community-lightbox-modal",
    closeButtonId: "community-lightbox-close",
    onOpen: renderCommunityLightbox,
    onClose: () => {
      communityLightboxState = null;
      renderCommunityLightbox();
    }
  });
  bindCommunityLightboxTriggers();
  updateCommunityLightboxAvailability();
  window.addEventListener("resize", debounce(updateCommunityLightboxAvailability, 120));
}

function getNewsListHref() {
  return `${SITE_BASE_PATH}news/`;
}

function getNewsArticleHref(slug) {
  const baseHref = getNewsListHref();
  if (!slug) return baseHref;
  return `${baseHref}?slug=${encodeURIComponent(slug)}`;
}

function getRequestedNewsSlug() {
  const slug = new URLSearchParams(window.location.search).get("slug");
  return String(slug || "").trim();
}

function loadNewsReadState() {
  if (appStorage) return appStorage.get("newsReadState", {});
  try {
    const rawValue = localStorage.getItem(NEWS_READ_STORAGE_KEY);
    if (!rawValue) return {};
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function saveNewsReadState(items) {
  if (appStorage) {
    appStorage.set("newsReadState", items || {});
    return;
  }
  try {
    localStorage.setItem(NEWS_READ_STORAGE_KEY, JSON.stringify(items || {}));
  } catch (error) {
    // News read state is a local convenience feature.
  }
}

function isNewsItemRead(item) {
  const state = loadNewsReadState();
  const key = String(item?.id || item?.slug || "").trim();
  return Boolean(key && state[key]);
}

function markNewsItemRead(item) {
  const key = String(item?.id || item?.slug || "").trim();
  if (!key) return;
  const state = loadNewsReadState();
  if (state[key]) return;
  state[key] = Date.now();
  saveNewsReadState(state);
}

function isNewsRecordPublished(item) {
  const publishedAt = Date.parse(String(item?.published_at || ""));
  return !Number.isFinite(publishedAt) || publishedAt <= Date.now();
}

function isNewsRecordExpired(item) {
  const expiresAt = Date.parse(String(item?.expires_at || ""));
  return Number.isFinite(expiresAt) && expiresAt < Date.now();
}

function normalizeNewsImageUrl(value) {
  const sourceValue = String(value || "").trim();
  if (!sourceValue) return "";
  if (/^(?:https?:)?\/\//i.test(sourceValue)) return sourceValue;
  if (sourceValue.startsWith("/")) {
    if (sourceValue.startsWith("/news-content/") && window.location.pathname.startsWith("/top/")) {
      return `/top${sourceValue}`;
    }
    return sourceValue;
  }
  try {
    const resolved = new URL(sourceValue, newsFeedSourceUrl || window.location.href);
    if (resolved.origin === window.location.origin) {
      return `${resolved.pathname}${resolved.search}${resolved.hash}`;
    }
    return resolved.toString();
  } catch (error) {
    return sourceValue;
  }
}

function normalizeNewsItem(rawItem) {
  if (!rawItem || typeof rawItem !== "object") return null;
  const slug = String(rawItem.slug || rawItem.id || "").trim();
  const title = String(rawItem.title || "").trim();
  if (!slug || !title) return null;

  const body = Array.isArray(rawItem.body)
    ? rawItem.body.filter(Boolean).map(item => typeof item === "string" ? item.trim() : item)
    : typeof rawItem.body === "string"
      ? [rawItem.body.trim()]
      : [];
  const summary = String(rawItem.summary || "").trim() || body.find(item => typeof item === "string") || "";
  const thumbnailUrl = normalizeNewsImageUrl(rawItem.thumbnail_url || rawItem.image?.thumbnail || rawItem.cover_image_url || rawItem.image?.cover);
  const coverUrl = normalizeNewsImageUrl(rawItem.cover_image_url || rawItem.image?.cover || rawItem.thumbnail_url || rawItem.image?.thumbnail);
  const imageAlt = String(rawItem.image_alt || rawItem.image?.alt || title).trim();

  return {
    id: String(rawItem.id || slug).trim(),
    slug,
    title,
    summary,
    body,
    thumbnail_url: thumbnailUrl,
    cover_image_url: coverUrl,
    image_alt: imageAlt,
    published_at: String(rawItem.published_at || rawItem.date || "").trim(),
    expires_at: String(rawItem.expires_at || "").trim(),
    kind: String(rawItem.kind || "update").trim(),
    priority: Number(rawItem.priority) || 0,
    is_pinned: Boolean(rawItem.is_pinned)
  };
}

function getSortedNewsFeed(items = newsFeedData) {
  return [...items]
    .filter(Boolean)
    .filter(isNewsRecordPublished)
    .filter(item => !isNewsRecordExpired(item))
    .sort((a, b) => {
      if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) return a.is_pinned ? -1 : 1;
      if ((Number(a.priority) || 0) !== (Number(b.priority) || 0)) return (Number(b.priority) || 0) - (Number(a.priority) || 0);
      return Date.parse(String(b.published_at || "")) - Date.parse(String(a.published_at || ""));
    });
}

function getUnreadNewsCount(items = newsFeedData) {
  return getSortedNewsFeed(items).filter(item => !isNewsItemRead(item)).length;
}

async function loadNewsFeed() {
  let payload = null;
  const resolvedUrl = LOCAL_NEWS_DATA_URL;

  try {
    const rawPayload = await requestJson(resolvedUrl, { cache: "no-store", retries: 1 });
    const { normalizeNewsPayload } = await dataSchemaModulePromise;
    payload = normalizeNewsPayload(rawPayload);
  } catch (error) {
    payload = null;
  }

  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
      ? payload
      : [];

  newsFeedSourceUrl = resolvedUrl;
  newsFeedData = items
    .map(normalizeNewsItem)
    .filter(Boolean);
  return newsFeedData;
}

function renderNewsBodyBlocks(blocks) {
  const items = Array.isArray(blocks) ? blocks : [blocks];
  return items.map((block) => {
    if (typeof block === "string") {
      return `<p>${escapeHtml(block)}</p>`;
    }
    if (block && typeof block === "object" && block.type === "list" && Array.isArray(block.items)) {
      return `<ul>${block.items.map(item => `<li>${escapeHtml(String(item || ""))}</li>`).join("")}</ul>`;
    }
    if (block && typeof block === "object" && block.type === "link" && block.href) {
      const href = String(block.href || "").trim();
      const label = String(block.label || href).trim();
      return `<p><a class="news-inline-link" href="${escapeHtml(href)}">${escapeHtml(label)}</a></p>`;
    }
    return "";
  }).join("");
}

function renderNewsThumb(item, className = "") {
  const imageUrl = item?.thumbnail_url || item?.cover_image_url || "";
  const altText = String(item?.image_alt || item?.title || "").trim();
  if (imageUrl) {
    return `<img class="news-thumb${className ? ` ${escapeHtml(className)}` : ""}" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(altText)}" loading="lazy" />`;
  }
  return `<div class="news-thumb news-thumb-placeholder${className ? ` ${escapeHtml(className)}` : ""}" aria-hidden="true"><span>NEWS</span></div>`;
}

function renderNewsNotificationBilingualText(text, primaryClass, secondaryClass) {
  const value = String(text || "").trim();
  if (!value) return "";
  const parts = value.split(/\s+\/\s+/);
  if (parts.length < 2) {
    return `<span class="${escapeAttribute(primaryClass)}">${escapeHtml(value)}</span>`;
  }
  const [ruPart, ...restParts] = parts;
  const enPart = restParts.join(" / ").trim();
  return `
    <span class="news-bilingual-stack">
      <span class="${escapeAttribute(primaryClass)}">${escapeHtml(ruPart.trim())}</span>
      <span class="${escapeAttribute(secondaryClass)}">${escapeHtml(enPart)}</span>
    </span>
  `;
}

function renderNewsNotificationItem(item) {
  const href = getNewsArticleHref(item.slug);
  const unread = !isNewsItemRead(item);
  const publishedLabel = formatNewsDateTime(item.published_at);
  return `
    <a class="news-notification-card${unread ? " is-unread" : ""}" href="${escapeHtml(href)}" data-news-open-slug="${escapeHtml(item.slug)}">
      <span class="news-notification-copy">
        <span class="news-notification-meta">${escapeHtml(publishedLabel)}</span>
        ${renderNewsNotificationBilingualText(item.title, "news-notification-title", "news-notification-title-secondary")}
        ${renderNewsThumb(item, "news-notification-thumb")}
      </span>
    </a>
  `;
}

function renderNewsNotificationsModal() {
  const listEl = document.getElementById("news-notifications-list");
  if (!listEl) return;
  const items = getSortedNewsFeed(newsFeedData).slice(0, 6);
  listEl.innerHTML = items.length
    ? items.map(renderNewsNotificationItem).join("")
    : `<div class="empty-box">${escapeHtml(t("newsBellEmpty"))}</div>`;
}

function renderNewsBell() {
  const button = document.getElementById("news-bell-button");
  const badge = document.getElementById("news-bell-badge");
  const panel = document.getElementById("news-notifications-panel");
  if (!button || !badge) return;

  const unreadCount = getUnreadNewsCount(newsFeedData);
  button.classList.toggle("has-unread", unreadCount > 0);
  badge.hidden = unreadCount <= 0;
  badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
  button.setAttribute(
    "aria-label",
    unreadCount > 0
      ? replaceTokens(t("newsBellUnreadLabel"), { count: unreadCount })
      : t("newsBellAriaLabel")
  );
  if (panel) {
    button.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
  }
}

function bindNewsNotificationsModalLinks() {
  const listEl = document.getElementById("news-notifications-list");
  if (!listEl || listEl.dataset.bound === "true") return;

  listEl.addEventListener("click", (event) => {
    const link = event.target?.closest?.("[data-news-open-slug]");
    if (!link) return;
    const slug = String(link.dataset.newsOpenSlug || "").trim();
    const item = newsFeedData.find(entry => entry.slug === slug);
    if (item) markNewsItemRead(item);
    closeNewsNotificationsPopover();
    renderNewsBell();
    renderNewsNotificationsModal();
  });

  listEl.dataset.bound = "true";
}

function ensureNewsNavigationLink() {
  const navMenu = document.querySelector(".top-nav-menu");
  if (!navMenu || navMenu.querySelector("[data-news-nav-link='true'], [data-i18n='btnNews']")) return;

  const link = document.createElement("a");
  link.className = `top-nav-link top-nav-link-secondary${IS_NEWS_PAGE ? " is-current" : ""}`;
  link.href = getNewsListHref();
  link.dataset.i18n = "btnNews";
  link.dataset.navItem = "true";
  link.dataset.newsNavLink = "true";
  link.textContent = t("btnNews");

  const communityLink = navMenu.querySelector('[href="./community/"], [href="../community/"], [href="/community/"]');
  if (communityLink?.parentNode) {
    communityLink.parentNode.insertBefore(link, communityLink);
  } else {
    const moreEl = navMenu.querySelector(".top-nav-more");
    if (moreEl?.parentNode) {
      moreEl.parentNode.insertBefore(link, moreEl);
    } else {
      navMenu.appendChild(link);
    }
  }
}

function ensureNewsNotificationsUi() {
  ensureNewsNavigationLink();

  const actionsEl = document.querySelector(".top-nav-actions");
  if (actionsEl && !document.getElementById("news-bell-button")) {
    const wrapper = document.createElement("div");
    wrapper.className = "top-nav-news-bell";
    wrapper.innerHTML = `
      <button
        class="news-bell-btn"
        id="news-bell-button"
        type="button"
        aria-label="${escapeHtml(t("newsBellAriaLabel"))}"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="news-notifications-panel"
      >
        <span class="news-bell-icon" aria-hidden="true">&#128276;</span>
        <span class="news-bell-badge" id="news-bell-badge" hidden>0</span>
      </button>
      <div class="news-notifications-panel" id="news-notifications-panel" role="dialog" aria-modal="false" aria-labelledby="news-notifications-title" hidden>
        <div class="news-notifications-popover-head">
          <div>
            <h3 id="news-notifications-title" class="news-notifications-popover-title" data-i18n="newsModalTitle">${escapeHtml(t("newsModalTitle"))}</h3>
            <p class="news-notifications-popover-subtitle" data-i18n="newsModalSubtitle">${escapeHtml(t("newsModalSubtitle"))}</p>
          </div>
        </div>
        <div class="news-notifications-list" id="news-notifications-list"></div>
        <div class="news-notifications-footer">
          <a class="btn btn-last-races news-notifications-open-all" href="${escapeHtml(getNewsListHref())}" id="news-notifications-open-all" data-i18n="newsModalOpenAll">${escapeHtml(t("newsModalOpenAll"))}</a>
        </div>
      </div>
    `;
    actionsEl.insertBefore(wrapper, actionsEl.firstChild || null);
  }

  bindNewsNotificationsModalLinks();
}

function findNewsBySlug(slug) {
  const key = String(slug || "").trim();
  return newsFeedData.find(item => item.slug === key) || null;
}

function renderNewsListPage(items) {
  const listEl = document.getElementById("news-feed");
  const articleEl = document.getElementById("news-article");
  const titleEl = document.getElementById("news-page-title");
  const subtitleEl = document.getElementById("news-page-subtitle");
  if (!listEl || !articleEl || !titleEl || !subtitleEl) return;

  titleEl.textContent = t("newsPageTitle");
  subtitleEl.textContent = t("newsPageSubtitle");
  articleEl.hidden = true;
  listEl.hidden = false;
  listEl.innerHTML = items.length
    ? items.map(item => `
      <article class="news-feed-card">
        <a class="news-feed-card-link" href="${escapeHtml(getNewsArticleHref(item.slug))}" data-news-open-slug="${escapeHtml(item.slug)}">
          ${renderNewsThumb(item, "news-feed-thumb")}
          <div class="news-feed-copy">
            <time class="news-feed-date" datetime="${escapeAttribute(item.published_at || "")}">${escapeHtml(formatNewsDateTime(item.published_at))}</time>
            <h2 class="news-feed-title">${escapeHtml(item.title)}</h2>
            <p class="news-feed-summary">${escapeHtml(item.summary || "")}</p>
            <span class="news-feed-cta">${escapeHtml(t("newsReadMore"))}</span>
          </div>
        </a>
      </article>
    `).join("")
    : `<div class="empty-box">${escapeHtml(t("newsListEmpty"))}</div>`;
}

function renderNewsDetailPage(item) {
  const listEl = document.getElementById("news-feed");
  const articleEl = document.getElementById("news-article");
  const titleEl = document.getElementById("news-page-title");
  const subtitleEl = document.getElementById("news-page-subtitle");
  if (!listEl || !articleEl || !titleEl || !subtitleEl) return;

  markNewsItemRead(item);
  renderNewsBell();
  renderNewsNotificationsModal();

  titleEl.textContent = item.title;
  subtitleEl.textContent = formatNewsDateTime(item.published_at);
  listEl.hidden = true;
  articleEl.hidden = false;
  articleEl.innerHTML = `
    <a class="news-back-link" href="${escapeHtml(getNewsListHref())}">${escapeHtml(t("newsBackToList"))}</a>
    <article class="news-article-card">
      ${item.cover_image_url ? `
        <div class="news-article-cover-wrap">
          <img class="news-article-cover" src="${escapeHtml(item.cover_image_url)}" alt="${escapeHtml(item.image_alt || item.title)}" loading="lazy" />
        </div>
      ` : ""}
      <div class="news-article-body">
        ${renderNewsBodyBlocks(item.body)}
      </div>
    </article>
  `;
}

function renderMissingNewsPage() {
  const listEl = document.getElementById("news-feed");
  const articleEl = document.getElementById("news-article");
  const titleEl = document.getElementById("news-page-title");
  const subtitleEl = document.getElementById("news-page-subtitle");
  if (!listEl || !articleEl || !titleEl || !subtitleEl) return;

  titleEl.textContent = t("newsPageTitle");
  subtitleEl.textContent = "";
  listEl.hidden = true;
  articleEl.hidden = false;
  articleEl.innerHTML = `
    <a class="news-back-link" href="${escapeHtml(getNewsListHref())}">${escapeHtml(t("newsBackToList"))}</a>
    <div class="empty-box">${escapeHtml(t("newsArticleMissing"))}</div>
  `;
}

function bindNewsPageLinks() {
  const root = document.getElementById("news-feed");
  if (!root || root.dataset.bound === "true") return;
  root.addEventListener("click", (event) => {
    const link = event.target?.closest?.("[data-news-open-slug]");
    if (!link) return;
    const item = findNewsBySlug(link.dataset.newsOpenSlug);
    if (item) markNewsItemRead(item);
  });
  root.dataset.bound = "true";
}

function renderNewsPage() {
  const listEl = document.getElementById("news-feed");
  if (!listEl) return;
  const items = getSortedNewsFeed(newsFeedData);
  const slug = getRequestedNewsSlug();
  const item = slug ? findNewsBySlug(slug) : null;

  if (slug && item) {
    renderNewsDetailPage(item);
  } else if (slug) {
    renderMissingNewsPage();
  } else {
    renderNewsListPage(items);
  }

  bindNewsPageLinks();
}

function closeNewsNotificationsPopover() {
  const panel = document.getElementById("news-notifications-panel");
  const button = document.getElementById("news-bell-button");
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  button?.setAttribute("aria-expanded", "false");
}

function syncNewsNotificationsPopoverPosition() {
  const panel = document.getElementById("news-notifications-panel");
  const button = document.getElementById("news-bell-button");
  if (!panel || !button) return;

  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  if (viewportWidth > 640) {
    panel.style.removeProperty("--news-popover-top");
    panel.style.removeProperty("--news-popover-inset");
    return;
  }

  const rect = button.getBoundingClientRect();
  const inset = viewportWidth <= 420 ? 6 : 10;
  const top = Math.max(56, Math.round(rect.bottom + 10));
  panel.style.setProperty("--news-popover-top", `${top}px`);
  panel.style.setProperty("--news-popover-inset", `${inset}px`);
}

function openNewsNotificationsPopover() {
  const panel = document.getElementById("news-notifications-panel");
  const button = document.getElementById("news-bell-button");
  if (!panel || !button) return;
  renderNewsNotificationsModal();
  syncNewsNotificationsPopoverPosition();
  panel.hidden = false;
  button.setAttribute("aria-expanded", "true");
}

function toggleNewsNotificationsPopover() {
  const panel = document.getElementById("news-notifications-panel");
  if (!panel) return;
  if (panel.hidden) openNewsNotificationsPopover();
  else closeNewsNotificationsPopover();
}

function initNewsNotificationsModal() {
  if (newsModalController) return;
  const wrapper = document.querySelector(".top-nav-news-bell");
  const button = document.getElementById("news-bell-button");
  const panel = document.getElementById("news-notifications-panel");
  if (!wrapper || !button || !panel) return;

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleNewsNotificationsPopover();
  });

  panel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) closeNewsNotificationsPopover();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNewsNotificationsPopover();
  });

  window.addEventListener("resize", () => {
    if (!panel.hidden) syncNewsNotificationsPopoverPosition();
  });

  newsModalController = {
    open: openNewsNotificationsPopover,
    close: closeNewsNotificationsPopover
  };
}

function getBestLapClass(isHighlighted) {
  return isHighlighted ? "best-lap-value" : "";
}

function getFastestLapMs(items = [], key = "best_lap_ms") {
  const values = items
    .map(item => item?.[key])
    .filter(value => typeof value === "number" && value > 0);
  return values.length ? Math.min(...values) : null;
}

async function loadJson(url, { signal = null, force = false } = {}) {
  await initializeQueryRuntime();
  const key = `json:${String(url)}`;
  return jsonQueryCache.query(key, () => requestJson(url, { cache: "default", retries: 1, signal }), { ttlMs: 15000, force });
}

function topDataV2Path(path) {
  return `${TOP_DATA_V2_BASE_URL}/${String(path || "").replace(/^\/+/, "")}`;
}

function withTopDataV2Version(url) {
  if (!topDataV2Version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(topDataV2Version)}`;
}

async function loadTopDataV2Manifest() {
  if (topDataV2Manifest) return topDataV2Manifest;

  const url = `${topDataV2ManifestUrl}?t=${Date.now()}`;
  const manifestPayload = await requestJson(url, { cache: "no-store", retries: 1 });
  const { normalizeManifest } = await dataSchemaModulePromise;
  const manifest = normalizeManifest(manifestPayload);
  topDataV2Manifest = manifest && typeof manifest === "object" ? manifest : null;
  topDataV2Version = String(topDataV2Manifest?.version || topDataV2Manifest?.generated_at || "");
  return topDataV2Manifest;
}

async function loadTopDataV2Json(path) {
  await loadTopDataV2Manifest();
  return loadJson(withTopDataV2Version(topDataV2Path(path)));
}

async function loadSiteDataV2() {
  const manifest = await loadTopDataV2Manifest();
  const homePath = manifest?.home || "home.json";
  const rawData = await loadTopDataV2Json(homePath);
  const { normalizeHomePayload } = await dataSchemaModulePromise;
  const data = normalizeHomePayload(rawData);
  const normalized = normalizeSnapshotPayload(data);
  const bestlapsMeta = data?.tables?.bestlaps || manifest?.tables?.bestlaps || {};
  const [tracksPayload, leadersPayload] = await Promise.all([
    bestlapsMeta.tracks ? loadTopDataV2Json(bestlapsMeta.tracks).catch(() => null) : Promise.resolve(null),
    bestlapsMeta.track_leaders ? loadTopDataV2Json(bestlapsMeta.track_leaders).catch(() => null) : Promise.resolve(null)
  ]);
  normalized.bestlapTracks = Array.isArray(tracksPayload?.items) ? tracksPayload.items : [];
  normalized.bestlapTrackLeaders = Array.isArray(leadersPayload?.items) ? leadersPayload.items : [];
  bestlapsTrackFilter = String(bestlapsMeta.default_track || tracksPayload?.default_track || bestlapsTrackFilter || "monza").trim().toLowerCase();
  if (TOP_API_BASE_URL) {
    const [leaderboardPageData, bestlapsPageData] = await Promise.all([
      loadServerPagedTopDataV2Table("leaderboard", 1).catch(() => null),
      loadServerPagedTopDataV2Table("bestlaps", 1).catch(() => null)
    ]);
    if (leaderboardPageData?.items) normalized.leaderboard = leaderboardPageData.items;
    if (bestlapsPageData?.items) normalized.bestlaps = bestlapsPageData.items;
  } else if (!normalized.leaderboard.length || !normalized.bestlaps.length) {
    const [leaderboardPreview, bestlapsPreview] = await Promise.all([
      normalized.leaderboard.length ? Promise.resolve(null) : loadTopDataV2TablePreview("leaderboard").catch(() => null),
      normalized.bestlaps.length ? Promise.resolve(null) : loadTopDataV2TablePreview("bestlaps").catch(() => null)
    ]);
    if (leaderboardPreview?.length) normalized.leaderboard = leaderboardPreview;
    if (bestlapsPreview?.length) normalized.bestlaps = bestlapsPreview;
  }
  return normalized;
}

function getTopDataV2TableMeta(tableName) {
  const homeMeta = topDataV2TableMeta?.[tableName];
  const manifestMeta = topDataV2Manifest?.tables?.[tableName];
  return homeMeta || manifestMeta || null;
}

function getTopDataV2TableData(tableName) {
  if (tableName === "leaderboard") return leaderboardData;
  if (tableName === "bestlaps") return bestlapsData;
  if (tableName === "safety") return safetyData;
  return [];
}

function setTopDataV2TableData(tableName, items) {
  if (tableName === "leaderboard") {
    leaderboardData = items;
  } else if (tableName === "bestlaps") {
    bestlapsData = items;
  } else if (tableName === "safety") {
    safetyData = items;
  }
}

function isTopDataV2TablePreview(tableName) {
  const meta = getTopDataV2TableMeta(tableName);
  if (!meta) return false;
  const totalItems = Number(meta.total_items) || 0;
  return totalItems > getTopDataV2TableData(tableName).length;
}

async function loadFullTopDataV2Table(tableName) {
  const useTrackFile = tableName === "bestlaps" && bestlapsTrackFilter && !TOP_API_BASE_URL;
  if (!useTrackFile && !isTopDataV2TablePreview(tableName)) {
    return getTopDataV2TableData(tableName);
  }

  const promiseKey = useTrackFile ? `${tableName}:${bestlapsTrackFilter}` : tableName;
  if (topDataV2TableLoadPromises.has(promiseKey)) {
    return topDataV2TableLoadPromises.get(promiseKey);
  }

  const promise = (async () => {
    const meta = getTopDataV2TableMeta(tableName);
    const trackSafe = String(bestlapsTrackFilter || "").replace(/[^a-z0-9_-]+/g, "");
    const fullPath = useTrackFile ? `tables/bestlaps-${trackSafe}.json` : meta?.full || `tables/${tableName}.json`;
    const payload = await loadTopDataV2Json(fullPath);
    if (tableName === "bestlaps") {
      bestlapTracksData = Array.isArray(payload?.tracks) ? payload.tracks : bestlapTracksData;
      if (payload?.selected_track) bestlapsTrackFilter = String(payload.selected_track).trim().toLowerCase();
    }
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
        ? payload.items
        : [];
    const hydratedItems = hydrateTableTrendFields(items, tableName);
    setTopDataV2TableData(tableName, hydratedItems);
    return hydratedItems;
  })().finally(() => {
    topDataV2TableLoadPromises.delete(promiseKey);
  });

  topDataV2TableLoadPromises.set(promiseKey, promise);
  return promise;
}

async function loadTopDataV2TablePreview(tableName, limit = PAGE_SIZE) {
  await loadTopDataV2Manifest();
  if (isServerPagedTopDataV2Table(tableName)) {
    const pageData = await loadServerPagedTopDataV2Table(tableName, 1).catch(() => null);
    if (pageData?.items?.length) return pageData.items;
  }
  const meta = getTopDataV2TableMeta(tableName);
  const payload = await loadTopDataV2Json(meta?.full || `tables/${tableName}.json`);
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : [];
  return hydrateTableTrendFields(items.slice(0, limit), tableName);
}

function isServerPagedTopDataV2Table(tableName) {
  if (tableName !== "leaderboard" && tableName !== "bestlaps") return false;
  const sortState = getServerPagedTableSort(tableName);
  if (sortState?.key === "elo") return false;
  if (TOP_API_BASE_URL) return true;
  const meta = getTopDataV2TableMeta(tableName);
  return Boolean(meta?.page_path && !getServerPagedTableSearch(tableName) && !sortState?.key);
}

function getServerPagedTableSearch(tableName) {
  if (tableName === "leaderboard") return leaderboardSearch;
  if (tableName === "bestlaps") return bestlapsSearch;
  return "";
}

function getServerPagedTableSort(tableName) {
  if (tableName === "leaderboard") return leaderboardSort;
  if (tableName === "bestlaps") return bestlapsSort;
  return { key: null, direction: null };
}

function getServerPagedTableSignature(tableName, page) {
  const sortState = getServerPagedTableSort(tableName);
  return JSON.stringify({
    tableName,
    page,
    search: getServerPagedTableSearch(tableName) || "",
    track: tableName === "bestlaps" ? bestlapsTrackFilter || "" : "",
    sort: sortState?.key || "",
    direction: sortState?.direction || ""
  });
}

function getServerPagedTableResult(tableName, page) {
  const state = topDataV2PagedTables[tableName];
  if (!state || state.signature !== getServerPagedTableSignature(tableName, page)) return null;
  return state.result;
}

async function loadServerPagedTopDataV2Table(tableName, page) {
  if (!isServerPagedTopDataV2Table(tableName)) return null;
  await loadTopDataV2Manifest();
  const meta = getTopDataV2TableMeta(tableName);
  const useTrackFile = tableName === "bestlaps" && bestlapsTrackFilter && !TOP_API_BASE_URL;
  const trackSafe = String(bestlapsTrackFilter || "").replace(/[^a-z0-9_-]+/g, "");
  const pagePath = useTrackFile
    ? `tables/bestlaps-${trackSafe}/page-${page}.json`
    : meta?.page_path
      ? String(meta.page_path).replace("{page}", String(page))
      : null;
  const url = new URL(topDataV2Path(pagePath || meta?.full || `tables/${tableName}.json`), window.location.href);
  const sortState = getServerPagedTableSort(tableName);
  const search = getServerPagedTableSearch(tableName);
  if (TOP_API_BASE_URL) {
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(PAGE_SIZE));
    if (search) url.searchParams.set("search", search);
    if (tableName === "bestlaps" && bestlapsTrackFilter) url.searchParams.set("track", bestlapsTrackFilter);
    if (sortState?.key) {
      url.searchParams.set("sort", sortState.key);
      url.searchParams.set("direction", sortState.direction || "asc");
    }
  }
  if (topDataV2Version) url.searchParams.set("v", topDataV2Version);

  await initializeQueryRuntime();
  tableRequestControllers.get(tableName)?.abort();
  const requestController = new AbortController();
  tableRequestControllers.set(tableName, requestController);
  const requestToken = tableRequestGuard.next(tableName);
  let rawPayload;
  try {
    rawPayload = await loadJson(url.toString(), { signal: requestController.signal });
  } finally {
    if (tableRequestControllers.get(tableName) === requestController) tableRequestControllers.delete(tableName);
  }
  if (!tableRequestGuard.isCurrent(requestToken)) return getServerPagedTableResult(tableName, page);
  const { normalizePagedTablePayload } = await dataSchemaModulePromise;
  const payload = normalizePagedTablePayload(rawPayload, tableName, page, PAGE_SIZE);
  if (tableName === "bestlaps") {
    bestlapTracksData = Array.isArray(payload?.tracks) ? payload.tracks : bestlapTracksData;
    if (payload?.selected_track) bestlapsTrackFilter = String(payload.selected_track).trim().toLowerCase();
  }
  const items = hydrateTableTrendFields(Array.isArray(payload?.items) ? payload.items : [], tableName);
  const totalItems = Number(payload?.total_items) || items.length;
  const pageSize = Number(payload?.page_size) || PAGE_SIZE;
  const safePage = Number(payload?.page) || page;
  const result = {
    items,
    page: safePage,
    totalPages: Number(payload?.total_pages) || Math.max(1, Math.ceil(totalItems / pageSize)),
    totalItems,
    startIndex: totalItems ? ((safePage - 1) * pageSize) + 1 : 0,
    endIndex: Math.min(safePage * pageSize, totalItems)
  };
  topDataV2PagedTables[tableName] = {
    signature: getServerPagedTableSignature(tableName, safePage),
    result
  };
  return result;
}

async function ensureServerPagedTopDataV2Table(tableName, page) {
  if (!isServerPagedTopDataV2Table(tableName)) return null;
  return getServerPagedTableResult(tableName, page) || loadServerPagedTopDataV2Table(tableName, page);
}

function debounce(fn, wait = 180) {
  let timeoutId = null;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), wait);
  };
}

function hydrateTableTrendFields(items, tableName) {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    if (!item || typeof item !== "object") return item;

    const latestChanges = item.latest_changes && typeof item.latest_changes === "object"
      ? item.latest_changes
      : null;

    if (!latestChanges) return item;

    const next = { ...item };

    if (tableName === "leaderboard" && !next.rank_change && latestChanges.championship_rank) {
      next.rank_change = latestChanges.championship_rank;
    }

    if (tableName === "bestlaps" && !next.rank_change && latestChanges.bestlap_rank) {
      next.rank_change = latestChanges.bestlap_rank;
    }

    return next;
  });
}

function normalizeSnapshotPayload(snapshot) {
  return {
    leaderboard: hydrateTableTrendFields(
      Array.isArray(snapshot?.leaderboard) ? snapshot.leaderboard : [],
      "leaderboard"
    ),
    bestlaps: hydrateTableTrendFields(
      Array.isArray(snapshot?.bestlaps) ? snapshot.bestlaps : [],
      "bestlaps"
    ),
    globalStats: snapshot?.global_stats && typeof snapshot.global_stats === "object" ? snapshot.global_stats : null,
    safety: Array.isArray(snapshot?.safety) ? snapshot.safety : [],
    driverOfDay: snapshot?.driver_of_the_day && typeof snapshot.driver_of_the_day === "object" ? snapshot.driver_of_the_day : null,
    serverStatus: snapshot?.server_status && typeof snapshot.server_status === "object" ? snapshot.server_status : null,
    online: Array.isArray(snapshot?.online) ? snapshot.online : [],
    raceActivity: Array.isArray(snapshot?.race_activity) ? snapshot.race_activity : null,
    latestHourlyRace: snapshot?.latest_hourly_race && typeof snapshot.latest_hourly_race === "object" ? snapshot.latest_hourly_race : null,
    racesSummary: snapshot?.races_summary && typeof snapshot.races_summary === "object" ? snapshot.races_summary : null,
    tables: snapshot?.tables && typeof snapshot.tables === "object" ? snapshot.tables : null,
    bestlapTracks: [],
    bestlapTrackLeaders: []
  };
}

async function loadStandaloneServerStatus() {
  try {
    const data = await loadJson(serverStatusUrl);
    const { normalizeServerStatus } = await dataSchemaModulePromise;
    return normalizeServerStatus(data);
  } catch (_error) {
    return null;
  }
}

function mergeStandaloneServerStatus(data, standaloneStatus) {
  if (!standaloneStatus || typeof standaloneStatus !== "object") {
    return data;
  }

  return {
    ...data,
    serverStatus: standaloneStatus,
  };
}

async function loadSiteData() {
  const [data, standaloneStatus] = await Promise.all([
    loadSiteDataV2(),
    loadStandaloneServerStatus()
  ]);
  return mergeStandaloneServerStatus(data, standaloneStatus);
}

async function loadHourlyAnnouncementData() {
  try {
    const data = await loadJson(hourlyAnnouncementUrl);
    const { normalizeHourlyAnnouncement } = await dataSchemaModulePromise;
    return normalizeHourlyAnnouncement(data);
  } catch (error) {
    console.warn("hourly announcement is unavailable.", error);
    return null;
  }
}

async function loadHourlyScheduleData() {
  try {
    const data = await loadJson(hourlyScheduleUrl);
    return data && typeof data === "object" ? data : null;
  } catch (error) {
    console.warn("hourly schedule is unavailable.", error);
    return null;
  }
}

function mergeHourlyAnnouncementWithSchedule(announcement, schedule) {
  const items = Array.isArray(schedule?.items) ? schedule.items : [];
  if (!announcement || !items.length) return announcement;
  const match = items.find(item =>
    item?.event_id === announcement.event_id ||
    (item?.date === announcement.date && item?.start_time_local === announcement.start_time_local)
  );
  return match ? { ...match, ...announcement, event_type: announcement.event_type || match.event_type, voting_disabled: announcement.voting_disabled ?? match.voting_disabled } : announcement;
}

async function loadRacesData() {
  return await loadRacesPageData(1);
}

function isHourlyChampionshipEvent(data = hourlyAnnouncementData) {
  return String(data?.event_type || data?.type || "").trim().toLowerCase() === "championship";
}

function getActiveChampionshipTitle(data = hourlyAnnouncementData) {
  return data?.championship_title || data?.championship?.title || t("btnChampionshipEvent");
}

function updateTopChampionshipLink() {
  const link = document.getElementById("top-nav-championship-link");
  if (!link) return;
  link.textContent = getActiveChampionshipTitle();
  link.href = "/hourly/championship/";
}

async function loadFullRacesData() {
  const payload = await loadTopDataV2Json("races/fun-stats.json");
  racesArchiveMeta = null;
  racesArchiveSummary = null;
  return Array.isArray(payload?.items) ? payload.items : [];
}

async function loadFunStatsData() {
  const payload = await loadTopDataV2Json("fun-stats.json");
  return payload && typeof payload === "object" ? payload : null;
}

async function loadRacesPageData(page = 1) {
  const manifest = await loadTopDataV2Manifest();
  const pagePathTemplate = manifest?.races?.page_path || "races/page-{page}.json";
  const pagePath = pagePathTemplate.replace("{page}", String(page));
  const summaryPath = manifest?.races?.summary || "races/summary.json";
  const [payload, summaryPayload] = await Promise.all([
    loadTopDataV2Json(pagePath),
    loadTopDataV2Json(summaryPath).catch(() => null)
  ]);

  racesArchiveMeta = payload && typeof payload === "object" ? payload : null;
  racesArchiveSummary =
    summaryPayload?.summary && typeof summaryPayload.summary === "object"
      ? summaryPayload.summary
      : racesArchiveMeta?.summary && typeof racesArchiveMeta.summary === "object"
        ? racesArchiveMeta.summary
        : null;

  return Array.isArray(racesArchiveMeta?.items) ? racesArchiveMeta.items : [];
}

function buildRaceDetailsPath(raceId) {
  const normalizedRaceId = String(raceId || "unknown")
    .trim()
    .toLowerCase()
    .replace(/\.json$/i, "")
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "") || "unknown";
  const filename = `${normalizedRaceId}.json`;
  return `races/details/${filename}`;
}

function normalizeRaceIdentity(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^.*[\\/]/, "")
    .replace(/\.json$/i, "");
}

function getRaceIdentityCandidates(race) {
  const candidates = new Set();
  [race?.race_id, race?.source_file, race?.details_path].forEach((value) => {
    const normalized = normalizeRaceIdentity(value);
    if (normalized) candidates.add(normalized);
  });
  return candidates;
}

function mergeRaceDetails(race, details) {
  const merged = {
    ...(race && typeof race === "object" ? race : {}),
    ...(details && typeof details === "object" ? details : {}),
    _detailsLoading: false,
    _detailsError: false,
  };

  if (Array.isArray(details?.results)) {
    merged.results = details.results;
  }

  return merged;
}

async function loadRaceDetailsCached(race) {
  if (!race) return null;
  if (Array.isArray(race.results) && race.results.length) return race;

  const raceId = race.race_id || race.source_file;
  if (!raceId) return race;

  if (raceDetailsCache.has(raceId)) {
    return raceDetailsCache.get(raceId);
  }

  const fallbackDetailsPath = buildRaceDetailsPath(raceId);
  const detailsPaths = [race.details_path, fallbackDetailsPath].filter(Boolean)
    .filter((path, index, list) => list.indexOf(path) === index);
  const promise = (async () => {
    let lastError = null;
    for (const detailsPath of detailsPaths) {
      try {
        const details = await loadTopDataV2Json(detailsPath);
        return details && typeof details === "object" ? mergeRaceDetails(race, details) : race;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Failed to load race details.");
  })().catch(error => {
    raceDetailsCache.delete(raceId);
    throw error;
  });

  raceDetailsCache.set(raceId, promise);
  return promise;
}

async function loadCarsData() {
  const data = await loadTopDataV2Json("cars/cars.json");
  return Array.isArray(data) ? data : [];
}

function getRequestedDriverId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function loadDriverProfile(publicId) {
  if (!publicId) return null;
  const data = await loadTopDataV2Json(`drivers/${encodeURIComponent(publicId)}.json`);
  const { normalizeDriverProfile } = await dataSchemaModulePromise;
  return normalizeDriverProfile(data);
}

async function loadDriverProfileCached(publicId) {
  if (!publicId) return null;
  if (!driverProfileCache.has(publicId)) {
    driverProfileCache.set(
      publicId,
      loadDriverProfile(publicId).catch((error) => {
        driverProfileCache.delete(publicId);
        throw error;
      })
    );
  }
  return driverProfileCache.get(publicId);
}

async function loadDriverIndex() {
  const data = await loadTopDataV2Json("drivers/drivers.json");
  return Array.isArray(data) ? data : [];
}

async function loadBansData() {
  const payload = await requestJson(TOP_BANS_DATA_URL, { cache: "no-store", retries: 1 });
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items
    .map((item) => ({
      name: String(item?.name || "").trim(),
      banned_at: String(item?.banned_at || "").trim()
    }))
    .filter((item) => item.name)
    .sort((a, b) => {
      const timeA = a.banned_at ? Date.parse(a.banned_at) : 0;
      const timeB = b.banned_at ? Date.parse(b.banned_at) : 0;
      return timeB - timeA;
    });
}

function applyStaticTranslations() {
  document.documentElement.lang = t("htmlLang");
  document.title = IS_DRIVER_PAGE
    ? t("pageTitleDriver")
    : IS_CARS_PAGE
      ? t("pageTitleCars")
      : IS_FUN_STATS_PAGE
        ? t("pageTitleFunStats")
        : IS_COMMUNITY_PAGE
          ? t("pageTitleCommunity")
          : IS_NEWS_PAGE
            ? t("pageTitleNews")
            : IS_BANS_PAGE
              ? t("pageTitleBans")
            : IS_RACES_PAGE
            ? t("pageTitleRaces")
            : t("pageTitle");

  const descriptionMeta = document.querySelector('meta[name="description"]');
  const ogDescriptionMeta = document.querySelector('meta[property="og:description"]');
  const twitterDescriptionMeta = document.querySelector('meta[name="twitter:description"]');
  const ogLocaleMeta = document.querySelector('meta[property="og:locale"]');
  const descriptionKey = IS_DRIVER_PAGE
    ? "metaDescriptionDriver"
    : IS_CARS_PAGE
      ? "metaDescriptionCars"
      : IS_FUN_STATS_PAGE
        ? "metaDescriptionFunStats"
        : IS_COMMUNITY_PAGE
          ? "metaDescriptionCommunity"
          : IS_NEWS_PAGE
            ? "metaDescriptionNews"
            : IS_BANS_PAGE
              ? "metaDescriptionBans"
            : IS_RACES_PAGE
            ? "metaDescriptionRaces"
            : "metaDescription";
  const ogDescriptionKey = IS_DRIVER_PAGE
    ? "ogDescriptionDriver"
    : IS_CARS_PAGE
      ? "ogDescriptionCars"
      : IS_FUN_STATS_PAGE
        ? "ogDescriptionFunStats"
        : IS_COMMUNITY_PAGE
          ? "ogDescriptionCommunity"
          : IS_NEWS_PAGE
            ? "ogDescriptionNews"
            : IS_BANS_PAGE
              ? "ogDescriptionBans"
            : IS_RACES_PAGE
            ? "ogDescriptionRaces"
            : "ogDescription";
  const twitterDescriptionKey = IS_DRIVER_PAGE
    ? "twitterDescriptionDriver"
    : IS_CARS_PAGE
      ? "twitterDescriptionCars"
      : IS_FUN_STATS_PAGE
        ? "twitterDescriptionFunStats"
        : IS_COMMUNITY_PAGE
          ? "twitterDescriptionCommunity"
          : IS_NEWS_PAGE
            ? "twitterDescriptionNews"
            : IS_BANS_PAGE
              ? "twitterDescriptionBans"
            : IS_RACES_PAGE
            ? "twitterDescriptionRaces"
            : "twitterDescription";

  if (descriptionMeta) {
    descriptionMeta.setAttribute("content", t(descriptionKey));
  }
  if (ogDescriptionMeta) {
    ogDescriptionMeta.setAttribute("content", t(ogDescriptionKey));
  }
  if (twitterDescriptionMeta) {
    twitterDescriptionMeta.setAttribute("content", t(twitterDescriptionKey));
  }
  if (ogLocaleMeta) {
    ogLocaleMeta.setAttribute("content", t("ogLocale"));
  }

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    const value = t(key);
    if (value !== undefined) el.innerHTML = value;
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach(el => {
    const key = el.dataset.i18nAriaLabel;
    const value = t(key);
    if (value !== undefined) el.setAttribute("aria-label", value);
  });

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
    btn.setAttribute("aria-pressed", btn.dataset.lang === currentLang ? "true" : "false");
  });

  const leaderboardInput = document.getElementById("leaderboard-search");
  const bestlapsInput = document.getElementById("bestlaps-search");
  const safetyInput = document.getElementById("safety-search");
  const racesInput = document.getElementById("races-search");
  const carsInput = document.getElementById("cars-search");

  if (leaderboardInput) leaderboardInput.placeholder = t("leaderboardSearchPlaceholder");
  if (bestlapsInput) bestlapsInput.placeholder = t("bestlapsSearchPlaceholder");
  if (safetyInput) safetyInput.placeholder = t("safetySearchPlaceholder");
  if (racesInput) racesInput.placeholder = t("racesSearchPlaceholder");
  if (carsInput) carsInput.placeholder = t("carsSearchPlaceholder");

  const bestLapNoteEl = document.getElementById("best-lap-note");
  applyBestlapTracksButtonText();
  if (bestlapsData.length > 0 && bestLapNoteEl) {
    updateBestLapNote(bestlapsData[0].driver, bestlapsData[0].track, bestlapsData[0].car_name);
  } else if (bestLapNoteEl) {
    bestLapNoteEl.textContent = t("bestLapNoteFallback");
  }

  updateDriverOfDayButtonLabel();
  renderTwitchWidget();
  renderTopGuide();
  renderBackgroundVideoSoundToggle();
  document.getElementById("top-nav-more")?.rebuildOverflowMenu?.();
}

function getDriverOfDayName() {
  return driverOfDayData?.driver || "-";
}

function updateDriverOfDayButtonLabel() {
  const btn = document.getElementById("driver-of-day-btn");
  if (!btn) return;

  const labelTemplate = t("driverOfDayBtn");
  const driverName = getDriverOfDayName();
  const fallbackLabel = replaceTokens(labelTemplate, { driver: "" }).replace(/[:\s-]+$/u, "").trim();
  const label = fallbackLabel || (currentLang === "ru" ? "Пилот дня" : "Driver of the day");

  btn.innerHTML = `
    <span class="driver-day-btn-label">${escapeHtml(label)}</span>
    <span class="driver-day-btn-name">${escapeHtml(driverName)}</span>
  `;
}

function formatAverageFinish(value) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

function formatPercent(value) {
  return typeof value === "number" ? `${value.toFixed(2)}%` : "—";
}

function getFocusableElements(container) {
  if (!container) return [];
  return [...container.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter(el => !el.hasAttribute("hidden") && el.getAttribute("aria-hidden") !== "true");
}

function createModalController({ modalId, closeButtonId, openButtonId, onOpen, onClose }) {
  const modal = document.getElementById(modalId);
  const closeBtn = document.getElementById(closeButtonId);
  const openBtn = openButtonId ? document.getElementById(openButtonId) : null;
  if (!modal || !closeBtn) return null;

  let lastFocusedElement = null;

  const close = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (typeof onClose === "function") onClose();
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  };

  const open = (trigger = null) => {
    lastFocusedElement = trigger || document.activeElement;
    if (typeof onOpen === "function") onOpen();
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    window.requestAnimationFrame(() => {
      const [firstFocusable] = getFocusableElements(modal);
      (firstFocusable || closeBtn).focus();
    });
  };

  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = getFocusableElements(modal);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  if (openBtn) {
    openBtn.addEventListener("click", () => open(openBtn));
  }

  return { modal, open, close };
}

function shouldIgnoreDriverPreviewTrigger(target) {
  return Boolean(target?.closest("a, button, input, select, textarea, summary"));
}

function getDriverPreviewTriggerRow(target, tableRoot) {
  const row = target?.closest?.("tr[data-driver-preview='true']");
  if (!row || (tableRoot && !tableRoot.contains(row))) return null;
  return row;
}

function openDriverPreviewFromRowElement(rowEl, trigger) {
  const publicId = rowEl?.dataset?.publicId || null;
  const playerId = rowEl?.dataset?.playerId || null;
  const driver = rowEl?.dataset?.driverName || "-";
  if (!publicId || !driverPreviewModalController) return;

  driverPreviewState = {
    publicId,
    playerId,
    driver,
    href: getDriverProfileHref(publicId, playerId),
    loading: true,
    error: false,
    profile: null
  };

  driverPreviewModalController.open(trigger || rowEl);
  renderDriverPreviewModal();

  loadDriverProfileCached(publicId)
    .then((profile) => {
      if (!driverPreviewState || driverPreviewState.publicId !== publicId) return;
      driverPreviewState = {
        ...driverPreviewState,
        loading: false,
        error: !profile,
        profile: profile || null,
      };
      renderDriverPreviewModal();
    })
    .catch(() => {
      if (!driverPreviewState || driverPreviewState.publicId !== publicId) return;
      driverPreviewState = {
        ...driverPreviewState,
        loading: false,
        error: true,
        profile: null,
      };
      renderDriverPreviewModal();
    });
}

function bindDriverPreviewTableInteractions(tableRoot) {
  if (!tableRoot || tableRoot.dataset.driverPreviewBound === "true") return;

  tableRoot.addEventListener("click", (event) => {
    if (shouldIgnoreDriverPreviewTrigger(event.target)) return;
    const row = getDriverPreviewTriggerRow(event.target, tableRoot);
    if (!row) return;
    openDriverPreviewFromRowElement(row, row);
  });

  tableRoot.addEventListener("keydown", (event) => {
    const row = getDriverPreviewTriggerRow(event.target, tableRoot);
    if (!row) return;
    if (shouldIgnoreDriverPreviewTrigger(event.target)) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openDriverPreviewFromRowElement(row, row);
  });

  tableRoot.dataset.driverPreviewBound = "true";
}

function applyRevealAnimations() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const targets = document.querySelectorAll(
    ".hero-card, .pilot-card, .mini-stat, .driver-stat-card, .driver-highlight-card, .race-summary-card, .fun-summary-card, .fun-award-card, .fun-list-card"
  );

  if (!("IntersectionObserver" in window)) {
    targets.forEach(el => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14 });

  targets.forEach((el, index) => {
    if (el.classList.contains("is-visible")) return;
    el.classList.add("reveal-ready");
    el.style.setProperty("--reveal-delay", `${Math.min(index * 20, 180)}ms`);
    observer.observe(el);
  });
}

function formatPositionsDelta(value) {
  if (typeof value !== "number") return "-";
  if (value > 0) return `+${value}`;
  return String(value);
}

function formatStartPosition(row) {
  if (typeof row?.start_position === "number") return String(row.start_position);
  return "-";
}

function renderPositionsDelta(value) {
  const formatted = formatPositionsDelta(value);
  let cls = "delta-neutral";
  if (typeof value === "number" && value > 0) cls = "delta-positive";
  if (typeof value === "number" && value < 0) cls = "delta-negative";
  return `<span class="positions-delta ${cls}">${escapeHtml(formatted)}</span>`;
}

function formatTrendNumber(value, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const rounded = Number(value.toFixed(digits));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits).replace(/\.?0+$/, "");
}

function formatTrendDelta(change, metric) {
  const delta = Math.abs(change?.delta ?? NaN);
  if (!Number.isFinite(delta) || delta === 0) return "";

  if (metric === "best_lap_ms" || metric === "average_pace_ms") {
    return delta >= 1000
      ? `${formatTrendNumber(delta / 1000, 3)}s`
      : `${formatTrendNumber(delta, 0)}ms`;
  }

  if (metric === "average_finish" || metric === "average_positions_delta") {
    return formatTrendNumber(delta, 2);
  }

  return formatTrendNumber(delta, 0);
}

function formatTrendTitleValue(metric, value) {
  if (value == null) return "-";
  if ((metric === "best_lap_ms" || metric === "average_pace_ms") && typeof value === "number") {
    return formatLapTimeFromMs(value) || String(value);
  }
  if (typeof value === "number") {
    return formatTrendNumber(value, 2);
  }
  return String(value);
}

function renderTrendBadge(change, metric, { compact = false } = {}) {
  if (!change || !change.trend || change.trend === "same") return "";

  const trendClass = change.trend === "up" ? "trend-up" : "trend-down";
  const arrow = change.trend === "up" ? "&#9650;" : "&#9660;";
  const deltaLabel = formatTrendDelta(change, metric);
  const beforeText = formatTrendTitleValue(metric, change.before);
  const afterText = formatTrendTitleValue(metric, change.after);
  const title = `${beforeText} -> ${afterText}`;

  return `
    <span class="trend-badge ${compact ? "trend-badge-compact" : ""} ${trendClass}" title="${escapeAttribute(title)}" aria-label="${escapeAttribute(title)}">
      <span class="trend-arrow">${arrow}</span>
      ${deltaLabel ? `<span class="trend-value">${escapeHtml(deltaLabel)}</span>` : ""}
    </span>
  `;
}

function renderRankBadgeWithTrend(rank, change, { showHash = true } = {}) {
  return `
    <span class="rank-badge-wrap">
      <span class="rank-badge rank-${escapeHtml(rank)}">${showHash ? "#" : ""}${escapeHtml(rank)}</span>
      ${renderTrendBadge(change, "championship_rank", { compact: true })}
    </span>
  `;
}

function renderEloCell(row) {
  return renderEloBadge(row, { compact: true }) || `<span class="empty-inline">-</span>`;
}

function getEloDeltaValue(row) {
  const candidates = [
    row?.elo_rating_delta,
    row?.elo_delta,
    row?.rating_delta,
    row?.ratingDelta,
    row?.elo_change,
    row?.eloChange,
    row?.elo?.rating_delta,
    row?.elo?.delta,
    row?.summary?.elo_rating_delta,
    row?.summary?.rating_delta,
    row?.changes?.elo?.delta,
    row?.latest_changes?.elo?.delta,
  ];

  for (const candidate of candidates) {
    const value = typeof candidate === "object" && candidate !== null
      ? candidate.delta ?? candidate.rating_delta ?? candidate.value
      : candidate;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }

  return NaN;
}

function renderEloDeltaCell(row) {
  const delta = getEloDeltaValue(row);
  if (!Number.isFinite(delta) || delta === 0) return `<span class="empty-inline">-</span>`;
  const cls = delta > 0 ? "delta-positive" : "delta-negative";
  return `<span class="positions-delta ${cls}">${escapeHtml(`${delta > 0 ? "+" : ""}${Math.round(delta)}`)}</span>`;
}

function getFilteredEloHistory(info, periodDays = "all", periodOffset = 0) {
  const history = Array.isArray(info?.history) ? info.history : [];
  if (!history.length || periodDays === "all") return history;
  const days = Number(periodDays);
  if (!Number.isFinite(days)) return history;
  const dated = history.filter(item => item.date instanceof Date && !Number.isNaN(item.date.getTime()));
  if (!dated.length) return history.slice(-Math.min(history.length, 40));
  const lastTime = Math.max(...dated.map(item => item.date.getTime()));
  const windowMs = days * 24 * 60 * 60 * 1000;
  const offset = Math.max(0, Number(periodOffset) || 0);
  const maxTime = lastTime - offset * windowMs;
  const minTime = maxTime - windowMs;
  return history.filter(item =>
    item.date instanceof Date &&
    item.date.getTime() >= minTime &&
    item.date.getTime() <= maxTime
  );
}

function renderEloPeriodLabel(points, period) {
  if (period === "all" || !points?.length) return "";
  const first = points[0];
  const last = points[points.length - 1];
  if (!(first.date instanceof Date) || !(last.date instanceof Date)) return "";
  return `${formatDateLocal(first.date.toISOString(), currentLang)} - ${formatDateLocal(last.date.toISOString(), currentLang)}`;
}

function renderEloChart(info, period = "all", grid = "medium", periodOffset = 0, options = {}) {
  const points = getFilteredEloHistory(info, period, periodOffset);
  if (!points.length) {
    return `<div class="elo-chart-empty">${escapeHtml(t("eloHistoryEmpty"))}</div>`;
  }

  const width = 820;
  const height = 280;
  const pad = { left: 48, right: 18, top: 22, bottom: 42 };
  const ratings = points.map(item => item.rating);
  const minRating = Number.isFinite(options.minRating) ? Number(options.minRating) : Math.min(...ratings);
  const maxRating = Math.max(...ratings, minRating + 1);
  const spread = Math.max(40, maxRating - minRating);
  const yMinRaw = Math.floor((minRating - spread * 0.18) / 25) * 25;
  const yMin = Number.isFinite(options.minRating) ? Number(options.minRating) : yMinRaw;
  const yMax = Math.ceil((maxRating + spread * 0.18) / 25) * 25;
  const xMax = Math.max(1, points.length - 1);
  const gridCount = grid === "high" ? 6 : grid === "low" ? 3 : 4;
  const x = (index) => pad.left + (index / xMax) * (width - pad.left - pad.right);
  const y = (rating) => pad.top + ((yMax - rating) / Math.max(1, yMax - yMin)) * (height - pad.top - pad.bottom);
  const path = points.map((item, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(item.rating).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)} ${height - pad.bottom} L${pad.left} ${height - pad.bottom} Z`;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, index) => {
    const value = yMin + ((yMax - yMin) / gridCount) * index;
    const yy = y(value);
    return `
      <line x1="${pad.left}" y1="${yy.toFixed(1)}" x2="${width - pad.right}" y2="${yy.toFixed(1)}" class="elo-chart-grid-line" />
      <text x="${pad.left - 10}" y="${(yy + 4).toFixed(1)}" class="elo-chart-axis" text-anchor="end">${Math.round(value)}</text>
    `;
  }).join("");
  const dots = points.map((item, index) => `
    <circle cx="${x(index).toFixed(1)}" cy="${y(item.rating).toFixed(1)}" r="${index === points.length - 1 ? 5 : 3}" class="elo-chart-dot">
      <title>${escapeHtml(`${item.label}: ${item.rating}${Number.isFinite(item.delta) ? ` (${item.delta > 0 ? "+" : ""}${item.delta})` : ""}`)}</title>
    </circle>
  `).join("");
  const first = points[0];
  const last = points[points.length - 1];
  const firstLabel = first.date ? formatDateLocal(first.date.toISOString(), currentLang) : first.label;
  const lastLabel = last.date ? formatDateLocal(last.date.toISOString(), currentLang) : last.label;

  return `
    <svg class="elo-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeAttribute(t("eloTitle"))}">
      ${gridLines}
      <path d="${area}" class="elo-chart-area"></path>
      <path d="${path}" class="elo-chart-line"></path>
      ${dots}
      <text x="${pad.left}" y="${height - 12}" class="elo-chart-axis">${escapeHtml(firstLabel)}</text>
      <text x="${width - pad.right}" y="${height - 12}" class="elo-chart-axis" text-anchor="end">${escapeHtml(lastLabel)}</text>
    </svg>
  `;
}

function formatSafetyChartAxisValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  if (Math.abs(numeric - Math.round(numeric)) < 0.001) return String(Math.round(numeric));
  return numeric.toFixed(1);
}

function renderSafetyChart(info, period = "all", grid = "medium", periodOffset = 0) {
  const points = getFilteredEloHistory(info, period, periodOffset);
  if (!points.length) {
    return `<div class="elo-chart-empty">${escapeHtml(t("safetyHistoryEmpty"))}</div>`;
  }

  const width = 820;
  const height = 280;
  const pad = { left: 48, right: 18, top: 22, bottom: 42 };
  const yMin = 0;
  const yMax = 10;
  const xMax = Math.max(1, points.length - 1);
  const gridCount = grid === "high" ? 6 : grid === "low" ? 3 : 4;
  const x = (index) => pad.left + (index / xMax) * (width - pad.left - pad.right);
  const y = (rating) => pad.top + ((yMax - rating) / Math.max(1, yMax - yMin)) * (height - pad.top - pad.bottom);
  const path = points.map((item, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(item.rating).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)} ${height - pad.bottom} L${pad.left} ${height - pad.bottom} Z`;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, index) => {
    const value = yMin + ((yMax - yMin) / gridCount) * index;
    const yy = y(value);
    return `
      <line x1="${pad.left}" y1="${yy.toFixed(1)}" x2="${width - pad.right}" y2="${yy.toFixed(1)}" class="elo-chart-grid-line" />
      <text x="${pad.left - 10}" y="${(yy + 4).toFixed(1)}" class="elo-chart-axis" text-anchor="end">${escapeHtml(formatSafetyChartAxisValue(value))}</text>
    `;
  }).join("");
  const dots = points.map((item, index) => `
    <g
      class="elo-chart-dot-button"
      role="button"
      tabindex="0"
      data-sr-history-race-id="${escapeAttribute(item.raceId || "")}"
      data-sr-history-race-file="${escapeAttribute(item.raceFile || "")}"
      data-sr-history-index="${escapeAttribute(index)}"
      title="${escapeAttribute(`${item.label}: ${item.rating}${Number.isFinite(item.delta) ? ` (${item.delta > 0 ? "+" : ""}${item.delta})` : ""}`)}"
      aria-label="${escapeAttribute(`${item.label}: ${item.rating}${Number.isFinite(item.delta) ? ` (${item.delta > 0 ? "+" : ""}${item.delta})` : ""}`)}"
    >
      <circle cx="${x(index).toFixed(1)}" cy="${y(item.rating).toFixed(1)}" r="${index === points.length - 1 ? 12 : 10}" class="elo-chart-dot-hit"></circle>
      <circle cx="${x(index).toFixed(1)}" cy="${y(item.rating).toFixed(1)}" r="${index === points.length - 1 ? 5 : 3}" class="elo-chart-dot"></circle>
    </g>
  `).join("");
  const first = points[0];
  const last = points[points.length - 1];
  const firstLabel = first.date ? formatDateLocal(first.date.toISOString(), currentLang) : first.label;
  const lastLabel = last.date ? formatDateLocal(last.date.toISOString(), currentLang) : last.label;

  return `
    <svg class="elo-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeAttribute(t("safetyRatingTitle"))}">
      ${gridLines}
      <path d="${area}" class="elo-chart-area"></path>
      <path d="${path}" class="elo-chart-line"></path>
      ${dots}
      <text x="${pad.left}" y="${height - 12}" class="elo-chart-axis">${escapeHtml(firstLabel)}</text>
      <text x="${width - pad.right}" y="${height - 12}" class="elo-chart-axis" text-anchor="end">${escapeHtml(lastLabel)}</text>
    </svg>
  `;
}

function ensureSafetyBreakdownPopover() {
  let element = document.getElementById("sr-breakdown-popover");
  if (element) return element;
  element = document.createElement("div");
  element.id = "sr-breakdown-popover";
  element.className = "sr-breakdown-popover";
  element.hidden = true;
  document.body.appendChild(element);
  return element;
}

function canOpenRaceFromBreakdown() {
  return Boolean(raceResultsModalController && document.getElementById("race-results-modal"));
}

function positionSafetyBreakdownPopover() {
  const popover = ensureSafetyBreakdownPopover();
  const trigger = srBreakdownPopoverState?.trigger;
  if (!trigger || !popover || popover.hidden) return;
  const rect = trigger.getBoundingClientRect();
  const margin = 12;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const popoverRect = popover.getBoundingClientRect();
  let left = rect.left;
  let top = rect.bottom + 10;

  if (left + popoverRect.width > viewportWidth - margin) {
    left = Math.max(margin, viewportWidth - popoverRect.width - margin);
  }
  if (top + popoverRect.height > viewportHeight - margin) {
    top = Math.max(margin, rect.top - popoverRect.height - 10);
  }

  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top)}px`;
}

function closeSafetyBreakdownPopover() {
  srBreakdownPopoverState = null;
  const popover = document.getElementById("sr-breakdown-popover");
  if (!popover) return;
  popover.hidden = true;
  popover.innerHTML = "";
}

function renderSafetyBreakdownPopover() {
  const popover = ensureSafetyBreakdownPopover();
  if (!srBreakdownPopoverState) {
    popover.hidden = true;
    popover.innerHTML = "";
    return;
  }
  const { loading, model } = srBreakdownPopoverState;
  popover.innerHTML = `
    <div class="sr-breakdown-popover-card">
      ${loading
        ? `<div class="sr-breakdown-loading">${escapeHtml(t("safetyBreakdownLoading"))}</div>`
        : renderSafetyBreakdownContent(model, { canOpenRace: canOpenRaceFromBreakdown() })}
    </div>
  `;
  popover.hidden = false;
  positionSafetyBreakdownPopover();
}

async function openSafetyBreakdownPopover({ trigger, source = null, publicId = null, playerId = null, raceId = null } = {}) {
  if (!trigger) return;
  const requestId = ++srBreakdownPopoverRequestId;
  srBreakdownPopoverState = {
    trigger,
    source,
    publicId,
    playerId,
    raceId: raceId || source?.race_id || null,
    loading: true,
    model: null
  };
  renderSafetyBreakdownPopover();

  const resolvedSource = await resolveSafetyBreakdownSource({
    source,
    publicId,
    playerId,
    raceId: raceId || source?.race_id || null
  });
  if (!srBreakdownPopoverState || requestId !== srBreakdownPopoverRequestId) return;
  srBreakdownPopoverState = {
    ...srBreakdownPopoverState,
    loading: false,
    model: buildSafetyBreakdownModel(resolvedSource)
  };
  renderSafetyBreakdownPopover();
}

async function openRaceFromSafetyBreakdown(raceId, trigger = null) {
  if (!raceId || !canOpenRaceFromBreakdown()) return;
  const race = await loadRaceDetailsCached({ race_id: raceId });
  closeSafetyBreakdownPopover();
  if (safetyModalController?.modal?.classList.contains("is-open")) {
    safetyModalController.close();
  }
  openRaceResultsModal(race, trigger);
}

function renderEloModal() {
  const titleEl = document.getElementById("elo-modal-title");
  const subtitleEl = document.getElementById("elo-modal-subtitle");
  const bodyEl = document.getElementById("elo-modal-body");
  if (!titleEl || !subtitleEl || !bodyEl) return;

  const info = getEloInfo(eloModalState?.source);
  if (!info) {
    titleEl.textContent = t("eloTitle");
    subtitleEl.textContent = t("eloNoData");
    bodyEl.innerHTML = `<div class="empty-box">${escapeHtml(t("eloNoData"))}</div>`;
    return;
  }

  const period = eloModalState?.period || "all";
  const grid = eloModalState?.grid || "medium";
  const periodOffset = Number(eloModalState?.periodOffset || 0);
  const periodPoints = getFilteredEloHistory(info, period, periodOffset);
  const periodLabel = renderEloPeriodLabel(periodPoints, period);
  titleEl.textContent = info.driver || t("eloTitle");
  subtitleEl.textContent = t("eloModalSubtitle");
  const periods = ["all", "365", "180", "90", "30", "7", "1"];
  const grids = ["low", "medium", "high"];

  bodyEl.innerHTML = `
    <div class="elo-modal-summary">
      <div class="elo-modal-rating elo-cat-${escapeHtml(info.categoryId)}">
        <span class="elo-modal-label">${escapeHtml(t("eloCurrentRating"))}</span>
        <span class="elo-modal-value">${escapeHtml(info.rating)}</span>
      </div>
      <div class="elo-modal-category">
        <span class="elo-modal-label">${escapeHtml(t("eloCategoryLabel"))}</span>
        <span class="elo-modal-category-name">${escapeHtml(info.categoryName)}</span>
      </div>
    </div>
    <div class="elo-modal-controls">
      <div class="segmented-control">
        ${periods.map(value => `<button type="button" class="${period === value ? "active" : ""}" data-elo-period="${value}">${escapeHtml(t(`eloPeriod${value === "all" ? "All" : value}`))}</button>`).join("")}
      </div>
      <div class="segmented-control segmented-control-grid" aria-label="${escapeAttribute(t("eloGridLabel"))}">
        ${grids.map(value => `<button type="button" class="${grid === value ? "active" : ""}" data-elo-grid="${value}">${escapeHtml(t(`eloGrid${value[0].toUpperCase()}${value.slice(1)}`))}</button>`).join("")}
      </div>
    </div>
    ${period !== "all" ? `
      <div class="elo-period-pager">
        <button type="button" data-elo-period-step="older" title="${escapeAttribute(t("eloPrevPeriod"))}">‹</button>
        <span>${escapeHtml(periodLabel || t(`eloPeriod${period}`))}</span>
        <button type="button" data-elo-period-step="newer" ${periodOffset <= 0 ? "disabled" : ""} title="${escapeAttribute(t("eloNextPeriod"))}">›</button>
      </div>
    ` : ""}
    <div class="elo-chart-wrap">${renderEloChart(info, period, grid, periodOffset)}</div>
  `;
}

function openEloModalForSource(source, trigger = null) {
  if (!source) return;
  eloModalState = {
    source,
    period: eloModalState?.period || "all",
    grid: eloModalState?.grid || "medium",
    periodOffset: eloModalState?.periodOffset || 0
  };
  eloModalController?.open(trigger);
}

function initEloModal() {
  eloModalController = createModalController({
    modalId: "elo-modal",
    closeButtonId: "elo-modal-close",
    onOpen: renderEloModal,
    onClose: () => {
      eloModalState = null;
    }
  });

  document.addEventListener("click", (event) => {
    const eloButton = event.target?.closest?.("[data-elo-public-id], [data-elo-player-id]");
    if (eloButton) {
      event.preventDefault();
      event.stopPropagation();
      const source = findEloSource(eloButton.dataset.eloPublicId, eloButton.dataset.eloPlayerId);
      openEloModalForSource(source, eloButton);
      return;
    }

    const periodButton = event.target?.closest?.("[data-elo-period]");
    if (periodButton && document.getElementById("elo-modal")?.contains(periodButton)) {
      eloModalState = { ...(eloModalState || {}), period: periodButton.dataset.eloPeriod || "all", periodOffset: 0 };
      renderEloModal();
      return;
    }

    const periodStepButton = event.target?.closest?.("[data-elo-period-step]");
    if (periodStepButton && document.getElementById("elo-modal")?.contains(periodStepButton)) {
      const currentOffset = Number(eloModalState?.periodOffset || 0);
      const nextOffset = periodStepButton.dataset.eloPeriodStep === "older"
        ? currentOffset + 1
        : Math.max(0, currentOffset - 1);
      eloModalState = { ...(eloModalState || {}), periodOffset: nextOffset };
      renderEloModal();
      return;
    }

    const gridButton = event.target?.closest?.("[data-elo-grid]");
    if (gridButton && document.getElementById("elo-modal")?.contains(gridButton)) {
      eloModalState = { ...(eloModalState || {}), grid: gridButton.dataset.eloGrid || "medium" };
      renderEloModal();
    }
  });
}

function renderSafetyModal() {
  const titleEl = document.getElementById("safety-modal-title");
  const subtitleEl = document.getElementById("safety-modal-subtitle");
  const bodyEl = document.getElementById("safety-modal-body");
  if (!titleEl || !subtitleEl || !bodyEl) return;

  const info = getSafetyInfo(safetyModalState?.source);
  if (!info) {
    titleEl.textContent = t("safetyRatingTitle");
    subtitleEl.textContent = t("safetyNoData");
    bodyEl.innerHTML = `<div class="empty-box">${escapeHtml(t("safetyNoData"))}</div>`;
    return;
  }

  const period = safetyModalState?.period || "all";
  const grid = safetyModalState?.grid || "medium";
  const periodOffset = Number(safetyModalState?.periodOffset || 0);
  const periodPoints = getFilteredEloHistory(info, period, periodOffset);
  const periodLabel = renderEloPeriodLabel(periodPoints, period);
  const periods = ["all", "365", "180", "90", "30", "7", "1"];
  const grids = ["low", "medium", "high"];
  titleEl.textContent = info.driver || t("safetyRatingTitle");
  subtitleEl.textContent = t("safetyModalSubtitle");

  bodyEl.innerHTML = `
    <div class="elo-modal-summary">
      <div class="elo-modal-rating sr-cat-${escapeHtml(info.category)}">
        <span class="elo-modal-label">${escapeHtml(t("safetyCurrentRating"))}</span>
        <span class="elo-modal-value">${escapeHtml(`${info.category} ${info.rating}`)}</span>
      </div>
      <div class="elo-modal-category">
        <span class="elo-modal-label">${escapeHtml(t("safetyCategoryLabel"))}</span>
        <span class="elo-modal-category-name">${escapeHtml(info.categoryName)}</span>
      </div>
    </div>
    <div class="elo-modal-controls">
      <div class="segmented-control">
        ${periods.map(value => `<button type="button" class="${period === value ? "active" : ""}" data-sr-period="${value}">${escapeHtml(t(`eloPeriod${value === "all" ? "All" : value}`))}</button>`).join("")}
      </div>
      <div class="segmented-control segmented-control-grid" aria-label="${escapeAttribute(t("eloGridLabel"))}">
        ${grids.map(value => `<button type="button" class="${grid === value ? "active" : ""}" data-sr-grid="${value}">${escapeHtml(t(`eloGrid${value[0].toUpperCase()}${value.slice(1)}`))}</button>`).join("")}
      </div>
    </div>
    ${period !== "all" ? `
      <div class="elo-period-pager">
        <button type="button" data-sr-period-step="older" title="${escapeAttribute(t("eloPrevPeriod"))}">‹</button>
        <span>${escapeHtml(periodLabel || t(`eloPeriod${period}`))}</span>
        <button type="button" data-sr-period-step="newer" ${periodOffset <= 0 ? "disabled" : ""} title="${escapeAttribute(t("eloNextPeriod"))}">›</button>
      </div>
    ` : ""}
    <div class="elo-chart-wrap">${info.history.length ? renderSafetyChart(info, period, grid, periodOffset) : `<div class="empty-box">${escapeHtml(t("safetyHistoryEmpty"))}</div>`}</div>
    ${renderSafetyReasonDetails(info)}
    <div class="elo-about-block safety-about-block">
      <div class="elo-about-copy">
        <h3>${escapeHtml(t("safetyAboutTitle"))}</h3>
        <p>${escapeHtml(t("safetyAboutP1"))}</p>
        <p>${escapeHtml(t("safetyAboutP2"))}</p>
      </div>
      <div class="elo-category-grid safety-category-grid" aria-label="${escapeAttribute(t("safetyAboutTitle"))}">
        <div class="elo-category-card">
          <span>A</span>
          <strong>${escapeHtml(t("safetyCategoryA"))}</strong>
          <small>${escapeHtml(t("safetyCategoryRangeA"))}</small>
        </div>
        <div class="elo-category-card">
          <span>B</span>
          <strong>${escapeHtml(t("safetyCategoryB"))}</strong>
          <small>${escapeHtml(t("safetyCategoryRangeB"))}</small>
        </div>
        <div class="elo-category-card">
          <span>C</span>
          <strong>${escapeHtml(t("safetyCategoryC"))}</strong>
          <small>${escapeHtml(t("safetyCategoryRangeC"))}</small>
        </div>
      </div>
    </div>
  `;
}

async function openSafetyModalForSource(source, trigger = null) {
  if (!source) return;
  const requestId = ++safetyModalRequestId;
  safetyModalState = {
    source,
    period: safetyModalState?.period || "all",
    grid: safetyModalState?.grid || "medium",
    periodOffset: safetyModalState?.periodOffset || 0
  };
  safetyModalController?.open(trigger);

  const publicId = source?.public_id || source?.summary?.public_id || null;
  if (normalizeSafetyHistory(source).length > 0 || !publicId) return;

  try {
    const profile = await loadDriverProfileCached(publicId);
    if (!profile || requestId !== safetyModalRequestId) return;
    if (normalizeSafetyHistory(profile).length === 0) return;
    safetyModalState = {
      ...(safetyModalState || {}),
      source: profile
    };
    renderSafetyModal();
  } catch (error) {
    console.warn("Failed to enrich safety modal source.", error);
  }
}

function initSafetyModal() {
  safetyModalController = createModalController({
    modalId: "safety-modal",
    closeButtonId: "safety-modal-close",
    onOpen: renderSafetyModal,
    onClose: () => {
      safetyModalState = null;
      closeSafetyBreakdownPopover();
    }
  });

  document.addEventListener("click", (event) => {
    const safetyButton = event.target?.closest?.("[data-sr-public-id], [data-sr-player-id]");
    if (safetyButton) {
      event.preventDefault();
      event.stopPropagation();
      const source = findSafetySource(safetyButton.dataset.srPublicId, safetyButton.dataset.srPlayerId, safetyButton.dataset.srRaceId);
      const breakdownMode = safetyButton.dataset.srBreakdownMode || "modal";
      if (breakdownMode === "inline") {
        openSafetyBreakdownPopover({
          trigger: safetyButton,
          source,
          publicId: safetyButton.dataset.srPublicId || null,
          playerId: safetyButton.dataset.srPlayerId || null,
          raceId: safetyButton.dataset.srRaceId || null
        });
      } else {
        closeSafetyBreakdownPopover();
        openSafetyModalForSource(source, safetyButton);
      }
      return;
    }

    const historyPoint = event.target?.closest?.("[data-sr-history-race-id]");
    if (historyPoint) {
      event.preventDefault();
      event.stopPropagation();
      openSafetyBreakdownPopover({
        trigger: historyPoint,
        source: null,
        publicId: safetyModalState?.source?.public_id || safetyModalState?.source?.summary?.public_id || null,
        playerId: safetyModalState?.source?.player_id || safetyModalState?.source?.summary?.player_id || null,
        raceId: historyPoint.dataset.srHistoryRaceId || null
      });
      return;
    }

    const openRaceButton = event.target?.closest?.("[data-sr-breakdown-open-race]");
    if (openRaceButton) {
      event.preventDefault();
      event.stopPropagation();
      openRaceFromSafetyBreakdown(openRaceButton.dataset.srBreakdownOpenRace || null, openRaceButton);
      return;
    }

    const periodButton = event.target?.closest?.("[data-sr-period]");
    if (periodButton && document.getElementById("safety-modal")?.contains(periodButton)) {
      safetyModalState = { ...(safetyModalState || {}), period: periodButton.dataset.srPeriod || "all", periodOffset: 0 };
      closeSafetyBreakdownPopover();
      renderSafetyModal();
      return;
    }

    const periodStepButton = event.target?.closest?.("[data-sr-period-step]");
    if (periodStepButton && document.getElementById("safety-modal")?.contains(periodStepButton)) {
      const currentOffset = Number(safetyModalState?.periodOffset || 0);
      const nextOffset = periodStepButton.dataset.srPeriodStep === "older"
        ? currentOffset + 1
        : Math.max(0, currentOffset - 1);
      safetyModalState = { ...(safetyModalState || {}), periodOffset: nextOffset };
      closeSafetyBreakdownPopover();
      renderSafetyModal();
      return;
    }

    const gridButton = event.target?.closest?.("[data-sr-grid]");
    if (gridButton && document.getElementById("safety-modal")?.contains(gridButton)) {
      safetyModalState = { ...(safetyModalState || {}), grid: gridButton.dataset.srGrid || "medium" };
      closeSafetyBreakdownPopover();
      renderSafetyModal();
      return;
    }

    if (
      srBreakdownPopoverState
      && !event.target?.closest?.("#sr-breakdown-popover")
      && !event.target?.closest?.("[data-sr-breakdown-mode='inline']")
      && !event.target?.closest?.("[data-sr-history-race-id]")
    ) {
      closeSafetyBreakdownPopover();
    }
  });

  document.addEventListener("keydown", (event) => {
    const historyPoint = event.target?.closest?.("[data-sr-history-race-id]");
    if (!historyPoint) {
      if (event.key === "Escape" && srBreakdownPopoverState) closeSafetyBreakdownPopover();
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openSafetyBreakdownPopover({
      trigger: historyPoint,
      source: null,
      publicId: safetyModalState?.source?.public_id || safetyModalState?.source?.summary?.public_id || null,
      playerId: safetyModalState?.source?.player_id || safetyModalState?.source?.summary?.player_id || null,
      raceId: historyPoint.dataset.srHistoryRaceId || null
    });
  });

  window.addEventListener("resize", () => {
    if (srBreakdownPopoverState) positionSafetyBreakdownPopover();
  });
  window.addEventListener("scroll", () => {
    if (srBreakdownPopoverState) positionSafetyBreakdownPopover();
  }, true);
}

function getChampionshipRankChange(row) {
  if (!row || typeof row !== "object") return null;
  return row.rank_change || row.latest_changes?.championship_rank || null;
}

function renderStatValueWithTrend(valueMarkup, change, metric) {
  return `
    <div class="stat-with-trend">
      <span>${valueMarkup}</span>
      ${renderTrendBadge(change, metric, { compact: true })}
    </div>
  `;
}

function updateBestLapNote(driver, track, carName) {
  const noteEl = document.getElementById("best-lap-note");
  if (!noteEl) return;

  const base = replaceTokens(t("bestLapNoteTemplate"), {
    driver: driver || "Unknown",
    track: track || "Unknown track"
  });
  noteEl.textContent = carName ? `${base} · ${carName}` : base;
}

function applyBestlapTracksButtonText(root = document) {
  root.querySelectorAll?.(".bestlap-tracks-open, [data-driver-bestlap-tracks]").forEach(button => {
    button.textContent = t("bestLapTracksButton");
    button.setAttribute("title", t("bestLapTracksTooltip"));
    button.setAttribute("aria-label", t("bestLapTracksTooltip"));
  });
}

function bestlapTrackOptions() {
  const source = Array.isArray(bestlapTracksData) && bestlapTracksData.length
    ? bestlapTracksData
    : bestlapsData.map(row => ({ track: row?.track_code || row?.track }));
  const seen = new Set();
  return source
    .map(item => String(item?.track_code || item?.track || "").trim().toLowerCase())
    .filter(track => {
      if (!track || seen.has(track)) return false;
      seen.add(track);
      return true;
    })
    .map(track => ({ track, label: humanizeTrackName(track) }));
}

function renderBestlapsTrackFilter() {
  const select = document.getElementById("bestlaps-track-filter");
  if (!select) return;
  const options = bestlapTrackOptions();
  if (!options.find(item => item.track === bestlapsTrackFilter)) {
    bestlapsTrackFilter = options[0]?.track || bestlapsTrackFilter || "monza";
  }
  select.innerHTML = options.map(item => `
    <option value="${escapeAttribute(item.track)}" ${item.track === bestlapsTrackFilter ? "selected" : ""}>${escapeHtml(item.label)}</option>
  `).join("");
  if (select.dataset.bound !== "true") {
    select.addEventListener("change", async () => {
      bestlapsTrackFilter = String(select.value || "").trim().toLowerCase();
      bestlapsPage = 1;
      topDataV2PagedTables.bestlaps = null;
      if (isServerPagedTopDataV2Table("bestlaps")) {
        await loadServerPagedTopDataV2Table("bestlaps", bestlapsPage).catch(() => null);
      } else {
        await loadFullTopDataV2Table("bestlaps").catch(() => null);
      }
      renderBestLapsTablePage();
    });
    select.dataset.bound = "true";
  }
}

function renderBestlapTracksRows(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return `<div class="empty-box">-</div>`;
  }
  return `
    <div class="bestlap-track-list">
      ${items.map(item => `
        <div class="bestlap-track-row">
          <div class="bestlap-track-main">
            <span class="bestlap-track-name">${escapeHtml(humanizeTrackName(item.track_code || item.track))}</span>
            <span class="bestlap-track-driver">${item.driver ? renderDriverLink(item.driver, item.public_id, "driver-link driver-link-subtle", item.player_id) : ""}</span>
          </div>
          <div class="bestlap-track-side">
            <span class="best-lap-value">${escapeHtml(item.best_lap || item.lap || "-")}</span>
            <span>${escapeHtml(item.car_name || item.best_lap_car_name || "-")}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderBestlapTracksModal() {
  const titleEl = document.getElementById("bestlap-tracks-title");
  const subtitleEl = document.getElementById("bestlap-tracks-subtitle");
  const bodyEl = document.getElementById("bestlap-tracks-body");
  if (!titleEl || !subtitleEl || !bodyEl) return;
  const state = bestlapTracksModalState || {};
  titleEl.textContent = state.title || t("bestLapTracksTitle");
  subtitleEl.textContent = state.subtitle || t("bestLapTracksSubtitle");
  bodyEl.innerHTML = renderBestlapTracksRows(state.items || []);
}

function openBestlapTracksModal(items, trigger, options = {}) {
  bestlapTracksModalState = {
    title: options.title || t("bestLapTracksTitle"),
    subtitle: options.subtitle || t("bestLapTracksSubtitle"),
    items: Array.isArray(items) ? items : []
  };
  bestlapTracksModalController?.open(trigger || document.getElementById("best-lap-highlight"));
}

function initBestlapTracksModal() {
  bestlapTracksModalController = createModalController({
    modalId: "bestlap-tracks-modal",
    closeButtonId: "bestlap-tracks-close",
    onOpen: renderBestlapTracksModal,
    onClose: () => {
      bestlapTracksModalState = null;
    }
  });

  const button = document.getElementById("best-lap-highlight");
  if (button && button.dataset.bound !== "true") {
    button.addEventListener("click", () => openBestlapTracksModal(bestlapTrackLeadersData, button));
    button.dataset.bound = "true";
  }
  applyBestlapTracksButtonText();
}

function renderTop3Compact(data) {
  if (!Array.isArray(data) || !data.length) {
    return `<div class="empty-box">${escapeHtml(t("emptyTop3"))}</div>`;
  }

  const top3 = data.slice(0, 3);
  const classes = ["top1", "top2", "top3"];

  return top3.map((row, index) => `
    <article class="pilot-card ${classes[index] || ""}">
      <div class="pilot-topline">
        <div class="pilot-rank-wrap">
          <div class="pilot-rank">#${escapeHtml(row.rank)}</div>
          ${renderTrendBadge(getChampionshipRankChange(row), "championship_rank", { compact: true })}
        </div>
        <h3 class="pilot-name">${renderDriverLink(row.driver, row.public_id, "driver-link driver-link-heading", row.player_id)}</h3>
        ${renderCarImage(row, { className: "car-thumb car-thumb-inline pilot-topline-car", alt: row.best_lap_car_name || row.car_name || "" })}
      </div>
      <div class="muted pilot-lap-line">
        <span>${escapeHtml(t("metaLabels").bestLap)}: ${escapeHtml(row.best_lap || "-")}</span>
        <span class="pilot-lap-car">${escapeHtml(row.best_lap_car_name || "-")}</span>
      </div>
      <div class="pilot-meta">
        <div class="meta-box">
          <div class="meta-label">${escapeHtml(t("metaLabels").points)}</div>
          <div class="meta-value">${escapeHtml(row.points ?? 0)}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">${escapeHtml(t("metaLabels").wins)}</div>
          <div class="meta-value">${escapeHtml(row.wins ?? 0)}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">${escapeHtml(t("metaLabels").races)}</div>
          <div class="meta-value">${escapeHtml(row.races ?? 0)}</div>
        </div>
      </div>
    </article>
  `).join("");
}

function paginate(data, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: data.slice(start, end),
    page: safePage,
    totalPages,
    totalItems: data.length,
    startIndex: data.length ? start + 1 : 0,
    endIndex: Math.min(end, data.length)
  };
}

function getPreviewAwareTablePage(tableName, data, page, pageSize) {
  const result = paginate(data, page, pageSize);
  const meta = getTopDataV2TableMeta(tableName);
  const totalItems = Number(meta?.total_items) || result.totalItems;
  if (totalItems <= result.totalItems) return result;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;

  return {
    ...result,
    page: safePage,
    totalPages,
    totalItems,
    startIndex: totalItems ? start + 1 : 0,
    endIndex: Math.min(end, totalItems),
    items: data.slice(start, end)
  };
}

function getPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

function renderPagination(
  containerId,
  infoId,
  wrapId,
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange
) {
  const container = document.getElementById(containerId);
  const info = document.getElementById(infoId);
  const wrap = document.getElementById(wrapId);

  if (!container || !info || !wrap) return;

  if (totalItems <= PAGE_SIZE) {
    wrap.style.display = "none";
    container.innerHTML = "";
    info.textContent = "";
    return;
  }

  wrap.style.display = "flex";
  info.textContent = replaceTokens(t("paginationShown"), {
    start: startIndex,
    end: endIndex,
    total: totalItems
  });

  const pageList = getPageList(currentPage, totalPages);

  let html = `
    <button class="page-btn" ${currentPage === 1 ? "disabled" : ""} data-page="${currentPage - 1}">
      ${escapeHtml(t("prev"))}
    </button>
  `;

  pageList.forEach(item => {
    if (item === "...") {
      html += `<span class="page-dots">...</span>`;
    } else {
      html += `
        <button class="page-btn ${item === currentPage ? "active" : ""}" data-page="${item}">
          ${item}
        </button>
      `;
    }
  });

  html += `
    <button class="page-btn" ${currentPage === totalPages ? "disabled" : ""} data-page="${currentPage + 1}">
      ${escapeHtml(t("next"))}
    </button>
  `;

  container.innerHTML = html;

  container.querySelectorAll(".page-btn[data-page]").forEach(btn => {
    btn.addEventListener("click", () => {
      const nextPage = Number(btn.dataset.page);
      if (!Number.isNaN(nextPage)) onPageChange(nextPage);
    });
  });
}

function renderLeaderboardHeaders() {
  return renderSortableHeaders(leaderboardColumns, t("leaderboardCols"), leaderboardSort);
}

function renderBestlapsHeaders() {
  return renderSortableHeaders(bestlapsColumns, t("bestlapsCols"), bestlapsSort);
}

function bindLeaderboardSortHandlers() {
  bindSortableHeaders("#leaderboard-table th[data-sort-key]", leaderboardSort, async (key) => {
    leaderboardSort = cycleSort(leaderboardSort, key);
    leaderboardPage = 1;
    if (isServerPagedTopDataV2Table("leaderboard")) {
      await loadServerPagedTopDataV2Table("leaderboard", leaderboardPage).catch(() => null);
    } else {
      await loadFullTopDataV2Table("leaderboard").catch(() => null);
    }
    renderLeaderboardTablePage();
  });
}

function bindBestlapsSortHandlers() {
  bindSortableHeaders("#bestlaps-table th[data-sort-key]", bestlapsSort, async (key) => {
    bestlapsSort = cycleSort(bestlapsSort, key);
    bestlapsPage = 1;
    if (isServerPagedTopDataV2Table("bestlaps")) {
      await loadServerPagedTopDataV2Table("bestlaps", bestlapsPage).catch(() => null);
    } else {
      await loadFullTopDataV2Table("bestlaps").catch(() => null);
    }
    renderBestLapsTablePage();
  });
}

function renderLeaderboardTablePage() {
  const tableEl = document.getElementById("leaderboard-table");
  const wrapEl = document.getElementById("leaderboard-pagination-wrap");

  if (!tableEl || !wrapEl) return;

  if (topLoadState.home && !leaderboardData.length) {
    tableEl.innerHTML = renderLoadingMarkup(t("loadingLeaderboard"));
    wrapEl.style.display = "none";
    return;
  }

  const result = getServerPagedTableResult("leaderboard", leaderboardPage) ||
    getPreviewAwareTablePage("leaderboard", getProcessedLeaderboard(), leaderboardPage, PAGE_SIZE);
  leaderboardPage = result.page;

  if (!result.totalItems) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(leaderboardSearch ? t("emptySearch") : t("emptyLeaderboard"))}</div>`;
    wrapEl.style.display = "none";
    return;
  }

  const rows = result.items.map(row => `
    <tr ${buildDriverPreviewRowAttributes(row)}>
      <td class="rank-column numeric-cell">${renderRankBadgeWithTrend(row.rank, getChampionshipRankChange(row), { showHash: false })}</td>
      <td class="driver-column driver-cell-wrapper">
        <div class="driver-cell">
          <div class="driver-avatar">${escapeHtml(initials(row.driver))}</div>
          <div class="driver-name-wrap">
            ${renderLeaderboardDriver(row)}
            ${renderDriverNameMeta(row)}
          </div>
        </div>
      </td>
      <td class="elo-column numeric-cell">${renderEloCell(row)}</td>
      <td class="sr-column numeric-cell">${renderSafetyCell(row)}</td>
      <td class="points-column numeric-cell">${escapeHtml(row.points ?? 0)}</td>
      <td class="wins-column numeric-cell">${escapeHtml(row.wins ?? 0)}</td>
      <td class="podiums-column numeric-cell">${escapeHtml(row.podiums ?? 0)}</td>
      <td class="races-column numeric-cell">${escapeHtml(row.races ?? 0)}</td>
      <td class="avg-finish-column numeric-cell">${escapeHtml(row.average_finish ?? "-")}</td>
      <td class="best-lap-column numeric-cell">${escapeHtml(row.best_lap ?? "-")}</td>
      <td class="car-column car-cell-wrapper"><div class="car-cell">${renderCarOrBanned(row)}</div></td>
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table class="stats-table leaderboard-stats-table">
      <colgroup>
        ${leaderboardColumns.map(col => `<col class="${escapeHtml(col.className || "")}">`).join("")}
      </colgroup>
      <thead>
        <tr>${renderLeaderboardHeaders()}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  bindLeaderboardSortHandlers();
  bindDriverPreviewTableInteractions(tableEl);

  renderPagination(
    "leaderboard-pagination",
    "leaderboard-pagination-info",
    "leaderboard-pagination-wrap",
    result.page,
    result.totalPages,
    result.totalItems,
    result.startIndex,
    result.endIndex,
    async (page) => {
      if (isServerPagedTopDataV2Table("leaderboard")) {
        const pageData = await ensureServerPagedTopDataV2Table("leaderboard", page).catch(() => null);
        if (!pageData?.items?.length) await loadFullTopDataV2Table("leaderboard").catch(() => null);
      } else if (page > Math.ceil(leaderboardData.length / PAGE_SIZE)) {
        await loadFullTopDataV2Table("leaderboard").catch(() => null);
      }
      leaderboardPage = page;
      renderLeaderboardTablePage();
      scrollTopTargetBelowHeader(isCombinedStatsTabsExperimentEnabled() ? "combined-stats-shell" : "championship");
    }
  );
}

function renderBestLapsTablePage() {
  renderBestlapsTrackFilter();
  const tableEl = document.getElementById("bestlaps-table");
  const wrapEl = document.getElementById("bestlaps-pagination-wrap");

  if (!tableEl || !wrapEl) return;

  if (topLoadState.home && !bestlapsData.length) {
    tableEl.innerHTML = renderLoadingMarkup(t("loadingBestLaps"));
    wrapEl.style.display = "none";
    return;
  }

  const result = getServerPagedTableResult("bestlaps", bestlapsPage) ||
    getPreviewAwareTablePage("bestlaps", getProcessedBestlaps(), bestlapsPage, PAGE_SIZE);
  bestlapsPage = result.page;

  if (!result.totalItems) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(bestlapsSearch ? t("emptySearch") : t("emptyBestLaps"))}</div>`;
    wrapEl.style.display = "none";
    return;
  }

  const rows = result.items.map(row => `
    <tr ${buildDriverPreviewRowAttributes(row)}>
      <td>
        <span class="rank-badge-wrap">
          <span class="rank-badge rank-${escapeHtml(row.rank)}">#${escapeHtml(row.rank)}</span>
          ${renderTrendBadge(row.rank_change, "bestlap_rank", { compact: true })}
        </span>
      </td>
      <td>
        <div class="driver-cell">
          <div class="driver-avatar">${escapeHtml(initials(row.driver))}</div>
          <div class="driver-name-wrap">
            <div class="driver-name">${renderDriverLink(row.driver, row.public_id, "driver-link", row.player_id)}</div>
            ${renderDriverNameMeta(row)}
          </div>
        </div>
      </td>
      <td>${renderEloCell(row)}</td>
      <td>${renderSafetyCell(row)}</td>
      <td>${renderStatValueWithTrend(escapeHtml(row.best_lap ?? "-"), row.latest_changes?.best_lap_ms, "best_lap_ms")}</td>
      <td>${isDriverBanned(row) ? renderBannedBadge({ compact: true }) : `<span class="car-label-inline">${renderCarImage(row, { className: "car-thumb car-thumb-inline", alt: row.car_name || "" })}<span>${escapeHtml(row.car_name ?? "-")}</span></span>`}</td>
      <td>${sessionLabel(row.session_type)}</td>
      <td>${escapeHtml(row.updated_at ?? "-")}</td>
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table>
      <thead>
        <tr>${renderBestlapsHeaders()}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  bindBestlapsSortHandlers();
  bindDriverPreviewTableInteractions(tableEl);

  renderPagination(
    "bestlaps-pagination",
    "bestlaps-pagination-info",
    "bestlaps-pagination-wrap",
    result.page,
    result.totalPages,
    result.totalItems,
    result.startIndex,
    result.endIndex,
    async (page) => {
      if (isServerPagedTopDataV2Table("bestlaps")) {
        const pageData = await ensureServerPagedTopDataV2Table("bestlaps", page).catch(() => null);
        if (!pageData?.items?.length) await loadFullTopDataV2Table("bestlaps").catch(() => null);
      } else if (page > Math.ceil(bestlapsData.length / PAGE_SIZE)) {
        await loadFullTopDataV2Table("bestlaps").catch(() => null);
      }
      bestlapsPage = page;
      renderBestLapsTablePage();
      scrollTopTargetBelowHeader(isCombinedStatsTabsExperimentEnabled() ? "combined-stats-shell" : "bestlaps");
    }
  );
}

function renderSafetyHeaders() {
  return renderSortableHeaders(getSafetyColumns(), null, safetySort);
}

function bindSafetySortHandlers() {
  bindSortableHeaders("#safety-table th[data-sort-key]", safetySort, async (key) => {
    await loadFullTopDataV2Table("safety").catch(() => null);
    safetySort = cycleSort(safetySort, key);
    safetyPage = 1;
    renderSafetyTablePage();
  });
}

function renderSafetyPenaltyBreakdown(row) {
  const penalties = row?.penalties && typeof row.penalties === "object" ? row.penalties : {};
  const columns = getSafetyColumns().filter(col => col.key.startsWith("penalties."));
  return columns.map(col => {
    const key = col.key.replace("penalties.", "");
    return `<td>${escapeHtml(penalties[key] ?? 0)}</td>`;
  }).join("");
}

function renderSafetyTablePage() {
  const tableEl = document.getElementById("safety-table");
  const wrapEl = document.getElementById("safety-pagination-wrap");

  if (!tableEl || !wrapEl) return;

  if (topLoadState.home && !safetyData.length) {
    tableEl.innerHTML = renderLoadingMarkup(t("loadingSafety"));
    wrapEl.style.display = "none";
    return;
  }

  const result = getPreviewAwareTablePage("safety", getProcessedSafety(), safetyPage, PAGE_SIZE);
  safetyPage = result.page;

  if (!result.totalItems) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(safetySearch ? t("emptySearch") : t("emptySafety"))}</div>`;
    wrapEl.style.display = "none";
    return;
  }

  const rows = result.items.map(row => `
    <tr class="safety-row sr-row ${isDriverBanned(row) ? "is-banned" : `sr-cat-${escapeHtml(normalizeSafetyCategory(row) || "C")}`}">
      <td><span class="rank-badge rank-${escapeHtml(row.rank)}">#${escapeHtml(row.rank)}</span></td>
      <td>
        <div class="driver-cell">
          <div class="driver-name-wrap">
            <div class="driver-name">${renderDriverLink(row.driver, row.public_id, "driver-link", row.player_id)}</div>
          </div>
        </div>
      </td>
      <td>${renderSafetyCell(row)}</td>
      <td>${isDriverBanned(row) ? renderBannedBadge({ compact: true }) : escapeHtml(getSafetyCategoryName(normalizeSafetyCategory(row) || "C"))}</td>
        <td>${escapeHtml(row.races_count ?? 0)}</td>
        <td>${escapeHtml(Number(row.total_delta ?? 0).toFixed(2))}</td>
        <td>${escapeHtml(row.total_invalid_laps ?? 0)}</td>
        <td>${escapeHtml(row.total_counted_penalties ?? 0)}</td>
        <td>${escapeHtml(row.total_incident_points ?? 0)}</td>
      </tr>
    `).join("");

  tableEl.innerHTML = `
    <table class="safety-table-dynamic">
      <thead>
        <tr>${renderSafetyHeaders()}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  bindSafetySortHandlers();

  renderPagination(
    "safety-pagination",
    "safety-pagination-info",
    "safety-pagination-wrap",
    result.page,
    result.totalPages,
    result.totalItems,
    result.startIndex,
    result.endIndex,
    async (page) => {
      if (page > Math.ceil(safetyData.length / PAGE_SIZE)) {
        await loadFullTopDataV2Table("safety").catch(() => null);
      }
      safetyPage = page;
      renderSafetyTablePage();
      scrollTopTargetBelowHeader(isCombinedStatsTabsExperimentEnabled() ? "combined-stats-shell" : "worst-safety");
    }
  );
}

function bindLanguageButtons() {
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      if (!translations[lang] || lang === currentLang) return;
      currentLang = lang;
      if (appStorage) appStorage.set("language", currentLang);
      else {
        try { localStorage.setItem("asgLang", currentLang); } catch (_error) { /* Keep runtime language only. */ }
      }
      rerenderUI();
    });
  });
}

function bindTopNavMoreMenu() {
  const root = document.getElementById("top-nav-more");
  const toggle = document.getElementById("top-nav-more-toggle");
  const menu = document.getElementById("top-nav-more-menu");
  const navMenu = document.querySelector(".top-nav-menu");
  if (navMenu?.querySelector(".top-nav-group")) {
    if (root) {
      root.hidden = true;
      root.classList.remove("is-visible", "is-open");
    }
    return;
  }
  const items = navMenu ? [...navMenu.querySelectorAll("[data-nav-item='true']")] : [];
  if (!root || !toggle || !menu || !navMenu || !items.length || root.dataset.bound === "true") return;

  const closeMenu = () => {
    toggle.setAttribute("aria-expanded", "false");
    menu.hidden = true;
    root.classList.remove("is-open");
  };

  const rebuildOverflowMenu = () => {
    menu.innerHTML = "";
    items.forEach(item => {
      item.hidden = false;
    });
    items.forEach(item => {
      if (item.dataset.navOverflow === "true") {
        item.hidden = true;
      }
    });

    root.classList.remove("is-visible");
    closeMenu();

    if (window.innerWidth > 980 && !items.some(item => item.hidden)) {
      return;
    }

    root.classList.add("is-visible");
    root.hidden = false;

    const availableWidth = navMenu.clientWidth;
    const toggleWidth = root.offsetWidth || toggle.getBoundingClientRect().width;
    const gap = 8;
    const maxVisibleRight = Math.max(0, availableWidth - toggleWidth - gap);

    items.forEach(item => {
      if (item.hidden) return;
      const itemRightEdge = item.offsetLeft + item.offsetWidth;
      if (itemRightEdge > maxVisibleRight) {
        item.hidden = true;
      }
    });

    const hiddenItems = items.filter(item => item.hidden);
    if (!hiddenItems.length) {
      root.classList.remove("is-visible");
      root.hidden = true;
      return;
    }

    hiddenItems.forEach(item => {
      const clone = item.cloneNode(true);
      clone.className = item.classList.contains("top-nav-link-special")
        ? "top-nav-more-link top-nav-more-link-special"
        : item.classList.contains("top-nav-link-championship")
          ? "top-nav-more-link top-nav-more-link-championship"
          : "top-nav-more-link";
      clone.hidden = false;
      clone.removeAttribute("data-nav-item");
      menu.appendChild(clone);
    });
  };

  const openMenu = () => {
    toggle.setAttribute("aria-expanded", "true");
    menu.hidden = false;
    root.classList.add("is-open");
  };

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  window.addEventListener("resize", () => {
    rebuildOverflowMenu();
  });

  requestAnimationFrame(rebuildOverflowMenu);
  window.addEventListener("load", rebuildOverflowMenu, { once: true });
  root.rebuildOverflowMenu = rebuildOverflowMenu;
  root.dataset.bound = "true";
}

function bindTopNavGroups() {
  const groups = [...document.querySelectorAll(".top-nav-group")];
  if (!groups.length || document.body.dataset.topNavGroupsBound === "true") return;
  const navMenu = document.querySelector(".top-nav-menu");
  navMenu?.classList.add("has-nav-groups");

  const closeGroup = (group) => {
    const toggle = group.querySelector(".top-nav-group-toggle");
    const menu = group.querySelector(".top-nav-group-menu");
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", "false");
    menu.hidden = true;
    group.classList.remove("is-open");
  };

  const closeAllGroups = (exceptGroup = null) => {
    groups.forEach(group => {
      if (group !== exceptGroup) closeGroup(group);
    });
  };

  groups.forEach(group => {
    const toggle = group.querySelector(".top-nav-group-toggle");
    const menu = group.querySelector(".top-nav-group-menu");
    if (!toggle || !menu) return;

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      const shouldOpen = menu.hidden;
      closeAllGroups(shouldOpen ? group : null);
      if (shouldOpen) {
        toggle.setAttribute("aria-expanded", "true");
        menu.hidden = false;
        group.classList.add("is-open");
      } else {
        closeGroup(group);
      }
    });

    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeGroup(group);
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".top-nav-group")) closeAllGroups();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAllGroups();
  });

  document.body.dataset.topNavGroupsBound = "true";
}

function bindSearchInputs() {
  const leaderboardInput = document.getElementById("leaderboard-search");
  const bestlapsInput = document.getElementById("bestlaps-search");
  const safetyInput = document.getElementById("safety-search");
  const handleLeaderboardInput = debounce(async (value) => {
    leaderboardSearch = value || "";
    leaderboardPage = 1;
    if (isServerPagedTopDataV2Table("leaderboard")) {
      await loadServerPagedTopDataV2Table("leaderboard", leaderboardPage).catch(() => null);
    } else if (value) {
      await loadFullTopDataV2Table("leaderboard").catch(() => null);
    }
    renderLeaderboardTablePage();
  });
  const handleBestlapsInput = debounce(async (value) => {
    bestlapsSearch = value || "";
    bestlapsPage = 1;
    if (isServerPagedTopDataV2Table("bestlaps")) {
      await loadServerPagedTopDataV2Table("bestlaps", bestlapsPage).catch(() => null);
    } else if (value) {
      await loadFullTopDataV2Table("bestlaps").catch(() => null);
    }
    renderBestLapsTablePage();
  });
  const handleSafetyInput = debounce(async (value) => {
    if (value) await loadFullTopDataV2Table("safety").catch(() => null);
    safetySearch = value || "";
    safetyPage = 1;
    renderSafetyTablePage();
  });

  if (leaderboardInput) {
    leaderboardInput.addEventListener("input", (e) => {
      handleLeaderboardInput(e.target.value);
    });
  }

  if (bestlapsInput) {
    bestlapsInput.addEventListener("input", (e) => {
      handleBestlapsInput(e.target.value);
    });
  }

  if (safetyInput) {
    safetyInput.addEventListener("input", (e) => {
      handleSafetyInput(e.target.value);
    });
  }
}

function formatDateTimeLocal(isoString, lang = "en") {
  if (!isoString) return "-";

  const locale = lang === "ru" ? "ru-RU" : "en-GB";
  const date = new Date(isoString);

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatDateLocal(isoString, lang = "en") {
  if (!isoString) return "-";

  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short"
  }).format(date);
}

function getCurrentLangSafe() {
  if (typeof currentLang !== "undefined") return currentLang;
  return document.documentElement.lang === "ru" ? "ru" : "en";
}

function findDriverNameByPlayerId(playerId) {
  const found = findDriverRecordByPlayerId(playerId);
  return found?.driver || found?.name || found?.player || null;
}

function findPublicIdByPlayerId(playerId) {
  const found = findDriverRecordByPlayerId(playerId);
  if (found?.public_id) return found.public_id;
  return makePublicDriverId(playerId);
}

function findDriverRecordByPlayerId(playerId) {
  if (!playerId) return null;

  const dailyCandidates = [
    todayStatsData?.most_active_driver_today,
    todayStatsData?.most_successful_driver_today,
    driverOfDayData
  ];

  const dailyMatch = dailyCandidates.find(item => item?.player_id === playerId);
  if (dailyMatch) return dailyMatch;

  if (Array.isArray(leaderboardData)) {
    const found = leaderboardData.find(item => item.player_id === playerId || item.playerId === playerId);
    if (found) return found;
  }

  if (Array.isArray(driverIndexData)) {
    const found = driverIndexData.find(item => item.player_id === playerId || item.playerId === playerId);
    if (found) return found;
  }

  return null;
}

function formatLocalizedUpdatedLabel(updatedAt, lang = currentLang) {
  if (!updatedAt) return "-";
  return `${tForLang(lang, "updatedPrefix")}: ${formatDateTimeLocal(updatedAt, lang)}`;
}

function formatTodayActivityNote(value, lang = currentLang) {
  if (value == null) return "-";
  return replaceTokens(tForLang(lang, "todayRacesNote"), { value });
}

function formatTodayPointsNote(value, lang = currentLang) {
  if (value == null) return "-";
  return replaceTokens(tForLang(lang, "todayPointsNote"), { value });
}

function getLocalizedServerStatus(status, lang = currentLang) {
  const normalized = String(status || "offline").toLowerCase();
  if (normalized === "online") return tForLang(lang, "serverStatusOnline");
  if (normalized === "online_process_only") return tForLang(lang, "serverStatusDegraded");
  return tForLang(lang, "serverStatusOffline");
}

function cleanServerDisplayName(value, fallback = "") {
  const raw = String(value || fallback || "").trim();
  if (!raw) return fallback || "-";
  if (/^ASG Racing Monza RUS #2 Sunset - Leaderboard$/i.test(raw)) {
    return "ASG Racing Monza - SA Gainer";
  }
  const cleaned = raw
    .replace(/\s+-\s+www(?:\..*)?$/i, "")
    .replace(/\s+-\s+www\..*$/i, "")
    .replace(/\s+-\s+asgracing\.ru.*$/i, "")
    .replace(/\s+-\s+discord\.gg.*$/i, "")
    .replace(/\s+-\s+zahodi\b.*$/i, "")
    .trim();
  return cleaned || raw;
}

function isGenericServerName(value, key = "") {
  const normalized = String(value || "").trim().toLowerCase();
  return !normalized || normalized === String(key || "").trim().toLowerCase();
}

function getServerDisplayLabel(key, server, fallbackLabel = "") {
  const cleanedName = cleanServerDisplayName(server?.name || server?.display_name || server?.server_name || "", "");
  if (cleanedName && !isGenericServerName(cleanedName, key)) {
    return cleanedName;
  }
  if (SERVER_STATUS_LABELS_BY_ID[key]) {
    return SERVER_STATUS_LABELS_BY_ID[key];
  }
  return fallbackLabel || key || cleanedName || "-";
}

function getServerTrackSortKey(key, label, server) {
  const haystack = `${key || ""} ${label || ""} ${server?.track_code || ""} ${server?.track || ""}`.toLowerCase();
  if (haystack.includes("nordschleife") || haystack.includes("nurburgring_24h")) return "nordschleife";
  if (haystack.includes("nurburgring")) return "nurburgring";
  if (haystack.includes("monza")) return "monza";
  if (haystack.includes("spa")) return "spa";
  if (haystack.includes("silverstone")) return "silverstone";
  return String(label || key || "").toLowerCase();
}

function compareServerStatusItems(a, b) {
  const orderA = SERVER_STATUS_ORDER_BY_ID[a.key];
  const orderB = SERVER_STATUS_ORDER_BY_ID[b.key];
  if (Number.isFinite(orderA) || Number.isFinite(orderB)) {
    return (Number.isFinite(orderA) ? orderA : 1000) - (Number.isFinite(orderB) ? orderB : 1000);
  }
  const trackCompare = getServerTrackSortKey(a.key, a.label, a.server)
    .localeCompare(getServerTrackSortKey(b.key, b.label, b.server), currentLang === "ru" ? "ru" : "en", { sensitivity: "base" });
  if (trackCompare) return trackCompare;
  const labelCompare = String(a.label || a.key || "")
    .localeCompare(String(b.label || b.key || ""), currentLang === "ru" ? "ru" : "en", { sensitivity: "base" });
  return labelCompare || a.originalIndex - b.originalIndex;
}

function pickFirstNonEmpty(...values) {
  return values.find(value => String(value ?? "").trim()) ?? "";
}

function normalizeAccConnectConfig(status, fallback = {}) {
  const hostname = String(pickFirstNonEmpty(
    status?.acc_connect_hostname,
    status?.connect_hostname,
    status?.hostname,
    status?.host,
    status?.ip,
    fallback.hostname
  )).trim();
  const port = Number(pickFirstNonEmpty(
    status?.acc_connect_port,
    status?.connect_port,
    status?.public_tcp_port,
    status?.public_port,
    status?.tcp,
    status?.tcp_port,
    status?.tcpPort,
    status?.port,
    fallback.port
  ));
  const name = String(pickFirstNonEmpty(
    status?.acc_connect_name,
    fallback.name,
    status?.server_name,
    status?.name
  )).trim();

  return {
    hostname,
    port,
    name,
    persistent: status?.persistent ?? fallback.persistent ?? true
  };
}

function buildAccConnectHref(config) {
  if (!config?.hostname || !Number.isFinite(config.port) || config.port <= 0) return "";
  const url = new URL(`acc-connect://${config.hostname}:${config.port}/`);
  if (config.name) url.searchParams.set("name", config.name);
  if (config.persistent) url.searchParams.set("persistent", "true");
  return url.href;
}

function updateAccConnectLink(elementId, status, fallback) {
  const link = document.getElementById(elementId);
  if (!link) return;

  const href = buildAccConnectHref(normalizeAccConnectConfig(status, fallback));
  link.textContent = t("serverConnectBtn");
  link.classList.toggle("is-disabled", !href);
  link.setAttribute("aria-disabled", href ? "false" : "true");
  link.setAttribute("title", href ? t("serverConnectBtn") : t("serverConnectUnavailable"));
  link.href = href || "#";
}

function resolveNamedServerStatus(serverStatus, name) {
  if (!serverStatus || typeof serverStatus !== "object") return null;
  if (serverStatus[name] && typeof serverStatus[name] === "object") return serverStatus[name];
  if (serverStatus.servers && typeof serverStatus.servers === "object" && serverStatus.servers[name] && typeof serverStatus.servers[name] === "object") {
    return serverStatus.servers[name];
  }
  return null;
}

function applyServerStatusClass(element, status) {
  if (!element) return;
  const normalized = String(status || "offline").toLowerCase();
  element.classList.remove("online", "offline", "degraded");
  element.classList.add(
    normalized === "online" ? "online" : normalized === "online_process_only" ? "degraded" : "offline"
  );
}

function getServerDrivers(server) {
  if (!server || typeof server !== "object") return [];
  const drivers = Array.isArray(server.drivers)
    ? server.drivers
    : Array.isArray(server.live_drivers)
      ? server.live_drivers
      : [];
  return drivers
    .filter(Boolean)
    .map((driver, index) => ({ ...driver, position: driver.position || index + 1 }));
}

function getServerStatusItems(serverStatus = serverStatusData) {
  const configured = [
    ["main", t("serverMainLabel")],
    ["hourly", t("serverHourlyLabel")],
    ["sunset", t("serverSunsetLabel")]
  ];
  const seen = new Set();
  const result = [];

  configured.forEach(([key, label]) => {
    const server = resolveNamedServerStatus(serverStatus, key);
    if (!server) return;
    seen.add(key);
    result.push({ key, label: getServerDisplayLabel(key, server, label), server });
  });

  const servers = serverStatus?.servers;
  if (servers && typeof servers === "object") {
    Object.entries(servers).forEach(([key, server]) => {
      if (seen.has(key) || !server || typeof server !== "object") return;
      result.push({ key, label: getServerDisplayLabel(key, server, key), server });
    });
  }

  return result
    .map((item, index) => ({ ...item, originalIndex: index }))
    .sort(compareServerStatusItems);
}

function serverPlayersOnline(server) {
  if (!server || typeof server !== "object") return 0;
  if (Number.isFinite(server.players_online)) return server.players_online;
  return getServerDrivers(server).length;
}

function getServerSessionShortLabel(server) {
  if (!server || typeof server !== "object") return "";
  const explicit = server.session_label || server.session_status_label || server.session_short_label;
  if (explicit) return String(explicit).trim();
  const rawType = String(server.session_type || server.current_session || server.session || "").trim().toLowerCase();
  const short = String(server.session_short || (
    rawType.startsWith("race") ? "R" :
    rawType.startsWith("qual") ? "Q" :
    rawType.startsWith("practice") ? "P" :
    rawType ? rawType.slice(0, 1).toUpperCase() :
    ""
  )).trim();
  const rawMinutes = server.session_remaining_minutes ?? server.remaining_minutes ?? server.session_time_left_minutes;
  const minutes = Number(rawMinutes);
  if (!short || !Number.isFinite(minutes)) return "";
  return `${short} ${Math.max(0, Math.round(minutes))}`;
}

function appendServerSessionLabel(label, server) {
  const sessionLabel = getServerSessionShortLabel(server);
  return sessionLabel ? `${label} (${sessionLabel})` : label;
}

function serverIsOnline(server) {
  const status = String(server?.status || "").toLowerCase();
  return status === "online" || status === "online_process_only" || serverPlayersOnline(server) > 0;
}

function updateHeroServerSummary(serverStatus = serverStatusData) {
  const onlineCountEl = document.getElementById("servers-online-count");
  const onlineButtonEl = document.getElementById("hero-server-online-stat");
  const totalPlayersEl = document.getElementById("serverPlayersValue");
  const items = getServerStatusItems(serverStatus);
  const onlineCount = items.filter(item => serverIsOnline(item.server)).length;
  const totalPlayers = Number.isFinite(serverStatus?.players_online)
    ? serverStatus.players_online
    : items.reduce((sum, item) => sum + serverPlayersOnline(item.server), 0);

  if (onlineCountEl) onlineCountEl.textContent = onlineCount;
  if (totalPlayersEl) totalPlayersEl.textContent = totalPlayers;
  if (onlineButtonEl) {
    onlineButtonEl.title = t("serversOnlineTooltip");
    onlineButtonEl.setAttribute("aria-label", t("serversOnlineTooltip"));
  }
}

function getServerCardBackgroundKey(key, index = 0) {
  const normalized = String(key || "").toLowerCase();
  if (normalized.includes("spa")) return "spa";
  if (normalized.includes("nurburgring_24") || normalized.includes("nord")) return "nurburgring24h";
  if (normalized.includes("nord") || normalized.includes("nurb")) return "nurburgring";
  if (normalized.includes("silverstone")) return "silverstone";
  if (normalized.includes("monza")) return "monza";
  if (normalized === "main") return "main";
  if (normalized === "hourly" || normalized === "sunset") return "sunset";
  return index % 2 === 0 ? "main" : "sunset";
}

function getServerTrackBackgroundKey(key, label, server, index = 0) {
  const haystack = `${key || ""} ${label || ""} ${server?.track_code || ""} ${server?.track || ""}`.toLowerCase();
  if (haystack.includes("spa")) return "spa";
  if (haystack.includes("nurburgring_24") || haystack.includes("nord")) return "nurburgring24h";
  if (haystack.includes("nord") || haystack.includes("nurburgring_24h") || haystack.includes("nurb")) return "nurburgring";
  if (haystack.includes("silverstone")) return "silverstone";
  if (haystack.includes("monza")) return "monza";
  return getServerCardBackgroundKey(key, index);
}

function getServerConnectFallback(key) {
  if (key === "hourly") return ACC_CONNECT_SERVER_FALLBACKS.hourly;
  return ACC_CONNECT_SERVER_FALLBACKS.main;
}

function renderServerStickyWidget(serverStatus = serverStatusData) {
  const cardsEl = document.querySelector(".server-sticky-cards");
  if (!cardsEl) return;

  const items = getServerStatusItems(serverStatus);
  if (topLoadState.home && !items.length) {
    cardsEl.innerHTML = renderLoadingMarkup(t("loading"));
    return;
  }
  if (!items.length) {
    cardsEl.innerHTML = "";
    return;
  }

  cardsEl.innerHTML = items.map(({ key, label, server }, index) => {
    const status = String(server?.status || "offline").toLowerCase();
    const players = serverPlayersOnline(server);
    const sessionLabel = getServerSessionShortLabel(server);
    const bgKey = getServerTrackBackgroundKey(key, label, server, index);
    const bgUrl = SERVER_CARD_BACKGROUNDS[bgKey] || SERVER_CARD_BACKGROUNDS.main;
    return `
      <div
        class="server-sticky-card server-sticky-card-${escapeHtml(bgKey)} server-sticky-card-clickable"
        data-server-key="${escapeHtml(key)}"
        role="button"
        tabindex="0"
        aria-controls="server-players-modal"
        style="--server-card-bg: url('${escapeHtml(bgUrl)}')"
      >
        <div class="server-sticky-card-overlay"></div>
        <div class="server-sticky-card-content">
          <div class="server-sticky-card-name">${escapeHtml(label)}</div>
          <div class="server-sticky-card-status">
            <span class="server-status ${escapeHtml(status === "online" ? "online" : status === "online_process_only" ? "degraded" : "offline")}">${escapeHtml(getLocalizedServerStatus(status, currentLang))}</span>
            <span class="server-players">${escapeHtml(players)}${sessionLabel ? ` <span class="server-session-mini">(${escapeHtml(sessionLabel)})</span>` : ""}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderServerStatusSummaryModal(titleEl, subtitleEl, listEl) {
  const items = getServerStatusItems(serverStatusData);
  titleEl.textContent = t("serversWidgetTitle");
  subtitleEl.textContent = replaceTokens(t("playersOnlineUpdated"), {
    time: formatDateTimeLocal(serverStatusData?.updated_at, currentLang) || "-"
  });

  if (!items.length) {
    listEl.innerHTML = `<div class="empty-box">${escapeHtml(t("playersOnlineEmpty"))}</div>`;
    return;
  }

  listEl.innerHTML = items.map(({ label, server }) => {
    const players = serverPlayersOnline(server);
    const status = String(server?.status || "offline").toLowerCase();
    const serverLabel = appendServerSessionLabel(label, server);
    return `
      <article class="server-player-row server-status-row">
        <div class="server-player-main">
          <div class="server-player-name">${escapeHtml(serverLabel)}</div>
          <div class="server-player-meta">
            <span>${escapeHtml(getLocalizedServerStatus(status, currentLang))}</span>
          </div>
        </div>
        <div class="server-status-row-count">
          <strong>${escapeHtml(players)}</strong>
          <span>${escapeHtml(t("serverPlayersCountLabel"))}</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderSelectedServerPlayersModal(titleEl, subtitleEl, listEl) {
  const items = getServerStatusItems(serverStatusData);
  const selected = items.find(item => item.key === selectedServerPlayersKey) || items.find(item => item.key === "main") || items[0];
  const server = selected?.server || null;
  const drivers = getServerDrivers(server);
  titleEl.textContent = appendServerSessionLabel(selected?.label || t("playersOnlineTitle"), server);
  subtitleEl.textContent = replaceTokens(t("playersOnlineUpdated"), {
    time: formatDateTimeLocal(server?.updated_at || serverStatusData?.updated_at, currentLang) || "-"
  });

  if (!drivers.length) {
    listEl.innerHTML = `<div class="empty-box">${escapeHtml(t("playersOnlineEmpty"))}</div>`;
    return;
  }

  listEl.innerHTML = drivers.map((driver, index) => {
    const raceNumber = driver.raceNumber ?? driver.car_number ?? driver.race_number;
    const carName = getResultCarName(driver);
    return `
      <article class="server-player-row">
        <div class="server-player-position">${escapeHtml(driver.position || index + 1)}</div>
        <div class="server-player-main">
          <div class="server-player-name">${escapeHtml(driver.name || "-")}</div>
          <div class="server-player-meta">
            ${raceNumber != null ? `<span>#${escapeHtml(raceNumber)}</span>` : ""}
            <span>${escapeHtml(carName)}</span>
          </div>
        </div>
        ${renderCarImage(driver, { className: "car-thumb car-thumb-inline server-player-car", alt: carName })}
      </article>
    `;
  }).join("");
}

function renderServerPlayersModal() {
  const titleEl = document.getElementById("server-players-title");
  const subtitleEl = document.getElementById("server-players-subtitle");
  const listEl = document.getElementById("server-players-list");
  if (!titleEl || !subtitleEl || !listEl) return;

  if (serverPlayersModalMode === "summary") {
    renderServerStatusSummaryModal(titleEl, subtitleEl, listEl);
    return;
  }

  renderSelectedServerPlayersModal(titleEl, subtitleEl, listEl);
}

function initServerPlayersModal() {
  serverPlayersModalController = createModalController({
    modalId: "server-players-modal",
    closeButtonId: "server-players-close",
    onOpen: renderServerPlayersModal
  });

  const cardsEl = document.querySelector(".server-sticky-cards");
  const heroCardEl = document.getElementById("hero-server-online-stat");

  if (cardsEl && cardsEl.dataset.playersModalBound !== "true") {
    const openFromCard = (card) => {
      selectedServerPlayersKey = card?.dataset?.serverKey || "main";
      serverPlayersModalMode = "serverPlayers";
      serverPlayersModalController?.open(card);
    };
    cardsEl.addEventListener("click", (event) => {
      if (event?.target?.closest?.("a, button")) return;
      const card = event.target?.closest?.(".server-sticky-card-clickable");
      if (!card) return;
      openFromCard(card);
    });
    cardsEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target?.closest?.("a, button")) return;
      const card = event.target?.closest?.(".server-sticky-card-clickable");
      if (!card) return;
      event.preventDefault();
      openFromCard(card);
    });
    cardsEl.dataset.playersModalBound = "true";
  }

  if (heroCardEl && heroCardEl.dataset.playersModalBound !== "true") {
    heroCardEl.addEventListener("click", () => {
      serverPlayersModalMode = "summary";
      serverPlayersModalController?.open(heroCardEl);
    });
    heroCardEl.dataset.playersModalBound = "true";
  }
}

function updateServerCardBackgrounds() {
  const mainCard = document.getElementById("server-card-main");
  const sunsetCard = document.getElementById("server-card-sunset");
  if (mainCard) mainCard.style.setProperty("--server-card-bg", `url("${SERVER_CARD_BACKGROUNDS.main}")`);
  if (sunsetCard) sunsetCard.style.setProperty("--server-card-bg", `url("${SERVER_CARD_BACKGROUNDS.sunset}")`);
}

function humanizeTrackName(track) {
  if (!track) return "-";
  return String(track)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function isValidRaceTime(value) {
  return typeof value === "number" && value > 0 && value !== 2147483647 && value !== 4294967295;
}

function isActiveRaceResult(row) {
  if (!row || row.counted_for_stats === false) return false;
  if ((row.lap_count ?? 0) <= 0) return false;
  if (!isValidRaceTime(row.total_time_ms)) return false;
  return true;
}

function getResultCarName(row) {
  if (!row) return "-";
  if (row.car_name) return row.car_name;
  if (row.car_model != null && carModelNames[row.car_model]) return carModelNames[row.car_model];
  if (row.car_model_id != null && carModelNames[row.car_model_id]) return carModelNames[row.car_model_id];
  return "-";
}

function normalizeCarModelName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

function getCarModelId(row) {
  if (!row || typeof row !== "object") return null;

  const candidates = [
    row.car_model,
    row.car_model_id,
    row.best_lap_car_model,
    row.best_lap_car_model_id,
    row.carModel,
    row.carModelId
  ];

  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isInteger(numeric) && numeric >= 0 && carModelNames[numeric]) return numeric;
  }

  const nameCandidates = [
    row.car_name,
    row.best_lap_car_name,
    row.carName,
    row.bestLapCarName
  ]
    .map(normalizeCarModelName)
    .filter(Boolean);

  for (const [modelId, modelName] of Object.entries(carModelNames)) {
    if (nameCandidates.includes(normalizeCarModelName(modelName))) return Number(modelId);
  }

  return null;
}

function getCarImagePathByModelId(modelId, extension = "png") {
  if (!Number.isInteger(modelId) || modelId < 0) return "";
  return `${CAR_IMAGE_BASE_PATH}/${modelId}.${extension}`;
}

function renderCarImage(row, options = {}) {
  const {
    className = "car-thumb",
    alt = "",
    extension = "png"
  } = options;
  const modelId = getCarModelId(row);
  if (modelId == null) return "";

  const imagePath = getCarImagePathByModelId(modelId, extension);
  const imageAlt = alt || getResultCarName(row);

  return `<img class="${escapeHtml(className)}" src="${escapeHtml(imagePath)}" alt="${escapeHtml(imageAlt)}" loading="lazy" decoding="async" onerror="this.remove()">`;
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function updatePageQuery(params = {}) {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "" || value === "0") {
      url.searchParams.delete(key);
      return;
    }
    url.searchParams.set(key, value);
  });
  window.history.replaceState({}, "", url);
}

function getActiveFilterChips(items = []) {
  return items
    .filter(item => item && item.value)
    .map(item => `<span class="filter-chip"><span class="filter-chip-label">${escapeHtml(item.label)}:</span> ${escapeHtml(item.value)}</span>`)
    .join("");
}

function renderFilterMeta(containerId, { items = [], count = 0, onClearId = "" }) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const chips = getActiveFilterChips(items);
  const hasFilters = Boolean(chips);
  el.classList.toggle("is-empty", !hasFilters);
  el.innerHTML = `
    <div class="filter-meta-left">
      <div class="filter-meta-count">${escapeHtml(replaceTokens(t("resultsCount"), { count }))}</div>
      ${hasFilters ? `<div class="filter-chip-row">${chips}</div>` : ""}
    </div>
    ${hasFilters ? `<button class="btn btn-secondary btn-filter-clear" type="button" id="${escapeHtml(onClearId)}">${escapeHtml(t("clearFilters"))}</button>` : ""}
  `;

  if (!hasFilters || !onClearId) return;
  document.getElementById(onClearId)?.addEventListener("click", () => {
    if (containerId === "races-tools-meta") {
      racesSearch = "";
      racesTrackFilter = "";
      updatePageQuery({ q: null, track: null });
      renderRacesPage();
      return;
    }

    if (containerId === "cars-tools-meta") {
      carsSearch = "";
      carsMinRacesFilter = "0";
      updatePageQuery({ car: null, minRaces: null });
      renderCarsPage();
    }
  });
}

function filterRaces(data) {
  return [...data];
}

function getProcessedRaces() {
  if (racesArchiveMeta) {
    return Array.isArray(racesData) ? racesData : [];
  }
  return sortData(filterRaces(racesData), { key: "finished_at", direction: "desc" }, racesColumns);
}

function filterCars(data) {
  return [...data];
}

function renderRacesFilters() {
  return;
}

function renderCarsFilters() {
  return;
}

function renderRacesSummary() {
  const totalEl = document.getElementById("races-total-count");
  const avgActiveEl = document.getElementById("races-avg-active");
  const avgOvertakesEl = document.getElementById("races-avg-overtakes");
  const topWinnerEl = document.getElementById("races-top-winner");
  const winnerEl = document.getElementById("races-latest-winner");
  const lastWinnerBestLapEl = document.getElementById("races-last-winner-best-lap");
  const lastWinnerBestLapNoteEl = document.getElementById("races-last-winner-best-lap-note");
  if (!totalEl || !avgActiveEl || !avgOvertakesEl || !topWinnerEl || !winnerEl || !lastWinnerBestLapEl || !lastWinnerBestLapNoteEl) return;

  const processedRaces = getProcessedRaces();
  const latestRace = processedRaces[0];
  if (racesArchiveSummary) {
    const topWinner = racesArchiveSummary.top_winner || null;
    const latestSummaryRace = racesArchiveSummary.latest_race || latestRace || null;
    totalEl.textContent = racesArchiveSummary.total_races || racesArchiveSummary.total_items || "-";
    avgActiveEl.textContent = racesArchiveSummary.average_active_drivers ?? "-";
    avgOvertakesEl.textContent = racesArchiveSummary.average_overtakes ?? "-";
    topWinnerEl.innerHTML = topWinner
      ? renderDriverLink(topWinner.name || t("noWinner"), topWinner.public_id, "driver-link")
      : t("noWinner");
    winnerEl.innerHTML = latestSummaryRace
      ? renderDriverLink(latestSummaryRace.winner || t("noWinner"), latestSummaryRace.winner_public_id, "driver-link")
      : t("noWinner");
    lastWinnerBestLapEl.textContent = latestSummaryRace?.winner_best_lap || latestSummaryRace?.best_lap || "-";
    lastWinnerBestLapNoteEl.textContent = latestSummaryRace?.winner_best_lap_car_name || latestSummaryRace?.best_lap_car_name || "";
    return;
  }

  const winnerCounts = new Map();
  let activeDriversTotal = 0;
  let overtakesTotal = 0;

  processedRaces.forEach(race => {
    if (race?.winner) {
      const key = race.winner_public_id || race.winner;
      const existing = winnerCounts.get(key) || { count: 0, name: race.winner, publicId: race.winner_public_id };
      existing.count += 1;
      winnerCounts.set(key, existing);
    }

    const activeResults = (race.results || []).filter(isActiveRaceResult);
    activeDriversTotal += activeResults.length;
    overtakesTotal += activeResults.reduce((sum, row) => sum + Math.max(0, row?.positions_delta ?? 0), 0);
  });

  const topWinner = [...winnerCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0] || null;
  const latestWinnerRow = latestRace
    ? (latestRace.results || []).find(row =>
        (latestRace.winner_public_id && row.public_id === latestRace.winner_public_id) ||
        row.driver === latestRace.winner
      )
    : null;
  const latestWinnerCarName = getResultCarName(latestWinnerRow);

  
  totalEl.textContent = processedRaces.length || "-";
  avgActiveEl.textContent = processedRaces.length ? (activeDriversTotal / processedRaces.length).toFixed(2) : "-";
  avgOvertakesEl.textContent = processedRaces.length ? (overtakesTotal / processedRaces.length).toFixed(2) : "-";
  topWinnerEl.innerHTML = topWinner
    ? renderDriverLink(topWinner.name || t("noWinner"), topWinner.publicId, "driver-link")
    : t("noWinner");
  winnerEl.innerHTML = latestRace
    ? renderDriverLink(latestRace.winner || t("noWinner"), latestRace.winner_public_id, "driver-link")
    : t("noWinner");
  lastWinnerBestLapEl.textContent = latestWinnerRow?.best_lap || "-";
  lastWinnerBestLapNoteEl.textContent = latestWinnerCarName;
}

function renderRacesTablePage() {
  const tableEl = document.getElementById("races-table");
  const wrapEl = document.getElementById("races-pagination-wrap");
  if (!tableEl || !wrapEl) return;

  const isV2PagedArchive = Boolean(racesArchiveMeta);
  const result = isV2PagedArchive
    ? {
        items: getProcessedRaces(),
        page: racesArchiveMeta.page || racesPage,
        totalPages: racesArchiveMeta.total_pages || 1,
        totalItems: racesArchiveMeta.total_items || 0,
        startIndex: racesArchiveMeta.start_index || 0,
        endIndex: racesArchiveMeta.end_index || 0,
      }
    : paginate(getProcessedRaces(), racesPage, PAGE_SIZE);
  racesPage = result.page;

  if (!result.totalItems) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("emptyRaces"))}</div>`;
    wrapEl.style.display = "none";
    return;
  }

  const headers = t("racesCols").map(label => `<th>${escapeHtml(label)}</th>`).join("");
  const rows = result.items.map((race, index) => `
    <tr
      class="is-interactive-row"
      data-race-index="${escapeHtml(index)}"
      tabindex="0"
      role="button"
      aria-label="${escapeHtml(`${t("openRaceDetailsLabel")}: ${humanizeTrackName(race.track)}`)}"
    >
      <td>${escapeHtml(formatDateTimeLocal(race.finished_at, currentLang))}</td>
      <td>
        <div class="race-track-cell">
          <span class="race-track-name">${escapeHtml(humanizeTrackName(race.track))}</span>
          
        </div>
      </td>
      <td><span class="race-winner">${renderDriverLink(race.winner || t("noWinner"), race.winner_public_id, "driver-link")}</span></td>
      <td>${escapeHtml(race.participants_count ?? "-")}</td>
      <td>${escapeHtml(race.average_elo ?? "-")}</td>
      <td>
        <div>${escapeHtml(race.best_lap || "-")}</div>
        <div class="race-note">${renderDriverLink(race.best_lap_driver || "-", race.best_lap_public_id, "driver-link driver-link-subtle")}</div>
      </td>
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table class="races-table">
      <thead>
        <tr>${headers}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  bindInteractiveRows(tableEl, "tbody tr[data-race-index]", (row) => {
    const index = Number(row.dataset.raceIndex);
    openRaceResultsModal(result.items[index] || null, row);
  });

  renderPagination(
    "races-pagination",
    "races-pagination-info",
    "races-pagination-wrap",
    result.page,
    result.totalPages,
    result.totalItems,
    result.startIndex,
    result.endIndex,
    (page) => {
      racesPage = page;
      if (isV2PagedArchive) {
        tableEl.innerHTML = `<div class="loading">${escapeHtml(t("loading"))}</div>`;
        loadRacesPageData(page)
          .then((items) => {
            racesData = items;
            renderRacesPage();
            document.getElementById("races-table")?.scrollIntoView({ behavior: "smooth", block: "center" });
          })
          .catch((error) => {
            console.warn("Failed to load races page.", error);
            renderRacesTablePage();
          });
        return;
      }
      renderRacesTablePage();
      document.getElementById("races-table")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  );
}

function renderRaceDriverIdentity(row) {
  const eloSource = getEloInfo(row) ? row : findEloSource(row.public_id, row.player_id);
  const eloBadge = renderEloBadge(eloSource, { compact: true });
  const raceNumber = row.race_number != null ? `#${row.race_number}` : "";
  return `
    <div class="driver-cell">
      <div class="driver-avatar">${escapeHtml(initials(row.driver))}</div>
      <div class="driver-name-wrap">
        <div class="race-driver-title">
          <span class="driver-name">${renderDriverLink(row.driver, row.public_id, "driver-link", row.player_id)}</span>
        </div>
        <div class="race-driver-meta-line">
          ${raceNumber ? `<span class="race-note">${escapeHtml(raceNumber)}</span>` : ""}
          ${eloBadge ? `<span class="race-driver-elo">${eloBadge}</span>` : ""}
        </div>
      </div>
    </div>
  `;
}

function renderRaceResultsModal() {
  const titleEl = document.getElementById("race-results-title");
  const subtitleEl = document.getElementById("race-results-subtitle");
  const summaryEl = document.getElementById("race-modal-summary");
  const tableEl = document.getElementById("race-results-table");

  if (!titleEl || !subtitleEl || !summaryEl || !tableEl) return;

  if (!selectedRace) {
    titleEl.textContent = "-";
    subtitleEl.textContent = "-";
    summaryEl.innerHTML = "";
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("emptyRaces"))}</div>`;
    return;
  }

  const raceCountedLabel = selectedRace.counted_for_stats === false
    ? t("notCountedBadge")
    : selectedRace.counted_for_stats === true
      ? t("countedBadge")
      : "-";
  titleEl.textContent = humanizeTrackName(selectedRace.track);
  subtitleEl.textContent = `${formatDateTimeLocal(selectedRace.finished_at, currentLang)} / ${raceCountedLabel}`;

  summaryEl.innerHTML = `
    <div class="race-summary-card">
      <div class="race-summary-label">${escapeHtml(t("raceSummaryTrack"))}</div>
      <div class="race-summary-value">${escapeHtml(humanizeTrackName(selectedRace.track))}</div>
    </div>
    <div class="race-summary-card">
      <div class="race-summary-label">${escapeHtml(t("raceSummaryWinner"))}</div>
      <div class="race-summary-value">${renderDriverLink(selectedRace.winner || t("noWinner"), selectedRace.winner_public_id, "driver-link")}</div>
    </div>
    <div class="race-summary-card">
      <div class="race-summary-label">${escapeHtml(t("raceSummaryDrivers"))}</div>
      <div class="race-summary-value">${escapeHtml(selectedRace.participants_count ?? "-")}</div>
    </div>
    <div class="race-summary-card">
      <div class="race-summary-label">${escapeHtml(t("raceSummaryBestLap"))}</div>
      <div class="race-summary-value best-lap-value">${escapeHtml(selectedRace.best_lap || "-")}</div>
    </div>
  `;

  const raceResults = Array.isArray(selectedRace.results) ? selectedRace.results : [];
  if (!raceResults.length) {
    tableEl.innerHTML = selectedRace._detailsLoading
      ? `<div class="loading">${escapeHtml(t("loading"))}</div>`
      : `<div class="empty-box">${escapeHtml(selectedRace._detailsError ? t("errorLoading") : t("emptyRaces"))}</div>`;
    return;
  }

  const headers = t("raceModalCols").map(label => `<th>${escapeHtml(label)}</th>`).join("");
  const highlightedDriverPublicId = IS_DRIVER_PAGE ? driverProfileData?.public_id : null;
  const rows = raceResults.map(row => {
    const rowWithRaceId = row.race_id ? row : { ...row, race_id: selectedRace?.race_id };
    return `
    <tr class="${rowWithRaceId.public_id && highlightedDriverPublicId && rowWithRaceId.public_id === highlightedDriverPublicId ? "race-result-row-highlight" : ""}">
      <td>${renderRankBadgeWithTrend(row.position, row.rank_change)}</td>
      <td>${escapeHtml(formatStartPosition(row))}</td>
      <td>${renderPositionsDelta(row.positions_delta)}</td>
      <td>${renderRaceDriverIdentity(rowWithRaceId)}</td>
      <td>
        <div class="${getBestLapClass(Boolean(row.had_best_lap))}">${escapeHtml(row.best_lap || "-")}</div>
        <div class="race-note">${row.had_best_lap ? escapeHtml(t("raceBestLapBadge")) : ""}</div>
      </td>
      <td class="race-result-car-cell">
        <div>${renderCarLink(row.car_name || "-", "driver-link driver-link-subtle")}</div>
        <div class="race-note">${row.counted_for_stats === false ? escapeHtml(t("notCountedBadge")) : ""}</div>
      </td>
      <td>${escapeHtml(row.gap || (row.position === 1 ? "-" : "-"))}</td>
      <td>${renderEloDeltaCell(row)}</td>
      <td>${renderSafetyRaceCell(rowWithRaceId)}</td>
      <td>${escapeHtml(row.points ?? 0)}</td>
    </tr>
  `;
  }).join("");

  tableEl.innerHTML = `
    <table>
      <thead>
        <tr>${headers}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

let raceResultsModalController = null;
let driverOfDayModalController = null;
let todayStatsModalController = null;

function openRaceResultsModal(race, trigger = null) {
  if (!raceResultsModalController || !race) return;
  const hasInlineResults = Array.isArray(race.results) && race.results.length;
  selectedRace = {
    ...race,
    _detailsLoading: !hasInlineResults,
    _detailsError: false,
  };
  raceResultsModalController.open(trigger);

  if (hasInlineResults) return;

  loadRaceDetailsCached(race)
    .then((details) => {
      const activeRaceId = normalizeRaceIdentity(selectedRace?.race_id || selectedRace?.source_file);
      const loadedRaceId = normalizeRaceIdentity(details?.race_id || details?.source_file);
      if (!details || !activeRaceId || activeRaceId !== loadedRaceId) return;
      selectedRace = mergeRaceDetails(race, details);
      renderRaceResultsModal();
    })
    .catch((error) => {
      const activeRaceId = normalizeRaceIdentity(selectedRace?.race_id || selectedRace?.source_file);
      const failedRaceId = normalizeRaceIdentity(race?.race_id || race?.source_file);
      if (activeRaceId && failedRaceId && activeRaceId === failedRaceId) {
        selectedRace = {
          ...selectedRace,
          _detailsLoading: false,
          _detailsError: true,
        };
        renderRaceResultsModal();
      }
      console.warn("Failed to load race details.", error);
    });
}

function initRaceResultsModal() {
  raceResultsModalController = createModalController({
    modalId: "race-results-modal",
    closeButtonId: "race-results-close",
    onOpen: renderRaceResultsModal,
    onClose: () => {
      selectedRace = null;
    }
  });
}

function initDriverPreviewModal() {
  driverPreviewModalController = createModalController({
    modalId: "driver-preview-modal",
    closeButtonId: "driver-preview-close",
    onOpen: renderDriverPreviewModal,
    onClose: () => {
      driverPreviewState = null;
      renderDriverPreviewModal();
    }
  });
}

function renderRacesPage() {
  if (topLoadState.races) {
    setLoadingMarkup("races-table", "loading");
    renderRaceResultsModal();
    return;
  }
  renderRacesSummary();
  renderRacesTablePage();
  renderRaceResultsModal();
}

function getRaceById(raceId) {
  if (!raceId || !Array.isArray(racesData)) return null;
  return racesData.find(race => race?.race_id === raceId) || null;
}

function renderCarsSummary() {
  const totalEl = document.getElementById("cars-total-count");
  const winnerEl = document.getElementById("cars-top-winner");
  const usedEl = document.getElementById("cars-most-used");
  const spotlightEl = document.getElementById("cars-hero-spotlight");
  const spotlightMediaEl = document.getElementById("cars-hero-spotlight-media");
  const spotlightNameEl = document.getElementById("cars-hero-spotlight-name");
  const spotlightRacesEl = document.getElementById("cars-hero-spotlight-races");
  const spotlightWinsEl = document.getElementById("cars-hero-spotlight-wins");
  if (!totalEl || !winnerEl) return;

  const processedCars = getProcessedCars();
  totalEl.textContent = processedCars.length || "—";
  const topWinner = processedCars[0] || null;
  const mostUsed = [...processedCars].sort((a, b) => {
    const racesDiff = (b?.races ?? 0) - (a?.races ?? 0);
    if (racesDiff !== 0) return racesDiff;
    return String(a?.car_name || "").localeCompare(String(b?.car_name || ""));
  })[0] || null;

  winnerEl.innerHTML = topWinner ? renderCarLink(topWinner.car_name, "driver-link") : "—";
  if (usedEl) {
    usedEl.innerHTML = mostUsed ? renderCarLink(mostUsed.car_name, "driver-link") : "—";
  }

  if (spotlightEl && spotlightMediaEl && spotlightNameEl && spotlightRacesEl && spotlightWinsEl) {
    if (mostUsed) {
      spotlightEl.hidden = false;
      spotlightMediaEl.innerHTML = renderCarImage(
        mostUsed,
        { className: "cars-hero-spotlight-image", alt: mostUsed.car_name || "" }
      );
      spotlightNameEl.innerHTML = renderCarLink(mostUsed.car_name || "—", "driver-link");
      spotlightRacesEl.textContent = String(mostUsed.races ?? 0);
      spotlightWinsEl.textContent = String(mostUsed.wins ?? 0);
    } else {
      spotlightEl.hidden = true;
      spotlightMediaEl.innerHTML = "";
      spotlightNameEl.textContent = "—";
      spotlightRacesEl.textContent = "—";
      spotlightWinsEl.textContent = "—";
    }
  }
}

function renderCarsPage() {
  if (topLoadState.cars) {
    setLoadingMarkup("cars-table", "loading");
    return;
  }
  renderCarsSummary();
  renderCarsTable();
}

function renderCarsTable() {
  const tableEl = document.getElementById("cars-table");
  if (!tableEl) return;

  const rowsData = getProcessedCars();
  const fastestLapMs = getFastestLapMs(rowsData);

  if (!rowsData.length) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("emptyRaces"))}</div>`;
    return;
  }

  const headers = t("carsCols").map((label, index) => `
    <th class="sortable ${getSortClass(carsSort, carsColumns[index].key)}" data-sort-key="${carsColumns[index].key}" tabindex="0" role="button" aria-sort="${getAriaSort(carsSort, carsColumns[index].key)}">
      ${escapeHtml(label)}
    </th>
  `).join("");

  const rows = rowsData.map(row => `
    <tr>
      <td><span class="car-label-inline">${renderCarImage(row, { className: "car-thumb car-thumb-inline", alt: row.car_name || "" })}${renderCarLink(row.car_name || "—", "driver-link")}</span></td>
      <td>${escapeHtml(row.races ?? 0)}</td>
      <td>${escapeHtml(row.wins ?? 0)}</td>
      <td>${escapeHtml(formatPercent(row.win_rate))}</td>
      <td>${escapeHtml(row.podiums ?? 0)}</td>
      <td>${escapeHtml(row.unique_drivers ?? 0)}</td>
      <td>${escapeHtml(formatAverageFinish(row.average_finish))}</td>
      <td>${escapeHtml(row.fastest_lap_awards ?? 0)}</td>
      <td>
        <div class="${getBestLapClass(row.best_lap_ms === fastestLapMs)}">${escapeHtml(row.best_lap || "—")}</div>
        <div class="race-note">${renderDriverLink(row.best_lap_driver || "—", row.best_lap_public_id, "driver-link driver-link-subtle")}</div>
      </td>
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table>
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  bindSortableHeaders("#cars-table th.sortable", carsSort, (key) => {
    carsSort = cycleSort(carsSort, key);
    renderCarsTable();
  });
}

function renderBansSummary() {
  const totalEl = document.getElementById("bans-total-count");
  const latestEl = document.getElementById("bans-latest-date");

  if (totalEl) {
    totalEl.textContent = String(bansData.length || 0);
  }

  if (latestEl) {
    latestEl.textContent = bansData[0]?.banned_at
      ? formatDateTimeLocal(bansData[0].banned_at, currentLang)
      : "—";
  }
}

function renderBansTable() {
  const tableEl = document.getElementById("bans-table");
  if (!tableEl) return;

  if (!bansData.length) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("bansEmpty"))}</div>`;
    return;
  }

  const headers = t("bansCols").map(label => `<th>${escapeHtml(label)}</th>`).join("");
  const rows = bansData.map(item => `
    <tr>
      <td>${escapeHtml(item.name || "—")}</td>
      <td>${escapeHtml(item.banned_at ? formatDateTimeLocal(item.banned_at, currentLang) : "—")}</td>
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table>
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderBansPage() {
  if (topLoadState.bans) {
    setLoadingMarkup("bans-table", "loading");
    return;
  }

  renderBansSummary();
  renderBansTable();
}

function renderRecentForm(items = []) {
  if (!Array.isArray(items) || !items.length) return `<span class="empty-inline">-</span>`;
  return items.map(item => `<span class="form-pill">${escapeHtml(item)}</span>`).join("");
}

function buildDriverHeroTitle(profile) {
  if (!profile) return "-";
  const rankInfo = getDriverRankInfo(profile);
  const eloSource = getEloInfo(profile) ? profile : findEloSource(profile.public_id, profile.player_id);
  return `
    <span class="driver-title-name">${escapeHtml(profile.driver || "-")}</span>
    ${renderEloBadge(eloSource, { showCategoryName: true })}
    ${rankInfo ? `<span class="driver-rank-pill ${escapeHtml(rankInfo.rankClass)}" title="${escapeAttribute(t("driverRankingPosition"))}"><span class="driver-rank-label">${escapeHtml(t("driverRankingPosition"))}:</span><span class="driver-rank-value">#${escapeHtml(rankInfo.rank)}</span>${renderTrendBadge(rankInfo.change, "championship_rank", { compact: true })}</span>` : ""}
  `;
}

function getDriverSelectionKey(profile) {
  return String(profile?.public_id || profile?.player_id || profile?.driver || "driver");
}

function getBestLapTrackItems(profile) {
  const items = Array.isArray(profile?.best_laps_by_track)
    ? profile.best_laps_by_track
    : Array.isArray(profile?.bestlap_tracks)
      ? profile.bestlap_tracks
      : [];
  return items
    .map(item => {
      const trackCode = String(item?.track_code || item?.track || item?.best_lap_track || "").trim();
      if (!trackCode) return null;
      const lapMs = Number(item?.best_lap_ms || 0);
      const lapLabel = item?.best_lap || (lapMs > 0 ? formatLapTimeFromMs(lapMs) : "");
      if (!lapLabel) return null;
      return {
        ...item,
        track_code: trackCode,
        best_lap: lapLabel,
        best_lap_ms: lapMs > 0 ? lapMs : null,
        car_name: item?.best_lap_car_name || item?.car_name || item?.car_name_raw || item?.best_lap_car_name_raw || ""
      };
    })
    .filter(Boolean);
}

function getSelectedBestLapTrack(profile, items) {
  if (!items.length) return null;
  const key = getDriverSelectionKey(profile);
  const selected = bestLapTrackSelection.get(key);
  return items.find(item => item.track_code === selected) || items[0];
}

function renderBestLapTrackSelect(profile, items, selectedTrackCode) {
  if (items.length <= 1) return "";
  const key = getDriverSelectionKey(profile);
  const options = items.map(item => `
    <option value="${escapeAttribute(item.track_code)}" ${item.track_code === selectedTrackCode ? "selected" : ""}>${escapeHtml(humanizeTrackName(item.track_code))}</option>
  `).join("");
  return `
    <select class="driver-stat-track-select" data-bestlap-track="${escapeAttribute(key)}" title="${escapeAttribute(t("driverSummaryBestLapTrack"))}" aria-label="${escapeAttribute(t("driverSummaryBestLapTrack"))}">
      ${options}
    </select>
  `;
}

function getAveragePaceTrackItems(profile) {
  const items = Array.isArray(profile?.average_pace_by_track)
    ? profile.average_pace_by_track
    : Array.isArray(profile?.average_pace_tracks)
      ? profile.average_pace_tracks
      : [];
  return items
    .map(item => {
      const trackCode = String(item?.track_code || item?.track || "").trim();
      if (!trackCode) return null;
      const paceMs = Number(item?.average_pace_ms || 0);
      const paceLabel = item?.average_pace || (paceMs > 0 ? formatLapTimeFromMs(paceMs) : "");
      if (!paceLabel) return null;
      return {
        ...item,
        track_code: trackCode,
        average_pace: paceLabel,
        average_pace_ms: paceMs > 0 ? paceMs : null,
        sample_races: Number(item?.sample_races || 0)
      };
    })
    .filter(Boolean);
}

function getAveragePaceSelectionKey(profile) {
  return getDriverSelectionKey(profile);
}

function getSelectedAveragePaceTrack(profile, items) {
  if (!items.length) return null;
  const key = getAveragePaceSelectionKey(profile);
  const selected = averagePaceTrackSelection.get(key);
  return items.find(item => item.track_code === selected) || items[0];
}

function renderAveragePaceTrackSelect(profile, items, selectedTrackCode) {
  if (items.length <= 1) return "";
  const key = getAveragePaceSelectionKey(profile);
  const options = items.map(item => `
    <option value="${escapeAttribute(item.track_code)}" ${item.track_code === selectedTrackCode ? "selected" : ""}>${escapeHtml(humanizeTrackName(item.track_code))}</option>
  `).join("");
  return `
    <select class="driver-stat-track-select" data-average-pace-track="${escapeAttribute(key)}" title="${escapeAttribute(t("driverSummaryAvgPaceTrack"))}" aria-label="${escapeAttribute(t("driverSummaryAvgPaceTrack"))}">
      ${options}
    </select>
  `;
}

function buildDriverStatsMarkup(profile) {
  if (!profile) {
    return `<div class="empty-box">${escapeHtml(t("driverNoData"))}</div>`;
  }

  const summary = profile.summary || {};
  const favoriteCarName = getFavoriteCarName(profile);
  const favoriteCarMarkup = isDriverBanned(profile)
    ? renderBannedBadge()
    : renderCarLink(favoriteCarName || "-", "driver-link driver-link-heading");
  const bestLapTracks = getBestLapTrackItems(profile);
  const bestLapTrack = getSelectedBestLapTrack(profile, bestLapTracks);
  const bestLap = bestLapTrack?.best_lap || summary.best_lap || "-";
  const bestLapTrackCode = bestLapTrack?.track_code || summary.best_lap_track || "";
  const bestLapTrackSelect = renderBestLapTrackSelect(profile, bestLapTracks, bestLapTrackCode);
  const bestLapCar = bestLapTrack?.car_name || summary.best_lap_car_name || summary.car_name || "";
  const averagePaceTracks = getAveragePaceTrackItems(profile);
  const averagePaceTrack = getSelectedAveragePaceTrack(profile, averagePaceTracks);
  const averagePace = averagePaceTrack?.average_pace || summary.average_pace || "-";
  const averagePaceTrackCode = averagePaceTrack?.track_code || "";
  const averagePaceTrackSelect = renderAveragePaceTrackSelect(profile, averagePaceTracks, averagePaceTrackCode);
  return `
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryPoints"))}</div>
      <div class="driver-stat-value">${renderStatValueWithTrend(escapeHtml(summary.points ?? 0), summary.latest_changes?.points, "points")}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryAvgFinish"))}</div>
      <div class="driver-stat-value">${renderStatValueWithTrend(escapeHtml(summary.average_finish ?? "-"), summary.latest_changes?.average_finish, "average_finish")}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryAvgPoints"))}</div>
      <div class="driver-stat-value">${escapeHtml(summary.average_points_per_race ?? 0)}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryRaces"))}</div>
      <div class="driver-stat-value">${renderStatValueWithTrend(escapeHtml(summary.races ?? 0), summary.latest_changes?.races, "races")}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryWins"))}</div>
      <div class="driver-stat-value">${escapeHtml(summary.wins ?? 0)}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverWinRate"))}</div>
      <div class="driver-stat-value">${escapeHtml(summary.win_rate ?? 0)}%</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryAvgGain"))}</div>
      <div class="driver-stat-value">${renderStatValueWithTrend(renderPositionsDelta(summary.average_positions_delta), summary.latest_changes?.average_positions_delta, "average_positions_delta")}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryPodiums"))}</div>
      <div class="driver-stat-value">${renderStatValueWithTrend(escapeHtml(summary.podiums ?? 0), summary.latest_changes?.podiums, "podiums")}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverPodiumRate"))}</div>
      <div class="driver-stat-value">${escapeHtml(summary.podium_rate ?? 0)}%</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label driver-stat-label-with-control" title="${escapeAttribute(t("driverSummaryBestLapTooltip"))}">
        <span>${escapeHtml(t("driverSummaryBestLap"))}</span>
        ${bestLapTrackSelect}
      </div>
      <div class="driver-stat-mainline driver-stat-bestlap-mainline">
        <div class="driver-stat-value driver-stat-value-bestlap">${renderStatValueWithTrend(escapeHtml(bestLap), bestLapTrack ? null : summary.latest_changes?.best_lap_ms, "best_lap_ms")}</div>
        ${bestLapCar ? `<div class="driver-stat-side driver-stat-bestlap-car">${escapeHtml(bestLapCar)}</div>` : ""}
      </div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label driver-stat-label-with-control" title="${escapeAttribute(t("driverSummaryAvgPaceTooltip"))}">
        <span>${escapeHtml(t("driverSummaryAvgPace"))}</span>
        ${averagePaceTrackSelect}
      </div>
      <div class="driver-stat-value">${renderStatValueWithTrend(escapeHtml(averagePace), averagePaceTrack ? null : summary.latest_changes?.average_pace_ms, "average_pace_ms")}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverFavoriteCar"))}</div>
      <div class="driver-stat-value">${favoriteCarMarkup}</div>
    </div>
  `;
}

function renderCommunityTextBlocks(text) {
  const blocks = Array.isArray(text)
    ? text
    : String(text || "").split(/\n{2,}/);

  return blocks
    .map(block => {
      if (typeof block === "string") {
        const paragraph = block.trim();
        return paragraph ? `<p>${escapeHtml(paragraph)}</p>` : "";
      }

      if (!block || typeof block !== "object") return "";

      if (block.type === "list" && Array.isArray(block.items)) {
        const items = block.items
          .map(item => String(item || "").trim())
          .filter(Boolean)
          .map(item => `<li>${escapeHtml(item)}</li>`)
          .join("");
        return items ? `<ul>${items}</ul>` : "";
      }

      const paragraph = String(block.text || "").trim();
      return paragraph ? `<p>${escapeHtml(paragraph)}</p>` : "";
    })
    .join("");
}

function buildDriverHighlightsMarkup(profile) {
  if (!profile) return "";
  const summary = profile.summary || {};
  const safetySource = getSafetyInfo(profile) ? profile : findSafetySource(profile.public_id, profile.player_id);

  return `
    <div class="driver-highlight-card">
      <div class="driver-highlight-label">${escapeHtml(t("driverRecentForm"))}</div>
      <div class="driver-highlight-value">${renderRecentForm(profile.recent_form)}</div>
    </div>
    <div class="driver-highlight-card">
      <div class="driver-highlight-label">${escapeHtml(t("driverSummaryFastestLaps"))}</div>
      <div class="driver-highlight-value">${escapeHtml(summary.fastest_lap_awards ?? 0)}</div>
    </div>
    <div class="driver-highlight-card">
      <div class="driver-highlight-label">${escapeHtml(t("safetyRatingTitle"))}</div>
      <div class="driver-highlight-value">${renderSafetyBadge(safetySource) || `<span class="empty-inline">-</span>`}</div>
    </div>
  `;
}

function renderDriverRaceHistory() {
  const tableEl = document.getElementById("driver-races-table");
  if (!tableEl) return;

  const rawData = Array.isArray(driverProfileData?.race_history) ? driverProfileData.race_history : [];
  const countedData = rawData.filter(row => row?.counted_for_stats !== false && row?.counted_for_stats !== 0);
  const sortedData = sortData(countedData, driverRaceSort, driverRaceColumns);
  const result = paginate(sortedData, driverRacePage, PAGE_SIZE);
  driverRacePage = result.page;
  const rowsData = result.items;
  const fastestLapMs = getFastestLapMs(countedData);
  if (!rowsData.length) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("driverNoData"))}</div>`;
    const wrapEl = document.getElementById("driver-races-pagination-wrap");
    if (wrapEl) wrapEl.style.display = "none";
    return;
  }

  const headers = renderSortableHeaders(driverRaceColumns, t("driverRaceCols"), driverRaceSort);
  const rows = rowsData.map(row => `
    <tr
      class="is-interactive-row"
      data-race-id="${escapeAttribute(row.race_id || "")}"
      tabindex="0"
      role="button"
      aria-label="${escapeAttribute(`${t("openRaceDetailsLabel")}: ${humanizeTrackName(row.track)}`)}"
    >
      <td>${escapeHtml(formatDateTimeLocal(row.finished_at, currentLang))}</td>
      <td>${escapeHtml(humanizeTrackName(row.track))}</td>
      <td>${escapeHtml(formatStartPosition(row))}</td>
      <td>${renderStatValueWithTrend(escapeHtml(row.position ?? "-"), row.rank_change, "championship_rank")}</td>
      <td>${renderPositionsDelta(row.positions_delta)}</td>
      <td>${escapeHtml(row.points ?? 0)}</td>
      <td><span class="${getBestLapClass(row.best_lap_ms === fastestLapMs)}">${escapeHtml(row.best_lap ?? "-")}</span></td>
      <td>
        <div>${renderCarLink(row.car_name ?? "-", "driver-link driver-link-subtle")}</div>
        <div class="race-note">${row.counted_for_stats === false ? escapeHtml(t("notCountedBadge")) : ""}</div>
      </td>
      <td>${escapeHtml(row.gap ?? "-")}</td>
      <td>${renderEloDeltaCell(row)}</td>
      <td>${renderSafetyRaceCell(row)}</td>
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table class="driver-races-table">
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  bindSortableHeaders("#driver-races-table th.sortable", driverRaceSort, (key) => {
    driverRaceSort = cycleSort(driverRaceSort, key);
    driverRacePage = 1;
    renderDriverRaceHistory();
  });

  bindInteractiveRows(tableEl, "tbody tr[data-race-id]", (row) => {
    const raceId = row.dataset.raceId;
    const race = getRaceById(raceId) || countedData.find(item => item?.race_id === raceId) || null;
    openRaceResultsModal(race, row);
  }, { ignoreSelector: "a, button" });

  renderPagination(
    "driver-races-pagination",
    "driver-races-pagination-info",
    "driver-races-pagination-wrap",
    result.page,
    result.totalPages,
    result.totalItems,
    result.startIndex,
    result.endIndex,
    (page) => {
      driverRacePage = page;
      renderDriverRaceHistory();
    }
  );
}

function renderDriverTrackStats() {
  const tableEl = document.getElementById("driver-tracks-table");
  if (!tableEl) return;

  const rawData = Array.isArray(driverProfileData?.track_stats) ? driverProfileData.track_stats : [];
  const sortedData = sortData(rawData, driverTrackSort, driverTrackColumns);
  const result = paginate(sortedData, driverTrackPage, PAGE_SIZE);
  driverTrackPage = result.page;
  const rowsData = result.items;
  if (!rowsData.length) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("driverNoData"))}</div>`;
    const wrapEl = document.getElementById("driver-tracks-pagination-wrap");
    if (wrapEl) wrapEl.style.display = "none";
    return;
  }

  const headers = renderSortableHeaders(driverTrackColumns, t("driverTrackCols"), driverTrackSort);
  const rows = rowsData.map(row => `
    <tr>
      <td>${escapeHtml(humanizeTrackName(row.track))}</td>
      <td>${escapeHtml(row.races ?? 0)}</td>
      <td>${escapeHtml(row.wins ?? 0)}</td>
      <td>${escapeHtml(row.podiums ?? 0)}</td>
      <td>${escapeHtml(row.points ?? 0)}</td>
      <td>${escapeHtml(row.average_finish ?? "-")}</td>
      <td>${escapeHtml(row.best_lap ?? "-")}</td>
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table>
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  bindSortableHeaders("#driver-tracks-table th.sortable", driverTrackSort, (key) => {
    driverTrackSort = cycleSort(driverTrackSort, key);
    driverTrackPage = 1;
    renderDriverTrackStats();
  });

  renderPagination(
    "driver-tracks-pagination",
    "driver-tracks-pagination-info",
    "driver-tracks-pagination-wrap",
    result.page,
    result.totalPages,
    result.totalItems,
    result.startIndex,
    result.endIndex,
    (page) => {
      driverTrackPage = page;
      renderDriverTrackStats();
    }
  );
}

function renderPenaltyList(containerId, entries, labelKey) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const items = Object.entries(entries || {}).sort((a, b) => b[1] - a[1]);
  if (!items.length) {
    el.innerHTML = `<div class="empty-box">-</div>`;
    return;
  }

  el.innerHTML = items.map(([name, value]) => `
    <div class="penalty-item">
      <span class="penalty-name">${escapeHtml(name)}</span>
      <span class="penalty-value">${escapeHtml(value)}</span>
    </div>
  `).join("");
}

function getDriverRankInfo(profile) {
  const publicId = profile?.public_id;
  const summaryRank = profile?.summary?.championship_rank;
  const rankingSource = Array.isArray(leaderboardData) && leaderboardData.length
    ? leaderboardData
    : Array.isArray(driverIndexData) && driverIndexData.length
      ? driverIndexData
      : [];
  const index = publicId && rankingSource.length
    ? rankingSource.findIndex(row => row?.public_id === publicId)
    : -1;
  const liveRow = index >= 0 ? rankingSource[index] : null;
  const liveRank = liveRow?.rank || (index >= 0 ? index + 1 : null);
  const liveChange = liveRow?.rank_change || liveRow?.latest_changes?.championship_rank || null;

  if (liveRank) {
    return {
      rank: liveRank,
      rankClass: liveRank === 1 ? "rank-1" : liveRank === 2 ? "rank-2" : liveRank === 3 ? "rank-3" : "rank-default",
      change: liveChange,
    };
  }
  if (!summaryRank) return null;
  return {
    rank: summaryRank,
    rankClass: summaryRank === 1 ? "rank-1" : summaryRank === 2 ? "rank-2" : summaryRank === 3 ? "rank-3" : "rank-default",
    change: profile?.summary?.latest_changes?.championship_rank || null,
  };
}

function getFavoriteCarName(profile) {
  const history = Array.isArray(profile?.race_history) ? profile.race_history : [];
  if (!history.length) return null;

  const counts = new Map();
  history.forEach(row => {
    const name = String(row?.car_name || "").trim();
    if (!name) return;
    counts.set(name, (counts.get(name) || 0) + 1);
  });

  if (!counts.size) return null;

  return [...counts.entries()]
    .sort((a, b) => {
      const countDiff = b[1] - a[1];
      if (countDiff !== 0) return countDiff;
      return a[0].localeCompare(b[0]);
    })[0][0];
}

function renderDriverPage() {
  const nameEl = document.getElementById("driver-page-name");
  const subtitleEl = document.getElementById("driver-page-subtitle");
  const statsEl = document.getElementById("driver-stat-cards");
  const highlightsEl = document.getElementById("driver-highlights");
  if (!nameEl || !subtitleEl || !statsEl || !highlightsEl) return;

  if (topLoadState.driver) {
    nameEl.textContent = "-";
    subtitleEl.textContent = t("driverPreviewSubtitle");
    statsEl.innerHTML = renderLoadingMarkup(t("driverLoading"));
    highlightsEl.innerHTML = "";
    setLoadingMarkup("driver-races-table", "driverLoading");
    setLoadingMarkup("driver-tracks-table", "driverLoading");
    renderPenaltyList("driver-penalty-reasons", {}, "driverPenaltyReason");
    renderPenaltyList("driver-penalty-types", {}, "driverPenaltyType");
    return;
  }

  if (!driverProfileData) {
    nameEl.textContent = "-";
    subtitleEl.textContent = t("driverNoData");
    statsEl.innerHTML = `<div class="empty-box">${escapeHtml(t("driverNoData"))}</div>`;
    highlightsEl.innerHTML = "";
    renderDriverRaceHistory();
    renderDriverTrackStats();
    renderPenaltyList("driver-penalty-reasons", {}, "driverPenaltyReason");
    renderPenaltyList("driver-penalty-types", {}, "driverPenaltyType");
    return;
  }

  document.title = `${driverProfileData.driver} | ${t("pageTitleDriver")}`;
  nameEl.innerHTML = buildDriverHeroTitle(driverProfileData);
  subtitleEl.textContent = t("driverPageSubtitle");
  statsEl.innerHTML = buildDriverStatsMarkup(driverProfileData);
  highlightsEl.innerHTML = buildDriverHighlightsMarkup(driverProfileData);

  renderDriverRaceHistory();
  renderDriverTrackStats();
  renderPenaltyList("driver-penalty-reasons", driverProfileData.penalties?.reasons, "driverPenaltyReason");
  renderPenaltyList("driver-penalty-types", driverProfileData.penalties?.types, "driverPenaltyType");
  bindDriverBestlapTracksButton(statsEl, driverProfileData);
  bindBestLapTrackSelect(statsEl, driverProfileData);
  bindAveragePaceTrackSelect(statsEl, driverProfileData);
}

function bindDriverBestlapTracksButton(root = document, profile = driverProfileData) {
  const button = root?.querySelector?.("[data-driver-bestlap-tracks]");
  if (!button || button.dataset.bound === "true") return;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const items = Array.isArray(profile?.best_laps_by_track)
      ? profile.best_laps_by_track
      : Array.isArray(profile?.bestlap_tracks)
        ? profile.bestlap_tracks
        : [];
    openBestlapTracksModal(items, button, {
      title: t("bestLapTracksTitle"),
      subtitle: t("driverBestLapTracksSubtitle")
    });
  });
  button.dataset.bound = "true";
  applyBestlapTracksButtonText(root);
}

function bindBestLapTrackSelect(root = document, profile = driverProfileData) {
  root?.querySelectorAll?.("[data-bestlap-track]").forEach(select => {
    if (select.dataset.bound === "true") return;
    select.addEventListener("change", () => {
      const key = select.dataset.bestlapTrack || getDriverSelectionKey(profile);
      bestLapTrackSelection.set(key, select.value);
      const container = select.closest(".driver-stats-grid") || root;
      if (!container) return;
      container.innerHTML = buildDriverStatsMarkup(profile);
      bindDriverBestlapTracksButton(container, profile);
      bindBestLapTrackSelect(container, profile);
      bindAveragePaceTrackSelect(container, profile);
    });
    select.dataset.bound = "true";
  });
}

function bindAveragePaceTrackSelect(root = document, profile = driverProfileData) {
  root?.querySelectorAll?.("[data-average-pace-track]").forEach(select => {
    if (select.dataset.bound === "true") return;
    select.addEventListener("change", () => {
      const key = select.dataset.averagePaceTrack || getAveragePaceSelectionKey(profile);
      averagePaceTrackSelection.set(key, select.value);
      const container = select.closest(".driver-stats-grid") || root;
      if (!container) return;
      container.innerHTML = buildDriverStatsMarkup(profile);
      bindDriverBestlapTracksButton(container, profile);
      bindBestLapTrackSelect(container, profile);
      bindAveragePaceTrackSelect(container, profile);
    });
    select.dataset.bound = "true";
  });
}

function renderDriverPreviewModal() {
  const titleEl = document.getElementById("driver-preview-title");
  const subtitleEl = document.getElementById("driver-preview-subtitle");
  const statsEl = document.getElementById("driver-preview-stats");
  const highlightsEl = document.getElementById("driver-preview-highlights");
  const actionEl = document.getElementById("driver-preview-link");
  if (!titleEl || !subtitleEl || !statsEl || !highlightsEl || !actionEl) return;

  if (!driverPreviewState) {
    titleEl.textContent = "-";
    subtitleEl.textContent = t("driverPreviewSubtitle");
    statsEl.innerHTML = `<div class="loading">${escapeHtml(t("driverLoading"))}</div>`;
    highlightsEl.innerHTML = "";
    actionEl.hidden = true;
    return;
  }

  const profile = driverPreviewState.profile;
  if (driverPreviewState.loading) {
    titleEl.textContent = driverPreviewState.driver || "-";
    subtitleEl.textContent = t("driverPreviewSubtitle");
    statsEl.innerHTML = `<div class="loading">${escapeHtml(t("driverLoading"))}</div>`;
    highlightsEl.innerHTML = "";
  } else if (!profile || driverPreviewState.error) {
    titleEl.textContent = driverPreviewState.driver || "-";
    subtitleEl.textContent = t("driverPreviewSubtitle");
    statsEl.innerHTML = `<div class="empty-box">${escapeHtml(t("driverNoData"))}</div>`;
    highlightsEl.innerHTML = "";
  } else {
    titleEl.innerHTML = buildDriverHeroTitle(profile);
    subtitleEl.textContent = t("driverPreviewSubtitle");
    statsEl.innerHTML = buildDriverStatsMarkup(profile);
    highlightsEl.innerHTML = buildDriverHighlightsMarkup(profile);
    bindDriverBestlapTracksButton(statsEl, profile);
    bindBestLapTrackSelect(statsEl, profile);
    bindAveragePaceTrackSelect(statsEl, profile);
  }

  if (driverPreviewState.href) {
    actionEl.href = driverPreviewState.href;
    actionEl.hidden = false;
  } else {
    actionEl.hidden = true;
  }
}

function renderTodayStatsModal() {
  const lang = getCurrentLangSafe();
  const stats = todayStatsData;

  const uniquePlayersEl = document.getElementById("today-unique-players");
  const racesEl = document.getElementById("today-races");
  const sessionsEl = document.getElementById("today-sessions");
  const pointsEl = document.getElementById("today-points");
  const winsEl = document.getElementById("today-wins");
  const podiumsEl = document.getElementById("today-podiums");
  const avgPlayersEl = document.getElementById("today-avg-players");
  const tracksEl = document.getElementById("today-tracks");
  const bestLapEl = document.getElementById("today-best-lap");
  const bestLapNoteEl = document.getElementById("today-best-lap-note");
  const mostActiveEl = document.getElementById("today-most-active");
  const mostActiveNoteEl = document.getElementById("today-most-active-note");
  const mostSuccessfulEl = document.getElementById("today-most-successful");
  const mostSuccessfulNoteEl = document.getElementById("today-most-successful-note");
  const updatedEl = document.getElementById("today-stats-updated");

  if (!uniquePlayersEl) return;

  if (!stats) {
    uniquePlayersEl.textContent = "-";
    racesEl.textContent = "-";
    sessionsEl.textContent = "-";
    pointsEl.textContent = "-";
    winsEl.textContent = "-";
    podiumsEl.textContent = "-";
    avgPlayersEl.textContent = "-";
    tracksEl.textContent = "-";
    bestLapEl.innerHTML = `<span>-</span><span class="today-detail-side-inline">-</span>`;
    bestLapNoteEl.textContent = "-";
    mostActiveEl.innerHTML = `<span>-</span>`;
    mostActiveNoteEl.textContent = "-";
    mostSuccessfulEl.innerHTML = `<span>-</span>`;
    mostSuccessfulNoteEl.textContent = "-";
    updatedEl.textContent = "-";
    return;
  }

  uniquePlayersEl.textContent = stats.unique_players_today ?? "-";
  racesEl.textContent = stats.races_today ?? "-";
  sessionsEl.textContent = stats.sessions_today ?? "-";
  pointsEl.textContent = stats.points_earned_today ?? "-";
  winsEl.textContent = stats.wins_today ?? "-";
  podiumsEl.textContent = stats.podiums_today ?? "-";
  avgPlayersEl.textContent =
    typeof stats.avg_players_per_race_today === "number"
      ? stats.avg_players_per_race_today.toFixed(2)
      : "-";

  tracksEl.textContent =
    Array.isArray(stats.tracks_raced_today) && stats.tracks_raced_today.length
      ? stats.tracks_raced_today.join(", ")
      : "-";

  bestLapEl.innerHTML = `<span class="best-lap-value">${escapeHtml(stats.best_lap_today?.lap || "-")}</span><span class="today-detail-side-inline">${escapeHtml(stats.best_lap_today?.car_name || "-")}</span>`;
  bestLapNoteEl.textContent = stats.best_lap_today
    ? `${stats.best_lap_today.driver} · ${stats.best_lap_today.track}`
    : "-";

  const mostActiveName =
    findDriverNameByPlayerId(stats.most_active_driver_today?.player_id) ||
    stats.most_active_driver_today?.player_id ||
    "-";

  mostActiveEl.innerHTML = renderDriverLink(
    mostActiveName,
    stats.most_active_driver_today?.public_id || findPublicIdByPlayerId(stats.most_active_driver_today?.player_id),
    "driver-link",
    stats.most_active_driver_today?.player_id
  );
  mostActiveNoteEl.textContent = formatTodayActivityNote(stats.most_active_driver_today?.races, lang);

  mostSuccessfulEl.innerHTML = renderDriverLink(
    stats.most_successful_driver_today?.driver || "-",
    stats.most_successful_driver_today?.public_id || findPublicIdByPlayerId(stats.most_successful_driver_today?.player_id),
    "driver-link",
    stats.most_successful_driver_today?.player_id
  );
  mostSuccessfulNoteEl.textContent = formatTodayPointsNote(stats.most_successful_driver_today?.points, lang);

  updatedEl.textContent = formatLocalizedUpdatedLabel(stats.updated_at, lang);
}

function formatActivityDateLabel(dateStr, lang = currentLang) {
  if (!dateStr) return "-";
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const safeDate = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(safeDate.getTime())) return dateStr;
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(safeDate);
}

function formatActivityMonthLabel(monthStr, lang = currentLang) {
  if (!monthStr) return "-";
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const safeDate = new Date(`${monthStr}-01T12:00:00`);
  if (Number.isNaN(safeDate.getTime())) return monthStr;
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric"
  }).format(safeDate);
}

function getAvailableActivityMonths(days = []) {
  return [...new Set(days.map(day => String(day?.date || "").slice(0, 7)).filter(Boolean))]
    .sort((a, b) => String(b).localeCompare(String(a)));
}

function getActivityDayEntries(day) {
  const explicit = Number(day?.race_participants_total ?? day?.entries);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const races = Number(day?.races) || 0;
  const avg = Number(day?.avg_players_per_race) || 0;
  return races > 0 && avg > 0 ? races * avg : 0;
}

function getActivityDayScore(day, maxima) {
  const racesScore = normalizeActivityScore(Number(day?.races) || 0, maxima.races);
  const entriesScore = normalizeActivityScore(getActivityDayEntries(day), maxima.entries);
  const uniqueScore = normalizeActivityScore(Number(day?.unique_players) || 0, maxima.uniquePlayers);
  return Math.round(uniqueScore * 0.45 + entriesScore * 0.4 + racesScore * 0.15);
}

function buildRelativeActivityDays(rawDays = []) {
  const days = Array.isArray(rawDays) ? rawDays.filter(day => day?.date) : [];
  const maxima = {
    races: Math.max(1, ...days.map(day => Number(day?.races) || 0)),
    entries: Math.max(1, ...days.map(day => getActivityDayEntries(day))),
    uniquePlayers: Math.max(1, ...days.map(day => Number(day?.unique_players) || 0))
  };
  return days.map(day => ({
    ...day,
    source_activity_score: day?.activity_score,
    activity_score: getActivityDayScore(day, maxima)
  }));
}

function buildActivityMonthInsights(days = []) {
  const monthMap = new Map();
  days.forEach(day => {
    const month = String(day?.date || "").slice(0, 7);
    if (!month) return;
    const entry = monthMap.get(month) || {
      month,
      active_days: 0,
      races: 0,
      entries: 0,
      tracks: new Set()
    };
    entry.active_days += 1;
    entry.races += Number(day?.races) || 0;
    entry.entries += getActivityDayEntries(day);
    if (Array.isArray(day?.tracks)) {
      day.tracks.forEach(track => {
        if (track) entry.tracks.add(track);
      });
    }
    monthMap.set(month, entry);
  });

  const months = [...monthMap.values()];
  const maxima = {
    races: Math.max(1, ...months.map(month => month.races || 0)),
    entries: Math.max(1, ...months.map(month => month.entries || 0)),
    activeDays: Math.max(1, ...months.map(month => month.active_days || 0))
  };

  return months
    .map(month => {
      const racesScore = normalizeActivityScore(month.races, maxima.races);
      const entriesScore = normalizeActivityScore(month.entries, maxima.entries);
      const daysScore = normalizeActivityScore(month.active_days, maxima.activeDays);
      const activityScore = Math.round(entriesScore * 0.55 + racesScore * 0.3 + daysScore * 0.15);
      return {
        ...month,
        tracks_count: month.tracks.size,
        avg_players_per_race: month.races ? Number((month.entries / month.races).toFixed(2)) : 0,
        activity_score: activityScore
      };
    })
    .sort((a, b) => String(b.month).localeCompare(String(a.month)));
}

function getSelectedActivityMonthInsight(months = []) {
  return months.find(month => month.month === selectedActivityMonth) || months[0] || null;
}

function getSelectedActivityInsightsDay(source = null) {
  const days = buildRelativeActivityDays(
    Array.isArray(source) ? source : (Array.isArray(raceActivityInsights) ? raceActivityInsights : [])
  );
  if (!days.length) return null;
  const months = getAvailableActivityMonths(days);
  if (!selectedActivityMonth || !months.includes(selectedActivityMonth)) {
    selectedActivityMonth = months[0] || null;
  }
  const visibleDays = selectedActivityMonth
    ? days.filter(day => String(day?.date || "").startsWith(selectedActivityMonth))
    : days;
  const matched = visibleDays.find(day => day?.date === selectedActivityDate);
  if (matched) return matched;
  selectedActivityDate = visibleDays[0]?.date || days[0]?.date || null;
  return visibleDays[0] || days[0] || null;
}

function buildActivitySummaryCard(label, value, accent = false) {
  return `
    <article class="activity-summary-card${accent ? " activity-summary-card-accent" : ""}">
      <div class="activity-summary-label">${escapeHtml(label)}</div>
      <div class="activity-summary-value">${escapeHtml(value)}</div>
    </article>
  `;
}

function buildActivitySummaryCardWithClass(label, value, className = "", accent = false) {
  return `
    <article class="activity-summary-card${accent ? " activity-summary-card-accent" : ""}${className ? ` ${escapeHtml(className)}` : ""}">
      <div class="activity-summary-label">${escapeHtml(label)}</div>
      <div class="activity-summary-value">${escapeHtml(value)}</div>
    </article>
  `;
}

function renderOnlineActivityModal() {
  const daysEl = document.getElementById("online-activity-days");
  const monthsEl = document.getElementById("online-activity-months");
  const monthOverviewEl = document.getElementById("online-activity-month-overview");
  const summaryEl = document.getElementById("online-activity-summary");
  const subtitleEl = document.getElementById("online-activity-subtitle");
  const primeTimeEl = document.getElementById("online-activity-prime-time");
  const hoursEl = document.getElementById("online-activity-hours");

  if (!daysEl || !monthsEl || !monthOverviewEl || !summaryEl || !subtitleEl || !primeTimeEl || !hoursEl) return;

  const days = buildRelativeActivityDays(Array.isArray(raceActivityInsights) ? raceActivityInsights : []);
  if (!days.length) {
    subtitleEl.textContent = t("onlineActivityEmpty");
    daysEl.innerHTML = "";
    monthsEl.innerHTML = "";
    monthOverviewEl.innerHTML = "";
    summaryEl.innerHTML = `<div class="empty-box">${escapeHtml(t("onlineActivityEmpty"))}</div>`;
    primeTimeEl.textContent = t("onlineActivityEmpty");
    hoursEl.innerHTML = `<div class="empty-box">${escapeHtml(t("onlineActivityEmpty"))}</div>`;
    return;
  }

  const months = getAvailableActivityMonths(days);
  const monthInsights = buildActivityMonthInsights(days);
  if (!selectedActivityMonth || !months.includes(selectedActivityMonth)) {
    selectedActivityMonth = months[0] || null;
  }
  monthsEl.innerHTML = months.map(month => `
    <option value="${escapeHtml(month)}"${month === selectedActivityMonth ? " selected" : ""}>
      ${escapeHtml(`${formatActivityMonthLabel(month, currentLang)} · ${monthInsights.find(item => item.month === month)?.activity_score ?? 0}/100`)}
    </option>
  `).join("");

  if (monthsEl.dataset.bound !== "true") {
    monthsEl.addEventListener("change", () => {
      selectedActivityMonth = monthsEl.value || selectedActivityMonth;
      selectedActivityDate = null;
      renderOnlineActivityModal();
    });
    monthsEl.dataset.bound = "true";
  }

  const selectedMonth = getSelectedActivityMonthInsight(monthInsights);
  monthOverviewEl.innerHTML = monthInsights.map(month => {
    const isActive = month.month === selectedActivityMonth;
    const title = replaceTokens(t("onlineActivityMonthCardTitle"), {
      month: formatActivityMonthLabel(month.month, currentLang),
      score: month.activity_score ?? 0
    });
    const meta = replaceTokens(t("onlineActivityMonthCardMeta"), {
      days: month.active_days ?? 0,
      races: month.races ?? 0,
      avg: typeof month.avg_players_per_race === "number" ? month.avg_players_per_race.toFixed(2) : "-"
    });
    return `
      <button class="activity-month-card${isActive ? " is-active" : ""}" type="button" data-activity-month="${escapeHtml(month.month)}">
        <span>${escapeHtml(title)}</span>
        <small>${escapeHtml(meta)}</small>
      </button>
    `;
  }).join("");
  monthOverviewEl.querySelectorAll("[data-activity-month]").forEach(button => {
    if (button.dataset.bound === "true") return;
    button.addEventListener("click", () => {
      selectedActivityMonth = button.dataset.activityMonth || selectedActivityMonth;
      selectedActivityDate = null;
      renderOnlineActivityModal();
    });
    button.dataset.bound = "true";
  });

  const selectedDay = getSelectedActivityInsightsDay(days);
  if (!selectedDay) return;
  const visibleDays = selectedActivityMonth
    ? days.filter(day => String(day?.date || "").startsWith(selectedActivityMonth))
    : days;

  subtitleEl.textContent = replaceTokens(t("onlineActivitySubtitle"), {
    date: formatActivityDateLabel(selectedDay.date, currentLang),
    score: selectedDay.activity_score ?? 0
  });

  daysEl.innerHTML = visibleDays.map(day => `
    <button
      class="activity-day-pill${day.date === selectedDay.date ? " is-active" : ""}"
      type="button"
      data-activity-date="${escapeHtml(day.date)}"
    >
      <span>${escapeHtml(formatActivityDateLabel(day.date, currentLang))}</span>
      <strong>${escapeHtml(day.activity_score ?? 0)}</strong>
    </button>
  `).join("");

  daysEl.querySelectorAll("[data-activity-date]").forEach(button => {
    if (button.dataset.bound === "true") return;
    button.addEventListener("click", () => {
      selectedActivityDate = button.dataset.activityDate || selectedActivityDate;
      renderOnlineActivityModal();
    });
    button.dataset.bound = "true";
  });

  const tracksLabel = Array.isArray(selectedDay.tracks) && selectedDay.tracks.length
    ? selectedDay.tracks.join(", ")
    : "-";
  const peakHour = selectedDay.peak_hour;

  summaryEl.innerHTML = [
    buildActivitySummaryCard(t("onlineActivityUniqueLabel"), selectedDay.unique_players ?? 0),
    buildActivitySummaryCard(t("onlineActivityRacesLabel"), selectedDay.races ?? 0),
    buildActivitySummaryCard(
      t("onlineActivityAvgPlayersLabel"),
      typeof selectedDay.avg_players_per_race === "number" ? selectedDay.avg_players_per_race.toFixed(2) : "-"
    ),
    buildActivitySummaryCardWithClass(t("onlineActivityTracksLabel"), tracksLabel, "activity-summary-card-tracks"),
    buildActivitySummaryCard(t("onlineActivityScoreLabel"), `${selectedDay.activity_score ?? 0}/100`, true),
    buildActivitySummaryCard(t("onlineActivityMonthScoreLabel"), `${selectedMonth?.activity_score ?? 0}/100`, true)
  ].join("");

  primeTimeEl.textContent = peakHour
    ? replaceTokens(t("onlineActivityPrimeTime"), {
      hour: peakHour.label || `${peakHour.hour}:00`,
      score: peakHour.activity_score ?? 0
    })
    : t("onlineActivityEmpty");

  const hours = Array.isArray(selectedDay.hours) ? selectedDay.hours : [];
  const maxUniquePlayers = Math.max(
    1,
    ...hours.map(hour => Number(hour?.unique_players) || 0)
  );
  hoursEl.innerHTML = hours.map(hour => {
    const uniquePlayers = Number(hour?.unique_players) || 0;
    const height = uniquePlayers > 0 ? Math.max(8, Math.round((uniquePlayers / maxUniquePlayers) * 100)) : 2;
    const isPrime = peakHour && hour.hour === peakHour.hour;
    const tooltip = [
      hour.label || `${hour.hour}:00`,
      replaceTokens(t("onlineActivityHourRaces"), { value: hour.races ?? 0 }),
      replaceTokens(t("onlineActivityHourUnique"), { value: hour.unique_players ?? 0 })
    ].join(" • ");
    return `
      <article class="activity-hour-bar-card${isPrime ? " is-prime" : ""}" title="${escapeHtml(tooltip)}">
        <div class="activity-hour-unique">${escapeHtml(hour.unique_players ?? 0)}</div>
        <div class="activity-hour-bar-stage">
          <span class="activity-hour-bar-vertical" style="height:${height}%"></span>
        </div>
        <div class="activity-hour-axis-label">${escapeHtml(hour.hour)}</div>
      </article>
    `;
  }).join("");
}

function renderDriverOfDayModal() {
  const data = driverOfDayData;
  const contentEl = document.getElementById("driver-of-day-content");
  let avgGainCard = document.getElementById("driver-of-day-avg-gain")?.closest(".today-stat-card");
  if (contentEl && !avgGainCard) {
    const card = document.createElement("div");
    card.className = "today-stat-card driver-day-card";
    card.innerHTML = `
      <div class="today-stat-label">${escapeHtml(t("driverOfDayAvgGain"))}</div>
      <div class="today-stat-value" id="driver-of-day-avg-gain">-</div>
    `;
    const bestLapCard = document.getElementById("driver-of-day-best-lap")?.closest(".today-stat-card");
    if (bestLapCard) {
      contentEl.insertBefore(card, bestLapCard);
    } else {
      contentEl.appendChild(card);
    }
    avgGainCard = card;
  }
  if (avgGainCard) {
    const labelEl = avgGainCard.querySelector(".today-stat-label");
    if (labelEl) labelEl.textContent = t("driverOfDayAvgGain");
  }

  const nameEl = document.getElementById("driver-of-day-name");
  const pointsEl = document.getElementById("driver-of-day-points");
  const racesEl = document.getElementById("driver-of-day-races");
  const winsEl = document.getElementById("driver-of-day-wins");
  const avgFinishEl = document.getElementById("driver-of-day-avg-finish");
  const avgGainEl = document.getElementById("driver-of-day-avg-gain");
  const bestLapEl = document.getElementById("driver-of-day-best-lap");
  const bestLapTrackEl = document.getElementById("driver-of-day-best-lap-track");
  const bestLapTrackCard = bestLapTrackEl?.closest(".today-stat-card");
  const updatedEl = document.getElementById("driver-of-day-updated");
  const emptyEl = document.getElementById("driver-of-day-empty");

  if (!nameEl) return;
  if (bestLapTrackCard) bestLapTrackCard.hidden = true;

  if (!data || !data.driver) {
    nameEl.innerHTML = `<span>-</span>`;
    pointsEl.textContent = "-";
    racesEl.textContent = "-";
    winsEl.textContent = "-";
    avgFinishEl.textContent = "-";
    avgGainEl.textContent = "-";
    avgGainEl.classList.remove("delta-positive", "delta-negative");
    avgGainEl.classList.add("positions-delta", "delta-neutral");
    bestLapEl.textContent = "-";
    bestLapTrackEl.textContent = "";
    updatedEl.textContent = "-";
    if (emptyEl) emptyEl.textContent = t("driverOfDayNoData");
    if (emptyEl) emptyEl.hidden = false;
    if (contentEl) contentEl.classList.add("is-empty");
    return;
  }

  nameEl.innerHTML = renderDriverLink(
    data.driver || "-",
    data.public_id || findPublicIdByPlayerId(data.player_id),
    "driver-link",
    data.player_id
  );
  pointsEl.textContent = data.points ?? 0;
  racesEl.textContent = data.races ?? 0;
  winsEl.textContent = data.wins ?? 0;
  avgFinishEl.textContent = formatAverageFinish(data.average_finish);
  avgGainEl.textContent = formatPositionsDelta(data.average_positions_delta);
  avgGainEl.classList.remove("delta-positive", "delta-negative", "delta-neutral");
  avgGainEl.classList.add("positions-delta");
  if (typeof data.average_positions_delta === "number" && data.average_positions_delta > 0) {
    avgGainEl.classList.add("delta-positive");
  } else if (typeof data.average_positions_delta === "number" && data.average_positions_delta < 0) {
    avgGainEl.classList.add("delta-negative");
  } else {
    avgGainEl.classList.add("delta-neutral");
  }
  bestLapEl.innerHTML = `<span class="best-lap-value">${escapeHtml(data.best_lap || "-")}</span>`;
  bestLapTrackEl.textContent = "";
  updatedEl.textContent = formatLocalizedUpdatedLabel(data.updated_at, currentLang);

  if (emptyEl) emptyEl.hidden = true;
  if (contentEl) contentEl.classList.remove("is-empty");
}

function openDriverOfDayModal() {
  if (!driverOfDayModalController) return;
  driverOfDayModalController.open(document.getElementById("driver-of-day-btn"));
}

function initDriverOfDayModal() {
  driverOfDayModalController = createModalController({
    modalId: "driver-of-day-modal",
    closeButtonId: "driver-of-day-close",
    openButtonId: "driver-of-day-btn",
    onOpen: renderDriverOfDayModal
  });
}

function openTodayStatsModal() {
  if (!todayStatsModalController) return;
  todayStatsModalController.open(document.getElementById("today-stats-btn"));
}

function initTodayStatsModal() {
  todayStatsModalController = createModalController({
    modalId: "today-stats-modal",
    closeButtonId: "today-stats-close",
    openButtonId: "today-stats-btn",
    onOpen: renderTodayStatsModal
  });
}

function openOnlineActivityModal() {
  if (!onlineActivityModalController) return;
  onlineActivityModalController.open(document.getElementById("hero-online-card"));
}

function initOnlineActivityModal() {
  onlineActivityModalController = createModalController({
    modalId: "online-activity-modal",
    closeButtonId: "online-activity-close",
    onOpen: renderOnlineActivityModal
  });

  const cardEl = document.getElementById("hero-online-card");
  if (!cardEl || cardEl.dataset.activityModalBound === "true") return;

  cardEl.addEventListener("click", () => openOnlineActivityModal());
  cardEl.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openOnlineActivityModal();
  });
  cardEl.dataset.activityModalBound = "true";
}

function openHourlyHeroModal() {
  if (!hourlyHeroModalController || (!hourlyAnnouncementData?.event_id && !hourlyAnnouncementData?.track_name)) return;
  hourlyHeroModalController.open(document.getElementById("hero-hourly-card"));
}

function initHourlyHeroModal() {
  hourlyHeroModalController = createModalController({
    modalId: "hourly-details-modal",
    closeButtonId: "hourly-details-close",
    onOpen: renderHourlyHeroModal,
    onClose: () => applyHourlyModalTrackBackground("")
  });

  const cardEl = document.getElementById("hero-hourly-card");
  if (!cardEl || cardEl.dataset.modalBound === "true") return;

  const openFromCard = (event) => {
    if (event?.target?.closest?.("button, a")) return;
    openHourlyHeroModal();
  };

  cardEl.addEventListener("click", openFromCard);
  cardEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target?.closest?.("button, a")) return;
    event.preventDefault();
    openHourlyHeroModal();
  });
  cardEl.dataset.modalBound = "true";
}

function renderBackgroundVideoSoundToggle() {
  const toggle = document.getElementById("bg-video-sound-toggle");
  if (!toggle) return;

  const isEnabled = backgroundVideoSoundState.available && backgroundVideoSoundState.enabled;
  const playbackEnabled = backgroundVideoSoundState.supported && backgroundVideoSoundState.playbackEnabled;
  const titleEl = toggle.querySelector("[data-bg-video-toggle-title]");
  const noteEl = toggle.querySelector("[data-bg-video-toggle-note]");
  const volumeLabelEl = toggle.querySelector("[data-bg-video-volume-label]");
  const volumeValueEl = toggle.querySelector("[data-bg-video-volume-value]");
  const volumeSlider = document.getElementById("bg-video-volume-slider");
  const playbackToggle = document.getElementById("bg-video-playback-toggle");
  const playbackStateEl = toggle.querySelector("[data-bg-video-playback-state]");
  const titleKey = isEnabled ? "bgVideoSoundToggleTitleActive" : "bgVideoSoundToggleTitle";
  const noteKey = isEnabled ? "bgVideoSoundToggleNoteActive" : "bgVideoSoundToggleNote";
  const ariaKey = isEnabled ? "bgVideoSoundToggleAriaActive" : "bgVideoSoundToggleAria";
  const volumePercent = Math.round(clampBackgroundVideoVolume(backgroundVideoSoundState.volume) * 100);

  toggle.hidden = !backgroundVideoSoundState.supported;
  toggle.classList.toggle("is-active", isEnabled);
  toggle.classList.toggle("is-disabled", backgroundVideoSoundState.supported && !backgroundVideoSoundState.playbackEnabled);
  toggle.setAttribute("aria-pressed", isEnabled ? "true" : "false");
  toggle.setAttribute("aria-label", t(ariaKey));
  toggle.title = t(ariaKey);

  if (titleEl) titleEl.textContent = t(titleKey);
  if (noteEl) noteEl.textContent = t(noteKey);
  if (volumeLabelEl) volumeLabelEl.textContent = t("bgVideoVolumeLabel");
  if (volumeValueEl) volumeValueEl.textContent = `${volumePercent}%`;
  if (volumeSlider) {
    volumeSlider.value = String(volumePercent);
    volumeSlider.setAttribute("aria-label", t("bgVideoVolumeAria"));
    volumeSlider.disabled = !playbackEnabled;
  }
  if (playbackToggle) {
    const playbackAriaKey = playbackEnabled ? "bgVideoPlaybackToggleAria" : "bgVideoPlaybackToggleAriaActive";
    playbackToggle.setAttribute("aria-pressed", playbackEnabled ? "true" : "false");
    playbackToggle.setAttribute("aria-label", t(playbackAriaKey));
    playbackToggle.title = t(playbackAriaKey);
  }
  if (playbackStateEl) {
    playbackStateEl.textContent = t(playbackEnabled ? "bgVideoPlaybackStateOn" : "bgVideoPlaybackStateOff");
  }
}

function syncBackgroundVideoSoundState(video = document.querySelector(".site-bg-video")) {
  const isEnabled = Boolean(video && backgroundVideoSoundState.available && backgroundVideoSoundState.enabled);

  document.body.classList.toggle("background-audio-focus", isEnabled);

  if (video) {
    video.muted = !isEnabled;
    video.volume = clampBackgroundVideoVolume(backgroundVideoSoundState.volume);
  }

  renderBackgroundVideoSoundToggle();
}

function setBackgroundVideoSoundAvailability(supported) {
  backgroundVideoSoundState.supported = Boolean(supported);
  backgroundVideoSoundState.available = backgroundVideoSoundState.supported && backgroundVideoSoundState.playbackEnabled;
  if (!backgroundVideoSoundState.available) {
    backgroundVideoSoundState.enabled = false;
  }
  syncBackgroundVideoSoundState();
}

function splitDriverTeamTag(name) {
  const value = String(name || "-").trim();
  const match = value.match(/^(.*?)(\s*\[[^\]]+\])$/);
  if (!match || !match[1].trim()) return { name: value, team: "" };
  return { name: match[1].trim(), team: match[2].trim() };
}

function renderLeaderboardDriver(row) {
  const parts = splitDriverTeamTag(row?.driver);
  return `<div class="driver-name">${renderDriverLink(parts.name, row?.public_id, "driver-link", row?.player_id)}</div>${parts.team ? `<span class="driver-team">${escapeHtml(parts.team)}</span>` : ""}`;
}

function readBackgroundVideoOptions(video) {
  return String(video?.dataset.bgOptions || "")
    .split("|")
    .map(option => option.trim())
    .filter(Boolean);
}

function saveBackgroundVideoPlaylistState(playlist, currentIndex) {
  try {
    sessionStorage.setItem(BG_VIDEO_PLAYLIST_STORAGE_KEY, JSON.stringify(playlist));
    sessionStorage.setItem(BG_VIDEO_INDEX_STORAGE_KEY, String(Math.max(0, Number(currentIndex) || 0)));
  } catch (error) {
    // Ignore sessionStorage failures and keep the runtime state only.
  }
}

function loadBackgroundVideoPlaylistState(configuredOptions) {
  try {
    const storedPlaylist = JSON.parse(sessionStorage.getItem(BG_VIDEO_PLAYLIST_STORAGE_KEY) || "null");
    const storedIndex = Number(sessionStorage.getItem(BG_VIDEO_INDEX_STORAGE_KEY) || "0");
    const normalizedPlaylist = Array.isArray(storedPlaylist)
      ? storedPlaylist.map(option => String(option || "").trim()).filter(Boolean)
      : [];

    if (
      normalizedPlaylist.length === configuredOptions.length &&
      normalizedPlaylist.every(option => configuredOptions.includes(option))
    ) {
      return {
        playlist: normalizedPlaylist,
        currentIndex: Math.min(
          Math.max(0, Number.isFinite(storedIndex) ? storedIndex : 0),
          Math.max(0, normalizedPlaylist.length - 1)
        )
      };
    }
  } catch (error) {
    // Ignore invalid session state and rebuild the playlist below.
  }

  return null;
}

function buildBackgroundVideoPlaylist(configuredOptions) {
  const restoredState = loadBackgroundVideoPlaylistState(configuredOptions);
  if (restoredState) {
    return restoredState;
  }

  const startIndex = configuredOptions.length > 1
    ? Math.floor(Math.random() * configuredOptions.length)
    : 0;
  const playlist = configuredOptions
    .slice(startIndex)
    .concat(configuredOptions.slice(0, startIndex));

  saveBackgroundVideoPlaylistState(playlist, 0);
  return {
    playlist,
    currentIndex: 0
  };
}

function configureBackgroundVideoSource(video) {
  if (!video || video.dataset.bgConfigured === "true") return;

  const configuredOptions = readBackgroundVideoOptions(video);
  if (!configuredOptions.length) {
    video.dataset.bgConfigured = "true";
    return;
  }

  const { playlist, currentIndex } = buildBackgroundVideoPlaylist(configuredOptions);
  video.dataset.bgPlaylist = JSON.stringify(playlist);
  video.dataset.bgIndex = String(currentIndex);
  video.dataset.bgSrc = playlist[currentIndex] || playlist[0] || "";
  video.dataset.bgConfigured = "true";
}

function bindBackgroundVideoSoundToggle() {
  const toggle = document.getElementById("bg-video-sound-toggle");
  const video = document.querySelector(".site-bg-video");
  const volumeSlider = document.getElementById("bg-video-volume-slider");
  const playbackToggle = document.getElementById("bg-video-playback-toggle");

  if (!toggle || !video || toggle.dataset.bound === "true") {
    renderBackgroundVideoSoundToggle();
    return;
  }

  const toggleBackgroundVideoSound = () => {
    if (!backgroundVideoSoundState.available) return;

    backgroundVideoSoundState.enabled = !backgroundVideoSoundState.enabled;
    syncBackgroundVideoSoundState(video);

    if (!backgroundVideoSoundState.enabled) return;

    const playPromise = video.play?.();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        backgroundVideoSoundState.enabled = false;
        syncBackgroundVideoSoundState(video);
      });
    }
  };

  toggle.addEventListener("click", () => {
    toggleBackgroundVideoSound();
  });

  toggle.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target === volumeSlider) return;
    if (event.target === playbackToggle) return;
    event.preventDefault();
    toggleBackgroundVideoSound();
  });

  if (volumeSlider) {
    volumeSlider.closest(".bg-video-volume")?.addEventListener("click", event => {
      event.stopPropagation();
    });
    volumeSlider.addEventListener("click", event => {
      event.stopPropagation();
    });
    volumeSlider.addEventListener("keydown", event => {
      event.stopPropagation();
    });
    volumeSlider.addEventListener("input", event => {
      event.stopPropagation();
      backgroundVideoSoundState.volume = clampBackgroundVideoVolume(Number(volumeSlider.value) / 100);
      saveBackgroundVideoVolume(backgroundVideoSoundState.volume);
      syncBackgroundVideoSoundState(video);
    });
  }

  if (playbackToggle) {
    const togglePlayback = () => {
      backgroundVideoSoundState.playbackEnabled = !backgroundVideoSoundState.playbackEnabled;
      saveBackgroundVideoPlaybackEnabled(backgroundVideoSoundState.playbackEnabled);
      if (!backgroundVideoSoundState.playbackEnabled) {
        backgroundVideoSoundState.enabled = false;
      }
      optimizeBackgroundMedia();
      renderBackgroundVideoSoundToggle();
    };

    playbackToggle.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      togglePlayback();
    });

    playbackToggle.addEventListener("keydown", event => {
      event.stopPropagation();
    });
  }

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !backgroundVideoSoundState.enabled) return;
    backgroundVideoSoundState.enabled = false;
    syncBackgroundVideoSoundState(video);
  });

  toggle.dataset.bound = "true";
  renderBackgroundVideoSoundToggle();
}

function optimizeBackgroundMedia() {
  const video = document.querySelector(".site-bg-video");
  if (!video) return;
  configureBackgroundVideoSource(video);

  const getBackgroundVideoPlaylist = () => {
    try {
      const playlist = JSON.parse(video.dataset.bgPlaylist || "[]");
      return Array.isArray(playlist) ? playlist.filter(Boolean) : [];
    } catch (error) {
      return [];
    }
  };

  const getBackgroundVideoIndex = () => {
    const parsedIndex = Number(video.dataset.bgIndex || "0");
    return Number.isFinite(parsedIndex) && parsedIndex >= 0 ? parsedIndex : 0;
  };

  const setBackgroundVideoIndex = index => {
    const playlist = getBackgroundVideoPlaylist();
    const safeIndex = playlist.length ? ((index % playlist.length) + playlist.length) % playlist.length : 0;
    video.dataset.bgIndex = String(safeIndex);
    video.dataset.bgSrc = playlist[safeIndex] || "";
    saveBackgroundVideoPlaylistState(playlist, safeIndex);
  };

  const preloadNextBackgroundVideo = () => {
    const playlist = getBackgroundVideoPlaylist();
    if (playlist.length < 2) return;

    const currentIndex = getBackgroundVideoIndex();
    const nextIndex = (currentIndex + 1) % playlist.length;
    const nextSrc = playlist[nextIndex];
    if (!nextSrc) return;

    if (!window.__asgBgVideoPreloader) {
      const preloader = document.createElement("video");
      preloader.preload = "auto";
      preloader.muted = true;
      preloader.playsInline = true;
      window.__asgBgVideoPreloader = preloader;
    }

    const preloader = window.__asgBgVideoPreloader;
    if (preloader.dataset.src === nextSrc) return;
    preloader.dataset.src = nextSrc;
    preloader.src = nextSrc;
    preloader.load?.();
  };

  const playManagedBackgroundVideo = () => {
    if (!shouldAutoplayBackground) {
      video.removeAttribute("autoplay");
      return;
    }

    video.setAttribute("autoplay", "");
    const playPromise = video.play?.();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        video.pause?.();
      });
    }
  };

  const advanceBackgroundVideo = () => {
    const playlist = getBackgroundVideoPlaylist();
    if (playlist.length < 2) {
      playManagedBackgroundVideo();
      return;
    }

    const nextIndex = (getBackgroundVideoIndex() + 1) % playlist.length;
    setBackgroundVideoIndex(nextIndex);
    delete video.dataset.loaded;
    delete video.dataset.loadScheduled;
    loadBackgroundVideo();
    syncBackgroundVideoSoundState(video);
    playManagedBackgroundVideo();
    preloadNextBackgroundVideo();
  };

  const unloadBackgroundVideo = () => {
    video.pause();
    video.removeAttribute("autoplay");
    video.removeAttribute("src");
    video.replaceChildren();
    video.load?.();
    delete video.dataset.loaded;
    delete video.dataset.loadScheduled;
  };

  const loadBackgroundVideo = () => {
    if (video.dataset.loaded === "true") return;
    const videoSrc = video.dataset.bgSrc;
    if (!videoSrc) return;

    video.pause?.();
    video.removeAttribute("src");
    video.replaceChildren();
    const source = document.createElement("source");
    source.src = videoSrc;
    source.type = "video/mp4";
    video.appendChild(source);
    video.dataset.loaded = "true";
    video.load?.();
    preloadNextBackgroundVideo();
  };

  const scheduleBackgroundVideoLoad = () => {
    if (video.dataset.loadScheduled === "true" || video.dataset.loaded === "true") return;
    video.dataset.loadScheduled = "true";

    const startLoading = () => {
      if (document.body.classList.contains("lite-background")) {
        delete video.dataset.loadScheduled;
        return;
      }
      loadBackgroundVideo();
      syncBackgroundVideoSoundState(video);
      playManagedBackgroundVideo();
    };

    const scheduleIdleLoad = () => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(startLoading, { timeout: 2000 });
      } else {
        window.setTimeout(startLoading, 1200);
      }
    };

    if (document.readyState === "complete") {
      scheduleIdleLoad();
      return;
    }

    window.addEventListener("load", scheduleIdleLoad, { once: true });
  };

  if (video.dataset.availabilityBound !== "true") {
    video.addEventListener("error", () => {
      document.body.dataset.bgVideoStatus = "video-error";
      setBackgroundVideoSoundAvailability(false);
      unloadBackgroundVideo();
      document.body.classList.add("lite-background");
    });
    video.addEventListener("ended", () => {
      if (document.body.classList.contains("lite-background")) return;
      advanceBackgroundVideo();
    });
    video.dataset.availabilityBound = "true";
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const supportsMp4Video = typeof video.canPlayType !== "function" || video.canPlayType("video/mp4") !== "";
  const bgVideoBlockReason = !supportsMp4Video
    ? "unsupported-mp4"
    : IS_DRIVER_PAGE
      ? "driver-page"
    : IS_RACES_PAGE
      ? "races-page"
      : IS_CARS_PAGE
        ? "cars-page"
        : IS_FUN_STATS_PAGE
          ? "fun-stats-page"
          : IS_COMMUNITY_PAGE
            ? "community-page"
            : window.innerWidth <= 768
              ? "mobile-width"
              : "";
  const shouldAutoplayBackground = !reduceMotion && !navigator.connection?.saveData;
  const runtimeBlocksBackgroundVideo =
    !supportsMp4Video ||
    IS_DRIVER_PAGE ||
    IS_RACES_PAGE ||
    IS_CARS_PAGE ||
    IS_FUN_STATS_PAGE ||
    IS_BANS_PAGE ||
    IS_COMMUNITY_PAGE ||
    window.innerWidth <= 768;
  const shouldUseStaticBackground = runtimeBlocksBackgroundVideo || !backgroundVideoSoundState.playbackEnabled;

  if (shouldUseStaticBackground) {
    document.body.dataset.bgVideoStatus = runtimeBlocksBackgroundVideo
      ? (bgVideoBlockReason || "static-background")
      : "user-disabled";
    document.body.classList.add("lite-background");
    setBackgroundVideoSoundAvailability(!runtimeBlocksBackgroundVideo);
    unloadBackgroundVideo();
    return;
  }

  document.body.dataset.bgVideoStatus = shouldAutoplayBackground ? "available" : "available-no-autoplay";
  document.body.classList.remove("lite-background");
  setBackgroundVideoSoundAvailability(true);
  scheduleBackgroundVideoLoad();
}

function updateTopNavModalOffset() {
  const topNav = document.getElementById("top-nav");
  const navHeight = topNav?.getBoundingClientRect?.().height || 0;
  const offset = Math.max(16, Math.ceil(navHeight) + 8);
  document.documentElement.style.setProperty("--top-nav-modal-offset", `${offset}px`);
}

function rerenderUI() {
  applyStaticTranslations();
  updateCombinedStatsTabsUI();
  renderNewsBell();
  renderNewsNotificationsModal();
  if (eloModalState) renderEloModal();
  if (safetyModalState) renderSafetyModal();

  if (IS_DRIVER_PAGE) {
    renderDriverPage();
    renderRaceResultsModal();
    applyRevealAnimations();
    return;
  }

  if (IS_CARS_PAGE) {
    renderCarsPage();
    applyRevealAnimations();
    return;
  }

  if (IS_FUN_STATS_PAGE) {
    renderFunStatsPage();
    applyRevealAnimations();
    return;
  }

  if (IS_COMMUNITY_PAGE) {
    renderCommunityPage();
    applyRevealAnimations();
    return;
  }

  if (IS_NEWS_PAGE) {
    renderNewsPage();
    applyRevealAnimations();
    return;
  }

  if (IS_BANS_PAGE) {
    renderBansPage();
    applyRevealAnimations();
    return;
  }

  if (IS_RACES_PAGE) {
    renderRacesPage();
    applyRevealAnimations();
    return;
  }

  const top3El = document.getElementById("top3-content");
  if (top3El) {
    top3El.innerHTML = (topLoadState.home && !leaderboardData.length)
      ? renderLoadingMarkup(t("loading"))
      : renderTop3Compact(leaderboardData);
  }

  if (topHomeDeferredSections.leaderboard) renderLeaderboardTablePage();
  else renderDeferredHomeTableLoading("leaderboard-table", "leaderboard-pagination-wrap", "loadingLeaderboard");

  if (topHomeDeferredSections.bestlaps) renderBestLapsTablePage();
  else renderDeferredHomeTableLoading("bestlaps-table", "bestlaps-pagination-wrap", "loadingBestLaps");

  if (topHomeDeferredSections.safety) renderSafetyTablePage();
  else renderDeferredHomeTableLoading("safety-table", "safety-pagination-wrap", "loadingSafety");

  renderTodayStatsModal();
  renderOnlineActivityModal();
  renderDriverOfDayModal();
  renderDriverPreviewModal();
  renderHourlyHeroModal();
  renderHourlyHeroCard();
  renderHourlyWinnerCard();
  renderOnlineWidget();
  updateHeroServerSummary(serverStatusData);
  renderServerStickyWidget(serverStatusData);
  renderDonationAlertsWidget();
  applyRevealAnimations();
}

function runInitStep(stepName, action) {
  try {
    const result = action();
    if (result && typeof result.catch === "function") {
      result.catch((error) => {
        console.error(`[INIT:${stepName}]`, error);
      });
    }
    return result;
  } catch (error) {
    console.error(`[INIT:${stepName}]`, error);
    return null;
  }
}

async function init() {
  await initializeAppStorage().catch(error => console.warn("Preference storage is unavailable.", error));
  document.body.classList.remove("background-audio-focus");
  applyInitialTopLoadingState();
  setupTopHomeDeferredSections();
  ensureNewsNotificationsUi();
  rerenderUI();

  backgroundVideoSoundState.volume = loadBackgroundVideoVolume();
  backgroundVideoSoundState.playbackEnabled = loadBackgroundVideoPlaybackEnabled();
  runInitStep("updateServerCardBackgrounds", () => updateServerCardBackgrounds());
  runInitStep("bindLanguageButtons", () => bindLanguageButtons());
  runInitStep("bindTopNavGroups", () => bindTopNavGroups());
  runInitStep("bindTopNavMoreMenu", () => bindTopNavMoreMenu());
  runInitStep("initNewsNotificationsModal", () => initNewsNotificationsModal());
  runInitStep("bindFunStatsControls", () => bindFunStatsControls());
  runInitStep("bindSearchInputs", () => bindSearchInputs());
  runInitStep("bindCombinedStatsTabs", () => bindCombinedStatsTabs());
  runInitStep("ensureTopGuide", () => ensureTopGuide());
  runInitStep("initTwitchWidget", () => initTwitchWidget());
  runInitStep("updateTopNavModalOffset", () => updateTopNavModalOffset());
  runInitStep("bindBackgroundVideoSoundToggle", () => bindBackgroundVideoSoundToggle());
  runInitStep("optimizeBackgroundMedia", () => optimizeBackgroundMedia());
  runInitStep("initDonationAlertsWidget", () => initDonationAlertsWidget());
  window.addEventListener("storage", event => {
    if (event.key === HOURLY_VOTE_STATE_STORAGE_KEY || event.key === "asg.top.v1:hourlyVoteState") {
      syncHourlyVoteStateFromStorage();
    }
    if (event.key === NEWS_READ_STORAGE_KEY || event.key === "asg.top.v1:newsReadState") {
      renderNewsBell();
      renderNewsNotificationsModal();
      if (IS_NEWS_PAGE) renderNewsPage();
    }
  });
  window.addEventListener("resize", debounce(() => {
    updateTopNavModalOffset();
    optimizeBackgroundMedia();
  }, 120));
  if (IS_RACES_PAGE || IS_DRIVER_PAGE) {
    runInitStep("initRaceResultsModal", () => initRaceResultsModal());
  } else if (IS_COMMUNITY_PAGE) {
    runInitStep("initCommunityLightbox", () => initCommunityLightbox());
  } else if (!IS_DRIVER_PAGE && !IS_CARS_PAGE && !IS_COMMUNITY_PAGE && !IS_BANS_PAGE) {
    runInitStep("initTodayStatsModal", () => initTodayStatsModal());
    runInitStep("initOnlineActivityModal", () => initOnlineActivityModal());
    runInitStep("initDriverOfDayModal", () => initDriverOfDayModal());
    runInitStep("initDriverPreviewModal", () => initDriverPreviewModal());
    runInitStep("initHourlyHeroModal", () => initHourlyHeroModal());
    runInitStep("initServerPlayersModal", () => initServerPlayersModal());
  }
  runInitStep("initEloModal", () => initEloModal());
  runInitStep("initSafetyModal", () => initSafetyModal());
  runInitStep("initBestlapTracksModal", () => initBestlapTracksModal());
  runInitStep("applyStaticTranslations", () => applyStaticTranslations());

  try {
    if (IS_DRIVER_PAGE) {
      const profile = await loadDriverProfile(getRequestedDriverId());
      driverProfileData = profile;
      driverIndexData = [];
      racesData = [];
      topLoadState.driver = false;
      rerenderUI();
      return;
    }

    if (IS_CARS_PAGE) {
      carsData = await loadCarsData();
      topLoadState.cars = false;
      rerenderUI();
      return;
    }

    if (IS_FUN_STATS_PAGE) {
      const [apiFunStats, data] = await Promise.all([
        loadFunStatsData().catch(() => null),
        loadSiteData().catch(() => ({ safety: [] }))
      ]);
      funStatsApiData = apiFunStats;
      safetyData = Array.isArray(data?.safety) ? data.safety : [];
      if (!funStatsApiData) {
        racesData = await loadFullRacesData().catch(() => []);
      }
      topLoadState.funStats = false;
      rerenderUI();
      return;
    }

    if (IS_COMMUNITY_PAGE) {
      topLoadState.community = false;
      rerenderUI();
      void loadCommunityLikes();
      return;
    }

    if (IS_NEWS_PAGE) {
      await loadNewsFeed().catch(() => []);
      topLoadState.news = false;
      renderNewsBell();
      rerenderUI();
      return;
    }

    if (IS_BANS_PAGE) {
      bansData = await loadBansData();
      topLoadState.bans = false;
      rerenderUI();
      return;
    }

    if (IS_RACES_PAGE) {
      racesData = await loadRacesData();
      topLoadState.races = false;
      rerenderUI();
      return;
    }

    const hourlyDataPromise = Promise.allSettled([
      loadHourlyAnnouncementData(),
      loadHourlyScheduleData()
    ]);
    void loadNewsFeed()
      .catch(() => [])
      .then(() => {
        renderNewsBell();
        renderNewsNotificationsModal();
      });
    const data = await loadSiteData();

    leaderboardData = data.leaderboard;
    bestlapsData = data.bestlaps;
    bestlapTracksData = Array.isArray(data.bestlapTracks) ? data.bestlapTracks : [];
    bestlapTrackLeadersData = Array.isArray(data.bestlapTrackLeaders) ? data.bestlapTrackLeaders : [];
    todayStatsData = data.globalStats;
    safetyData = data.safety;
    driverOfDayData = data.driverOfDay;
    onlineData = data.online;
    latestHourlyRaceData = data.latestHourlyRace;
    racesArchiveSummary = data.racesSummary;
    topDataV2TableMeta = data.tables;
    serverStatusData = data.serverStatus;

    raceActivityInsights = Array.isArray(data.raceActivity) ? data.raceActivity : [];
    racesData = [];
    topLoadState.home = false;

    const driversCountEl = document.getElementById("drivers-count");
    if (driversCountEl) {
      driversCountEl.textContent = getTopDataV2TableMeta("leaderboard")?.total_items || leaderboardData.length;
    }

    const bestLapHighlightEl = document.getElementById("best-lap-highlight");
    const bestLapNoteEl = document.getElementById("best-lap-note");

    if (bestlapsData.length > 0) {
      if (bestLapHighlightEl) {
        applyBestlapTracksButtonText();
      }
      updateBestLapNote(bestlapsData[0].driver, bestlapsData[0].track, bestlapsData[0].car_name);
    } else {
      if (bestLapHighlightEl) {
        applyBestlapTracksButtonText();
      }
      if (bestLapNoteEl) {
        bestLapNoteEl.textContent = t("bestLapNoteFallback");
      }
    }

    updateHeroServerSummary(data.serverStatus);
    renderServerStickyWidget(data.serverStatus);

    rerenderUI();

    const [hourlyAnnouncementResult, hourlyScheduleResult] = await hourlyDataPromise;
    const hourlyAnnouncement = hourlyAnnouncementResult.status === "fulfilled" ? hourlyAnnouncementResult.value : null;
    const hourlySchedule = hourlyScheduleResult.status === "fulfilled" ? hourlyScheduleResult.value : null;
    hourlyScheduleData = hourlySchedule;
    hourlyAnnouncementData = mergeHourlyAnnouncementWithSchedule(hourlyAnnouncement, hourlySchedule);
    topLoadState.hourly = false;
    rerenderUI();

    loadHourlyVotes(hourlyAnnouncementData).finally(() => {
      renderHourlyHeroCard();
      renderHourlyHeroModal();
    });
  } catch (error) {
    console.error(error);

    if (IS_DRIVER_PAGE) {
      const statsEl = document.getElementById("driver-stat-cards");
      const nameEl = document.getElementById("driver-page-name");
      const subtitleEl = document.getElementById("driver-page-subtitle");
      if (nameEl) nameEl.textContent = "-";
      if (subtitleEl) subtitleEl.textContent = t("driverNoData");
      if (statsEl) statsEl.innerHTML = `<div class="empty-box">${escapeHtml(t("driverNoData"))}</div>`;
      return;
    }

    if (IS_RACES_PAGE) {
      const racesTableEl = document.getElementById("races-table");
      if (racesTableEl) {
        racesTableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("errorLoading"))}</div>`;
      }
      return;
    }

    if (IS_CARS_PAGE) {
      const carsTableEl = document.getElementById("cars-table");
      if (carsTableEl) {
        carsTableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("errorLoading"))}</div>`;
      }
      return;
    }

    if (IS_BANS_PAGE) {
      const bansTableEl = document.getElementById("bans-table");
      if (bansTableEl) {
        bansTableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("errorLoading"))}</div>`;
      }
      return;
    }

    if (IS_FUN_STATS_PAGE) {
      const summaryEl = document.getElementById("fun-stats-summary");
      const awardsEl = document.getElementById("fun-stats-awards");
      const leaderboardsEl = document.getElementById("fun-stats-leaderboards");
      if (summaryEl) {
        summaryEl.innerHTML = `<div class="empty-box">${escapeHtml(t("errorLoading"))}</div>`;
      }
      if (awardsEl) awardsEl.innerHTML = "";
      if (leaderboardsEl) leaderboardsEl.innerHTML = "";
      return;
    }

    const top3Content = document.getElementById("top3-content");
    if (top3Content) {
      top3Content.innerHTML = `<div class="empty-box">${escapeHtml(t("errorLoading"))}</div>`;
    }

    const leaderboardTableEl = document.getElementById("leaderboard-table");
    const bestlapsTableEl = document.getElementById("bestlaps-table");
    const safetyTableEl = document.getElementById("safety-table");
    const leaderboardWrapEl = document.getElementById("leaderboard-pagination-wrap");
    const bestlapsWrapEl = document.getElementById("bestlaps-pagination-wrap");
    const safetyWrapEl = document.getElementById("safety-pagination-wrap");

    if (leaderboardTableEl) {
      leaderboardTableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("errorLeaderboard"))}</div>`;
    }
    if (bestlapsTableEl) {
      bestlapsTableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("errorBestlaps"))}</div>`;
    }
    if (safetyTableEl) {
      safetyTableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("errorLoading"))}</div>`;
    }
    if (leaderboardWrapEl) {
      leaderboardWrapEl.style.display = "none";
    }
    if (bestlapsWrapEl) {
      bestlapsWrapEl.style.display = "none";
    }
    if (safetyWrapEl) {
      safetyWrapEl.style.display = "none";
    }

    updateHeroServerSummary(null);
    renderServerStickyWidget(null);
  }
}

document.addEventListener("DOMContentLoaded", init);


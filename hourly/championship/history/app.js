const params = new URLSearchParams(window.location.search);

function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

const isAsgPublicSite = /(^|\.)asgracing\.ru$/i.test(window.location.hostname);
const isLocalDevHost = /^(localhost|127\.0\.0\.1|::1)$/i.test(window.location.hostname);
const defaultDataBase = isAsgPublicSite
  ? "https://data.asgracing.ru/hourly-data"
  : isLocalDevHost
    ? "https://data.asgracing.ru/hourly-data"
    : window.location.hostname === "asgracing.github.io"
      ? "https://asgracing.github.io/hourly-data"
      : "/hourly-data";
const dataBase = normalizeBaseUrl(params.get("hourlyApiBase")) || defaultDataBase;
let currentLang = localStorage.getItem("asgLang") || (((navigator.language || "").toLowerCase().startsWith("ru")) ? "ru" : "en");

const translations = {
  en: {
    navHourly: "Hourly Race",
    navGroupChampionship: "Championship",
    navCurrentChampionship: "Current championship",
    navPastChampionships: "Past championships",
    navGroupAsg: "ASG Racing",
    navLeaderboard: "Back to Main",
    btnRules: "Rules",
    btnNews: "News",
    btnChampionship: "Rating",
    btnBestLaps: "Best Laps",
    btnWorstSafety: "Safety Rating",
    btnBans: "Ban List",
    btnCommunity: "Community",
    btnAboutServer: "About Server",
    historyEyebrow: "Archive",
    historyTitle: "Past championships",
    historySubtitle: "Browse completed ASG Racing hourly championships, inspect winners and open detailed standings for each season.",
    historyListEyebrow: "Seasons",
    historyListTitle: "Championship archive",
    historyListSubtitle: "The list is scrollable and supports quick search when archived championships accumulate.",
    historySearchLabel: "Search championships",
    historySearchPlaceholder: "Search championships",
    historyFilterAll: "All",
    historyFilterFinished: "Finished",
    historyFilterArchived: "Archived",
    historyEmpty: "No past championships have been published yet.",
    historySummaryTotal: "archive entries",
    historySummaryRaces: "total races",
    historyDetailWinner: "Winner",
    historyDetailRaces: "Races",
    historyDetailDrivers: "Drivers",
    historyDetailOpen: "Open championship page",
    historyDetailNoDescription: "No description has been published for this championship yet.",
    historyLoading: "Loading...",
    statusFinished: "Finished",
    statusArchived: "Archived"
  },
  ru: {
    navHourly: "\u0427\u0430\u0441\u043e\u0432\u0430\u044f \u0433\u043e\u043d\u043a\u0430",
    navGroupChampionship: "\u0427\u0435\u043c\u043f\u0438\u043e\u043d\u0430\u0442",
    navCurrentChampionship: "\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u0447\u0435\u043c\u043f\u0438\u043e\u043d\u0430\u0442",
    navPastChampionships: "\u041f\u0440\u043e\u0448\u0435\u0434\u0448\u0438\u0435 \u0447\u0435\u043c\u043f\u0438\u043e\u043d\u0430\u0442\u044b",
    navGroupAsg: "ASG Racing",
    navLeaderboard: "\u041d\u0430 \u0433\u043b\u0430\u0432\u043d\u0443\u044e",
    btnRules: "\u041f\u0440\u0430\u0432\u0438\u043b\u0430",
    btnNews: "\u041d\u043e\u0432\u043e\u0441\u0442\u0438",
    btnChampionship: "\u0420\u0435\u0439\u0442\u0438\u043d\u0433",
    btnBestLaps: "\u041b\u0443\u0447\u0448\u0438\u0435 \u043a\u0440\u0443\u0433\u0438",
    btnWorstSafety: "Safety Rating",
    btnBans: "\u0411\u0430\u043d\u044b",
    btnCommunity: "\u0421\u043e\u043e\u0431\u0449\u0435\u0441\u0442\u0432\u043e",
    btnAboutServer: "\u041e \u0441\u0435\u0440\u0432\u0435\u0440\u0435",
    historyEyebrow: "\u0410\u0440\u0445\u0438\u0432",
    historyTitle: "\u041f\u0440\u043e\u0448\u0435\u0434\u0448\u0438\u0435 \u0447\u0435\u043c\u043f\u0438\u043e\u043d\u0430\u0442\u044b",
    historySubtitle: "\u0421\u043c\u043e\u0442\u0440\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043d\u044b\u0435 \u0447\u0430\u0441\u043e\u0432\u044b\u0435 \u0447\u0435\u043c\u043f\u0438\u043e\u043d\u0430\u0442\u044b ASG Racing, \u043f\u043e\u0431\u0435\u0434\u0438\u0442\u0435\u043b\u0435\u0439 \u0438 \u0441\u0441\u044b\u043b\u043a\u0438 \u043d\u0430 \u043f\u043e\u043b\u043d\u044b\u0435 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b.",
    historyListEyebrow: "\u0421\u0435\u0437\u043e\u043d\u044b",
    historyListTitle: "\u0410\u0440\u0445\u0438\u0432 \u0447\u0435\u043c\u043f\u0438\u043e\u043d\u0430\u0442\u043e\u0432",
    historyListSubtitle: "\u0421\u043f\u0438\u0441\u043e\u043a \u043f\u0440\u043e\u043a\u0440\u0443\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u0438 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u043f\u043e\u0438\u0441\u043a, \u043a\u043e\u0433\u0434\u0430 \u0430\u0440\u0445\u0438\u0432 \u0441\u0442\u0430\u043d\u0435\u0442 \u0431\u043e\u043b\u044c\u0448\u0435.",
    historySearchLabel: "\u041f\u043e\u0438\u0441\u043a \u0447\u0435\u043c\u043f\u0438\u043e\u043d\u0430\u0442\u043e\u0432",
    historySearchPlaceholder: "\u041d\u0430\u0439\u0442\u0438 \u0447\u0435\u043c\u043f\u0438\u043e\u043d\u0430\u0442",
    historyFilterAll: "\u0412\u0441\u0435",
    historyFilterFinished: "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d",
    historyFilterArchived: "\u0412 \u0430\u0440\u0445\u0438\u0432\u0435",
    historyEmpty: "\u041f\u0440\u043e\u0448\u0435\u0434\u0448\u0438\u0445 \u0447\u0435\u043c\u043f\u0438\u043e\u043d\u0430\u0442\u043e\u0432 \u043f\u043e\u043a\u0430 \u043d\u0435 \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u043e.",
    historySummaryTotal: "\u0447\u0435\u043c\u043f\u0438\u043e\u043d\u0430\u0442\u043e\u0432 \u0432 \u0430\u0440\u0445\u0438\u0432\u0435",
    historySummaryRaces: "\u0433\u043e\u043d\u043e\u043a \u0432\u0441\u0435\u0433\u043e",
    historyDetailWinner: "\u041f\u043e\u0431\u0435\u0434\u0438\u0442\u0435\u043b\u044c",
    historyDetailRaces: "\u0413\u043e\u043d\u043a\u0438",
    historyDetailDrivers: "\u041f\u0438\u043b\u043e\u0442\u044b",
    historyDetailOpen: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443 \u0447\u0435\u043c\u043f\u0438\u043e\u043d\u0430\u0442\u0430",
    historyDetailNoDescription: "\u0414\u043b\u044f \u044d\u0442\u043e\u0433\u043e \u0447\u0435\u043c\u043f\u0438\u043e\u043d\u0430\u0442\u0430 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043f\u043e\u043a\u0430 \u043d\u0435 \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u043e.",
    historyLoading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...",
    statusFinished: "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d",
    statusArchived: "\u0412 \u0430\u0440\u0445\u0438\u0432\u0435"
  }
};

let historyItems = [];
let currentFilter = "all";
let currentSearch = "";
let selectedSlug = "";

function t(key) {
  return translations[currentLang]?.[key] ?? translations.en[key] ?? key;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function statusLabel(status) {
  return status === "archived" ? t("statusArchived") : t("statusFinished");
}

function championshipUrl(slug) {
  return slug ? `../?slug=${encodeURIComponent(slug)}` : "../";
}

async function loadJson(url) {
  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

function normalizeChampionship(item, activeSlug) {
  if (!item || typeof item !== "object") return null;
  const slug = String(item.slug || "").trim();
  if (!slug || slug === activeSlug) return null;
  const standings = Array.isArray(item.standings) ? item.standings : [];
  const top3 = standings.slice(0, 3);
  const rawStatus = String(item.status || "").trim().toLowerCase();
  return {
    slug,
    title: String(item.title || slug).trim(),
    period: String(item.period || "").trim(),
    description: String(item.description || "").trim(),
    winner: String(top3[0]?.driver || top3[0]?.public_id || item.winner || "").trim(),
    raceCount: Number(item.race_count || 0),
    driverCount: Number(item.driver_count || standings.length || 0),
    status: rawStatus === "archived" ? "archived" : "finished",
    top3
  };
}

function filteredItems() {
  const needle = currentSearch.trim().toLowerCase();
  return historyItems.filter(item => {
    if (currentFilter !== "all" && item.status !== currentFilter) return false;
    if (!needle) return true;
    return [item.title, item.period, item.description, item.winner].join(" ").toLowerCase().includes(needle);
  });
}

function renderSummary() {
  const root = document.getElementById("history-summary");
  if (!root) return;
  const totalRaces = historyItems.reduce((sum, item) => sum + item.raceCount, 0);
  root.innerHTML = `
    <div class="championship-progress-card">
      <div class="championship-progress-value">${esc(historyItems.length)}</div>
      <div class="championship-progress-label">${esc(t("historySummaryTotal"))}</div>
    </div>
    <div class="championship-progress-card">
      <div class="championship-progress-value">${esc(totalRaces)}</div>
      <div class="championship-progress-label">${esc(t("historySummaryRaces"))}</div>
    </div>
  `;
}

function renderDetail(item) {
  const root = document.getElementById("history-detail");
  if (!root) return;
  if (!item) {
    root.innerHTML = `<div class="empty">${esc(t("historyEmpty"))}</div>`;
    return;
  }
  root.innerHTML = `
    <div class="championship-history-detail-head">
      <div>
        <div class="eyebrow">${esc(item.period || statusLabel(item.status))}</div>
        <h2 class="championship-history-detail-title">${esc(item.title)}</h2>
      </div>
      <span class="championship-history-chip is-${esc(item.status)}">${esc(statusLabel(item.status))}</span>
    </div>
    <p class="championship-history-detail-description">${esc(item.description || t("historyDetailNoDescription"))}</p>
    <div class="championship-history-detail-grid">
      <div class="championship-history-detail-stat">
        <div class="championship-history-detail-label">${esc(t("historyDetailWinner"))}</div>
        <div class="championship-history-detail-value">${esc(item.winner || "-")}</div>
      </div>
      <div class="championship-history-detail-stat">
        <div class="championship-history-detail-label">${esc(t("historyDetailRaces"))}</div>
        <div class="championship-history-detail-value">${esc(item.raceCount)}</div>
      </div>
      <div class="championship-history-detail-stat">
        <div class="championship-history-detail-label">${esc(t("historyDetailDrivers"))}</div>
        <div class="championship-history-detail-value">${esc(item.driverCount)}</div>
      </div>
    </div>
    <div class="championship-history-detail-grid championship-history-detail-podium">
      ${item.top3.map((row, index) => `
        <div class="championship-history-detail-stat">
          <div class="championship-history-detail-label">#${index + 1}</div>
          <div class="championship-history-detail-value">${esc(row.driver || row.public_id || "-")}</div>
        </div>
      `).join("")}
    </div>
    <div class="championship-history-detail-actions">
      <a class="championship-history-detail-link" href="${esc(championshipUrl(item.slug))}">${esc(t("historyDetailOpen"))}</a>
    </div>
  `;
}

function renderList() {
  const root = document.getElementById("history-list");
  if (!root) return;
  const items = filteredItems();
  if (!items.length) {
    root.innerHTML = `<div class="empty">${esc(t("historyEmpty"))}</div>`;
    renderDetail(null);
    return;
  }
  if (!items.some(item => item.slug === selectedSlug)) selectedSlug = items[0].slug;
  root.innerHTML = items.map(item => `
    <button class="championship-history-row${item.slug === selectedSlug ? " is-active" : ""}" type="button" data-history-slug="${esc(item.slug)}">
      <div class="championship-history-row-head">
        <div>
          <div class="championship-history-row-period">${esc(item.period || statusLabel(item.status))}</div>
          <div class="championship-history-row-title">${esc(item.title)}</div>
        </div>
        <span class="championship-history-chip is-${esc(item.status)}">${esc(statusLabel(item.status))}</span>
      </div>
      <div class="championship-history-row-meta">
        <span class="championship-history-chip">${esc(t("historyDetailWinner"))}: ${esc(item.winner || "-")}</span>
        <span class="championship-history-chip">${esc(t("historyDetailRaces"))}: ${esc(item.raceCount)}</span>
        <span class="championship-history-chip">${esc(t("historyDetailDrivers"))}: ${esc(item.driverCount)}</span>
      </div>
    </button>
  `).join("");

  root.querySelectorAll("[data-history-slug]").forEach(button => {
    button.addEventListener("click", () => {
      selectedSlug = button.dataset.historySlug || "";
      renderList();
    });
  });
  renderDetail(items.find(item => item.slug === selectedSlug) || items[0]);
}

function applyTranslations() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => { el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder)); });
  document.querySelectorAll(".lang-btn").forEach(button => {
    const active = button.dataset.lang === currentLang;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  renderSummary();
  renderList();
}

function bindLanguageButtons() {
  document.querySelectorAll(".lang-btn").forEach(button => {
    button.addEventListener("click", () => {
      const nextLang = button.dataset.lang || "en";
      if (nextLang === currentLang) return;
      currentLang = nextLang;
      localStorage.setItem("asgLang", currentLang);
      applyTranslations();
    });
  });
}

function bindFilters() {
  document.querySelectorAll(".championship-history-filter").forEach(button => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter || "all";
      document.querySelectorAll(".championship-history-filter").forEach(item => item.classList.toggle("is-active", item === button));
      renderList();
    });
  });
  document.getElementById("history-search")?.addEventListener("input", event => {
    currentSearch = event.target.value || "";
    renderList();
  });
}

function bindTopNavGroups() {
  const groups = [...document.querySelectorAll(".top-nav-group")];
  if (!groups.length) return;
  const closeGroup = (group) => {
    const toggle = group.querySelector(".top-nav-group-toggle");
    const menu = group.querySelector(".top-nav-group-menu");
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", "false");
    menu.hidden = true;
    group.classList.remove("is-open");
  };
  const closeAllGroups = (exceptGroup = null) => groups.forEach(group => { if (group !== exceptGroup) closeGroup(group); });
  groups.forEach(group => {
    const toggle = group.querySelector(".top-nav-group-toggle");
    const menu = group.querySelector(".top-nav-group-menu");
    if (!toggle || !menu) return;
    toggle.addEventListener("click", event => {
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
  });
  document.addEventListener("click", event => {
    if (!event.target.closest(".top-nav-group")) closeAllGroups();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeAllGroups();
  });
}

async function init() {
  bindLanguageButtons();
  bindFilters();
  bindTopNavGroups();
  applyTranslations();
  try {
    const [announcement, championships] = await Promise.all([
      loadJson(`${dataBase}/announcement.json`).catch(() => ({})),
      loadJson(`${dataBase}/championships.json`).catch(() => ({ items: [] }))
    ]);
    const activeSlug = String(announcement?.championship_slug || announcement?.championship?.slug || "").trim();
    historyItems = (Array.isArray(championships?.items) ? championships.items : [])
      .map(item => normalizeChampionship(item, activeSlug))
      .filter(Boolean)
      .sort((left, right) => String(right.period || right.title).localeCompare(String(left.period || left.title), "en"));
    selectedSlug = historyItems[0]?.slug || "";
  } catch {
    historyItems = [];
    selectedSlug = "";
  }
  applyTranslations();
}

init();

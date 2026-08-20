import {
  createAuthHeaderController,
  eloCategoryId,
  srCategory
} from "../../features/auth/header-auth.js";
import { createHttpClient } from "../../shared/http-client.js";
import { element } from "../../shared/safe-dom.js";
import { resolveRuntimeOverride } from "../../shared/runtime-config.js";
import { formatRatingMetric } from "../../shared/rating-format.js?v=20260820ratingsdot1";
import {
  catalogEntityTypeFromTab,
  catalogTabFromEntityType,
  filterCatalogEntries,
  resolveCatalogAssetUrl
} from "./catalog-model.js";
import { entityDetailHref } from "./detail-model.js";
import { loadPublicRatingSnapshot, normalizeRatingContext } from "./rating-model.js";

const COPY = {
  en: {
    title: "ASG Racing Clubs & Teams",
    subtitle: "Approved communities competing on ASG Racing servers.",
    clubs: "Clubs",
    teams: "Teams",
    general: "General",
    hourly: "Hourly",
    championship: "Championship",
    search: "Search by name",
    loading: "Loading clubs and teams…",
    unavailable: "The clubs and teams catalog is not published yet.",
    retry: "Try again",
    empty: "Nothing has been published in this section yet.",
    noMatches: "No clubs or teams match this search.",
    unranked: "Not ranked yet",
    noCountedRaces: "No counted races yet",
    points: "points",
    races: "races",
    members: "members",
    independent: "Independent team",
    updated: value => `Rating updated ${value}`,
    navSpecial: "Special Event",
    navChampionship: "Championship",
    navRules: "Rules",
    navNews: "News",
    navRacing: "Racing",
    navLastRaces: "Last Races",
    navStats: "Stats",
    navRating: "Rating",
    navCommunity: "Community",
    navAbout: "About Server",
    navClubs: "Clubs & Teams",
    footer: "Official ASG Racing clubs, teams and current standings."
  },
  ru: {
    title: "Клубы и команды ASG Racing",
    subtitle: "Подтверждённые сообщества, выступающие на серверах ASG Racing.",
    clubs: "Клубы",
    teams: "Команды",
    general: "Общий",
    hourly: "Часовые",
    championship: "Чемпионат",
    search: "Поиск по названию",
    loading: "Загружаем клубы и команды…",
    unavailable: "Каталог клубов и команд пока не опубликован.",
    retry: "Повторить",
    empty: "В этом разделе пока ничего не опубликовано.",
    noMatches: "По вашему запросу ничего не найдено.",
    unranked: "Пока без места",
    noCountedRaces: "Зачётных гонок пока нет",
    points: "очков",
    races: "гонок",
    members: "участников",
    independent: "Независимая команда",
    updated: value => `Рейтинг обновлён ${value}`,
    navSpecial: "Спецсобытие",
    navChampionship: "Чемпионат",
    navRules: "Правила",
    navNews: "Новости",
    navRacing: "Гонки",
    navLastRaces: "Последние гонки",
    navStats: "Статистика",
    navRating: "Рейтинг",
    navCommunity: "Сообщество",
    navAbout: "О сервере",
    navClubs: "Клубы и команды",
    footer: "Официальные клубы, команды и актуальный зачёт ASG Racing."
  }
};

function language(windowRef) {
  try {
    return windowRef.localStorage.getItem("asgLang") === "ru" ? "ru" : "en";
  } catch {
    return "en";
  }
}

function copy(lang, key, value) {
  const selected = COPY[lang][key] ?? COPY.en[key] ?? key;
  return typeof selected === "function" ? selected(value) : selected;
}

function number(value, digits = 0) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}

function ratingValue(documentRef, type, value, digits) {
  const numeric = value === null || value === undefined || value === "" ? NaN : Number(value);
  const category = type === "elo" ? eloCategoryId(numeric) : srCategory(numeric);
  return element(documentRef, "dd", {
    className: category ? `clubs-teams-rating-value ${type}-cat-${category}` : "clubs-teams-rating-value",
    text: formatRatingMetric(numeric, digits)
  });
}

export function countLabel(lang, type, value) {
  const count = Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
  if (lang !== "ru") {
    const singular = type === "members" ? "member" : "race";
    return `${number(count)} ${count === 1 ? singular : `${singular}s`}`;
  }
  const forms = type === "members"
    ? ["участник", "участника", "участников"]
    : ["гонка", "гонки", "гонок"];
  const mod100 = count % 100;
  const mod10 = count % 10;
  const form = mod100 >= 11 && mod100 <= 14 ? forms[2]
    : mod10 === 1 ? forms[0]
      : mod10 >= 2 && mod10 <= 4 ? forms[1] : forms[2];
  return `${number(count)} ${form}`;
}

function setupTabKeyboard(buttons) {
  buttons.forEach((button, index) => button.addEventListener("keydown", event => {
      const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (!step) return;
      event.preventDefault();
      const target = buttons[(index + step + buttons.length) % buttons.length];
      target.focus();
      target.click();
  }));
}

function formatDate(value, lang) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function setupNavigation(documentRef) {
  const close = () => documentRef.querySelectorAll(".top-nav-group.is-open").forEach(group => {
    group.classList.remove("is-open");
    group.querySelector(".top-nav-group-toggle")?.setAttribute("aria-expanded", "false");
    const menu = group.querySelector(".top-nav-group-menu");
    if (menu) menu.hidden = true;
  });
  documentRef.querySelectorAll(".top-nav-group").forEach(group => {
    const toggle = group.querySelector(".top-nav-group-toggle");
    const menu = group.querySelector(".top-nav-group-menu");
    toggle?.addEventListener("click", event => {
      event.stopPropagation();
      const open = !group.classList.contains("is-open");
      close();
      group.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      if (menu) menu.hidden = !open;
    });
  });
  documentRef.addEventListener("click", event => {
    if (!event.target.closest(".top-nav-group")) close();
  });
  documentRef.addEventListener("keydown", event => {
    if (event.key === "Escape") close();
  });
}

export function createCatalogPage({
  windowRef = window,
  documentRef = document,
  fetchImpl = windowRef.fetch.bind(windowRef)
} = {}) {
  const lang = language(windowRef);
  const initialParams = new URLSearchParams(windowRef.location.search);
  const initialTab = initialParams.get("tab");
  const state = {
    activeType: catalogEntityTypeFromTab(initialTab),
    activeContext: normalizeRatingContext(initialParams.get("context")),
    query: "",
    catalog: null,
    loading: true,
    error: false
  };
  const baseMeta = documentRef.querySelector('meta[name="clubs-teams-data-base"]')?.content;
  const dataBaseUrl = resolveRuntimeOverride({
    hostname: windowRef.location.hostname,
    searchParams: new URLSearchParams(windowRef.location.search),
    key: "clubsTeamsDataBase",
    fallback: baseMeta
  });
  const client = createHttpClient({ fetchImpl, defaultTimeoutMs: 8000 });
  const grid = documentRef.getElementById("clubs-teams-grid");
  const status = documentRef.getElementById("clubs-teams-status");
  const results = documentRef.getElementById("clubs-teams-results");
  const search = documentRef.getElementById("clubs-teams-search");
  let loadSequence = 0;

  const render = () => {
    documentRef.documentElement.lang = lang;
    documentRef.querySelectorAll("[data-clubs-copy]").forEach(node => {
      node.textContent = copy(lang, node.dataset.clubsCopy);
    });
    documentRef.querySelectorAll(".lang-btn[data-lang]").forEach(button => {
      button.classList.toggle("active", button.dataset.lang === lang);
    });
    documentRef.querySelectorAll("[data-catalog-type]").forEach(button => {
      const active = button.dataset.catalogType === state.activeType;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && results) results.setAttribute("aria-labelledby", button.id);
    });
    documentRef.querySelectorAll("[data-rating-context]").forEach(button => {
      const active = button.dataset.ratingContext === state.activeContext;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    search.placeholder = copy(lang, "search");
    grid.replaceChildren();
    status.replaceChildren();
    if (state.loading) {
      status.appendChild(element(documentRef, "div", {
        className: "clubs-teams-state",
        text: copy(lang, "loading"),
        attrs: { role: "status", "aria-live": "polite" }
      }));
      return;
    }
    if (state.error || !state.catalog) {
      const message = element(documentRef, "p", { text: copy(lang, "unavailable") });
      const retry = element(documentRef, "button", {
        className: "btn clubs-teams-retry",
        text: copy(lang, "retry"),
        attrs: { type: "button" }
      });
      retry.addEventListener("click", load);
      status.append(element(documentRef, "div", {
        className: "clubs-teams-state is-error",
        attrs: { role: "alert" }
      }, [message, retry]));
      return;
    }
    const source = state.activeType === "club" ? state.catalog.clubs : state.catalog.teams;
    const entries = filterCatalogEntries(source, state.query);
    const update = copy(lang, "updated", formatDate(state.catalog.pointer.completed_at, lang));
    status.appendChild(element(documentRef, "div", {
      className: "clubs-teams-updated",
      text: update
    }));
    if (!entries.length) {
      grid.appendChild(element(documentRef, "div", {
        className: "clubs-teams-state",
        text: state.query ? copy(lang, "noMatches") : copy(lang, "empty")
      }));
      return;
    }
    for (const entry of entries) {
      const logoUrl = resolveCatalogAssetUrl(
        dataBaseUrl,
        state.catalog.pointer.snapshot_id,
        entry.asset
      );
      const logo = logoUrl
        ? element(documentRef, "img", {
          className: "clubs-teams-logo",
          attrs: { src: logoUrl, alt: "", width: 72, height: 72, loading: "lazy", decoding: "async" }
        })
        : element(documentRef, "div", {
          className: "clubs-teams-logo clubs-teams-logo-fallback",
          text: entry.display_name.slice(0, 2).toLocaleUpperCase()
        });
      const affiliation = entry.entity_type === "team"
        ? (entry.club?.display_name || copy(lang, "independent"))
        : countLabel(lang, "members", entry.members_count);
      const hasCountedRaces = Number(entry.race_count) > 0;
      const metrics = element(documentRef, "dl", { className: "clubs-teams-metrics" }, [
        element(documentRef, "div", {}, [
          element(documentRef, "dt", { text: "ELO" }),
          ratingValue(documentRef, "elo", entry.average_elo, 1)
        ]),
        element(documentRef, "div", {}, [
          element(documentRef, "dt", { text: "SR" }),
          ratingValue(documentRef, "sr", entry.average_sr, 2)
        ])
      ]);
      grid.appendChild(element(documentRef, "a", {
        className: "clubs-teams-card",
        attrs: { href: entityDetailHref(entry.entity_type, entry.slug, { siteBase: "../" }) }
      }, [
        element(documentRef, "div", { className: "clubs-teams-card-head" }, [
          logo,
          element(documentRef, "div", { className: "clubs-teams-card-title" }, [
            element(documentRef, "span", {
              className: `clubs-teams-position${hasCountedRaces ? "" : " is-unranked"}`,
              text: hasCountedRaces ? `#${entry.position}` : copy(lang, "unranked")
            }),
            element(documentRef, "h2", { text: entry.display_name }),
            element(documentRef, "p", { text: affiliation })
          ])
        ]),
        hasCountedRaces
          ? element(documentRef, "div", { className: "clubs-teams-score" }, [
            element(documentRef, "strong", { text: number(entry.total_points, 2) }),
            element(documentRef, "span", { text: copy(lang, "points") }),
            element(documentRef, "small", { text: countLabel(lang, "races", entry.race_count) })
          ])
          : element(documentRef, "div", { className: "clubs-teams-score clubs-teams-score--empty", text: copy(lang, "noCountedRaces") }),
        metrics
      ]));
    }
  };

  const load = async () => {
    const sequence = ++loadSequence;
    const requestedContext = state.activeContext;
    state.loading = true;
    state.error = false;
    render();
    try {
      const catalog = await loadPublicRatingSnapshot({ client, dataBaseUrl, context: requestedContext });
      if (sequence !== loadSequence) return;
      state.catalog = catalog;
    } catch {
      if (sequence !== loadSequence) return;
      state.catalog = null;
      state.error = true;
    } finally {
      if (sequence !== loadSequence) return;
      state.loading = false;
      render();
    }
  };

  const catalogButtons = [...documentRef.querySelectorAll("[data-catalog-type]")];
  catalogButtons.forEach(button => {
    button.addEventListener("click", () => {
      state.activeType = button.dataset.catalogType;
      const url = new URL(windowRef.location.href);
      url.searchParams.set("tab", catalogTabFromEntityType(state.activeType));
      windowRef.history.replaceState(null, "", url);
      render();
    });
  });
  documentRef.querySelectorAll("[data-rating-context]").forEach(button => {
    button.addEventListener("click", () => {
      const next = normalizeRatingContext(button.dataset.ratingContext);
      if (next === state.activeContext) return;
      state.activeContext = next;
      const url = new URL(windowRef.location.href);
      if (next === "general") url.searchParams.delete("context");
      else url.searchParams.set("context", next);
      windowRef.history.replaceState(null, "", url);
      load();
    });
  });
  setupTabKeyboard(catalogButtons);
  search.addEventListener("input", () => {
    state.query = search.value;
    render();
  });
  documentRef.querySelectorAll(".lang-btn[data-lang]").forEach(button => {
    button.addEventListener("click", () => {
      try {
        windowRef.localStorage.setItem("asgLang", button.dataset.lang);
      } catch {
      }
      windowRef.location.reload();
    });
  });
  setupNavigation(documentRef);
  createAuthHeaderController();
  render();
  load();
  return { render, load, state };
}

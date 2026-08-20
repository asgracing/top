import {
  createAuthHeaderController,
  eloCategoryId,
  safeAvatarUrl,
  srCategory
} from "../../features/auth/header-auth.js";
import { createHttpClient } from "../../shared/http-client.js";
import { element } from "../../shared/safe-dom.js";
import { resolveRuntimeOverride } from "../../shared/runtime-config.js";
import { formatRatingMetric } from "../../shared/rating-format.js?v=20260820ratingsdot1";
import {
  entityDetailHref,
  entitySlugFromLocation,
  loadEntityDetail
} from "./detail-model.js";

const AUTH_BASE_URL = "https://auth.asgracing.ru";
const RACE_DETAILS_BASE_URL = "https://data.asgracing.ru/top-data/v2/races/details";
const ROSTER_AVATAR_LIMIT = 100;
const ROSTER_AVATAR_CONCURRENCY = 6;
const RACES_PER_PAGE = 10;
const rosterAvatarCache = new Map();

const COPY = {
  en: {
    club: "Club", team: "Team", back: "Back to clubs & teams", loading: "Loading profile…",
    unavailable: "This public profile is unavailable.", retry: "Try again", website: "Open website",
    requestMembership: "Request membership",
    requestTeamAffiliation: "Request team affiliation",
    inviteTeamAffiliation: "Invite team to my club",
    manageTeamAffiliation: "Manage club affiliation",
    rating: "General rating", position: "Position", points: "Points", races: "Races",
    members: "Members", roster: "Roster", relatedTeams: "Club teams", affiliatedClub: "Club",
    recent: "Recent counted races", noDescription: "No public description yet.", noRoster: "No active members.",
    noTeams: "No active teams.", noClub: "Independent team", noRaces: "No counted races yet.",
    leader: "Leader", member: "Member", date: "Date", track: "Track", format: "Format",
    mode: "Mode", openRace: "Open race", previous: "Previous", next: "Next", close: "Close",
    pageStatus: (page, total) => `Page ${page} of ${total}`,
    raceDetails: "Race details", winner: "Winner", drivers: "Drivers", bestLap: "Best lap",
    loadingRace: "Loading race details…", raceUnavailable: "Race details are unavailable.",
    counted: "Counted", notCounted: "Not counted",
    raceColumns: ["Pos.", "Start", "Δ Pos.", "Driver", "Best lap", "Car", "Gap", "Δ ELO", "SR", "Points"],
    updated: value => `Rating updated ${value}`,
    noRatingYet: "The ranking starts after the first counted race.",
    navSpecial: "Special Event", navChampionship: "Championship", navRules: "Rules", navNews: "News",
    navRacing: "Racing", navLastRaces: "Last Races", navStats: "Stats", navRating: "Rating",
    navCommunity: "Community", navAbout: "About Server", navClubs: "Clubs & Teams",
    footer: "Official ASG Racing clubs, teams and current standings."
  },
  ru: {
    club: "Клуб", team: "Команда", back: "Назад к клубам и командам", loading: "Загружаем профиль…",
    unavailable: "Этот публичный профиль недоступен.", retry: "Повторить", website: "Открыть сайт",
    requestMembership: "Подать заявку",
    requestTeamAffiliation: "Подать заявку от команды",
    inviteTeamAffiliation: "Пригласить команду в мой клуб",
    manageTeamAffiliation: "Управлять связью с клубом",
    rating: "Общий рейтинг", position: "Место", points: "Очки", races: "Гонки",
    members: "Участники", roster: "Состав", relatedTeams: "Команды клуба", affiliatedClub: "Клуб",
    recent: "Последние зачётные гонки", noDescription: "Публичное описание пока не добавлено.", noRoster: "Активных участников нет.",
    noTeams: "Активных команд нет.", noClub: "Независимая команда", noRaces: "Зачётных гонок пока нет.",
    leader: "Руководитель", member: "Участник", date: "Дата", track: "Трасса", format: "Формат",
    mode: "Режим", openRace: "Открыть гонку", previous: "Назад", next: "Вперёд", close: "Закрыть",
    pageStatus: (page, total) => `Страница ${page} из ${total}`,
    raceDetails: "Детали гонки", winner: "Победитель", drivers: "Пилоты", bestLap: "Лучший круг",
    loadingRace: "Загружаем детали гонки…", raceUnavailable: "Детали гонки недоступны.",
    counted: "Зачётная", notCounted: "Не в зачёте",
    raceColumns: ["Поз.", "Старт", "Δ поз.", "Пилот", "Лучший круг", "Автомобиль", "Отрыв", "Δ ELO", "SR", "Очки"],
    updated: value => `Рейтинг обновлён ${value}`,
    noRatingYet: "Место появится после первой зачётной гонки.",
    navSpecial: "Спецсобытие", navChampionship: "Чемпионат", navRules: "Правила", navNews: "Новости",
    navRacing: "Гонки", navLastRaces: "Последние гонки", navStats: "Статистика", navRating: "Рейтинг",
    navCommunity: "Сообщество", navAbout: "О сервере", navClubs: "Клубы и команды",
    footer: "Официальные клубы, команды и актуальный зачёт ASG Racing."
  }
};

const copy = (lang, key, ...values) => {
  const selected = COPY[lang][key] ?? COPY.en[key] ?? key;
  return typeof selected === "function" ? selected(...values) : selected;
};
const language = windowRef => {
  try { return windowRef.localStorage.getItem("asgLang") === "ru" ? "ru" : "en"; }
  catch { return "en"; }
};
const formattedNumber = (value, digits = 0) => value === null
  ? "—"
  : new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
const formattedDate = (value, lang) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(date);
};
const displayToken = value => String(value || "—").replaceAll("_", " ");
const displayTrack = value => displayToken(value).replace(/\b[a-zа-яё]/giu, letter => letter.toLocaleUpperCase());
const displayServer = value => raceValue(value).replace(/\s+-\s+(?:www\.|zahodi\b).*$/i, "");

function navigation(documentRef) {
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
  documentRef.addEventListener("click", event => { if (!event.target.closest(".top-nav-group")) close(); });
  documentRef.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
}

function stateNode(documentRef, lang, key, retry = null) {
  const children = [element(documentRef, "p", { text: copy(lang, key) })];
  if (retry) {
    const button = element(documentRef, "button", { className: "btn clubs-teams-retry", text: copy(lang, "retry"), attrs: { type: "button" } });
    button.addEventListener("click", retry);
    children.push(button);
  }
  return element(documentRef, "div", { className: "clubs-teams-state", attrs: { role: key === "loading" ? "status" : "alert", "aria-live": "polite" } }, children);
}

function metric(documentRef, label, value, extraClass = "", valueClass = "") {
  return element(documentRef, "div", { className: `clubs-teams-detail-metric ${extraClass}`.trim() }, [
    element(documentRef, "span", { text: label }), element(documentRef, "strong", { className: valueClass, text: value })
  ]);
}

function ratingValueClass(type, value) {
  const category = type === "elo" ? eloCategoryId(value) : srCategory(value);
  return `clubs-teams-rating-value${category ? ` ${type}-cat-${category}` : ""}`;
}

function createRaceTable({ documentRef, lang, races, onOpen }) {
  let activePage = 1;
  const tableWrap = element(documentRef, "div", { className: "clubs-teams-races-table-wrap" });
  const pagination = element(documentRef, "nav", { className: "clubs-teams-races-pagination", attrs: { "aria-label": copy(lang, "recent") } });
  const root = element(documentRef, "div", { className: "clubs-teams-races-list" }, [tableWrap, pagination]);
  const totalPages = Math.max(1, Math.ceil(races.length / RACES_PER_PAGE));
  const render = () => {
    const start = (activePage - 1) * RACES_PER_PAGE;
    const rows = races.slice(start, start + RACES_PER_PAGE).map(race => {
      const values = [
        ["date", formattedDate(race.race_started_at, lang)], ["track", displayToken(race.track_code)],
        ["format", displayToken(race.race_format)], ["mode", displayToken(race.competition_mode)],
        ["points", formattedNumber(race.points, 2)]
      ];
      const cells = values.map(([key, value], index) => element(documentRef, "td", { className: index === 4 ? "clubs-teams-race-points" : "", text: value, attrs: { "data-label": copy(lang, key) } }));
      const openButton = element(documentRef, "button", { className: "clubs-teams-race-open", text: "→", attrs: { type: "button", "aria-label": copy(lang, "openRace") } });
      cells.push(element(documentRef, "td", { className: "clubs-teams-race-action", attrs: { "data-label": copy(lang, "openRace") } }, [openButton]));
      const row = element(documentRef, "tr", { className: "clubs-teams-race-row", attrs: { tabindex: "0", role: "button" } }, cells);
      const open = () => onOpen(race, row);
      row.addEventListener("click", open);
      row.addEventListener("keydown", event => { if (event.key === "Enter") open(); });
      return row;
    });
    const headers = ["date", "track", "format", "mode", "points"].map(key => element(documentRef, "th", { text: copy(lang, key), attrs: { scope: "col" } }));
    headers.push(element(documentRef, "th", { text: "", attrs: { scope: "col", "aria-label": copy(lang, "openRace") } }));
    tableWrap.replaceChildren(element(documentRef, "table", { className: "clubs-teams-races-table" }, [
      element(documentRef, "thead", {}, [element(documentRef, "tr", {}, headers)]),
      element(documentRef, "tbody", {}, rows)
    ]));
    pagination.replaceChildren();
    if (totalPages <= 1) return;
    const pageButton = (label, page, disabled = false) => {
      const button = element(documentRef, "button", { className: "clubs-teams-races-page", text: label, attrs: { type: "button" } });
      button.disabled = disabled;
      button.addEventListener("click", () => { activePage = page; render(); });
      return button;
    };
    pagination.append(pageButton(copy(lang, "previous"), Math.max(1, activePage - 1), activePage === 1));
    pagination.append(element(documentRef, "span", { className: "clubs-teams-races-page-status", text: copy(lang, "pageStatus", activePage, totalPages) }));
    pagination.append(pageButton(copy(lang, "next"), Math.min(totalPages, activePage + 1), activePage === totalPages));
  };
  render();
  return root;
}

function raceDetailPath(raceUid) {
  const id = String(raceUid || "").trim().toLowerCase().replace(/\.json$/i, "").replace(/[^a-z0-9._-]+/g, "_").replace(/^[._-]+|[._-]+$/g, "");
  return id ? `${RACE_DETAILS_BASE_URL}/${encodeURIComponent(id)}.json` : null;
}

const raceValue = (value, fallback = "—") => value === null || value === undefined || value === "" ? fallback : String(value);
const raceNumber = value => value === null || value === undefined || value === "" ? NaN : Number(value);
const firstRaceNumber = (...values) => {
  for (const value of values) {
    const numeric = raceNumber(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return NaN;
};

function raceDriverIdentity(documentRef, result, siteBase) {
  const driver = result.public_id
    ? element(documentRef, "a", { className: "driver-link", text: raceValue(result.driver), attrs: { href: `${siteBase}driver/?id=${encodeURIComponent(result.public_id)}` } })
    : element(documentRef, "span", { text: raceValue(result.driver) });
  const driverNumber = firstRaceNumber(result.race_number, result.car_number, result.driver_number, result.number);
  const elo = firstRaceNumber(result.elo_rating_after, result.elo_after, result.new_rating, result.elo, result.elo_internal_rating);
  const meta = [];
  if (Number.isFinite(driverNumber)) meta.push(element(documentRef, "span", { className: "clubs-race-driver-number", text: `#${Math.trunc(driverNumber)}` }));
  if (Number.isFinite(elo)) meta.push(element(documentRef, "span", { className: ratingValueClass("elo", elo), text: String(Math.round(elo)) }));
  return element(documentRef, "div", { className: "clubs-race-driver-identity" }, [
    element(documentRef, "div", { className: "clubs-race-driver-name" }, [driver]),
    meta.length ? element(documentRef, "div", { className: "clubs-race-driver-meta" }, meta) : null
  ]);
}

function raceSafetyBadge(documentRef, result) {
  const rating = firstRaceNumber(result.safety_rating_after, result.safety_rating, result.new_sr);
  const delta = firstRaceNumber(result.safety_delta, result.safety_final_delta, result.delta_sr, result.safety_rating_delta, result.sr_delta);
  if (!Number.isFinite(rating)) return element(documentRef, "span", { text: "—" });
  const children = [element(documentRef, "span", { className: "clubs-race-sr-value", text: rating.toFixed(2) })];
  if (Number.isFinite(delta)) {
    children.push(element(documentRef, "span", {
      className: `clubs-race-sr-delta ${delta > 0 ? "delta-positive" : delta < 0 ? "delta-negative" : "delta-neutral"}`,
      text: `(${delta > 0 ? "+" : ""}${delta.toFixed(2)})`
    }));
  }
  return element(documentRef, "span", { className: `${ratingValueClass("sr", rating)} clubs-race-sr-badge` }, children);
}

function createRaceModal({ documentRef, client, lang, siteBase }) {
  const cache = new Map();
  let trigger = null;
  const title = element(documentRef, "h3", { className: "modal-title", text: "—", attrs: { id: "clubs-race-modal-title" } });
  const subtitle = element(documentRef, "p", { className: "modal-subtitle", text: "—" });
  const summary = element(documentRef, "div", { className: "race-modal-summary" });
  const table = element(documentRef, "div", { className: "table-wrap clubs-race-results-table" });
  const closeButton = element(documentRef, "button", { className: "modal-close", text: "✕", attrs: { type: "button", "aria-label": copy(lang, "close") } });
  const card = element(documentRef, "div", { className: "modal-card modal-card-race", attrs: { role: "dialog", "aria-modal": "true", "aria-labelledby": "clubs-race-modal-title" } }, [
    closeButton,
    element(documentRef, "div", { className: "modal-header" }, [element(documentRef, "div", {}, [element(documentRef, "div", { className: "eyebrow", text: copy(lang, "raceDetails") }), title, subtitle])]),
    summary,
    element(documentRef, "div", { className: "table-card table-card-modal" }, [table])
  ]);
  const overlay = element(documentRef, "div", { className: "modal-overlay clubs-race-modal", attrs: { "aria-hidden": "true" } }, [card]);
  documentRef.body.append(overlay);
  const close = () => {
    overlay.classList.remove("is-open"); overlay.setAttribute("aria-hidden", "true");
    documentRef.body.classList.remove("modal-open"); trigger?.focus?.();
  };
  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
  documentRef.addEventListener("keydown", event => { if (event.key === "Escape" && overlay.classList.contains("is-open")) close(); });

  const render = details => {
    const track = displayTrack(details.track || details.track_code || details.track_name);
    title.textContent = details.server_name ? `${track} [${displayServer(details.server_name)}]` : track;
    subtitle.textContent = `${formattedDate(details.finished_at || details.race_started_at, lang)} · ${copy(lang, details.counted_for_stats === false ? "notCounted" : "counted")}`;
    const summaryItems = [[copy(lang, "track"), track], [copy(lang, "winner"), raceValue(details.winner)], [copy(lang, "drivers"), raceValue(details.participants_count)], [copy(lang, "bestLap"), raceValue(details.best_lap)]];
    summary.replaceChildren(...summaryItems.map(([label, value]) => element(documentRef, "div", { className: "race-summary-card" }, [element(documentRef, "div", { className: "race-summary-label", text: label }), element(documentRef, "div", { className: "race-summary-value", text: value })])));
    const headers = copy(lang, "raceColumns").map(label => element(documentRef, "th", { text: label, attrs: { scope: "col" } }));
    const results = Array.isArray(details.results) ? details.results.slice(0, 200) : [];
    const rows = results.map(result => {
      const delta = raceNumber(result.positions_delta);
      const eloDelta = firstRaceNumber(result.elo_rating_delta, result.elo_delta, result.rating_delta, result.ratingDelta, result.elo_change, result.elo?.rating_delta, result.elo?.delta);
      return element(documentRef, "tr", {}, [
        element(documentRef, "td", { text: raceValue(result.position) }),
        element(documentRef, "td", { text: raceValue(result.start_position ?? result.starting_position) }),
        element(documentRef, "td", { className: Number.isFinite(delta) ? `positions-delta ${delta > 0 ? "delta-positive" : delta < 0 ? "delta-negative" : "delta-neutral"}` : "", text: Number.isFinite(delta) ? `${delta > 0 ? "+" : ""}${delta}` : "—" }),
        element(documentRef, "td", { className: "clubs-race-driver" }, [raceDriverIdentity(documentRef, result, siteBase)]),
        element(documentRef, "td", { className: result.had_best_lap ? "best-lap-value" : "", text: raceValue(result.best_lap) }),
        element(documentRef, "td", { text: raceValue(result.car_name) }),
        element(documentRef, "td", { text: raceValue(result.gap) }),
        element(documentRef, "td", { className: Number.isFinite(eloDelta) ? `positions-delta ${eloDelta > 0 ? "delta-positive" : eloDelta < 0 ? "delta-negative" : "delta-neutral"}` : "", text: Number.isFinite(eloDelta) ? `${eloDelta > 0 ? "+" : ""}${Math.round(eloDelta)}` : "—" }),
        element(documentRef, "td", {}, [raceSafetyBadge(documentRef, result)]),
        element(documentRef, "td", { text: raceValue(result.points, "0") })
      ]);
    });
    table.replaceChildren(results.length ? element(documentRef, "table", {}, [element(documentRef, "thead", {}, [element(documentRef, "tr", {}, headers)]), element(documentRef, "tbody", {}, rows)]) : element(documentRef, "div", { className: "clubs-teams-modal-state", text: copy(lang, "raceUnavailable") }));
  };
  const open = async (race, source) => {
    trigger = source; overlay.classList.add("is-open"); overlay.setAttribute("aria-hidden", "false"); documentRef.body.classList.add("modal-open");
    title.textContent = displayTrack(race.track_code); subtitle.textContent = formattedDate(race.race_started_at, lang); summary.replaceChildren();
    table.replaceChildren(element(documentRef, "div", { className: "clubs-teams-modal-state", text: copy(lang, "loadingRace"), attrs: { role: "status" } }));
    closeButton.focus();
    const path = raceDetailPath(race.race_uid);
    if (!path) return table.replaceChildren(element(documentRef, "div", { className: "clubs-teams-modal-state", text: copy(lang, "raceUnavailable") }));
    try {
      if (!cache.has(path)) cache.set(path, client.requestJson(path, { cache: "force-cache", retries: 1 }));
      render(await cache.get(path));
    } catch {
      cache.delete(path);
      table.replaceChildren(element(documentRef, "div", { className: "clubs-teams-modal-state", text: copy(lang, "raceUnavailable"), attrs: { role: "alert" } }));
    }
  };
  return { open, close };
}

export async function loadRosterAvatarUrl({ client, publicId, authBaseUrl = AUTH_BASE_URL }) {
  const normalizedId = String(publicId || "").trim();
  if (!normalizedId) return null;
  if (!rosterAvatarCache.has(normalizedId)) {
    rosterAvatarCache.set(normalizedId, client.requestJson(
      `${String(authBaseUrl).replace(/\/+$/, "")}/v1/drivers/${encodeURIComponent(normalizedId)}/steam-profile`,
      { cache: "force-cache", retries: 0, timeoutMs: 5000 }
    ).then(payload => safeAvatarUrl(payload?.avatar_url)).catch(() => null));
  }
  return rosterAvatarCache.get(normalizedId);
}

function rosterBadge(documentRef, type, value) {
  if (!Number.isFinite(value)) return null;
  const category = type === "elo" ? eloCategoryId(value) : srCategory(value);
  const formatted = type === "elo" ? String(Math.round(value)) : value.toFixed(2);
  return element(documentRef, "span", {
    className: `clubs-teams-roster-rating ${type}-cat-${category}`,
    attrs: { "aria-label": `${type.toUpperCase()}: ${formatted}` }
  }, [
    element(documentRef, "span", { className: "clubs-teams-roster-rating-rank", text: type === "elo" ? `C${category}` : category }),
    element(documentRef, "span", { className: "clubs-teams-roster-rating-value", text: formatted })
  ]);
}

async function hydrateRosterAvatars({ documentRef, client, targets }) {
  const queue = targets.slice(0, ROSTER_AVATAR_LIMIT);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < queue.length) {
      const target = queue[nextIndex++];
      const avatarUrl = await loadRosterAvatarUrl({ client, publicId: target.publicId });
      if (!avatarUrl || !target.node.isConnected) continue;
      const image = element(documentRef, "img", {
        className: "clubs-teams-roster-avatar-image",
        attrs: { alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
      });
      image.addEventListener("load", () => target.node.classList.add("has-image"), { once: true });
      image.addEventListener("error", () => image.remove(), { once: true });
      target.node.append(image);
      image.src = avatarUrl;
    }
  };
  await Promise.all(Array.from(
    { length: Math.min(ROSTER_AVATAR_CONCURRENCY, queue.length) },
    () => worker()
  ));
}

function renderProfile({ documentRef, lang, siteBase, entityType, result, client }) {
  const { detail, pointer, assetUrl } = result;
  const root = documentRef.getElementById("clubs-teams-detail-root");
  root.replaceChildren();
  documentRef.title = `${detail.display_name} | ASG Racing`;
  documentRef.querySelector('meta[name="description"]')?.setAttribute("content", detail.description_en || detail.description_ru || `${detail.display_name} ASG Racing`);
  const canonical = documentRef.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = new URL(entityDetailHref(entityType, detail.slug, { siteBase: "/" }), "https://asgracing.ru/").href;

  const logo = assetUrl
    ? element(documentRef, "img", { className: "clubs-teams-detail-logo", attrs: { src: assetUrl, alt: "", width: 132, height: 132 } })
    : element(documentRef, "div", { className: "clubs-teams-detail-logo clubs-teams-logo-fallback", text: detail.display_name.slice(0, 2).toLocaleUpperCase() });
  const description = (lang === "ru" ? detail.description_ru : detail.description_en)
    || detail.description_en || detail.description_ru || copy(lang, "noDescription");
  const actions = [];
  if (detail.website_url) actions.push(element(documentRef, "a", {
    className: "btn btn-primary", text: copy(lang, "website"),
    attrs: { href: detail.website_url, target: "_blank", rel: "noopener noreferrer" }
  }));
  const requestUrl = new URL(`${siteBase}account/`, window.location.origin);
  requestUrl.searchParams.set("membership_type", entityType);
  requestUrl.searchParams.set("membership_target", detail.public_id);
  requestUrl.searchParams.set("membership_name", detail.display_name);
  actions.push(element(documentRef, "a", {
    className: "btn btn-primary", text: copy(lang, "requestMembership"),
    attrs: { href: `${requestUrl.pathname}${requestUrl.search}` }
  }));
  const affiliationUrl = new URL(`${siteBase}account/`, window.location.origin);
  const affiliationAction = entityType === "club" ? "request" : detail.club ? "detach" : "invite";
  affiliationUrl.searchParams.set("affiliation_action", affiliationAction);
  affiliationUrl.searchParams.set("affiliation_target", detail.public_id);
  affiliationUrl.searchParams.set("affiliation_name", detail.display_name);
  actions.push(element(documentRef, "a", {
    className: "btn btn-secondary", text: copy(lang, entityType === "club"
      ? "requestTeamAffiliation"
      : detail.club ? "manageTeamAffiliation" : "inviteTeamAffiliation"),
    attrs: { href: `${affiliationUrl.pathname}${affiliationUrl.search}` }
  }));
  const hero = element(documentRef, "section", { className: "clubs-teams-detail-hero" }, [
    logo,
    element(documentRef, "div", { className: "clubs-teams-detail-copy" }, [
      element(documentRef, "h1", { text: detail.display_name }),
      detail.short_name ? element(documentRef, "p", { className: "clubs-teams-detail-short", text: detail.short_name }) : null,
      element(documentRef, "p", { className: "clubs-teams-detail-description", text: description })
    ]),
    actions.length ? element(documentRef, "aside", { className: "clubs-teams-detail-actions" }, actions) : null
  ]);

  const rating = detail.rating;
  const hasCountedRaces = Boolean(rating && Number(rating.race_count) > 0);
  const ratingPanel = element(documentRef, "section", { className: "clubs-teams-detail-panel", attrs: { "aria-labelledby": "detail-rating-title" } }, [
    element(documentRef, "div", { className: "clubs-teams-detail-section-head" }, [
      element(documentRef, "h2", { text: copy(lang, "rating"), attrs: { id: "detail-rating-title" } }),
      element(documentRef, "span", { className: "clubs-teams-updated", text: copy(lang, "updated", formattedDate(pointer.completed_at, lang)) })
    ]),
    !hasCountedRaces ? element(documentRef, "p", { className: "clubs-teams-rating-empty", text: copy(lang, "noRatingYet") }) : null,
    element(documentRef, "div", { className: `clubs-teams-detail-metrics${hasCountedRaces ? "" : " is-unranked"}` }, [
      metric(documentRef, copy(lang, "position"), hasCountedRaces ? `#${rating.position}` : "—", "is-accent"),
      metric(documentRef, copy(lang, "points"), hasCountedRaces ? formattedNumber(rating.total_points, 2) : "—"),
      metric(documentRef, copy(lang, "races"), rating ? formattedNumber(rating.race_count) : "—"),
      metric(
        documentRef,
        "ELO",
        rating ? formatRatingMetric(rating.average_elo, 1) : "—",
        "",
        ratingValueClass("elo", rating?.average_elo)
      ),
      metric(
        documentRef,
        "SR",
        rating ? formatRatingMetric(rating.average_sr, 2) : "—",
        "",
        ratingValueClass("sr", rating?.average_sr)
      ),
      metric(documentRef, copy(lang, "members"), rating ? formattedNumber(rating.members_count) : formattedNumber(detail.roster.length))
    ])
  ]);

  const avatarTargets = [];
  const rosterChildren = detail.roster.length ? detail.roster.map(member => {
    const avatar = element(documentRef, "span", {
      className: "clubs-teams-roster-avatar",
      text: member.display_name.slice(0, 2).toLocaleUpperCase()
    });
    avatarTargets.push({ node: avatar, publicId: member.public_id });
    const badges = [rosterBadge(documentRef, "elo", member.elo), rosterBadge(documentRef, "sr", member.safety_rating)].filter(Boolean);
    return element(documentRef, "a", {
      className: "clubs-teams-roster-card",
      attrs: { href: `${siteBase}driver/?id=${encodeURIComponent(member.public_id)}` }
    }, [
      avatar,
      element(documentRef, "span", { className: "clubs-teams-roster-name", text: member.display_name }),
      element(documentRef, "span", { className: "clubs-teams-roster-meta" }, [
        element(documentRef, "span", { className: "clubs-teams-roster-role", text: member.role === "member" ? copy(lang, "member") : copy(lang, "leader") }),
        badges.length ? element(documentRef, "span", { className: "clubs-teams-roster-ratings" }, badges) : null
      ])
    ]);
  }) : [element(documentRef, "p", { className: "clubs-teams-detail-empty", text: copy(lang, "noRoster") })];
  const rosterPanel = element(documentRef, "section", { className: "clubs-teams-detail-panel", attrs: { "aria-labelledby": "detail-roster-title" } }, [
    element(documentRef, "h2", { text: copy(lang, "roster"), attrs: { id: "detail-roster-title" } }),
    element(documentRef, "div", { className: "clubs-teams-roster-grid" }, rosterChildren)
  ]);

  const relationTitle = entityType === "club" ? copy(lang, "relatedTeams") : copy(lang, "affiliatedClub");
  const relations = entityType === "club" ? detail.teams : (detail.club ? [detail.club] : []);
  const relationChildren = relations.length ? relations.map(item => element(documentRef, "a", {
    className: "clubs-teams-related-card",
    attrs: { href: entityDetailHref(entityType === "club" ? "team" : "club", item.slug, { siteBase }) }
  }, [
    element(documentRef, "strong", { text: item.display_name }),
    element(documentRef, "span", { text: entityType === "club" ? copy(lang, "team") : copy(lang, "club") })
  ])) : [element(documentRef, "p", { className: "clubs-teams-detail-empty", text: copy(lang, entityType === "club" ? "noTeams" : "noClub") })];
  const relationPanel = element(documentRef, "section", { className: "clubs-teams-detail-panel", attrs: { "aria-labelledby": "detail-relation-title" } }, [
    element(documentRef, "h2", { text: relationTitle, attrs: { id: "detail-relation-title" } }),
    element(documentRef, "div", { className: "clubs-teams-related-grid" }, relationChildren)
  ]);

  const raceModal = detail.recent_races.length ? createRaceModal({ documentRef, client, lang, siteBase }) : null;
  const raceContent = detail.recent_races.length
    ? createRaceTable({ documentRef, lang, races: detail.recent_races, onOpen: raceModal.open })
    : element(documentRef, "p", { className: "clubs-teams-detail-empty", text: copy(lang, "noRaces") });
  const racePanel = element(documentRef, "section", { className: "clubs-teams-detail-panel clubs-teams-detail-races", attrs: { "aria-labelledby": "detail-races-title" } }, [
    element(documentRef, "h2", { text: copy(lang, "recent"), attrs: { id: "detail-races-title" } }),
    raceContent
  ]);
  root.append(hero, ratingPanel, element(documentRef, "div", { className: "clubs-teams-detail-columns" }, [rosterPanel, relationPanel]), racePanel);
  void hydrateRosterAvatars({ documentRef, client, targets: avatarTargets });
}

export function createEntityDetailPage({
  entityType,
  siteBase = "../",
  windowRef = window,
  documentRef = document,
  fetchImpl = windowRef.fetch.bind(windowRef)
}) {
  const lang = language(windowRef);
  const root = documentRef.getElementById("clubs-teams-detail-root");
  const baseMeta = documentRef.querySelector('meta[name="clubs-teams-data-base"]')?.content;
  const dataBaseUrl = resolveRuntimeOverride({
    hostname: windowRef.location.hostname,
    searchParams: new URLSearchParams(windowRef.location.search),
    key: "clubsTeamsDataBase",
    fallback: baseMeta
  });
  const client = createHttpClient({ fetchImpl, defaultTimeoutMs: 8000 });
  const slug = entitySlugFromLocation({ pathname: windowRef.location.pathname, search: windowRef.location.search, entityType });
  documentRef.documentElement.lang = lang;
  documentRef.querySelectorAll("[data-detail-copy]").forEach(node => { node.textContent = copy(lang, node.dataset.detailCopy); });
  documentRef.querySelectorAll(".lang-btn[data-lang]").forEach(button => {
    button.classList.toggle("active", button.dataset.lang === lang);
    button.addEventListener("click", () => {
      try { windowRef.localStorage.setItem("asgLang", button.dataset.lang); } catch {}
      windowRef.location.reload();
    });
  });
  navigation(documentRef);
  createAuthHeaderController();
  const load = async () => {
    root.replaceChildren(stateNode(documentRef, lang, "loading"));
    if (!slug) { root.replaceChildren(stateNode(documentRef, lang, "unavailable")); return; }
    try {
      renderProfile({ documentRef, lang, siteBase, entityType, result: await loadEntityDetail({ client, dataBaseUrl, entityType, slug }), client });
    } catch {
      root.replaceChildren(stateNode(documentRef, lang, "unavailable", load));
    }
  };
  load();
  return { load, slug };
}

import { createAuthHeaderController } from "../../features/auth/header-auth.js";
import { createHttpClient } from "../../shared/http-client.js";
import { element } from "../../shared/safe-dom.js";
import { resolveRuntimeOverride } from "../../shared/runtime-config.js";
import {
  entityDetailHref,
  entitySlugFromLocation,
  loadEntityDetail
} from "./detail-model.js";

const COPY = {
  en: {
    club: "Club", team: "Team", back: "Back to clubs & teams", loading: "Loading profile…",
    unavailable: "This public profile is unavailable.", retry: "Try again", website: "Open website",
    requestMembership: "Request membership",
    rating: "General rating", position: "Position", points: "Points", races: "Races",
    members: "Members", roster: "Roster", relatedTeams: "Club teams", affiliatedClub: "Club",
    recent: "Recent counted races", noDescription: "No public description yet.", noRoster: "No active members.",
    noTeams: "No active teams.", noClub: "Independent team", noRaces: "No counted races yet.",
    leader: "Leader", member: "Member", date: "Date", track: "Track", format: "Format",
    mode: "Mode", updated: value => `Rating updated ${value}`,
    footer: "Public club and team data is published from an isolated, moderated ASG Racing snapshot."
  },
  ru: {
    club: "Клуб", team: "Команда", back: "Назад к клубам и командам", loading: "Загружаем профиль…",
    unavailable: "Этот публичный профиль недоступен.", retry: "Повторить", website: "Открыть сайт",
    requestMembership: "Подать заявку",
    rating: "Общий рейтинг", position: "Место", points: "Очки", races: "Гонки",
    members: "Участники", roster: "Состав", relatedTeams: "Команды клуба", affiliatedClub: "Клуб",
    recent: "Последние зачётные гонки", noDescription: "Публичное описание пока не добавлено.", noRoster: "Активных участников нет.",
    noTeams: "Активных команд нет.", noClub: "Независимая команда", noRaces: "Зачётных гонок пока нет.",
    leader: "Руководитель", member: "Участник", date: "Дата", track: "Трасса", format: "Формат",
    mode: "Режим", updated: value => `Рейтинг обновлён ${value}`,
    footer: "Публичные сведения о клубах и командах публикуются из изолированного модерируемого snapshot ASG Racing."
  }
};

const copy = (lang, key, value) => {
  const selected = COPY[lang][key] ?? COPY.en[key] ?? key;
  return typeof selected === "function" ? selected(value) : selected;
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

function metric(documentRef, label, value, extraClass = "") {
  return element(documentRef, "div", { className: `clubs-teams-detail-metric ${extraClass}`.trim() }, [
    element(documentRef, "span", { text: label }), element(documentRef, "strong", { text: value })
  ]);
}

function renderProfile({ documentRef, lang, siteBase, entityType, result }) {
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
  const hero = element(documentRef, "section", { className: "clubs-teams-detail-hero" }, [
    logo,
    element(documentRef, "div", { className: "clubs-teams-detail-copy" }, [
      element(documentRef, "p", { className: "clubs-teams-eyebrow", text: copy(lang, entityType) }),
      element(documentRef, "h1", { text: detail.display_name }),
      detail.short_name ? element(documentRef, "p", { className: "clubs-teams-detail-short", text: detail.short_name }) : null,
      element(documentRef, "p", { className: "clubs-teams-detail-description", text: description }),
      actions.length ? element(documentRef, "div", { className: "clubs-teams-detail-actions" }, actions) : null
    ])
  ]);

  const rating = detail.rating;
  const ratingPanel = element(documentRef, "section", { className: "clubs-teams-detail-panel", attrs: { "aria-labelledby": "detail-rating-title" } }, [
    element(documentRef, "div", { className: "clubs-teams-detail-section-head" }, [
      element(documentRef, "h2", { text: copy(lang, "rating"), attrs: { id: "detail-rating-title" } }),
      element(documentRef, "span", { className: "clubs-teams-updated", text: copy(lang, "updated", formattedDate(pointer.completed_at, lang)) })
    ]),
    element(documentRef, "div", { className: "clubs-teams-detail-metrics" }, [
      metric(documentRef, copy(lang, "position"), rating ? `#${rating.position}` : "—", "is-accent"),
      metric(documentRef, copy(lang, "points"), rating ? formattedNumber(rating.total_points, 2) : "—"),
      metric(documentRef, copy(lang, "races"), rating ? formattedNumber(rating.race_count) : "—"),
      metric(documentRef, "ELO", rating ? formattedNumber(rating.average_elo, 1) : "—"),
      metric(documentRef, "SR", rating ? formattedNumber(rating.average_sr, 2) : "—"),
      metric(documentRef, copy(lang, "members"), rating ? formattedNumber(rating.members_count) : formattedNumber(detail.roster.length))
    ])
  ]);

  const rosterChildren = detail.roster.length ? detail.roster.map(member => element(documentRef, "a", {
    className: "clubs-teams-roster-card",
    attrs: { href: `${siteBase}driver/?id=${encodeURIComponent(member.public_id)}` }
  }, [
    element(documentRef, "span", { className: "clubs-teams-roster-avatar", text: member.display_name.slice(0, 2).toLocaleUpperCase() }),
    element(documentRef, "span", { className: "clubs-teams-roster-name", text: member.display_name }),
    element(documentRef, "span", { className: "clubs-teams-roster-role", text: member.role === "member" ? copy(lang, "member") : copy(lang, "leader") })
  ])) : [element(documentRef, "p", { className: "clubs-teams-detail-empty", text: copy(lang, "noRoster") })];
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

  const raceChildren = detail.recent_races.length ? detail.recent_races.map(race => element(documentRef, "article", { className: "clubs-teams-race-card" }, [
    element(documentRef, "div", { className: "clubs-teams-race-main" }, [
      element(documentRef, "strong", { text: displayToken(race.track_code) }),
      element(documentRef, "span", { text: formattedDate(race.race_started_at, lang) })
    ]),
    element(documentRef, "dl", {}, [
      element(documentRef, "div", {}, [element(documentRef, "dt", { text: copy(lang, "format") }), element(documentRef, "dd", { text: displayToken(race.race_format) })]),
      element(documentRef, "div", {}, [element(documentRef, "dt", { text: copy(lang, "mode") }), element(documentRef, "dd", { text: displayToken(race.competition_mode) })]),
      element(documentRef, "div", {}, [element(documentRef, "dt", { text: copy(lang, "points") }), element(documentRef, "dd", { text: formattedNumber(race.points, 2) })])
    ])
  ])) : [element(documentRef, "p", { className: "clubs-teams-detail-empty", text: copy(lang, "noRaces") })];
  const racePanel = element(documentRef, "section", { className: "clubs-teams-detail-panel clubs-teams-detail-races", attrs: { "aria-labelledby": "detail-races-title" } }, [
    element(documentRef, "h2", { text: copy(lang, "recent"), attrs: { id: "detail-races-title" } }),
    element(documentRef, "div", { className: "clubs-teams-race-grid" }, raceChildren)
  ]);
  root.append(hero, ratingPanel, element(documentRef, "div", { className: "clubs-teams-detail-columns" }, [rosterPanel, relationPanel]), racePanel);
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
      renderProfile({ documentRef, lang, siteBase, entityType, result: await loadEntityDetail({ client, dataBaseUrl, entityType, slug }) });
    } catch {
      root.replaceChildren(stateNode(documentRef, lang, "unavailable", load));
    }
  };
  load();
  return { load, slug };
}

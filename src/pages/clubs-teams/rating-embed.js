import { createHttpClient } from "../../shared/http-client.js";
import { resolveRuntimeOverride } from "../../shared/runtime-config.js";
import { element } from "../../shared/safe-dom.js";
import { entityDetailHref } from "./detail-model.js";
import { loadPublicRatingSnapshot, normalizeRatingContext } from "./rating-model.js";

const COPY = {
  en: { general: "General", hourly: "Hourly", championship: "Championship", title: "Clubs & Teams", clubs: "Clubs", teams: "Teams", loading: "Loading standings…", unavailable: "Team standings are not published yet.", empty: "No rated entries yet.", points: "pts", races: "races", all: "Full standings" },
  ru: { general: "Общий", hourly: "Часовые", championship: "Чемпионат", title: "Клубы и команды", clubs: "Клубы", teams: "Команды", loading: "Загружаем зачёт…", unavailable: "Командный зачёт пока не опубликован.", empty: "В зачёте пока нет участников.", points: "очк.", races: "гонок", all: "Полный зачёт" }
};

const text = (lang, key) => COPY[lang][key] ?? COPY.en[key] ?? key;
const number = (value, digits = 0) => new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);

export function createRatingEmbed({
  context,
  rootId = "clubs-teams-rating-embed",
  siteBase = "../",
  windowRef = window,
  documentRef = document,
  fetchImpl = windowRef.fetch.bind(windowRef)
}) {
  const root = documentRef.getElementById(rootId);
  if (!root) return null;
  const lang = (() => { try { return windowRef.localStorage.getItem("asgLang") === "ru" ? "ru" : "en"; } catch { return "en"; } })();
  const normalizedContext = normalizeRatingContext(context);
  const baseMeta = documentRef.querySelector('meta[name="clubs-teams-data-base"]')?.content || "https://data.asgracing.ru/public-cache-clubs-teams";
  const dataBaseUrl = resolveRuntimeOverride({
    hostname: windowRef.location.hostname,
    searchParams: new URLSearchParams(windowRef.location.search),
    key: "clubsTeamsDataBase",
    fallback: baseMeta
  });
  const client = createHttpClient({ fetchImpl, defaultTimeoutMs: 8000 });
  const state = { entityType: "team", snapshot: null, loading: true, error: false };

  const render = () => {
    root.replaceChildren();
    const heading = element(documentRef, "div", { className: "clubs-rating-embed-head" }, [
      element(documentRef, "div", {}, [
        element(documentRef, "p", { className: "clubs-rating-embed-eyebrow", text: text(lang, normalizedContext) }),
        element(documentRef, "h2", { text: text(lang, "title") })
      ]),
      element(documentRef, "div", { className: "clubs-rating-embed-tabs", attrs: { role: "tablist" } }, ["team", "club"].map(entityType => {
        const active = state.entityType === entityType;
        const button = element(documentRef, "button", {
          className: `clubs-rating-embed-tab${active ? " is-active" : ""}`,
          text: text(lang, entityType === "team" ? "teams" : "clubs"),
          attrs: { type: "button", role: "tab", "aria-selected": String(active) }
        });
        button.addEventListener("click", () => { state.entityType = entityType; render(); });
        return button;
      }))
    ]);
    root.appendChild(heading);
    if (state.loading || state.error || !state.snapshot) {
      root.appendChild(element(documentRef, "div", {
        className: `clubs-rating-embed-state${state.error ? " is-error" : ""}`,
        text: text(lang, state.error ? "unavailable" : "loading"),
        attrs: { role: state.error ? "alert" : "status", "aria-live": "polite" }
      }));
      return;
    }
    const rows = (state.entityType === "team" ? state.snapshot.teams : state.snapshot.clubs).slice(0, 5);
    const list = element(documentRef, "div", { className: "clubs-rating-embed-list" });
    if (!rows.length) list.appendChild(element(documentRef, "div", { className: "clubs-rating-embed-state", text: text(lang, "empty") }));
    rows.forEach(row => list.appendChild(element(documentRef, "a", {
      className: "clubs-rating-embed-row",
      attrs: { href: entityDetailHref(row.entity_type, row.slug, { siteBase }) }
    }, [
      element(documentRef, "span", { className: "clubs-rating-embed-position", text: `#${row.position}` }),
      element(documentRef, "strong", { text: row.display_name }),
      element(documentRef, "span", { className: "clubs-rating-embed-score", text: `${number(row.total_points, 2)} ${text(lang, "points")}` }),
      element(documentRef, "small", { text: `${number(row.race_count)} ${text(lang, "races")}` })
    ])));
    root.append(list, element(documentRef, "a", {
      className: "clubs-rating-embed-all",
      text: text(lang, "all"),
      attrs: { href: `${siteBase}teams/?context=${normalizedContext}&tab=${state.entityType}s` }
    }));
  };

  const load = async () => {
    state.loading = true; state.error = false; render();
    try { state.snapshot = await loadPublicRatingSnapshot({ client, dataBaseUrl, context: normalizedContext }); }
    catch { state.snapshot = null; state.error = true; }
    finally { state.loading = false; render(); }
  };
  load();
  return { load, render, state };
}

import { safeImageUrl } from "../src/shared/safe-dom.js";
import {
  initializeLocalizedPage,
  resolvePageLocale,
  setPageLocale
} from "../src/shared/localized-page.js?v=20260920locale1";

initializeLocalizedPage();

const currentLang = resolvePageLocale({ windowRef: window, documentRef: document }).language;
const COPY = {
  en: {
    title: "Championship Event",
    eyebrow: "ASG Racing Special Event",
    prizes: "Prizes",
    top3: "Top 3",
    standings: "Standings",
    races: "Races",
    prize: "Prize",
    place: "Place",
    noPrizes: "No prize images yet.",
    noResults: "No results yet.",
    driver: "Driver",
    total: "Total",
    noStandings: "No standings yet.",
    race: "Race",
    winner: "Winner",
    bestLap: "Best lap",
    noRaces: "No races yet.",
    missingSlug: "Missing championship slug.",
    loadError: "Failed to load event data."
  },
  ru: {
    title: "Событие чемпионата",
    eyebrow: "Специальное событие ASG Racing",
    prizes: "Призы",
    top3: "Топ-3",
    standings: "Положение участников",
    races: "Гонки",
    prize: "Приз",
    place: "Место",
    noPrizes: "Изображения призов пока не добавлены.",
    noResults: "Результатов пока нет.",
    driver: "Пилот",
    total: "Итого",
    noStandings: "Таблица результатов пока пуста.",
    race: "Гонка",
    winner: "Победитель",
    bestLap: "Лучший круг",
    noRaces: "Гонок пока нет.",
    missingSlug: "Не указан идентификатор чемпионата.",
    loadError: "Не удалось загрузить данные события."
  }
};
const t = key => COPY[currentLang]?.[key] || COPY.en[key] || key;

const params = new URLSearchParams(window.location.search);
const pathSlug = window.location.pathname.split("/").filter(Boolean).pop();
const slug = params.get("slug") || (pathSlug && pathSlug !== "events" ? pathSlug : "");
const defaultHourlyDataBaseUrl =
  window.location.hostname === "asgracing.ru"
    ? "https://data.asgracing.ru/hourly-data"
    : window.location.hostname === "asgracing.github.io"
      ? "https://asgracing.github.io/hourly-data"
      : "/hourly-data";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function prizeItems(prizes) {
  if (Array.isArray(prizes)) return prizes;
  if (!prizes || typeof prizes !== "object") return [];
  return [prizes.prize1, prizes.prize2, prizes.prize3].filter(Boolean);
}

function renderPrizes(data) {
  const grid = document.getElementById("prize-grid");
  const prizes = prizeItems(data.prizes)
    .map(src => safeImageUrl(src, window.location.href, { allowedOrigins: [defaultHourlyDataBaseUrl] }))
    .filter(Boolean);
  grid.innerHTML = prizes.length
    ? prizes.map((src, index) => `
        <figure class="prize-card">
          <img src="${esc(src)}" alt="${esc(t("prize"))} ${index + 1}" />
          <figcaption>${esc(t("place"))} ${index + 1}</figcaption>
        </figure>
      `).join("")
    : `<div class="empty">${esc(t("noPrizes"))}</div>`;
}

function renderPodium(data) {
  const grid = document.getElementById("podium-grid");
  const rows = data.results_top3 || data.standings?.slice(0, 3) || [];
  grid.innerHTML = rows.length
    ? rows.map(row => `
        <article class="podium-card">
          <div class="podium-rank">#${esc(row.rank)}</div>
          <div class="podium-driver">${esc(row.driver || row.public_id)}</div>
          <div class="podium-points">${esc(row.points)} pts</div>
        </article>
      `).join("")
    : `<div class="empty">${esc(t("noResults"))}</div>`;
}

function renderStandings(data) {
  const table = document.getElementById("standings-table");
  const races = data.races || [];
  const raceHeaders = races.map((race, index) => `<th>R${index + 1}</th>`).join("");
  const rows = (data.standings || []).map(row => {
    const racePoints = races.map(race => `<td>${esc(row.race_points?.[race.event_id] ?? "-")}</td>`).join("");
    return `
      <tr>
        <td>${esc(row.rank)}</td>
        <td>${esc(row.driver || row.public_id)}</td>
        ${racePoints}
        <td>${esc(row.points)}</td>
      </tr>
    `;
  }).join("");
  table.innerHTML = rows
    ? `<table><thead><tr><th>#</th><th>${esc(t("driver"))}</th>${raceHeaders}<th>${esc(t("total"))}</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<div class="empty">${esc(t("noStandings"))}</div>`;
}

function renderRaces(data) {
  const list = document.getElementById("race-list");
  const races = data.races || [];
  list.innerHTML = races.length
    ? races.map(race => `
        <article class="race-card">
          <div>
            <strong>${esc(race.track_name || race.track || t("race"))}</strong>
            <span>${esc(race.finished_at_local || race.finished_at || "")}</span>
          </div>
          <div>${esc(t("winner"))}: ${esc(race.winner || "-")}</div>
          <div>${esc(t("bestLap"))}: ${esc(race.best_lap || "-")}</div>
        </article>
      `).join("")
    : `<div class="empty">${esc(t("noRaces"))}</div>`;
}

function applyLanguage() {
  document.documentElement.lang = currentLang;
  document.title = `${t("title")} | ASG Racing`;
  const eventTitle = document.getElementById("event-title");
  if (eventTitle) eventTitle.textContent = t("title");
  document.querySelectorAll("[data-i18n]").forEach(node => {
    node.textContent = t(node.dataset.i18n);
  });
  const back = document.querySelector("[data-event-back]");
  if (back) back.href = currentLang === "ru" ? "/ru/hourly/" : "/hourly/";
  document.querySelectorAll("[data-lang]").forEach(button => {
    const active = button.dataset.lang === currentLang;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.addEventListener("click", () => {
      setPageLocale(button.dataset.lang, { windowRef: window, documentRef: document });
      const next = new URL(window.location.href);
      next.searchParams.set("lang", button.dataset.lang);
      window.location.assign(next.toString());
    });
  });
}

async function init() {
  if (!slug) {
    document.getElementById("event-description").textContent = t("missingSlug");
    return;
  }
  const response = await fetch(`${defaultHourlyDataBaseUrl}/events/${encodeURIComponent(slug)}/index.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  document.title = `${data.title || slug} | ASG Racing`;
  document.getElementById("event-title").textContent = data.title || slug;
  document.getElementById("event-period").textContent = [data.period, data.status].filter(Boolean).join(" · ");
  document.getElementById("event-description").textContent = data.description || "";
  renderPrizes(data);
  renderPodium(data);
  renderStandings(data);
  renderRaces(data);
}

applyLanguage();
init().catch(error => {
  console.error(error);
  document.getElementById("event-description").textContent = t("loadError");
});

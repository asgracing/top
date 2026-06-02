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
  const prizes = prizeItems(data.prizes);
  grid.innerHTML = prizes.length
    ? prizes.map((src, index) => `
        <figure class="prize-card">
          <img src="${esc(src)}" alt="Prize ${index + 1}" />
          <figcaption>Place ${index + 1}</figcaption>
        </figure>
      `).join("")
    : `<div class="empty">No prize images yet.</div>`;
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
    : `<div class="empty">No results yet.</div>`;
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
    ? `<table><thead><tr><th>#</th><th>Driver</th>${raceHeaders}<th>Total</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<div class="empty">No standings yet.</div>`;
}

function renderRaces(data) {
  const list = document.getElementById("race-list");
  const races = data.races || [];
  list.innerHTML = races.length
    ? races.map(race => `
        <article class="race-card">
          <div>
            <strong>${esc(race.track_name || race.track || "Race")}</strong>
            <span>${esc(race.finished_at_local || race.finished_at || "")}</span>
          </div>
          <div>Winner: ${esc(race.winner || "-")}</div>
          <div>Best lap: ${esc(race.best_lap || "-")}</div>
        </article>
      `).join("")
    : `<div class="empty">No races yet.</div>`;
}

async function init() {
  if (!slug) {
    document.getElementById("event-description").textContent = "Missing championship slug.";
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

init().catch(error => {
  console.error(error);
  document.getElementById("event-description").textContent = "Failed to load event data.";
});

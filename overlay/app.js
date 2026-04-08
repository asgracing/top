const pageParams = new URLSearchParams(window.location.search);
const TOP_DATA_BASE_URL = pageParams.get("topDataBase") || "https://asgracing.github.io/top-data";
const TOP_DATA_V2_BASE_URL = `${TOP_DATA_BASE_URL}/v2`;
const snapshotUrl = `${TOP_DATA_BASE_URL}/snapshot.json`;
const overlayV2Url = `${TOP_DATA_V2_BASE_URL}/overlay.json`;
const leaderboardUrl = `${TOP_DATA_BASE_URL}/leaderboard.json`;
const bestlapsUrl = `${TOP_DATA_BASE_URL}/bestlaps.json`;

const SITE_URL = "https://asgracing.github.io/top/";
const TELEGRAM_URL = "https://t.me/+JUymrENgddcyMTdi";
const DISCORD_URL = "https://discord.gg/cEPFHXXtTC";

const REFRESH_INTERVAL_MS = 30000;
const OVERLAY_PAGE_SIZE = 10;
const OVERLAY_TOTAL_PAGES = 10;
const FIRST_PAGE_DURATION_MS = 10000;
const CAROUSEL_PAGE_DURATION_MS = 10000;

let overlayLeaderboardRows = [];
let overlayCurrentPage = 1;
let overlayTotalPages = 1;
let overlayRotationTimer = 0;
let overlayRotationStarted = false;

function formatUpdatedAt(value) {
  if (!value) return "Update time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Update time unavailable";
  return `Updated ${date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  })}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  return await response.json();
}

function normalizeSnapshotPayload(snapshot) {
  return {
    leaderboard: Array.isArray(snapshot?.leaderboard) ? snapshot.leaderboard : [],
    bestlaps: Array.isArray(snapshot?.bestlaps) ? snapshot.bestlaps : [],
    updatedAt:
      snapshot?.updated_at ||
      snapshot?.updatedAt ||
      snapshot?.generated_at ||
      snapshot?.leaderboard_updated_at ||
      snapshot?.bestlaps_updated_at ||
      ""
  };
}

async function loadOverlayData() {
  try {
    const overlay = await loadJson(`${overlayV2Url}?t=${Date.now()}`);
    return normalizeSnapshotPayload(overlay);
  } catch (_v2Error) {
    // Keep the old snapshot path as a safety net while v2 data rolls out.
  }

  try {
    const snapshot = await loadJson(snapshotUrl);
    return normalizeSnapshotPayload(snapshot);
  } catch (_error) {
    const [leaderboard, bestlaps] = await Promise.all([loadJson(leaderboardUrl), loadJson(bestlapsUrl)]);
    return {
      leaderboard: Array.isArray(leaderboard) ? leaderboard : [],
      bestlaps: Array.isArray(bestlaps) ? bestlaps : [],
      updatedAt: ""
    };
  }
}

function resolveRank(row, index) {
  if (Number.isFinite(Number(row?.rank))) return Number(row.rank);
  return index + 1;
}

function resolvePoints(row) {
  if (Number.isFinite(Number(row?.points))) return Number(row.points);
  return 0;
}

function resolveWins(row) {
  if (Number.isFinite(Number(row?.wins))) return Number(row.wins);
  return 0;
}

function resolveBestLap(row) {
  return row?.best_lap || row?.bestLap || "--:--.---";
}

function resolveDriverName(row) {
  return row?.driver || row?.name || row?.player_name || "Unknown";
}

function sortLeaderboardRows(items) {
  return (Array.isArray(items) ? items : [])
    .slice()
    .sort((a, b) => resolveRank(a, 0) - resolveRank(b, 0));
}

function renderTrendBadge(change) {
  if (!change || !change.trend || change.trend === "same") return "";

  const trendClass = change.trend === "up" ? "trend-up" : "trend-down";
  const arrow = change.trend === "up" ? "▲" : "▼";
  const delta = Math.abs(Number(change?.delta));
  const deltaLabel = Number.isFinite(delta) && delta > 0 ? String(Math.round(delta)) : "";
  const beforeText = change?.before != null ? `#${change.before}` : "";
  const afterText = change?.after != null ? `#${change.after}` : "";
  const title = [beforeText, afterText].filter(Boolean).join(" -> ");

  return `
    <span class="trend-badge trend-badge-compact ${trendClass}"${title ? ` title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"` : ""}>
      <span class="trend-arrow">${arrow}</span>
      ${deltaLabel ? `<span class="trend-value">${escapeHtml(deltaLabel)}</span>` : ""}
    </span>
  `;
}

function renderLeaderboardTable(items, page = 1) {
  const body = document.getElementById("overlay-leaderboard-body");
  const sectionTitle = document.querySelector(".section-title");
  if (!body) return;

  const safePage = Math.max(1, Math.min(page, OVERLAY_TOTAL_PAGES));
  const startIndex = (safePage - 1) * OVERLAY_PAGE_SIZE;
  const endIndex = startIndex + OVERLAY_PAGE_SIZE;
  const visibleItems = Array.isArray(items) ? items.slice(startIndex, endIndex) : [];
  const pageFrom = startIndex + 1;
  const pageTo = endIndex;

  if (sectionTitle) {
    sectionTitle.textContent = `Server Standings ${pageFrom}-${pageTo}`;
  }

  if (visibleItems.length === 0) {
    body.innerHTML = '<tr><td colspan="5" class="overlay-empty">No drivers on this page yet.</td></tr>';
    return;
  }

  const rows = visibleItems
    .map((row, index) => {
      const rank = resolveRank(row, startIndex + index);
      const rankClass =
        rank === 1
          ? " rank-pill-first"
          : rank === 2
            ? " rank-pill-second"
            : rank === 3
              ? " rank-pill-third"
              : "";

      return `
      <tr>
        <td>
          <span class="overlay-rank-wrap">
            <span class="rank-pill${rankClass}">${escapeHtml(rank)}</span>
            ${renderTrendBadge(row.rank_change)}
          </span>
        </td>
        <td class="driver-name">${escapeHtml(resolveDriverName(row))}</td>
        <td class="points-value">${escapeHtml(resolvePoints(row))}</td>
        <td class="wins-value">${escapeHtml(resolveWins(row))}</td>
        <td class="lap-value">${escapeHtml(resolveBestLap(row))}</td>
      </tr>
    `;
    })
    .join("");

  body.innerHTML = rows;
}

function clearOverlayRotationTimer() {
  if (!overlayRotationTimer) return;
  window.clearTimeout(overlayRotationTimer);
  overlayRotationTimer = 0;
}

function scheduleNextOverlayPage() {
  clearOverlayRotationTimer();

  if (overlayTotalPages <= 1) {
    overlayCurrentPage = 1;
    return;
  }

  const currentDuration = overlayCurrentPage === 1 ? FIRST_PAGE_DURATION_MS : CAROUSEL_PAGE_DURATION_MS;
  overlayRotationTimer = window.setTimeout(() => {
    overlayCurrentPage = overlayCurrentPage >= overlayTotalPages ? 1 : overlayCurrentPage + 1;
    renderLeaderboardTable(overlayLeaderboardRows, overlayCurrentPage);
    scheduleNextOverlayPage();
  }, currentDuration);
}

function restartOverlayRotation() {
  overlayTotalPages = OVERLAY_TOTAL_PAGES;
  overlayCurrentPage = 1;
  renderLeaderboardTable(overlayLeaderboardRows, overlayCurrentPage);
  scheduleNextOverlayPage();
  overlayRotationStarted = true;
}

function renderBestLapCard(items) {
  const bestLapTimeEl = document.getElementById("overlay-bestlap-time");
  const bestLapDriverEl = document.getElementById("overlay-bestlap-driver");
  const bestLapMetaEl = document.getElementById("overlay-bestlap-meta");
  if (!bestLapTimeEl || !bestLapDriverEl || !bestLapMetaEl) return;

  const topLap = Array.isArray(items) && items.length ? items[0] : null;
  if (!topLap) {
    bestLapTimeEl.textContent = "--:--.---";
    bestLapDriverEl.textContent = "No data yet";
    bestLapMetaEl.textContent = "Waiting for the first record";
    return;
  }

  bestLapTimeEl.textContent = topLap.best_lap || topLap.bestLap || "--:--.---";
  bestLapDriverEl.textContent = resolveDriverName(topLap);
  bestLapMetaEl.textContent = [topLap.track || "", topLap.car_name || topLap.car || ""]
    .filter(Boolean)
    .join(" / ") || "ASG Racing";
}

function buildQrUrl(targetUrl, colorHex) {
  const encodedUrl = encodeURIComponent(targetUrl);
  const encodedColor = encodeURIComponent(colorHex.replace("#", ""));
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&bgcolor=ffffff&color=${encodedColor}&data=${encodedUrl}`;
}

function renderQrCodes() {
  const siteQr = document.getElementById("overlay-qr-site");
  const telegramQr = document.getElementById("overlay-qr-telegram");
  const discordQr = document.getElementById("overlay-qr-discord");

  if (siteQr) siteQr.src = buildQrUrl(SITE_URL, "#111827");
  if (telegramQr) telegramQr.src = buildQrUrl(TELEGRAM_URL, "#27a7e7");
  if (discordQr) discordQr.src = buildQrUrl(DISCORD_URL, "#5865f2");
}

async function refreshOverlay() {
  const updatedEl = document.getElementById("overlay-updated");

  try {
    const data = await loadOverlayData();
    overlayLeaderboardRows = sortLeaderboardRows(data.leaderboard);
    overlayTotalPages = OVERLAY_TOTAL_PAGES;
    overlayCurrentPage = Math.max(1, Math.min(overlayCurrentPage, overlayTotalPages));
    renderLeaderboardTable(overlayLeaderboardRows, overlayCurrentPage);
    if (!overlayRotationStarted) restartOverlayRotation();
    renderBestLapCard(data.bestlaps);
    if (updatedEl) updatedEl.textContent = formatUpdatedAt(data.updatedAt);
  } catch (_error) {
    overlayLeaderboardRows = [];
    clearOverlayRotationTimer();
    overlayRotationStarted = false;
    renderLeaderboardTable([], 1);
    renderBestLapCard([]);
    if (updatedEl) updatedEl.textContent = "Load error";
  }
}

function initOverlay() {
  renderQrCodes();
  void refreshOverlay();
  window.setInterval(() => {
    void refreshOverlay();
  }, REFRESH_INTERVAL_MS);
}

document.addEventListener("DOMContentLoaded", initOverlay);

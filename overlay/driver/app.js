import { normalizeOverlayPayload, overlayTokenFromHash } from "./model.js?v=20261003palette1";

const AUTH_BASE_URL = "https://auth.asgracing.ru";
const POLL_MS = 60_000;
const token = overlayTokenFromHash(location.hash);
const root = document.getElementById("driver-overlay");
let hasRendered = false;

function render(payload) {
  const state = normalizeOverlayPayload(payload);
  root.dataset.eloCategory = String(state.eloCategoryId);
  for (let category = 1; category <= 6; category += 1) {
    root.querySelector(".driver-overlay__elo-pill").classList.toggle(`elo-cat-${category}`, category === state.eloCategoryId);
  }
  for (const category of ["A", "B", "C"]) {
    root.querySelector(".driver-overlay__sr-pill").classList.toggle(`sr-cat-${category}`, category === state.srCategory);
  }
  root.dataset.showAvatar = String(state.showAvatar);
  root.dataset.showNumber = String(state.showRaceNumber);
  root.querySelector("[data-elo-category]").textContent = state.eloCategoryName.toUpperCase();
  root.querySelector("[data-elo]").textContent = String(state.elo);
  root.querySelector("[data-sr]").textContent = `SR ${state.sr}`;
  root.querySelector("[data-race-number]").textContent = state.raceNumber ? `#${state.raceNumber}` : "—";
  const image = root.querySelector("[data-avatar]");
  const fallback = root.querySelector("[data-avatar-fallback]");
  if (state.avatarUrl) {
    image.src = state.avatarUrl;
    image.hidden = false;
    fallback.hidden = true;
  } else {
    image.removeAttribute("src");
    image.hidden = true;
    fallback.hidden = false;
  }
  root.hidden = false;
  root.dataset.ready = "true";
  hasRendered = true;
}

async function refresh() {
  if (!token) {
    root.hidden = true;
    return;
  }
  try {
    const response = await fetch(`${AUTH_BASE_URL}/v1/driver-overlay`, {
      credentials: "omit",
      cache: "no-store",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
    });
    if (response.status === 404) {
      root.hidden = true;
      hasRendered = false;
      return;
    }
    if (!response.ok) throw new Error(`http_${response.status}`);
    render(await response.json());
  } catch {
    if (!hasRendered) root.hidden = true;
  }
}

void refresh();
setInterval(() => void refresh(), POLL_MS);

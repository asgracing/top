const PAUSE_INTERVAL_MS = 120000;
const PASS_DURATION_MS = 22000;
const PASSES_PER_SHOW = 2;
const VISIBLE_DURATION_MS = PASS_DURATION_MS * PASSES_PER_SHOW;

let hideTimeoutId = 0;
let restartTimeoutId = 0;

function showTicker() {
  const overlay = document.getElementById("ticker-overlay");
  const track = document.getElementById("ticker-track");
  if (!overlay || !track) return;

  overlay.classList.remove("is-visible");
  track.style.animation = "none";
  void track.offsetWidth;
  track.style.animation = "";

  overlay.classList.add("is-visible");

  if (hideTimeoutId) window.clearTimeout(hideTimeoutId);
  if (restartTimeoutId) window.clearTimeout(restartTimeoutId);

  hideTimeoutId = window.setTimeout(() => {
    overlay.classList.remove("is-visible");
  }, VISIBLE_DURATION_MS);

  restartTimeoutId = window.setTimeout(() => {
    showTicker();
  }, VISIBLE_DURATION_MS + PAUSE_INTERVAL_MS);
}

function initTicker() {
  showTicker();
}

document.addEventListener("DOMContentLoaded", initTicker);

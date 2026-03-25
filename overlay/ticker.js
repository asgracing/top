const PAUSE_INTERVAL_MS = 120000;
const PASS_DURATION_MS = 22000;
const PASSES_PER_SHOW = 2;
const VISIBLE_DURATION_MS = PASS_DURATION_MS * PASSES_PER_SHOW;
const ANIMATION_NAME = "ticker-marquee";
const ANIMATION_VALUE = `${ANIMATION_NAME} ${PASS_DURATION_MS}ms linear ${PASSES_PER_SHOW}`;

let hideTimeoutId = 0;
let restartTimeoutId = 0;

function resetTickerTrack(track) {
  track.style.animation = "none";
  track.style.transform = "translate3d(0, 0, 0)";
  void track.offsetWidth;
}

function startTickerTrack(track) {
  resetTickerTrack(track);
  window.requestAnimationFrame(() => {
    track.style.animation = ANIMATION_VALUE;
  });
}

function showTicker() {
  const overlay = document.getElementById("ticker-overlay");
  const track = document.getElementById("ticker-track");
  if (!overlay || !track) return;

  if (hideTimeoutId) window.clearTimeout(hideTimeoutId);
  if (restartTimeoutId) window.clearTimeout(restartTimeoutId);

  overlay.classList.remove("is-visible");
  resetTickerTrack(track);

  window.requestAnimationFrame(() => {
    overlay.classList.add("is-visible");
    startTickerTrack(track);
  });

  hideTimeoutId = window.setTimeout(() => {
    overlay.classList.remove("is-visible");
    resetTickerTrack(track);
  }, VISIBLE_DURATION_MS);

  restartTimeoutId = window.setTimeout(() => {
    showTicker();
  }, VISIBLE_DURATION_MS + PAUSE_INTERVAL_MS);
}

function initTicker() {
  showTicker();
}

document.addEventListener("DOMContentLoaded", initTicker);

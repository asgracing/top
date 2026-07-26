const TRACK_BACKGROUND_FILES = Object.freeze({
  barcelona: "barcelona.jpg",
  hungaroring: "hungaroring.jpg",
  imola: "imola.jpg",
  kyalami: "kyalami.jpg",
  laguna_seca: "laguna_seca.jpg",
  lagunaseca: "laguna_seca.jpg",
  misano: "misano.jpg",
  monza: "monza.jpg",
  monzatg: "monzaTG.jpg",
  mount_panorama: "mount_panorama.jpg",
  mountpanorama: "mount_panorama.jpg",
  nurburgring: "nurburgring.jpg",
  nurburgring_24h: "nurburgring_24h.jpg",
  nurburgring24h: "nurburgring_24h.jpg",
  nordschl: "nurburgring_24h.jpg",
  nordschleife: "nurburgring_24h.jpg",
  paul_ricard: "paul_ricard.jpg",
  paulricard: "paul_ricard.jpg",
  silverstone: "silverstone.jpg",
  spa: "spa.jpg",
  suzuka: "suzuka.jpg",
  zandvoort: "zandvoort.jpg",
  zolder: "zolder.jpg"
});

export const TRACK_BACKGROUND_CAROUSEL_FILES = Object.freeze([
  "barcelona.jpg",
  "hungaroring.jpg",
  "imola.jpg",
  "kyalami.jpg",
  "laguna_seca.jpg",
  "misano.jpg",
  "monza.jpg",
  "mount_panorama.jpg",
  "nurburgring.jpg",
  "nurburgring_24h.jpg",
  "paul_ricard.jpg",
  "silverstone.jpg",
  "spa.jpg",
  "suzuka.jpg",
  "zandvoort.jpg",
  "zolder.jpg"
]);

const LAST_TRACK_BACKGROUND_STORAGE_KEY = "asgLastTrackBackground";

export function normalizeTrackBackgroundCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function resolveTrackBackgroundFile(value) {
  const normalized = normalizeTrackBackgroundCode(value);
  if (!normalized) return null;
  return TRACK_BACKGROUND_FILES[normalized]
    || TRACK_BACKGROUND_FILES[normalized.replaceAll("_", "")]
    || null;
}

export function selectRandomTrackBackgroundFile(random = Math.random, previousFile = "") {
  const candidates = TRACK_BACKGROUND_CAROUSEL_FILES.length > 1 && TRACK_BACKGROUND_CAROUSEL_FILES.includes(previousFile)
    ? TRACK_BACKGROUND_CAROUSEL_FILES.filter(fileName => fileName !== previousFile)
    : TRACK_BACKGROUND_CAROUSEL_FILES;
  const randomValue = Number(random());
  const normalizedValue = Number.isFinite(randomValue)
    ? Math.min(Math.max(randomValue, 0), 1 - Number.EPSILON)
    : 0;
  const index = Math.floor(normalizedValue * candidates.length);
  return candidates[index];
}

export function applyRandomTrackBackground(documentRef, storage = globalThis.sessionStorage, random = Math.random) {
  const body = documentRef?.body;
  if (!body) return null;

  let previousFile = "";
  try {
    previousFile = storage?.getItem(LAST_TRACK_BACKGROUND_STORAGE_KEY) || "";
  } catch (error) {
    // A random background should still work when session storage is unavailable.
  }

  const selectedFile = selectRandomTrackBackgroundFile(random, previousFile);
  const selectedUrl = new URL(`../../../assets/${selectedFile}`, import.meta.url).href;
  body.style.setProperty("--page-track-background", `url("${selectedUrl}")`);
  body.dataset.pageTrackBackground = selectedFile;

  try {
    storage?.setItem(LAST_TRACK_BACKGROUND_STORAGE_KEY, selectedFile);
  } catch (error) {
    // Keep the selected runtime background even if persistence is unavailable.
  }

  return selectedFile;
}

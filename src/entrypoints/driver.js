import { bootstrapLegacyPage } from "./legacy-bootstrap.js?v=20260813bfcache1";
import { applyRandomTrackBackground } from "../features/server-status/track-background.js?v=20260726staticfallback1";
import { createDriverAchievementsController } from "../pages/driver/achievements-widget.js?v=20260826titles1";
import { normalizePublicDriverTitle } from "../pages/driver/achievements-model.js?v=20260826titles1";
import { createCollapsibleWidget } from "../shared/collapsible-widget.js?v=20260820widgetcollapse1";

applyRandomTrackBackground(document);

await bootstrapLegacyPage("driver");

async function applyDriverTitle() {
  const publicId = new URLSearchParams(window.location.search).get("id") || "";
  if (!/^drv_[a-z0-9]+$/i.test(publicId)) return;
  try {
    const response = await fetch(`https://auth.asgracing.ru/v1/drivers/${encodeURIComponent(publicId)}/title`, {
      credentials: "omit",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return;
    const payload = normalizePublicDriverTitle(await response.json());
    if (!payload) return;
    const { title, description, icon } = payload;
    const eyebrow = document.querySelector(".driver-page-hero .eyebrow[data-i18n='driverEyebrow']");
    if (!eyebrow) return;
    eyebrow.removeAttribute("data-i18n");
    eyebrow.classList.add("driver-profile-title-eyebrow");
    eyebrow.replaceChildren();
    const iconElement = document.createElement("span");
    iconElement.className = "driver-profile-title-icon";
    iconElement.textContent = icon;
    const textElement = document.createElement("span");
    textElement.textContent = title;
    eyebrow.append(iconElement, textElement);
    if (description) eyebrow.title = description;
  } catch {
    // The ordinary localized eyebrow remains when the optional title API is unavailable.
  }
}

void applyDriverTitle();

const achievementsRoot = document.getElementById("driver-achievements-widget");
const achievementsCollapseController = achievementsRoot ? createCollapsibleWidget({
  root: achievementsRoot,
  toggle: achievementsRoot.querySelector(".widget-collapse-toggle"),
  content: document.getElementById("driver-achievements-content"),
  storage: {
    get(key, fallback) {
      try {
        const value = window.localStorage.getItem(key);
        return value === null ? fallback : value === "true";
      } catch { return fallback; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, String(Boolean(value))); } catch {}
    }
  },
  storageKey: "asgDriverAchievementsCollapsed",
  initialCollapsed: window.matchMedia?.("(max-width: 1279px)")?.matches ?? false,
  forceInitialCollapsed: window.matchMedia?.("(max-width: 760px)")?.matches ?? false,
  getLabels: () => ({ name: "Achievements", collapse: "Collapse", expand: "Expand" })
}) : null;

const achievementsController = createDriverAchievementsController();
if (achievementsController) {
  window.addEventListener("pagehide", event => {
    if (!event.persisted) {
      achievementsController.destroy();
      achievementsCollapseController?.destroy();
    }
  }, { once: true });
}

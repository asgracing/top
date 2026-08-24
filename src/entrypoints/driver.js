import { bootstrapLegacyPage } from "./legacy-bootstrap.js?v=20260813bfcache1";
import { applyRandomTrackBackground } from "../features/server-status/track-background.js?v=20260726staticfallback1";
import { createDriverAchievementsController } from "../pages/driver/achievements-widget.js?v=20260824achievements4";
import { createCollapsibleWidget } from "../shared/collapsible-widget.js?v=20260820widgetcollapse1";

applyRandomTrackBackground(document);

await bootstrapLegacyPage("driver");

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

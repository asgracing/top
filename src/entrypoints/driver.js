import { bootstrapLegacyPage } from "./legacy-bootstrap.js?v=20260813bfcache1";
import { applyRandomTrackBackground } from "../features/server-status/track-background.js?v=20260726staticfallback1";
import { createDriverAchievementsController } from "../pages/driver/achievements-widget.js?v=20260824achievements1";

applyRandomTrackBackground(document);

await bootstrapLegacyPage("driver");

const achievementsController = createDriverAchievementsController();
if (achievementsController) {
  window.addEventListener("pagehide", event => {
    if (!event.persisted) achievementsController.destroy();
  }, { once: true });
}

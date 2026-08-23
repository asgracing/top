import { bootstrapLegacyPage } from "./legacy-bootstrap.js?v=20260823winnercar1";
import { applyRandomTrackBackground } from "../features/server-status/track-background.js?v=20260726staticfallback1";

applyRandomTrackBackground(document);

await bootstrapLegacyPage("races");

import { bootstrapLegacyPage } from "./legacy-bootstrap.js?v=20260715raceserver1";
import { selectRandomTrackBackgroundFile } from "../features/server-status/track-background.js?v=20260726trackcarousel1";

const backgroundFile = selectRandomTrackBackgroundFile();
const backgroundUrl = new URL(`../../assets/${backgroundFile}`, import.meta.url).href;
document.body.style.setProperty("--page-track-background", `url("${backgroundUrl}")`);
document.body.dataset.pageTrackBackground = backgroundFile;

await bootstrapLegacyPage("races");

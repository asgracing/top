export const PRESENTATION_VERSION = "20261004p2";

// The preview owns presentation while the frozen runtime retains API behavior.
// Keeping legacy rules in a named layer prevents old ID selectors from winning.
export function styleSnapshot(source) {
  return source.replace(/\s*!important\b/g, "");
}

export function pageSnapshot(source) {
  return source.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, tag => {
    const href = tag.match(/href="([^"]+)"/)?.[1];
    return href?.startsWith("/preview/runtime/")
      ? `<style data-preview-legacy>@import url("${href.replace(/\?.*$/, "")}?v=${PRESENTATION_VERSION}") layer(asgLegacy);</style>` : tag;
  }).replace(/(?<=\/preview\/(?:design\.css|app\.js)\?v=)[^"<>]+/g, PRESENTATION_VERSION)
    .replace(/(\/preview\/runtime\/[^"<>]+\.js)\?[^"<>]+/g, `$1?v=${PRESENTATION_VERSION}`);
}

function replaceRequired(source, needle, replacement) {
  if (!source.includes(needle)) throw Error(`Preview presentation hook missing: ${needle.slice(0,70)}`);
  return source.replace(needle, replacement);
}

export function runtimeSnapshot(path, original) {
  let source = original;
  if (path === "app.js" && !original.includes("// asg-preview:hooks-v2")) {
    source = 'import { emitPreviewView } from "../components/runtime-events.js?v=20261004p2";\n// asg-preview:hooks-v2\n' + source;
    source = replaceRequired(source, "function renderServerStickyWidget(serverStatus = serverStatusData) {", `function renderServerStickyWidget(serverStatus = serverStatusData) {
  emitPreviewView("servers", { stale: serverStatusIsStale(serverStatus), updatedAt: serverStatus?.updated_at,
    items: getServerStatusItems(serverStatus).map(({key,label,server}) => ({key,label,online:serverIsOnline(server),players:serverPlayersOnline(server),track:humanizeTrackName(server?.track_code || server?.track || ""),sa:getServerSaRequirement(server),sr:getServerSrRequirement(key,server),session:getServerSessionShortLabel(server)})) });`);
    source = replaceRequired(source, "function renderHourlyHeroCard() {", `function renderHourlyHeroCard() {
  emitPreviewView("schedule", {schedule:hourlyScheduleData,announcement:hourlyAnnouncementData});`);
    source = replaceRequired(source, "function renderDriverPage() {", `function renderDriverPage() {
  emitPreviewView("profile", {profile:driverProfileData,rank:getDriverRankInfo(driverProfileData),elo:getEloInfo(driverProfileData) || getEloInfo(findEloSource(driverProfileData?.public_id,driverProfileData?.player_id)),safety:getSafetyInfo(driverProfileData) || getSafetyInfo(findSafetySource(driverProfileData?.public_id,driverProfileData?.player_id))});`);
  }
  if (path === "hourly/app.js" && !original.includes("// asg-preview:hooks-v2")) {
    source = 'import { emitPreviewView } from "../../components/runtime-events.js?v=20261004p2";\n// asg-preview:hooks-v2\n' + source;
    source = replaceRequired(source, '  bindHeroCopyButtons(root);\n  bindVoteControls(root);\n}', `  bindHeroCopyButtons(root);
  bindVoteControls(root);
  emitPreviewView("event", {data,model:getScheduleModalViewModel(data)});
}`);
  }
  if (path === "hourly/app.js" && !original.includes("// asg-preview:event-links-v1")) {
    source = 'let previewLinkedEventOpened = false;\n// asg-preview:event-links-v1\n' + source;
    source = replaceRequired(source, '  bindVoteControls(container);\n}\nfunction buildCalendarItems', `  bindVoteControls(container);
  const previewEvent = new URLSearchParams(location.search).get("event");
  if (previewEvent && !previewLinkedEventOpened) {
    const match = rows.find(item => String(item.event_id || "") === previewEvent || buildSlotEventId(item) === previewEvent);
    if (match) { previewLinkedEventOpened = true; openScheduleModal(match); }
  }
}
function buildCalendarItems`);
  }
  return source;
}

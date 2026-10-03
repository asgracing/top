const AVATAR_HOSTS = new Set(["steamcdn-a.akamaihd.net"]);

export function overlayTokenFromHash(hash) {
  const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  const token = params.get("token") || "";
  return /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) && token.length <= 512
    ? token
    : null;
}

export function safeSteamAvatarUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    if (!AVATAR_HOSTS.has(host) && !host.endsWith(".steamstatic.com")) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function normalizeOverlayPayload(payload) {
  const elo = Number(payload?.elo);
  const sr = Number(payload?.sr);
  const categoryId = Number(payload?.elo_category_id);
  const number = Number(payload?.race_number);
  if (!Number.isFinite(elo) || !Number.isFinite(sr)) throw new TypeError("invalid_overlay_payload");
  const srCategory = String(payload?.sr_category || "").trim().toUpperCase();
  return {
    elo: Math.round(elo),
    eloCategoryId: Number.isInteger(categoryId) && categoryId >= 1 && categoryId <= 6 ? categoryId : 6,
    eloCategoryName: String(payload?.elo_category_name || "Racer").trim().slice(0, 24) || "Racer",
    sr: Math.max(0, sr).toFixed(2),
    srCategory: ["A", "B", "C"].includes(srCategory) ? srCategory : sr >= 5 ? "A" : sr >= 2.5 ? "B" : "C",
    raceNumber: Number.isInteger(number) && number >= 1 && number <= 999 ? number : null,
    avatarUrl: safeSteamAvatarUrl(payload?.avatar_url),
    showAvatar: payload?.display?.show_avatar !== false,
    showRaceNumber: payload?.display?.show_race_number !== false
  };
}

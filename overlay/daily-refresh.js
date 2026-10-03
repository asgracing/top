const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function moscowDay(timestamp) {
  return Math.floor((timestamp + MOSCOW_OFFSET_MS) / DAY_MS);
}

export function nextMoscowMidnight(timestamp) {
  return (moscowDay(timestamp) + 1) * DAY_MS - MOSCOW_OFFSET_MS;
}

export function refreshUrl(href, timestamp) {
  const url = new URL(href);
  url.searchParams.set("overlayRefresh", String(timestamp));
  return url.href;
}

export function startDailyRefresh(windowRef = window) {
  const startedDay = moscowDay(windowRef.Date.now());
  let refreshing = false;
  let timer;
  const schedule = (delay) => {
    windowRef.clearTimeout(timer);
    timer = windowRef.setTimeout(check, delay);
  };
  async function check() {
    const now = windowRef.Date.now();
    if (refreshing) return;
    if (moscowDay(now) <= startedDay) {
      schedule(nextMoscowMidnight(now) - now);
      return;
    }
    refreshing = true;
    try {
      // Revalidate the actual CSS, scripts and imported modules before navigation.
      // Keep third-party resources and all API requests out of the refresh.
      const resources = new Set(windowRef.performance.getEntriesByType("resource")
        .filter((entry) => ["script", "link", "css"].includes(entry.initiatorType))
        .map((entry) => entry.name)
        .filter((href) => new URL(href).origin === windowRef.location.origin));
      await Promise.all([...resources].map(async (href) => {
        const response = await windowRef.fetch(href, { cache: "reload", credentials: "omit" });
        if (!response.ok) throw new Error("overlay_refresh_failed");
        await response.arrayBuffer();
      }));
      windowRef.location.replace(refreshUrl(windowRef.location.href, now));
    } catch {
      // Leave the current overlay visible when offline; try again in a minute.
      refreshing = false;
      schedule(60_000);
    }
  }
  windowRef.document.addEventListener("visibilitychange", () => { void check(); });
  windowRef.addEventListener("pageshow", () => { void check(); });
  schedule(nextMoscowMidnight(windowRef.Date.now()) - windowRef.Date.now());
}

if (typeof window !== "undefined") startDailyRefresh();

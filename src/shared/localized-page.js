// Presentation only: this module does not read or alter API configuration.
export const LOCALE_STORAGE_KEY = "asgLocale";
export const LEGACY_LANGUAGE_STORAGE_KEY = "asgLang";
export const LEGACY_NAMESPACED_LANGUAGE_STORAGE_KEY = "asg.top.v1:language";
export const LOCALE_SUGGESTION_DISMISSED_KEY = "asgLocaleSuggestionDismissed";
export const LOCALE_CHANGE_EVENT = "asg:locale-change";

export const LOCALIZED_PAGE_ROUTES = Object.freeze([
  { id: "home", en: "/", ru: "/ru/" },
  { id: "about", en: "/about/", ru: "/ru/about/" },
  { id: "join", en: "/join/", ru: "/ru/join/" },
  { id: "hourly", en: "/hourly/", ru: "/ru/hourly/" },
  { id: "championship", en: "/hourly/championship/", ru: "/ru/hourly/championship/" },
  { id: "championship-history", en: "/hourly/championship/history/", ru: "/ru/hourly/championship/history/" },
  { id: "teams", en: "/teams/", ru: "/ru/teams/" },
  { id: "community", en: "/community/", ru: "/ru/community/" },
  { id: "driver", en: "/driver/", ru: "/ru/driver/", compatibility: true },
  { id: "cars", en: "/cars/", ru: "/ru/cars/", compatibility: true },
  { id: "races", en: "/races/", ru: "/ru/races/", compatibility: true },
  { id: "fun-stats", en: "/fun-stats/", ru: "/ru/fun-stats/", compatibility: true },
  { id: "news", en: "/news/", ru: "/ru/news/", compatibility: true },
  { id: "bans", en: "/bans/", ru: "/ru/bans/", compatibility: true }
]);

function normalizedPathname(value) {
  const pathname = String(value || "/").replace(/\/{2,}/g, "/");
  if (pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export function localizedPageRoute(pathname) {
  const normalized = normalizedPathname(pathname);
  return LOCALIZED_PAGE_ROUTES.find(route => route.en === normalized || route.ru === normalized) || null;
}

export function localizedPageHref(href, language, locationRef = window.location) {
  const normalized = validLanguage(language);
  if (!normalized) return new URL(href, locationRef.href).href;
  const target = new URL(href, locationRef.href);
  const route = localizedPageRoute(target.pathname);
  if (route) {
    target.pathname = route[normalized];
    target.searchParams.delete("lang");
  } else if (normalized === "ru") {
    target.searchParams.set("lang", "ru");
  } else {
    target.searchParams.delete("lang");
  }
  return target.href;
}

export function currentPageLanguageHref(language, locationRef = window.location) {
  return localizedPageHref(locationRef.href, language, locationRef);
}

export function legacyMalformedLanguageHref(locationRef = window.location) {
  const target = new URL(locationRef.href);
  const rawLanguage = target.searchParams.get("lang") || "";
  const match = rawLanguage.match(/^(ru|en)\?(.+)$/);
  if (!match) return null;
  target.searchParams.delete("lang");
  const recovered = new URLSearchParams(match[2]);
  recovered.forEach((value, key) => target.searchParams.set(key, value));
  return localizedPageHref(target.href, match[1], locationRef);
}

export function applyLocalizedNavigation(language, documentRef = document, windowRef = window) {
  const normalized = validLanguage(language);
  if (!normalized) return;
  documentRef.querySelectorAll?.("a[href]:not(.lang-btn)").forEach(link => {
    const rawHref = link.getAttribute?.("href");
    if (!rawHref || /^(?:mailto:|tel:|javascript:|data:|blob:)/i.test(rawHref)) return;
    const target = new URL(rawHref, windowRef.location.href);
    if (target.origin !== windowRef.location.origin || !localizedPageRoute(target.pathname)) return;
    link.href = localizedPageHref(target.href, normalized, windowRef.location);
  });
}

const RUSSIAN_TIME_ZONES = new Set([
  "Europe/Kaliningrad", "Europe/Moscow", "Europe/Simferopol", "Europe/Kirov",
  "Europe/Volgograd", "Europe/Astrakhan", "Europe/Saratov", "Europe/Ulyanovsk",
  "Europe/Samara", "Asia/Yekaterinburg", "Asia/Omsk", "Asia/Novosibirsk",
  "Asia/Barnaul", "Asia/Tomsk", "Asia/Novokuznetsk", "Asia/Krasnoyarsk",
  "Asia/Irkutsk", "Asia/Chita", "Asia/Yakutsk", "Asia/Khandyga", "Asia/Vladivostok",
  "Asia/Ust-Nera", "Asia/Magadan", "Asia/Sakhalin", "Asia/Srednekolymsk",
  "Asia/Kamchatka", "Asia/Anadyr"
]);

export function validLanguage(value) {
  return value === "ru" || value === "en" ? value : null;
}

export function pageLanguage(documentRef = document) {
  return validLanguage(documentRef.documentElement?.dataset?.pageLanguage);
}

export function languageHref(href, locationRef) {
  const target = new URL(href, locationRef.href);
  target.search = locationRef.search;
  target.searchParams.delete("lang");
  target.hash = locationRef.hash;
  return target.href;
}

export function detectVisitorLocale(windowRef = window) {
  const languages = windowRef.navigator?.languages?.length
    ? windowRef.navigator.languages
    : [windowRef.navigator?.language].filter(Boolean);
  const tags = languages.map(value => String(value).replace("_", "-"));
  const region = tags.map(tag => tag.split("-")[1]?.toUpperCase()).find(Boolean) || null;
  let timeZone = null;
  try { timeZone = windowRef.Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || null; } catch {}
  const russianSignal = tags.some(tag => tag.toLowerCase().startsWith("ru")) || RUSSIAN_TIME_ZONES.has(timeZone);
  return {
    language: russianSignal ? "ru" : "en",
    region: region || (RUSSIAN_TIME_ZONES.has(timeZone) ? "RU" : "GLOBAL"),
    source: tags.some(tag => tag.toLowerCase().startsWith("ru")) ? "browser-language" : RUSSIAN_TIME_ZONES.has(timeZone) ? "time-zone" : "default",
    timeZone
  };
}

export function readLocalePreference(windowRef = window) {
  try {
    const parsed = JSON.parse(windowRef.localStorage.getItem(LOCALE_STORAGE_KEY) || "null");
    const language = validLanguage(parsed?.language);
    if (language) return { language, region: String(parsed.region || (language === "ru" ? "RU" : "GLOBAL")), source: "saved" };
    const namespaced = JSON.parse(windowRef.localStorage.getItem(LEGACY_NAMESPACED_LANGUAGE_STORAGE_KEY) || "null");
    const namespacedLanguage = validLanguage(namespaced?.value);
    if (namespacedLanguage) return { language: namespacedLanguage, region: detectVisitorLocale(windowRef).region, source: "legacy-namespaced" };
    const legacy = validLanguage(windowRef.localStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY));
    if (legacy) return { language: legacy, region: detectVisitorLocale(windowRef).region, source: "legacy" };
  } catch {}
  return null;
}

export function saveLocalePreference(language, region, windowRef = window) {
  const normalized = validLanguage(language);
  if (!normalized) return false;
  const value = { version: 1, language: normalized, region: String(region || detectVisitorLocale(windowRef).region), source: "user", updatedAt: new Date().toISOString() };
  try {
    windowRef.localStorage.setItem(LOCALE_STORAGE_KEY, JSON.stringify(value));
    // Existing site modules still consume both legacy formats. Keep them in
    // sync until every page has migrated to this module.
    windowRef.localStorage.setItem(LEGACY_LANGUAGE_STORAGE_KEY, normalized);
    windowRef.localStorage.setItem(LEGACY_NAMESPACED_LANGUAGE_STORAGE_KEY, JSON.stringify({ version: 1, value: normalized, expiresAt: 0 }));
    windowRef.localStorage.removeItem(LOCALE_SUGGESTION_DISMISSED_KEY);
    return true;
  } catch { return false; }
}

export function resolvePageLocale({ documentRef = document, windowRef = window } = {}) {
  const detected = detectVisitorLocale(windowRef);
  const saved = readLocalePreference(windowRef);
  const region = saved?.region || detected.region;
  const routeLanguage = pageLanguage(documentRef);
  if (routeLanguage) return { language: routeLanguage, region, source: "route" };
  const requested = validLanguage(new URLSearchParams(windowRef.location?.search || "").get("lang"));
  if (requested) return { language: requested, region, source: "query" };
  return saved || detected;
}

export function setPageLocale(language, { documentRef = document, windowRef = window, region } = {}) {
  const normalized = validLanguage(language);
  if (!normalized) return false;
  const detected = detectVisitorLocale(windowRef);
  const resolvedRegion = region || detected.region;
  saveLocalePreference(normalized, resolvedRegion, windowRef);
  if (documentRef.documentElement) documentRef.documentElement.lang = normalized;
  applyLocalizedNavigation(normalized, documentRef, windowRef);
  documentRef.querySelectorAll?.(".lang-btn[data-lang]").forEach(control => {
    const active = control.dataset.lang === normalized;
    control.classList.toggle("active", active);
    if (active) control.setAttribute?.("aria-current", "page");
    else control.removeAttribute?.("aria-current");
  });
  try {
    windowRef.dispatchEvent?.(new windowRef.CustomEvent(LOCALE_CHANGE_EVENT, { detail: { language: normalized, region: resolvedRegion } }));
  } catch {}
  return true;
}

export function subscribeLocaleChange(listener, windowRef = window) {
  if (typeof listener !== "function" || !windowRef.addEventListener) return () => {};
  const handler = event => listener(event?.detail || {});
  windowRef.addEventListener(LOCALE_CHANGE_EVENT, handler);
  return () => windowRef.removeEventListener?.(LOCALE_CHANGE_EVENT, handler);
}

function showLocaleSuggestion(documentRef, windowRef, detected, alternate) {
  try {
    if (!documentRef.body || windowRef.localStorage.getItem(LOCALE_SUGGESTION_DISMISSED_KEY) === "1") return;
  } catch { if (!documentRef.body) return; }
  const suggestion = documentRef.createElement("aside");
  suggestion.className = "locale-suggestion";
  suggestion.setAttribute("role", "region");
  suggestion.setAttribute("aria-label", detected.language === "ru" ? "Выбор языка" : "Language choice");
  const message = documentRef.createElement("span");
  message.textContent = detected.language === "ru" ? "Похоже, вам удобнее русский язык." : "English may be more convenient for you.";
  const switchLink = documentRef.createElement("a");
  switchLink.className = "locale-suggestion-action";
  switchLink.href = languageHref(alternate.href, windowRef.location);
  switchLink.textContent = detected.language === "ru" ? "Перейти" : "Switch";
  switchLink.addEventListener("click", () => saveLocalePreference(detected.language, detected.region, windowRef));
  const dismiss = documentRef.createElement("button");
  dismiss.type = "button";
  dismiss.className = "locale-suggestion-dismiss";
  dismiss.setAttribute("aria-label", detected.language === "ru" ? "Закрыть" : "Dismiss");
  dismiss.textContent = "×";
  dismiss.addEventListener("click", () => {
    suggestion.remove();
    try { windowRef.localStorage.setItem(LOCALE_SUGGESTION_DISMISSED_KEY, "1"); } catch {}
  });
  suggestion.append(message, switchLink, dismiss);
  documentRef.body.append(suggestion);
}

export function initializeLocalizedPage(documentRef = document, windowRef = window) {
  const routeLanguage = pageLanguage(documentRef);
  if (!windowRef?.location) return;
  const repairedHref = legacyMalformedLanguageHref(windowRef.location);
  if (repairedHref) {
    windowRef.location.replace(repairedHref);
    return;
  }
  const language = routeLanguage || resolvePageLocale({ documentRef, windowRef }).language;
  applyLocalizedNavigation(language, documentRef, windowRef);
  if (!routeLanguage) return;
  const links = [...documentRef.querySelectorAll("a.lang-btn[data-lang]")];
  const detected = detectVisitorLocale(windowRef);
  for (const link of links) {
    link.href = languageHref(link.href, windowRef.location);
    link.classList.toggle("active", link.dataset.lang === language);
    if (link.dataset.lang === language) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
    link.addEventListener("click", () => saveLocalePreference(link.dataset.lang, detected.region, windowRef));
  }
  const requested = validLanguage(new URLSearchParams(windowRef.location.search).get("lang"));
  const requestedLink = links.find(link => link.dataset.lang === requested);
  if (requestedLink && requested !== language) {
    saveLocalePreference(requested, detected.region, windowRef);
    windowRef.location.replace(requestedLink.href);
    return;
  }
  const saved = readLocalePreference(windowRef);
  const suggestedLink = links.find(link => link.dataset.lang === detected.language);
  if (!saved && suggestedLink && detected.language !== language) {
    const ready = () => showLocaleSuggestion(documentRef, windowRef, detected, suggestedLink);
    if (documentRef.body) ready();
    else documentRef.addEventListener("DOMContentLoaded", ready, { once: true });
  }
}

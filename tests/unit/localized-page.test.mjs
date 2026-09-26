import test from "node:test";
import assert from "node:assert/strict";
import {
  applyLocalizedNavigation,
  currentPageLanguageHref,
  detectVisitorLocale,
  initializeLocalizedPage,
  languageHref,
  legacyMalformedLanguageHref,
  localizedPageHref,
  localizedPageRoute,
  pageLanguage,
  readLocalePreference,
  resolvePageLocale,
  setPageLocale,
  saveLocalePreference
} from "../../src/shared/localized-page.js";

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

function link(lang, href) {
  const listeners = {};
  return {
    href, dataset: { lang }, classList: { toggle() {} },
    setAttribute() {}, removeAttribute() {},
    addEventListener: (name, handler) => { listeners[name] = handler; },
    listeners
  };
}

test("language links retain entity/filter parameters and anchor, dropping only lang", () => {
  assert.equal(languageHref("/ru/teams/", { href: "https://asgracing.ru/teams/?tab=teams&lang=en#ranking", search: "?tab=teams&lang=en", hash: "#ranking" }), "https://asgracing.ru/ru/teams/?tab=teams#ranking");
});

test("localized page registry maps public EN and RU routes", () => {
  assert.equal(localizedPageRoute("/races/")?.id, "races");
  assert.equal(localizedPageRoute("/ru/hourly/championship/")?.id, "championship");
  assert.equal(localizedPageRoute("/account/"), null);
});

test("localized page URLs preserve entity state without retaining lang", () => {
  const locationRef = { href: "https://asgracing.ru/driver/?id=drv_example&lang=en#summary" };
  assert.equal(
    currentPageLanguageHref("ru", locationRef),
    "https://asgracing.ru/ru/driver/?id=drv_example#summary"
  );
  assert.equal(
    localizedPageHref("/news/?slug=safety-rating-server-access&lang=ru", "en", locationRef),
    "https://asgracing.ru/news/?slug=safety-rating-server-access"
  );
});

test("championship locale switches preserve the selected season slug", () => {
  const locationRef = {
    href: "https://asgracing.ru/hourly/championship/?slug=october-2026"
  };
  assert.equal(
    localizedPageHref(locationRef.href, "ru", locationRef),
    "https://asgracing.ru/ru/hourly/championship/?slug=october-2026"
  );
  assert.equal(
    localizedPageHref("/ru/hourly/championship/?slug=october-2026", "en", locationRef),
    "https://asgracing.ru/hourly/championship/?slug=october-2026"
  );
});

test("legacy malformed language URLs recover the page parameter", () => {
  assert.equal(
    legacyMalformedLanguageHref({ href: "https://asgracing.ru/news/?lang=ru?slug=safety-rating-server-access" }),
    "https://asgracing.ru/ru/news/?slug=safety-rating-server-access"
  );
  assert.equal(
    legacyMalformedLanguageHref({ href: "https://asgracing.ru/news/?slug=safety-rating-server-access" }),
    null
  );
});

test("unregistered utility pages retain query based language compatibility", () => {
  const locationRef = { href: "https://asgracing.ru/account/settings/?section=privacy" };
  assert.equal(
    currentPageLanguageHref("ru", locationRef),
    "https://asgracing.ru/account/settings/?section=privacy&lang=ru"
  );
});

test("localized navigation rewrites the brand and known internal links only", () => {
  const links = [
    { value: "/", getAttribute: () => "/", set href(value) { this.value = value; } },
    { value: "/driver/?id=drv_example", getAttribute: () => "/driver/?id=drv_example", set href(value) { this.value = value; } },
    { value: "https://discord.gg/example", getAttribute: () => "https://discord.gg/example", set href(value) { this.value = value; } }
  ];
  applyLocalizedNavigation("ru", { querySelectorAll: () => links }, { location: { href: "https://asgracing.ru/races/", origin: "https://asgracing.ru" } });
  assert.equal(links[0].value, "https://asgracing.ru/ru/");
  assert.equal(links[1].value, "https://asgracing.ru/ru/driver/?id=drv_example");
  assert.equal(links[2].value, "https://discord.gg/example");
});

test("page language is opt-in", () => {
  assert.equal(pageLanguage({ documentElement: { dataset: { pageLanguage: "ru" } } }), "ru");
  assert.equal(pageLanguage({ documentElement: { dataset: {} } }), null);
  initializeLocalizedPage({ documentElement: { dataset: {} } }, {});
});

test("visitor locale detects Russian browser language and time zone", () => {
  assert.deepEqual(detectVisitorLocale({ navigator: { languages: ["ru-RU", "en"] }, Intl }), { language: "ru", region: "RU", source: "browser-language", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const fakeIntl = { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: "Europe/Moscow" }) }) };
  assert.deepEqual(detectVisitorLocale({ navigator: { languages: ["en"] }, Intl: fakeIntl }), { language: "ru", region: "RU", source: "time-zone", timeZone: "Europe/Moscow" });
});

test("locale preference stores region and remains compatible with asgLang", () => {
  const localStorage = storage();
  const windowRef = { localStorage };
  assert.equal(saveLocalePreference("ru", "RU", windowRef), true);
  assert.equal(localStorage.getItem("asgLang"), "ru");
  assert.equal(JSON.parse(localStorage.getItem("asg.top.v1:language")).value, "ru");
  assert.deepEqual(readLocalePreference(windowRef), { language: "ru", region: "RU", source: "saved" });
});

test("an explicit static route is not overridden by a saved locale", () => {
  let redirected;
  const links = [link("en", "https://asgracing.ru/hourly/"), link("ru", "https://asgracing.ru/ru/hourly/")];
  const localStorage = storage({ asgLocale: JSON.stringify({ version: 1, language: "ru", region: "RU" }) });
  initializeLocalizedPage(
    { documentElement: { dataset: { pageLanguage: "en" } }, querySelectorAll: () => links, body: {} },
    { navigator: { languages: ["en-US"] }, Intl, localStorage, location: { href: "https://asgracing.ru/hourly/?event=example#calendar", search: "?event=example", hash: "#calendar", replace: href => { redirected = href; } } }
  );
  assert.equal(redirected, undefined);
});

test("old lang query selects and saves its clean translation", () => {
  let redirected;
  const links = [link("en", "https://asgracing.ru/hourly/"), link("ru", "https://asgracing.ru/ru/hourly/")];
  const localStorage = storage();
  initializeLocalizedPage(
    { documentElement: { dataset: { pageLanguage: "en" } }, querySelectorAll: () => links, body: {} },
    { navigator: { languages: ["en-US"] }, Intl, localStorage, location: { href: "https://asgracing.ru/hourly/?lang=ru&event=example#calendar", search: "?lang=ru&event=example", hash: "#calendar", replace: href => { redirected = href; } } }
  );
  assert.equal(redirected, "https://asgracing.ru/ru/hourly/?event=example#calendar");
  assert.equal(readLocalePreference({ localStorage }).language, "ru");
});

test("route and query language win over conflicting legacy storage", () => {
  const localStorage = storage({
    asgLang: "en",
    "asg.top.v1:language": JSON.stringify({ version: 1, value: "en", expiresAt: 0 })
  });
  const windowRef = { navigator: { languages: ["en-US"] }, Intl, localStorage, location: { search: "?lang=ru" } };
  assert.deepEqual(resolvePageLocale({ documentRef: { documentElement: { dataset: {} } }, windowRef }), { language: "ru", region: "US", source: "query" });
  assert.deepEqual(resolvePageLocale({ documentRef: { documentElement: { dataset: { pageLanguage: "ru" } } }, windowRef: { ...windowRef, location: { search: "?lang=en" } } }), { language: "ru", region: "US", source: "route" });
});

test("namespaced legacy preference is read before the plain legacy key", () => {
  const localStorage = storage({
    asgLang: "en",
    "asg.top.v1:language": JSON.stringify({ version: 1, value: "ru", expiresAt: 0 })
  });
  assert.deepEqual(readLocalePreference({ localStorage }), { language: "ru", region: "GLOBAL", source: "legacy-namespaced" });
});

test("setting page locale synchronizes document controls and every storage format", () => {
  const localStorage = storage();
  const controls = [link("en", "#"), link("ru", "#")];
  const documentRef = { documentElement: { lang: "en" }, querySelectorAll: () => controls };
  const windowRef = { navigator: { languages: ["en-US"] }, Intl, localStorage, dispatchEvent() {}, CustomEvent: class { constructor(_name, init) { this.detail = init.detail; } } };
  assert.equal(setPageLocale("ru", { documentRef, windowRef }), true);
  assert.equal(documentRef.documentElement.lang, "ru");
  assert.equal(localStorage.getItem("asgLang"), "ru");
  assert.equal(JSON.parse(localStorage.getItem("asg.top.v1:language")).value, "ru");
  assert.equal(JSON.parse(localStorage.getItem("asgLocale")).region, "US");
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  detectVisitorLocale,
  initializeLocalizedPage,
  languageHref,
  pageLanguage,
  readLocalePreference,
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
  assert.deepEqual(readLocalePreference(windowRef), { language: "ru", region: "RU", source: "saved" });
});

test("saved locale redirects to the clean equivalent URL", () => {
  let redirected;
  const links = [link("en", "https://asgracing.ru/hourly/"), link("ru", "https://asgracing.ru/ru/hourly/")];
  const localStorage = storage({ asgLocale: JSON.stringify({ version: 1, language: "ru", region: "RU" }) });
  initializeLocalizedPage(
    { documentElement: { dataset: { pageLanguage: "en" } }, querySelectorAll: () => links, body: {} },
    { navigator: { languages: ["en-US"] }, Intl, localStorage, location: { href: "https://asgracing.ru/hourly/?event=example#calendar", search: "?event=example", hash: "#calendar", replace: href => { redirected = href; } } }
  );
  assert.equal(redirected, "https://asgracing.ru/ru/hourly/?event=example#calendar");
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

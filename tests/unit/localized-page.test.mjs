import test from "node:test";
import assert from "node:assert/strict";
import { languageHref, pageLanguage, initializeLocalizedPage } from "../../src/shared/localized-page.js";

test("language links retain entity/filter parameters and anchor, dropping only lang", () => {
  assert.equal(languageHref("/teams/index.ru.html", { href: "https://asgracing.ru/teams/?tab=teams&lang=en#ranking", search: "?tab=teams&lang=en", hash: "#ranking" }), "https://asgracing.ru/teams/index.ru.html?tab=teams#ranking");
});
test("page language is opt-in and independent of storage", () => {
  assert.equal(pageLanguage({ documentElement: { dataset: { pageLanguage: "ru" } } }), "ru");
  assert.equal(pageLanguage({ documentElement: { dataset: {} } }), null);
  initializeLocalizedPage({ documentElement: { dataset: {} } }, {});
});
test("old lang query selects its real translation, without any data client", () => {
  let redirected;
  const links = ["en", "ru"].map(lang => ({ href: `https://asgracing.ru/hourly/${lang === "ru" ? "index.ru.html" : ""}`, dataset: { lang }, classList: { toggle() {} }, setAttribute() {}, removeAttribute() {}, addEventListener() {} }));
  initializeLocalizedPage({ documentElement: { dataset: { pageLanguage: "en" } }, querySelectorAll: () => links }, { location: { href: "https://asgracing.ru/hourly/?lang=ru&event=example#calendar", search: "?lang=ru&event=example", hash: "#calendar", replace: href => { redirected = href; } } });
  assert.equal(redirected, "https://asgracing.ru/hourly/index.ru.html?event=example#calendar");
});

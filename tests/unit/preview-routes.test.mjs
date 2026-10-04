import test from "node:test";
import assert from "node:assert/strict";
import { previewHref, classicHref, classicPath } from "../../preview/routes.js";
const base = "https://asgracing.ru/preview/ru/hourly/";
test("preview navigation keeps public IDs, tabs, anchors and locale", () => {
  assert.equal(previewHref("/ru/driver/?id=drv_964ce73ba40a#history", base), "https://asgracing.ru/preview/ru/driver/?id=drv_964ce73ba40a#history");
  assert.equal(previewHref("/account/settings/?lang=ru", base), "https://asgracing.ru/preview/account/settings/?lang=ru");
  assert.equal(previewHref("/preview/teams/?tab=clubs", base), "https://asgracing.ru/preview/teams/?tab=clubs");
});
test("preview never rewrites APIs, static data, third party login or game launch", () => {
  for (const href of ["https://auth.asgracing.ru/v1/auth/steam/start?return_path=%2Fpreview%2F", "/assets/monza.jpg", "/news-content/news.json", "https://data.asgracing.ru/hourly-votes-api/vote", "https://evil.example/account/", "steam://run/805550", "acc-connect://server.example:9201/"]) {
    assert.equal(previewHref(href, base), new URL(href, base).href);
  }
});
test("return to classic preserves the current page and strips only the exact prefix", () => {
  assert.equal(classicHref(`${base}?event=abc#schedule`), "https://asgracing.ru/ru/hourly/?event=abc#schedule");
  assert.equal(classicPath("/preview-not-a-route/"), "/preview-not-a-route/");
  assert.equal(classicPath("/preview"), "/");
});

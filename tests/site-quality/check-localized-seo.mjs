import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, posix } from "node:path";
import vm from "node:vm";
import { pages } from "../../scripts/seo/pages.mjs";
import { nodes } from "../../scripts/seo/html-source.mjs";
const root = resolve(import.meta.dirname, "../..");
const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
const paths = [...pages.map(p => p.path), "join/index.html", "about/index.html"];
for (const path of paths) {
  const en = await readFile(resolve(root, path), "utf8");
  for (const lang of ["en", "ru"]) {
    const file = lang === "en" ? path : `ru/${path}`;
    const html = await readFile(resolve(root, file), "utf8");
    const parsed = nodes(html);
    const document = parsed.find(n => n.name === "html");
    assert.equal(document.attrs.lang, lang, file);
    assert.equal(document.attrs["data-page-language"], lang, file);
    const canonical = `https://asgracing.ru/${lang === "en" ? path.replace("index.html", "") : `ru/${path.replace("index.html", "")}`}`;
    assert.equal(parsed.find(n => n.attrs.rel === "canonical")?.attrs.href, canonical, file);
    for (const alternate of ["en", "ru-RU", "x-default"]) {
      const url = `https://asgracing.ru/${alternate === "ru-RU" ? `ru/${path.replace("index.html", "")}` : path.replace("index.html", "")}`;
      assert.equal(parsed.find(n => n.attrs.hreflang === alternate && n.attrs.rel === "alternate")?.attrs.href, url, file);
    }
    const title = parsed.find(n => n.name === "title");
    const heading = parsed.find(n => n.name === "h1");
    assert(heading, `${file}: meaningful h1`);
    assert(!/^[\s—-]*$/.test(html.slice(heading.openEnd, heading.close)), file);
    if (lang === "ru") {
      assert(/[А-Яа-яЁё]/.test(html.slice(title.openEnd, title.close)), file);
      assert(/[А-Яа-яЁё]/.test(parsed.find(n => n.attrs.name === "description").attrs.content), file);
    }
    assert(sitemap.includes(`<loc>${canonical}</loc>`), file);
    assert(!parsed.some(n => n.attrs.name === "robots" && n.attrs.content?.includes("noindex")), file);
    if (path === "hourly/championship/index.html") {
      const results = parsed.find(n => n.attrs.id === "championship-race-results-section");
      const seoIntro = parsed.find(n => (n.attrs.class || "").split(/\s+/).includes("seo-intro"));
      assert(results && seoIntro && seoIntro.start > results.end, `${file}: SEO block must follow championship results`);
    }
    for (const node of parsed.filter(n => n.name === "a" && n.attrs["data-lang"])) assert(node.attrs.href, `${file}: language must be a link`);
    // The same executable scripts and API configuration are used at the same directory depth.
    const signature = (text, pageUrl) => nodes(text).filter(n => (n.name === "script" && n.attrs.src) || (n.name === "meta" && /api|data-base|votes/.test(n.attrs.name || ""))).map(n => n.name === "script" ? { ...n.attrs, src: new URL(n.attrs.src, pageUrl).href } : n.attrs);
    assert.deepEqual(signature(html, canonical), signature(en, `https://asgracing.ru/${path.replace("index.html", "")}`), `${file}: scripts/data configuration must match EN`);
    assert.equal(posix.dirname(file), lang === "ru" ? posix.join("ru", posix.dirname(path)) : posix.dirname(path));
  }
}
for (const path of paths) {
  const legacy = path.replace("index.html", "index.ru.html");
  const html = await readFile(resolve(root, legacy), "utf8");
  const target = `https://asgracing.ru/ru/${path.replace("index.html", "")}`;
  const parsed = nodes(html);
  assert.equal(parsed.find(n => n.attrs.rel === "canonical")?.attrs.href, target, legacy);
  assert(parsed.some(n => n.attrs["http-equiv"] === "refresh" && n.attrs.content?.includes(new URL(target).pathname)), legacy);
  assert(!sitemap.includes(`<loc>https://asgracing.ru/${legacy}</loc>`), legacy);
}
assert(!sitemap.includes("<loc>https://asgracing.ru/driver/</loc>"));
for (const path of ["account/index.html", "portal-ops/index.html"]) assert((await readFile(resolve(root, path), "utf8")).includes("noindex"), path);
// Static page language wins even when cookie UI sees an opposite saved language.
for (const path of ["legal.js", "hourly/legal.js"]) {
  const source = await readFile(resolve(root, path), "utf8");
  const start = source.indexOf("  function getLanguage() {");
  const end = source.indexOf("\n  }", start) + 4;
  for (const lang of ["en", "ru"]) {
    const actual = vm.runInNewContext(`${source.slice(start, end)}; getLanguage()`, { document: { documentElement: { dataset: { pageLanguage: lang }, lang } }, getStoredLanguage: () => lang === "ru" ? "en" : "ru", navigator: { language: "ru" } });
    assert.equal(actual, lang, path);
  }
}
console.log("Localized SEO passed: clean RU URLs, 14 pages, compatibility redirects and stable resource URLs");

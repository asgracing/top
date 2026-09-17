// Optional local browser regression. All external requests are fulfilled with fixtures.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const root = path.resolve(import.meta.dirname, "../..");
const baseline = process.env.ASG_SEO_BASELINE;
const output = path.resolve(root, "../tmp/seo-browser-20260917");
await fs.mkdir(output, { recursive: true });
async function playwright() {
  try { return await import("playwright"); } catch (original) {
    const cache = path.join(process.env.LOCALAPPDATA || "", "npm-cache/_npx");
    for (const entry of await fs.readdir(cache, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      try { return await import(pathToFileURL(path.join(cache, entry.name, "node_modules/playwright/index.mjs"))); } catch {}
    }
    throw original;
  }
}
const { chromium } = await playwright();
let executablePath;
for (const candidate of ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"]) {
  try { await fs.access(candidate); executablePath = candidate; break; } catch {}
}
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const announcement = { event_id: "seo_fixture", date: "2026-09-18", start_time_local: "21:00", timezone: "UTC+3", track_code: "monza", track_name: "Monza", status: "scheduled", session_label: "Fixture race", server_name: "ASG fixture", competition_mode: "hourly", race_format: "sprint", launch_at: "2026-09-18T18:00:00Z", rules: { car_class: "GT3", quali_minutes: 10, race_minutes: 20 }, car_restriction: { mode: "open" } };
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon" };
const reports = [];
async function run(routePath, lang, width, before = false) {
  const context = await browser.newContext({ viewport: { width, height: 950 }, locale: lang === "en" ? "ru-RU" : "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-09-17T10:00:00Z") });
  await page.addInitScript(({ saved }) => {
    localStorage.setItem("asgLang", saved);
    localStorage.setItem("hourlyVoteVoterId", "seo-fixture-voter");
    localStorage.setItem("asg.top.v1:language", JSON.stringify({ version: 1, value: saved, expiresAt: 0 }));
    localStorage.setItem("asgPrivacyConsent", JSON.stringify({ version: 1, necessary: true, analytics: false, updatedAt: new Date().toISOString() }));
    window.__seoRequests = [];
    const original = window.fetch;
    window.fetch = function(resource, options = {}) {
      const url = new URL(resource instanceof Request ? resource.url : String(resource), location.href);
      window.__seoRequests.push({ url: url.href, method: options.method || "GET", body: options.body || null, credentials: options.credentials || "same-origin", cache: options.cache || "default" });
      return original.call(this, resource, options);
    };
  }, { saved: before ? lang : lang === "ru" ? "en" : "ru" });
  const errors = [], missing = [];
  page.on("pageerror", e => errors.push(e.message));
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    const json = value => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(value) });
    if (url.hostname === "asgracing.ru") {
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const relative = pathname.replace(/^\//, "");
      if (relative.includes("..")) return route.abort();
      let file = path.join(root, relative);
      if (before && baseline) { try { await fs.access(path.join(baseline, relative)); file = path.join(baseline, relative); } catch {} }
      try {
        if (/\.(mp4|webm)$/.test(file)) return route.fulfill({ status: 204, body: "" });
        return await route.fulfill({ status: 200, contentType: mime[path.extname(file)] || "application/octet-stream", body: await fs.readFile(file) });
      } catch {
        if (request.resourceType() === "script") missing.push(relative);
        return route.fulfill({ status: 404, body: "fixture missing" });
      }
    }
    if (url.pathname.endsWith("/announcement.json")) return json(announcement);
    if (url.pathname.endsWith("/schedule.json")) return json({ items: [announcement] });
    if (url.pathname.endsWith("/v1/me")) return json({ authenticated: false });
    if (url.pathname.endsWith("/voter-token")) return json({ voter_token: "seo-fixture-token", expires_at: "2030-01-01T00:00:00Z" });
    if (url.pathname.includes("hourly-votes-api")) return json({ ok: true, items: [{ event_id: "seo_fixture", votes: 1, already_voted: false }], event_id: "seo_fixture", votes: 1, already_voted: request.method() === "POST" && !url.pathname.endsWith("unvote") });
    if (url.pathname.endsWith("/server_status.json")) return json({ servers: [] });
    // Empty public snapshots exercise the site's existing empty-state behavior.
    return json({ items: [], rows: [], total: 0, data: [], schema_version: 1 });
  });
  await page.goto(`https://asgracing.ru${routePath}`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  for (const selector of ["#combined-stats-shell", "#recent-races-table", "#clubs-teams-grid"]) {
    if (await page.locator(selector).count()) await page.locator(selector).scrollIntoViewIfNeeded().catch(() => {});
  }
  await page.waitForTimeout(500);
  const requests = await page.evaluate(() => window.__seoRequests);
  const initialBackend = requests.filter(r => new URL(r.url).hostname !== "asgracing.ru");
  if (!before) {
    assert.equal(await page.locator("html").getAttribute("lang"), lang, routePath);
    assert.equal(await page.locator("html").getAttribute("data-page-language"), lang, routePath);
    assert.equal(await page.locator('a.lang-btn[aria-current="page"]').getAttribute("data-lang"), lang);
    if (lang === "ru") assert.match(await page.title(), /[А-Яа-яЁё]/);
    if (routePath.startsWith("/hourly/") && !routePath.includes("championship")) {
      assert.match(await page.locator("#hourly-upcoming-v2-title").innerText(), /Monza/);
      assert(await page.locator("[data-schedule-index]").count(), "real schedule renderer ran");
      await page.locator("[data-schedule-index]").first().click({ force: true });
      await page.waitForTimeout(100);
      const modal = page.locator("#schedule-modal");
      if (await modal.count()) assert(await modal.isVisible(), "event modal opens");
      await page.locator("#schedule-modal-close").click({ force: true });
      await page.waitForTimeout(350);
      assert.equal(await modal.isVisible(), false, "event modal closes");
    }
    const consent = page.getByRole("button", { name: /Только необходимые|Necessary only|Only necessary|Required only/ });
    if (await consent.count()) await consent.first().click({ force: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, `${routePath.replace(/[^a-z0-9]/gi, "_") || "home"}-${width}.png`) });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
    assert.equal(overflow, false, `horizontal overflow ${routePath} ${width}`);
  }
  const report = { routePath, lang, width, before, errors, missing, initialBackend, title: await page.title() };
  reports.push(report);
  await context.close();
  return report;
}
try {
  for (const path of ["/", "/hourly/", "/hourly/championship/", "/teams/", "/community/"]) {
    let prior;
    if (baseline) prior = await run(path, "en", 1440, true);
    const current = await run(path, "en", 1440);
    const normalize = requests => [...new Set(requests.map(r => {
      const url = new URL(r.url);
      // Per-load cache nonce and anonymous ID are intentionally generated by the unchanged client.
      if (url.searchParams.has("t")) url.searchParams.set("t", "fixture-time");
      if (url.searchParams.has("voter_id")) url.searchParams.set("voter_id", "fixture-voter");
      return JSON.stringify({ ...r, url: url.href });
    }))].sort();
    if (prior) {
      assert.deepEqual(current.missing, prior.missing, `new missing scripts: ${path}`);
      assert.deepEqual(current.errors, prior.errors, `new runtime errors: ${path}`);
      assert.deepEqual(normalize(current.initialBackend), normalize(prior.initialBackend), `backend request contract: ${path}`);
    }
    const ru = await run(`${path}index.ru.html`, "ru", 390);
    assert.deepEqual(ru.errors, current.errors, `RU runtime errors: ${path}`);
    assert.deepEqual(normalize(ru.initialBackend), normalize(current.initialBackend), `RU backend request contract: ${path}`);
  }
  for (const path of ["/join/", "/about/"]) for (const lang of ["en", "ru"]) await run(lang === "ru" ? `${path}index.ru.html` : path, lang, 390);
  console.log("Browser localization and backend request regression passed");
} finally {
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify(reports, null, 2));
  await browser.close();
}

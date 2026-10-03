import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
let playwright;
try { playwright = await import("playwright"); } catch {
  const cache = "C:/Users/Andrew/AppData/Local/npm-cache/_npx";
  for (const entry of await fs.readdir(cache)) {
    try { playwright = await import(pathToFileURL(path.join(cache, entry, "node_modules/playwright/index.mjs")).href); break; } catch {}
  }
}
assert.ok(playwright, "Playwright must be available");
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const relative = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
    const filename = path.resolve(root, `.${relative}`);
    if (!filename.startsWith(root)) throw new Error("outside root");
    const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" }[path.extname(filename)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(await fs.readFile(filename));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let executablePath;
for (const candidate of ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"]) {
  try { await fs.access(candidate); executablePath = candidate; break; } catch {}
}
const browser = await playwright.chromium.launch({ headless: true, executablePath });
try {
  for (const language of ["ru", "en"]) {
    for (const width of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      let approved = false;
      let allowed = true;
      let listCalls = 0;
      let approveCalls = 0;
      await page.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.origin === origin) return route.continue();
        if (url.hostname !== "auth.asgracing.ru") return route.abort();
        const headers = { "access-control-allow-origin": origin, "access-control-allow-credentials": "true", "access-control-allow-headers": "X-CSRF-Token,Accept", "access-control-allow-methods": "GET,POST,OPTIONS" };
        if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
        let payload;
        if (url.pathname === "/v1/me") payload = {
          authenticated: true, driver: { public_id: "drv_admin", display_name: "Admin" },
          steam: {}, csrf_token: "fixture-csrf", permissions: { moderation_issue: allowed }
        };
        else if (url.pathname.endsWith("/approve")) {
          approveCalls += 1;
          assert.equal(route.request().method(), "POST");
          assert.equal(route.request().headers()["x-csrf-token"], "fixture-csrf");
          approved = true;
          payload = { status: "ok" };
        } else if (url.pathname === "/v1/moderation/race-number-requests") {
          listCalls += 1;
          payload = { requests: approved ? [] : [
            { request_id: "request_1", public_id: "drv_target", display_name: "<b>Long Driver Name</b> ".repeat(6), requested_number: 44, current_race_number: 9, eligible: true },
            { request_id: "request_2", public_id: "drv_blocked", display_name: "Blocked", requested_number: 55, current_race_number: null, eligible: false }
          ] };
        } else throw new Error(`Unexpected fixture API: ${url.pathname}`);
        return route.fulfill({ json: payload, headers });
      });
      await page.goto(`${origin}/moderation/?lang=${language}`);
      await page.waitForSelector(".moderation-number-request");
      assert.equal(await page.locator(".moderation-number-request").count(), 2);
      assert.equal(await page.locator(".moderation-number-request b").count(), 0, "names must render as text");
      assert.equal(await page.locator(".moderation-number-request button").nth(1).isDisabled(), true);
      assert.equal(await page.locator("#race-number-review-title").textContent(), language === "ru" ? "Подтверждение гоночных номеров" : "Race number approval");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      page.once("dialog", dialog => dialog.dismiss());
      await page.locator(".moderation-number-request button").first().click();
      assert.equal(approveCalls, 0);
      page.once("dialog", dialog => dialog.accept());
      await page.locator(".moderation-number-request button").first().click();
      await page.waitForFunction(() => document.querySelectorAll(".moderation-number-request").length === 1);
      assert.equal(approveCalls, 1);
      await page.locator("#race-number-review-refresh").click();
      await page.waitForFunction(() => document.querySelectorAll(".moderation-number-request").length === 0);
      assert.equal(listCalls, 2);
      allowed = false;
      await page.reload();
      await page.waitForFunction(() => !document.getElementById("moderation-gate").hidden);
      assert.equal(await page.locator("#moderation-workspace").isVisible(), false);
      assert.equal(listCalls, 2, "denied users must not fetch requests");
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${language} ${width}px: approval, cancellation, refresh, gate and layout passed`);
    }
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

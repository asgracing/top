import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (error) {
    const npxRoot = "C:/Users/Andrew/AppData/Local/npm-cache/_npx";
    for (const entry of await fs.readdir(npxRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(npxRoot, entry.name, "node_modules", "playwright", "index.mjs");
      try {
        await fs.access(candidate);
        return await import(pathToFileURL(candidate).href);
      } catch {
        // Keep searching cached Playwright installations.
      }
    }
    throw error;
  }
}

const { chromium } = await loadPlaywright();
const executablePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ headless: true, executablePath });

function specialEventState() {
  const artwork = Array.from(document.querySelectorAll(".special-event-car-artwork:not([hidden])"));
  return {
    labels: Array.from(document.querySelectorAll(".is-special-event .event-type-badge, .is-special-event .hero-hourly-eyebrow"))
      .map(node => node.textContent.trim()),
    images: artwork.map(node => {
      const rect = node.getBoundingClientRect();
      const parent = node.parentElement.getBoundingClientRect();
      return {
        loaded: node.complete && node.naturalWidth > 0,
        rotated: getComputedStyle(node).transform !== "none",
        contained: rect.left >= parent.left - 1 && rect.top >= parent.top - 1 && rect.right <= parent.right + 1 && rect.bottom <= parent.bottom + 1,
        edges: { left: rect.left - parent.left, top: rect.top - parent.top, right: parent.right - rect.right, bottom: parent.bottom - rect.bottom },
      };
    }),
  };
}

try {
  for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
    const hourlyPage = await browser.newPage({ viewport });
    await hourlyPage.goto("file:///C:/Python/asgracing/top/hourly/index.html", { waitUntil: "load" });
    await hourlyPage.evaluate(() => {
      const root = document.getElementById("hourly-upcoming-v2");
      const badge = document.getElementById("hourly-upcoming-v2-special-badge");
      const car = document.getElementById("hourly-upcoming-v2-special-car");
      root.classList.add("is-special-event");
      badge.textContent = "МОНОМАШИНА · Ferrari 296 GT3";
      badge.hidden = false;
      car.src = new URL("../assets/car-icons/32.png", location.href).href;
      car.hidden = false;
      document.getElementById("schedule-v2-list").innerHTML = `
        <article class="hourly-slot-card-v2 is-special-event">
          <img class="special-event-car-artwork special-event-car-artwork-slot" src="../assets/car-icons/32.png" alt="" />
          <div class="hourly-slot-card-v2-inner">
            <div class="event-badges"><span class="event-type-badge">МОНОМАШИНА · Ferrari 296 GT3</span></div>
            <div class="hourly-slot-card-v2-time">08 сентября · 20:00 UTC+3</div>
            <div class="hourly-slot-card-v2-track">Monza</div>
          </div>
        </article>`;
      document.getElementById("calendar-v2-grid").innerHTML = `
        <div class="calendar-day">
          <button class="calendar-event is-special-event" type="button">
            <img class="special-event-car-artwork special-event-car-artwork-calendar" src="../assets/car-icons/32.png" alt="" />
            <span class="calendar-event-time">20:00</span>
            <span class="calendar-event-track">Monza</span>
            <span class="event-type-badge">МОНОМАШИНА · Ferrari 296 GT3</span>
          </button>
        </div>`;
    });
    await hourlyPage.waitForFunction(() => Array.from(document.querySelectorAll(".special-event-car-artwork:not([hidden])")).every(image => image.complete && image.naturalWidth > 0));
    const hourlyState = await hourlyPage.evaluate(specialEventState);
    assert.ok(hourlyState.labels.every(label => label.includes("Ferrari 296 GT3")), `${viewport.name}: Hourly label lost model name`);
    assert.ok(hourlyState.images.every(image => image.loaded && image.rotated && image.contained), `${viewport.name}: Hourly artwork is missing, unrotated, or clipped: ${JSON.stringify(hourlyState.images)}`);
    await hourlyPage.screenshot({ path: `C:/Python/asgracing/.tmp-special-event-hourly-${viewport.name}.png`, fullPage: true });
    await hourlyPage.close();

    const homePage = await browser.newPage({ viewport });
    await homePage.goto("file:///C:/Python/asgracing/top/index.html", { waitUntil: "load" });
    await homePage.evaluate(() => {
      const root = document.getElementById("hero-hourly-card");
      const car = document.getElementById("hourly-special-event-car");
      root.classList.add("is-special-event");
      document.getElementById("hourly-eyebrow").textContent = "МОНОМАШИНА · Ferrari 296 GT3";
      car.src = new URL("./assets/car-icons/32.png", location.href).href;
      car.hidden = false;
    });
    await homePage.waitForFunction(() => document.getElementById("hourly-special-event-car")?.naturalWidth > 0);
    const homeState = await homePage.evaluate(specialEventState);
    assert.ok(homeState.labels.every(label => label.includes("Ferrari 296 GT3")), `${viewport.name}: Home label lost model name`);
    assert.ok(homeState.images.every(image => image.loaded && image.rotated && image.contained), `${viewport.name}: Home artwork is missing, unrotated, or clipped: ${JSON.stringify(homeState.images)}`);
    await homePage.screenshot({ path: `C:/Python/asgracing/.tmp-special-event-home-${viewport.name}.png`, fullPage: true });
    await homePage.close();
  }

  console.log("special event layout checks passed");
} finally {
  await browser.close();
}

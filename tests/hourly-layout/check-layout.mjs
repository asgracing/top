import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const cases = [
  { name: "desktop", width: 1920, height: 1080 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "tablet-compact", width: 540, height: 720 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
  { name: "mobile-xr", width: 414, height: 896 }
];
const targetUrl = "file:///C:/Python/asgracing/top/hourly/index.html";

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (error) {
    const npxRoot = "C:/Users/Andrew/AppData/Local/npm-cache/_npx";
    const entries = await fs.readdir(npxRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(npxRoot, entry.name, "node_modules", "playwright", "index.mjs");
      try {
        await fs.access(candidate);
        return await import(pathToFileURL(candidate).href);
      } catch {
        // Keep searching cached npx installs.
      }
    }

    throw error;
  }
}

const { chromium } = await loadPlaywright();

async function resolveBrowserLaunchOptions() {
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return { headless: true, executablePath: candidate };
    } catch {
      // Try the next local browser.
    }
  }

  return { headless: true };
}

const browser = await chromium.launch(await resolveBrowserLaunchOptions());

try {
  for (const current of cases) {
    const page = await browser.newPage({ viewport: { width: current.width, height: current.height } });
    await page.goto(targetUrl, { waitUntil: "load" });
    await page.waitForSelector(".hourly-page-content");
    await page.evaluate(() => {
      const title = document.getElementById("hourly-upcoming-v2-title");
      const dateTime = document.getElementById("hourly-upcoming-v2-date-time");
      const footer = document.getElementById("hourly-upcoming-v2-footer");
      const championshipTitle = document.getElementById("hourly-championship-v2-title");
      const championshipMeta = document.getElementById("hourly-championship-v2-meta");
      const championshipEvent = document.getElementById("hourly-championship-v2-event");
      const championshipDescription = document.getElementById("hourly-championship-v2-description");
      const schedule = document.getElementById("schedule-v2-list");
      const recentRaces = document.getElementById("recent-races-table");

      if (title) title.textContent = "Monza";
      if (dateTime) dateTime.textContent = "07 июля 2026 г. · 21:00 UTC+3";
      if (footer) {
        footer.innerHTML = `
          <div class="hourly-v2-connect-actions">
            <a class="hourly-v2-connect-button" href="#">Подключиться</a>
            <a class="hourly-v2-help-button" href="#">Как подключиться?</a>
          </div>
          <div class="hourly-v2-footer-side">
            <div class="hourly-v2-actions-main">
              <button class="hourly-v2-participation-button" type="button">Ты в списке</button>
              <button class="hourly-v2-cancel-button" type="button" aria-label="Cancel"></button>
              <div class="hourly-v2-participant-count">2 участника</div>
            </div>
            <div class="hourly-v2-voting-note">Голосуя, вы соглашаетесь с обработкой идентификатора браузера.</div>
          </div>
        `;
      }

      if (championshipTitle) championshipTitle.textContent = "ASG Racing July 2026";
      if (championshipMeta) championshipMeta.textContent = "2026-07 • active";
      if (championshipEvent) {
        championshipEvent.innerHTML = `
          <div class="hourly-championship-v2-event-label">Событие чемпионата</div>
          <div class="hourly-championship-v2-event-track">Nordschleife</div>
          <div class="hourly-championship-v2-event-row"><span class="hourly-championship-v2-event-icon"></span><span>11 июля 2026 г. · 21:00 UTC+3</span></div>
          <div class="hourly-championship-v2-event-row"><span class="hourly-championship-v2-event-icon"></span><span>Есть риск дождя · 21%</span></div>
          <div class="hourly-championship-v2-event-row"><span class="hourly-championship-v2-event-icon"></span><span>Q 20m + R 60m</span></div>
          <div class="hourly-championship-v2-event-row"><span class="hourly-championship-v2-event-icon"></span><span>1 / 20m</span></div>
        `;
      }
      if (championshipDescription) {
        championshipDescription.textContent =
          "Июльский чемпионат ASG Racing. Две субботние гонки, отдельная таблица очков и награда чемпиону.";
      }

      if (schedule) {
        schedule.innerHTML = Array.from({ length: 3 }, (_, index) => `
          <article class="hourly-slot-card-v2">
            <div class="hourly-slot-card-v2-inner">
              <div class="event-type-badge">Часовая гонка</div>
              <div class="hourly-slot-card-v2-time">0${index + 7} июл. · 21:00 UTC+3</div>
              <div class="hourly-slot-card-v2-track">${index === 1 ? "Silverstone" : "Monza"}</div>
              <div class="hourly-slot-card-v2-weather">Переменная облачность · ${index === 0 ? "2" : index === 1 ? "5" : "10"}%</div>
              <div class="hourly-slot-card-v2-footer">
                <div class="hourly-v2-actions-main">
                  <button class="hourly-v2-participation-button is-compact" type="button">${index === 2 ? "Я хочу поехать!" : "Ты в списке"}</button>
                  <button class="hourly-v2-cancel-button" type="button" aria-label="Cancel"></button>
                  <div class="hourly-v2-participant-count">${index + 2} участника</div>
                </div>
              </div>
            </div>
          </article>
        `).join("");
      }

      if (recentRaces) {
        recentRaces.innerHTML = `
          <table class="races-table">
            <thead>
              <tr>
                <th>Date + UTC</th>
                <th>Track</th>
                <th>Winner</th>
                <th>Drivers</th>
                <th>Best lap</th>
              </tr>
            </thead>
            <tbody>
              ${Array.from({ length: 3 }, (_, index) => `
                <tr class="is-interactive-row" data-race-index="${index}" tabindex="0">
                  <td data-label="Date + UTC">2026-07-0${index + 4} 21:00 UTC+3</td>
                  <td data-label="Track">Spa Francorchamps</td>
                  <td data-label="Winner">Very Long Driver Name ${index + 1}</td>
                  <td data-label="Drivers">${16 + index}</td>
                  <td data-label="Best lap"><div>1:47.82${index}</div><div class="race-note">Another Long Driver Name</div></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="race-pagination">
            <div class="race-pagination-info">1-3 / 24</div>
            <div class="race-pagination-buttons">
              <button class="race-page-btn" type="button">&lt;</button>
              <button class="race-page-btn active" type="button">1</button>
              <button class="race-page-btn" type="button">2</button>
              <button class="race-page-btn" type="button">3</button>
              <button class="race-page-btn" type="button">&gt;</button>
            </div>
          </div>
        `;
      }
    });
    await page.locator("#recent-races").scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);

    const data = await page.evaluate(() => {
      const getBox = selector => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        };
      };

      return {
        wrapper: getBox(".hourly-page-content"),
        championship: getBox("#hourly-championship-v2"),
        mainEvent: getBox("#hourly-home-v2"),
        upcoming: getBox("#schedule"),
        recentRaces: getBox("#recent-races"),
        footer: getBox(".footer"),
        overflowFree: document.documentElement.scrollWidth <= window.innerWidth,
        clippingTargets: [
          "#hourly-upcoming-v2-footer .hourly-v2-actions-main",
          ".hourly-slot-card-v2-footer .hourly-v2-actions-main",
          "#hourly-championship-v2-button",
          "#hourly-upcoming-v2-date-time"
        ].map(selector => {
          const node = document.querySelector(selector);
          if (!node) return null;
          const rect = node.getBoundingClientRect();
          const parentRect = node.parentElement?.getBoundingClientRect();
          return {
            selector,
            rightWithinParent: parentRect ? rect.right - parentRect.right : 0,
            leftWithinParent: parentRect ? parentRect.left - rect.left : 0
          };
        }).filter(Boolean)
      };
    });

    assert.ok(data.wrapper, `${current.name}: wrapper missing`);
    assert.ok(data.championship, `${current.name}: championship missing`);
    assert.ok(data.mainEvent, `${current.name}: main event missing`);
    assert.ok(data.upcoming, `${current.name}: upcoming section missing`);
    assert.ok(data.recentRaces, `${current.name}: recent races section missing`);
    assert.ok(data.footer, `${current.name}: footer missing`);
    assert.equal(data.overflowFree, true, `${current.name}: horizontal overflow detected`);
    for (const target of data.clippingTargets) {
      assert.ok(target.rightWithinParent <= 1, `${current.name}: ${target.selector} exceeds parent on the right`);
      assert.ok(target.leftWithinParent <= 1, `${current.name}: ${target.selector} exceeds parent on the left`);
    }

    if (current.name === "desktop") {
      assert.ok(data.wrapper.width <= 1400, `${current.name}: wrapper is wider than 1400px`);
      const expectedLeft = (current.width - data.wrapper.width) / 2;
      assert.ok(Math.abs(data.wrapper.x - expectedLeft) <= 3, `${current.name}: wrapper is not centered`);
      assert.ok(data.mainEvent.x >= data.wrapper.x - 1, `${current.name}: main event exceeds wrapper on the left`);
      assert.ok(
        data.championship.x + data.championship.width <= data.wrapper.x + data.wrapper.width + 1,
        `${current.name}: championship exceeds wrapper on the right`
      );
      assert.ok(data.upcoming.x >= data.wrapper.x - 1, `${current.name}: upcoming exceeds wrapper on the left`);
      assert.ok(
        data.upcoming.x + data.upcoming.width <= data.wrapper.x + data.wrapper.width + 1,
        `${current.name}: upcoming exceeds wrapper on the right`
      );
      assert.ok(data.recentRaces.x >= data.wrapper.x - 1, `${current.name}: recent races exceeds wrapper on the left`);
      assert.ok(
        data.recentRaces.x + data.recentRaces.width <= data.wrapper.x + data.wrapper.width + 1,
        `${current.name}: recent races exceeds wrapper on the right`
      );
      assert.ok(data.footer.width <= 1400, `${current.name}: footer is wider than 1400px`);
    } else {
      assert.ok(
        data.championship.y + data.championship.height <= data.mainEvent.y + 1,
        `${current.name}: championship overlaps main event`
      );
      assert.ok(
        data.mainEvent.y + data.mainEvent.height <= data.upcoming.y + 1,
        `${current.name}: main event overlaps upcoming section`
      );
      assert.ok(
        data.upcoming.y + data.upcoming.height <= data.recentRaces.y + 1,
        `${current.name}: upcoming overlaps recent races`
      );
    }

    await page.screenshot({
      path: `C:/Python/asgracing/.tmp-hourly-layout-${current.name}.png`,
      fullPage: true
    });
    await page.close();
  }

  console.log("hourly layout checks passed");
} finally {
  await browser.close();
}

import { previewHref, classicHref, classicPath } from "./routes.js";
import { createAuthHeaderController } from "./runtime/src/features/auth/header-auth.js";

const ru = () => document.documentElement.lang === "ru";
const text = (russian, english) => ru() ? russian : english;
const make = (tag, className, content) => {
  const node = document.createElement(tag);
  node.className = className;
  if (content) node.textContent = content;
  return node;
};
const link = (label, href, className = "") => {
  const node = make("a", className, label);
  node.href = previewHref(href, location.href);
  return node;
};

function installVersionBar() {
  const bar = make("div", "preview-version-bar");
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", text("Версия сайта", "Site version"));
  bar.append(make("strong", "", text("НОВАЯ ВЕРСИЯ", "NEW VERSION")),
    make("span", "preview-live-note", text("Общие аккаунты и реальные действия", "Shared accounts · live actions")));
  const back = make("a", "preview-classic", text("Вернуться к текущей версии ↗", "Return to current version ↗"));
  back.href = classicHref(location.href);
  back.dataset.previewClassic = "true";
  bar.append(back);
  document.body.prepend(bar);
}

function installNavigation() {
  let nav = document.querySelector(".top-nav");
  let fallback = false;
  if (!nav) {
    fallback = true;
    nav = make("header", "top-nav preview-fallback-header");
    const inner = make("div", "top-nav-inner");
    const brand = link("", ru() ? "/ru/" : "/", "top-nav-brand");
    const logo = make("img", "top-nav-brand-logo"); logo.src = "/social/asg.png"; logo.alt = "";
    brand.append(logo, make("span", "top-nav-brand-text", "ASG Racing"));
    const actions = make("div", "top-nav-actions");
    for (const language of ["en", "ru"]) {
      const node = link(language.toUpperCase(), location.href, "lang-btn");
      node.dataset.lang = language;
      node.addEventListener("click", async event => {
        event.preventDefault();
        const { currentPageLanguageHref } = await import("./runtime/src/shared/localized-page.js");
        location.assign(currentPageLanguageHref(language));
      });
      actions.append(node);
    }
    inner.append(brand, make("div", "top-nav-center"), actions); nav.append(inner);
    document.querySelector(".preview-version-bar")?.after(nav);
  }
  const center = nav.querySelector(".top-nav-center");
  if (!center) return;
  center.replaceChildren();
  const menu = make("nav", "preview-navigation");
  menu.id = "preview-navigation";
  menu.setAttribute("aria-label", text("Главное меню", "Main navigation"));
  const groups = [
    [text("Гонки", "Racing"), [[text("Расписание", "Schedule"), "/hourly/"], [text("Чемпионат", "Championship"), "/hourly/championship/"], [text("История чемпионатов", "Championship history"), "/hourly/championship/history/"], [text("Результаты", "Race results"), "/races/"], [text("Как участвовать", "How to join"), "/join/"]]],
    [text("Статистика", "Statistics"), [[text("Рейтинг пилотов", "Driver standings"), "/#championship"], [text("Лучшие круги", "Best laps"), "/#bestlaps"], ["Safety Rating", "/#worst-safety"], [text("Машины", "Cars"), "/cars/"], [text("Интересная статистика", "Fun statistics"), "/fun-stats/"], [text("Список банов", "Ban list"), "/bans/"]]],
    [text("Клубы и команды", "Clubs & teams"), [[text("Клубы", "Clubs"), "/teams/?tab=clubs"], [text("Команды", "Teams"), "/teams/?tab=teams"], [text("Общий рейтинг", "Standings"), "/#clubs-teams-stats"]]],
    [text("Сообщество", "Community"), [[text("Новости", "News"), "/news/"], [text("Сообщество", "Community"), "/community/"], [text("Об ASG Racing", "About ASG Racing"), "/about/"], [text("Правила", "Rules"), "/#rules"], ["ASG Lab", "/asg-lab/"]]],
  ];
  for (const [name, items] of groups) {
    const details = make("details", "preview-nav-group");
    const summary = make("summary", "", name);
    const panel = make("div", "preview-nav-panel");
    for (const [label, href] of items) {
      const target = ru() && !href.startsWith("/asg-lab/") ? href === "/#championship" || href.startsWith("/#") ? `/ru${href}` : `/ru${href}` : href;
      const node = link(label, target);
      if (classicPath(location.pathname) === new URL(node.href).pathname.replace(/^\/preview/, "")) node.setAttribute("aria-current", "page");
      panel.append(node);
    }
    details.append(summary, panel);
    details.addEventListener("toggle", () => {
      if (details.open) menu.querySelectorAll("details").forEach(other => { if (other !== details) other.open = false; });
    });
    menu.append(details);
  }
  center.append(menu);
  const toggle = make("button", "preview-menu-toggle", text("Меню", "Menu"));
  toggle.type = "button";
  toggle.setAttribute("aria-controls", menu.id);
  toggle.setAttribute("aria-expanded", "false");
  toggle.addEventListener("click", () => {
    const opened = nav.classList.toggle("preview-menu-open");
    toggle.setAttribute("aria-expanded", String(opened));
  });
  nav.querySelector(".top-nav-inner")?.append(toggle);
  const close = () => {
    menu.querySelectorAll("details").forEach(group => { group.open = false; });
    nav.classList.remove("preview-menu-open");
    toggle.setAttribute("aria-expanded", "false");
  };
  document.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
  document.addEventListener("click", event => { if (!nav.contains(event.target)) close(); });
  if (fallback) createAuthHeaderController();
}

function redesignHome() {
  if (!['/', '/ru/'].includes(document.body.dataset.previewRoute)) return;
  const card = document.querySelector(".hero-card");
  if (!card) return;
  const original = [...card.children];
  const lead = make("section", "preview-hero");
  const copy = make("div", "preview-hero-copy");
  copy.append(make("p", "preview-eyebrow", text("СООБЩЕСТВО ACC", "ACC RACING COMMUNITY")),
    make("h1", "preview-headline", text("Твоя следующая гонка начинается здесь.", "Your next race starts here.")),
    make("p", "preview-hero-description", text("Ежедневные гонки, чемпионаты и сильные соперники. Найди свой заезд и следи за прогрессом.", "Daily races, championships and strong competition. Find your next event and follow your progress.")));
  const actions = make("div", "preview-hero-actions");
  actions.append(link(text("Выбрать гонку →", "Find a race →"), ru() ? "/ru/hourly/" : "/hourly/", "preview-button preview-button-primary"),
    link(text("Как участвовать", "How to join"), ru() ? "/ru/join/" : "/join/", "preview-button"));
  copy.append(actions);
  const event = document.getElementById("hero-hourly-stack");
  lead.append(copy);
  if (event) lead.append(event);
  const metrics = document.querySelector(".hero-side");
  metrics?.classList.add("preview-metrics");
  const secondary = make("div", "preview-home-secondary");
  for (const selector of [".hero-primary-actions", "#driver-of-day-btn", "#hero-online-card", ".hero-top3-panel"]) {
    const node = card.querySelector(selector);
    if (node) secondary.append(node);
  }
  const support = card.querySelector(".support-inline-widget");
  card.replaceChildren(lead);
  if (metrics) card.append(metrics);
  card.append(secondary);
  // Retain remaining nodes off screen only when they carry live controls/data.
  // The obsolete hero copy and its translated H1 are removed entirely.
  original.forEach(node => node.remove());
  if (support) {
    support.classList.add("preview-support");
    document.querySelector(".container .footer")?.before(support);
    if (!support.isConnected) document.querySelector(".container")?.append(support);
  }
  const donations = document.getElementById("donation-collapsible-widget");
  if (donations) {
    donations.classList.add("preview-supporters");
    document.querySelector(".container")?.append(donations);
  }
}

function enhanceContent() {
  const guide = document.querySelector(".seo-guide");
  if (guide) {
    const article = make("article", "preview-guide-article");
    const aside = make("nav", "preview-guide-toc");
    aside.setAttribute("aria-label", text("Оглавление", "On this page"));
    aside.append(make("strong", "", text("На этой странице", "On this page")));
    [...guide.children].forEach(node => { if (node.tagName !== "NAV") article.append(node); else node.remove(); });
    article.querySelectorAll("h2").forEach((heading, index) => {
      heading.id ||= `preview-guide-${index+1}`;
      aside.append(link(heading.textContent, `#${heading.id}`));
    });
    guide.append(aside, article);
  }
  // Introductions belong above the working content, where they orient visitors.
  const intro = document.querySelector(".seo-intro");
  const main = document.querySelector(".hourly-page-content, main .container, main.page, main");
  if (intro && main && !['/', '/ru/'].includes(document.body.dataset.previewRoute)) main.prepend(intro);
  // Keep the existing event controls intact; CSS sets their presentation order.
}

function enhanceDynamicContent(root = document) {
  const back = document.querySelector('[data-preview-classic]');
  if (back && back.href !== classicHref(location.href)) back.href = classicHref(location.href);
  document.querySelectorAll(".driver-stats-grid, #driver-stat-cards").forEach(grid => {
    const cards = [...grid.children].filter(node => node.matches(".driver-stat-card"));
    if (cards.length <= 4) return;
    const details = make("details", "preview-profile-details");
    details.append(make("summary", "", text("Вся статистика пилота", "All driver statistics")));
    const extra = make("div", "preview-profile-stats");
    cards.slice(4).forEach(card => extra.append(card));
    details.append(extra);
    grid.after(details);
  });
  for (const widget of document.querySelectorAll("#twitch-widget, #driver-achievements-widget")) {
    if (widget.dataset.previewPlaced) continue;
    widget.dataset.previewPlaced = "true";
    const container = document.querySelector(".container, main.page, main") || document.body;
    container.append(widget);
  }
  document.querySelectorAll('#hourly-upcoming-v2-info-grid > .event-details-v2-card-format, #hourly-upcoming-v2-info-grid > .event-details-v2-card-conditions').forEach(card => {
    const details = make("details", "preview-event-details");
    const heading = card.querySelector("h3, .event-details-v2-card-title");
    const summary = make("summary", "", heading?.textContent?.trim() || text("Параметры события", "Event parameters"));
    card.before(details);
    details.append(summary, card);
  });
  const track = document.getElementById("hourly-track-value")?.textContent?.trim().toLowerCase().replaceAll(" ", "");
  if (["barcelona", "spa", "monza", "silverstone", "suzuka", "imola", "nurburgring"].includes(track)) {
    document.documentElement.style.setProperty("--preview-race-image", `url('/assets/${track}.jpg')`);
  }
  root.querySelectorAll?.('a[href]:not([data-preview-classic])').forEach(anchor => {
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || /^(?:javascript:|mailto:|tel:|data:|blob:|steam:|acc-connect:)/i.test(href)) return;
    try {
      const next = previewHref(href, location.href);
      if (next !== anchor.href) anchor.href = next;
    } catch { /* Existing URL validation remains responsible for application data. */ }
  });
  root.querySelectorAll?.("table").forEach(table => {
    const labels = [...table.querySelectorAll("thead th")].map(header => header.textContent.trim());
    if (!labels.length) return;
    table.querySelectorAll("tbody tr").forEach(row => {
      [...row.children].forEach((cell, index) => {
        if (cell.colSpan === 1) cell.dataset.previewLabel = labels[index] || "";
      });
    });
  });
  root.querySelectorAll?.('.calendar-day').forEach(day => {
    day.classList.toggle("preview-calendar-has-event", Boolean(day.querySelector(".calendar-event")));
  });
  // Resolve relative feed images using the classic feed location (also on RU).
  root.querySelectorAll?.('img[src]').forEach(img => {
    const raw = img.getAttribute("src");
    if (raw?.startsWith("news-content/")) img.src = `/${raw}`;
  });
}

installVersionBar();
installNavigation();
redesignHome();
enhanceContent();
enhanceDynamicContent();
let queued = false;
const observer = new MutationObserver(() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; enhanceDynamicContent(); });
});
observer.observe(document.body, { childList: true, subtree: true });
document.addEventListener("click", event => {
  const anchor = event.target.closest?.('a[href]:not([data-preview-classic])');
  if (anchor) enhanceDynamicContent(anchor.parentElement);
}, true);

import { bootstrapPreview } from "./bootstrap.js?v=20261004p2";
import { previewHref, classicHref, classicPath } from "./routes.js";
import { createAuthHeaderController } from "./runtime/src/features/auth/header-auth.js";

const requestedLanguage = new URLSearchParams(location.search).get("lang");
if (["ru", "en"].includes(requestedLanguage)) document.documentElement.lang = requestedLanguage;
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

installVersionBar();
installNavigation();
bootstrapPreview();

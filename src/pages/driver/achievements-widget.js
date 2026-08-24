import {
  ACHIEVEMENT_CATEGORY_ORDER,
  categoryCounts,
  normalizeFullAchievements,
  normalizePublicAchievements,
  selectAchievementCards
} from "./achievements-model.js";
import { buildAuthReturnPath, normalizeAuthPayload } from "../../features/auth/header-auth.js";
import { createHttpClient } from "../../shared/http-client.js";

const DEFAULT_DATA_BASE_URL = "https://data.asgracing.ru/achievements/v1";
const DEFAULT_AUTH_BASE_URL = "https://auth.asgracing.ru";

const COPY = Object.freeze({
  en: {
    title: "Achievements",
    loading: "Loading achievements...",
    empty: "No achievements have been calculated for this driver yet.",
    unavailable: "Achievements are temporarily unavailable.",
    retry: "Try again",
    earned: "earned",
    stale: "Last available snapshot",
    titleLabel: "Driver title",
    publicHint: "A public preview is shown. Sign in with Steam to see every achievement and exact progress.",
    steamCta: "Sign in with Steam and view all",
    fullLoading: "Loading the full achievement collection...",
    fullUnavailable: "The full collection is temporarily unavailable. The public preview remains available.",
    nearest: "Closest",
    completed: "Completed",
    locked: "In progress",
    times: "Completed {count} times",
    secretName: "Secret achievement",
    secretDescription: "Unlock it to reveal its condition.",
    progress: "{current} of {target}",
    categoryEmpty: "No achievements in this branch yet.",
    categories: {
      career: "Career", victories: "Victories", speed: "Speed", racecraft: "Racecraft",
      endurance: "Endurance", exploration: "Exploration", events: "Events", secret: "Secret"
    }
  },
  ru: {
    title: "Достижения",
    loading: "Загружаем достижения...",
    empty: "Для этого пилота достижения пока не рассчитаны.",
    unavailable: "Достижения временно недоступны.",
    retry: "Повторить",
    earned: "получено",
    stale: "Показан последний доступный снимок",
    titleLabel: "Звание пилота",
    publicHint: "Сейчас показан публичный минимум. Войдите через Steam, чтобы увидеть все достижения и точный прогресс.",
    steamCta: "Войти через Steam и посмотреть все",
    fullLoading: "Загружаем полную коллекцию достижений...",
    fullUnavailable: "Полная коллекция временно недоступна. Публичный минимум продолжает работать.",
    nearest: "Ближе всего",
    completed: "Получено",
    locked: "В процессе",
    times: "Выполнено {count} раз",
    secretName: "Секретное достижение",
    secretDescription: "Получите его, чтобы раскрыть условие.",
    progress: "{current} из {target}",
    categoryEmpty: "В этой ветке достижений пока нет.",
    categories: {
      career: "Карьера", victories: "Победы", speed: "Скорость", racecraft: "Racecraft",
      endurance: "Endurance", exploration: "Исследование", events: "Events", secret: "Secret"
    }
  }
});

function element(documentRef, tag, className, value = "") {
  const node = documentRef.createElement(tag);
  if (className) node.className = className;
  if (value !== "") node.textContent = value;
  return node;
}

function currentLanguage(documentRef, windowRef) {
  const active = documentRef.querySelector(".lang-btn.active[data-lang]")?.dataset.lang;
  if (active === "ru" || active === "en") return active;
  try {
    const stored = windowRef.localStorage?.getItem("asgLang");
    if (stored === "ru" || stored === "en") return stored;
  } catch {}
  return String(documentRef.documentElement?.lang || "").toLowerCase().startsWith("ru") ? "ru" : "en";
}

function safePublicId(value) {
  const id = String(value || "").trim();
  return /^drv_[a-z0-9]+$/i.test(id) ? id : "";
}

function formatValue(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function createDriverAchievementsController({
  documentRef = document,
  windowRef = window,
  fetchImpl = globalThis.fetch,
  dataBaseUrl = DEFAULT_DATA_BASE_URL,
  authBaseUrl = DEFAULT_AUTH_BASE_URL
} = {}) {
  const root = documentRef.getElementById("driver-achievements-widget");
  if (!root || typeof fetchImpl !== "function") return null;
  const content = documentRef.getElementById("driver-achievements-content") || root;
  const publicId = safePublicId(new URLSearchParams(windowRef.location.search).get("id"));
  const client = createHttpClient({ fetchImpl, defaultTimeoutMs: 9000 });
  const state = {
    status: publicId ? "loading" : "error",
    publicData: null,
    fullData: null,
    authenticated: false,
    fullStatus: "idle",
    filter: "career"
  };
  let destroyed = false;
  let requestController = null;

  const copy = key => {
    const language = currentLanguage(documentRef, windowRef);
    return COPY[language]?.[key] ?? COPY.en[key] ?? key;
  };

  function renderProgress(value, label, className = "") {
    const progress = element(documentRef, "div", `driver-achievements-progress ${className}`.trim());
    const bar = element(documentRef, "div", "driver-achievements-progress-bar");
    bar.style.width = `${Math.max(0, Math.min(100, value))}%`;
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    progress.setAttribute("aria-valuenow", String(Math.round(value)));
    progress.setAttribute("aria-label", label);
    progress.appendChild(bar);
    return progress;
  }

  function renderHeader(data) {
    const header = element(documentRef, "header", "driver-achievements-header");
    const heading = element(documentRef, "div", "driver-achievements-heading");
    const title = element(documentRef, "h2", "driver-achievements-title", `${copy("title")} — ${data.summary.earned}/${data.summary.total}`);
    title.id = "driver-achievements-title";
    heading.appendChild(title);
    if (data.summary.title) {
      const driverTitle = element(documentRef, "div", "driver-achievements-driver-title");
      driverTitle.append(
        element(documentRef, "span", "driver-achievements-driver-title-label", copy("titleLabel")),
        element(documentRef, "strong", "", data.summary.title)
      );
      heading.appendChild(driverTitle);
    }
    const percent = element(documentRef, "strong", "driver-achievements-percent", `${Math.round(data.summary.completionPercent)}%`);
    header.append(heading, percent);
    const shell = element(documentRef, "div", "driver-achievements-summary-progress");
    shell.appendChild(renderProgress(data.summary.completionPercent, `${copy("title")}: ${Math.round(data.summary.completionPercent)}%`));
    return [header, shell];
  }

  function renderCard(card, { compact = false } = {}) {
    const lockedSecret = card.secret && !card.earned;
    const item = element(
      documentRef,
      "article",
      `driver-achievement-card ${card.earned ? "is-earned" : "is-locked"}${compact ? " is-compact" : ""}`
    );
    const icon = element(documentRef, "span", "driver-achievement-icon", lockedSecret ? "◆" : card.icon);
    icon.setAttribute("aria-hidden", "true");
    const body = element(documentRef, "div", "driver-achievement-body");
    const top = element(documentRef, "div", "driver-achievement-topline");
    top.append(
      element(documentRef, "strong", "driver-achievement-name", lockedSecret ? copy("secretName") : card.name || copy("title")),
      element(documentRef, "span", `driver-achievement-state ${card.earned ? "is-earned" : ""}`, card.earned ? copy("completed") : copy("locked"))
    );
    body.appendChild(top);
    if (!compact && (card.description || lockedSecret)) {
      body.appendChild(element(documentRef, "p", "driver-achievement-description", lockedSecret ? copy("secretDescription") : card.description));
    }
    if (!lockedSecret && card.kind === "counter") {
      body.appendChild(element(documentRef, "div", "driver-achievement-counter", copy("times").replace("{count}", formatValue(card.counter))));
    } else if (!lockedSecret && card.target > 0) {
      const value = element(
        documentRef,
        "div",
        "driver-achievement-progress-value",
        copy("progress").replace("{current}", formatValue(card.progress)).replace("{target}", formatValue(card.target))
      );
      body.append(value, renderProgress(card.ratio * 100, value.textContent, "driver-achievement-progress"));
    }
    item.append(icon, body);
    return item;
  }

  function renderPublic(data) {
    const fragment = documentRef.createDocumentFragment();
    renderHeader(data).forEach(node => fragment.appendChild(node));
    if (data.stale) fragment.appendChild(element(documentRef, "div", "driver-achievements-stale", copy("stale")));
    if (data.categories?.length) {
      const categories = element(documentRef, "div", "driver-achievements-category-summary");
      for (const category of data.categories) {
        const suffix = category.total === null ? "" : ` ${category.earned}/${category.total}`;
        categories.appendChild(element(documentRef, "span", "driver-achievements-category-chip", `${copy("categories")[category.id]}${suffix}`));
      }
      fragment.appendChild(categories);
    }
    const cards = element(documentRef, "div", "driver-achievements-cards driver-achievements-preview");
    data.cards.forEach(card => cards.appendChild(renderCard(card, { compact: true })));
    if (data.cards.length) fragment.appendChild(cards);
    if (!state.authenticated) {
      fragment.appendChild(element(documentRef, "p", "driver-achievements-auth-hint", copy("publicHint")));
      const cta = element(documentRef, "a", "driver-achievements-steam-cta");
      cta.href = `${authBaseUrl.replace(/\/+$/, "")}/v1/auth/steam/start?return_path=${encodeURIComponent(buildAuthReturnPath(windowRef.location))}`;
      cta.append(
        element(documentRef, "span", "driver-achievements-steam-mark", "S"),
        element(documentRef, "span", "", copy("steamCta"))
      );
      fragment.appendChild(cta);
    }
    return fragment;
  }

  function renderCategoryTabs(data) {
    const counts = categoryCounts(data.cards);
    const tabs = element(documentRef, "div", "driver-achievements-tabs");
    tabs.setAttribute("role", "tablist");
    for (const category of ACHIEVEMENT_CATEGORY_ORDER) {
      const count = counts.get(category);
      if (!count?.total) continue;
      const button = element(documentRef, "button", "driver-achievements-tab", `${copy("categories")[category]} ${count.earned}/${count.total}`);
      button.type = "button";
      button.dataset.filter = category;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(state.filter === category));
      if (state.filter === category) button.classList.add("is-active");
      button.addEventListener("click", () => { state.filter = category; render(); });
      tabs.appendChild(button);
    }
    const nearest = element(documentRef, "button", "driver-achievements-tab", copy("nearest"));
    nearest.type = "button";
    nearest.dataset.filter = "nearest";
    nearest.setAttribute("role", "tab");
    nearest.setAttribute("aria-selected", String(state.filter === "nearest"));
    if (state.filter === "nearest") nearest.classList.add("is-active");
    nearest.addEventListener("click", () => { state.filter = "nearest"; render(); });
    tabs.appendChild(nearest);
    return tabs;
  }

  function renderFull(data) {
    const fragment = documentRef.createDocumentFragment();
    renderHeader(data).forEach(node => fragment.appendChild(node));
    if (data.stale) fragment.appendChild(element(documentRef, "div", "driver-achievements-stale", copy("stale")));
    fragment.appendChild(renderCategoryTabs(data));
    const cards = selectAchievementCards(data.cards, state.filter);
    const list = element(documentRef, "div", "driver-achievements-cards");
    cards.forEach(card => list.appendChild(renderCard(card)));
    if (!cards.length) list.appendChild(element(documentRef, "div", "driver-achievements-empty", copy("categoryEmpty")));
    fragment.appendChild(list);
    return fragment;
  }

  function render() {
    if (destroyed) return;
    content.replaceChildren();
    root.dataset.state = state.status;
    if (state.status === "loading") {
      const loading = element(documentRef, "div", "driver-achievements-loading", copy("loading"));
      loading.setAttribute("role", "status");
      content.appendChild(loading);
      return;
    }
    if (state.fullData) {
      content.appendChild(renderFull(state.fullData));
      return;
    }
    if (state.publicData) {
      content.appendChild(renderPublic(state.publicData));
      if (state.authenticated && state.fullStatus === "loading") {
        const loading = element(documentRef, "div", "driver-achievements-full-state", copy("fullLoading"));
        loading.setAttribute("role", "status");
        content.appendChild(loading);
      } else if (state.authenticated && state.fullStatus === "error") {
        content.appendChild(element(documentRef, "div", "driver-achievements-full-state is-error", copy("fullUnavailable")));
      }
      return;
    }
    const message = element(documentRef, "div", "driver-achievements-empty", state.status === "empty" ? copy("empty") : copy("unavailable"));
    content.appendChild(message);
    if (state.status === "error" && publicId) {
      const retry = element(documentRef, "button", "driver-achievements-retry", copy("retry"));
      retry.type = "button";
      retry.addEventListener("click", () => void load());
      content.appendChild(retry);
    }
  }

  async function loadFull() {
    state.fullStatus = "loading";
    render();
    try {
      const payload = await client.requestJson(`${authBaseUrl.replace(/\/+$/, "")}/v1/drivers/${encodeURIComponent(publicId)}/achievements`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: requestController.signal,
        retries: 1
      });
      if (!destroyed) {
        state.fullData = normalizeFullAchievements(payload);
        state.fullStatus = "ready";
        const firstCategory = ACHIEVEMENT_CATEGORY_ORDER.find(category => state.fullData.cards.some(card => card.category === category));
        state.filter = firstCategory || "nearest";
        render();
      }
    } catch (error) {
      if (!destroyed && error?.kind !== "aborted") {
        state.fullStatus = "error";
        render();
      }
    }
  }

  async function checkAuth() {
    try {
      const payload = await client.requestJson(`${authBaseUrl.replace(/\/+$/, "")}/v1/me`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: requestController.signal,
        retries: 1
      });
      const auth = normalizeAuthPayload(payload);
      if (!destroyed && auth.authenticated) {
        state.authenticated = true;
        await loadFull();
      }
    } catch {}
  }

  async function load() {
    requestController?.abort();
    requestController = new AbortController();
    state.status = publicId ? "loading" : "error";
    state.publicData = null;
    state.fullData = null;
    state.fullStatus = "idle";
    render();
    if (!publicId) return;
    const publicPromise = client.requestJson(`${dataBaseUrl.replace(/\/+$/, "")}/drivers/${encodeURIComponent(publicId)}.json`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: requestController.signal,
      retries: 1
    });
    const authPromise = checkAuth();
    try {
      const payload = await publicPromise;
      if (!destroyed) {
        state.publicData = normalizePublicAchievements(payload);
        state.status = state.publicData.cards.length || state.publicData.summary.total ? "ready" : "empty";
        render();
      }
    } catch (error) {
      if (!destroyed && error?.kind !== "aborted") {
        state.status = "error";
        render();
      }
    }
    await authPromise;
  }

  const languageHandler = event => {
    if (event.target?.closest?.(".lang-btn[data-lang]")) windowRef.setTimeout(render, 0);
  };
  documentRef.addEventListener("click", languageHandler);
  void load();

  return Object.freeze({
    reload: load,
    destroy() {
      destroyed = true;
      requestController?.abort();
      documentRef.removeEventListener("click", languageHandler);
    }
  });
}

import { routeHref } from "../site-routing.js?v=20261007root1";

const authOrigin = "https://auth.asgracing.ru";
const endpoint = authOrigin + "/v1/site-admin/appearance";

async function requestAppearance(options = {}) {
  const response = await fetch(endpoint, {
    credentials: "include",
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    ...options
  });
  if (!response.ok) throw Object.assign(new Error("Site appearance unavailable"), { status: response.status });
  const state = await response.json();
  if (typeof state.new_year_enabled !== "boolean" || !Number.isSafeInteger(state.revision)) {
    throw new Error("Invalid appearance state");
  }
  return state;
}

export function mountAppearanceAdmin({ view, language, subscribe }) {
  const text = (ru, en) => language === "ru" ? ru : en;
  const loginUrl = new URL("/v1/auth/steam/start", authOrigin);
  loginUrl.searchParams.set("return_path", routeHref("site-admin/", language));
  view.className = "asg-appearance-admin";
  view.innerHTML = `
    <header class="asg-appearance-heading">
      <h1>${text("Управление сайтом", "Site management")}</h1>
    </header>
    <section class="panel asg-appearance-gate">
      <p role="status">${text("Проверяем доступ…", "Checking access…")}</p>
      <a class="button primary" hidden>${text("Войти через Steam", "Sign in with Steam")}</a>
      <button class="button" type="button" hidden>${text("Повторить", "Retry")}</button>
    </section>
    <div class="asg-appearance-workspace" hidden>
      <section class="panel asg-appearance-controls" aria-labelledby="asg-appearance-title">
        <h2 id="asg-appearance-title">${text("Оформление", "Appearance")}</h2>
        <div class="asg-appearance-card">
          <div class="asg-appearance-swatch" aria-hidden="true"></div>
          <h3>${text("Новый год", "New Year")}</h3>
          <p>${text("Снегопад, гирлянды и хвойные ветки. Один переключатель для всех страниц.", "Snowfall, string lights and evergreen sprigs. One switch for every page.")}</p>
          <span class="asg-appearance-state"></span>
          <button class="button primary" type="button" data-appearance-save></button>
        </div>
        <p class="asg-appearance-message" role="status"></p>
      </section>
      <section class="panel asg-appearance-preview" aria-labelledby="asg-appearance-preview-title">
        <div class="asg-appearance-preview-top">
          <div>
            <h2 id="asg-appearance-preview-title">${text("Предпросмотр", "Preview")}</h2>
            <p>${text("Выбери страницу и сравни её с обычным оформлением.", "Choose a page and compare it with the standard appearance.")}</p>
          </div>
          <div class="asg-appearance-preview-actions">
            <select aria-label="${text("Страница для предпросмотра", "Page to preview")}">
              <option value="">${text("Главная", "Home")}</option>
              <option value="hourly/">${text("Часовые гонки", "Hourly races")}</option>
              <option value="about/">${text("О сообществе", "About")}</option>
            </select>
            <button class="button" type="button" aria-pressed="true" data-appearance-preview>${text("Новогодний стиль", "New Year style")}</button>
          </div>
        </div>
        <div class="asg-appearance-frame"></div>
      </section>
    </div>`;

  const gate = view.querySelector(".asg-appearance-gate");
  const workspace = view.querySelector(".asg-appearance-workspace");
  const gateMessage = gate.querySelector("p");
  const retry = gate.querySelector("button");
  const login = gate.querySelector("a");
  const save = view.querySelector("[data-appearance-save]");
  const previewToggle = view.querySelector("[data-appearance-preview]");
  const previewPage = view.querySelector("select");
  const frameHost = view.querySelector(".asg-appearance-frame");
  const stateLabel = view.querySelector(".asg-appearance-state");
  const message = view.querySelector(".asg-appearance-message");
  login.href = loginUrl.href;
  let current;
  let csrf;
  let busy = false;
  let previewEnabled = true;
  let frame;
  let accessTicket = 0;

  function showGate(status) {
    current = undefined;
    csrf = undefined;
    workspace.hidden = true;
    frame?.remove();
    frame = undefined;
    gate.hidden = false;
    login.hidden = status !== 401;
    retry.hidden = status === 401 || status === 403;
    gateMessage.textContent = status === 401
      ? text("Войди через Steam, чтобы открыть панель.", "Sign in with Steam to open site management.")
      : status === 403
        ? text("У этого аккаунта нет доступа к управлению сайтом.", "This account cannot manage the site.")
        : text("Не удалось проверить доступ к панели.", "Could not check access.");
  }

  function updateState() {
    const enabled = current.new_year_enabled;
    stateLabel.dataset.enabled = String(enabled);
    stateLabel.textContent = enabled ? text("Включено на сайте", "Active on site") : text("Выключено на сайте", "Off on site");
    save.disabled = busy;
    save.textContent = enabled ? text("Выключить на сайте", "Turn off on site") : text("Включить на сайте", "Turn on for the site");
  }

  async function load() {
    const ticket = ++accessTicket;
    retry.hidden = true;
    try {
      const result = await requestAppearance();
      if (ticket !== accessTicket) return;
      if (typeof result.csrf_token !== "string" || !result.csrf_token) throw new Error("Missing CSRF token");
      current = result;
      csrf = result.csrf_token;
      gate.hidden = true;
      workspace.hidden = false;
      updateState();
      if (!frame) {
        frame = document.createElement("iframe");
        frame.title = text("Предпросмотр страницы ASG Racing", "ASG Racing page preview");
        frame.tabIndex = -1;
        frame.setAttribute("sandbox", "allow-same-origin allow-scripts");
        frame.setAttribute("data-asg-new-year-preview", previewEnabled ? "on" : "off");
        frame.src = routeHref(previewPage.value, language);
        frameHost.append(frame);
      }
    } catch (error) {
      if (ticket === accessTicket) showGate(error.status);
    }
  }

  previewPage.addEventListener("change", () => {
    if (frame) frame.src = routeHref(previewPage.value, language);
  });
  previewToggle.addEventListener("click", () => {
    previewEnabled = !previewEnabled;
    previewToggle.setAttribute("aria-pressed", String(previewEnabled));
    frame?.setAttribute("data-asg-new-year-preview", previewEnabled ? "on" : "off");
  });
  retry.addEventListener("click", () => void load());
  save.addEventListener("click", async () => {
    if (!current || busy) return;
    const ticket = accessTicket;
    busy = true;
    updateState();
    message.textContent = text("Сохраняем…", "Saving…");
    try {
      const result = await requestAppearance({
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ new_year_enabled: !current.new_year_enabled, revision: current.revision })
      });
      if (ticket !== accessTicket) return;
      current = result;
      message.textContent = text("Оформление сайта обновлено.", "Site appearance updated.");
      window.dispatchEvent(new Event("asg-appearance-refresh"));
    } catch (error) {
      if (ticket !== accessTicket) return;
      message.textContent = error.status === 409
        ? text("Настройка изменилась. Показано текущее состояние.", "The setting changed. Showing the current state.")
        : text("Не удалось подтвердить сохранение. Проверяем текущее состояние.", "Could not confirm the save. Checking the current state.");
      await load();
    } finally {
      busy = false;
      if (current) updateState();
    }
  });

  let hadAccess = false;
  subscribe(({ auth }) => {
    if (auth?.permissions?.siteAppearanceManage) {
      if (!hadAccess && !current) void load();
      hadAccess = true;
    } else if (hadAccess) {
      hadAccess = false;
      ++accessTicket;
      showGate(auth?.authenticated ? 403 : 401);
    }
  });
  if (!accessTicket) void load();
}

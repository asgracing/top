import { createAuthHeaderController } from "../../features/auth/header-auth.js";

const AUTH_BASE_URL = "https://auth.asgracing.ru";

const COPY = {
  en: {
    eyebrow: "Driver account",
    title: "Your ASG Racing profile",
    loading: "Loading account…",
    signedOut: "Sign in with Steam to open your driver account.",
    signIn: "Sign in to driver account",
    noProfile: "The ASG driver profile has not been linked yet.",
    number: "Race number",
    noNumber: "Number not assigned",
    pending: number => `Request for #${number} is awaiting moderation.`,
    profile: "Open driver profile",
    settings: "Profile settings",
    overview: "Profile overview",
    discord: "Discord",
    linked: "Linked",
    notLinked: "Not linked",
    numberSettings: "Race number settings",
    numberHelp: "Choose a globally unique number from 1 to 999. A new assignment must be approved.",
    numberLabel: "New number (1–999)",
    submit: "Submit request",
    cancel: "Cancel request",
    release: "Release current number",
    releaseConfirm: "Release your current race number immediately?",
    submitted: "Request sent for moderation.",
    cancelled: "Request cancelled.",
    released: "Number released.",
    blocked: "Race-number management is unavailable while the driver is banned.",
    cooldown: value => `You can change the number after ${value}.`,
    taken: "This number is already assigned or reserved.",
    failed: "The operation could not be completed. Try again.",
    navSpecial: "Special Event", navChampionship: "Championship", navRules: "Rules",
    navNews: "News", navRacing: "Racing", navLastRaces: "Last Races",
    navStats: "Stats", navCars: "Cars", navFunStats: "Fun Stats",
    navRating: "Rating", navBestLaps: "Best Laps", navSafety: "Safety Rating",
    navBans: "Ban List", navCommunity: "Community", navAbout: "About Server",
    footerText: "Statistics are generated from ACC Dedicated Server result files and published via GitHub Pages."
  },
  ru: {
    eyebrow: "Личный кабинет гонщика",
    title: "Ваш профиль ASG Racing",
    loading: "Загружаем кабинет…",
    signedOut: "Войдите через Steam, чтобы открыть личный кабинет.",
    signIn: "Войти в личный кабинет",
    noProfile: "Профиль пилота ASG пока не найден.",
    number: "Гоночный номер",
    noNumber: "Номер не привязан",
    pending: number => `Заявка на номер #${number} ожидает модерации.`,
    profile: "Открыть профиль пилота",
    settings: "Настройки профиля",
    overview: "Обзор профиля",
    discord: "Discord",
    linked: "Привязан",
    notLinked: "Не привязан",
    numberSettings: "Настройки гоночного номера",
    numberHelp: "Выберите глобально уникальный номер от 1 до 999. Новое назначение подтверждается вручную.",
    numberLabel: "Новый номер (1–999)",
    submit: "Отправить заявку",
    cancel: "Отменить заявку",
    release: "Освободить текущий номер",
    releaseConfirm: "Сразу освободить текущий гоночный номер?",
    submitted: "Заявка отправлена на модерацию.",
    cancelled: "Заявка отменена.",
    released: "Номер освобождён.",
    blocked: "Управление номером недоступно во время бана.",
    cooldown: value => `Изменить номер можно после ${value}.`,
    taken: "Этот номер уже назначен или зарезервирован.",
    failed: "Не удалось выполнить операцию. Попробуйте ещё раз.",
    navSpecial: "Спецсобытие", navChampionship: "Чемпионат", navRules: "Правила",
    navNews: "Новости", navRacing: "Гонки", navLastRaces: "Последние гонки",
    navStats: "Статистика", navCars: "Машины", navFunStats: "Забавная статистика",
    navRating: "Рейтинг", navBestLaps: "Лучшие круги", navSafety: "Рейтинг безопасности",
    navBans: "Список банов", navCommunity: "Сообщество", navAbout: "О сервере",
    footerText: "Статистика формируется из файлов результатов ACC Dedicated Server и публикуется через GitHub Pages."
  }
};

function language() {
  let stored = "";
  try {
    stored = localStorage.getItem("asgLang") || "";
  } catch {
    stored = "";
  }
  return stored === "ru" ? "ru" : "en";
}

function t(key, value) {
  const entry = COPY[language()][key] ?? COPY.en[key] ?? key;
  return typeof entry === "function" ? entry(value) : entry;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function accountLoginUrl() {
  const returnPath = `${location.pathname}${location.search}`;
  return `${AUTH_BASE_URL}/v1/auth/steam/start?return_path=${encodeURIComponent(returnPath)}`;
}

let flashMessage = { text: "", kind: "" };

function setMessage(text = "", kind = "") {
  flashMessage = { text, kind };
  const element = document.getElementById("account-message");
  if (!element) return;
  element.textContent = text;
  element.dataset.kind = kind;
}

function numberBadge(preferences) {
  const number = preferences?.raceNumber;
  return `<span class="account-number${number ? "" : " account-number--empty"}">${number ? `#${number}` : t("noNumber")}</span>`;
}

function renderSignedOut(root) {
  root.innerHTML = `
    <div class="account-card-body">
      <p class="account-muted">${t("signedOut")}</p>
      <div class="account-actions">
        <a class="account-action account-action--primary" href="${accountLoginUrl()}">${t("signIn")}</a>
      </div>
    </div>`;
}

function renderOverview(root, auth) {
  const name = auth.driver?.displayName || auth.steam?.personaName || t("title");
  const avatar = auth.steam?.avatarUrl || "../social/asg.png";
  const pending = auth.preferences?.pendingRequest;
  root.innerHTML = `
    <div class="account-card-header">
      <img class="account-avatar" src="${escapeHtml(avatar)}" alt="" referrerpolicy="no-referrer">
      <div class="account-heading">
        <div class="account-eyebrow">${t("eyebrow")}</div>
        <h1 class="account-title">${escapeHtml(name)}</h1>
      </div>
      ${numberBadge(auth.preferences)}
    </div>
    <div class="account-card-body">
      ${auth.linked ? `
        <div class="account-grid">
          <div class="account-panel">
            <h2>${t("number")}</h2>
            <div class="account-status">${
              pending
                ? t("pending", pending.raceNumber)
                : auth.preferences?.raceNumber
                  ? `#${auth.preferences.raceNumber}`
                  : t("noNumber")
            }</div>
          </div>
          <div class="account-panel">
            <h2>${t("discord")}</h2>
            <div class="account-status">${auth.discord?.linked ? t("linked") : t("notLinked")}</div>
          </div>
        </div>
        <div class="account-actions">
          <a class="account-action account-action--primary" href="/account/settings/">${t("settings")}</a>
          <a class="account-action" href="${escapeHtml(auth.driver.profileUrl)}">${t("profile")}</a>
        </div>
      ` : `<p class="account-muted">${t("noProfile")}</p>`}
    </div>`;
}

function renderSettings(root, auth) {
  const preferences = auth.preferences || {};
  const pending = preferences.pendingRequest;
  const blocked = preferences.blockedReason === "driver_banned";
  root.innerHTML = `
    <div class="account-card-header">
      <div class="account-heading">
        <div class="account-eyebrow">${t("settings")}</div>
        <h1 class="account-title">${t("numberSettings")}</h1>
      </div>
      ${numberBadge(preferences)}
    </div>
    <div class="account-card-body">
      <p class="account-muted">${t("numberHelp")}</p>
      ${pending ? `<p class="account-status">${t("pending", pending.raceNumber)}</p>` : ""}
      ${blocked ? `<p class="account-message" data-kind="error">${t("blocked")}</p>` : ""}
      ${preferences.nextChangeAt ? `<p class="account-status">${t("cooldown", preferences.nextChangeAt)}</p>` : ""}
      <div class="account-field">
        <label for="race-number-input">${t("numberLabel")}</label>
        <input id="race-number-input" type="number" min="1" max="999" step="1" inputmode="numeric"
          ${blocked || pending || preferences.nextChangeAt ? "disabled" : ""}>
      </div>
      <div class="account-form-actions">
        <button class="account-action account-action--primary" id="race-number-submit"
          ${blocked || pending || preferences.nextChangeAt ? "disabled" : ""}>${t("submit")}</button>
        ${pending ? `<button class="account-action" id="race-number-cancel" ${blocked ? "disabled" : ""}>${t("cancel")}</button>` : ""}
        ${preferences.raceNumber ? `<button class="account-action account-action--danger" id="race-number-release" ${blocked || preferences.nextChangeAt ? "disabled" : ""}>${t("release")}</button>` : ""}
        <a class="account-action" href="/account/">${t("overview")}</a>
      </div>
      <div class="account-message" id="account-message" role="status" aria-live="polite"></div>
    </div>`;
  document.getElementById("race-number-submit")?.addEventListener("click", () => submitNumber(auth));
  document.getElementById("race-number-cancel")?.addEventListener("click", () => cancelRequest(auth));
  document.getElementById("race-number-release")?.addEventListener("click", () => releaseNumber(auth));
}

async function mutation(path, csrfToken, body) {
  const response = await fetch(`${AUTH_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.detail || `http_${response.status}`);
    error.code = payload?.detail;
    throw error;
  }
}

async function runAction(button, action, successText) {
  if (!button || button.disabled) return;
  button.disabled = true;
  setMessage("");
  try {
    await action();
    setMessage(successText, "success");
    await controller?.refresh({ showLoading: false });
  } catch (error) {
    setMessage(error?.code === "race_number_taken" ? t("taken") : t("failed"), "error");
    button.disabled = false;
  }
}

function submitNumber(auth) {
  const input = document.getElementById("race-number-input");
  const number = Number(input?.value);
  if (!Number.isInteger(number) || number < 1 || number > 999) {
    setMessage(t("failed"), "error");
    return;
  }
  const button = document.getElementById("race-number-submit");
  void runAction(
    button,
    () => mutation("/v1/me/race-number", auth.csrfToken, { race_number: number }),
    t("submitted")
  );
}

function cancelRequest(auth) {
  const button = document.getElementById("race-number-cancel");
  void runAction(
    button,
    () => mutation("/v1/me/race-number/cancel", auth.csrfToken),
    t("cancelled")
  );
}

function releaseNumber(auth) {
  if (!confirm(t("releaseConfirm"))) return;
  const button = document.getElementById("race-number-release");
  void runAction(
    button,
    () => mutation("/v1/me/race-number", auth.csrfToken, { race_number: null }),
    t("released")
  );
}

function render(auth) {
  const root = document.getElementById("account-content");
  if (!root) return;
  if (!auth?.authenticated) {
    renderSignedOut(root);
  } else if (document.body.dataset.accountPage === "settings") {
    if (!auth.linked) renderOverview(root, auth);
    else renderSettings(root, auth);
  } else {
    renderOverview(root, auth);
  }
  if (flashMessage.text) {
    setMessage(flashMessage.text, flashMessage.kind);
  }
}

document.querySelectorAll("[data-account-copy]").forEach(element => {
  element.textContent = t(element.dataset.accountCopy);
});

function closeNavigationGroups() {
  document.querySelectorAll(".top-nav-group.is-open").forEach(group => {
    group.classList.remove("is-open");
    group.querySelector(".top-nav-group-toggle")?.setAttribute("aria-expanded", "false");
    const menu = group.querySelector(".top-nav-group-menu");
    if (menu) menu.hidden = true;
  });
}

document.querySelectorAll(".top-nav-group").forEach(group => {
  const toggle = group.querySelector(".top-nav-group-toggle");
  const menu = group.querySelector(".top-nav-group-menu");
  toggle?.addEventListener("click", event => {
    event.stopPropagation();
    const open = !group.classList.contains("is-open");
    closeNavigationGroups();
    group.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (menu) menu.hidden = !open;
  });
});
document.addEventListener("click", event => {
  if (!event.target.closest(".top-nav-group")) closeNavigationGroups();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeNavigationGroups();
});

document.querySelectorAll(".lang-btn[data-lang]").forEach(button => {
  button.addEventListener("click", () => {
    try {
      localStorage.setItem("asgLang", button.dataset.lang);
    } catch {
      // The selected language remains valid for the current document.
    }
    location.reload();
  });
  button.classList.toggle("active", button.dataset.lang === language());
});

const controller = createAuthHeaderController({ onAuthChange: render });

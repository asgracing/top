import { createAuthHeaderController } from "../../features/auth/header-auth.js?v=20260828mod1";
import {
  createIdempotencyKey,
  normalizeModerationSearch,
  validateModerationDraft
} from "./moderation-model.js";

const AUTH_BASE_URL = "https://auth.asgracing.ru";
const COPY = {
  en: {
    eyebrow: "ADMIN TOOLS", title: "Bans & Strikes",
    intro: "Issue a ban or strike. Removing sanctions remains available only in the backend.",
    banTab: "Bans", strikeTab: "Strikes", pilot: "Pilot", searchPlaceholder: "Name or public profile ID",
    reason: "Reason", selectReason: "Select a reason", reasonDangerous: "Dangerous driving",
    reasonContact: "Intentional contact", reasonUnsporting: "Unsporting conduct", reasonAbusive: "Abusive behavior",
    reasonCheating: "Cheating", reasonRules: "Rule violation", reasonOther: "Other",
    comment: "Comment (at least 20 characters)", evidence: "Evidence URL (HTTPS, optional)",
    event: "Event reference (optional)", warning: "This action cannot be undone here. Verify the pilot and reason before submitting.",
    issueBan: "Issue ban", issueStrike: "Issue strike", checking: "Checking administrator access…",
    signIn: "Sign in with Steam to use moderation.", denied: "This Steam account does not have moderation permission.",
    unavailable: "Moderation is temporarily unavailable.", searching: "Searching…", noResults: "No pilots found.",
    searchHint: "Enter at least 2 characters.", selected: "Selected", protected: "Protected administrator",
    banned: "Banned", strikes: "Strikes", rank: "Rank", confirmBan: "Confirm ban for {name}?",
    confirmStrike: "Confirm strike for {name}?", queued: "Command queued. Waiting for the primary backend…",
    applied: "Action applied and entrylist updated.", rejected: "Action rejected: {code}",
    pending: "Command remains queued and will be retried safely.", target_required: "Select a pilot.",
    reason_required: "Select a reason.", comment_length: "Comment must contain 20–1000 characters.",
    evidence_url: "Evidence must be an absolute HTTPS URL without credentials or a fragment.",
    event_length: "Event reference is too long.", invalid_action: "Select an action.",
    submitFailed: "Could not queue the command. You may retry; the same operation key will be reused."
  },
  ru: {
    eyebrow: "ИНСТРУМЕНТЫ АДМИНИСТРАТОРА", title: "Баны и страйки",
    intro: "Здесь можно выдать бан или страйк. Снятие санкций пока доступно только через бэкенд.",
    banTab: "Баны", strikeTab: "Страйки", pilot: "Пилот", searchPlaceholder: "Имя или публичный ID профиля",
    reason: "Причина", selectReason: "Выберите причину", reasonDangerous: "Опасное вождение",
    reasonContact: "Намеренный контакт", reasonUnsporting: "Неспортивное поведение", reasonAbusive: "Оскорбительное поведение",
    reasonCheating: "Читерство", reasonRules: "Нарушение правил", reasonOther: "Другое",
    comment: "Комментарий (не менее 20 символов)", evidence: "Ссылка на доказательство (HTTPS, необязательно)",
    event: "Ссылка на событие (необязательно)", warning: "Это действие нельзя отменить здесь. Перед отправкой проверьте пилота и причину.",
    issueBan: "Выдать бан", issueStrike: "Выдать страйк", checking: "Проверяем права администратора…",
    signIn: "Войдите через Steam, чтобы использовать модерацию.", denied: "У этого Steam-аккаунта нет прав модератора.",
    unavailable: "Модерация временно недоступна.", searching: "Ищем…", noResults: "Пилоты не найдены.",
    searchHint: "Введите минимум 2 символа.", selected: "Выбран", protected: "Защищённый администратор",
    banned: "Забанен", strikes: "Страйки", rank: "Место", confirmBan: "Подтвердить бан для {name}?",
    confirmStrike: "Подтвердить страйк для {name}?", queued: "Команда поставлена в очередь. Ожидаем основной бэкенд…",
    applied: "Действие применено, entrylist обновлён.", rejected: "Действие отклонено: {code}",
    pending: "Команда остаётся в очереди и будет безопасно повторена.", target_required: "Выберите пилота.",
    reason_required: "Выберите причину.", comment_length: "Комментарий должен содержать 20–1000 символов.",
    evidence_url: "Нужна абсолютная HTTPS-ссылка без логина, пароля и фрагмента.",
    event_length: "Слишком длинная ссылка на событие.", invalid_action: "Выберите действие.",
    submitFailed: "Не удалось поставить команду в очередь. Повтор использует тот же ключ операции."
  }
};

let authState = null;
let selectedDriver = null;
let action = "ban.issue";
let retryIdempotencyKey = null;
let searchController = null;
let searchTimer = null;

function language() {
  try { return localStorage.getItem("asgLang") === "ru" ? "ru" : "en"; } catch { return "en"; }
}
function t(key) { return COPY[language()][key] || COPY.en[key] || key; }
function setMessage(value, kind = "") {
  const node = document.getElementById("moderation-message");
  if (!node) return;
  node.textContent = value;
  node.dataset.kind = kind;
}
function metric(value, digits = 0) { return value === null ? "—" : Number(value).toFixed(digits); }

async function api(path, options = {}) {
  const response = await fetch(`${AUTH_BASE_URL}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: { Accept: "application/json", ...(options.headers || {}) }
  });
  let payload = null;
  try { payload = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(String(payload?.detail || `http_${response.status}`));
    error.status = response.status;
    throw error;
  }
  return payload;
}

function applyCopy() {
  document.documentElement.lang = language();
  document.querySelectorAll("[data-copy]").forEach(node => { node.textContent = t(node.dataset.copy); });
  document.querySelectorAll("[data-copy-placeholder]").forEach(node => { node.placeholder = t(node.dataset.copyPlaceholder); });
  document.querySelectorAll(".lang-btn[data-lang]").forEach(button => {
    button.classList.toggle("active", button.dataset.lang === language());
    button.addEventListener("click", () => {
      try { localStorage.setItem("asgLang", button.dataset.lang); } catch {}
      location.reload();
    });
  });
}

function renderGate(auth) {
  const gate = document.getElementById("moderation-gate");
  const workspace = document.getElementById("moderation-workspace");
  authState = auth;
  if (!auth?.authenticated) {
    gate.textContent = t("signIn"); gate.hidden = false; workspace.hidden = true; return;
  }
  if (!auth.permissions?.moderationIssue) {
    gate.textContent = t("denied"); gate.hidden = false; workspace.hidden = true; return;
  }
  gate.hidden = true;
  workspace.hidden = false;
}

function makeBadge(value, danger = false) {
  const badge = document.createElement("span");
  badge.className = `moderation-badge${danger ? " moderation-badge--danger" : ""}`;
  badge.textContent = value;
  return badge;
}

function renderTarget() {
  const target = document.getElementById("moderation-target");
  if (!selectedDriver) { target.hidden = true; target.replaceChildren(); return; }
  target.hidden = false;
  const name = document.createElement("strong");
  name.textContent = `${t("selected")}: ${selectedDriver.displayName}`;
  const detail = document.createElement("div");
  detail.textContent = `${t("rank")} ${metric(selectedDriver.rank)} · ELO ${metric(selectedDriver.elo)} · SR ${metric(selectedDriver.sr, 2)} · ${t("strikes")} ${selectedDriver.activeStrikes}`;
  target.replaceChildren(name, detail);
  if (selectedDriver.protected) target.appendChild(makeBadge(t("protected"), true));
  if (selectedDriver.globalBanned || selectedDriver.manuallyBanned) target.appendChild(makeBadge(t("banned"), true));
}

function selectDriver(driver) {
  selectedDriver = driver;
  retryIdempotencyKey = null;
  document.getElementById("moderation-search").value = driver.displayName;
  document.getElementById("moderation-results").replaceChildren();
  renderTarget();
  setMessage(driver.protected ? t("protected") : "", driver.protected ? "error" : "");
}

function renderResults(drivers) {
  const root = document.getElementById("moderation-results");
  root.replaceChildren();
  if (!drivers.length) { root.textContent = t("noResults"); return; }
  drivers.forEach(driver => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "moderation-result"; button.setAttribute("role", "option");
    const copy = document.createElement("span");
    const name = document.createElement("strong"); name.textContent = driver.displayName;
    const details = document.createElement("small");
    details.textContent = `${t("rank")} ${metric(driver.rank)} · ELO ${metric(driver.elo)} · SR ${metric(driver.sr, 2)} · ${driver.publicId}`;
    copy.append(name, details);
    const badges = document.createElement("span"); badges.className = "moderation-badges";
    badges.appendChild(makeBadge(`${t("strikes")}: ${driver.activeStrikes}`));
    if (driver.globalBanned || driver.manuallyBanned) badges.appendChild(makeBadge(t("banned"), true));
    if (driver.protected) badges.appendChild(makeBadge(t("protected"), true));
    button.append(copy, badges); button.addEventListener("click", () => selectDriver(driver));
    root.appendChild(button);
  });
}

async function searchPilots() {
  const query = document.getElementById("moderation-search").value.trim();
  const root = document.getElementById("moderation-results");
  searchController?.abort();
  if (query.length < 2) { root.textContent = t("searchHint"); return; }
  searchController = new AbortController();
  root.textContent = t("searching");
  try {
    const payload = await api(`/v1/moderation/drivers?q=${encodeURIComponent(query)}`, { signal: searchController.signal });
    renderResults(normalizeModerationSearch(payload));
  } catch (error) {
    if (error.name !== "AbortError") root.textContent = t("unavailable");
  }
}

async function pollCommand(commandId) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const payload = await api(`/v1/moderation/commands/${encodeURIComponent(commandId)}`);
    const command = payload?.command;
    if (command?.status === "applied") { setMessage(t("applied"), "success"); return; }
    if (["rejected", "expired", "dead_letter"].includes(command?.status)) {
      setMessage(t("rejected").replace("{code}", command?.receipt?.code || command.status), "error"); return;
    }
  }
  setMessage(t("pending"));
}

async function submit(event) {
  event.preventDefault();
  const validation = validateModerationDraft({
    action, targetPublicId: selectedDriver?.publicId,
    reasonCode: document.getElementById("moderation-reason").value,
    comment: document.getElementById("moderation-comment").value,
    evidenceUrl: document.getElementById("moderation-evidence").value,
    eventReference: document.getElementById("moderation-event").value
  });
  if (!validation.ok) { setMessage(t(validation.code), "error"); return; }
  if (selectedDriver.protected) { setMessage(t("protected"), "error"); return; }
  const confirmation = t(action === "ban.issue" ? "confirmBan" : "confirmStrike").replace("{name}", selectedDriver.displayName);
  if (!confirm(confirmation)) return;
  const button = document.getElementById("moderation-submit");
  button.disabled = true;
  retryIdempotencyKey ||= createIdempotencyKey();
  setMessage(t("queued"));
  try {
    const payload = await api("/v1/moderation/commands", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": authState.csrfToken },
      body: JSON.stringify({ ...validation.value, idempotency_key: retryIdempotencyKey })
    });
    retryIdempotencyKey = null;
    await pollCommand(payload.command.command_id);
  } catch (error) {
    if (error.message === "recent_auth_required") {
      location.assign(`${AUTH_BASE_URL}/v1/auth/steam/start?return_path=${encodeURIComponent("/moderation/")}`);
      return;
    }
    setMessage(error.message && !error.message.startsWith("http_") ? `${t("rejected").replace("{code}", error.message)}` : t("submitFailed"), "error");
  } finally { button.disabled = false; }
}

applyCopy();
document.getElementById("moderation-gate").textContent = t("checking");
document.querySelectorAll("[data-action]").forEach(tab => tab.addEventListener("click", () => {
  action = tab.dataset.action;
  retryIdempotencyKey = null;
  document.querySelectorAll("[data-action]").forEach(item => item.setAttribute("aria-selected", String(item === tab)));
  const submitButton = document.getElementById("moderation-submit");
  submitButton.dataset.copy = action === "ban.issue" ? "issueBan" : "issueStrike";
  submitButton.textContent = t(submitButton.dataset.copy);
}));
document.getElementById("moderation-search").addEventListener("input", () => {
  selectedDriver = null; retryIdempotencyKey = null; renderTarget();
  clearTimeout(searchTimer); searchTimer = setTimeout(() => void searchPilots(), 250);
});
document.getElementById("moderation-form").addEventListener("submit", event => void submit(event));
createAuthHeaderController({ onAuthChange: renderGate });

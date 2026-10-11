import { createHttpClient } from "../../shared/http-client.js";

const TYPES = new Set(["strike.issued", "strike.revoked", "ban.issued", "ban.revoked", "race_number.approved", "race_number.rejected", "invitation.club", "invitation.team"]);
const COPY = {
  ru: {
    title: "Уведомления", personal: "Личные", news: "Новости", close: "Закрыть", empty: "Личных уведомлений пока нет.",
    failed: "Не удалось загрузить уведомления.", retry: "Повторить", loading: "Загрузка…", more: "Показать ещё",
    readAll: "Прочитать все", read: "Прочитано", unread: "Непрочитанное", open: "Открыть", readOne: "Прочитать",
    unlinked: "Уведомления появятся после привязки Steam к профилю пилота.", inactive: "Приглашение уже недоступно",
    expires: "Действует до", sender: "Пригласил", strikes: "Активных страйков", number: "Номер", details: "Подробнее",
    "strike.issued": "Вам выдан страйк", "strike.revoked": "Ваш страйк снят", "ban.issued": "Вам выдан бан", "ban.revoked": "Ваш бан снят",
    "race_number.approved": "Ваш гоночный номер одобрен", "race_number.rejected": "Заявка на номер отклонена",
    "invitation.club": "Приглашение в клуб", "invitation.team": "Приглашение в команду",
    rule_violation: "Нарушение правил", unsportsmanlike: "Неспортивное поведение", intentional_crash: "Преднамеренное столкновение",
    dangerous_driving: "Опасное вождение", disrespect: "Неуважительное поведение", strike_limit: "Три активных страйка",
    intentional_contact: "Намеренный контакт", unsporting_conduct: "Неспортивное поведение", abusive_behavior: "Оскорбительное поведение", cheating: "Читерство", other: "Другое",
  },
  en: {
    title: "Notifications", personal: "Personal", news: "News", close: "Close", empty: "No personal notifications yet.",
    failed: "Notifications could not be loaded.", retry: "Retry", loading: "Loading…", more: "Load more",
    readAll: "Mark all as read", read: "Read", unread: "Unread", open: "Open", readOne: "Mark as read",
    unlinked: "Notifications become available when Steam is linked to a driver profile.", inactive: "This invitation is no longer available",
    expires: "Available until", sender: "Invited by", strikes: "Active strikes", number: "Number", details: "Details",
    "strike.issued": "You received a strike", "strike.revoked": "Your strike was removed", "ban.issued": "You were banned", "ban.revoked": "Your ban was removed",
    "race_number.approved": "Your race number was approved", "race_number.rejected": "Your number request was rejected",
    "invitation.club": "Club invitation", "invitation.team": "Team invitation",
    rule_violation: "Rule violation", unsportsmanlike: "Unsportsmanlike conduct", intentional_crash: "Intentional collision",
    dangerous_driving: "Dangerous driving", disrespect: "Disrespectful conduct", strike_limit: "Three active strikes",
    intentional_contact: "Intentional contact", unsporting_conduct: "Unsportsmanlike conduct", abusive_behavior: "Abusive behaviour", cheating: "Cheating", other: "Other",
  },
};
const clean = value => typeof value === "string" ? value.slice(0, 2000) : "";
const publicId = value => /^drv_[a-zA-Z0-9_]+$/.test(String(value || "")) ? String(value) : "";
export function normalizeNotifications(raw) {
  const items = (Array.isArray(raw?.items) ? raw.items : []).filter(item => Number.isSafeInteger(item?.id) && item.id > 0 && TYPES.has(item.event_type)).map(item => {
    const d = item.details || {};
    return { id: item.id, type: item.event_type, at: clean(item.occurred_at), read: item.read === true, actionable: item.actionable === true,
      details: { reason: clean(d.reason), reasonCode: clean(d.reason_code), comment: clean(d.comment), removalComment: clean(d.removal_comment),
        strikes: Number.isInteger(d.active_strikes) ? d.active_strikes : null, number: Number.isInteger(d.number) && d.number > 0 && d.number <= 999 ? d.number : null,
        name: clean(d.target_display_name), sender: clean(d.sender_display_name), senderId: publicId(d.initiated_by_public_id), expires: clean(d.expires_at) } };
  });
  return { items, linked: raw?.linked === true, unread: Math.max(0, Number.isSafeInteger(raw?.unread_count) ? raw.unread_count : 0), latest: Number.isSafeInteger(raw?.latest_id) ? raw.latest_id : 0,
    next: Number.isSafeInteger(raw?.next_before) && raw.next_before > 0 ? raw.next_before : null };
}

export function notificationTarget(item, driverId, lang = "ru") {
  if (item.type.startsWith("strike.") || item.type.startsWith("ban.")) return `/${lang}/driver/?id=${encodeURIComponent(publicId(driverId))}`;
  return "/account/";
}

export function createPersonalNotifications({ documentRef, windowRef, fetchImpl, authBaseUrl, buttonRef = null, newsProvider = null }) {
  if (!documentRef.querySelector("link[data-personal-notifications-style]")) {
    const style = documentRef.createElement("link"); style.rel = "stylesheet";
    style.href = new URL("../../../styles/components/personal-notifications.css?v=20261011notifications1", import.meta.url).href;
    style.dataset.personalNotificationsStyle = "true"; documentRef.head.append(style);
  }
  const client = createHttpClient({ fetchImpl, defaultTimeoutMs: 8000 });
  const element = (tag, cls, text = "") => { const node = documentRef.createElement(tag); node.className = cls; node.textContent = text; return node; };
  const language = () => documentRef.documentElement.lang?.startsWith("en") ? "en" : "ru";
  const t = key => COPY[language()][key] || key;
  const date = value => { const d = new Date(value); return Number.isFinite(d.getTime()) ? d.toLocaleString(language() === "ru" ? "ru-RU" : "en-GB", { timeZone: "Europe/Moscow", dateStyle: "medium", timeStyle: "short" }) + (language() === "ru" ? " МСК" : " MSK") : ""; };
  let auth = null, owner = "", controller = null, generation = 0, destroyed = false, busy = false, status = "loading";
  let data = normalizeNotifications(null), tab = "personal";
  const button = buttonRef || element("button", "personal-notifications-bell"); button.type = "button";
  button.classList.add("personal-notifications-bell");
  button.setAttribute("aria-haspopup", "dialog");
  const icon = element("span", "personal-notifications-icon");
  icon.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg>';
  const badge = button.querySelector(".v2-notification-count") || element("span", "personal-notifications-count");
  badge.classList.add("personal-notifications-count");
  if (!buttonRef) button.append(icon, badge);
  const dialog = element("dialog", "personal-notifications-dialog");
  dialog.setAttribute("aria-label", t("title"));
  documentRef.body.append(dialog);
  function close() { if (dialog.open) dialog.close(); button.setAttribute("aria-expanded", "false"); }
  const profileLink = id => `/${language()}/driver/?id=${encodeURIComponent(id)}`;
  function render() {
    const news = newsProvider?.(), count = data.unread + (news?.unread || 0);
    button.setAttribute("aria-label", `${t("title")}: ${count}`);
    button.title = t("title"); badge.textContent = count > 99 ? "99+" : String(count); badge.hidden = count === 0;
    if (!dialog.open) return;
    const focusKey = documentRef.activeElement?.dataset?.notificationFocus;
    const scroll = dialog.scrollTop;
    dialog.setAttribute("aria-label", t("title"));
    const heading = element("div", "personal-notifications-heading");
    const title = element("h2", "", t("title"));
    const closeButton = element("button", "personal-notifications-close", "×"); closeButton.type = "button";
    closeButton.setAttribute("aria-label", t("close")); closeButton.dataset.notificationFocus = "close"; closeButton.addEventListener("click", close);
    heading.append(title, closeButton);
    const tools = element("div", "personal-notifications-tools");
    const tabs = element("div", "personal-notifications-tabs");
    for (const key of news ? ["personal", "news"] : ["personal"]) {
      const choice = element("button", "personal-notifications-text-button", t(key)); choice.type = "button";
      choice.setAttribute("aria-pressed", String(tab === key)); choice.addEventListener("click", () => { tab = key; render(); }); tabs.append(choice);
    }
    tools.append(tabs);
    if ((tab === "personal" && data.unread && data.linked) || (tab === "news" && news?.unread)) {
      const readAll = element("button", "personal-notifications-text-button", t("readAll")); readAll.type = "button"; readAll.disabled = busy;
      readAll.dataset.notificationFocus = "all"; readAll.addEventListener("click", () => { if (tab === "personal") void mark({ all_before: data.latest }); else { news.markAll(); render(); } }); tools.append(readAll);
    }
    const list = element("div", "personal-notifications-list");
    if (tab === "news") {
      for (const item of news?.items || []) {
        if (!item.href?.startsWith("/") || item.href.startsWith("//")) continue;
        const card = element("article", `personal-notification${item.read ? "" : " is-unread"}`);
        const link = element("a", "personal-notifications-text-button", item.title); link.href = item.href;
        link.addEventListener("click", () => item.mark());
        card.append(link, element("p", "personal-notification-time", date(item.at)), element("p", "", item.summary)); list.append(card);
      }
      if (!list.childNodes.length) list.append(element("p", "personal-notifications-status", language() === "ru" ? "Новостей пока нет." : "No news yet."));
      dialog.replaceChildren(heading, tools, list); return;
    }
    if (status === "loading" && !data.items.length) list.append(element("p", "personal-notifications-status", t("loading")));
    else if (!data.linked && status !== "error") list.append(element("p", "personal-notifications-status", t("unlinked")));
    else if (!data.items.length && status !== "error") list.append(element("p", "personal-notifications-status", t("empty")));
    for (const item of data.items) {
      const card = element("article", `personal-notification${item.read ? "" : " is-unread"}`);
      const row = element("div", "personal-notification-row"); row.append(element("h3", "", t(item.type)), element("span", "personal-notification-read", t(item.read ? "read" : "unread")));
      const time = element("time", "personal-notification-time", date(item.at)); time.dateTime = item.at;
      card.append(row, time);
      const d = item.details;
      if (d.name) card.append(element("p", "", d.name));
      if (d.number !== null) card.append(element("p", "", `${t("number")} #${d.number}`));
      if (d.reasonCode) card.append(element("p", "personal-notification-reason", t(d.reasonCode)));
      const reason = d.removalComment || d.comment || d.reason;
      if (reason) card.append(element("p", "personal-notification-reason", reason));
      if (d.strikes !== null) card.append(element("p", "", `${t("strikes")}: ${d.strikes}`));
      if (d.senderId) { const sender = element("a", "personal-notification-sender", `${t("sender")}: ${d.sender || d.senderId}`); sender.href = profileLink(d.senderId); card.append(sender); }
      if (d.expires) card.append(element("p", "personal-notification-time", `${t("expires")}: ${date(d.expires)}`));
      if (item.type.startsWith("invitation.") && !item.actionable) card.append(element("p", "personal-notification-inactive", t("inactive")));
      const actions = element("div", "personal-notification-actions");
      const readButton = element("button", "personal-notifications-text-button", t("readOne")); readButton.type = "button"; readButton.disabled = busy;
      readButton.dataset.notificationFocus = `read-${item.id}`;
      readButton.addEventListener("click", () => {
        if (!item.read) void mark({ ids: [item.id] });
      });
      if (!item.read) actions.append(readButton);
      if (!item.type.startsWith("invitation.") || item.actionable) {
        const link = element("a", "personal-notifications-text-button", t("open")); link.href = notificationTarget(item, owner, language());
        link.addEventListener("click", event => { if (!item.read && !event.ctrlKey && !event.metaKey && event.button === 0) { event.preventDefault(); void mark({ ids: [item.id] }).then(ok => { if (ok) windowRef.location.assign(link.href); }); } });
        actions.append(link);
      }
      card.append(actions); list.append(card);
    }
    if (status === "error") {
      const notice = element("p", "personal-notifications-status", t("failed")); notice.setAttribute("role", "status");
      const retry = element("button", "personal-notifications-text-button", t("retry")); retry.type = "button"; retry.addEventListener("click", () => void refresh());
      list.append(notice, retry);
    }
    if (data.next) { const more = element("button", "personal-notifications-more", t("more")); more.type = "button"; more.disabled = busy; more.addEventListener("click", () => void refresh(data.next)); list.append(more); }
    dialog.replaceChildren(heading, tools, list); dialog.scrollTop = scroll;
    if (focusKey) dialog.querySelector(`[data-notification-focus="${focusKey}"]`)?.focus();
  }
  async function refresh(before = null) {
    if (!auth?.authenticated || destroyed || busy) return;
    const current = generation; controller?.abort(); controller = new AbortController();
    try {
      const raw = await client.requestJson(`${authBaseUrl}/v1/me/notifications${before ? `?before=${before}` : ""}`, { credentials: "include", cache: "no-store", headers: { Accept: "application/json" }, signal: controller.signal });
      if (current !== generation || destroyed) return;
      const next = normalizeNotifications(raw);
      if (before) next.items = [...data.items, ...next.items].filter((item, index, items) => items.findIndex(other => other.id === item.id) === index);
      data = next; status = "ready"; render();
    } catch (error) { if (current === generation && !destroyed && error.name !== "AbortError") { if (error.status === 401) data = normalizeNotifications(null); status = "error"; render(); } }
  }
  async function mark(selection) {
    if (busy || !auth?.csrfToken || destroyed) return false;
    busy = true; controller?.abort(); const current = generation; render();
    try {
      const raw = await client.requestJson(`${authBaseUrl}/v1/me/notifications/read`, { method: "POST", credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json", "X-CSRF-Token": auth.csrfToken }, body: JSON.stringify(selection) });
      if (current !== generation || destroyed) return false;
      data = normalizeNotifications(raw); status = "ready"; return true;
    } catch (error) { if (current === generation) { if (error.status === 401) data = normalizeNotifications(null); status = "error"; } return false; }
    finally { if (current === generation) { busy = false; render(); } }
  }
  const click = event => { if (!auth?.authenticated) return; event.stopImmediatePropagation(); event.preventDefault(); if (dialog.open) close(); else { documentRef.querySelector('#notification-popover:popover-open')?.hidePopover(); documentRef.querySelector('#profile-popover:popover-open')?.hidePopover(); dialog.showModal(); button.setAttribute("aria-expanded", "true"); render(); void refresh(); } };
  button.addEventListener("click", click, true);
  dialog.addEventListener("click", event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); } });
  dialog.addEventListener("close", () => { button.setAttribute("aria-expanded", "false"); button.focus(); });
  const visibility = () => { if (documentRef.visibilityState === "visible") void refresh(); };
  documentRef.addEventListener("visibilitychange", visibility);
  const timer = windowRef.setInterval?.(() => { if (documentRef.visibilityState !== "hidden") void refresh(); }, 60000);
  return {
    update(nextAuth, host) {
      const nextOwner = nextAuth?.authenticated ? nextAuth.driver?.publicId || "unlinked" : "";
      if (nextOwner !== owner) { generation++; controller?.abort(); close(); dialog.replaceChildren(); data = normalizeNotifications(null); status = "loading"; busy = false; owner = nextOwner; auth = nextAuth; if (nextOwner) void refresh(); }
      auth = nextAuth;
      if (!buttonRef) { if (nextAuth?.authenticated) host.append(button); else button.remove(); }
      render();
    },
    destroy() { destroyed = true; generation++; controller?.abort(); windowRef.clearInterval?.(timer); documentRef.removeEventListener("visibilitychange", visibility); button.removeEventListener("click", click, true); close(); dialog.remove(); if (!buttonRef) button.remove(); },
  };
}

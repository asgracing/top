const COPY = {
  ru: {
    title: "Заявки на гоночные номера", refresh: "Обновить заявки",
    hint: "Подтвердите номер или отклоните заявку с указанием причины. Подтверждённый номер поступит на основной сервер при следующей синхронизации.",
    loading: "Загружаем заявки…", empty: "Нет заявок на подтверждение.",
    approve: "Подтвердить", current: "Текущий номер", blocked: "Пилот не допущен",
    confirm: "Подтвердить номер #{number} для {name}?", approved: "Номер подтверждён.",
    reject: "Отклонить", reason: "Причина отказа (3–100 символов)",
    cancel: "Отмена", rejectSubmit: "Отклонить заявку", rejected: "Заявка отклонена.",
    confirmReject: "Отклонить заявку на номер #{number} от {name}? Причина: {reason}",
    invalidReason: "Укажите причину отказа: от 3 до 100 символов, одной строкой.",
    failed: "Не удалось выполнить действие. Обновите заявки и повторите.",
    stale: "Заявка уже обработана или отменена. Обновите список.",
    taken: "Номер уже занят. Обновите список.",
    recent: "Для обработки заявки снова войдите через Steam."
  },
  en: {
    title: "Race number requests", refresh: "Refresh requests",
    hint: "Approve a number or reject the request with a reason. Approved numbers reach the main server on the next sync.",
    loading: "Loading requests…", empty: "No requests awaiting approval.",
    approve: "Approve", current: "Current number", blocked: "Driver is not eligible",
    confirm: "Approve #{number} for {name}?", approved: "Number approved.",
    reject: "Reject", reason: "Reason for rejection (3–100 characters)",
    cancel: "Cancel", rejectSubmit: "Reject request", rejected: "Request rejected.",
    confirmReject: "Reject the request for #{number} from {name}? Reason: {reason}",
    invalidReason: "Enter a reason: 3–100 characters on a single line.",
    failed: "The action failed. Refresh requests and try again.",
    stale: "This request was already processed or cancelled. Refresh the list.",
    taken: "This number is already taken. Refresh the list.",
    recent: "Sign in with Steam again to review requests."
  }
};

export function createRaceNumberReview({ api, language, getAuth, authBaseUrl, confirmAction = message => window.confirm(message) }) {
  const list = document.getElementById("race-number-review-list");
  const message = document.getElementById("race-number-review-message");
  const refresh = document.getElementById("race-number-review-refresh");
  const t = key => COPY[language()]?.[key] || COPY.en[key];
  let busy = false;
  let loaded = false;
  let generation = 0;
  function status(text, kind = "") {
    message.textContent = text;
    message.dataset.kind = kind;
  }
  function setBusy(value) {
    busy = value;
    refresh.disabled = value;
    for (const control of list.querySelectorAll("button, input")) {
      control.disabled = value || control.dataset.ineligible === "true";
    }
  }
  function render(entries) {
    list.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.textContent = t("empty");
      list.append(empty);
    }
    for (const entry of entries) {
      const row = document.createElement("div");
      row.className = "moderation-number-request";
      const detail = document.createElement("div");
      detail.className = "moderation-number-detail";
      const name = document.createElement("strong");
      name.textContent = `${entry.display_name} · #${entry.requested_number}`;
      const info = document.createElement("small");
      info.textContent = `${entry.public_id} · ${t("current")}: ${entry.current_race_number ? `#${entry.current_race_number}` : "—"}`;
      detail.append(name, info);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "moderation-submit";
      button.textContent = entry.eligible ? t("approve") : t("blocked");
      button.dataset.ineligible = String(!entry.eligible);
      button.disabled = !entry.eligible;
      button.addEventListener("click", () => void decide(entry, row, "approve"));
      const actions = document.createElement("div");
      actions.className = "moderation-number-actions";
      const reject = document.createElement("button");
      reject.type = "button";
      reject.className = "moderation-submit moderation-number-reject";
      reject.textContent = t("reject");
      const form = document.createElement("form");
      form.className = "moderation-number-rejection";
      form.hidden = true;
      const label = document.createElement("label");
      label.className = "moderation-field";
      const caption = document.createElement("span");
      caption.textContent = t("reason");
      const input = document.createElement("input");
      input.type = "text";
      input.required = true;
      input.minLength = 3;
      input.maxLength = 100;
      label.append(caption, input);
      const submit = document.createElement("button");
      submit.type = "submit";
      submit.className = "moderation-submit moderation-number-reject";
      submit.textContent = t("rejectSubmit");
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "moderation-submit moderation-number-cancel";
      cancel.textContent = t("cancel");
      cancel.addEventListener("click", () => {
        form.hidden = true;
        reject.setAttribute("aria-expanded", "false");
        reject.focus();
      });
      reject.setAttribute("aria-expanded", "false");
      reject.addEventListener("click", () => {
        form.hidden = false;
        reject.setAttribute("aria-expanded", "true");
        input.focus();
      });
      const formActions = document.createElement("div");
      formActions.className = "moderation-number-actions";
      formActions.append(submit, cancel);
      form.append(label, formActions);
      form.addEventListener("submit", event => {
        event.preventDefault();
        void decide(entry, row, "reject", input.value.trim());
      });
      actions.append(button, reject);
      row.append(detail, actions, form);
      list.append(row);
    }
  }
  async function load() {
    if (busy || !getAuth()?.permissions?.moderationIssue) return;
    setBusy(true);
    const current = generation;
    status(t("loading"));
    try {
      const payload = await api("/v1/moderation/race-number-requests");
      if (current !== generation) return;
      render(payload.requests);
      loaded = true;
      status("");
    } catch {
      if (current === generation) status(t("failed"), "error");
    } finally {
      setBusy(false);
      if (current !== generation && getAuth()?.authenticated && getAuth()?.permissions?.moderationIssue) void load();
    }
  }
  async function decide(entry, row, decision, reason = "") {
    if (busy || !getAuth()?.permissions?.moderationIssue) return;
    if (decision === "approve" && !entry.eligible) return;
    if (decision === "reject" && (reason.length < 3 || reason.length > 100 || /[\u0000-\u001f]/u.test(reason))) {
      status(t("invalidReason"), "error");
      return;
    }
    const current = generation;
    const auth = getAuth();
    setBusy(true);
    try {
      const confirmation = t(decision === "reject" ? "confirmReject" : "confirm")
        .replace("{number}", () => entry.requested_number).replace("{name}", () => entry.display_name).replace("{reason}", () => reason);
      if (!await confirmAction(confirmation)) return;
      if (current !== generation || auth !== getAuth() || !auth?.authenticated || !auth?.permissions?.moderationIssue || !auth?.csrfToken) return;
      await api(`/v1/moderation/race-number-requests/${encodeURIComponent(entry.request_id)}/${decision}`, {
        method: "POST", headers: { "X-CSRF-Token": auth.csrfToken,
          ...(decision === "reject" ? { "Content-Type": "application/json" } : {}) },
        ...(decision === "reject" ? { body: JSON.stringify({ reason }) } : {})
      });
      if (current !== generation) return;
      row.remove();
      if (!list.children.length) render([]);
      status(t(decision === "reject" ? "rejected" : "approved"), "success");
    } catch (error) {
      if (current !== generation) return;
      const key = { request_not_pending: "stale", race_number_taken: "taken", driver_banned: "blocked", recent_authentication_required: "recent", invalid_rejection_reason: "invalidReason" }[error.message] || "failed";
      status(t(key), "error");
      if (key === "recent") {
        const link = document.createElement("a");
        link.href = `${authBaseUrl}/v1/auth/steam/start?return_path=%2Fmoderation%2F`;
        link.textContent = "Steam";
        message.append(" ", link);
      }
    } finally {
      setBusy(false);
      if (current !== generation && getAuth()?.authenticated && getAuth()?.permissions?.moderationIssue) void load();
    }
  }
  refresh.addEventListener("click", () => void load());
  document.getElementById("race-number-review-title").textContent = t("title");
  document.getElementById("race-number-review-hint").textContent = t("hint");
  refresh.textContent = t("refresh");
  return {
    update(auth) {
      if (!auth?.authenticated || !auth.permissions?.moderationIssue) {
        generation += 1;
        list.replaceChildren();
        status("");
        loaded = false;
      } else if (!loaded) void load();
    }
  };
}

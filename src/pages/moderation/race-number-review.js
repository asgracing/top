const COPY = {
  ru: {
    title: "Подтверждение гоночных номеров", refresh: "Обновить заявки",
    hint: "Подтвердите номер, запрошенный пилотом. Основной сервер получит его при следующей синхронизации.",
    loading: "Загружаем заявки…", empty: "Нет заявок на подтверждение.",
    approve: "Подтвердить", current: "Текущий номер", blocked: "Пилот не допущен",
    confirm: "Подтвердить номер #{number} для {name}?", approved: "Номер подтверждён.",
    failed: "Не удалось выполнить действие. Обновите заявки и повторите.",
    stale: "Заявка уже обработана или отменена. Обновите список.",
    taken: "Номер уже занят. Обновите список.",
    recent: "Для подтверждения снова войдите через Steam."
  },
  en: {
    title: "Race number approval", refresh: "Refresh requests",
    hint: "Approve the number requested by a driver. The main server will receive it on the next sync.",
    loading: "Loading requests…", empty: "No requests awaiting approval.",
    approve: "Approve", current: "Current number", blocked: "Driver is not eligible",
    confirm: "Approve #{number} for {name}?", approved: "Number approved.",
    failed: "The action failed. Refresh requests and try again.",
    stale: "This request was already processed or cancelled. Refresh the list.",
    taken: "This number is already taken. Refresh the list.",
    recent: "Sign in with Steam again to approve numbers."
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
      const name = document.createElement("strong");
      name.textContent = `${entry.display_name} · #${entry.requested_number}`;
      const info = document.createElement("small");
      info.textContent = `${entry.public_id} · ${t("current")}: ${entry.current_race_number ? `#${entry.current_race_number}` : "—"}`;
      detail.append(name, info);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "moderation-submit";
      button.textContent = entry.eligible ? t("approve") : t("blocked");
      button.disabled = !entry.eligible;
      button.addEventListener("click", () => void approve(entry, button));
      row.append(detail, button);
      list.append(row);
    }
  }
  async function load() {
    if (busy || !getAuth()?.permissions?.moderationIssue) return;
    busy = true;
    refresh.disabled = true;
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
      busy = false;
      refresh.disabled = false;
    }
  }
  async function approve(entry, button) {
    if (busy || !getAuth()?.permissions?.moderationIssue) return;
    if (!await confirmAction(t("confirm").replace("{number}", entry.requested_number).replace("{name}", entry.display_name))) return;
    if (!getAuth()?.authenticated || !getAuth()?.permissions?.moderationIssue || !getAuth()?.csrfToken) return;
    busy = true;
    button.disabled = true;
    refresh.disabled = true;
    const current = generation;
    try {
      await api(`/v1/moderation/race-number-requests/${encodeURIComponent(entry.request_id)}/approve`, {
        method: "POST", headers: { "X-CSRF-Token": getAuth().csrfToken }
      });
      if (current !== generation) return;
      button.closest(".moderation-number-request").remove();
      if (!list.children.length) render([]);
      status(t("approved"), "success");
    } catch (error) {
      if (current !== generation) return;
      const key = { request_not_pending: "stale", race_number_taken: "taken", driver_banned: "blocked", recent_authentication_required: "recent" }[error.message] || "failed";
      status(t(key), "error");
      if (key === "recent") {
        const link = document.createElement("a");
        link.href = `${authBaseUrl}/v1/auth/steam/start?return_path=%2Fmoderation%2F`;
        link.textContent = "Steam";
        message.append(" ", link);
      }
      button.disabled = false;
    } finally {
      busy = false;
      refresh.disabled = false;
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

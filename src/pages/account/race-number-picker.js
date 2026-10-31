const COPY = {
  ru: { title: "Выбор номера", free: "Свободные", occupied: "Занятые", all: "Все", assigned: "Занят", pending: "Заявка", own: "Ваш номер", ownPending: "Ваша заявка", search: "Поиск по цифрам номера", refresh: "Обновить", loading: "Загружаем номера…", failed: "Не удалось проверить свободные номера. Повторите загрузку или введите номер вручную.", empty: "Подходящих номеров нет.", more: "Показать ещё", selected: n => `Выбран номер #${n}. Отправьте заявку для подтверждения.`, counts: (free, occupied) => `Свободно: ${free} · Занято и на рассмотрении: ${occupied}`, help: "Нажмите на свободный номер, чтобы выбрать его. Номера с пометкой «Заявка» уже ожидают подтверждения. Доступность окончательно проверяется при отправке заявки." },
  en: { title: "Choose a number", free: "Free", occupied: "Occupied", all: "All", assigned: "Assigned", pending: "Requested", own: "Your number", ownPending: "Your request", search: "Search number digits", refresh: "Refresh", loading: "Loading numbers…", failed: "Number availability could not be checked. Retry or enter a number manually.", empty: "No matching numbers.", more: "Show more", selected: n => `Number #${n} selected. Submit a request to confirm it.`, counts: (free, occupied) => `Free: ${free} · Assigned or requested: ${occupied}`, help: "Click a free number to select it. Requested numbers are awaiting approval. Availability is checked again when you submit your request." }
};

export function normalizeAvailability(raw) {
  if (raw?.min !== 1 || raw?.max !== 999 || !Array.isArray(raw.assigned) || !Array.isArray(raw.pending)) throw new Error("Invalid number availability");
  const valid = n => Number.isInteger(n) && n >= 1 && n <= 999;
  if (!raw.assigned.every(valid) || !raw.pending.every(valid)) throw new Error("Invalid number availability");
  return { assigned: new Set(raw.assigned), pending: new Set(raw.pending) };
}

export function mountRaceNumberPicker({ host, input, message, authBaseUrl, preferences, language = "ru", fetchImpl = fetch }) {
  const copy = COPY[language] || COPY.ru;
  const doc = host.ownerDocument;
  if (!doc.querySelector("link[data-race-number-picker-style]")) {
    const style = doc.createElement("link"); style.rel = "stylesheet";
    style.href = "/styles/components/race-number-picker.css?v=20261031retention1";
    style.dataset.raceNumberPickerStyle = "true"; doc.head.append(style);
  }
  const node = (tag, text, className = "") => { const el = doc.createElement(tag); el.textContent = text; el.className = className; return el; };
  const heading = node("h3", copy.title);
  const help = node("p", copy.help, "account-muted");
  const tools = node("div", "", "race-number-picker-tools");
  const search = node("input", ""); search.type = "search"; search.inputMode = "numeric"; search.maxLength = 3;
  search.placeholder = copy.search; search.setAttribute("aria-label", copy.search);
  const refresh = node("button", copy.refresh, "account-action"); refresh.type = "button";
  tools.append(search, refresh);
  const filters = node("div", "", "race-number-picker-filters"); filters.setAttribute("role", "group"); filters.setAttribute("aria-label", copy.title);
  const summary = node("p", "", "account-muted"); summary.setAttribute("role", "status");
  const grid = node("div", "", "race-number-picker-grid");
  const more = node("button", copy.more, "account-action"); more.type = "button";
  host.replaceChildren(heading, help, tools, filters, summary, grid, more);
  let data = null, filter = "free", limit = 100, generation = 0;
  const filterButtons = ["free", "occupied", "all"].map(key => {
    const button = node("button", copy[key], "account-action"); button.type = "button"; button.dataset.numberFilter = key;
    button.addEventListener("click", () => { filter = key; limit = 100; render(); }); filters.append(button); return button;
  });
  function status(number) {
    if (number === preferences.raceNumber) return "own";
    if (number === preferences.pendingRequest?.raceNumber) return "ownPending";
    return data.assigned.has(number) ? "assigned" : data.pending.has(number) ? "pending" : "free";
  }
  function render() {
    for (const button of filterButtons) button.setAttribute("aria-pressed", String(button.dataset.numberFilter === filter));
    grid.replaceChildren(); more.hidden = true;
    if (!data) return;
    const occupied = new Set([...data.assigned, ...data.pending]);
    summary.textContent = copy.counts(999 - occupied.size, occupied.size);
    const numbers = Array.from({ length: 999 }, (_, i) => i + 1).filter(number => {
      const state = status(number);
      return (filter === "all" || (filter === "free" ? state === "free" : state !== "free")) && String(number).includes(search.value.trim());
    });
    for (const number of numbers.slice(0, limit)) {
      const state = status(number), button = node("button", "", "race-number-choice"); button.type = "button";
      button.dataset.number = String(number); button.dataset.numberStatus = state;
      button.setAttribute("aria-label", `#${number} — ${copy[state]}`);
      button.setAttribute("aria-pressed", String(Number(input.value) === number));
      button.disabled = state !== "free" || input.disabled;
      button.append(node("span", `#${number}`), node("small", copy[state]));
      button.addEventListener("click", () => {
        input.value = String(number); input.dispatchEvent(new Event("input", { bubbles: true }));
        message.textContent = copy.selected(number); message.dataset.kind = "info"; render(); input.focus();
      });
      grid.append(button);
    }
    if (!numbers.length) grid.append(node("p", copy.empty, "account-muted"));
    more.hidden = numbers.length <= limit;
  }
  async function load() {
    const current = ++generation;
    refresh.disabled = true; summary.textContent = copy.loading;
    data = null; render();
    try {
      const response = await fetchImpl(`${authBaseUrl}/v1/me/race-numbers`, { credentials: "include", cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error("Number availability unavailable");
      const next = normalizeAvailability(await response.json());
      if (current !== generation || !host.isConnected) return;
      data = next; render();
    } catch { if (current === generation && host.isConnected) summary.textContent = copy.failed; }
    finally { if (current === generation) refresh.disabled = false; }
  }
  search.addEventListener("input", () => { limit = 100; render(); });
  refresh.addEventListener("click", load);
  more.addEventListener("click", () => { limit += 100; render(); });
  input.addEventListener("input", render);
  host.addEventListener("race-number-refresh", load);
  void load();
}

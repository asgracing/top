import { createAuthHeaderController } from "../../src/features/auth/header-auth.js?v=20261003names1";

const BASE = "https://auth.asgracing.ru/v1/asg-lab";
const content = document.getElementById("lab-content");
const message = document.getElementById("lab-message");
const operatorPage = document.body.dataset.labOps === "true";
let auth = null, state = null, catalog = null, docs = null, generation = 0;
let lang = localStorage.getItem("asgLang") === "en" ? "en" : "ru";
const t = (ru,en) => lang === "ru" ? ru : en;
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const date = value => value ? new Date(value * 1000).toLocaleString(lang === "ru" ? "ru-RU" : "en-GB", {timeZone:"Europe/Moscow"}) + " МСК" : "—";
const money = value => value == null ? t("Цена не задана","Price not configured") : new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "en-GB", {style:"currency",currency:"RUB"}).format(value / 100);
const statuses = {active:["Активна","Active"],expired:["Истекла","Expired"],none:["Нет доступа","No access"],revoked:["Доступ отозван","Access revoked"],pending:["Ожидается оплата","Payment pending"],creating:["Создаётся платёж","Creating payment"],succeeded:["Оплачено (тест)","Paid (test)"],canceled:["Платёж отменён","Payment canceled"]};
const status = value => statuses[value] ? t(...statuses[value]) : t("Неизвестный статус","Unknown status");
const errors = {
  lab_unavailable:["Сервис ASG Lab ещё не подключён.","ASG Lab service is not enabled yet."],
  lab_access_denied:["Раздел пока доступен только команде проекта.","This section is currently limited to the project team."],
  lab_code_invalid:["Код недействителен, истёк или уже использован.","The code is invalid, expired or already used."],
  lab_access_inactive:["Для активации приложения нужен действующий доступ.","An active subscription is required for app activation."],
  lab_documents_changed:["Документы обновились. Обновите страницу и прочитайте новую редакцию.","Documents changed. Reload and review the new version."],
  lab_test_payments_unconfigured:["Тестовая ЮKassa ещё не настроена.","Test YooKassa is not configured yet."],
  csrf_rejected:["Обновите страницу и повторите вход.","Reload the page and sign in again."],
};
async function api(path, body) {
  const response = await fetch(BASE + path, {credentials:"include",cache:"no-store",signal:AbortSignal.timeout(12000),
    method:body === undefined ? "GET" : "POST",headers:body === undefined ? {Accept:"application/json"} : {Accept:"application/json","Content-Type":"application/json","X-CSRF-Token":auth?.csrfToken || ""},body:body === undefined ? undefined : JSON.stringify(body)});
  const payload = await response.json();
  if (!response.ok) throw new Error(t(...(errors[payload.detail] || ["Операция не завершена. Повторите позже или обратитесь в поддержку.","Operation could not complete. Retry later or contact support."])));
  return payload;
}
async function run(button, operation) {
  if (button.disabled) return;
  const stamp = generation;
  button.disabled = true;message.textContent = "";
  try {await operation();} catch(error) {if (stamp === generation) message.textContent = error.message || t("Сервис недоступен","Service unavailable");}
  finally {button.disabled = false;}
}
function renderDocuments() {
  const root = document.getElementById("lab-document-list");root.replaceChildren();
  if (!docs) {root.textContent = t("Документы временно недоступны.","Documents are temporarily unavailable.");return;}
  const seller = document.createElement("p");seller.className = "lab-muted";
  seller.textContent = Object.values(docs.seller).filter(Boolean).join(" · ") || t("Реквизиты продавца ещё не заполнены. Реальные продажи закрыты.","Seller details are not filled in. Live sales are closed.");root.append(seller);
  for (const doc of docs.documents) {
    const details = document.createElement("details"), summary = document.createElement("summary"), text = document.createElement("pre");
    summary.textContent = `${doc.title} · ${doc.version}`;text.textContent = doc.body;details.append(summary,text);root.append(details);
  }
}
function render() {
  if (!auth?.authenticated) {
    content.innerHTML = `<section class="lab-panel"><p>${t("Войдите через Steam, чтобы открыть свой доступ.","Sign in with Steam to manage your access.")}</p></section>`;return;
  }
  if (!state || !catalog) {
    content.innerHTML = `<section class="lab-panel"><p>${t("Данные доступа пока не получены.","Access data has not loaded.")}</p><button id="lab-retry">${t("Повторить","Retry")}</button></section>`;
    document.getElementById("lab-retry").onclick = event => run(event.currentTarget, reload);return;
  }
  content.innerHTML = `
    <section class="lab-panel"><h2>${t("Подписка","Subscription")}</h2><p><strong>${status(state.status)}</strong> · ${t("Доступ до","Access until")}: ${date(state.access_until)}</p>
    <p class="lab-muted">${t("Разовая покупка периода. Автоматических списаний нет. Дистрибутив и обновления будут добавлены позже.","One-time period purchase. No automatic charges. Installer and updates will be added later.")}</p>
    <a class="lab-action" href="/asg-lab/">${t("О продукте","Product page")}</a><button id="lab-refresh">${t("Обновить статус","Refresh status")}</button><button id="lab-cancel-renewal">${t("Проверить отмену продления","Confirm no renewal")}</button></section>
    <div class="lab-grid"><section class="lab-panel"><h2>${t("Код доступа","Access code")}</h2><form id="lab-redeem"><label>${t("Полученный персональный код","Your personal access code")}<input name="code" required maxlength="100" autocomplete="off" spellcheck="false"></label><button class="primary">${t("Активировать доступ","Redeem access")}</button></form></section>
    <section class="lab-panel"><h2>${t("Связать приложение","Link the app")}</h2><p class="lab-muted">${t("Код действует 10 минут и используется один раз. Передайте его только своему приложению.","The code expires in 10 minutes and can be used once. Enter it only in your own app.")}</p><button id="lab-pair" ${state.status !== "active" ? "disabled" : ""}>${t("Получить код активации","Get activation code")}</button><output id="lab-pair-code" aria-live="polite"></output></section></div>
    <section class="lab-panel"><h2>${t("Устройства","Devices")}</h2><p class="lab-muted">${t("Лимит устройств","Device limit")}: ${catalog.device_limit}</p><div id="lab-devices"></div></section>
    <section class="lab-panel"><h2>${t("Продлить / выбрать период","Renew / choose period")}</h2><p class="lab-muted">${t("Только тестовый магазин. Деньги не списываются. Периоды в днях; цены здесь тестовые.","Test shop only. No real charges. Fixed-day periods; prices shown here are test prices.")}</p>
    <form id="lab-order"><label>${t("Период","Period")}<select name="plan">${catalog.plans.map(p => `<option value="${escape(p.id)}">${p.days} ${t("дней","days")} · ${money(p.amount_kopecks)}</option>`).join("")}</select></label>
    <label class="lab-check"><input name="license" type="checkbox" required><span>${t("Прочитал проект лицензии для тестового оформления","I reviewed the license draft for this test")}</span></label>
    <label class="lab-check"><input name="terms" type="checkbox" required><span>${t("Прочитал проект условий подписки для тестового оформления","I reviewed the subscription terms draft for this test")}</span></label>
    <a href="#lab-documents">${t("Прочитать документы","Read documents")}</a><br><button class="primary" ${!catalog.payments_ready || !docs ? "disabled" : ""}>${t("Открыть тестовую ЮKassa","Open test YooKassa")}</button></form></section>
    <section class="lab-panel"><h2>${t("История тестовых заказов","Test order history")}</h2><div id="lab-orders"></div></section>
    ${state.can_issue_codes && operatorPage ? `<section class="lab-panel"><h2>${t("Выдать тестовый код","Issue a test code")}</h2><form id="lab-issue"><label>${t("Пилот (публичный ID)","Driver (public ID)")}<input name="public_id" required value="${escape(state.public_id)}"></label><label>${t("Срок в днях","Days")}<input name="days" type="number" min="1" max="365" value="30" required></label><button>${t("Выдать код","Issue code")}</button><output id="lab-issued"></output></form></section><section class="lab-panel"><h2>${t("Реквизиты и проекты документов","Seller details and document drafts")}</h2><form id="lab-doc-edit"></form></section>` : state.can_issue_codes ? `<a class="lab-action" href="/portal-ops/asg-lab/">${t("Управление ASG Lab ↗","Manage ASG Lab ↗")}</a>` : ""}`;
  document.getElementById("lab-refresh").onclick = event => run(event.currentTarget, reload);
  document.getElementById("lab-cancel-renewal").onclick = event => run(event.currentTarget, async () => {
    await api("/subscription/cancel-renewal", {});
    message.textContent = t("Будущих списаний нет. Оплаченный срок сохраняется. Возврат — отдельное обращение в поддержку.","No future charges. Your paid period is preserved. Refunds require a separate support request.");
  });
  document.getElementById("lab-redeem").onsubmit = event => {
    event.preventDefault();const form = event.currentTarget, code = form.elements.code.value.trim();
    run(form.querySelector("button"), async () => {await api("/redeem", {code});form.reset();await reload();});
  };
  document.getElementById("lab-pair").onclick = event => run(event.currentTarget, async () => {
    const result = await api("/activation-code", {});document.getElementById("lab-pair-code").textContent = result.code + "\n" + t("До ","Until ") + date(result.expires_at);
  });
  const devices = document.getElementById("lab-devices");
  if (!state.devices.length) devices.textContent = t("Нет подключённых устройств","No linked devices");
  for (const device of state.devices) {
    const row = document.createElement("p"), button = document.createElement("button");row.append(document.createTextNode(device.name + " · " + date(device.created) + " "));
    button.textContent = t("Отключить","Disconnect");button.onclick = () => run(button, async () => {await api(`/devices/${encodeURIComponent(device.id)}/revoke`, {});await reload();});row.append(button);devices.append(row);
  }
  const orders = document.getElementById("lab-orders");
  if (!state.orders.length) orders.textContent = t("Заказов пока нет","No orders yet");
  for (const order of state.orders) {
    const row = document.createElement("p"), button = document.createElement("button");row.append(document.createTextNode(`${order.id} · ${money(order.amount)} · ${status(order.status)} `));
    if (order.status === "pending") {button.textContent = t("Проверить оплату","Check payment");button.onclick = () => run(button, async () => {await api(`/orders/${encodeURIComponent(order.id)}/refresh`, {});await reload();});row.append(button);}
    if (["pending","creating"].includes(order.status)) {
      const resume = document.createElement("button");resume.textContent = t("Продолжить оплату","Continue payment");resume.onclick = () => run(resume, async () => goToPayment(await api(`/orders/${encodeURIComponent(order.id)}/resume`, {})));row.append(resume);
    }
    orders.append(row);
  }
  let orderKey = crypto.randomUUID();
  const orderForm = document.getElementById("lab-order");
  orderForm.onchange = () => {orderKey = crypto.randomUUID();};
  orderForm.onsubmit = event => {
    event.preventDefault();const button = orderForm.querySelector("button");
    run(button, async () => {
      const accepted = Object.fromEntries(docs.documents.filter(d => ["license","terms"].includes(d.id)).map(d => [d.id,d.hash]));
      const order = await api("/orders", {plan:orderForm.elements.plan.value,request_key:orderKey,accepted});
      goToPayment(order);
    });
  };
  if (state.can_issue_codes && operatorPage) {
    const form = document.getElementById("lab-issue");
    form.onsubmit = event => {event.preventDefault();run(form.querySelector("button"), async () => {
      const result = await api("/admin/codes", {public_id:form.elements.public_id.value.trim(),days:Number(form.elements.days.value)});
      document.getElementById("lab-issued").textContent = result.code + "\n" + result.id + "\n" + date(result.expires_at);
    });};
    if (docs) renderEditor();
  }
}
function goToPayment(order) {
  if (!auth?.authenticated) return;
  if (!order.confirmation_url) {reload().catch(error => {message.textContent = error.message;});return;}
  const url = new URL(order.confirmation_url);
  if (order.test !== true || url.protocol !== "https:" || !["yoomoney.ru","yookassa.ru"].includes(url.hostname) || url.username || url.password || (url.port && url.port !== "443")) throw new Error(t("Некорректный адрес оплаты","Invalid payment destination"));
  location.assign(url.href);
}
function renderEditor() {
  const form = document.getElementById("lab-doc-edit");
  for (const [name,value] of Object.entries(docs.seller)) {
    const label = document.createElement("label"), input = document.createElement("input");label.textContent = ({name:"ФИО / наименование",status:"Статус продавца",inn:"ИНН",contact:"Контакт поддержки",address:"Адрес обращений"})[name] || name;input.name = "seller_" + name;input.value = value;input.maxLength = name === "address" ? 400 : 200;label.append(input);form.append(label);
  }
  for (const doc of docs.documents) {
    const label = document.createElement("label"), textarea = document.createElement("textarea"), version = document.createElement("input");label.textContent = doc.title;
    textarea.name = "doc_" + doc.id;textarea.value = doc.body;textarea.maxLength = 20000;version.name = "version_" + doc.id;version.value = doc.version;version.maxLength = 80;version.required = true;label.append(version,textarea);form.append(label);
  }
  const button = document.createElement("button");button.textContent = t("Сохранить проекты и реквизиты","Save drafts and seller details");form.append(button);
  form.onsubmit = event => {event.preventDefault();run(button, async () => {
    const seller = Object.fromEntries(Object.keys(docs.seller).map(key => [key,form.elements["seller_" + key].value.trim()]));
    const documents = docs.documents.map(d => ({id:d.id,title:d.title,version:form.elements["version_" + d.id].value,body:form.elements["doc_" + d.id].value}));
    docs = await api("/admin/documents", {expected_revision:docs.revision,seller,documents});renderDocuments();message.textContent = t("Проекты сохранены. Юридическое согласование ещё требуется.","Drafts saved. Legal approval is still required.");
  });};
}
async function reload() {
  const stamp = ++generation;
  const [nextState,nextCatalog] = await Promise.all([api("/me"),api("/catalog")]);
  if (stamp !== generation || !auth?.authenticated) return;
  state = nextState;catalog = nextCatalog;render();
}
function translatePage() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-ru]").forEach(node => {node.textContent = node.dataset[lang];});
  document.getElementById("lab-language").textContent = lang === "ru" ? "EN" : "RU";
  renderDocuments();render();
}
document.getElementById("lab-language").onclick = () => {lang = lang === "ru" ? "en" : "ru";localStorage.setItem("asgLang",lang);translatePage();};
translatePage();
api("/documents").then(value => {docs = value;renderDocuments();render();}).catch(() => renderDocuments());
createAuthHeaderController({onAuthChange:async next => {
  auth = next;state = null;catalog = null;generation++;message.textContent = "";render();
  if (auth?.authenticated) {try {await reload();} catch(error) {message.textContent = error.message;}}
}});

import { createTeamRacingClient, teamRegistrationOpen } from "../../src/shared/team-racing-client.js?v=20261004teams1";

const params = new URLSearchParams(location.search);
const english = params.get("lang") === "en", lang = english ? "en" : "ru";
const tx = (ru, en) => english ? en : ru;
const client = createTeamRacingClient(), $ = id => document.getElementById(id);
let state, event, auth, pending = false;
const id = params.get("event") || "";
document.title = tx("Командная регистрация | ASG Racing","Team registration | ASG Racing");
const make = (tag, text = "") => { const node = document.createElement(tag); node.textContent = text; return node; };
const button = (text, action) => { const node = make("button", text); node.type = "button"; node.onclick = action; return node; };
const disabled = () => pending || state?.stale || !teamRegistrationOpen(event);
const carNames = {0:"Porsche 991 GT3 R",1:"Mercedes-AMG GT3",2:"Ferrari 488 GT3",3:"Audi R8 LMS",4:"Lamborghini Huracán GT3",5:"McLaren 650S GT3",6:"Nissan GT-R 2018",7:"BMW M6 GT3",8:"Bentley Continental GT3 2018",10:"Nissan GT-R 2017",11:"Bentley Continental GT3 2016",12:"Aston Martin V12 Vantage",13:"Lamborghini Gallardo",14:"Jaguar G3",15:"Lexus RC F",16:"Lamborghini Huracán Evo",17:"Honda NSX",19:"Audi R8 LMS Evo",20:"Aston Martin V8 Vantage",21:"Honda NSX Evo",22:"McLaren 720S GT3",23:"Porsche 991II GT3 R",24:"Ferrari 488 GT3 Evo",25:"Mercedes-AMG GT3 2020",30:"BMW M4 GT3",31:"Audi R8 LMS evo II",32:"Ferrari 296 GT3",33:"Lamborghini Huracán Evo2",34:"Porsche 992 GT3 R",35:"McLaren 720S GT3 Evo",36:"Ford Mustang GT3"};
const carName = value => carNames[value] || `ACC #${value}`;
const errors = {
 unconfirmed_roster:tx("Состав не подтверждён до закрытия регистрации.","The crew was not confirmed before registration closed."),
 team_connection_capacity_exceeded:tx("Достигнут лимит подключений пилотов к серверу.","The server's driver connection limit has been reached."),
 event_policy_changed:tx("Условия события изменились. Обновите страницу и подайте заявку заново.","The event policy changed. Refresh and submit a new entry."),
 grid_full:tx("Все места для машин заняты.","All car slots have been taken."),
 registration_closed:tx("Регистрация и все изменения закрыты.","Registration and all changes are closed."),
 version_conflict:tx("Заявка уже изменилась. Обновите данные.","The entry has changed. Refresh the data."),
 captain_number_unavailable:tx("У капитана нет доступного номера. Выберите номер в профиле.","The captain has no available race number. Select one in the profile."),
 race_number_conflict:tx("Номер занят другой заявкой. Проверьте номер капитана.","Another entry uses this number. Check the captain's number."),
 not_team_member:tx("Все пилоты должны состоять в выбранной команде.","All drivers must belong to the selected team."),
 driver_not_eligible:tx("Пилот не проходит действующие правила допуска.","A driver does not meet the current access rules."),
 mixed_admin_roster_requires_verified_policy:tx("Состав с администратором требует проверки прав ACC организатором.","The organizer must verify ACC permissions for this crew."),
 team_racing_state_stale:tx("Связь с организатором временно недоступна. Заявки пока не принимаются.","Organizer synchronization is unavailable. Entries are temporarily closed.")
};
const showError = error => { $("status").textContent = errors[error.message] || tx("Действие не выполнено. Обновите данные и попробуйте ещё раз.","Action failed. Refresh and try again."); };

async function mutate(action, payload, version = null) {
  if (disabled()) return;
  pending = true;
  $("status").textContent = tx("Заявка отправляется…", "Sending entry…");
  for (const node of document.querySelectorAll("#entry button,#registrations button")) node.disabled = true;
  try {
    const result = await client.mutate(action, payload, version, auth.csrf_token, crypto.randomUUID());
    $("status").textContent = tx("Ожидаем подтверждение организатора…", "Waiting for organizer confirmation…");
    for (let attempts = 0; attempts < 45; attempts++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const response = await client.command(result.command.command_id);
      if (response.command.status === "rejected") throw new Error(response.command.receipt?.error?.code || "rejected");
      if (response.command.status === "applied") { pending = false; await refresh(); $("status").textContent=tx("Изменение принято.","Change accepted."); return; }
    }
    $("status").textContent = tx("Заявка ещё обрабатывается. Обновите данные через некоторое время.","The entry is still being processed. Refresh shortly.");
  } catch (error) { showError(error); }
  finally { pending = false; render(); }
}

function renderForm() {
  const root = $("entry"); root.replaceChildren();
  if (!auth?.authenticated || !auth.driver?.public_id) {
    const link = make("a", tx("Войти через Steam", "Sign in through Steam")); link.className = "button";
    link.href = `https://auth.asgracing.ru/v1/auth/steam/start?return_path=${encodeURIComponent(location.pathname+location.search)}`;
    root.append(link); return;
  }
  if (!state.teams.length) { root.append(make("p",tx("Для участия вступите в команду или создайте её в разделе команд.","Join or create a team in the teams section to participate."))); return; }
  const teamSelect = make("select"); teamSelect.id = "registration-team";
  for (const team of state.teams) teamSelect.add(new Option(team.team_name, team.team_id));
  const teamLabel = make("label", tx("Команда", "Team")); teamLabel.append(teamSelect); root.append(teamLabel);
  const fields = make("div"); root.append(fields);
  const redraw = () => {
    fields.replaceChildren();
    const team = state.teams.find(team => team.team_id === teamSelect.value);
    const registration = event.registrations.find(reg => reg.team_id === team.team_id);
    if (registration && registration.registered_by_public_id !== auth.driver.public_id) { fields.append(make("p",tx("Заявкой управляет её создатель. Подтвердите своё участие в списке ниже.","The entry creator manages this registration. Confirm your participation below."))); return; }
    const form = make("form"), grid = make("div"); grid.className = "entry-grid"; fields.append(form); form.append(grid);
    const car = make("select"); car.id = "registration-car";
    for (const model of event.allowed_car_models) car.add(new Option(carName(model),model));
    if (registration) car.value = registration.car_model;
    const carLabel = make("label",tx("Машина","Car")); carLabel.append(car); grid.append(carLabel);
    const captain = make("select"); captain.id = "registration-captain";
    const captainLabel = make("label",tx("Капитан этой гонки","Captain for this race")); captainLabel.append(captain); grid.append(captainLabel);
    const roster = make("fieldset"); roster.append(make("legend",tx(`Состав: 1–${event.max_drivers} пилота, соло разрешено`,`Crew: 1–${event.max_drivers} drivers, solo allowed`))); form.append(roster);
    const checks = [], number = make("p"); form.append(number);
    const updateNumber = () => { const member = team.members.find(p => p.public_id === captain.value); number.textContent = tx("Номер капитана: ","Captain's number: ") + (member?.race_number > 0 ? `#${member.race_number}` : tx("выберите доступный номер в профиле","select an available number in your profile")); };
    const updateCaptain = () => {
      const selected = captain.value || registration?.captain_public_id || auth.driver.public_id;
      captain.replaceChildren();
      for (const {check,member} of checks) if (check.checked) captain.add(new Option(member.display_name,member.public_id));
      if ([...captain.options].some(option => option.value === selected)) captain.value = selected;
      updateNumber();
    };
    for (const member of team.members) {
      const label = make("label"), check = make("input"); check.type = "checkbox"; check.value = member.public_id;
      check.checked = registration ? registration.roster.some(p => p.public_id === member.public_id) : member.public_id === auth.driver.public_id;
      check.disabled = disabled() || (!member.eligible && !check.checked);
      label.append(check,make("span",member.display_name+(!member.eligible ? tx(" · нет допуска"," · ineligible") : "")));
      checks.push({check,member}); check.onchange=updateCaptain; roster.append(label);
    }
    updateCaptain(); captain.onchange=updateNumber;
    const submit = make("button",registration ? tx("Сохранить заявку","Save entry") : tx("Зарегистрировать команду","Register team")); submit.type="submit"; submit.disabled=disabled(); form.append(submit);
    car.disabled=captain.disabled=disabled(); teamSelect.disabled=disabled();
    form.onsubmit = submitEvent => {
      submitEvent.preventDefault();
      const chosen=checks.filter(p => p.check.checked).map(p => p.member.public_id);
      if (!chosen.length || chosen.length>event.max_drivers || !chosen.includes(captain.value)) { $("status").textContent=tx("Проверьте состав и капитана.","Check the crew and captain."); return; }
      void mutate(registration ? "update" : "register",{occurrence_id:id,team_id:team.team_id,car_model:Number(car.value),roster:chosen,captain_public_id:captain.value},registration?.version ?? null);
    };
    if (registration) { const withdraw=button(tx("Отозвать заявку","Withdraw entry"),()=>void mutate("withdraw",{occurrence_id:id,team_id:team.team_id},registration.version)); withdraw.disabled=disabled(); form.append(withdraw); }
    form.append(make("p",tx("При изменении машины, состава или капитана остальные пилоты подтверждают участие заново.","Changes to the car, crew or captain require renewed confirmation from the other drivers.")));
  };
  teamSelect.onchange=redraw; redraw();
}

function render() {
  if (!event) return;
  $("event-title").textContent=event.title || tx("Регистрация команды","Team registration");
  $("event-info").textContent=`${event.track_code || ""} · ${tx("Открытие сервера","Server opening")}: ${new Date(event.launch_at).toLocaleString(lang,{timeZone:"Europe/Moscow"})} MSK`;
  $("deadline").textContent=`${tx("Все заявки и изменения закрываются","All entries and changes close")}: ${new Date(event.closes_at).toLocaleString(lang,{timeZone:"Europe/Moscow"})} MSK${teamRegistrationOpen(event) ? "" : tx(" · ЗАКРЫТО"," · CLOSED")}`;
  renderForm();
  const root=$("registrations"); root.replaceChildren();
  root.append(make("p",`${event.registrations.length} ${tx("команд / машин","teams / cars")} · ${event.registrations.reduce((sum,reg)=>sum+reg.roster.length,0)} ${tx("пилотов","drivers")}`));
  for (const reg of event.registrations) {
    const card=make("article"); card.className="registration"; card.append(make("h3",`${reg.team_name} · #${reg.race_number || "—"} · ${carName(reg.car_model)}`));
    const list=make("ul");
    for (const pilot of reg.roster) {
      const line=make("li",`${pilot.display_name || pilot.public_id}${pilot.public_id===reg.captain_public_id ? tx(" · капитан"," · captain") : ""} · ${pilot.confirmed ? tx("подтверждено","confirmed") : tx("ждём подтверждения","awaiting confirmation")}`);
      if (pilot.public_id===auth?.driver?.public_id && !pilot.confirmed) { const confirm=button(tx("Подтвердить участие","Confirm participation"),()=>void mutate("confirm",{occurrence_id:id,team_id:reg.team_id},reg.version)); confirm.disabled=disabled(); line.append(confirm); }
      list.append(line);
    }
    card.append(list,make("p",reg.exclusion_reason ? tx("Не допущена: ","Excluded: ")+(errors[reg.exclusion_reason] || tx("проверьте состав и допуск","check crew and eligibility")) : reg.included_in_entrylist ? tx("Состав зафиксирован для сервера","Crew frozen for the server") : reg.status==="confirmed" ? tx("Состав подтверждён","Crew confirmed") : tx("Состав ожидает подтверждений","Crew awaiting confirmations")));
    root.append(card);
  }
  if (state.stale) $("status").textContent=errors.team_racing_state_stale;
}

async function refresh() {
  if (pending) return;
  try {
    [state,auth]=await Promise.all([client.state(),client.me()]);
    $("status").textContent="";
    if (!id) {
      $("event-title").textContent=tx("Командные гонки","Team races");
      $("entry-title").textContent=tx("Выберите событие","Choose an event");
      const links=state.events.map(item=>{const link=make("a",`${item.title || item.track_code || item.occurrence_id} · ${new Date(item.launch_at).toLocaleString(lang,{timeZone:"Europe/Moscow"})} MSK`);link.className="button";link.href=`?event=${encodeURIComponent(item.occurrence_id)}&lang=${lang}`;return link;});
      $("entry").replaceChildren(...links); $("status").textContent=links.length?"":tx("Командных событий пока нет.","No team events scheduled yet.");return;
    }
    event=state.events.find(event=>event.occurrence_id===id); if (!event) throw new Error("event_unavailable"); render();
  }
  catch (error) { showError(error); }
}

document.documentElement.lang=lang;
$("mode-label").textContent=tx("КОМАНДНАЯ ГОНКА","TEAM RACE");
$("entry-title").textContent=tx("Заявка","Entry"); $("registered-title").textContent=tx("Зарегистрированные команды","Registered teams"); $("rating-title").textContent=tx("Рейтинг командных гонок","Team race standings");
$("captain-rule").textContent=tx("Капитан подключается к серверу и нажимает Drive первым. Остальные входят после него. Очки, SR и Elo учитываются у фактически ехавших пилотов.","The captain connects to the server and presses Drive first. The other drivers join afterwards. Points, SR and Elo count for drivers who actually race.");
$("refresh").textContent=tx("Обновить","Refresh"); $("refresh").onclick=()=>void refresh();
for (const [element,path,label] of [["schedule-link","hourly",tx("Расписание","Schedule")],["teams-link","teams",tx("Команды","Teams")],["account-link","account",tx("Профиль","Account")]]) { $(element).href=path==="account"?"/account/":`${english?"/":"/ru/"}${path}/`; $(element).textContent=label; }
$("language-link").href=`?event=${encodeURIComponent(id)}&lang=${english ? "ru" : "en"}`; $("language-link").textContent=english ? "RU" : "EN";
void refresh();
setInterval(()=>{if (event && !teamRegistrationOpen(event) && !event.registration_closed) {event.registration_closed=true;render();}},1000);
fetch("https://data.asgracing.ru/top-data/v2/rankings/teams.json",{cache:"no-store"}).then(response=>{if(!response.ok) throw new Error(); return response.json();}).then(payload=>{
  if (!payload.items?.length) { $("rating").textContent=tx("Рейтинг появится после первых командных гонок.","Standings will appear after the first team races."); return; }
  const table=make("table"), head=make("tr"); for (const label of ["#",tx("Команда","Team"),tx("Очки","Points"),tx("Гонки","Races")]) head.append(make("th",label)); table.append(head);
  for (const row of payload.items) { const line=make("tr"); for (const value of [row.rank,row.team_name,row.points,row.races]) line.append(make("td",String(value))); table.append(line); } $("rating").replaceChildren(table);
}).catch(()=>{$("rating").textContent=tx("Рейтинг временно недоступен.","Standings temporarily unavailable.");});

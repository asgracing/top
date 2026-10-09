import { createTeamRacingClient, teamRegistrationOpen } from '../../src/shared/team-racing-client.js?v=20261009teams2';
import { activeRegistrations, entryDraft, validateEntry, entryChanged } from './model.js?v=20261009teams2';

const params = new URLSearchParams(location.search), id = params.get('event') || '';
const english = params.get('lang') === 'en', lang = english ? 'en' : 'ru';
const tx = (ru, en) => english ? en : ru;
const client = createTeamRacingClient(), $ = id => document.getElementById(id);
let state, event, auth, selectedTeam = '', operation = null, checking = false, loading = false, loadFailed = false, draftOwner = '';
const drafts = new Map();
const make = (tag, text = '', cls = '') => { const node = document.createElement(tag); node.textContent = text; node.className = cls; return node; };
const button = (text, action, cls = '') => { const node = make('button', text, cls); node.type = 'button'; node.onclick = action; return node; };
const link = (text, href, cls = '') => { const node = make('a', text, cls); node.href = href; return node; };
const route = name => (english ? '/en/' : '/') + name + '/';
const disabled = () => Boolean(operation || loading || loadFailed || state?.stale || !auth?.csrf_token || !teamRegistrationOpen(event));
const date = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(english ? 'en-GB' : 'ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + ' MSK' : tx('Время уточняется', 'Time to be announced');
const carNames = {0:'Porsche 991 GT3 R',1:'Mercedes-AMG GT3',2:'Ferrari 488 GT3',3:'Audi R8 LMS',4:'Lamborghini Huracán GT3',5:'McLaren 650S GT3',6:'Nissan GT-R 2018',7:'BMW M6 GT3',8:'Bentley Continental GT3 2018',10:'Nissan GT-R 2017',11:'Bentley Continental GT3 2016',12:'Aston Martin V12 Vantage',13:'Lamborghini Gallardo',14:'Jaguar G3',15:'Lexus RC F',16:'Lamborghini Huracán Evo',17:'Honda NSX',19:'Audi R8 LMS Evo',20:'Aston Martin V8 Vantage',21:'Honda NSX Evo',22:'McLaren 720S GT3',23:'Porsche 991II GT3 R',24:'Ferrari 488 GT3 Evo',25:'Mercedes-AMG GT3 2020',30:'BMW M4 GT3',31:'Audi R8 LMS evo II',32:'Ferrari 296 GT3',33:'Lamborghini Huracán Evo2',34:'Porsche 992 GT3 R',35:'McLaren 720S GT3 Evo',36:'Ford Mustang GT3'};
const carName = value => carNames[value] || 'ACC #' + value;
const errors = {
  invalid_roster: tx('Выберите от 1 до допустимого числа пилотов.', 'Select at least one driver, within the crew limit.'),
  creator_not_in_roster: tx('Чтобы подать заявку, включите себя в состав.', 'Include yourself in the crew to submit a new entry.'),
  captain_not_in_roster: tx('Выберите капитана из состава экипажа.', 'Choose a captain from the selected crew.'),
  car_not_allowed: tx('Выберите машину из списка разрешённых для этой гонки.', 'Choose an allowed car for this race.'),
  pilot_already_registered: tx('Один из пилотов уже записан на эту гонку в другой команде.', 'A selected driver is already entered with another team.'),
  unconfirmed_roster: tx('Не все пилоты подтвердили участие до закрытия. Команда не допущена.', 'Not all drivers confirmed before the deadline. The team is excluded.'),
  team_connection_capacity_exceeded: tx('Недостаточно свободных подключений для этого состава.', 'There are not enough server connections for this crew.'),
  event_policy_changed: tx('Условия гонки изменились. Обновите данные и проверьте заявку.', 'Race conditions changed. Refresh and review your entry.'),
  grid_full: tx('Все места для машин заняты.', 'All car slots have been taken.'),
  registration_closed: tx('Регистрация, подтверждения и изменения закрыты.', 'Registration, confirmations and changes are closed.'),
  version_conflict: tx('Заявка уже изменилась. Обновите данные перед следующим действием.', 'The entry has changed. Refresh before your next action.'),
  captain_number_unavailable: tx('Капитану нужен доступный номер от 1 до 998. Проверьте его номер в кабинете или выберите другого капитана.', 'The captain needs an available number from 1 to 998. Check their account or choose another captain.'),
  race_number_conflict: tx('Номер капитана занят другой заявкой. Выберите другого капитана или измените номер в кабинете.', 'Another entry uses this captain’s number. Choose another captain or change the number in the account.'),
  not_team_member: tx('Все пилоты должны состоять в выбранной команде.', 'All drivers must belong to the selected team.'),
  driver_not_eligible: tx('В составе есть пилот без допуска. Уберите его или уточните допуск у организатора.', 'A selected driver is ineligible. Remove them or check access with the organizer.'),
  mixed_admin_roster_requires_verified_policy: tx('Организатор должен проверить права ACC для этого состава.', 'The organizer must verify ACC permissions for this crew.'),
  team_racing_state_stale: tx('Нет свежих данных от организатора. Обновите данные; отправка временно недоступна.', 'Organizer data is out of date. Refresh; submission is temporarily unavailable.'),
  team_racing_unavailable: tx('Командная регистрация временно недоступна. Попробуйте обновить данные позже.', 'Team registration is temporarily unavailable. Try refreshing later.'),
  event_unavailable: tx('Эта гонка не найдена. Вернитесь к списку командных гонок.', 'This race was not found. Return to the team race list.'),
  creator_required: tx('Изменять и отзывать заявку может только её создатель.', 'Only the entry creator can edit or withdraw it.'),
  not_registered_pilot: tx('Подтверждать участие может только пилот из состава заявки.', 'Only a driver in this crew can confirm participation.'),
  authentication_required: tx('Войдите через Steam и обновите страницу.', 'Sign in through Steam and refresh the page.'),
  csrf_rejected: tx('Сессия обновилась. Обновите страницу перед отправкой.', 'Your session changed. Refresh before submitting.'),
  driver_profile_required: tx('Ваша игровая учётная запись ещё не связана с профилем пилота ASG. Проверьте кабинет.', 'Your game account is not linked to an ASG driver profile yet. Check your account.'),
  driver_banned: tx('Запись недоступна из-за действующего ограничения допуска.', 'Registration is unavailable due to a current access restriction.')
};
const message = (text = '', tone = '') => { $('status').textContent = text; $('status').dataset.tone = tone; };
const showError = error => message(errors[error.message] || tx('Действие не выполнено. Обновите данные и попробуйте ещё раз.', 'Action failed. Refresh and try again.'), 'error');
const operationKey = () => 'asg-team-racing:' + id + ':' + (auth?.driver?.public_id || '');
function saveOperation() { try { if (operation) sessionStorage.setItem(operationKey(), JSON.stringify(operation)); else sessionStorage.removeItem(operationKey()); } catch { /* In-memory locking still works without storage. */ } }
function restoreOperation() {
  if (operation || !id || !auth?.driver?.public_id) return;
  try { const saved = JSON.parse(sessionStorage.getItem(operationKey()) || 'null');
    if (saved?.payload?.occurrence_id === id && saved.actor === auth.driver.public_id && saved.key && ['register','update','confirm','withdraw'].includes(saved.action)) operation = saved;
  } catch { /* Ignore malformed local records. */ }
}

async function resolveOperation() {
  if (!operation || checking) return;
  checking = true; render(); const current = operation; let applied = false;
  try {
    if (!current.commandId) {
      message(tx('Отправляем заявку…', 'Sending entry…'));
      const result = await client.mutate(current.action, current.payload, current.version, auth.csrf_token, current.key);
      current.commandId = result.command.command_id; saveOperation();
    }
    message(tx('Заявка отправлена. Ждём подтверждения организатора…', 'Entry sent. Waiting for organizer confirmation…'));
    for (let attempt = 0; attempt < 45; attempt++) {
      const response = await client.command(current.commandId);
      if (response.command.status === 'rejected') { operation = null; saveOperation(); throw new Error(response.command.receipt?.error?.code || 'rejected'); }
      if (response.command.status === 'applied') {
        applied = true; operation = null; saveOperation(); drafts.delete(current.payload.team_id); await loadState();
        message(current.action === 'withdraw' ? tx('Заявка отозвана.', 'Entry withdrawn.') : current.action === 'confirm' ? tx('Ваше участие подтверждено.', 'Your participation is confirmed.') : tx('Заявка принята. Остальным пилотам нужно подтвердить участие до закрытия регистрации.', 'Entry accepted. The other drivers must confirm before registration closes.'), 'success'); return;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    message(tx('Заявка ещё обрабатывается. Нажмите «Проверить заявку» позже. Повторная запись заблокирована.', 'Your entry is still processing. Use “Check entry” later. Duplicate submission is blocked.'));
  } catch (error) {
    // Lost responses can hide an accepted command. Retry with the same key.
    if (operation && !current.commandId && error.httpStatus >= 400 && error.httpStatus < 500) { operation = null; saveOperation(); }
    if (operation) message(tx('Не удалось проверить ответ. Заявка сохранена для проверки: нажмите «Проверить заявку».', 'Could not check the response. Your request is saved: use “Check entry”.'), 'error');
    else if (applied) { loadFailed = true; message(tx('Изменение принято, но свежие данные пока не загружены. Нажмите «Обновить данные».', 'Change accepted, but fresh data could not be loaded. Use “Refresh data”.'), 'error'); }
    else showError(error);
  } finally { checking = false; render(); }
}
async function mutate(action, payload, version = null) {
  if (disabled()) return;
  operation = { action, payload, version, key: crypto.randomUUID(), actor: auth.driver.public_id };
  saveOperation(); await resolveOperation();
}

function renderForm() {
  const root = $('entry'); root.replaceChildren();
  if (!auth?.authenticated || !auth.driver?.public_id) {
    root.append(make('p', tx('Войдите через Steam, чтобы выбрать свою команду или подтвердить участие.', 'Sign in through Steam to choose your team or confirm participation.')),
      link(tx('Войти через Steam', 'Sign in through Steam'), 'https://auth.asgracing.ru/v1/auth/steam/start?return_path=' + encodeURIComponent(location.pathname + location.search), 'button primary')); return;
  }
  if (!state.teams.length) {
    root.append(make('p', tx('Вы пока не состоите в доступной команде. Создайте команду или вступите в неё, затем вернитесь сюда.', 'You have no available team yet. Create or join a team, then return here.')), link(tx('Перейти к командам', 'Find a team'), route('teams'), 'button primary')); return;
  }
  if (!state.teams.some(t => t.team_id === selectedTeam)) selectedTeam = state.teams.find(t => activeRegistrations(event).some(reg => reg.team_id === t.team_id && reg.roster.some(p => p.public_id === auth.driver.public_id)))?.team_id || state.teams[0].team_id;
  const teamSelect = make('select'); teamSelect.id = 'registration-team';
  for (const team of state.teams) teamSelect.add(new Option(team.team_name, team.team_id));
  teamSelect.value = selectedTeam; teamSelect.disabled = Boolean(operation);
  const teamLabel = make('label', tx('1. Выберите команду', '1. Choose your team'), 'field-label'); teamLabel.append(teamSelect); root.append(teamLabel);
  const fields = make('div'); root.append(fields);
  teamSelect.onchange = () => { selectedTeam = teamSelect.value; render(); };
  const team = state.teams.find(t => t.team_id === selectedTeam), registration = activeRegistrations(event).find(reg => reg.team_id === team.team_id);
  if (registration && registration.registered_by_public_id !== auth.driver.public_id) {
    fields.append(make('p', tx('Заявкой управляет её создатель. Проверьте машину, капитана и состав перед подтверждением.', 'The entry creator manages this entry. Review the car, captain and crew before confirming.'))); renderRegistration(fields, registration, true);
    if (!registration.roster.some(p => p.public_id === auth.driver.public_id)) fields.append(make('p', tx('Вас нет в составе на эту гонку. Попросите создателя заявки добавить вас.', 'You are not in this race crew. Ask the entry creator to add you.'), 'note')); return;
  }
  let draft = drafts.get(team.team_id);
  if (!draft) { draft = entryDraft(team, registration, auth.driver.public_id); drafts.set(team.team_id, draft); }
  const form = make('form'); fields.append(form);
  const grid = make('div', '', 'entry-grid'); form.append(make('h3', tx('2. Выберите машину и экипаж', '2. Choose a car and crew'), 'step-heading'), grid);
  const car = make('select'); car.id = 'registration-car'; car.required = true; car.add(new Option(tx('Выберите машину', 'Choose a car'), ''));
  for (const model of event.allowed_car_models) car.add(new Option(carName(model), String(model)));
  car.value = draft.car_model === null ? '' : String(draft.car_model); if (event.allowed_car_models.length === 1) car.value = String(event.allowed_car_models[0]); draft.car_model = car.value === '' ? null : Number(car.value);
  const carLabel = make('label', tx('Машина на гонку', 'Race car'), 'field-label'); carLabel.append(car); grid.append(carLabel, make('p', tx('Одна команда — одна машина. От 1 до ' + event.max_drivers + ' пилотов; можно ехать соло.', 'One team, one car. 1–' + event.max_drivers + ' drivers; solo is allowed.'), 'note'));
  const roster = make('fieldset'); roster.append(make('legend', tx('Экипаж на эту гонку', 'Crew for this race'))); form.append(roster);
  const checks = [];
  for (const member of team.members) {
    const label = make('label', '', 'crew-choice'), check = make('input'); check.type = 'checkbox'; check.value = member.public_id; check.checked = draft.roster.includes(member.public_id);
    const copy = make('span'); copy.append(make('strong', member.display_name || member.public_id), make('small', (member.public_id === auth.driver.public_id ? tx('Вы · ', 'You · ') : '') + (member.eligible === true ? tx('Допуск есть', 'Eligible') : tx('Нет допуска', 'Ineligible'))));
    label.append(check, copy); roster.append(label); checks.push({ check, member });
  }
  const count = make('p', '', 'note'); roster.append(count);
  form.append(make('h3', tx('3. Назначьте капитана и проверьте заявку', '3. Choose the captain and review your entry'), 'step-heading'));
  const captain = make('select'); captain.id = 'registration-captain'; captain.required = true;
  const captainLabel = make('label', tx('Капитан этой гонки', 'Captain for this race'), 'field-label'); captainLabel.append(captain); form.append(captainLabel);
  const number = make('p', '', 'number-note'); form.append(number, make('p', tx('Капитан первым входит на сервер и нажимает Drive. Номер машины берётся из его профиля.', 'The captain joins the server and presses Drive first. The car uses their profile race number.'), 'note'));
  const summary = make('div', '', 'entry-summary'), validation = make('p', '', 'validation'); validation.id = 'entry-validation'; validation.setAttribute('aria-live', 'polite'); form.append(summary, validation);
  car.setAttribute('aria-describedby', 'entry-validation'); captain.setAttribute('aria-describedby', 'entry-validation');
  const actions = make('div', '', 'actions'), submit = make('button', registration ? tx('Сохранить изменения', 'Save changes') : tx('Зарегистрировать команду', 'Register team'), 'primary'); submit.type = 'submit'; actions.append(submit); form.append(actions);
  if (registration) {
    const withdraw = button(tx('Отозвать заявку', 'Withdraw entry'), () => {
      const panel = make('div', '', 'withdraw-confirm'); panel.append(make('p', tx('Отозвать заявку всей команды? Место освободится, подтверждения пилотов будут отменены.', 'Withdraw the whole team? The car slot will be released and crew confirmations cancelled.')),
        button(tx('Да, отозвать', 'Yes, withdraw'), () => void mutate('withdraw', { occurrence_id: id, team_id: team.team_id }, registration.version), 'danger'), button(tx('Оставить заявку', 'Keep entry'), () => { panel.remove(); withdraw.hidden = false; })); withdraw.hidden = true; actions.after(panel);
    }, 'quiet'); withdraw.disabled = disabled(); actions.append(withdraw);
  }
  form.append(make('p', tx('Создатель заявки подтверждает своё участие при отправке. Остальные пилоты входят через Steam и подтверждают участие здесь до закрытия регистрации. Если хотя бы одно подтверждение не получено, вся команда не допускается.', 'Submitting confirms the entry creator’s participation. Every other driver must sign in through Steam and confirm here before the deadline. If any confirmation is missing, the whole team is excluded.'), 'note'));
  if (registration) form.append(make('p', tx('При изменении машины, состава или капитана остальные пилоты подтверждают участие заново.', 'Changing the car, crew or captain requires the other drivers to confirm again.'), 'note'));
  const update = () => {
    draft.roster = checks.filter(item => item.check.checked).map(item => item.member.public_id);
    const previous = captain.value || draft.captain_public_id; captain.replaceChildren();
    for (const { check, member } of checks) if (check.checked) captain.add(new Option(member.display_name || member.public_id, member.public_id));
    if ([...captain.options].some(option => option.value === previous)) captain.value = previous; draft.captain_public_id = captain.value;
    const member = team.members.find(p => p.public_id === captain.value);
    number.replaceChildren(make('strong', tx('Номер машины: ', 'Car number: ') + (member?.race_number ? '#' + member.race_number : tx('не назначен', 'not assigned'))), link(tx('Проверить мой номер', 'Check my number'), route('account') + '#race-number-settings-heading'));
    count.textContent = tx('Выбрано пилотов: ' + draft.roster.length + ' из ' + event.max_drivers, 'Drivers selected: ' + draft.roster.length + ' of ' + event.max_drivers);
    for (const { check, member: pilot } of checks) check.disabled = disabled() || (!check.checked && (pilot.eligible !== true || draft.roster.length >= event.max_drivers));
    car.disabled = captain.disabled = disabled();
    const error = validateEntry(event, team, draft, auth.driver.public_id, registration), conflict = (registration?.version ?? null) !== draft.version;
    validation.textContent = conflict ? errors.version_conflict : error ? errors[error] : registration && !entryChanged(draft, registration) ? tx('Заявка сохранена. Измените данные, чтобы сохранить новую версию.', 'Entry saved. Edit the details to save a new version.') : tx('Всё готово к отправке.', 'Ready to submit.'); validation.dataset.valid = String(!error && !conflict);
    summary.replaceChildren(make('strong', team.team_name), make('span', (draft.car_model === null ? tx('Машина не выбрана', 'No car selected') : carName(draft.car_model)) + ' · ' + tx('Пилотов', 'Drivers') + ': ' + draft.roster.length));
    submit.disabled = disabled() || Boolean(error) || conflict || !entryChanged(draft, registration);
  };
  car.onchange = () => { draft.car_model = car.value === '' ? null : Number(car.value); update(); }; captain.onchange = () => { draft.captain_public_id = captain.value; update(); };
  for (const { check } of checks) check.onchange = update;
  form.onsubmit = e => { e.preventDefault(); update(); if (submit.disabled) return; void mutate(registration ? 'update' : 'register', { occurrence_id: id, team_id: team.team_id, car_model: draft.car_model, roster: [...draft.roster], captain_public_id: draft.captain_public_id }, draft.version); };
  update();
  if (registration) {
    const share = make('div', '', 'share-entry');
    share.append(make('p', tx('Отправьте ссылку экипажу: каждый пилот открывает эту гонку и подтверждает своё участие.', 'Send the crew this link: each driver opens this race and confirms participation.'), 'note'), button(tx('Скопировать ссылку для экипажа', 'Copy crew link'), async () => {
      const url = new URL('/hourly/team/', location.origin); url.searchParams.set('event', id); url.searchParams.set('lang', lang);
      try { await navigator.clipboard.writeText(url.href); message(tx('Ссылка скопирована. Отправьте её пилотам экипажа.', 'Link copied. Send it to your crew.'), 'success'); }
      catch {
        const input = make('input'); input.type = 'text'; input.readOnly = true; input.value = url.href; input.setAttribute('aria-label', tx('Ссылка на гонку', 'Race link'));
        share.replaceChildren(make('p', tx('Скопируйте ссылку и отправьте её экипажу.', 'Copy this link and send it to your crew.'), 'note'), input); input.focus(); input.select();
      }
    }, 'quiet'));
    fields.append(share);
  }
}

function renderRegistration(root, reg, allowConfirm) {
  const own = reg.roster.find(p => p.public_id === auth?.driver?.public_id), card = make('article', '', 'registration' + (own ? ' own-entry' : ''));
  card.append(make('h3', reg.team_name + ' · #' + (reg.race_number || '—')), make('p', carName(reg.car_model), 'note'));
  const status = reg.exclusion_reason ? tx('Не допущена', 'Excluded') : reg.included_in_entrylist ? tx('Состав зафиксирован для сервера', 'Crew frozen for the server') : reg.status === 'confirmed' ? tx('Состав подтверждён', 'Crew confirmed') : tx('Состав ожидает подтверждений', 'Crew awaiting confirmations');
  card.append(make('p', status, 'entry-state ' + (reg.exclusion_reason ? 'excluded' : reg.status === 'confirmed' ? 'confirmed' : '')));
  const list = make('ul', '', 'crew-list');
  for (const pilot of reg.roster) {
    const line = make('li'), copy = make('span'); copy.append(make('strong', (pilot.display_name || pilot.public_id) + (pilot.public_id === auth?.driver?.public_id ? tx(' · вы', ' · you') : '')), make('small', (pilot.public_id === reg.captain_public_id ? tx('Капитан · ', 'Captain · ') : '') + (pilot.confirmed ? tx('Участие подтверждено', 'Participation confirmed') : tx('Ждём подтверждения', 'Awaiting confirmation')))); line.append(copy, make('span', pilot.confirmed ? '✓' : '…', pilot.confirmed ? 'confirmed' : 'waiting')); list.append(line);
  }
  card.append(list);
  if (allowConfirm && own && !own.confirmed) { const confirm = button(tx('Подтвердить участие', 'Confirm participation'), () => void mutate('confirm', { occurrence_id: id, team_id: reg.team_id }, reg.version), 'primary'); confirm.disabled = disabled(); card.append(confirm); }
  if (reg.exclusion_reason) card.append(make('p', errors[reg.exclusion_reason] || tx('Уточните причину у организатора.', 'Contact the organizer for details.'), 'validation')); root.append(card);
}

function render() {
  $('refresh').textContent = operation ? tx('Проверить заявку', 'Check entry') : tx('Обновить данные', 'Refresh data'); $('refresh').disabled = loading || checking;
  if (!event) return;
  $('event-title').textContent = event.title || tx('Регистрация на командную гонку', 'Team race registration');
  $('event-info').textContent = (event.track_name || event.track_code || '') + ' · ' + tx('Открытие сервера', 'Server opening') + ': ' + date(event.launch_at);
  $('deadline').textContent = tx('Все заявки и изменения закрываются', 'All entries and changes close') + ': ' + date(event.closes_at || event.registration_closes_at);
  $('registration-state').textContent = teamRegistrationOpen(event) ? tx('Регистрация открыта', 'Registration open') : tx('ЗАКРЫТО · регистрация закрыта', 'CLOSED · registration closed'); $('registration-state').dataset.open = String(teamRegistrationOpen(event));
  $('availability').hidden = !state.stale && teamRegistrationOpen(event) && !loadFailed;
  $('availability').textContent = loadFailed ? tx('Не удалось обновить данные. Отправка заблокирована до успешного обновления.', 'Could not refresh data. Submission is blocked until refresh succeeds.') : state.stale ? errors.team_racing_state_stale : tx('Составы закрыты. Новые заявки, изменения, отзыв и подтверждения больше не принимаются.', 'Crews are closed. New entries, edits, withdrawal and confirmation are unavailable.');
  renderForm(); const root = $('registrations'); root.replaceChildren(); const registrations = activeRegistrations(event);
  $('registration-count').textContent = registrations.length + (event.max_cars ? ' / ' + event.max_cars : '') + ' ' + tx('машин', 'cars') + ' · ' + registrations.reduce((sum, reg) => sum + reg.roster.length, 0) + ' ' + tx('пилотов', 'drivers');
  if (!registrations.length) root.append(make('p', tx('Пока никто не записался. Здесь появятся команды и подтверждения пилотов.', 'No entries yet. Teams and driver confirmations will appear here.'), 'note'));
  for (const reg of [...registrations].sort((a,b) => Number(b.roster.some(p => p.public_id === auth?.driver?.public_id)) - Number(a.roster.some(p => p.public_id === auth?.driver?.public_id)))) renderRegistration(root, reg, reg.team_id !== selectedTeam);
}

async function loadState() {
  const [nextState, nextAuth] = await Promise.all([client.state(), client.me()]);
  if (!Array.isArray(nextState.events) || !Array.isArray(nextState.teams)) throw new Error('team_racing_unavailable');
  state = nextState; auth = nextAuth; loadFailed = false;
  if (draftOwner !== (auth?.driver?.public_id || '')) { drafts.clear(); selectedTeam = ''; operation = null; draftOwner = auth?.driver?.public_id || ''; }
  if (!id) {
    $('event-title').textContent = tx('Командные гонки', 'Team races'); $('entry-title').textContent = tx('Выберите гонку', 'Choose a race'); $('event-context').hidden = true; $('registered-section').hidden = true;
    const links = state.events.filter(item => item.participation_mode === 'team').map(item => link((item.title || item.track_name || item.track_code || item.occurrence_id) + ' · ' + date(item.launch_at) + ' · ' + (teamRegistrationOpen(item) ? tx('Запись открыта','Open') : tx('Закрыто','Closed')), '?event=' + encodeURIComponent(item.occurrence_id) + '&lang=' + lang, 'event-choice'));
    $('entry').replaceChildren(...links); if (!links.length) $('entry').append(make('p', tx('Командных гонок пока нет. Проверьте расписание позже.', 'No team races scheduled. Check the schedule later.'), 'note')); return;
  }
  event = state.events.find(item => item.occurrence_id === id && item.participation_mode === 'team');
  if (!event) { $('entry').replaceChildren(link(tx('Все командные гонки','All team races'), '?lang=' + lang, 'button')); $('registered-section').hidden = true; $('event-context').hidden = true; throw new Error('event_unavailable'); }
  $('event-context').hidden = false; $('registered-section').hidden = false;
  // A newer authoritative version replaces a conflicting draft on refresh.
  // Ordinary refreshes preserve the current team and unfinished form.
  for (const [teamId, draft] of drafts) if (draft.version !== (activeRegistrations(event).find(reg => reg.team_id === teamId)?.version ?? null)) drafts.delete(teamId);
  restoreOperation(); render();
}
async function refresh() {
  if (loading || checking) return;
  loading = true; render();
  try { await loadState(); message(); } catch (error) { loadFailed = true; showError(error); } finally { loading = false; render(); }
  if (operation) await resolveOperation();
}

document.documentElement.lang = lang; document.title = tx('Командная регистрация | ASG Racing','Team registration | ASG Racing');
for (const [element, ru, en] of [
  ['mode-label','КОМАНДНАЯ ГОНКА','TEAM RACE'], ['entry-title','Заявка команды','Team entry'], ['registered-title','Команды на гонку','Race entries'], ['rating-title','Рейтинг командных гонок','Team race standings'],
  ['workflow-title','Как записаться','How to enter'], ['workflow-one','Выберите команду, машину и пилотов','Choose your team, car and drivers'], ['workflow-two','Назначьте капитана и отправьте заявку','Choose a captain and submit'], ['workflow-three','Каждый пилот подтверждает участие','Each driver confirms participation'],
  ['captain-rule','Капитан входит на сервер и нажимает Drive первым. Остальные подключаются после него. Очки, SR и Elo учитываются у фактически ехавших пилотов.','The captain joins the server and presses Drive first. The other drivers join afterwards. Points, SR and Elo count for drivers who actually race.'],
  ['deadline-rule','Все действия закрываются за час до открытия сервера. Неподтверждённая команда не допускается целиком.','All actions close one hour before server opening. A crew with missing confirmations is excluded as a whole.'], ['skip-link','Перейти к заявке','Skip to entry']
]) $(element).textContent = tx(ru,en);
for (const [element,name,label] of [['schedule-link','hourly',tx('Расписание','Schedule')],['teams-link','teams',tx('Команды','Teams')],['account-link','account',tx('Кабинет','Account')]]) { $(element).href = route(name); $(element).textContent = label; }
$('home-link').href = english ? '/en/' : '/'; $('language-link').href = '?' + (id ? 'event=' + encodeURIComponent(id) + '&' : '') + 'lang=' + (english ? 'ru' : 'en'); $('language-link').textContent = english ? 'RU' : 'EN';
$('refresh').onclick = () => void refresh(); message(tx('Загрузка…','Loading…')); void refresh();
setInterval(() => { if (event && !teamRegistrationOpen(event) && !event.registration_closed) { event.registration_closed = true; render(); } },1000);
fetch('https://data.asgracing.ru/top-data/v2/rankings/teams.json',{cache:'no-store'}).then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(payload => {
  if (!payload.items?.length) { $('rating').textContent = tx('Рейтинг появится после первых командных гонок.','Standings will appear after the first team races.'); return; }
  const table = make('table'), head = make('thead'), row = make('tr'); for (const label of ['#',tx('Команда','Team'),tx('Очки','Points'),tx('Гонки','Races')]) { const cell = make('th',label); cell.scope = 'col'; row.append(cell); } head.append(row); table.append(head);
  const body = make('tbody'); for (const item of payload.items) { const line = make('tr'); for (const value of [item.rank,item.team_name,item.points,item.races]) line.append(make('td',String(value))); body.append(line); } table.append(body); $('rating').replaceChildren(table);
}).catch(() => { $('rating').textContent = tx('Рейтинг временно недоступен.','Standings temporarily unavailable.'); });

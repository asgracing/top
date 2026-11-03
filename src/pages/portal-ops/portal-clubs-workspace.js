import { createIdempotencyKey, isSafeLogoPreview } from './portal-ops-model.js?v=20261004teams1';
import { managementCommand, filterManagedEntities } from './portal-clubs-model.js?v=20261103clubs1';
import { inspectLogoFile } from '../account/logo-upload-model.js?v=20260813logo2';
import { loadPilotIndex, filterPilots } from '../account/pilot-search-model.js?v=20261022compact1';
import { createHttpClient } from '../../shared/http-client.js';
import { formatMoscowDateTime } from '../../shared/time.js?v=20260910msk1';

const labels = {
  ru: {
    title: 'Клубы и команды', intro: 'Создавайте сообщества, назначайте руководителей и управляйте профилями и составом.',
    refresh: 'Обновить', create: 'Создать', club: 'Клуб', team: 'Команда', all: 'Все', search: 'Найти по названию',
    approved: 'Активен', pending: 'На проверке', rejected: 'Отклонён', suspended: 'Приостановлен', archived: 'В архиве', review: 'Требуют проверки',
    loading: 'Загружаем…', unavailable: 'Данные недоступны. Повторите обновление.', stale: 'Данные устарели. Изменения станут доступны после синхронизации.',
    empty: 'Ничего не найдено. Измените фильтры или создайте клуб либо команду.', select: 'Выберите клуб или команду слева — здесь откроется управление.',
    profile: 'Профиль', roster: 'Состав и руководство', logo: 'Логотип', moderation: 'Проверка изменений', settings: 'Статус и клуб', history: 'История',
    displayName: 'Название', shortName: 'Короткое название / тег', descriptionRu: 'Описание на русском', descriptionEn: 'Описание на английском', websiteUrl: 'Сайт',
    fieldsHint: 'Название — от 2 до 80 символов, тег — до 24. Публичный адрес сохранится при переименовании.',
    leader: 'Глава клуба / капитан', leaderHint: 'Найдите пилота и выберите его в результатах. Он получит права руководителя. Администратор не вступает в состав.',
    searchPilot: 'Имя или ID пилота (от 2 символов)', noPilots: 'Пилоты не найдены.', pilotUnavailable: 'Поиск недоступен. Повторите ввод позже.', selected: 'Выбран',
    affiliation: 'Клуб команды', independent: 'Независимая команда', affiliationHint: 'Руководитель клубной команды должен состоять в выбранном клубе. Независимая команда создаётся пилотом без клуба.',
    createHint: 'Клуб или команда сразу станет активным. После создания можно добавить логотип и участников.',
    reason: 'Комментарий к изменению', reasonHint: 'От 3 до 1000 символов. Комментарий сохраняется в административной истории.',
    save: 'Сохранить изменения', cancel: 'Отмена', open: 'Открыть публичный профиль ↗', add: 'Добавить участника', remove: 'Исключить', transfer: 'Назначить руководителем', head: 'Глава', captain: 'Капитан', member: 'Участник',
    transferHint: 'Назначить руководителем можно участника состава. Сначала добавьте нового пилота, если его ещё нет в списке.',
    reasonFirst: 'Сначала заполните комментарий к изменению.', confirm: 'Подтвердить', queued: 'В очереди — ожидаем применения.', applied: 'Изменение применено. Публичная страница обновится после публикации.',
    waiting: 'Ожидает применения', resume: 'Проверить результат', waitingHint: 'Команда сохранена. Не отправляйте её повторно; можно вернуться к проверке результата.',
    version_conflict: 'Данные изменились. Обновите список и проверьте действие снова.', reason_required: 'Добавьте комментарий от 3 до 1000 символов.',
    invalid_fields: 'Проверьте название, длину текстов и адрес сайта.', invalid_website: 'Укажите полный адрес сайта с http:// или https://.', invalid_member: 'Выберите пилота в результатах поиска.',
    driver_not_found: 'Пилот не найден в базе Main. Обновите данные и выберите другого пилота.', name_taken: 'Название уже занято клубом или командой.',
    not_member: 'Выберите участника состава для назначения руководителем.', already_in_club: 'Выбранный руководитель уже состоит в клубе.', already_in_team: 'Выбранный руководитель уже состоит в команде.',
    incompatible_membership: 'Состав связан с другим клубом или командой. Сначала устраните конфликт членства.', club_membership_required: 'Руководитель должен состоять в выбранном клубе.', independent_team_requires_no_club: 'Для независимой команды выберите руководителя без клуба.',
    leadership_transfer_required: 'Сначала передайте руководство клубом или командой другому участнику.', team_full: 'В команде уже четыре участника.', entity_archived: 'Сущность в архиве. История доступна для просмотра.',
    genericError: 'Изменение не выполнено. Обновите данные и проверьте условия действия.', recent_auth_required: 'Повторно войдите через Steam для административного действия.',
    upload: 'Загрузить и применить логотип', logoHint: 'Квадратное PNG или JPEG, до 200 КБ, максимум 1024×1024. Рекомендуем от 256×256. Логотип администратора применяется сразу.',
    logoClear: 'Убрать логотип', logoClearHint: 'На публичной странице появится стандартная эмблема. Исходное изображение останется в истории.', logoPreview: 'Предпросмотр выбранного логотипа',
    image_too_large: 'Изображение должно быть не больше 200 КБ.', image_not_square: 'Выберите квадратное изображение.', image_dimensions_too_large: 'Максимальный размер — 1024×1024.', image_decode_failed: 'Не удалось прочитать изображение.', image_media_type_not_allowed: 'Выберите PNG или JPEG.',
    noChanges: 'Нет изменений на проверке.', approve: 'Одобрить', reject: 'Отклонить', textChanges: 'Изменения профиля', logoChanges: 'Новый логотип', before: 'Сейчас', after: 'Предложено',
    noHistory: 'История пока пуста.', noRequests: 'Ожидающих заявок нет.', requests: 'Заявки и приглашения', request: 'Заявка', invitation: 'Приглашение', until: 'до',
    suspend: 'Приостановить', restore: 'Возобновить', archive: 'Перенести в архив', archiveHint: 'Архивирование закроет состав и связанные команды клуба. Результаты и история сохранятся. Возврат из архива не предусмотрен.',
    affiliationSave: 'Изменить клуб команды', affiliationMoveHint: 'Связь и членство всего состава изменятся вместе. Для главы клуба сначала потребуется передача руководства. Результаты прошлых гонок сохранятся.',
    publishedHint: 'Администратор может менять профиль без отдельной модерации. Изменения в приостановленном сообществе сохраняют его статус.',
    count: 'Участников', synced: 'Обновлено', access: 'Права администратора', newEntity: 'Новое сообщество', unsaved: 'Есть несохранённые изменения. Закрыть форму?',
  },
  en: {
    title: 'Clubs & teams', intro: 'Create communities, appoint leaders and manage profiles and rosters.',
    refresh: 'Refresh', create: 'Create', club: 'Club', team: 'Team', all: 'All', search: 'Find by name', approved: 'Active', pending: 'Under review', rejected: 'Rejected', suspended: 'Suspended', archived: 'Archived', review: 'Needs review',
    loading: 'Loading…', unavailable: 'Data is unavailable. Try refreshing.', stale: 'Data is out of date. Changes become available after synchronization.', empty: 'No matches. Change the filters or create a club or team.', select: 'Select a club or team to open its management workspace.',
    profile: 'Profile', roster: 'Roster & leadership', logo: 'Logo', moderation: 'Review changes', settings: 'Status & club', history: 'History', displayName: 'Name', shortName: 'Short name / tag', descriptionRu: 'Russian description', descriptionEn: 'English description', websiteUrl: 'Website',
    fieldsHint: 'Name: 2–80 characters. Tag: up to 24. Renaming keeps the public address.', leader: 'Club head / team captain', leaderHint: 'Find and select a driver. They receive leadership rights. The administrator does not join the roster.',
    searchPilot: 'Driver name or ID (2+ characters)', noPilots: 'No drivers found.', pilotUnavailable: 'Search unavailable. Try again later.', selected: 'Selected', affiliation: 'Team club', independent: 'Independent team', affiliationHint: 'A club team leader must belong to the selected club. An independent team needs a leader without a club.',
    createHint: 'The club or team becomes active immediately. Add a logo and members after creation.', reason: 'Change comment', reasonHint: '3–1000 characters. Saved in the administrative history.', save: 'Save changes', cancel: 'Cancel', open: 'Open public profile ↗', add: 'Add member', remove: 'Remove', transfer: 'Appoint leader', head: 'Head', captain: 'Captain', member: 'Member',
    transferHint: 'Appoint a member of the roster. Add a new driver first if they are not listed.', reasonFirst: 'Enter a change comment first.', confirm: 'Confirm', queued: 'Queued — waiting to apply.', applied: 'Change applied. The public page updates after publication.', waiting: 'Waiting to apply', resume: 'Check result', waitingHint: 'The command is saved. Do not submit it again; you can check its result later.',
    version_conflict: 'Data changed. Refresh and review the action again.', reason_required: 'Add a comment of 3–1000 characters.', invalid_fields: 'Check the name, text lengths and website address.', invalid_website: 'Use a full website address starting with http:// or https://.', invalid_member: 'Select a driver from search results.', driver_not_found: 'Driver not found on Main. Refresh and select another driver.', name_taken: 'This name is already in use.', not_member: 'Select a roster member as the new leader.', already_in_club: 'The selected leader already belongs to a club.', already_in_team: 'The selected leader already belongs to a team.', incompatible_membership: 'The roster conflicts with another club or team. Resolve its membership first.', club_membership_required: 'The leader must belong to the selected club.', independent_team_requires_no_club: 'Select a leader without a club for an independent team.', leadership_transfer_required: 'Transfer leadership to another member first.', team_full: 'The team already has four members.', entity_archived: 'Archived. History is available for viewing.', genericError: 'Change failed. Refresh the data and review the action requirements.', recent_auth_required: 'Sign in with Steam again for an administrative change.',
    upload: 'Upload and apply logo', logoHint: 'Square PNG or JPEG, up to 200 KB and 1024×1024. We recommend at least 256×256. Administrator logos apply immediately.', logoClear: 'Remove logo', logoClearHint: 'The public page will use the default badge. The original image stays in history.', logoPreview: 'Selected logo preview', image_too_large: 'Image must be at most 200 KB.', image_not_square: 'Choose a square image.', image_dimensions_too_large: 'Maximum size is 1024×1024.', image_decode_failed: 'Unable to read this image.', image_media_type_not_allowed: 'Choose a PNG or JPEG.', noChanges: 'No changes awaiting review.', approve: 'Approve', reject: 'Reject', textChanges: 'Profile changes', logoChanges: 'New logo', before: 'Current', after: 'Proposed', noHistory: 'No history yet.', noRequests: 'No pending requests.', requests: 'Requests & invitations', request: 'Request', invitation: 'Invitation', until: 'until', suspend: 'Suspend', restore: 'Resume', archive: 'Archive', archiveHint: 'Archiving closes the roster and a club’s affiliated teams. Results and history remain. Archiving cannot be undone.', affiliationSave: 'Change team club', affiliationMoveHint: 'Affiliation and the entire roster’s club membership change together. Club heads must transfer leadership first. Past race results remain.', publishedHint: 'Administrators can edit the profile without a separate review. Editing a suspended community keeps it suspended.', count: 'Members', synced: 'Updated', access: 'Administrator access', newEntity: 'New community', unsaved: 'There are unsaved changes. Close the form?',
  },
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
Object.assign(labels.ru, {
  entity_not_approved: 'Сначала одобрите профиль сообщества.',
  pending_revision_blocks_archive: 'Сначала одобрите или отклоните ожидающие изменения профиля.',
  pending_team_revision_blocks_archive: 'Сначала проверьте ожидающие изменения связанных команд.',
  team_membership_blocks_club_exit: 'Сначала исключите пилота из команды этого клуба.',
  invalid_transition: 'Этот переход статуса недоступен. Обновите данные.',
  image_required: 'Сначала выберите изображение логотипа.',
  already_member: 'Пилот уже состоит в клубе или команде.',
  already_affiliated: 'Команда уже связана с выбранным клубом.',
  statusLabel: 'Статус', typeLabel: 'Тип',
});
Object.assign(labels.en, {
  entity_not_approved: 'Approve the community profile first.',
  pending_revision_blocks_archive: 'Approve or reject the pending profile changes first.',
  pending_team_revision_blocks_archive: 'Review the affiliated teams’ pending changes first.',
  team_membership_blocks_club_exit: 'Remove the driver from this club’s team first.',
  invalid_transition: 'This status transition is unavailable. Refresh the data.',
  image_required: 'Choose a logo image first.',
  already_member: 'The driver already belongs to a club or team.',
  already_affiliated: 'The team already belongs to this club.',
  statusLabel: 'Status', typeLabel: 'Type',
});
const pause = () => new Promise(resolve => setTimeout(resolve, 1500));
const profileKeys = ['displayName', 'shortName', 'descriptionRu', 'descriptionEn', 'websiteUrl'];
const snake = ['display_name', 'short_name', 'description_ru', 'description_en', 'website_url'];

export function mountClubsManagement({ root, api, auth, confirmAction, onError, language }) {
  const t = key => labels[language()][key] || labels.en[key] || key;
  let state = null, selected = null, tab = 'profile', creating = false, busy = false, dirty = false, pilots = null, chosenPilot = null, pending = null, logoFile = null, logoUrl = '', generation = 0, user = '';
  const $ = selector => root.querySelector(selector);
  const options = (items, value = '') => items.map(([key,label]) => `<option value="${esc(key)}"${key === value ? ' selected' : ''}>${esc(label)}</option>`).join('');
  root.innerHTML = `<div class="portal-ops-section-heading"><div><h2>${t('title')}</h2><p>${t('intro')}</p></div><div class="portal-clubs-toolbar"><button type="button" data-refresh>${t('refresh')}</button><button type="button" class="portal-ops-primary" data-create="club">+ ${t('club')}</button><button type="button" class="portal-ops-primary" data-create="team">+ ${t('team')}</button></div></div>
    <p data-summary class="portal-ops-summary" role="status"></p><p data-feedback class="portal-ops-message" role="status" aria-live="polite"></p>
    <div class="portal-clubs-pending" data-pending hidden><strong>${t('waiting')}</strong><p>${t('waitingHint')}</p><button type="button" data-resume>${t('resume')}</button></div>
    <div class="portal-clubs-layout"><aside class="portal-clubs-directory"><label>${t('search')}<input type="search" data-query maxlength="160"></label><div class="portal-clubs-filters"><label>${t('typeLabel')}<select data-type>${options([['',t('all')],['club',t('club')],['team',t('team')]])}</select></label><label>${t('statusLabel')}<select data-status>${options([['',t('all')],...['review','approved','pending','rejected','suspended','archived'].map(key=>[key,t(key)])])}</select></label></div><div data-list class="portal-clubs-list"></div></aside><section data-editor class="portal-clubs-editor"><p>${t('select')}</p></section></div>`;
  function feedback(text = '', kind = '') { $('[data-feedback]').textContent = text; $('[data-feedback]').dataset.kind = kind; }
  function error(error) { const code = error?.code || error?.message; if (code === 'recent_auth_required') onError(error, $('[data-feedback]')); else feedback(labels[language()][code] || t('genericError'), 'error'); }
  function ready() { return state?.available && !state.stale && !busy && !pending && auth()?.authenticated && auth()?.permissions?.portalManage; }
  function controls() {
    root.querySelectorAll('[data-mutate]').forEach(button => button.disabled = !ready() || selected?.status === 'archived');
    root.querySelectorAll('[data-create]').forEach(button => button.disabled = !ready());
    const upload=$('[data-action="upload"]');if(upload&&!logoFile)upload.disabled=true;
    $('[data-refresh]').disabled = busy;
    $('[data-resume]').disabled = busy;
    root.setAttribute('aria-busy', String(busy));
  }
  function list() {
    const entries = filterManagedEntities(state?.entities || [], {query:$('[data-query]').value,type:$('[data-type]').value,status:$('[data-status]').value});
    $('[data-list]').innerHTML = entries.length ? entries.map(entity => `<button type="button" class="portal-clubs-entry${selected?.public_id === entity.public_id && !creating ? ' is-selected' : ''}" data-entity="${esc(entity.public_id)}" aria-pressed="${selected?.public_id === entity.public_id && !creating}"><span>${t(entity.entity_type)} · <b data-status="${esc(entity.status)}">${t(entity.status)}</b></span><strong>${esc(entity.display_name)}</strong><small>${t('count')}: ${entity.active_members}${entity.entity_type==='team'?'/4':''}</small>${entity.pending_revision || entity.pending_logo ? `<em>${t('review')}</em>` : ''}</button>`).join('') : `<p class="portal-clubs-help">${t('empty')}</p>`;
    root.querySelectorAll('[data-entity]').forEach(button => button.onclick = async () => { if (!await leave()) return; selected = state.entities.find(entity=>entity.public_id === button.dataset.entity); creating = false; tab = 'profile'; chosenPilot = null; render(); });
    controls();
  }
  async function leave() { return !busy && (!dirty || await confirmAction(t('unsaved'))); }
  function reasonMarkup() { return `<label class="portal-clubs-comment">${t('reason')}<textarea data-reason rows="2" maxlength="1000" aria-describedby="portal-clubs-reason-hint"></textarea><small id="portal-clubs-reason-hint">${t('reasonHint')}</small></label>`; }
  function fieldsMarkup(fields = {}) { return `<p class="portal-clubs-help">${t('fieldsHint')}</p><div class="portal-ops-form-grid">${profileKeys.map((key,index) => `<label>${t(key)}${key.startsWith('description') ? `<textarea name="${key}" rows="4" maxlength="4000">${esc(fields[snake[index]])}</textarea>` : `<input name="${key}" ${key === 'websiteUrl' ? 'type="url"' : ''} ${key==='displayName'?'required minlength="2"':''} maxlength="${key==='displayName'?80:key==='shortName'?24:300}" value="${esc(fields[snake[index]])}">`}</label>`).join('')}</div>`; }
  function clubPicker(current = '') { return `<label>${t('affiliation')}<select data-club>${options([['',t('independent')],...(state?.entities||[]).filter(entity=>entity.entity_type==='club'&&entity.status==='approved').map(entity=>[entity.public_id,entity.display_name])],current)}</select></label>`; }
  function pilotPicker() { return `<div class="portal-clubs-pilot-picker"><label>${t('searchPilot')}<input type="search" data-pilot-search maxlength="80" autocomplete="off"></label><div data-pilot-results class="portal-clubs-pilot-results" aria-live="polite"></div><p data-pilot-selected class="portal-clubs-help"></p></div>`; }
  function actionButton(action, title, extra = '') { return `<button type="button" data-mutate data-action="${esc(action)}" ${extra}>${esc(title)}</button>`; }
  function date(value) { return value ? formatMoscowDateTime(value,language()==='ru'?'ru-RU':'en-GB') : '—'; }
  function render() {
    dirty = false; clearLogo();
    const editor = $('[data-editor]');
    if (!selected && !creating) { editor.innerHTML = `<p>${t('select')}</p>`; list(); return; }
    const type = creating;
    const href = selected?.entity_type === 'club' ? `/clubs/?slug=${encodeURIComponent(selected.slug)}` : `/teams/detail/?slug=${encodeURIComponent(selected?.slug||'')}`;
    editor.innerHTML = `<header class="portal-clubs-editor-heading"><div><span class="portal-clubs-help">${t(type || selected.entity_type)} · ${t('access')}</span><h3>${esc(type ? t('newEntity') : selected.display_name)}</h3>${!type?`<span class="portal-clubs-status" data-status="${selected.status}">${t(selected.status)}</span> <small>${t('count')}: ${selected.active_members}${selected.entity_type==='team'?'/4':''}</small>`:''}</div>${!type?`<a href="${href}" target="_blank" rel="noopener">${t('open')}</a>`:`<button type="button" data-cancel>${t('cancel')}</button>`}</header>
      ${!type?`<nav class="portal-clubs-tabs" aria-label="${t('title')}">${['profile','roster','logo','moderation','settings','history'].map(key=>`<button type="button" data-clubs-tab="${key}" aria-current="${tab===key?'page':'false'}">${t(key)}${key==='moderation'&&(selected.pending_revision||selected.pending_logo)?' •':''}</button>`).join('')}</nav>`:''}<div data-body></div>`;
    const body = $('[data-body]');
    if (type || tab === 'profile') {
      body.innerHTML = `<form data-profile-form>${fieldsMarkup(type?{}:selected.profile)}${type?`<h4>${t('leader')}</h4><p class="portal-clubs-help">${t('leaderHint')}</p>${pilotPicker()}${type==='team'?clubPicker():''}<p class="portal-clubs-help">${t('affiliationHint')}</p>`:''}${reasonMarkup()}<p class="portal-clubs-help">${t(type?'createHint':'publishedHint')}</p><button type="submit" class="portal-ops-primary" data-mutate>${t(type?'create':'save')}</button></form>`;
      $('[data-profile-form]').onsubmit = event => { event.preventDefault(); void execute(type?'portal.entity.create':'portal.entity.update', {fields:Object.fromEntries(new FormData(event.currentTarget)),leaderId:chosenPilot?.publicId,entityType:type,clubId:$('[data-club]')?.value}); };
    } else if (tab === 'roster') {
      body.innerHTML = `<p class="portal-clubs-help">${t('transferHint')}</p><div class="portal-clubs-roster">${(selected.members||[]).map(member=>`<article><div><a href="/driver/?id=${encodeURIComponent(member.public_id)}" target="_blank" rel="noopener">${esc(member.display_name||member.public_id)}</a><small>${t(member.role)}</small></div>${member.role==='member'?`<div>${actionButton('portal.leadership.transfer',t('transfer'),`data-member="${esc(member.public_id)}"`)}${actionButton('portal.membership.admin_remove',t('remove'),`data-member="${esc(member.public_id)}" class="portal-clubs-danger"`)}</div>`:''}</article>`).join('')}</div>${reasonMarkup()}<h4>${t('add')}</h4>${pilotPicker()}${actionButton('portal.membership.admin_add',t('add'))}<h4>${t('requests')}</h4><div>${(selected.requests||[]).map(request=>`<p>${t(request.action_type)} · ${esc(request.subject_public_id)} · ${t('until')} ${esc(date(request.expires_at))}</p>`).join('')||`<p class="portal-clubs-help">${t('noRequests')}</p>`}</div>`;
    } else if (tab === 'logo') {
      body.innerHTML = `<p class="portal-clubs-help">${t('logoHint')}</p><label>${t('logo')}<input type="file" accept="image/png,image/jpeg" data-logo-file></label><img data-logo-preview alt="${t('logoPreview')}" class="portal-clubs-logo-preview" hidden><p data-logo-info class="portal-clubs-help" role="status"></p>${actionButton('upload',t('upload'),'class="portal-ops-primary"')}<hr>${reasonMarkup()}<p class="portal-clubs-help">${t('logoClearHint')}</p>${actionButton('portal.entity.logo_clear',t('logoClear'),'class="portal-clubs-danger"')}`;
      $('[data-logo-file]').onchange = () => void inspectLogo();
    } else if (tab === 'moderation') {
      const changes = selected.revision?.changes || [];
      body.innerHTML = `${reasonMarkup()}<h4>${t('textChanges')}</h4>${changes.map(change=>`<article class="portal-clubs-change"><strong>${t(profileKeys[snake.indexOf(change.field)]||change.field)}</strong><div><span>${t('before')}</span><p>${esc(change.before||'—')}</p></div><div><span>${t('after')}</span><p>${esc(change.after||'—')}</p></div></article>`).join('')||`<p>${t('noChanges')}</p>`}${selected.pending_revision?`${actionButton('portal.entity.revision_decide:approved',t('approve'))}${actionButton('portal.entity.revision_decide:rejected',t('reject'))}`:''}<h4>${t('logoChanges')}</h4>${selected.logo&&isSafeLogoPreview(selected.logo.preview_data_url,selected.logo.media_type)?`<img class="portal-clubs-logo-preview" alt="${t('logoPreview')}" src="${selected.logo.preview_data_url}">`:''}${selected.pending_logo?`${actionButton('portal.entity.logo_decide:approved',t('approve'))}${actionButton('portal.entity.logo_decide:rejected',t('reject'))}`:`<p>${t('noChanges')}</p>`}`;
    } else if (tab === 'settings') {
      body.innerHTML = `${reasonMarkup()}${selected.entity_type==='team'?`${clubPicker(selected.club_public_id)}<p class="portal-clubs-help">${t('affiliationMoveHint')}</p>${actionButton('portal.team.set_club',t('affiliationSave'))}<hr>`:''}${selected.status==='approved'?actionButton('portal.entity.set_status:suspended',t('suspend')):''}${selected.status==='suspended'?actionButton('portal.entity.set_status:approved',t('restore')):''}<p class="portal-clubs-help">${t('archiveHint')}</p>${actionButton('portal.entity.set_status:archived',t('archive'),'class="portal-clubs-danger"')}`;
    } else {
      body.innerHTML = `<ol class="portal-clubs-history">${(selected.audit||[]).map(entry=>`<li><strong>${esc(historyLabel(entry.action))}</strong><time>${esc(date(entry.occurred_at))}</time><small>${esc(entry.actor_public_id)}</small></li>`).join('')||`<li>${t('noHistory')}</li>`}</ol>`;
    }
    root.querySelectorAll('[data-clubs-tab]').forEach(button=>button.onclick=async()=>{if(await leave()){tab=button.dataset.clubsTab;chosenPilot=null;render();}});
    $('[data-cancel]')?.addEventListener('click',async()=>{if(await leave()){creating=false;render();}});
    body.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>button.dataset.action==='upload'?void uploadLogo():void execute(button.dataset.action,{memberId:button.dataset.member||chosenPilot?.publicId,clubId:$('[data-club]')?.value}));
    body.querySelectorAll('input,textarea,select').forEach(node=>node.addEventListener('input',()=>{dirty=true;}));
    $('[data-pilot-search]')?.addEventListener('input',()=>void searchPilot());
    list();
    if(!type&&tab==='profile'&&!selected.profile){body.querySelector('[type=submit]').disabled=true;feedback(t('unavailable'),'error');}
  }
  function historyLabel(action) {
    const map={'club.create':'create','team.create':'create','entity.admin_update':'save','entity.admin_logo_clear':'logoClear','entity.admin_affiliation':'affiliationSave','membership.admin_add':'add','membership.admin_remove':'remove','leadership.transfer':'transfer','moderation.approved':'approve','moderation.rejected':'reject','logo.approved':'upload','entity.suspended':'suspend','entity.restored':'restore','entity.archived':'archive','club.revise':'textChanges','team.revise':'textChanges'};
    return map[action]?t(map[action]):language()==='ru'?'Изменение сообщества':'Community change';
  }
  async function searchPilot() {
    const input=$('[data-pilot-search]'),query=input.value;chosenPilot=null;$('[data-pilot-selected]').textContent='';
    const results=$('[data-pilot-results]'); results.replaceChildren();if(query.trim().length<2)return;
    try {
      if(!pilots)pilots=await loadPilotIndex({client:createHttpClient(),dataBaseUrl:'https://data.asgracing.ru/top-data'});
      if(input!==$('[data-pilot-search]')||input.value!==query)return;
      const matches=filterPilots(pilots,query,{excludedPublicIds:creating?[]:(selected?.members||[]).map(member=>member.public_id),limit:12});
      results.innerHTML=matches.map(pilot=>`<button type="button" data-pilot="${esc(pilot.publicId)}">${esc(pilot.displayName)} <small>${esc(pilot.publicId)}</small></button>`).join('')||`<p>${t('noPilots')}</p>`;
      results.querySelectorAll('[data-pilot]').forEach(button=>button.onclick=()=>{chosenPilot=matches.find(pilot=>pilot.publicId===button.dataset.pilot);$('[data-pilot-selected]').textContent=`${t('selected')}: ${chosenPilot.displayName}`;results.replaceChildren();});
    } catch {if(input===$('[data-pilot-search]'))results.textContent=t('pilotUnavailable');}
  }
  function clearLogo(){if(logoUrl)URL.revokeObjectURL(logoUrl);logoUrl='';logoFile=null;}
  async function inspectLogo(){clearLogo();const input=$('[data-logo-file]'),file=input.files[0];$('[data-logo-preview]').hidden=true;try{const meta=await inspectLogoFile(file);if(input!==$('[data-logo-file]')||input.files[0]!==file)return;logoFile=file;logoUrl=URL.createObjectURL(file);$('[data-logo-preview]').src=logoUrl;$('[data-logo-preview]').hidden=false;$('[data-logo-info]').textContent=`${meta.width}×${meta.height} · ${Math.ceil(meta.byteSize/1024)} KB`;}catch(e){error(e);}finally{controls();}}
  function savePending(){const key=`asg-clubs-command:${user}`;try{pending?sessionStorage.setItem(key,JSON.stringify(pending)):sessionStorage.removeItem(key);}catch{}$('[data-pending]').hidden=!pending;controls();}
  async function execute(action,extra={}){
    if(!ready())return;
    const valid=managementCommand({entity:selected,action,reason:$('[data-reason]')?.value,...extra});
    if(!valid.ok){error({code:valid.code});$('[data-feedback]').scrollIntoView({block:'nearest'});return;}
    const title=creating?t('create'):action.includes('archived')?`${t('archive')} — ${t('archiveHint')}`:action==='portal.team.set_club'?`${t('affiliationSave')} — ${t('affiliationMoveHint')}`:action==='portal.leadership.transfer'?t('transfer'):action==='portal.membership.admin_remove'?t('remove'):action==='portal.membership.admin_add'?t('add'):action==='portal.entity.logo_clear'?t('logoClear'):action.endsWith(':rejected')?t('reject'):action.endsWith(':approved')?t(action.includes('set_status')?'restore':'approve'):action.endsWith(':suspended')?t('suspend'):t('save');
    const actionUser=user;
    busy=true;controls();
    try {
      const subject = extra.memberId ? (selected?.members||[]).find(member=>member.public_id===extra.memberId)?.display_name || chosenPilot?.displayName || extra.memberId : '';
      if(!await confirmAction(`${title}: ${creating ? valid.payload.fields?.display_name : selected?.display_name}${subject?' · '+subject:''}?`))return;
      if(actionUser!==user||!auth()?.permissions?.portalManage)return;
      const result=await api('/v1/portal-ops/clubs-teams/commands',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':auth().csrfToken},body:JSON.stringify({command_type:valid.commandType,payload:valid.payload,expected_entity_version:valid.expectedEntityVersion,idempotency_key:createIdempotencyKey()})});
      if(actionUser!==user||!auth()?.permissions?.portalManage)return;
      pending={id:result.command.command_id,kind:'command'};savePending();feedback(t('queued'));await poll();
    }catch(e){error(e);}finally{busy=false;controls();}
  }
  async function uploadLogo(){if(!ready()||!logoFile)return;busy=true;controls();try{if(!await confirmAction(`${t('upload')}: ${selected.display_name}?`))return;const result=await api(`/v1/portal-ops/clubs-teams/assets/${selected.entity_type}/${encodeURIComponent(selected.public_id)}?expected_entity_version=${selected.row_version}`,{method:'POST',headers:{'Content-Type':logoFile.type,'X-CSRF-Token':auth().csrfToken},body:logoFile});pending={id:result.asset.asset_id,kind:'asset'};savePending();feedback(t('queued'));await poll();}catch(e){error(e);}finally{busy=false;controls();}}
  async function poll(){
    const target=pending;if(!target)return;
    for(let count=0;count<12;count++){
      await pause();if(target!==pending||!auth()?.permissions?.portalManage)return;
      const response=await api(target.kind==='asset'?`/v1/clubs-teams/assets/${encodeURIComponent(target.id)}`:`/v1/portal-ops/clubs-teams/commands/${encodeURIComponent(target.id)}`);
      const command=response.command||response.asset;
      if(target!==pending||!auth()?.permissions?.portalManage)return;
      if(command.status==='applied'){
        pending=null;savePending();dirty=false;const snapshot=command.receipt?.result?.entity_snapshot;
        if(snapshot){const index=(state.entities||[]).findIndex(entity=>entity.public_id===snapshot.public_id);if(index>=0)state.entities[index]=snapshot;else state.entities.push(snapshot);selected=snapshot;creating=false;tab='profile';render();}
        else {await load({preserve:false});}
        feedback(t('applied'),'success');return;
      }
      if(['rejected','conflict','expired','dead_letter'].includes(command.status)){pending=null;savePending();throw new Error(command.receipt?.error?.code||command.status);}
    }
    feedback(t('waitingHint'));
  }
  async function load({preserve=true}={}){
    const nextUser=auth()?.driver?.publicId||'';
    if(nextUser!==user){user=nextUser;state=null;selected=null;creating=false;dirty=false;pending=null;try{const saved=JSON.parse(sessionStorage.getItem(`asg-clubs-command:${user}`)||'null');if(saved&&['command','asset'].includes(saved.kind)&&/^[A-Za-z0-9_-]{1,160}$/.test(saved.id))pending=saved;}catch{}savePending();}
    const token=++generation;$('[data-summary]').textContent=t('loading');
    try{const data=await api('/v1/portal-ops/clubs-teams');if(token!==generation)return;state=data;$('[data-summary]').textContent=data.available?`${data.entities?.length||0} · ${t('synced')}: ${date(data.generated_at)}${data.stale?' · '+t('stale'):''}`:t('unavailable');
      if(selected){const current=(data.entities||[]).find(entity=>entity.public_id===selected.public_id);if(current){if(!preserve||!dirty){selected=current;render();}else if(current.row_version!==selected.row_version)feedback(t('version_conflict'),'error');}else if(!dirty){selected=null;render();}}
      list();
    }catch{state=null;$('[data-summary]').textContent=t('unavailable');controls();}
  }
  $('[data-refresh]').onclick=()=>void load();
  root.querySelectorAll('[data-create]').forEach(button=>button.onclick=async()=>{if(ready()&&await leave()){creating=button.dataset.create;chosenPilot=null;render();}});
  for(const selector of ['[data-query]','[data-type]','[data-status]'])$(selector).oninput=list;
  $('[data-resume]').onclick=async()=>{if(busy)return;busy=true;controls();try{await poll();}catch(e){error(e);}finally{busy=false;controls();}};
  controls();
  return {load,reset(){generation++;user='';state=null;selected=null;creating=false;dirty=false;pending=null;clearLogo();$('[data-pending]').hidden=true;$('[data-editor]').textContent=t('select');$('[data-list]').replaceChildren();feedback();controls();}};
}

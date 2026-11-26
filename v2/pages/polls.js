import {routeHref} from '../site-routing.js';
import {createPollsAPI} from './polls-api.js';
import {normalizePoll, pollStatus, pollPercent, pollRemaining, validatePollDraft, moscowInputToISO} from './polls-model.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 20V10h3v10M11 20V4h3v16M17 20v-7h3v7M3 20h19"/></svg>';

export async function mountPollsPage({view, language = 'ru', subscribe, admin = false, api = createPollsAPI()}) {
  const t = (ru, en) => language === 'en' ? en : ru;
  const q = selector => view.querySelector(selector);
  const href = (route, id) => routeHref(route, language) + (id ? '?id=' + encodeURIComponent(id) : '');
  const params = new URLSearchParams(location.search); let id = params.get('id');
  const detail = !admin && !!id; let isNew = admin && params.has('new');
  let poll = null, ballot = null, csrf = '', busy = false, dirty = false, dead = false, generation = 0;
  let filter = admin ? 'all' : params.get('filter') === 'archive' ? 'archive' : 'active', page = 1, query = '', timer, searchTimer;
  let loading = false, requestController = null, access = !admin, hadAuth = null, renderedStatus = null;
  const creationKey = crypto.randomUUID();
  let socialAvailable = false;
  const statuses = {draft:t('Черновик','Draft'), scheduled:t('Запланирован','Scheduled'), active:t('Проводится','Open'), closed:t('Завершён','Closed'), cancelled:t('Отменён','Cancelled')};
  const date = value => value ? new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ru-RU', {timeZone:'Europe/Moscow',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)) + t(' МСК',' MSK') : '—';
  const mode = value => value.mode === 'single' ? t('Один ответ','Single choice') : t(`До ${value.max_choices} ответов`,`Up to ${value.max_choices} choices`);
  const badge = value => `<span class="poll-badge" data-status="${pollStatus(value)}">${statuses[pollStatus(value)] || ''}</span>`;
  const button = (label, action, primary = false) => `<button class="button${primary ? ' primary' : ''}" type="button" data-poll-action="${action}">${label}</button>`;
  const publicLink = value => href('polls/view/', value.id);
  const socialSummary = value => value?.notify_socials
    ? t('Уведомления включены: начало и итоги — с @everyone в Discord и закреплением с уведомлением в Telegram.','Notifications on: announce opening and results with @everyone in Discord and a notified pin in Telegram.')
    : t('Уведомления выключены. Итоги будут отправлены в оба канала без массового упоминания и закрепления.','Notifications off. Results will still go to both channels without a mass mention or pin.');
  const loginURL = new URL('/v1/auth/steam/start','https://auth.asgracing.ru');
  loginURL.searchParams.set('return_path', location.pathname + location.search);
  view.className = 'asg-polls';
  view.innerHTML = `<nav class="poll-breadcrumb" aria-label="${t('Навигация','Breadcrumb')}"><a href="${href(admin ? 'moderation/' : '')}">${admin ? t('Модерация','Moderation') : t('Главная','Home')}</a><span>/</span>${id || isNew ? `<a href="${href(admin ? 'moderation/polls/' : 'polls/')}">${t('Опросы','Polls')}</a><span>/</span>` : ''}<span>${admin ? t('Управление опросами','Poll management') : detail ? t('Голосование','Vote') : t('Опросы','Polls')}</span></nav>
    <header class="poll-heading"><div><div class="poll-eyebrow">${icon}<span>ASG COMMUNITY</span></div><h1>${admin ? t('Управление опросами','Poll management') : detail ? t('Ваш голос имеет значение','Your voice matters') : t('Решаем вместе','Decide together')}</h1><p>${admin ? t('Задайте вопрос сообществу. Всё остальное — по расписанию.','Ask the community. Let the schedule take care of the rest.') : t('Выбираем трассы, время гонок и то, каким будет ASG.','Choose tracks, race times and what comes next for ASG.')}</p></div>${admin ? `<a class="button" href="${href('polls/')}">${t('Все опросы','Public polls')} ↗</a>` : ''}</header>
    <div class="poll-notice" role="status" aria-live="polite" data-notice hidden></div>
    <div data-poll-content><section class="panel poll-empty" aria-busy="true"><span class="poll-loader" aria-hidden="true"></span><p>${t('Загружаем опросы…','Loading polls…')}</p></section></div>
    <dialog class="poll-confirm"><form method="dialog"><h2 data-confirm-title></h2><p data-confirm-copy></p><div class="poll-actions"><button class="button" value="cancel">${t('Назад','Back')}</button><button class="button primary" value="confirm">${t('Подтвердить','Confirm')}</button></div></form></dialog>`;
  const content = q('[data-poll-content]'), notice = q('[data-notice]'), dialog = q('dialog');
  function say(text, kind = '') { notice.textContent = text; notice.dataset.kind = kind; notice.hidden = !text; }
  function errorText(error) {
    if (error.message === 'polls_delivery_unavailable') return t('Сначала нужно настроить каналы результатов. Опрос остаётся в черновиках.','Result delivery must be configured first. Your poll remains a draft.');
    if (error.status === 422) return t('Проверьте поля: вопрос, варианты, режим выбора и срок.','Check the question, options, selection mode and duration.');
    if (error.status === 401) return t('Войдите через Steam, чтобы продолжить.','Sign in with Steam to continue.');
    if (error.status === 403) return t('Недостаточно прав. Действие не выполнено.','You do not have permission. No action was taken.');
    if (error.status === 409) return t('Опрос или ваш ответ изменился. Данные обновлены — проверьте выбор.','The poll or your ballot changed. Review the refreshed data.');
    if (error.status === 429) return t('Слишком много запросов. Подождите немного и повторите.','Too many requests. Please wait and try again.');
    return t('Не удалось связаться с сервисом. Проверьте соединение и повторите.','Could not reach the service. Check your connection and try again.');
  }
  function errorScreen(error) {
    const forbidden = [401,403].includes(error.status);
    content.innerHTML = `<section class="panel poll-empty">${icon}<h2>${error.status === 404 ? t('Опрос не найден','Poll not found') : forbidden ? t('Доступ к управлению','Administrator access') : t('Опросы временно недоступны','Polls are temporarily unavailable')}</h2><p>${error.status === 404 ? t('Проверьте ссылку или откройте список опросов.','Check the link or open the poll directory.') : errorText(error)}</p><div class="poll-actions">${error.status === 401 ? `<a class="button primary" href="${escape(loginURL.href)}">${t('Войти через Steam','Sign in with Steam')}</a>` : ''}${button(t('Повторить','Retry'),'retry')}<a class="button" href="${href('polls/')}">${t('Все опросы','All polls')}</a></div></section>`;
  }
  function confirmAction(action, draft = null) {
    q('[data-confirm-title]').textContent = action === 'close' ? t('Завершить опрос?','Close this poll?') : action === 'cancel' ? t('Отменить опрос?','Cancel this poll?') : t('Опубликовать опрос?','Publish this poll?');
    q('[data-confirm-copy]').textContent = action === 'close' ? t('Приём голосов прекратится. Открыть этот опрос заново нельзя. ','Voting will stop. This poll cannot be reopened. ') + socialSummary(poll) : action === 'cancel' ? t('Опрос останется в архиве с отметкой «Отменён». Победитель не объявляется.','The poll will remain in the archive as cancelled. No winner will be announced.') : t('Проверьте вопрос, варианты и срок. После появления голосов изменить вопрос и ответы нельзя.','Check the question, choices and deadline. The question and options cannot change once voting starts.');
    let preview = dialog.querySelector('.poll-confirm-preview');
    if (!preview) { preview = document.createElement('div'); preview.className = 'poll-confirm-preview'; dialog.querySelector('.poll-actions').before(preview); }
    preview.hidden = !['publish','preview'].includes(action);
    if (!preview.hidden) {
      const value = draft || poll, start = value.starts_at || new Date().toISOString();
      const end = value.ends_at || new Date(Date.parse(start) + value.duration_hours * 3600000).toISOString();
      preview.innerHTML = `<strong>${escape(value.title)}</strong>${value.description ? `<p>${escape(value.description)}</p>` : ''}<ol>${value.options.map(option=>`<li>${escape(typeof option === 'string' ? option : option.label)}</li>`).join('')}</ol><p>${mode(value)}</p><p>${t('Окончание: ','Ends: ')}${date(end)}</p><p data-social-preview>${socialSummary(value)}</p>`;
    }
    dialog.querySelector('[value="cancel"]').hidden = action === 'preview';
    dialog.querySelector('[value="confirm"]').textContent = action === 'preview' ? t('Готово','Done') : t('Подтвердить','Confirm');
    if (action === 'preview') q('[data-confirm-title]').textContent = t('Предпросмотр опроса','Poll preview');
    dialog.returnValue = ''; dialog.showModal();
    return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), {once:true}));
  }
  function renderList(data) {
    if (!Array.isArray(data.polls) || !Number.isSafeInteger(data.total) || data.total < 0) throw Error('invalid_response');
    const polls = data.polls.map(normalizePoll);
    const filters = admin ? [['all',t('Все','All')],['draft',t('Черновики','Drafts')],['active',t('Активные','Open')],['archive',t('Архив','Archive')]] : [['active',t('Текущие','Current')],['scheduled',t('Скоро','Upcoming')],['archive',t('Архив','Archive')]];
    content.innerHTML = `<div class="poll-toolbar"><div class="poll-tabs" role="group" aria-label="${t('Статус опросов','Poll status')}">${filters.map(([key,label]) => `<button type="button" data-filter="${key}" aria-pressed="${filter === key}">${label}</button>`).join('')}</div>${admin ? `<a class="button primary" href="${href('moderation/polls/')}?new=1">+ ${t('Создать опрос','Create poll')}</a>` : ''}<label class="poll-search"><span class="sr-only">${t('Поиск опросов','Search polls')}</span><input type="search" maxlength="100" placeholder="${t('Найти опрос…','Find a poll…')}" value="${escape(query)}" data-search></label></div>
      <div class="poll-list-summary">${t('Опросов','Polls')}: ${data.total}</div>
      <div class="poll-grid">${polls.map(value => `<article class="panel poll-card"><div class="poll-card-top">${badge(value)}<span class="poll-card-mode">${mode(value)}</span></div><h2><a href="${admin ? href('moderation/polls/',value.id) : publicLink(value)}">${escape(value.title)}</a></h2>${value.description ? `<p class="poll-card-description">${escape(value.description)}</p>` : ''}<div class="poll-card-sample" aria-hidden="true">${value.options.slice(0,3).map(option => `<span style="--poll-color:${option.color};--poll-width:${Math.max(5,pollPercent(option.count,value.participants))}%"></span>`).join('')}</div><div class="poll-card-bottom"><span>${value.participants} ${t('участников','participants')}</span><span>${pollRemaining(value,language) ? `${pollStatus(value) === 'scheduled' ? t('Начнётся через','Starts in') : t('Осталось','Left')} ${pollRemaining(value,language)}` : date(value.ends_at)}</span></div><a class="poll-card-link" href="${admin ? href('moderation/polls/',value.id) : publicLink(value)}">${admin ? t('Управлять','Manage') : pollStatus(value) === 'active' ? t('Открыть опрос','Open poll') : t('Посмотреть','View poll')} <span aria-hidden="true">↗</span></a></article>`).join('') || `<section class="panel poll-empty">${icon}<h2>${query ? t('Ничего не найдено','No matches') : filter === 'archive' ? t('Здесь будет история решений','Your decisions will live here') : t('Новые опросы скоро появятся','New polls are coming')}</h2><p>${query ? t('Попробуйте другой запрос.','Try another search.') : t('Когда опрос появится, здесь будут его вопрос, сроки и результаты.','Questions, deadlines and results will appear here when a poll is published.')}</p></section>`}</div>
      <nav class="poll-pagination" aria-label="${t('Страницы опросов','Poll pages')}">${button(t('← Назад','← Previous'),'previous')}<span>${t('Страница','Page')} ${page}</span>${button(t('Далее →','Next →'),'next')}</nav>
      <p class="poll-footnote">${t('Один аккаунт — один бюллетень. Имена и ответы участников не публикуются.','One account, one ballot. Voter names and individual answers stay private.')}</p>`;
    q('[data-poll-action="previous"]').disabled = page === 1;
    q('[data-poll-action="next"]').disabled = page * 12 >= data.total;
  }
  function renderDetail() {
    renderedStatus = pollStatus(poll);
    q('.poll-heading').hidden = true;
    document.title = poll.title + ' · ASG Racing';
    const active = pollStatus(poll) === 'active', editable = active && ballot?.authenticated;
    const selected = new Set(ballot?.choices || []);
    content.innerHTML = `<div class="poll-detail-layout"><article class="panel poll-ballot"><div class="poll-card-top">${badge(poll)}<button class="poll-text-button" type="button" data-poll-action="share">${t('Поделиться','Share')} ↗</button></div><h1>${escape(poll.title)}</h1>${poll.description ? `<p class="poll-description">${escape(poll.description)}</p>` : ''}<p class="poll-detail-meta"><span data-total-inline>${poll.participants} ${t('участников','participants')}</span><span data-inline-deadline>${pollRemaining(poll,language) ? t('Осталось ','Left ') + pollRemaining(poll,language) : statuses[pollStatus(poll)]}</span></p><form data-ballot><fieldset class="poll-choices"><legend>${mode(poll)}</legend>${poll.options.map(option => `<label class="poll-option"><input type="${poll.mode === 'single' ? 'radio' : 'checkbox'}" name="choice" value="${escape(option.id)}"${selected.has(option.id) ? ' checked' : ''}${editable ? '' : ' disabled'}><span class="poll-option-body"><span class="poll-option-label">${escape(option.label)}</span><span class="poll-option-results"><b data-option-count="${escape(option.id)}">${option.count}</b><span data-option-percent="${escape(option.id)}">${pollPercent(option.count,poll.participants).toFixed(1)}%</span></span><span class="poll-bar" aria-hidden="true"><span data-option-bar="${escape(option.id)}" style="--poll-color:${option.color};width:${pollPercent(option.count,poll.participants)}%"></span></span></span></label>`).join('')}</fieldset>
      ${active ? editable ? `<div class="poll-ballot-actions"><button class="button primary" type="submit" data-vote>${selected.size ? t('Сохранить ответ','Save changes') : t('Проголосовать','Vote')}</button>${button(t('Отозвать ответ','Withdraw'),'withdraw')}<span data-choice-hint>${t('Выберите ответ','Select an answer')}</span></div>` : `<div class="poll-signin"><p>${t('Войдите, чтобы ваш голос был учтён.','Sign in to make your vote count.')}</p><a class="button primary" href="${escape(loginURL.href)}">${t('Войти через Steam','Sign in with Steam')}</a></div>` : `<div class="poll-ended">${pollStatus(poll) === 'scheduled' ? t('Голосование откроется в указанное время.','Voting opens at the scheduled time.') : pollStatus(poll) === 'cancelled' ? t('Опрос отменён. Победитель не объявляется.','This poll was cancelled. No winner will be announced.') : t('Приём голосов завершён. Здесь сохранены окончательные результаты.','Voting is closed. These are the final results.')}</div>`}</form><p class="poll-footnote">${poll.mode === 'multiple' ? t('Процент — доля участников, выбравших вариант. Сумма может превышать 100%.','Percentages show the share of participants choosing each option. The sum may exceed 100%.') : t('Процент — доля участников, выбравших вариант.','Percentages show the share of participants choosing each option.')}</p></article>
      <aside class="poll-detail-aside"><section class="panel poll-facts"><span class="poll-eyebrow">${t('ГОЛОС СООБЩЕСТВА','COMMUNITY VOICE')}</span><strong class="poll-participants" data-participants>${poll.participants}</strong><span class="poll-muted">${t('участников','participants')}</span><hr><div><span>${t('Статус','Status')}</span><b data-live-status>${statuses[pollStatus(poll)]}</b></div><div><span>${t('Осталось','Remaining')}</span><b data-remaining>${pollRemaining(poll,language) || '—'}</b></div><div><span>${t('Начало','Starts')}</span><time>${date(poll.starts_at)}</time></div><div><span>${t('Окончание','Ends')}</span><time>${date(poll.ends_at)}</time></div></section><section class="poll-privacy">${icon}<h3>${t('Ответы анонимны','Answers stay private')}</h3><p>${t('Показываем только количество и проценты. Ваш ответ можно изменить до завершения.','Only counts and percentages are public. You can change your answer until the poll closes.')}</p></section><a class="poll-back" href="${href('polls/')}">← ${t('Все опросы','All polls')}</a></aside></div>`;
    dirty = false;
    if (editable) updateChoiceHint();
  }
  function selectedChoices() { return [...view.querySelectorAll('[name="choice"]:checked')].map(input => input.value); }
  function updateChoiceHint() {
    const choices = selectedChoices(), max = poll.max_choices;
    q('[data-choice-hint]').textContent = choices.length ? t(`Выбрано ${choices.length} из ${max}`,`${choices.length} of ${max} selected`) : t('Выберите ответ','Select an answer');
    q('[data-vote]').disabled = busy || !choices.length || choices.length > max || pollStatus(poll) !== 'active';
    q('[data-poll-action="withdraw"]').disabled = busy || !ballot?.choices?.length;
    for (const input of view.querySelectorAll('[name="choice"]')) input.disabled = busy || pollStatus(poll) !== 'active' || (poll.mode === 'multiple' && choices.length >= max && !input.checked);
  }
  function updateResults(value) {
    const oldStatus = renderedStatus, newStatus = pollStatus(value); poll = value;
    if (oldStatus !== newStatus || (!['active','scheduled'].includes(newStatus) && q('[data-vote]'))) { renderDetail(); return; }
    q('[data-participants]').textContent = poll.participants;
    q('[data-total-inline]').textContent = poll.participants + ' ' + t('участников','participants');
    for (const option of poll.options) {
      // Match dataset values instead of interpolating untrusted option IDs into selectors.
      for (const node of view.querySelectorAll('[data-option-count]')) if (node.dataset.optionCount === option.id) node.textContent = option.count;
      for (const node of view.querySelectorAll('[data-option-percent]')) if (node.dataset.optionPercent === option.id) node.textContent = pollPercent(option.count,poll.participants).toFixed(1) + '%';
      for (const node of view.querySelectorAll('[data-option-bar]')) if (node.dataset.optionBar === option.id) node.style.width = pollPercent(option.count,poll.participants) + '%';
    }
    updateClock();
  }
  function updateClock() {
    if (!poll || !detail) return;
    if (renderedStatus !== pollStatus(poll)) { renderDetail(); return; }
    const inline = q('[data-inline-deadline]'); if (inline) inline.textContent = pollRemaining(poll,language) ? t('Осталось ','Left ') + pollRemaining(poll,language) : statuses[pollStatus(poll)];
    const remaining = q('[data-remaining]'); if (remaining) remaining.textContent = pollRemaining(poll,language) || '—';
    const status = q('[data-live-status]'); if (status) status.textContent = statuses[pollStatus(poll)];
    if (q('[data-vote]')) updateChoiceHint();
  }
  function deliveryPanel(value) {
    const names = {pending:t('Ожидает отправки','Pending'),sending:t('Отправляется','Sending'),sent:t('Доставлено','Delivered'),retry:t('Повтор по расписанию','Retry scheduled'),ambiguous:t('Нужна проверка отправки','Delivery needs review'),failed:t('Ошибка доставки','Delivery failed')};
    const kinds = {opened:t('Начало','Opening'),closed:t('Итоги','Results'),pin_opened:t('Закрепление анонса','Opening pin'),pin_closed:t('Закрепление итогов','Results pin')};
    const rows = value?.delivery || [];
    return `<section class="panel poll-destinations"><h3>${t('Результаты отправляются всегда','Results are always sent')}</h3><p>${t('Автоматически после завершения — по сроку или вручную.','Automatically when the poll closes, on schedule or manually.')}</p><div><span>Telegram</span><a href="https://t.me/ASG_racing/44514" target="_blank" rel="noopener noreferrer">ASG Racing ↗</a></div><div><span>Discord</span><code>1529068060286128218</code></div>${rows.map(row => `<p class="poll-delivery" data-state="${escape(row.status)}">${escape(row.destination === 'telegram' ? 'Telegram' : 'Discord')} · ${escape(kinds[row.kind] || t('Доставка','Delivery'))}: <b>${escape(names[row.status] || t('Неизвестно','Unknown'))}</b></p>`).join('')}</section>`;
  }
  function renderEditor() {
    const locked = poll && poll.status !== 'draft';
    const labels = poll ? poll.options.map(option => option.label) : ['', ''];
    content.innerHTML = `<div class="poll-editor-layout"><form class="panel poll-editor" data-editor><div class="poll-card-top"><h2>${poll ? t('Настройки опроса','Poll settings') : t('Новый опрос','New poll')}</h2>${poll ? badge(poll) : ''}</div><fieldset${locked ? ' disabled' : ''}><legend class="sr-only">${t('Вопрос и варианты','Question and choices')}</legend><label>${t('Вопрос','Question')}<input name="title" required maxlength="200" placeholder="${t('Какая трасса будет следующей?','Which track should be next?')}" value="${escape(poll?.title || '')}"></label><label>${t('Описание','Description')}<span class="poll-muted">${t('Необязательно · до 2000 символов','Optional · up to 2000 characters')}</span><textarea name="description" maxlength="2000" rows="3" placeholder="${t('Короткий контекст поможет сделать выбор','A little context helps people choose')}">${escape(poll?.description || '')}</textarea></label><div class="poll-editor-label">${t('Варианты ответа','Answer options')}<span class="poll-muted">2–10</span></div><div class="poll-answer-inputs" data-answers>${labels.map((label,index) => answerInput(label,index)).join('')}</div><button class="poll-add" type="button" data-poll-action="add">+ ${t('Добавить вариант','Add option')}</button><div class="poll-editor-grid"><label>${t('Режим','Selection mode')}<select name="mode"><option value="single"${poll?.mode !== 'multiple' ? ' selected' : ''}>${t('Один вариант','Single choice')}</option><option value="multiple"${poll?.mode === 'multiple' ? ' selected' : ''}>${t('Несколько вариантов','Multiple choices')}</option></select></label><label data-max-label>${t('Можно выбрать до','Maximum choices')}<input name="max_choices" type="number" min="1" max="10" value="${poll?.max_choices || 2}"></label></div><div class="poll-editor-grid"><label>${t('Продолжительность','Duration')}<select name="duration"><option value="24">${t('1 день','1 day')}</option><option value="48">${t('2 дня','2 days')}</option><option value="72" selected>${t('3 дня','3 days')}</option><option value="168">${t('7 дней','7 days')}</option><option value="custom">${t('Свой срок','Custom duration')}</option></select></label><label data-custom-label hidden>${t('Количество часов','Hours')}<input type="number" name="duration_hours" min="0.02" max="2160" step="0.01" value="72"></label><label>${t('Начало','Starts')}<select name="start_mode"><option value="now">${t('Сразу после публикации','When published')}</option><option value="scheduled">${t('По расписанию','Schedule a time')}</option></select></label><label data-start-label hidden>${t('Дата и время · МСК','Date and time · MSK')}<input type="datetime-local" name="starts_at"></label></div><p class="poll-deadline-preview" data-deadline-preview></p><label class="poll-social-toggle"><span class="poll-social-copy"><span class="poll-social-eyebrow">${t('Telegram и Discord','Telegram & Discord')}</span><strong>${t('Отправить уведомление в соцсети','Send social notifications')}</strong><span id="poll-social-description">${t('Анонс начала и итоги: @everyone в Discord; закрепление с уведомлением в Telegram.','Opening and results: @everyone in Discord; a notified pin in Telegram.')}</span></span><input type="checkbox" role="switch" name="notify_socials" aria-describedby="poll-social-description poll-social-note"${poll?.notify_socials ? ' checked' : ''}${socialAvailable ? '' : ' disabled'}><span class="poll-social-track" aria-hidden="true"></span></label><p class="poll-social-note" id="poll-social-note">${socialAvailable ? '' : t('Социальные уведомления пока недоступны. ', 'Social notifications are currently unavailable. ')}${t('По расписанию анонс уйдёт при открытии голосования. Итоги отправляются в оба канала всегда. Telegram учитывает настройки уведомлений участников.','Scheduled polls are announced when voting opens. Results always go to both channels. Telegram respects each member’s notification settings.')}</p></fieldset><p class="poll-footnote">${locked ? t('Опрос опубликован: вопрос и варианты защищены от изменений.','This poll is published: the question and options are locked.') : t('Голосовать сможет любой вошедший пользователь сайта.','Any signed-in site user can vote.')}</p><div class="poll-actions">${locked ? '' : `${button(t('Предпросмотр','Preview'),'preview')}<button class="button" type="submit" data-save>${t('Сохранить черновик','Save draft')}</button>`}${poll?.status === 'draft' ? button(t('Опубликовать','Publish'),'publish',true) : !poll ? '<button class="button primary" type="submit" name="publish" value="1">'+t('Опубликовать','Publish')+'</button>' : ''}${poll && ['active','scheduled'].includes(pollStatus(poll)) ? button(t('Завершить сейчас','Close now'),'close',true) + button(t('Отменить','Cancel'),'cancel') : ''}${poll && poll.status !== 'draft' ? `<a class="button" href="${publicLink(poll)}">${t('Открыть опрос','Open poll')} ↗</a>` : ''}</div><p class="poll-form-notice" role="status" data-form-notice></p></form><aside>${deliveryPanel(poll)}<section class="poll-editor-help"><h3>${t('Один вопрос — одно решение','One question, one decision')}</h3><p>${t('Для выбора трассы подойдёт один ответ. Для удобного времени разрешите несколько — так вы найдёте больше пересечений.','Use single choice to pick a track. Allow multiple choices for race times to find what works for more people.')}</p><p>${t('Перед публикацией проверьте формулировки. Завершённый опрос нельзя открыть заново.','Check your wording before publishing. A closed poll cannot be reopened.')}</p></section></aside></div>`;
    if (poll?.status === 'draft' && poll.duration_hours) {
      q('[name="duration"]').value = 'custom'; q('[name="duration_hours"]').value = poll.duration_hours;
    }
    if (poll?.status === 'draft' && poll.starts_at) {
      q('[name="start_mode"]').value = 'scheduled';
      q('[name="starts_at"]').value = new Date(Date.parse(poll.starts_at) + 3 * 3600000).toISOString().slice(0,16);
    }
    if (!locked) updateEditor();
    dirty = false;
  }
  function answerInput(label,index) {
    return `<div class="poll-answer-input"><span aria-hidden="true">${index + 1}</span><input name="option" maxlength="120" required aria-label="${t('Вариант','Option')} ${index + 1}" placeholder="${t('Вариант','Option')} ${index + 1}" value="${escape(label)}"><button type="button" data-remove-option aria-label="${t('Удалить вариант','Remove option')} ${index + 1}">×</button></div>`;
  }
  function updateEditor() {
    const form = q('[data-editor]'), fields = form.elements;
    q('[data-max-label]').hidden = fields.mode.value !== 'multiple';
    q('[data-custom-label]').hidden = fields.duration.value !== 'custom';
    q('[data-start-label]').hidden = fields.start_mode.value !== 'scheduled';
    const hours = Number(fields.duration.value === 'custom' ? fields.duration_hours.value : fields.duration.value);
    const start = fields.start_mode.value === 'scheduled' ? moscowInputToISO(fields.starts_at.value) : new Date().toISOString();
    q('[data-deadline-preview]').textContent = start && hours > 0 && hours <= 2160 ? t('Окончание: ','Ends: ') + date(new Date(Date.parse(start) + hours * 3600000).toISOString()) : t('Укажите начало и срок опроса.','Set the start and duration.');
    const answers = [...view.querySelectorAll('[name="option"]')];
    view.querySelectorAll('.poll-answer-input').forEach((row,index) => {
      row.querySelector('span').textContent = index + 1;
      row.querySelector('input').setAttribute('aria-label',t('Вариант','Option') + ' ' + (index + 1));
      row.querySelector('button').setAttribute('aria-label',t('Удалить вариант','Remove option') + ' ' + (index + 1));
    });
    q('[data-poll-action="add"]').disabled = answers.length >= 10;
    view.querySelectorAll('[data-remove-option]').forEach(node => node.disabled = answers.length <= 2);
  }
  function draftFromForm() {
    const form = q('[data-editor]'), fields = form.elements;
    const draft = {...(socialAvailable ? {notify_socials:fields.notify_socials.checked} : {}),title:fields.title.value.trim(),description:fields.description.value.trim(),options:[...view.querySelectorAll('[name="option"]')].map(node => node.value.trim()),mode:fields.mode.value,max_choices:fields.mode.value === 'single' ? 1 : Number(fields.max_choices.value),duration_hours:Number(fields.duration.value === 'custom' ? fields.duration_hours.value : fields.duration.value),starts_at:fields.start_mode.value === 'scheduled' ? moscowInputToISO(fields.starts_at.value) : null,...(poll ? {revision:poll.revision} : {})};
    const issue = validatePollDraft(draft);
    if (issue || (fields.start_mode.value === 'scheduled' && (!draft.starts_at || Date.parse(draft.starts_at) <= Date.now()))) throw Object.assign(Error('invalid_draft'), {draftIssue:issue || 'start'});
    return draft;
  }
  async function load({refresh = false} = {}) {
    if (dead || loading) return;
    loading = true; const ticket = ++generation;
    requestController?.abort(); requestController = new AbortController(); const signal = requestController.signal;
    try {
      if (admin) {
        const data = id ? await api.adminDetail(id,signal) : await api.adminList({filter,page,limit:12,q:query},signal);
        if (dead || ticket !== generation) return;
        if (!data.csrf_token) throw Error('invalid_response');
        csrf = data.csrf_token; access = true;
        socialAvailable = data.capabilities?.social_notifications === true;
        if (id || isNew) { poll = id ? normalizePoll(data.poll) : null; renderEditor(); } else renderList(data);
      } else if (detail) {
        const data = await api.detail(id,signal); const value = normalizePoll(data.poll);
        const mine = refresh ? null : await api.ballot(id,signal);
        if (dead || ticket !== generation) return;
        if (!refresh) { ballot = mine; csrf = mine.csrf_token || ''; poll = value; renderDetail(); }
        else updateResults(value);
      } else {
        const data = await api.list({filter,page,limit:12,q:query},signal);
        if (dead || ticket !== generation) return;
        const activeSearch = document.activeElement?.matches('[data-search]'), selection = activeSearch ? document.activeElement.selectionStart : null;
        renderList(data);
        if (activeSearch) { q('[data-search]').focus(); q('[data-search]').setSelectionRange(selection,selection); }
      }
      if (refresh) say('');
    } catch (error) {
      if (dead || signal.aborted || ticket !== generation) return;
      if (refresh && content.children.length) say(t('Не удалось обновить результаты. Показаны последние полученные данные.','Could not refresh results. Showing the last received data.'));
      else { if (admin) { access = false; csrf = ''; } errorScreen(error); }
    } finally { if (ticket === generation) loading = false; }
  }
  async function mutate(action, submitter) {
    if (busy || dead || loading) return;
    const ticket = generation;
    try {
      if (admin) {
        if (!access || !csrf) return;
        if (action === 'save') {
          const draft = draftFromForm();
          const publish = submitter?.name === 'publish';
          if (publish && !(await confirmAction('publish',draft))) return;
          if (dead || ticket !== generation) return;
          busy = true; setBusy(true);
          const saved = await api.save(poll?.id,poll ? draft : {...draft,idempotency_key:creationKey},csrf);
          if (dead || ticket !== generation) return;
          poll = normalizePoll(saved.poll); dirty = false;
          id = poll.id; isNew = false;
          history.replaceState(null,'',href('moderation/polls/',poll.id));
          if (publish) poll = normalizePoll((await api.action(poll.id,'publish',poll.revision,csrf)).poll);
          if (dead || ticket !== generation) return;
          location.assign(href('moderation/polls/',poll.id)); return;
        }
        if (action === 'publish' && dirty) { say(t('Сначала сохраните изменения черновика.','Save your draft changes first.')); return; }
        if (!(await confirmAction(action))) return;
        if (dead || ticket !== generation) return;
        busy = true; setBusy(true);
        const result = await api.action(poll.id,action,poll.revision,csrf);
        if (dead || ticket !== generation) return;
        poll = normalizePoll(result.poll); renderEditor();
        say(t('Готово. Состояние опроса обновлено.','Done. Poll state updated.'));
      } else {
        if (!ballot?.authenticated || !csrf || pollStatus(poll) !== 'active') return;
        const choices = selectedChoices();
        if (action === 'vote' && (!choices.length || choices.length > poll.max_choices)) return;
        busy = true; setBusy(true);
        await (action === 'withdraw' ? api.withdraw(id,ballot.revision,csrf) : api.vote(id,choices,ballot.revision,csrf));
        if (dead || ticket !== generation) return;
        dirty = false; await load(); say(action === 'withdraw' ? t('Ваш ответ отозван.','Your ballot was withdrawn.') : t('Ваш голос учтён. Спасибо!','Your vote is counted. Thank you!'));
      }
    } catch (error) {
      if (dead || ticket !== generation) return;
      if (error.draftIssue) say(t('Проверьте вопрос, уникальность вариантов, ограничение выбора и срок.','Check the question, unique options, selection limit and duration.'));
      else { if ([401,403,409].includes(error.status)) { dirty = false; await load(); } say(errorText(error)); }
    } finally { busy = false; setBusy(false); }
  }
  function setBusy(value) {
    if (dead) return;
    content.setAttribute('aria-busy',String(value));
    if (detail && q('[data-vote]')) updateChoiceHint();
    if (admin) {
      for (const node of content.querySelectorAll('button')) node.disabled = value;
      const fields = q('[data-editor] fieldset'); if (fields) fields.disabled = value || (poll && poll.status !== 'draft');
      if (!value && fields && !fields.disabled) updateEditor();
    }
  }
  view.addEventListener('submit', event => {
    if (event.target.matches('[data-ballot],[data-editor]')) { event.preventDefault(); void mutate(admin ? 'save' : 'vote',event.submitter); }
  });
  view.addEventListener('change', event => {
    if (event.target.matches('[name="choice"]')) { dirty = true; updateChoiceHint(); }
    if (event.target.closest('[data-editor]')) { dirty = true; updateEditor(); }
  });
  view.addEventListener('input', event => {
    if (event.target.matches('[data-search]')) { query = event.target.value; page = 1; clearTimeout(searchTimer); searchTimer = setTimeout(() => void load(),350); }
    if (event.target.closest('[data-editor]')) { dirty = true; updateEditor(); }
  });
  view.addEventListener('click', event => {
    const filterButton = event.target.closest('[data-filter]');
    if (filterButton && !loading) { filter = filterButton.dataset.filter; page = 1; say(''); void load(); }
    const remove = event.target.closest('[data-remove-option]');
    if (remove && !busy && view.querySelectorAll('[name="option"]').length > 2) { remove.closest('.poll-answer-input').remove(); dirty = true; updateEditor(); }
    const action = event.target.closest('[data-poll-action]')?.dataset.pollAction;
    if (!action || busy) return;
    if (action === 'retry') void load();
    else if (action === 'previous' || action === 'next') { if (loading) return; page += action === 'next' ? 1 : -1; void load(); }
    else if (action === 'add') { const answers = q('[data-answers]'), length = answers.children.length; if (length < 10) { answers.insertAdjacentHTML('beforeend',answerInput('',length)); answers.lastElementChild.querySelector('input').focus(); dirty = true; updateEditor(); } }
    else if (action === 'share') { if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(() => say(t('Ссылка скопирована.','Link copied.'))).catch(() => say(t('Скопируйте адрес страницы из браузера.','Copy this page’s address from your browser.'))); else say(t('Скопируйте адрес страницы из браузера.','Copy this page’s address from your browser.')); }
    else if (action === 'preview') { try { void confirmAction('preview',draftFromForm()); } catch { say(t('Заполните вопрос и варианты, затем проверьте срок.','Fill in the question and options, then check the duration.')); } }
    else void mutate(action);
  });
  function onVisibility() { if (!document.hidden && !busy && !dirty && !admin) void load({refresh:detail && !!poll}); }
  document.addEventListener('visibilitychange',onVisibility);
  const onBeforeUnload = event => { if (dirty && admin) { event.preventDefault(); event.returnValue = ''; } };
  window.addEventListener('beforeunload',onBeforeUnload);
  window.addEventListener('pagehide',() => { dead = true; ++generation; requestController?.abort(); clearInterval(timer); clearTimeout(searchTimer); document.removeEventListener('visibilitychange',onVisibility); window.removeEventListener('beforeunload',onBeforeUnload); },{once:true});
  subscribe?.(({auth}) => {
    const key = JSON.stringify([!!auth?.authenticated,auth?.csrfToken || '']);
    if (hadAuth === null) { hadAuth = key; return; }
    if (hadAuth !== key) {
      hadAuth = key; ballot = null; csrf = ''; dirty = false; ++generation; loading = false; requestController?.abort();
      if (dialog.open) dialog.close('cancel');
      if (detail || admin) content.replaceChildren();
      if (detail || admin) void load();
    }
  });
  await load();
  timer = setInterval(() => {
    if (document.hidden || dead) return;
    updateClock();
    const needsRefresh = detail ? poll && !['closed','cancelled'].includes(poll.status) : filter !== 'archive';
    if (!admin && !busy && needsRefresh) void load({refresh:detail && !!poll});
  },30000);
  return {refresh:() => load()};
}

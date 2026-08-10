import { createAuthHeaderController } from "../../features/auth/header-auth.js";
import { createHttpClient } from "../../shared/http-client.js";
import { resolveRuntimeOverride } from "../../shared/runtime-config.js";
import { loadEntityDetail } from "../clubs-teams/detail-model.js";
import {
  ClubsTeamsCommandError,
  buildCreateEntityCommand,
  buildMembershipLeaveCommand,
  buildMembershipInviteCommand,
  buildMembershipRemoveCommand,
  buildMembershipRequestCommand,
  buildMembershipResolveCommand,
  buildTeamClubDetachCommand,
  buildTeamClubInviteCommand,
  buildTeamClubRequestCommand,
  buildTeamClubResolveCommand,
  buildReviseEntityCommand,
  normalizeCommandResponse
} from "./clubs-teams-command-model.js";
import { filterPilots, loadPilotIndex } from "./pilot-search-model.js?v=20260802pilotlimit2";

const AUTH_BASE_URL = "https://auth.asgracing.ru";

const COPY = {
  en: {
    eyebrow: "Driver account",
    title: "Your ASG Racing profile",
    loading: "Loading account…",
    signedOut: "Sign in with Steam to open your driver account.",
    signIn: "Sign in to driver account",
    noProfile: "The ASG driver profile has not been linked yet.",
    number: "Race number",
    noNumber: "Number not assigned",
    pending: number => `Request for #${number} is awaiting moderation.`,
    profile: "Open driver profile",
    settings: "Profile settings",
    overview: "Profile overview",
    discord: "Discord",
    linked: "Linked",
    notLinked: "Not linked",
    clubsTeams: "Clubs & teams",
    clubsTeamsUnavailable: "Club and team management is temporarily unavailable.",
    clubsTeamsStale: "The membership snapshot is unavailable or out of date. Changes remain disabled until it is refreshed.",
    clubsTeamsEmpty: "You are not currently listed in a club or team.",
    clubsTeamsCatalog: "Open clubs and teams catalog",
    club: "Club",
    team: "Team",
    pendingOperations: "Pending operations",
    recentOperations: "Recent operations",
    pendingRevision: "Changes awaiting review",
    ctRole_head: "Head",
    ctRole_captain: "Captain",
    ctRole_member: "Member",
    ctStatus_pending: "Pending",
    ctStatus_leased: "Processing",
    ctStatus_applied: "Applied",
    ctStatus_rejected: "Rejected",
    ctStatus_expired: "Expired",
    ctStatus_dead_letter: "Needs attention",
    ctStatus_approved: "Approved",
    ctStatus_suspended: "Suspended",
    ctStatus_archived: "Archived",
    createClub: "Create club",
    createTeam: "Create team",
    editClub: "Edit club",
    editTeam: "Edit team",
    managementBlocked: "Finish the pending operation before starting another one.",
    discordRequired: "Link Discord before creating or managing a club or team.",
    formCreate: value => `Create ${value}`,
    formEdit: value => `Edit ${value}`,
    displayName: "Name",
    shortName: "Short name",
    descriptionRu: "Description in Russian",
    descriptionEn: "Description in English",
    websiteUrl: "Website (HTTP or HTTPS)",
    teamAffiliation: "The team will be affiliated with your current club.",
    saveEntity: "Send for moderation",
    cancelEntity: "Cancel",
    loadingEntity: "Loading the approved profile…",
    invalidFields: "Check the name, field lengths and website address.",
    commandQueued: "The operation is queued. Its status will update in the account.",
    commandApplied: "The operation was accepted and sent for moderation.",
    membershipActions: "Membership requests and invitations",
    membershipRequest: "Membership request",
    membershipInvitation: "Invitation",
    membershipApplicant: "Applicant",
    membershipInvitee: "Invited driver",
    acceptMembership: "Accept",
    rejectMembership: "Reject",
    leaveMembership: "Leave",
    membershipExpires: value => `Expires ${value}`,
    confirmLeave: "Leave this membership?",
    confirmAccept: "Accept this membership action?",
    confirmReject: "Reject this membership action?",
    requestedMembership: value => `Request membership in ${value}`,
    sendMembershipRequest: "Send request",
    manageMembers: "Manage members",
    manageRoster: value => `Manage ${value} roster`,
    invitePilot: "Invite pilot",
    pilotSearch: "Search by pilot name",
    noPilotResults: "No matching available pilots.",
    removeMember: "Remove",
    confirmRemove: value => `Remove ${value} from this roster?`,
    confirmInvite: value => `Invite ${value}?`,
    rosterUnavailable: "The current roster or pilot index is unavailable.",
    teamClubActions: "Team and club affiliation",
    teamClubRequest: "Affiliation request",
    teamClubInvitation: "Club invitation",
    affiliationExpires: value => `Expires ${value}`,
    requestAffiliation: value => `Request affiliation with ${value}`,
    inviteAffiliation: value => `Invite ${value} to your club`,
    detachAffiliation: value => `Detach ${value} from its club`,
    sendAffiliation: "Send affiliation action",
    detachTeam: "Detach and archive team",
    detachWarning: "Detaching archives the team. Its current public team profile and active team operation will stop.",
    confirmDetach: "Detach this team from the club and archive it?",
    commandRejected: "The operation was rejected.",
    reauthRequired: "For security, sign in with Steam again and repeat the operation.",
    reauth: "Sign in again",
    nameTaken: "This club or team name is already reserved.",
    versionConflict: "The profile changed. Refresh the account before editing it again.",
    detailUnavailable: "The approved profile could not be loaded safely. Editing remains disabled.",
    numberSettings: "Race number settings",
    numberHelp: "Choose a globally unique number from 1 to 999. A new assignment must be approved.",
    numberLabel: "New number (1–999)",
    submit: "Submit request",
    cancel: "Cancel request",
    release: "Release current number",
    releaseConfirm: "Release your current race number immediately?",
    submitted: "Request sent for moderation.",
    cancelled: "Request cancelled.",
    released: "Number released.",
    blocked: "Race-number management is unavailable while the driver is banned.",
    cooldown: value => `You can change the number after ${value}.`,
    taken: "This number is already assigned or reserved.",
    failed: "The operation could not be completed. Try again.",
    navSpecial: "Special Event", navChampionship: "Championship", navRules: "Rules",
    navNews: "News", navRacing: "Racing", navLastRaces: "Last Races",
    navStats: "Stats", navCars: "Cars", navFunStats: "Fun Stats",
    navRating: "Rating", navBestLaps: "Best Laps", navSafety: "Safety Rating",
    navBans: "Ban List", navCommunity: "Community", navAbout: "About Server",
    footerText: "Statistics are generated from ACC Dedicated Server result files and published via GitHub Pages."
  },
  ru: {
    createClub: "Создать клуб",
    createTeam: "Создать команду",
    editClub: "Редактировать клуб",
    editTeam: "Редактировать команду",
    managementBlocked: "Завершите текущую операцию перед отправкой следующей.",
    discordRequired: "Привяжите Discord перед созданием или управлением клубом и командой.",
    formCreate: value => `Создать: ${value}`,
    formEdit: value => `Редактировать: ${value}`,
    displayName: "Название",
    shortName: "Короткое название",
    descriptionRu: "Описание на русском",
    descriptionEn: "Описание на английском",
    websiteUrl: "Сайт (HTTP или HTTPS)",
    teamAffiliation: "Команда будет привязана к вашему текущему клубу.",
    saveEntity: "Отправить на модерацию",
    cancelEntity: "Отмена",
    loadingEntity: "Загружаем подтверждённый профиль…",
    invalidFields: "Проверьте название, длину полей и адрес сайта.",
    commandQueued: "Операция поставлена в очередь. Статус обновится в кабинете.",
    commandApplied: "Операция принята и отправлена на модерацию.",
    membershipActions: "Заявки и приглашения",
    membershipRequest: "Заявка на вступление",
    membershipInvitation: "Приглашение",
    membershipApplicant: "Заявитель",
    membershipInvitee: "Приглашённый пилот",
    acceptMembership: "Принять",
    rejectMembership: "Отклонить",
    leaveMembership: "Покинуть",
    membershipExpires: value => `Действует до ${value}`,
    confirmLeave: "Покинуть это объединение?",
    confirmAccept: "Принять это приглашение или заявку?",
    confirmReject: "Отклонить это приглашение или заявку?",
    requestedMembership: value => `Заявка на вступление: ${value}`,
    sendMembershipRequest: "Отправить заявку",
    manageMembers: "Управлять составом",
    manageRoster: value => `Управление составом: ${value}`,
    invitePilot: "Пригласить пилота",
    pilotSearch: "Поиск по имени пилота",
    noPilotResults: "Подходящие пилоты не найдены.",
    removeMember: "Исключить",
    confirmRemove: value => `Исключить ${value} из состава?`,
    confirmInvite: value => `Пригласить ${value}?`,
    rosterUnavailable: "Не удалось загрузить актуальный состав или список пилотов.",
    teamClubActions: "Связь команды и клуба",
    teamClubRequest: "Заявка на присоединение",
    teamClubInvitation: "Приглашение от клуба",
    affiliationExpires: value => `Действует до ${value}`,
    requestAffiliation: value => `Подать заявку в клуб ${value}`,
    inviteAffiliation: value => `Пригласить команду ${value} в ваш клуб`,
    detachAffiliation: value => `Отсоединить команду ${value} от клуба`,
    sendAffiliation: "Отправить действие",
    detachTeam: "Отсоединить и архивировать команду",
    detachWarning: "Отсоединение архивирует команду. Её публичный профиль и активная работа команды будут остановлены.",
    confirmDetach: "Отсоединить команду от клуба и архивировать её?",
    commandRejected: "Операция отклонена.",
    reauthRequired: "Для безопасности снова войдите через Steam и повторите операцию.",
    reauth: "Войти снова",
    nameTaken: "Название клуба или команды уже зарезервировано.",
    versionConflict: "Профиль изменился. Обновите кабинет перед повторным редактированием.",
    detailUnavailable: "Не удалось безопасно загрузить подтверждённый профиль. Редактирование отключено.",
    clubsTeams: "Клубы и команды",
    clubsTeamsUnavailable: "Управление клубами и командами временно недоступно.",
    clubsTeamsStale: "Снимок состава недоступен или устарел. Изменения заблокированы до его обновления.",
    clubsTeamsEmpty: "Сейчас вы не состоите в клубе или команде.",
    clubsTeamsCatalog: "Открыть каталог клубов и команд",
    club: "Клуб",
    team: "Команда",
    pendingOperations: "Операций в ожидании",
    recentOperations: "Последние операции",
    pendingRevision: "Изменения ожидают проверки",
    ctRole_head: "Руководитель",
    ctRole_captain: "Капитан",
    ctRole_member: "Участник",
    ctStatus_pending: "Ожидает",
    ctStatus_leased: "Обрабатывается",
    ctStatus_applied: "Выполнено",
    ctStatus_rejected: "Отклонено",
    ctStatus_expired: "Истекло",
    ctStatus_dead_letter: "Требует внимания",
    ctStatus_approved: "Подтверждено",
    ctStatus_suspended: "Приостановлено",
    ctStatus_archived: "В архиве",
    eyebrow: "Личный кабинет гонщика",
    title: "Ваш профиль ASG Racing",
    loading: "Загружаем кабинет…",
    signedOut: "Войдите через Steam, чтобы открыть личный кабинет.",
    signIn: "Войти в личный кабинет",
    noProfile: "Профиль пилота ASG пока не найден.",
    number: "Гоночный номер",
    noNumber: "Номер не привязан",
    pending: number => `Заявка на номер #${number} ожидает модерации.`,
    profile: "Открыть профиль пилота",
    settings: "Настройки профиля",
    overview: "Обзор профиля",
    discord: "Discord",
    linked: "Привязан",
    notLinked: "Не привязан",
    numberSettings: "Настройки гоночного номера",
    numberHelp: "Выберите глобально уникальный номер от 1 до 999. Новое назначение подтверждается вручную.",
    numberLabel: "Новый номер (1–999)",
    submit: "Отправить заявку",
    cancel: "Отменить заявку",
    release: "Освободить текущий номер",
    releaseConfirm: "Сразу освободить текущий гоночный номер?",
    submitted: "Заявка отправлена на модерацию.",
    cancelled: "Заявка отменена.",
    released: "Номер освобождён.",
    blocked: "Управление номером недоступно во время бана.",
    cooldown: value => `Изменить номер можно после ${value}.`,
    taken: "Этот номер уже назначен или зарезервирован.",
    failed: "Не удалось выполнить операцию. Попробуйте ещё раз.",
    navSpecial: "Спецсобытие", navChampionship: "Чемпионат", navRules: "Правила",
    navNews: "Новости", navRacing: "Гонки", navLastRaces: "Последние гонки",
    navStats: "Статистика", navCars: "Машины", navFunStats: "Забавная статистика",
    navRating: "Рейтинг", navBestLaps: "Лучшие круги", navSafety: "Рейтинг безопасности",
    navBans: "Список банов", navCommunity: "Сообщество", navAbout: "О сервере",
    footerText: "Статистика формируется из файлов результатов ACC Dedicated Server и публикуется через GitHub Pages."
  }
};

function language() {
  let stored = "";
  try {
    stored = localStorage.getItem("asgLang") || "";
  } catch {
    stored = "";
  }
  return stored === "ru" ? "ru" : "en";
}

function t(key, value) {
  const entry = COPY[language()][key] ?? COPY.en[key] ?? key;
  return typeof entry === "function" ? entry(value) : entry;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function accountLoginUrl() {
  const returnPath = `${location.pathname}${location.search}`;
  return `${AUTH_BASE_URL}/v1/auth/steam/start?return_path=${encodeURIComponent(returnPath)}`;
}

let flashMessage = { text: "", kind: "" };
let clubsTeamsFlash = { text: "", kind: "" };

function setMessage(text = "", kind = "") {
  flashMessage = { text, kind };
  const element = document.getElementById("account-message");
  if (!element) return;
  element.textContent = text;
  element.dataset.kind = kind;
}

function numberBadge(preferences) {
  const number = preferences?.raceNumber;
  return `<span class="account-number${number ? "" : " account-number--empty"}">${number ? `#${number}` : t("noNumber")}</span>`;
}

function formatAccountDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat(language() === "ru" ? "ru-RU" : "en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  }).format(date);
}

function membershipRequestFromLocation() {
  const params = new URLSearchParams(location.search);
  const targetType = params.get("membership_type");
  const targetPublicId = String(params.get("membership_target") || "").trim();
  const targetName = String(params.get("membership_name") || "").normalize("NFKC").trim();
  if (!["club", "team"].includes(targetType)
    || targetPublicId.length > 160
    || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(targetPublicId)
    || !targetName || targetName.length > 200) return null;
  return { targetType, targetPublicId, targetName };
}

function affiliationTargetFromLocation() {
  const params = new URLSearchParams(location.search);
  const action = params.get("affiliation_action");
  const targetPublicId = String(params.get("affiliation_target") || "").trim();
  const targetName = String(params.get("affiliation_name") || "").normalize("NFKC").trim();
  if (!["request", "invite", "detach"].includes(action)
    || targetPublicId.length > 160
    || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(targetPublicId)
    || !targetName || targetName.length > 200) return null;
  return { action, targetPublicId, targetName };
}

function renderMembershipEntity(entity, canEdit = false, canLeave = false) {
  if (!entity) return "";
  const href = entity.type === "club"
    ? `/clubs/?slug=${encodeURIComponent(entity.slug)}`
    : `/teams/detail/?slug=${encodeURIComponent(entity.slug)}`;
  return `
    <div class="account-membership">
      <a class="account-membership-link" href="${href}">
        <span class="account-membership-kind">${t(entity.type)}</span>
        <strong>${escapeHtml(entity.displayName)}</strong>
        <span>${t(`ctRole_${entity.role}`)} · ${t(`ctStatus_${entity.status}`)}</span>
        ${entity.pendingRevision ? `<em>${t("pendingRevision")}</em>` : ""}
      </a>
      ${canEdit ? `<button class="account-entity-action" type="button" data-ct-mode="revise" data-ct-type="${entity.type}">${t(entity.type === "club" ? "editClub" : "editTeam")}</button>` : ""}
      ${canEdit ? `<button class="account-entity-action" type="button" data-ct-manage-members="${entity.type}">${t("manageMembers")}</button>` : ""}
      ${canLeave ? `<button class="account-entity-action account-entity-action--danger" type="button" data-ct-leave="${entity.type}">${t("leaveMembership")}</button>` : ""}
    </div>`;
}

function renderMembershipActions(actions, mutationReady) {
  if (!actions.length) return "";
  return `<div class="account-membership-actions">
    <h3>${t("membershipActions")}</h3>
    ${actions.map((action, index) => {
      const resolvable = mutationReady && ["subject", "manager"].includes(action.resolutionRole);
      const href = action.targetType === "club"
        ? `/clubs/?slug=${encodeURIComponent(action.targetSlug)}`
        : `/teams/detail/?slug=${encodeURIComponent(action.targetSlug)}`;
      const subjectHref = `/driver/?id=${encodeURIComponent(action.subjectPublicId)}`;
      return `<article class="account-membership-action">
        <div><span>${t(action.actionType === "request" ? "membershipRequest" : "membershipInvitation")}</span>
          <a href="${href}">${escapeHtml(action.targetDisplayName)}</a>
          <span>${t(action.actionType === "request" ? "membershipApplicant" : "membershipInvitee")}:
            <a href="${subjectHref}">${escapeHtml(action.subjectDisplayName)}</a></span>
          <time>${escapeHtml(t("membershipExpires", formatAccountDate(action.expiresAt)))}</time></div>
        ${resolvable ? `<div class="account-membership-action-buttons">
          <button class="account-action account-action--primary" type="button" data-ct-resolve="accepted" data-ct-action-index="${index}">${t("acceptMembership")}</button>
          <button class="account-action" type="button" data-ct-resolve="rejected" data-ct-action-index="${index}">${t("rejectMembership")}</button>
        </div>` : ""}
      </article>`;
    }).join("")}
  </div>`;
}

function renderTeamClubActions(actions, mutationReady) {
  if (!actions.length) return "";
  return `<div class="account-membership-actions account-team-club-actions">
    <h3>${t("teamClubActions")}</h3>
    ${actions.map((action, index) => `<article class="account-membership-action">
      <div><span>${t(action.actionType === "request" ? "teamClubRequest" : "teamClubInvitation")}</span>
        <strong><a href="/teams/detail/?slug=${encodeURIComponent(action.teamSlug)}">${escapeHtml(action.teamDisplayName)}</a>
          ↔ <a href="/clubs/?slug=${encodeURIComponent(action.clubSlug)}">${escapeHtml(action.clubDisplayName)}</a></strong>
        <time>${escapeHtml(t("affiliationExpires", formatAccountDate(action.expiresAt)))}</time></div>
      ${mutationReady && action.resolutionRole === "manager" ? `<div class="account-membership-action-buttons">
        <button class="account-action account-action--primary" type="button" data-ct-team-club-resolve="accepted" data-ct-team-club-index="${index}">${t("acceptMembership")}</button>
        <button class="account-action" type="button" data-ct-team-club-resolve="rejected" data-ct-team-club-index="${index}">${t("rejectMembership")}</button>
      </div>` : ""}
    </article>`).join("")}
  </div>`;
}

function renderClubsTeams(auth) {
  const state = auth.clubsTeams;
  if (!state?.enabled) {
    return `<section class="account-clubs-teams"><h2>${t("clubsTeams")}</h2><p class="account-muted">${t("clubsTeamsUnavailable")}</p></section>`;
  }
  const stale = !state.snapshot.available || state.snapshot.stale;
  const operations = [...state.notifications, ...state.assetNotifications]
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
    .slice(0, 5);
  const pending = state.pendingCommands + state.pendingAssets;
  const mutationReady = !stale && state.integrityValid && auth.discord?.linked && pending === 0 && Boolean(auth.csrfToken);
  const requestedMembership = membershipRequestFromLocation();
  const affiliationTarget = affiliationTargetFromLocation();
  const affiliationPending = affiliationTarget && state.teamClubActions.some(action => (
    action.teamPublicId === affiliationTarget.targetPublicId
    || action.clubPublicId === affiliationTarget.targetPublicId
  ));
  const affiliationEligible = affiliationTarget && !affiliationPending && (
    (affiliationTarget.action === "request" && state.team?.role === "captain")
    || (affiliationTarget.action === "invite" && state.club?.role === "head")
    || (affiliationTarget.action === "detach" && (
      state.club?.role === "head"
      || (state.team?.role === "captain" && state.team.publicId === affiliationTarget.targetPublicId)
    ))
  );
  const affiliationReady = mutationReady && affiliationEligible;
  const canEditClub = mutationReady && state.club?.role === "head" && state.club.status === "approved" && !state.club.pendingRevision;
  const canEditTeam = mutationReady && state.team?.role === "captain" && state.team.status === "approved" && !state.team.pendingRevision;
  return `
    <section class="account-clubs-teams">
      <div class="account-section-heading">
        <h2>${t("clubsTeams")}</h2>
        ${pending ? `<span class="account-operation-count">${t("pendingOperations")}: ${pending}</span>` : ""}
      </div>
      ${clubsTeamsFlash.text ? `<p class="account-command-summary" data-kind="${escapeHtml(clubsTeamsFlash.kind)}" role="status">${escapeHtml(clubsTeamsFlash.text)}</p>` : ""}
      ${stale ? `<p class="account-snapshot-warning" role="status">${t("clubsTeamsStale")}</p>` : ""}
      ${state.club || state.team
        ? `<div class="account-memberships">${renderMembershipEntity(state.club, canEditClub, mutationReady && state.club?.role === "member")}${renderMembershipEntity(state.team, canEditTeam, mutationReady && state.team?.role === "member")}</div>`
        : `<p class="account-muted">${t("clubsTeamsEmpty")}</p>`}
      ${renderMembershipActions(state.membershipActions, mutationReady)}
      ${renderTeamClubActions(state.teamClubActions, mutationReady)}
      ${requestedMembership ? `<div class="account-membership-request">
        <strong>${escapeHtml(t("requestedMembership", requestedMembership.targetName))}</strong>
        ${mutationReady && !state[requestedMembership.targetType]
          ? `<button class="account-action account-action--primary" type="button" data-ct-request-membership>${t("sendMembershipRequest")}</button>`
          : ""}
      </div>` : ""}
      ${affiliationTarget ? `<div class="account-membership-request account-affiliation-request">
        <div><strong>${escapeHtml(t(
          affiliationTarget.action === "request" ? "requestAffiliation" : affiliationTarget.action === "invite" ? "inviteAffiliation" : "detachAffiliation",
          affiliationTarget.targetName
        ))}</strong>
        ${affiliationTarget.action === "detach" ? `<p class="account-snapshot-warning">${t("detachWarning")}</p>` : ""}</div>
        ${affiliationReady ? `<button class="account-action ${affiliationTarget.action === "detach" ? "account-action--danger" : "account-action--primary"}" type="button" data-ct-affiliation-action>${t(affiliationTarget.action === "detach" ? "detachTeam" : "sendAffiliation")}</button>` : ""}
      </div>` : ""}
      ${operations.length ? `
        <div class="account-operation-list">
          <h3>${t("recentOperations")}</h3>
          ${operations.map(operation => `<div class="account-operation"><span>${t(`ctStatus_${operation.status}`)}</span><time>${escapeHtml(formatAccountDate(operation.createdAt))}</time></div>`).join("")}
        </div>` : ""}
      ${!auth.discord?.linked ? `<p class="account-muted">${t("discordRequired")}</p>` : ""}
      ${pending ? `<p class="account-muted">${t("managementBlocked")}</p>` : ""}
      <div class="account-actions">
        ${mutationReady && !state.club ? `<button class="account-action account-action--primary" type="button" data-ct-mode="create" data-ct-type="club">${t("createClub")}</button>` : ""}
        ${mutationReady && !state.team ? `<button class="account-action account-action--primary" type="button" data-ct-mode="create" data-ct-type="team">${t("createTeam")}</button>` : ""}
        <a class="account-action" href="/teams/">${t("clubsTeamsCatalog")}</a>
      </div>
    </section>`;
}

function clubsTeamsDataBaseUrl() {
  const fallback = document.querySelector('meta[name="clubs-teams-data-base"]')?.content
    || "https://data.asgracing.ru/public-cache-clubs-teams";
  return resolveRuntimeOverride({
    hostname: location.hostname,
    searchParams: new URLSearchParams(location.search),
    key: "clubsTeamsDataBase",
    fallback
  });
}

function topDataBaseUrl() {
  return resolveRuntimeOverride({
    hostname: location.hostname,
    searchParams: new URLSearchParams(location.search),
    key: "topDataBase",
    fallback: "https://data.asgracing.ru/top-data"
  });
}

async function loadApprovedEntityDetail(entity) {
  const client = createHttpClient({ fetchImpl: globalThis.fetch, defaultTimeoutMs: 8000 });
  const result = await loadEntityDetail({
    client,
    dataBaseUrl: clubsTeamsDataBaseUrl(),
    entityType: entity.type,
    slug: entity.slug
  });
  if (result.detail.public_id !== entity.publicId) throw new ClubsTeamsCommandError("detail_identity_mismatch");
  return result.detail;
}

async function loadApprovedEntityFields(entity) {
  const detail = await loadApprovedEntityDetail(entity);
  return {
    displayName: detail.display_name,
    shortName: detail.short_name || "",
    descriptionRu: detail.description_ru || "",
    descriptionEn: detail.description_en || "",
    websiteUrl: detail.website_url || ""
  };
}

function entityFormMarkup({ mode, entityType, fields, hasClub }) {
  const entityLabel = t(entityType);
  const title = t(mode === "create" ? "formCreate" : "formEdit", entityLabel);
  return `
    <div class="account-entity-form-shell">
      <h2>${escapeHtml(title)}</h2>
      ${mode === "create" && entityType === "team" && hasClub ? `<p class="account-muted">${t("teamAffiliation")}</p>` : ""}
      <form class="account-entity-form" id="account-entity-form" novalidate>
        <label>${t("displayName")}<input name="displayName" required minlength="2" maxlength="80" value="${escapeHtml(fields.displayName || "")}"></label>
        <label>${t("shortName")}<input name="shortName" maxlength="24" value="${escapeHtml(fields.shortName || "")}"></label>
        <label>${t("descriptionRu")}<textarea name="descriptionRu" maxlength="4000" rows="5">${escapeHtml(fields.descriptionRu || "")}</textarea></label>
        <label>${t("descriptionEn")}<textarea name="descriptionEn" maxlength="4000" rows="5">${escapeHtml(fields.descriptionEn || "")}</textarea></label>
        <label>${t("websiteUrl")}<input name="websiteUrl" type="url" maxlength="300" value="${escapeHtml(fields.websiteUrl || "")}"></label>
        <div class="account-form-actions">
          <button class="account-action account-action--primary" type="submit">${t("saveEntity")}</button>
          <button class="account-action" type="button" data-ct-cancel>${t("cancelEntity")}</button>
        </div>
        <p class="account-command-message" role="status" aria-live="polite"></p>
        <a class="account-action account-command-reauth" href="${accountLoginUrl()}" hidden>${t("reauth")}</a>
      </form>
    </div>`;
}

function commandErrorText(code) {
  if (code === "recent_auth_required") return t("reauthRequired");
  if (code === "name_taken") return t("nameTaken");
  if (code === "version_conflict") return t("versionConflict");
  if (["invalid_fields", "invalid_website", "invalid_field", "invalid_name"].includes(code)) return t("invalidFields");
  return t("commandRejected");
}

async function pollClubsTeamsCommand(commandId) {
  let latest = { id: commandId, status: "pending", final: false, errorCode: null };
  for (let attempt = 0; attempt < 4 && !latest.final; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const response = await fetch(`${AUTH_BASE_URL}/v1/clubs-teams/commands/${encodeURIComponent(commandId)}`, {
      method: "GET", credentials: "include", cache: "no-store", headers: { Accept: "application/json" }
    });
    if (!response.ok) break;
    latest = normalizeCommandResponse(await response.json());
  }
  return latest;
}

async function submitEntityForm({ auth, mode, entityType, fieldsSource, form }) {
  const submit = form.querySelector('button[type="submit"]');
  const message = form.querySelector(".account-command-message");
  const reauth = form.querySelector(".account-command-reauth");
  submit.disabled = true;
  message.textContent = "";
  message.dataset.kind = "";
  reauth.hidden = true;
  let accepted = false;
  try {
    const fields = Object.fromEntries(new FormData(form).entries());
    const state = auth.clubsTeams;
    const command = mode === "create"
      ? buildCreateEntityCommand({ entityType, currentEntity: state[entityType], clubEntity: state.club, fields })
      : buildReviseEntityCommand({ entityType, entity: state[entityType], fields: fieldsSource ? { ...fieldsSource, ...fields } : fields });
    const queuedPayload = await mutation("/v1/clubs-teams/commands", auth.csrfToken, {
      command_type: command.commandType,
      payload: command.payload,
      ...(command.expectedEntityVersion ? { expected_entity_version: command.expectedEntityVersion } : {})
    });
    accepted = true;
    const queued = normalizeCommandResponse(queuedPayload);
    const completed = await pollClubsTeamsCommand(queued.id);
    if (completed.status === "applied") {
      clubsTeamsFlash = { text: t("commandApplied"), kind: "success" };
      await controller?.refresh({ showLoading: false });
      return;
    }
    if (completed.final) {
      accepted = false;
      throw new ClubsTeamsCommandError(completed.errorCode || completed.status);
    }
    clubsTeamsFlash = { text: t("commandQueued"), kind: "success" };
    await controller?.refresh({ showLoading: false });
  } catch (error) {
    if (accepted) {
      message.textContent = t("commandQueued");
      message.dataset.kind = "success";
      clubsTeamsFlash = { text: t("commandQueued"), kind: "success" };
      await controller?.refresh({ showLoading: false });
      return;
    }
    const code = error?.code || "command_rejected";
    message.textContent = commandErrorText(code);
    message.dataset.kind = "error";
    reauth.hidden = code !== "recent_auth_required";
    submit.disabled = false;
  }
}

async function openEntityForm(auth, mode, entityType) {
  const section = document.querySelector(".account-clubs-teams");
  if (!section || !["club", "team"].includes(entityType) || !["create", "revise"].includes(mode)) return;
  let fields = { displayName: "", shortName: "", descriptionRu: "", descriptionEn: "", websiteUrl: "" };
  if (mode === "revise") {
    section.innerHTML = `<p class="account-muted" role="status">${t("loadingEntity")}</p>`;
    try {
      fields = await loadApprovedEntityFields(auth.clubsTeams[entityType]);
    } catch {
      section.innerHTML = `<p class="account-snapshot-warning" role="alert">${t("detailUnavailable")}</p>`;
      return;
    }
  }
  section.innerHTML = entityFormMarkup({ mode, entityType, fields, hasClub: Boolean(auth.clubsTeams.club) });
  const form = section.querySelector("#account-entity-form");
  form.addEventListener("submit", event => {
    event.preventDefault();
    void submitEntityForm({ auth, mode, entityType, fieldsSource: fields, form });
  });
  section.querySelector("[data-ct-cancel]")?.addEventListener("click", () => render(auth));
  form.querySelector("input")?.focus();
}

function memberManagerMarkup(entity, roster) {
  const removable = roster.filter(member => member.role === "member");
  return `<div class="account-member-manager">
    <div class="account-section-heading"><h2>${escapeHtml(t("manageRoster", entity.displayName))}</h2>
      <button class="account-action" type="button" data-ct-cancel>${t("cancelEntity")}</button></div>
    <div class="account-manager-roster">
      ${roster.map(member => `<div class="account-manager-member">
        <a href="/driver/?id=${encodeURIComponent(member.public_id)}"><strong>${escapeHtml(member.display_name)}</strong><span>${t(`ctRole_${member.role}`)}</span></a>
        ${removable.includes(member) ? `<button class="account-action account-action--danger" type="button" data-ct-remove-member="${member.public_id}" data-ct-member-name="${escapeHtml(member.display_name)}">${t("removeMember")}</button>` : ""}
      </div>`).join("")}
    </div>
    <div class="account-pilot-search">
      <h3>${t("invitePilot")}</h3>
      <label>${t("pilotSearch")}<input type="search" maxlength="80" autocomplete="off" data-ct-pilot-search></label>
      <div class="account-pilot-results" role="list" aria-live="polite"></div>
    </div>
  </div>`;
}

async function openMemberManager(auth, entityType) {
  const section = document.querySelector(".account-clubs-teams");
  const entity = auth.clubsTeams[entityType];
  const expectedRole = entityType === "club" ? "head" : "captain";
  if (!section || !entity || entity.role !== expectedRole) return;
  section.innerHTML = `<p class="account-muted" role="status">${t("loadingEntity")}</p>`;
  try {
    const client = createHttpClient({ fetchImpl: globalThis.fetch, defaultTimeoutMs: 8000 });
    const [detail, pilots] = await Promise.all([
      loadApprovedEntityDetail(entity),
      loadPilotIndex({ client, dataBaseUrl: topDataBaseUrl() })
    ]);
    const rosterIds = detail.roster.map(member => member.public_id);
    section.innerHTML = memberManagerMarkup(entity, detail.roster);
    section.querySelector("[data-ct-cancel]")?.addEventListener("click", () => render(auth));
    section.querySelectorAll("[data-ct-remove-member]").forEach(button => {
      button.addEventListener("click", () => {
        const name = button.dataset.ctMemberName || "";
        if (!confirm(t("confirmRemove", name))) return;
        try {
          void submitMembershipCommand(auth, buildMembershipRemoveCommand({ entity, subjectPublicId: button.dataset.ctRemoveMember }), button);
        } catch (error) {
          clubsTeamsFlash = { text: commandErrorText(error?.code), kind: "error" };
          render(auth);
        }
      });
    });
    const input = section.querySelector("[data-ct-pilot-search]");
    const results = section.querySelector(".account-pilot-results");
    const renderResults = () => {
      const matches = filterPilots(pilots, input.value, { excludedPublicIds: rosterIds });
      results.innerHTML = matches.length ? matches.map(pilot => `<div class="account-pilot-result" role="listitem">
        <a href="/driver/?id=${encodeURIComponent(pilot.publicId)}">${escapeHtml(pilot.displayName)}</a>
        <button class="account-action account-action--primary" type="button" data-ct-invite-pilot="${pilot.publicId}" data-ct-pilot-name="${escapeHtml(pilot.displayName)}">${t("invitePilot")}</button>
      </div>`).join("") : (input.value.trim().length >= 2 ? `<p class="account-muted">${t("noPilotResults")}</p>` : "");
      results.querySelectorAll("[data-ct-invite-pilot]").forEach(button => {
        button.addEventListener("click", () => {
          const name = button.dataset.ctPilotName || "";
          if (!confirm(t("confirmInvite", name))) return;
          try {
            void submitMembershipCommand(auth, buildMembershipInviteCommand({ entity, subjectPublicId: button.dataset.ctInvitePilot }), button);
          } catch (error) {
            clubsTeamsFlash = { text: commandErrorText(error?.code), kind: "error" };
            render(auth);
          }
        });
      });
    };
    input.addEventListener("input", renderResults);
    input.focus();
  } catch {
    section.innerHTML = `<p class="account-snapshot-warning" role="alert">${t("rosterUnavailable")}</p>
      <button class="account-action" type="button" data-ct-cancel>${t("cancelEntity")}</button>`;
    section.querySelector("[data-ct-cancel]")?.addEventListener("click", () => render(auth));
  }
}

async function submitMembershipCommand(auth, command, button) {
  button.disabled = true;
  try {
    const payload = await mutation("/v1/clubs-teams/commands", auth.csrfToken, {
      command_type: command.commandType,
      payload: command.payload
    });
    const queued = normalizeCommandResponse(payload);
    const completed = await pollClubsTeamsCommand(queued.id);
    if (completed.final && completed.status !== "applied") {
      throw new ClubsTeamsCommandError(completed.errorCode || completed.status);
    }
    clubsTeamsFlash = { text: t(completed.status === "applied" ? "commandApplied" : "commandQueued"), kind: "success" };
  } catch (error) {
    clubsTeamsFlash = { text: commandErrorText(error?.code), kind: "error" };
  }
  await controller?.refresh({ showLoading: false });
}

function bindClubsTeamsActions(auth) {
  document.querySelectorAll("[data-ct-mode][data-ct-type]").forEach(button => {
      button.addEventListener("click", () => void openEntityForm(auth, button.dataset.ctMode, button.dataset.ctType));
  });
  document.querySelectorAll("[data-ct-resolve]").forEach(button => {
    button.addEventListener("click", () => {
      const action = auth.clubsTeams.membershipActions[Number(button.dataset.ctActionIndex)];
      const decision = button.dataset.ctResolve;
      const prompt = decision === "accepted" ? t("confirmAccept") : t("confirmReject");
      if (!action || !confirm(prompt)) return;
      try {
        void submitMembershipCommand(auth, buildMembershipResolveCommand({ action, decision }), button);
      } catch (error) {
        clubsTeamsFlash = { text: commandErrorText(error?.code), kind: "error" };
        render(auth);
      }
    });
  });
  document.querySelectorAll("[data-ct-leave]").forEach(button => {
    button.addEventListener("click", () => {
      const entity = auth.clubsTeams[button.dataset.ctLeave];
      if (!entity || !confirm(t("confirmLeave"))) return;
      try {
        void submitMembershipCommand(auth, buildMembershipLeaveCommand(entity), button);
      } catch (error) {
        clubsTeamsFlash = { text: commandErrorText(error?.code), kind: "error" };
        render(auth);
      }
    });
  });
  document.querySelectorAll("[data-ct-manage-members]").forEach(button => {
    button.addEventListener("click", () => void openMemberManager(auth, button.dataset.ctManageMembers));
  });
  document.querySelector("[data-ct-request-membership]")?.addEventListener("click", event => {
    const target = membershipRequestFromLocation();
    if (!target) return;
    try {
      const command = buildMembershipRequestCommand(target);
      history.replaceState({}, "", location.pathname);
      void submitMembershipCommand(auth, command, event.currentTarget);
    } catch (error) {
      clubsTeamsFlash = { text: commandErrorText(error?.code), kind: "error" };
      render(auth);
    }
  });
  document.querySelectorAll("[data-ct-team-club-resolve]").forEach(button => {
    button.addEventListener("click", () => {
      const action = auth.clubsTeams.teamClubActions[Number(button.dataset.ctTeamClubIndex)];
      const decision = button.dataset.ctTeamClubResolve;
      const prompt = decision === "accepted" ? t("confirmAccept") : t("confirmReject");
      if (!action || !confirm(prompt)) return;
      try {
        void submitMembershipCommand(auth, buildTeamClubResolveCommand({ action, decision }), button);
      } catch (error) {
        clubsTeamsFlash = { text: commandErrorText(error?.code), kind: "error" };
        render(auth);
      }
    });
  });
  document.querySelector("[data-ct-affiliation-action]")?.addEventListener("click", event => {
    const target = affiliationTargetFromLocation();
    if (!target || (target.action === "detach" && !confirm(t("confirmDetach")))) return;
    try {
      let command;
      if (target.action === "request") {
        command = buildTeamClubRequestCommand({ teamEntity: auth.clubsTeams.team, clubPublicId: target.targetPublicId });
      } else if (target.action === "invite") {
        command = buildTeamClubInviteCommand({ clubEntity: auth.clubsTeams.club, teamPublicId: target.targetPublicId });
      } else {
        const ownTeam = auth.clubsTeams.team?.role === "captain" && auth.clubsTeams.team.publicId === target.targetPublicId
          ? auth.clubsTeams.team : null;
        command = buildTeamClubDetachCommand({
          teamEntity: ownTeam,
          clubEntity: ownTeam ? null : auth.clubsTeams.club,
          teamPublicId: ownTeam ? null : target.targetPublicId
        });
      }
      history.replaceState({}, "", location.pathname);
      void submitMembershipCommand(auth, command, event.currentTarget);
    } catch (error) {
      clubsTeamsFlash = { text: commandErrorText(error?.code), kind: "error" };
      render(auth);
    }
  });
}

function renderSignedOut(root) {
  root.innerHTML = `
    <div class="account-card-body">
      <p class="account-muted">${t("signedOut")}</p>
      <div class="account-actions">
        <a class="account-action account-action--primary" href="${accountLoginUrl()}">${t("signIn")}</a>
      </div>
    </div>`;
}

function renderOverview(root, auth) {
  const name = auth.driver?.displayName || auth.steam?.personaName || t("title");
  const avatar = auth.steam?.avatarUrl || "../social/asg.png";
  const pending = auth.preferences?.pendingRequest;
  root.innerHTML = `
    <div class="account-card-header">
      <img class="account-avatar" src="${escapeHtml(avatar)}" alt="" referrerpolicy="no-referrer">
      <div class="account-heading">
        <div class="account-eyebrow">${t("eyebrow")}</div>
        <h1 class="account-title">${escapeHtml(name)}</h1>
      </div>
      ${numberBadge(auth.preferences)}
    </div>
    <div class="account-card-body">
      ${auth.linked ? `
        <div class="account-grid">
          <div class="account-panel">
            <h2>${t("number")}</h2>
            <div class="account-status">${
              pending
                ? t("pending", pending.raceNumber)
                : auth.preferences?.raceNumber
                  ? `#${auth.preferences.raceNumber}`
                  : t("noNumber")
            }</div>
          </div>
          <div class="account-panel">
            <h2>${t("discord")}</h2>
            <div class="account-status">${auth.discord?.linked ? t("linked") : t("notLinked")}</div>
          </div>
        </div>
        <div class="account-actions">
          <a class="account-action account-action--primary" href="/account/settings/">${t("settings")}</a>
          <a class="account-action" href="${escapeHtml(auth.driver.profileUrl)}">${t("profile")}</a>
        </div>
        ${renderClubsTeams(auth)}
      ` : `<p class="account-muted">${t("noProfile")}</p>`}
    </div>`;
  if (auth.linked) bindClubsTeamsActions(auth);
}

function renderSettings(root, auth) {
  const preferences = auth.preferences || {};
  const pending = preferences.pendingRequest;
  const blocked = preferences.blockedReason === "driver_banned";
  root.innerHTML = `
    <div class="account-card-header">
      <div class="account-heading">
        <div class="account-eyebrow">${t("settings")}</div>
        <h1 class="account-title">${t("numberSettings")}</h1>
      </div>
      ${numberBadge(preferences)}
    </div>
    <div class="account-card-body">
      <p class="account-muted">${t("numberHelp")}</p>
      ${pending ? `<p class="account-status">${t("pending", pending.raceNumber)}</p>` : ""}
      ${blocked ? `<p class="account-message" data-kind="error">${t("blocked")}</p>` : ""}
      ${preferences.nextChangeAt ? `<p class="account-status">${t("cooldown", preferences.nextChangeAt)}</p>` : ""}
      <div class="account-field">
        <label for="race-number-input">${t("numberLabel")}</label>
        <input id="race-number-input" type="number" min="1" max="999" step="1" inputmode="numeric"
          ${blocked || pending || preferences.nextChangeAt ? "disabled" : ""}>
      </div>
      <div class="account-form-actions">
        <button class="account-action account-action--primary" id="race-number-submit"
          ${blocked || pending || preferences.nextChangeAt ? "disabled" : ""}>${t("submit")}</button>
        ${pending ? `<button class="account-action" id="race-number-cancel" ${blocked ? "disabled" : ""}>${t("cancel")}</button>` : ""}
        ${preferences.raceNumber ? `<button class="account-action account-action--danger" id="race-number-release" ${blocked || preferences.nextChangeAt ? "disabled" : ""}>${t("release")}</button>` : ""}
        <a class="account-action" href="/account/">${t("overview")}</a>
      </div>
      <div class="account-message" id="account-message" role="status" aria-live="polite"></div>
    </div>`;
  document.getElementById("race-number-submit")?.addEventListener("click", () => submitNumber(auth));
  document.getElementById("race-number-cancel")?.addEventListener("click", () => cancelRequest(auth));
  document.getElementById("race-number-release")?.addEventListener("click", () => releaseNumber(auth));
}

async function mutation(path, csrfToken, body) {
  const response = await fetch(`${AUTH_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.detail || `http_${response.status}`);
    error.code = payload?.detail;
    throw error;
  }
  return payload;
}

async function runAction(button, action, successText) {
  if (!button || button.disabled) return;
  button.disabled = true;
  setMessage("");
  try {
    await action();
    setMessage(successText, "success");
    await controller?.refresh({ showLoading: false });
  } catch (error) {
    setMessage(error?.code === "race_number_taken" ? t("taken") : t("failed"), "error");
    button.disabled = false;
  }
}

function submitNumber(auth) {
  const input = document.getElementById("race-number-input");
  const number = Number(input?.value);
  if (!Number.isInteger(number) || number < 1 || number > 999) {
    setMessage(t("failed"), "error");
    return;
  }
  const button = document.getElementById("race-number-submit");
  void runAction(
    button,
    () => mutation("/v1/me/race-number", auth.csrfToken, { race_number: number }),
    t("submitted")
  );
}

function cancelRequest(auth) {
  const button = document.getElementById("race-number-cancel");
  void runAction(
    button,
    () => mutation("/v1/me/race-number/cancel", auth.csrfToken),
    t("cancelled")
  );
}

function releaseNumber(auth) {
  if (!confirm(t("releaseConfirm"))) return;
  const button = document.getElementById("race-number-release");
  void runAction(
    button,
    () => mutation("/v1/me/race-number", auth.csrfToken, { race_number: null }),
    t("released")
  );
}

function render(auth) {
  const root = document.getElementById("account-content");
  if (!root) return;
  if (!auth?.authenticated) {
    renderSignedOut(root);
  } else if (document.body.dataset.accountPage === "settings") {
    if (!auth.linked) renderOverview(root, auth);
    else renderSettings(root, auth);
  } else {
    renderOverview(root, auth);
  }
  if (flashMessage.text) {
    setMessage(flashMessage.text, flashMessage.kind);
  }
}

document.querySelectorAll("[data-account-copy]").forEach(element => {
  element.textContent = t(element.dataset.accountCopy);
});

function closeNavigationGroups() {
  document.querySelectorAll(".top-nav-group.is-open").forEach(group => {
    group.classList.remove("is-open");
    group.querySelector(".top-nav-group-toggle")?.setAttribute("aria-expanded", "false");
    const menu = group.querySelector(".top-nav-group-menu");
    if (menu) menu.hidden = true;
  });
}

document.querySelectorAll(".top-nav-group").forEach(group => {
  const toggle = group.querySelector(".top-nav-group-toggle");
  const menu = group.querySelector(".top-nav-group-menu");
  toggle?.addEventListener("click", event => {
    event.stopPropagation();
    const open = !group.classList.contains("is-open");
    closeNavigationGroups();
    group.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (menu) menu.hidden = !open;
  });
});
document.addEventListener("click", event => {
  if (!event.target.closest(".top-nav-group")) closeNavigationGroups();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeNavigationGroups();
});

document.querySelectorAll(".lang-btn[data-lang]").forEach(button => {
  button.addEventListener("click", () => {
    try {
      localStorage.setItem("asgLang", button.dataset.lang);
    } catch {
      // The selected language remains valid for the current document.
    }
    location.reload();
  });
  button.classList.toggle("active", button.dataset.lang === language());
});

const controller = createAuthHeaderController({ onAuthChange: render });

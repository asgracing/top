const pageParams = new URLSearchParams(window.location.search);
function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}
const hourlyApiBase = normalizeBaseUrl(pageParams.get("hourlyApiBase"));
const topApiBase = normalizeBaseUrl(pageParams.get("topApiBase"));
const topApiRoot = topApiBase.replace(/\/top-data\/v2$/i, "");
const hourlyApiRoot = hourlyApiBase.replace(/\/hourly-data$/i, "");
const isAsgPublicSite = /(^|\.)asgracing\.ru$/i.test(window.location.hostname);
const isLocalDevHost = /^(localhost|127\.0\.0\.1|::1)$/i.test(window.location.hostname);
const defaultHourlyDataBaseUrl = isAsgPublicSite
  ? "https://data.asgracing.ru/hourly-data"
  : isLocalDevHost
    ? "https://data.asgracing.ru/hourly-data"
  : window.location.hostname === "asgracing.github.io"
    ? "https://asgracing.github.io/hourly-data"
    : "/hourly-data";
const defaultTopDataBaseUrl = isAsgPublicSite
  ? "https://data.asgracing.ru/top-data"
  : isLocalDevHost
    ? "https://data.asgracing.ru/top-data"
  : window.location.hostname === "asgracing.github.io"
    ? "https://asgracing.github.io/top-data"
    : "/top-data";
const hourlyDataBaseUrl = hourlyApiBase || defaultHourlyDataBaseUrl;
const announcementUrl = `${hourlyDataBaseUrl}/announcement.json`;
const scheduleUrl = `${hourlyDataBaseUrl}/schedule.json`;
const championshipsUrl = `${hourlyDataBaseUrl}/championships.json`;
const recentRacesUrl = `${hourlyDataBaseUrl}/races/races.json`;
const recentRaceDetailsBaseUrl = `${hourlyDataBaseUrl}/`;
const serverStatusUrl = pageParams.get("serverStatusUrl") || (topApiRoot || hourlyApiRoot ? `${topApiRoot || hourlyApiRoot}/server-status` : `${defaultTopDataBaseUrl}/server_status.json`);
const votesApiBase =
  document.querySelector('meta[name="hourly-votes-api"]')?.getAttribute("content")?.trim() || "";
const VOTER_ID_STORAGE_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const VOTE_STATE_STORAGE_KEY = "hourlyVoteStateByEventId";
const VOTE_STATE_STORAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const NEWS_READ_STORAGE_KEY = "asgReadNewsIds.v2";
const EVENT_MODAL_VERSION = "v2";
const topSiteBaseUrl = isAsgPublicSite
  ? "https://asgracing.ru"
  : isLocalDevHost
    ? "/top"
  : window.location.hostname === "asgracing.github.io"
    ? "https://asgracing.github.io/top"
    : "/top";
const newsFeedUrl = `${topSiteBaseUrl}/news-content/news.json`;
const ACC_CONNECT_SERVER_FALLBACK = {
  hostname: "95.165.92.3",
  port: null,
  name: "ASG Racing 1H Race",
  persistent: true
};

function getLegalUrls() {
  const fallbackBase =
    document.querySelector('meta[name="legal-base-path"]')?.getAttribute("content")?.trim() || "./";
  return window.ASGLegal?.getUrls?.() || {
    privacy: `${fallbackBase}privacy/`,
    cookies: `${fallbackBase}cookies/`
  };
}

function buildVoteLegalNoteHtml() {
  const { privacy, cookies } = getLegalUrls();
  if (currentLang === "ru") {
    return `Нажимая кнопку, вы соглашаетесь на обработку технического идентификатора браузера для учёта одного голоса на слот. Подробнее: <a href="${escapeHtml(privacy)}">политика ПДн</a> и <a href="${escapeHtml(cookies)}">cookies</a>.`;
  }
  return `By clicking this button, you agree to processing of a technical browser identifier to count one vote per slot. Details: <a href="${escapeHtml(privacy)}">privacy policy</a> and <a href="${escapeHtml(cookies)}">cookies notice</a>.`;
}

function buildCompactVoteLegalNoteHtml() {
  const { privacy } = getLegalUrls();
  if (currentLang === "ru") {
    return `Голосуя, вы соглашаетесь с обработкой тех. идентификатора браузера. <a href="${escapeHtml(privacy)}">Подробнее</a>.`;
  }
  return `Voting means you agree to processing of a technical browser identifier. <a href="${escapeHtml(privacy)}">Details</a>.`;
}

function getExpiringStorageValue(storageKey, ttlMs) {
  const rawValue = localStorage.getItem(storageKey);
  const now = Date.now();

  if (rawValue) {
    try {
      const parsed = JSON.parse(rawValue);
      if (parsed && typeof parsed.value === "string") {
        if (!parsed.expiresAt || Number(parsed.expiresAt) > now) {
          console.log(`[STORAGE] ${storageKey}: найдено сохраненное значение (expires in ${Number(parsed.expiresAt) - now}ms)`);
          return parsed.value;
        } else {
          console.log(`[STORAGE] ${storageKey}: значение истекло`);
        }
      }
    } catch (error) {
      console.warn(`[STORAGE] ${storageKey}: ошибка парсинга`, error);
      if (rawValue.trim()) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            value: rawValue.trim(),
            createdAt: now,
            expiresAt: now + ttlMs
          })
        );
        return rawValue.trim();
      }
    }
  }

  const generated = `browser-${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  console.log(`[STORAGE] ${storageKey}: генерируем новое значение: ${generated}`);
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        value: generated,
        createdAt: now,
        expiresAt: now + ttlMs
      })
    );
  } catch (error) {
    console.error(`[STORAGE] ${storageKey}: ошибка при сохранении в localStorage:`, error);
  }
  return generated;
}

function loadStoredVoteState() {
  try {
    const rawValue = localStorage.getItem(VOTE_STATE_STORAGE_KEY);
    if (!rawValue) return {};
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") return {};
    if (parsed.expiresAt && Number(parsed.expiresAt) <= Date.now()) {
      localStorage.removeItem(VOTE_STATE_STORAGE_KEY);
      return {};
    }
    return parsed.items && typeof parsed.items === "object" ? parsed.items : {};
  } catch (error) {
    return {};
  }
}

function normalizeVoteStateItems(items) {
  return Object.fromEntries(
    Object.entries(items || {})
      .filter(([eventId, state]) => eventId && state && typeof state === "object")
      .map(([eventId, state]) => [
        eventId,
        {
          event_id: state.event_id || eventId,
          votes: typeof state.votes === "number" ? state.votes : 0,
          already_voted: Boolean(state.already_voted)
        }
      ])
  );
}

function saveStoredVoteState(items) {
  try {
    const normalizedItems = normalizeVoteStateItems(items);
    localStorage.setItem(
      VOTE_STATE_STORAGE_KEY,
      JSON.stringify({
        items: normalizedItems,
        updatedAt: Date.now(),
        expiresAt: Date.now() + VOTE_STATE_STORAGE_TTL_MS
      })
    );
  } catch (error) {
    // Vote cache is only a UI fallback; the worker remains the source of truth.
  }
}

function mergeVoteStateItems(items) {
  voteStateByEventId = {
    ...voteStateByEventId,
    ...normalizeVoteStateItems(items)
  };
  saveStoredVoteState(voteStateByEventId);
}

function syncVoteStateFromStorage() {
  voteStateByEventId = loadStoredVoteState();
  if (Array.isArray(scheduleItems) && scheduleItems.length) {
    renderScheduleTable(scheduleItems);
    renderHeroVote();
    renderUpcomingHeroV2(announcementData || {});
  }
  if (selectedScheduleItem && typeof renderScheduleModal === "function") {
    renderScheduleModal();
  }
}

function useEventModalV2() {
  return true;
}

const translations = {
  en: {
    htmlLang: "en",
    homeAriaLabel: "ASG Racing home",
    langSwitcherLabel: "Language switcher",
    navMore: "More",
    navMoreAriaLabel: "Open extra navigation",
    pageTitle: "Hourly Race | ASG Racing",
    metaDescription: "Schedule, latest announcement and recent races for the dedicated ASG Racing hourly server.",
    ogTitle: "Hourly Race | ASG Racing",
    ogDescription: "Schedule, latest announcement and recent races for the dedicated ASG Racing hourly server.",
    twitterTitle: "Hourly Race | ASG Racing",
    twitterDescription: "Schedule, latest announcement and recent races for the dedicated ASG Racing hourly server.",
    ogLocale: "en_US",
    navLeaderboard: "Back to Main",
    navUpcoming: "Events",
    navRaceResults: "Results",
    navHourly: "Hourly Race",
    navGroupEvent: "Event",
    navGroupAsg: "ASG Racing",
    btnRules: "Rules",
    btnNews: "News",
    btnChampionship: "Rating",
    btnBestLaps: "Best Laps",
    btnWorstSafety: "Safety Rating",
    btnBans: "Ban List",
    btnCommunity: "Community",
    btnAboutServer: "About Server",
    newsBellAriaLabel: "Open notifications",
    newsBellUnreadLabel: "{count} unread notifications",
    newsBellEmpty: "No new notifications yet.",
    newsModalTitle: "Notifications",
    newsModalSubtitle: "Latest updates, maintenance notes and community news.",
    newsModalOpenAll: "Open all news",
    heroServerLabel: "Server",
    heroPasswordLabel: "Password",
    heroEntryLabel: "Entry",
    heroFormatLabel: "Format",
    heroPitstopLabel: "Pitstop",
    heroMandatoryLabel: "Mandatory",
    heroRefuelLabel: "Refuel",
    heroTyresLabel: "Tyres",
    heroWeatherLabel: "Weather",
    serverConnectBtn: "Connect",
    serverConnectHowTo: "How to?",
    serverConnectUnavailable: "Add public server IP/host to enable direct connect",
    copyAction: "Copy {field}",
    copiedAction: "{field} copied",
    announcementEyebrow: "Next Event",
    scheduleEyebrow: "Schedule",
    archiveEyebrow: "Archive",
    scheduleTitle: "Upcoming Slots",
    scheduleTableSubtitle: "Click any row to open the slot briefing.",
    scheduleCols: ["Date + UTC", "Track", "Rain"],
    openScheduleDetailsLabel: "Open slot details",
    scheduleModalEyebrow: "Slot details",
    scheduleModalDateTime: "Date & time",
    scheduleModalSlot: "Slot",
    scheduleModalRain: "Rain forecast",
    calendarSummary: "Full event calendar",
    calendarEmpty: "No calendar events yet.",
    championshipBadge: "Championship Event",
    hourlyBadge: "Hourly Race",
    enduranceBadge: "Endurance",
    pointsMultiplierBadge: "×{value} points",
    standardScoringBadge: "Standard scoring ×1",
    championshipEyebrow: "Championship",
    navCurrentChampionship: "Current championship",
    navPastChampionships: "Past championships",
    championshipOpenButton: "Open championship",
    championshipNoDescription: "Follow the active championship progress, upcoming races and standings.",
    championshipHistoryTitle: "Championship History",
    championshipHistorySubtitle: "Current and archived ASG Racing championships with standings and results.",
    championshipHistoryEmpty: "No published championships yet.",
    championshipStatusActive: "Active",
    championshipStatusUpcoming: "Upcoming",
    championshipStatusFinished: "Finished",
    championshipStatusArchived: "Archive",
    championshipWinnerLabel: "Winner",
    championshipRacesLabel: "Races",
    championshipDriversLabel: "Drivers",
    votingDisabledChampionship: "Voting is disabled for championship events",
    voteButton: "I want to race!",
    voteButtonDone: "You're in",
    voteCountZero: "No votes yet",
    voteCountOne: "{value} wants to race",
    voteCountMany: "{value} want to race",
    voteSoon: "Voting soon",
    voteSending: "Saving...",
    voteFailed: "Try again",
    unvoteButton: "Remove vote",
    recentTitle: "Recent Races",
    labelDate: "Date",
    labelTime: "Time",
    labelTrack: "Track",
    labelWindow: "Server Window",
    loadingShort: "Loading...",
    loadError: "Loading failed.",
    defaultAnnouncementTitle: "1-Hour Race",
    scheduleEmpty: "No data.",
    recentEmpty: "No completed races yet.",
    locale: "en-GB",
    entrySlots: "{value} slots",
    entrySafety: "SA {value}+",
    entryTrackMedals: "Track medals {value}",
    entryRacecraft: "RC {value}+",
    preRaceWait: "Prestart {value}m",
    overtime: "Overtime {value}m",
    timeMultiplierChip: "x{value} time",
    mandatoryPitstopCount: "{value} mandatory stop",
    mandatoryPitstopCountPlural: "{value} mandatory stops",
    pitWindow: "window {value}m",
    pitNoMandatory: "No mandatory stop",
    pitRefuelAllowed: "refuelling allowed",
    pitRefuelFixed: "fixed refuel time",
    mandatoryRefuel: "refuel",
    mandatoryTyres: "tyre change",
    mandatoryDriverSwap: "driver swap",
    mandatoryNone: "No mandatory service actions",
    refuelMandatory: "mandatory refuel",
    refuelNone: "no refuel rules",
    tyresMandatory: "mandatory tyre change",
    tyresSets: "{value} sets",
    tyresNone: "no tyre rules",
    passwordNone: "No password",
    weatherClear: "Clear",
    weatherMixed: "Mixed clouds",
    weatherCloudy: "Cloudy",
    weatherWet: "Wet risk",
    weatherTemp: "{value}C",
    weatherClouds: "clouds {value}%",
    weatherRain: "rain {value}%",
    weatherRandomness: "randomness {value}",
    weatherTempHintTitle: "Ambient temperature",
    weatherTempHintBody: "Air temperature around the session start: {value}C. It affects tyre warm-up and overall grip.",
    weatherCloudsHintTitle: "Cloud cover",
    weatherCloudsHintBody: "{value}% cloud cover expected for this slot. More clouds usually mean a cooler, flatter track.",
    weatherRainHintTitle: "Rain chance",
    weatherRainHintBody: "{value}% rain probability for this slot. Higher values mean a greater chance of wet conditions.",
    weatherRandomHintTitle: "Weather randomness",
    weatherRandomHintBody: "Randomness level {value}. Higher values make the weather less predictable during the event.",
    weatherModalEyebrow: "Weather details",
    weatherModalTitle: "Race weather",
    weatherModalSubtitle: "Tap any indicator to understand what it means.",
    unknownValue: "--",
    racesTableTitle: "Race Results",
    racesTableSubtitle: "Click any row to open the finishing order.",
    racesCols: ["Date", "Track", "Winner", "Drivers", "Best Lap"],
    openRaceDetailsLabel: "Open race details",
    raceModalEyebrow: "Race details",
    raceModalCols: ["Pos", "Start", "Delta", "Driver", "Best Lap", "Car", "Gap", "Pts", "Pen pts"],
    raceSummaryTrack: "Track",
    raceSummaryWinner: "Winner",
    raceSummaryDrivers: "Drivers",
    raceSummaryBestLap: "Best lap",
    raceBestLapBadge: "Fastest lap",
    notCountedBadge: "Not counted",
    noWinner: "No winner",
    closeLabel: "Close"
  },
  ru: {
    htmlLang: "ru",
    pageTitle: "Часовая гонка | ASG Racing",
    metaDescription: "Расписание, ближайший анонс и последние заезды отдельного сервера ASG Racing для часовых гонок.",
    ogTitle: "Часовая гонка | ASG Racing",
    ogDescription: "Расписание, ближайший анонс и последние заезды отдельного сервера ASG Racing для часовых гонок.",
    twitterTitle: "Часовая гонка | ASG Racing",
    twitterDescription: "Расписание, ближайший анонс и последние заезды отдельного сервера ASG Racing для часовых гонок.",
    ogLocale: "ru_RU",
    homeAriaLabel: "Главная ASG Racing",
    langSwitcherLabel: "Переключение языка",
    navMore: "Еще",
    navMoreAriaLabel: "Открыть дополнительную навигацию",
    navLeaderboard: "На главную",
    navLastRaces: "Последние гонки",
    navCars: "Машины",
    navHourly: "Часовая гонка",
    heroServerLabel: "Сервер",
    heroPasswordLabel: "Пароль",
    heroEntryLabel: "Вход",
    heroFormatLabel: "Формат",
    heroPitstopLabel: "Пит-стоп",
    heroMandatoryLabel: "Обязательно",
    heroRefuelLabel: "Заправка",
    heroTyresLabel: "Шины",
    heroWeatherLabel: "Погода",
    serverConnectBtn: "Подключиться",
    serverConnectHowTo: "Как подключиться?",
    serverConnectUnavailable: "Укажите публичный IP/host сервера, чтобы включить прямое подключение",
    announcementEyebrow: "Ближайший старт",
    scheduleEyebrow: "План",
    archiveEyebrow: "Архив",
    scheduleTitle: "Ближайшие слоты",
    recentTitle: "Последние заезды",
    labelDate: "Дата",
    labelTime: "Время",
    labelTrack: "Трасса",
    labelWindow: "Длительность окна",
    loadingShort: "Загрузка...",
    loadError: "Ошибка загрузки.",
    defaultAnnouncementTitle: "Часовая гонка",
    scheduleEmpty: "Нет данных.",
    recentEmpty: "Пока нет завершенных заездов.",
    locale: "ru-RU",
    entrySlots: "{value} слотов",
    entrySafety: "SA {value}+",
    entryTrackMedals: "Медали трассы {value}",
    entryRacecraft: "RC {value}+",
    preRaceWait: "Престарт {value}м",
    overtime: "Овертайм {value}м",
    timeMultiplierChip: "x{value} время",
    mandatoryPitstopCount: "{value} обязательный пит",
    mandatoryPitstopCountPlural: "{value} обязательных пит-стопа",
    pitWindow: "окно {value}м",
    pitNoMandatory: "Без обязательного пит-стопа",
    pitRefuelAllowed: "дозаправка разрешена",
    pitRefuelFixed: "фикс. время дозаправки",
    mandatoryRefuel: "дозаправка",
    mandatoryTyres: "смена шин",
    mandatoryDriverSwap: "смена пилота",
    mandatoryNone: "Нет обязательных сервисных действий",
    refuelMandatory: "обязат. дозаправка",
    refuelNone: "без правил по заправке",
    tyresMandatory: "обязат. смена шин",
    tyresSets: "{value} компл.",
    tyresNone: "без правил по шинам",
    passwordNone: "Без пароля",
    weatherClear: "Ясно",
    weatherMixed: "Переменная облачность",
    weatherCloudy: "Облачно",
    weatherWet: "Есть риск дождя",
    weatherTemp: "{value}C",
    weatherClouds: "облачность {value}%",
    weatherRain: "дождь {value}%",
    weatherRandomness: "рандомность {value}",
    weatherTempHintTitle: "Температура воздуха",
    weatherTempHintBody: "Температура воздуха к началу сессии: {value}C. Она влияет на прогрев шин и общий уровень сцепления.",
    weatherCloudsHintTitle: "Облачность",
    weatherCloudsHintBody: "Ожидаемая облачность для этого слота: {value}%. Чем ее больше, тем прохладнее и ровнее покрытие.",
    weatherRainHintTitle: "Вероятность дождя",
    weatherRainHintBody: "Вероятность дождя для этого слота: {value}%. Чем выше значение, тем больше шанс влажной трассы.",
    weatherRandomHintTitle: "Рандомность погоды",
    weatherRandomHintBody: "Уровень рандомности: {value}. Чем он выше, тем менее предсказуемой будет погода по ходу ивента.",
    weatherModalEyebrow: "Детали погоды",
    weatherModalTitle: "Погода на гонку",
    weatherModalSubtitle: "Нажми на показатель, чтобы понять, что именно он означает.",
    unknownValue: "--",
    racesTableTitle: "Результаты заездов",
    racesTableSubtitle: "Нажми на строку, чтобы открыть финишный протокол.",
    racesCols: ["Дата", "Трасса", "Победитель", "Пилоты", "Лучший круг"],
    openRaceDetailsLabel: "Открыть детали гонки",
    raceModalEyebrow: "Детали гонки",
    raceModalCols: ["Поз", "Старт", "Дельта", "Пилот", "Лучший круг", "Машина", "Отставание", "Очки", "Штр."],
    raceSummaryTrack: "Трасса",
    raceSummaryWinner: "Победитель",
    raceSummaryDrivers: "Пилоты",
    raceSummaryBestLap: "Лучший круг",
    raceBestLapBadge: "Быстрейший круг",
    notCountedBadge: "Не в зачете",
    noWinner: "Нет победителя",
    closeLabel: "Закрыть"
  }
};

Object.assign(translations.ru, {
  navGroupEvent: "\u0418\u0432\u0435\u043d\u0442",
  navCurrentChampionship: "\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u0447\u0435\u043c\u043f\u0438\u043e\u043d\u0430\u0442",
  navPastChampionships: "\u041f\u0440\u043e\u0448\u0435\u0434\u0448\u0438\u0435 \u0447\u0435\u043c\u043f\u0438\u043e\u043d\u0430\u0442\u044b",
  navGroupAsg: "ASG Racing",
  btnRules: "\u041f\u0440\u0430\u0432\u0438\u043b\u0430",
  btnNews: "\u041d\u043e\u0432\u043e\u0441\u0442\u0438",
  btnChampionship: "\u0420\u0435\u0439\u0442\u0438\u043d\u0433",
  btnBestLaps: "\u041b\u0443\u0447\u0448\u0438\u0435 \u043a\u0440\u0443\u0433\u0438",
  btnWorstSafety: "Safety Rating",
  btnBans: "\u0411\u0430\u043d\u044b",
  btnCommunity: "\u0421\u043e\u043e\u0431\u0449\u0435\u0441\u0442\u0432\u043e",
  btnAboutServer: "\u041e \u0441\u0435\u0440\u0432\u0435\u0440\u0435",
  newsBellAriaLabel: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f",
  newsBellUnreadLabel: "{count} \u043d\u0435\u043f\u0440\u043e\u0447\u0438\u0442\u0430\u043d\u043d\u044b\u0445 \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0439",
  newsBellEmpty: "\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u043d\u043e\u0432\u044b\u0445 \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0439.",
  newsModalTitle: "\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f",
  newsModalSubtitle: "\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f, \u0442\u0435\u0445\u0440\u0430\u0431\u043e\u0442\u044b \u0438 \u043d\u043e\u0432\u043e\u0441\u0442\u0438 \u0441\u043e\u043e\u0431\u0449\u0435\u0441\u0442\u0432\u0430.",
  newsModalOpenAll: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0432\u0441\u0435 \u043d\u043e\u0432\u043e\u0441\u0442\u0438"
});

Object.assign(translations.ru, {
  navLeaderboard: "На главную",
  navUpcoming: "События",
  navRaceResults: "Результаты",
  scheduleTableSubtitle: "Нажми на строку, чтобы открыть детали слота.",
  scheduleCols: ["Дата + UTC", "Трасса", "Дождь"],
  openScheduleDetailsLabel: "Открыть детали слота",
  scheduleModalEyebrow: "Детали слота",
  scheduleModalDateTime: "Дата и время",
  scheduleModalSlot: "Слот",
  scheduleModalRain: "Прогноз дождя",
  calendarSummary: "Полный календарь событий",
  calendarEmpty: "Пока нет событий в календаре.",
  championshipBadge: "Событие чемпионата",
  hourlyBadge: "Часовая гонка",
  enduranceBadge: "Эндюранс",
  pointsMultiplierBadge: "×{value} очков",
  standardScoringBadge: "Стандартная сетка ×1",
  championshipEyebrow: "Чемпионат",
  championshipOpenButton: "Открыть чемпионат",
  championshipNoDescription: "Следи за прогрессом активного чемпионата, ближайшими гонками и таблицей.",
  votingDisabledChampionship: "Голосование для событий чемпионата отключено"
});

Object.assign(translations.ru, {
  voteButton: "Я хочу поехать!",
  voteButtonDone: "Ты в списке",
  voteCountZero: "Пока никто не отметился",
  voteCountOne: "{value} хочет поехать",
  voteCountMany: "{value} хотят поехать",
  voteSoon: "Опрос скоро",
  voteSending: "Сохраняем...",
  voteFailed: "Повтори позже",
  unvoteButton: "Отменить голос"
});

Object.assign(translations.ru, {
  copyAction: "РЎРєРѕРїРёСЂРѕРІР°С‚СЊ {field}",
  copiedAction: "{field} СЃРєРѕРїРёСЂРѕРІР°РЅ"
});

Object.assign(translations.en, {
  footerText:
    "Statistics are generated from ACC Dedicated Server result files and published via GitHub Pages.",
  modalConnectionTitle: "Connection",
  modalFormatTitle: "Event format",
  modalConditionsTitle: "Race conditions",
  modalClassLabel: "Class",
  modalSlotsLabel: "Slots",
  modalSafetyLabel: "Safety Rating",
  modalPreparationLabel: "Preparation",
  modalQualifyingLabel: "Qualifying",
  modalRaceLabel: "Race",
  modalGameTimeLabel: "In-game time",
  modalTimeMultiplierLabel: "Time acceleration",
  modalPitWindowLabel: "Pit window",
  modalRefuelAllowedLabel: "Refuel",
  modalMandatoryRefuelLabel: "Mandatory refuel",
  modalRefuelFixedLabel: "Fixed refuel time",
  modalTemperatureLabel: "Temperature",
  modalCloudsLabel: "Cloud cover",
  modalRainLabel: "Rain chance",
  modalRandomnessLabel: "Randomness",
  modalNotSpecified: "Not specified",
  modalAllowed: "allowed",
  modalForbidden: "forbidden",
  modalYes: "yes",
  modalNo: "no",
  modalParticipantOne: "{value} participant",
  modalParticipantMany: "{value} participants"
});

Object.assign(translations.ru, {
  footerText:
    "Данные собираются из файлов результатов ACC Dedicated Server и публикуются через GitHub Pages.",
  modalConnectionTitle: "\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435",
  modalFormatTitle: "\u0424\u043e\u0440\u043c\u0430\u0442 \u0441\u043e\u0431\u044b\u0442\u0438\u044f",
  modalConditionsTitle: "\u0423\u0441\u043b\u043e\u0432\u0438\u044f \u0433\u043e\u043d\u043a\u0438",
  modalClassLabel: "\u041a\u043b\u0430\u0441\u0441",
  modalSlotsLabel: "\u0421\u043b\u043e\u0442\u044b",
  modalSafetyLabel: "Safety Rating",
  modalPreparationLabel: "\u041f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430",
  modalQualifyingLabel: "\u041a\u0432\u0430\u043b\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u044f",
  modalRaceLabel: "\u0413\u043e\u043d\u043a\u0430",
  modalGameTimeLabel: "\u0418\u0433\u0440\u043e\u0432\u043e\u0435 \u0432\u0440\u0435\u043c\u044f",
  modalTimeMultiplierLabel: "\u0423\u0441\u043a\u043e\u0440\u0435\u043d\u0438\u0435 \u0432\u0440\u0435\u043c\u0435\u043d\u0438",
  modalPitWindowLabel: "\u041e\u043a\u043d\u043e \u043f\u0438\u0442-\u0441\u0442\u043e\u043f\u0430",
  modalRefuelAllowedLabel: "\u0417\u0430\u043f\u0440\u0430\u0432\u043a\u0430",
  modalMandatoryRefuelLabel: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u0437\u0430\u043f\u0440\u0430\u0432\u043a\u0430",
  modalRefuelFixedLabel: "\u0424\u0438\u043a\u0441. \u0432\u0440\u0435\u043c\u044f \u0437\u0430\u043f\u0440\u0430\u0432\u043a\u0438",
  modalTemperatureLabel: "\u0422\u0435\u043c\u043f\u0435\u0440\u0430\u0442\u0443\u0440\u0430",
  modalCloudsLabel: "\u041e\u0431\u043b\u0430\u0447\u043d\u043e\u0441\u0442\u044c",
  modalRainLabel: "\u0412\u0435\u0440\u043e\u044f\u0442\u043d\u043e\u0441\u0442\u044c \u0434\u043e\u0436\u0434\u044f",
  modalRandomnessLabel: "\u0418\u0437\u043c\u0435\u043d\u0447\u0438\u0432\u043e\u0441\u0442\u044c",
  modalNotSpecified: "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e",
  modalAllowed: "\u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0430",
  modalForbidden: "\u0437\u0430\u043f\u0440\u0435\u0449\u0435\u043d\u0430",
  modalYes: "\u0434\u0430",
  modalNo: "\u043d\u0435\u0442",
  modalParticipantOne: "{value} \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a",
  modalParticipantMany: "{value} \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u043e\u0432"
});

let currentLang = "en";
Object.assign(translations.ru, {
  championshipHistoryTitle: "РСЃС‚РѕСЂРёСЏ С‡РµРјРїРёРѕРЅР°С‚РѕРІ",
  championshipHistorySubtitle: "РўРµРєСѓС‰РёРµ Рё Р°СЂС…РёРІРЅС‹Рµ С‡РµРјРїРёРѕРЅР°С‚С‹ ASG Racing СЃ РёС‚РѕРіР°РјРё Рё СЃСЃС‹Р»РєР°РјРё РЅР° СЂРµР·СѓР»СЊС‚Р°С‚С‹.",
  championshipHistoryEmpty: "РћРїСѓР±Р»РёРєРѕРІР°РЅРЅС‹С… С‡РµРјРїРёРѕРЅР°С‚РѕРІ РїРѕРєР° РЅРµС‚.",
  championshipStatusActive: "РђРєС‚РёРІРЅС‹Р№",
  championshipStatusUpcoming: "РЎРєРѕСЂРѕ",
  championshipStatusFinished: "Р—Р°РІРµСЂС€РµРЅ",
  championshipStatusArchived: "РђСЂС…РёРІ",
  championshipWinnerLabel: "РџРѕР±РµРґРёС‚РµР»СЊ",
  championshipRacesLabel: "Р“РѕРЅРѕРє",
  championshipDriversLabel: "РџРёР»РѕС‚РѕРІ"
});
let announcementData = {};
let serverStatusData = null;
let scheduleItems = [];
let championshipItems = [];
let recentRaceItems = [];
let eventModalVersion = EVENT_MODAL_VERSION;
let lastScheduleModalTrigger = null;

function buildScheduleItems(schedule, announcement) {
  const items = Array.isArray(schedule?.items) ? schedule.items : [];
  if (items.length) return items;
  if (!announcement?.date || !announcement?.start_time_local) return [];
  return [
    {
      event_id:
        announcement.event_id ||
        `hourly_${announcement.date}_${String(announcement.start_time_local).replace(/[^0-9]/g, "")}`,
      date: announcement.date,
      start_time_local: announcement.start_time_local,
      timezone: announcement.timezone,
      track_code: announcement.track_code,
      track_name: announcement.track_name,
      slot_label: announcement.session_label,
      status: announcement.status,
      event_type: announcement.event_type,
      race_format: announcement.race_format,
      competition_mode: announcement.competition_mode,
      points_multiplier: announcement.points_multiplier,
      scoring_mode: announcement.scoring_mode,
      server_window_minutes: announcement.server_window_minutes,
      launch_at: announcement.launch_at,
      weather: announcement.weather,
      rain_level: announcement.weather?.rain_level
    }
  ];
}
function isChampionshipEvent(item) {
  return String(item?.competition_mode || item?.event_type || item?.type || "").trim().toLowerCase() === "championship";
}
function isEnduranceEvent(item) {
  return String(item?.race_format || item?.event_type || item?.type || "").trim().toLowerCase() === "endurance";
}
function isVotingDisabledForItem(item) {
  return Boolean(item?.voting_disabled) && !isChampionshipEvent(item);
}
function eventBadgeLabel(item) {
  if (item?.badge_label) return getLocalizedField(item, "badge_label", item.badge_label);
  if (isEnduranceEvent(item)) return t("enduranceBadge");
  return isChampionshipEvent(item) ? t("championshipBadge") : t("hourlyBadge");
}
function eventBadgeLabels(item) {
  const labels = [];
  if (item?.badge_label) labels.push(getLocalizedField(item, "badge_label", item.badge_label));
  else if (isEnduranceEvent(item)) labels.push(t("enduranceBadge"));
  else labels.push(t("hourlyBadge"));
  if (isChampionshipEvent(item)) labels.push(t("championshipBadge"));
  return [...new Set(labels.filter(Boolean))];
}
function scoringBadgeLabel(item) {
  if (isChampionshipEvent(item)) return t("standardScoringBadge");
  const numeric = Number(item?.points_multiplier);
  const value = Number.isFinite(numeric) ? numeric : (isEnduranceEvent(item) ? 1 : 5);
  return String(t("pointsMultiplierBadge")).replace("{value}", String(value));
}
function renderEventBadges(item) {
  const types = eventBadgeLabels(item)
    .map(label => `<span class="event-type-badge">${escapeHtml(label)}</span>`)
    .join("");
  return `<div class="event-badges">${types}<span class="points-multiplier-badge">${escapeHtml(scoringBadgeLabel(item))}</span></div>`;
}
let recentRacesPage = 1;
let recentRacesPageSize = 10;
let recentRacesTotalItems = 0;
let recentRacesTotalPages = 1;
let selectedScheduleItem = null;
let selectedRace = null;
let hasLoadError = false;
const hourlyLoadState = {
  core: true,
  recent: true
};
let recentRacesLoadPromise = null;
let recentRacesObserver = null;
let votesEnabled = Boolean(votesApiBase);
let votesLoaded = false;
let voteStateByEventId = loadStoredVoteState();
let newsFeedData = [];
let newsFeedSourceUrl = newsFeedUrl;
let newsModalController = null;
const raceDetailsCache = new Map();
const HERO_TRACK_BACKGROUNDS = {
  barcelona: `${topSiteBaseUrl}/assets/barcelona.jpg`,
  hungaroring: `${topSiteBaseUrl}/assets/hungaroring.jpg`,
  imola: `${topSiteBaseUrl}/assets/imola.jpg`,
  kyalami: `${topSiteBaseUrl}/assets/kyalami.jpg`,
  laguna_seca: `${topSiteBaseUrl}/assets/laguna_seca.jpg`,
  lagunaseca: `${topSiteBaseUrl}/assets/laguna_seca.jpg`,
  misano: `${topSiteBaseUrl}/assets/misano.jpg`,
  monza: `${topSiteBaseUrl}/assets/monza.jpg`,
  monzatg: `${topSiteBaseUrl}/assets/monzaTG.jpg`,
  mount_panorama: `${topSiteBaseUrl}/assets/mount_panorama.jpg`,
  mountpanorama: `${topSiteBaseUrl}/assets/mount_panorama.jpg`,
  nurburgring: `${topSiteBaseUrl}/assets/nurburgring.jpg`,
  nurburgring_24h: `${topSiteBaseUrl}/assets/nurburgring_24h.jpg`,
  nurburgring24h: `${topSiteBaseUrl}/assets/nurburgring_24h.jpg`,
  nordschl: `${topSiteBaseUrl}/assets/nurburgring_24h.jpg`,
  nordschleife: `${topSiteBaseUrl}/assets/nurburgring_24h.jpg`,
  paul_ricard: `${topSiteBaseUrl}/assets/paul_ricard.jpg`,
  paulricard: `${topSiteBaseUrl}/assets/paul_ricard.jpg`,
  silverstone: `${topSiteBaseUrl}/assets/silverstone.jpg`,
  spa: `${topSiteBaseUrl}/assets/spa.jpg`,
  suzuka: `${topSiteBaseUrl}/assets/suzuka.jpg`,
  zandvoort: `${topSiteBaseUrl}/assets/zandvoort.jpg`,
  zolder: `${topSiteBaseUrl}/assets/zolder.jpg`
};
const WEATHER_ICON_PATHS = {
  clouds: "./assets/weather/cloudness.png",
  rain: "./assets/weather/rain.png",
  random: "./assets/weather/random.png"
};
const pendingVoteEventIds = new Set();

function t(key) { return translations[currentLang]?.[key] ?? translations.en[key] ?? key; }
function tf(key, replacements = {}) {
  let value = t(key);
  Object.entries(replacements).forEach(([k, v]) => { value = value.replace(`{${k}}`, String(v)); });
  return value;
}
function resolveInitialLanguage() {
  const urlLang = new URLSearchParams(window.location.search).get("lang");
  if (urlLang && translations[urlLang]) return urlLang;
  const storedLang = localStorage.getItem("asgLang");
  if (storedLang && translations[storedLang]) return storedLang;
  const browserLanguages = Array.isArray(navigator.languages) && navigator.languages.length ? navigator.languages : [navigator.language];
  const preferred = browserLanguages.map(value => String(value || "").trim().toLowerCase()).find(Boolean);
  return preferred && preferred.startsWith("ru") ? "ru" : "en";
}
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function formatNewsDateTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).padStart(4, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}
function getNewsListHref() {
  return `${topSiteBaseUrl}/news/`;
}
function getNewsArticleHref(slug) {
  return slug ? `${getNewsListHref()}?slug=${encodeURIComponent(slug)}` : getNewsListHref();
}
function loadNewsReadState() {
  try {
    const rawValue = localStorage.getItem(NEWS_READ_STORAGE_KEY);
    if (!rawValue) return {};
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}
function saveNewsReadState(items) {
  try {
    localStorage.setItem(NEWS_READ_STORAGE_KEY, JSON.stringify(items || {}));
  } catch (error) {
    // News read state is a local convenience feature.
  }
}
function isNewsItemRead(item) {
  const state = loadNewsReadState();
  const key = String(item?.id || item?.slug || "").trim();
  return Boolean(key && state[key]);
}
function markNewsItemRead(item) {
  const key = String(item?.id || item?.slug || "").trim();
  if (!key) return;
  const state = loadNewsReadState();
  if (state[key]) return;
  state[key] = Date.now();
  saveNewsReadState(state);
}
function normalizeNewsImageUrl(value) {
  const sourceValue = String(value || "").trim();
  if (!sourceValue) return "";
  if (/^(?:https?:)?\/\//i.test(sourceValue)) return sourceValue;
  try {
    return new URL(sourceValue, newsFeedSourceUrl || window.location.href).toString();
  } catch (error) {
    return sourceValue;
  }
}
function normalizeNewsItem(rawItem) {
  if (!rawItem || typeof rawItem !== "object") return null;
  const slug = String(rawItem.slug || rawItem.id || "").trim();
  const title = String(rawItem.title || "").trim();
  if (!slug || !title) return null;
  return {
    id: String(rawItem.id || slug).trim(),
    slug,
    title,
    thumbnail_url: normalizeNewsImageUrl(rawItem.thumbnail_url || rawItem.image?.thumbnail || rawItem.cover_image_url || rawItem.image?.cover),
    published_at: String(rawItem.published_at || rawItem.date || "").trim(),
    expires_at: String(rawItem.expires_at || "").trim(),
    priority: Number(rawItem.priority) || 0,
    is_pinned: Boolean(rawItem.is_pinned)
  };
}
function getSortedNewsFeed(items = newsFeedData) {
  return [...items]
    .filter(Boolean)
    .filter(item => {
      const publishedAt = Date.parse(String(item?.published_at || ""));
      return !Number.isFinite(publishedAt) || publishedAt <= Date.now();
    })
    .filter(item => {
      const expiresAt = Date.parse(String(item?.expires_at || ""));
      return !(Number.isFinite(expiresAt) && expiresAt < Date.now());
    })
    .sort((a, b) => {
      if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) return a.is_pinned ? -1 : 1;
      if ((Number(a.priority) || 0) !== (Number(b.priority) || 0)) return (Number(b.priority) || 0) - (Number(a.priority) || 0);
      return Date.parse(String(b.published_at || "")) - Date.parse(String(a.published_at || ""));
    });
}
function getUnreadNewsCount(items = newsFeedData) {
  return getSortedNewsFeed(items).filter(item => !isNewsItemRead(item)).length;
}
async function loadNewsFeed() {
  let payload = null;
  try {
    const response = await fetch(newsFeedUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    payload = await response.json();
  } catch (error) {
    payload = null;
  }
  const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
  newsFeedSourceUrl = newsFeedUrl;
  newsFeedData = items.map(normalizeNewsItem).filter(Boolean);
  return newsFeedData;
}
function renderNewsThumb(item) {
  if (item?.thumbnail_url) {
    return `<img class="news-thumb news-notification-thumb" src="${escapeHtml(item.thumbnail_url)}" alt="${escapeHtml(item.title || "")}" loading="lazy" />`;
  }
  return `<div class="news-thumb news-thumb-placeholder news-notification-thumb" aria-hidden="true"><span>NEWS</span></div>`;
}
function renderNewsNotificationTitle(title) {
  const value = String(title || "").trim();
  if (!value) return "";
  const parts = value.split(/\s+\/\s+/);
  if (parts.length < 2) return `<span class="news-notification-title">${escapeHtml(value)}</span>`;
  return `<span class="news-bilingual-stack"><span class="news-notification-title">${escapeHtml(parts[0].trim())}</span><span class="news-notification-title-secondary">${escapeHtml(parts.slice(1).join(" / ").trim())}</span></span>`;
}
function renderNewsNotificationsModal() {
  const listEl = document.getElementById("news-notifications-list");
  if (!listEl) return;
  const items = getSortedNewsFeed(newsFeedData).slice(0, 6);
  listEl.innerHTML = items.length
    ? items.map(item => `
      <a class="news-notification-card${!isNewsItemRead(item) ? " is-unread" : ""}" href="${escapeHtml(getNewsArticleHref(item.slug))}" data-news-open-slug="${escapeHtml(item.slug)}">
        <span class="news-notification-copy">
          <span class="news-notification-meta">${escapeHtml(formatNewsDateTime(item.published_at))}</span>
          ${renderNewsNotificationTitle(item.title)}
          ${renderNewsThumb(item)}
        </span>
      </a>
    `).join("")
    : `<div class="empty-box">${escapeHtml(t("newsBellEmpty"))}</div>`;
}
function renderNewsBell() {
  const button = document.getElementById("news-bell-button");
  const badge = document.getElementById("news-bell-badge");
  const panel = document.getElementById("news-notifications-panel");
  if (!button || !badge) return;
  const unreadCount = getUnreadNewsCount(newsFeedData);
  button.classList.toggle("has-unread", unreadCount > 0);
  badge.hidden = unreadCount <= 0;
  badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
  button.setAttribute("aria-label", unreadCount > 0 ? tf("newsBellUnreadLabel", { count: unreadCount }) : t("newsBellAriaLabel"));
  if (panel) button.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
}
function closeNewsNotificationsPopover() {
  const panel = document.getElementById("news-notifications-panel");
  const button = document.getElementById("news-bell-button");
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  button?.setAttribute("aria-expanded", "false");
}
function syncNewsNotificationsPopoverPosition() {
  const panel = document.getElementById("news-notifications-panel");
  const button = document.getElementById("news-bell-button");
  if (!panel || !button) return;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  if (viewportWidth > 640) {
    panel.style.removeProperty("--news-popover-top");
    panel.style.removeProperty("--news-popover-inset");
    return;
  }
  const rect = button.getBoundingClientRect();
  const inset = viewportWidth <= 420 ? 6 : 10;
  const top = Math.max(56, Math.round(rect.bottom + 10));
  panel.style.setProperty("--news-popover-top", `${top}px`);
  panel.style.setProperty("--news-popover-inset", `${inset}px`);
}
function openNewsNotificationsPopover() {
  const panel = document.getElementById("news-notifications-panel");
  const button = document.getElementById("news-bell-button");
  if (!panel || !button) return;
  renderNewsNotificationsModal();
  syncNewsNotificationsPopoverPosition();
  panel.hidden = false;
  button.setAttribute("aria-expanded", "true");
}
function ensureNewsNotificationsUi() {
  const actionsEl = document.querySelector(".top-nav-actions");
  if (actionsEl && !document.getElementById("news-bell-button")) {
    const wrapper = document.createElement("div");
    wrapper.className = "top-nav-news-bell";
    wrapper.innerHTML = `
      <button class="news-bell-btn" id="news-bell-button" type="button" aria-label="${escapeHtml(t("newsBellAriaLabel"))}" aria-haspopup="dialog" aria-expanded="false" aria-controls="news-notifications-panel">
        <span class="news-bell-icon" aria-hidden="true">&#128276;</span>
        <span class="news-bell-badge" id="news-bell-badge" hidden>0</span>
      </button>
      <div class="news-notifications-panel" id="news-notifications-panel" role="dialog" aria-modal="false" aria-labelledby="news-notifications-title" hidden>
        <div class="news-notifications-popover-head">
          <div>
            <h3 id="news-notifications-title" class="news-notifications-popover-title" data-i18n="newsModalTitle">${escapeHtml(t("newsModalTitle"))}</h3>
            <p class="news-notifications-popover-subtitle" data-i18n="newsModalSubtitle">${escapeHtml(t("newsModalSubtitle"))}</p>
          </div>
        </div>
        <div class="news-notifications-list" id="news-notifications-list"></div>
        <div class="news-notifications-footer">
          <a class="top-nav-link top-nav-link-secondary news-notifications-open-all" href="${escapeHtml(getNewsListHref())}" data-i18n="newsModalOpenAll">${escapeHtml(t("newsModalOpenAll"))}</a>
        </div>
      </div>
    `;
    actionsEl.insertBefore(wrapper, actionsEl.firstChild || null);
  }
}
function initNewsNotificationsModal() {
  if (newsModalController) return;
  const wrapper = document.querySelector(".top-nav-news-bell");
  const button = document.getElementById("news-bell-button");
  const panel = document.getElementById("news-notifications-panel");
  const listEl = document.getElementById("news-notifications-list");
  if (!wrapper || !button || !panel || !listEl) return;
  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    if (panel.hidden) openNewsNotificationsPopover();
    else closeNewsNotificationsPopover();
  });
  listEl.addEventListener("click", event => {
    const link = event.target?.closest?.("[data-news-open-slug]");
    if (!link) return;
    const item = newsFeedData.find(entry => entry.slug === String(link.dataset.newsOpenSlug || "").trim());
    if (item) markNewsItemRead(item);
    closeNewsNotificationsPopover();
    renderNewsBell();
    renderNewsNotificationsModal();
  });
  panel.addEventListener("click", event => event.stopPropagation());
  document.addEventListener("click", event => {
    if (!wrapper.contains(event.target)) closeNewsNotificationsPopover();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeNewsNotificationsPopover();
  });
  window.addEventListener("resize", () => {
    if (!panel.hidden) syncNewsNotificationsPopoverPosition();
  });
  newsModalController = { open: openNewsNotificationsPopover, close: closeNewsNotificationsPopover };
}
function getLocalizedField(item, key, fallback = "--") {
  if (!item || typeof item !== "object") return fallback;
  const directLocalized = item[`${key}_${currentLang}`];
  if (typeof directLocalized === "string" && directLocalized.trim()) return directLocalized;
  const raw = item[key];
  if (typeof raw === "string" && raw.trim()) return raw;
  if (raw && typeof raw === "object") {
    const nested = raw[currentLang] ?? raw.en ?? raw.ru;
    if (typeof nested === "string" && nested.trim()) return nested;
  }
  return fallback;
}
function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value || t("unknownValue");
}
function setHtml(id, value) {
  const element = document.getElementById(id);
  if (element) element.innerHTML = value || escapeHtml(t("unknownValue"));
}
function compactJoin(parts) { return parts.filter(Boolean).join(" · "); }
function renderLoadingMarkup(label = "") {
  return `<div class="empty">${escapeHtml(label || t("loadingShort"))}</div>`;
}
function renderCoreLoadingState() {
  setText("announcement-date", t("loadingShort"));
  setText("announcement-time", t("loadingShort"));
  setText("announcement-track", t("loadingShort"));
  setText("hero-server-name", t("loadingShort"));
  setText("hero-server-password", t("loadingShort"));
  setText("hero-entry-rules", t("loadingShort"));
  setText("hero-race-format", t("loadingShort"));
  setText("hero-pitstop-rules", t("loadingShort"));
  setText("hero-refuel-rules", t("loadingShort"));
  setText("hero-tyre-rules", t("loadingShort"));
  setText("hero-weather", t("loadingShort"));
  setText("hero-championship-title", t("loadingShort"));
  setText("hero-championship-meta", t("loadingShort"));
  setText("hero-championship-badge", t("loadingShort"));
  setText("hero-championship-track", t("loadingShort"));
  setText("hero-championship-date", t("loadingShort"));
  setText("hero-championship-weather", t("loadingShort"));
  setText("hero-championship-format", t("loadingShort"));
  setText("hero-championship-pit", t("loadingShort"));
  setText("hero-championship-description", t("loadingShort"));

  const voteEl = document.getElementById("hero-vote");
  if (voteEl) voteEl.innerHTML = renderLoadingMarkup(t("loadingShort"));
  const scheduleEl = document.getElementById("schedule-v2-list") || document.getElementById("schedule-list");
  if (scheduleEl) scheduleEl.innerHTML = renderLoadingMarkup(t("loadingShort"));
  const championshipsEl = document.getElementById("championship-history-list");
  if (championshipsEl) championshipsEl.innerHTML = renderLoadingMarkup(t("loadingShort"));
  const calendarGridEl = document.getElementById("calendar-v2-grid") || document.getElementById("calendar-grid");
  if (calendarGridEl) calendarGridEl.innerHTML = renderLoadingMarkup(t("loadingShort"));
  const calendarCountEl = document.getElementById("calendar-v2-count") || document.getElementById("calendar-count");
  if (calendarCountEl) calendarCountEl.textContent = t("loadingShort");
  setText("hourly-upcoming-v2-title", t("loadingShort"));
  setText("hourly-upcoming-v2-date-time", t("loadingShort"));
  setHtml("hourly-upcoming-v2-info-grid", renderLoadingMarkup(t("loadingShort")));
  const upcomingFooterEl = document.getElementById("hourly-upcoming-v2-footer");
  if (upcomingFooterEl) upcomingFooterEl.innerHTML = "";
  setText("hourly-championship-v2-title", t("loadingShort"));
  setText("hourly-championship-v2-meta", t("loadingShort"));
  setHtml("hourly-championship-v2-event", renderLoadingMarkup(t("loadingShort")));
  setText("hourly-championship-v2-description", t("loadingShort"));
}
function renderRecentRacesLoadingState() {
  const container = document.getElementById("recent-races-table");
  if (container) container.innerHTML = renderLoadingMarkup(t("loadingShort"));
}
function normalizeChampionshipStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "active") return "active";
  if (normalized === "upcoming") return "upcoming";
  if (normalized === "finished") return "finished";
  return "archived";
}
function getChampionshipStatusLabel(value) {
  const normalized = normalizeChampionshipStatus(value);
  if (normalized === "active") return t("championshipStatusActive");
  if (normalized === "upcoming") return t("championshipStatusUpcoming");
  if (normalized === "finished") return t("championshipStatusFinished");
  return t("championshipStatusArchived");
}
function getChampionshipTitle(item) {
  return getLocalizedField(item, "title", item?.title || item?.slug || "--");
}
function getChampionshipDescription(item) {
  return getLocalizedField(item, "description", item?.description || t("championshipNoDescription"));
}
function getChampionshipUrl(item) {
  const slug = String(item?.slug || "").trim();
  return slug ? `./championship/?slug=${encodeURIComponent(slug)}` : "./championship/";
}
function normalizeChampionshipItems(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items
    .filter(item => item && typeof item === "object" && String(item.slug || "").trim())
    .map(item => ({
      ...item,
      slug: String(item.slug || "").trim(),
      status: normalizeChampionshipStatus(item.status),
      title: getChampionshipTitle(item),
      description: getChampionshipDescription(item),
      race_count: Number(item.race_count) || 0,
      driver_count: Number(item.driver_count) || 0
    }));
}
function setupRecentRacesLazyLoad() {
  if (recentRacesObserver || recentRacesLoadPromise) return;
  const target = document.getElementById("recent-races");
  if (!target || !("IntersectionObserver" in window)) {
    void ensureRecentRacesLoaded();
    return;
  }

  recentRacesObserver = new IntersectionObserver((entries) => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    recentRacesObserver?.disconnect();
    recentRacesObserver = null;
    void ensureRecentRacesLoaded();
  }, { rootMargin: "240px 0px" });

  recentRacesObserver.observe(target);
}
async function ensureRecentRacesLoaded() {
  if (recentRacesLoadPromise) return recentRacesLoadPromise;

  recentRacesLoadPromise = (async () => {
    try {
      await loadRecentRacesPage(1);
    } catch (error) {
      console.error(error);
    } finally {
      hourlyLoadState.recent = false;
      renderUI();
    }
  })();

  return recentRacesLoadPromise;
}
function setHeroCopyButtonLabel(button, copied = false) {
  if (!button) return;
  const fieldLabel = t(button.dataset.copyLabelKey || "") || "";
  const label = copied ? tf("copiedAction", { field: fieldLabel }) : tf("copyAction", { field: fieldLabel });
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
}
async function copyToClipboard(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("copy failed");
  return true;
}
function bindHeroCopyButtons(root = document) {
  root.querySelectorAll(".hero-copy-btn").forEach(button => {
    setHeroCopyButtonLabel(button, button.classList.contains("is-copied"));
    if (button.dataset.copyBound === "true") return;
    button.dataset.copyBound = "true";
    button.addEventListener("click", async event => {
      event.preventDefault();
      const target = document.getElementById(button.dataset.copyTarget || "");
      const value = target?.textContent?.trim() || "";
      if (!target || !value || value === "--") return;
      try {
        await copyToClipboard(value);
        button.classList.add("is-copied");
        setHeroCopyButtonLabel(button, true);
        window.clearTimeout(Number(button.dataset.copyResetTimer || 0));
        const timerId = window.setTimeout(() => {
          button.classList.remove("is-copied");
          setHeroCopyButtonLabel(button, false);
          delete button.dataset.copyResetTimer;
        }, 1600);
        button.dataset.copyResetTimer = String(timerId);
      } catch (error) {
        console.warn("hero copy failed", error);
      }
    });
  });
}
function minutesFromSeconds(value) { return typeof value === "number" && !Number.isNaN(value) ? Math.round(value / 60) : null; }
function percentValue(value) { return typeof value === "number" && !Number.isNaN(value) ? Math.round(value * 100) : null; }
function formatMandatoryPitstopCount(value) {
  if (typeof value !== "number" || value <= 0) return t("pitNoMandatory");
  return value === 1 ? tf("mandatoryPitstopCount", { value }) : tf("mandatoryPitstopCountPlural", { value });
}
function buildEntryRules(server) {
  if (!server || typeof server !== "object") return t("unknownValue");
  const parts = [];
  if (server.car_group) parts.push(server.car_group);
  if (typeof server.max_car_slots === "number" && server.max_car_slots > 0) parts.push(tf("entrySlots", { value: server.max_car_slots }));
  if (typeof server.safety_rating_requirement === "number" && server.safety_rating_requirement > 0) parts.push(tf("entrySafety", { value: server.safety_rating_requirement }));
  if (typeof server.track_medals_requirement === "number" && server.track_medals_requirement > 0) parts.push(tf("entryTrackMedals", { value: server.track_medals_requirement }));
  if (typeof server.racecraft_rating_requirement === "number" && server.racecraft_rating_requirement > 0) parts.push(tf("entryRacecraft", { value: server.racecraft_rating_requirement }));
  return compactJoin(parts) || t("unknownValue");
}
function buildRaceFormat(session) {
  if (!session || typeof session !== "object") return t("unknownValue");
  const parts = [];
  if (session.format_label) parts.push(session.format_label);
  const preRaceMinutes = minutesFromSeconds(session.pre_race_waiting_time_seconds);
  if (preRaceMinutes && preRaceMinutes > 0) parts.push(tf("preRaceWait", { value: preRaceMinutes }));
  const overtimeMinutes = minutesFromSeconds(session.session_over_time_seconds);
  if (overtimeMinutes && overtimeMinutes > 0) parts.push(tf("overtime", { value: overtimeMinutes }));
  return compactJoin(parts) || t("unknownValue");
}
function createHeroToken(label, tone = "default", icon = "", tooltipTitle = "", tooltipBody = "") {
  return { label, tone, icon, tooltipTitle, tooltipBody };
}
function renderHeroTokenGroups(groups) {
  const tokens = (groups || [])
    .flatMap(group => (group || []).filter(token => token && token.label));
  const normalizedTokens = tokens.length ? tokens : [createHeroToken(t("unknownValue"), "muted")];
  return `<div class="hero-token-list">${normalizedTokens
    .map(token => {
      const hasTooltip = token.tooltipTitle || token.tooltipBody;
      return `<span class="hero-token hero-token-${escapeHtml(token.tone || "default")}${hasTooltip ? " hero-token-has-tooltip" : ""}"${hasTooltip ? ' tabindex="0"' : ""}>${token.icon ? `<img class="hero-token-icon" src="${escapeHtml(token.icon)}" alt="" aria-hidden="true" />` : ""}<span class="hero-token-text">${escapeHtml(token.label)}</span>${hasTooltip ? `<span class="hero-token-tooltip" role="tooltip">${token.icon ? `<img class="hero-token-tooltip-icon" src="${escapeHtml(token.icon)}" alt="" aria-hidden="true" />` : ""}<span class="hero-token-tooltip-copy"><span class="hero-token-tooltip-title">${escapeHtml(token.tooltipTitle || token.label)}</span>${token.tooltipBody ? `<span class="hero-token-tooltip-body">${escapeHtml(token.tooltipBody)}</span>` : ""}</span></span>` : ""}</span>`;
    })
    .join("")}</div>`;
}
function setHeroTokenValue(id, groups) {
  const element = document.getElementById(id);
  if (!element) return;
  element.innerHTML = renderHeroTokenGroups(groups);
  const card = element.closest(".hero-server-item, .hero-announcement-weather");
  if (card) card.classList.add("has-token-value");
}
function buildEntryTokenGroups(server) {
  if (!server || typeof server !== "object") return [];
  const tokens = [];
  if (server.car_group) tokens.push(createHeroToken(server.car_group, "primary"));
  if (typeof server.max_car_slots === "number" && server.max_car_slots > 0) tokens.push(createHeroToken(tf("entrySlots", { value: server.max_car_slots }), "default"));
  if (typeof server.safety_rating_requirement === "number" && server.safety_rating_requirement > 0) tokens.push(createHeroToken(tf("entrySafety", { value: server.safety_rating_requirement }), "muted"));
  if (typeof server.track_medals_requirement === "number" && server.track_medals_requirement > 0) tokens.push(createHeroToken(tf("entryTrackMedals", { value: server.track_medals_requirement }), "muted"));
  if (typeof server.racecraft_rating_requirement === "number" && server.racecraft_rating_requirement > 0) tokens.push(createHeroToken(tf("entryRacecraft", { value: server.racecraft_rating_requirement }), "muted"));
  return [tokens];
}

function pickFirstNonEmpty(...values) {
  return values.find(value => String(value ?? "").trim()) ?? "";
}

function normalizeAccConnectConfig(server, fallback = {}) {
  const hostname = String(pickFirstNonEmpty(
    server?.acc_connect_hostname,
    server?.connect_hostname,
    server?.hostname,
    server?.host,
    server?.ip,
    fallback.hostname
  )).trim();
  const port = Number(pickFirstNonEmpty(
    server?.acc_connect_port,
    server?.tcp_port,
    server?.tcpPort,
    server?.port,
    fallback.port
  ));
  const name = String(pickFirstNonEmpty(
    server?.acc_connect_name,
    fallback.name,
    server?.name,
    server?.full_name
  )).trim();

  return {
    hostname,
    port,
    name,
    persistent: server?.persistent ?? fallback.persistent ?? true
  };
}

function buildAccConnectHref(config) {
  if (!config?.hostname || !Number.isFinite(config.port) || config.port <= 0) return "";
  const url = new URL(`acc-connect://${config.hostname}:${config.port}/`);
  if (config.name) url.searchParams.set("name", config.name);
  if (config.persistent) url.searchParams.set("persistent", "true");
  return url.href;
}

function updateHeroConnectLink(server) {
  const link = document.getElementById("hero-connect-link");
  if (!link) return;

  const hourlyStatus = serverStatusData?.servers?.hourly || serverStatusData?.hourly || {};
  const href = buildAccConnectHref(normalizeAccConnectConfig({ ...server, ...hourlyStatus }, ACC_CONNECT_SERVER_FALLBACK));
  link.textContent = t("serverConnectBtn");
  link.classList.toggle("is-disabled", !href);
  link.setAttribute("aria-disabled", href ? "false" : "true");
  link.setAttribute("title", href ? t("serverConnectBtn") : t("serverConnectUnavailable"));
  link.href = href || "#";
}
function buildRaceFormatTokenGroups(session) {
  if (!session || typeof session !== "object") return [];
  const primary = [];
  if (typeof session.qualifying_duration_minutes === "number" && session.qualifying_duration_minutes > 0) primary.push(createHeroToken(`Q ${session.qualifying_duration_minutes}m`, "primary"));
  if (typeof session.race_duration_minutes === "number" && session.race_duration_minutes > 0) primary.push(createHeroToken(`R ${session.race_duration_minutes}m`, "primary"));
  if (!primary.length && session.format_label) {
    session.format_label.split(" + ").map(part => part.trim()).filter(Boolean).forEach(part => primary.push(createHeroToken(part, "primary")));
  }
  return [primary];
}
function getEventSession(data, fallback = {}) {
  const session = { ...(fallback || {}), ...(data?.session || {}) };
  const raceDuration = Number(data?.race_duration_minutes);
  if (Number.isFinite(raceDuration) && raceDuration > 0) session.race_duration_minutes = raceDuration;
  return session;
}
function buildPitstopTokenGroups(rules) {
  if (!rules || typeof rules !== "object") return [];
  const primary = [createHeroToken(formatMandatoryPitstopCount(rules.mandatory_pitstop_count), rules.mandatory_pitstop_count > 0 ? "primary" : "muted")];
  const secondary = [];
  if (typeof rules.pit_window_length_minutes === "number" && rules.pit_window_length_minutes > 0) secondary.push(createHeroToken(tf("pitWindow", { value: rules.pit_window_length_minutes }), "default"));
  return [primary, secondary];
}
function buildRefuelTokenGroups(rules) {
  if (!rules || typeof rules !== "object") return [];
  const primary = [];
  if (rules.refuelling_allowed_in_race) primary.push(createHeroToken(t("pitRefuelAllowed"), "default"));
  if (rules.refuelling_time_fixed) primary.push(createHeroToken(t("pitRefuelFixed"), "muted"));
  if (rules.mandatory_pitstop_refuelling_required) primary.push(createHeroToken(t("refuelMandatory"), "primary"));
  if (!primary.length) primary.push(createHeroToken(t("refuelNone"), "muted"));
  return [primary];
}
function buildTyreTokenGroups(rules) {
  if (!rules || typeof rules !== "object") return [];
  const primary = [];
  if (rules.mandatory_pitstop_tyre_change_required) primary.push(createHeroToken(t("tyresMandatory"), "primary"));
  if (typeof rules.tyre_set_count === "number" && rules.tyre_set_count > 0) primary.push(createHeroToken(tf("tyresSets", { value: rules.tyre_set_count }), "muted"));
  if (!primary.length) primary.push(createHeroToken(t("tyresNone"), "muted"));
  return [primary];
}
function buildWeatherTokenGroups(weather) {
  if (!weather || typeof weather !== "object") return [];
  const primary = [];
  const secondary = [];
  if (typeof weather.ambient_temp_c === "number") {
    primary.push(createHeroToken(
      tf("weatherTemp", { value: weather.ambient_temp_c }),
      "default",
      "",
      t("weatherTempHintTitle"),
      tf("weatherTempHintBody", { value: weather.ambient_temp_c })
    ));
  }
  const cloudPercent = percentValue(weather.cloud_level);
  if (cloudPercent !== null) {
    secondary.push(createHeroToken(
      `${cloudPercent}%`,
      "muted",
      WEATHER_ICON_PATHS.clouds,
      t("weatherCloudsHintTitle"),
      tf("weatherCloudsHintBody", { value: cloudPercent })
    ));
  }
  const rainPercent = percentValue(weather.rain_level);
  if (rainPercent !== null) {
    secondary.push(createHeroToken(
      `${rainPercent}%`,
      "muted",
      WEATHER_ICON_PATHS.rain,
      t("weatherRainHintTitle"),
      tf("weatherRainHintBody", { value: rainPercent })
    ));
  }
  if (typeof weather.weather_randomness === "number") {
    secondary.push(createHeroToken(
      String(weather.weather_randomness),
      "muted",
      WEATHER_ICON_PATHS.random,
      t("weatherRandomHintTitle"),
      tf("weatherRandomHintBody", { value: weather.weather_randomness })
    ));
  }
  return [primary, secondary];
}
function buildWeatherModalCards(weather) {
  const cards = [];
  if (typeof weather?.ambient_temp_c === "number") {
    cards.push({
      icon: "",
      value: tf("weatherTemp", { value: weather.ambient_temp_c }),
      title: t("weatherTempHintTitle"),
      body: tf("weatherTempHintBody", { value: weather.ambient_temp_c })
    });
  }
  const cloudPercent = percentValue(weather?.cloud_level);
  if (cloudPercent !== null) {
    cards.push({
      icon: WEATHER_ICON_PATHS.clouds,
      value: `${cloudPercent}%`,
      title: t("weatherCloudsHintTitle"),
      body: tf("weatherCloudsHintBody", { value: cloudPercent })
    });
  }
  const rainPercent = percentValue(weather?.rain_level);
  if (rainPercent !== null) {
    cards.push({
      icon: WEATHER_ICON_PATHS.rain,
      value: `${rainPercent}%`,
      title: t("weatherRainHintTitle"),
      body: tf("weatherRainHintBody", { value: rainPercent })
    });
  }
  if (typeof weather?.weather_randomness === "number") {
    cards.push({
      icon: WEATHER_ICON_PATHS.random,
      value: String(weather.weather_randomness),
      title: t("weatherRandomHintTitle"),
      body: tf("weatherRandomHintBody", { value: weather.weather_randomness })
    });
  }
  return cards;
}
function formatRainForecast(item) {
  const rainLevel =
    item?.weather?.rain_level ??
    item?.rain_level ??
    announcementData?.weather?.rain_level;
  const rainPercent = percentValue(rainLevel);
  return rainPercent !== null ? tf("weatherRain", { value: rainPercent }) : t("unknownValue");
}
function getWeatherStateLabel(weather) {
  const state = String(weather?.summary_key || "").trim().toLowerCase();
  if (state === "clear") return t("weatherClear");
  if (state === "mixed") return t("weatherMixed");
  if (state === "cloudy") return t("weatherCloudy");
  if (state === "wet") return t("weatherWet");
  return t("unknownValue");
}
function getWeatherVisualState(weather) {
  const state = String(weather?.summary_key || "").trim().toLowerCase();
  if (state === "wet" || state === "rain" || state === "rainy") return "wet";
  if (state === "clear") return "clear";
  if (state === "mixed" || state === "cloudy") return "mixed";
  const rain = percentValue(weather?.rain_level);
  if (rain !== null && rain > 5) return "wet";
  const clouds = percentValue(weather?.cloud_level);
  if (clouds === null) return "mixed";
  return clouds >= 35 ? "mixed" : "clear";
}
function renderWeatherStateIcon(weather, className = "") {
  const state = getWeatherVisualState(weather);
  const extraClass = className ? ` ${className}` : "";
  if (state === "wet") {
    return `<svg class="weather-state-icon is-wet${extraClass}" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.1 15.3h9.3a3.6 3.6 0 0 0 .35-7.18A5 5 0 0 0 7 7.45a3.95 3.95 0 0 0 .1 7.85Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="m8.5 18-1 2.3m5-2.3-1 2.3m5-2.3-1 2.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  }
  if (state === "mixed") {
    return `<svg class="weather-state-icon is-mixed${extraClass}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.2" cy="8.1" r="3.1" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8.2 2.5v1.6m0 8v1.4M2.7 8.1h1.5m8 0h1.5M4.3 4.2l1.1 1.1m5.7 0 1.1-1.1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8.1 18.2h9a3.5 3.5 0 0 0 .36-6.98 4.75 4.75 0 0 0-9.28-.65 3.85 3.85 0 0 0-.08 7.63Z" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  return `<svg class="weather-state-icon is-clear${extraClass}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v2.2m0 14.6v2.2M2.5 12h2.2m14.6 0h2.2M5.3 5.3l1.6 1.6m10.2 10.2 1.6 1.6m0-13.4-1.6 1.6M6.9 17.1l-1.6 1.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}
function getWeatherMetricIconName(metric, percent) {
  if (percent === null || percent === undefined || percent === "") return metric;
  const value = Number(percent);
  if (!Number.isFinite(value)) return metric;
  if (metric === "cloud") {
    if (value <= 25) return "cloud-clear";
    if (value <= 59) return "cloud-mixed";
    if (value <= 79) return "cloud-heavy";
    return "cloud-overcast";
  }
  if (value <= 1) return "rain-none";
  if (value <= 10) return "rain-light";
  if (value <= 34) return "rain-medium";
  if (value <= 59) return "rain-heavy";
  return "rain-storm";
}
function getWeatherMetricIconSvg(name) {
  if (name === "cloud-clear") return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.5 1.5m9.8 9.8 1.5 1.5m0-12.8-1.5 1.5M7.1 16.9l-1.5 1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  if (name === "cloud-mixed") return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 2.8v1.3M3 8h1.3m.2-3.5 1 1M13 4.5l-1 1M7.8 18.5h9.3a3.6 3.6 0 0 0 .37-7.18 4.8 4.8 0 0 0-9.4-.65 3.95 3.95 0 0 0-.27 7.83Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (name === "cloud-heavy") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 18.2h9a4 4 0 0 0 .42-7.98A5.25 5.25 0 0 0 6.35 9.3a3.75 3.75 0 0 0 .85 8.9Z" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (name === "cloud-overcast") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.7h8.7a3.5 3.5 0 0 0 .35-6.98 4.6 4.6 0 0 0-8.98-.6 3.8 3.8 0 0 0-.07 7.58Z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7.2 19h9.4a3.7 3.7 0 0 0 .38-7.38 4.9 4.9 0 0 0-9.57-.65A4 4 0 0 0 7.2 19Z" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="1.8"/></svg>`;
  if (name === "rain-none") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5c2.8 3.5 4.2 5.9 4.2 7.8a4.2 4.2 0 1 1-8.4 0c0-1.9 1.4-4.3 4.2-7.8Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m5 5 14 14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`;
  if (name === "rain-light") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.3c3 3.8 4.5 6.3 4.5 8.3a4.5 4.5 0 1 1-9 0c0-2 1.5-4.5 4.5-8.3Z" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-width="1.8"/></svg>`;
  const drops = name === "rain-medium" ? `<path d="m12 17.5-.8 2.2"/>` : name === "rain-heavy" ? `<path d="m8.5 17.3-.8 2.4m4.8-2.4-.8 2.4m4.8-2.4-.8 2.4"/>` : `<path d="m7.5 17-.9 2.8m4-2.8-.9 2.8m4-2.8-.9 2.8m4-2.8-.9 2.8"/>`;
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.1 15.3h9.3a3.6 3.6 0 0 0 .35-7.18A5 5 0 0 0 7 7.45a3.95 3.95 0 0 0 .1 7.85Z" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>${drops.replace("/>", ` fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`)}</svg>`;
}
function getGameTimeTitle() {
  return currentLang === "ru" ? "Игровое время" : "In-game time";
}
function formatGameTimeHour(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  return `${String(Math.max(0, Math.min(23, Math.round(value)))).padStart(2, "0")}:00`;
}
function getGameTimeLabel(gameTime) {
  if (!gameTime || typeof gameTime !== "object") return "";
  if (currentLang === "ru" && gameTime.label_ru) return String(gameTime.label_ru);
  if (gameTime.label) return String(gameTime.label);
  const code = String(gameTime.code || gameTime.profile_id || "").trim().toLowerCase();
  if (code === "morning") return currentLang === "ru" ? "Утро" : "Morning";
  if (code === "day") return currentLang === "ru" ? "День" : "Day";
  if (code === "evening") return currentLang === "ru" ? "Вечер" : "Evening";
  if (code === "night") return currentLang === "ru" ? "Ночь" : "Night";
  return code ? code.replace(/[_-]+/g, " ") : "";
}
function formatGameTimeValue(gameTime) {
  const label = getGameTimeLabel(gameTime);
  const hour = formatGameTimeHour(gameTime?.hour_of_day ?? gameTime?.game_time_hour);
  if (label && hour) return `${label} · ${hour}`;
  return label || hour || "";
}
function getGameTimeVisualState(gameTime, fallbackHour) {
  const code = String(gameTime?.code || gameTime?.profile_id || "").trim().toLowerCase();
  if (["morning", "day", "evening", "night"].includes(code)) return code;
  const hour = Number(gameTime?.hour_of_day ?? gameTime?.game_time_hour ?? fallbackHour);
  if (!Number.isFinite(hour)) return "day";
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}
function getGameTimeStateSvg(state, className = "") {
  const classes = className ? ` ${className}` : "";
  if (state === "morning") return `<svg class="game-time-state-icon is-morning${classes}" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 5v3M5.6 10.2l2.1 2.1M18.4 10.2l-2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (state === "evening") return `<svg class="game-time-state-icon is-evening${classes}" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M4 14h16M7 14a5 5 0 0 0 10 0M12 19v2M5.6 18.5l2.1-2.1M18.4 18.5l-2.1-2.1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (state === "night") return `<svg class="game-time-state-icon is-night${classes}" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M19.2 15.3A7.7 7.7 0 0 1 8.7 4.8 7.8 7.8 0 1 0 19.2 15.3Z" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.8 4.2v2.4M16.6 5.4H19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  return `<svg class="game-time-state-icon is-day${classes}" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="12" r="4.25" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="1.9"/><path d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12h-2.5M18.54 5.46l-1.77 1.77M7.23 16.77l-1.77 1.77M18.54 18.54l-1.77-1.77M7.23 7.23 5.46 5.46" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`;
}
function renderGameTimeStateIcon(gameTime, fallbackHour, className = "") {
  return getGameTimeStateSvg(getGameTimeVisualState(gameTime, fallbackHour), className);
}
function formatScheduleCardDateTime(item) {
  const startTime = getLocalizedField(item, "start_time_local", item?.start_time_local || "--");
  const timezone = getLocalizedField(item, "timezone", item?.timezone || "UTC+3");
  if (!item?.date) return `${startTime} ${timezone}`.trim();
  const date = new Date(`${item.date}T00:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return `${item.date} · ${startTime} ${timezone}`;
  const shortDate = new Intl.DateTimeFormat(t("locale"), {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Moscow"
  }).format(date);
  return `${shortDate} · ${startTime} ${timezone}`;
}
function buildScheduleCardWeather(item) {
  const weather = item?.weather || {};
  const state = weather.summary_key ? getWeatherStateLabel(weather) : null;
  const rainLevel = percentValue(weather.rain_level ?? item?.rain_level);
  if (state && rainLevel !== null) return `${state} · ${rainLevel}%`;
  if (state) return state;
  if (rainLevel !== null) return `${rainLevel}%`;
  return t("unknownValue");
}
const buildScheduleCardWeatherBase = buildScheduleCardWeather;
buildScheduleCardWeather = function(item) {
  const baseText = buildScheduleCardWeatherBase(item);
  const gameTimeText = formatGameTimeValue(item?.game_time);
  if (!gameTimeText) return baseText;
  if (!baseText || baseText === t("unknownValue")) return gameTimeText;
  return `${baseText} · ${gameTimeText}`;
};
function renderScheduleConditions(item) {
  const weather = item?.weather || { rain_level: item?.rain_level };
  const weatherText = buildScheduleCardWeatherBase(item);
  const gameTimeText = formatGameTimeValue(item?.game_time);
  const gameTimeHtml = gameTimeText
    ? `<span class="schedule-condition-separator" aria-hidden="true">\u00b7</span>${renderGameTimeStateIcon(item?.game_time)}<span>${escapeHtml(gameTimeText)}</span>`
    : "";
  return `${renderWeatherStateIcon(weather)}<span>${escapeHtml(weatherText)}</span>${gameTimeHtml}`;
}
function formatScheduleDateTime(item) {
  const startTime = getLocalizedField(item, "start_time_local", item?.start_time_local || "--");
  const timezone = getLocalizedField(item, "timezone", item?.timezone || "UTC+3");
  return `${formatDate(item?.date)} · ${startTime} ${timezone}`;
}
function buildScheduleModalDetailsLegacy(item) {
  const server = announcementData?.server || {};
  const session = announcementData?.session || {};
  const rules = announcementData?.rules || {};
  const weather = item?.weather || announcementData?.weather || {};
  const detailsUrl = item?.details_url ? String(item.details_url) : "";
  return `
    <div class="schedule-modal-hero">
      <div class="schedule-modal-vote">
        ${buildVoteControls(item, "hero")}
        ${isVotingDisabledForItem(item) ? "" : `<div class="legal-inline-note">${buildCompactVoteLegalNoteHtml()}</div>`}
      </div>

      <section class="hero-server-card schedule-modal-hero-pane">
        <div class="hero-server-stack">
          <div class="hero-server-grid hero-server-grid-rules">
            <div class="hero-server-item">
              <div class="label">${escapeHtml(t("heroPitstopLabel"))}</div>
              <div class="value">${renderHeroTokenGroups(buildPitstopTokenGroups(rules))}</div>
            </div>
            <div class="hero-server-item">
              <div class="label">${escapeHtml(t("heroRefuelLabel"))}</div>
              <div class="value">${renderHeroTokenGroups(buildRefuelTokenGroups(rules))}</div>
            </div>
            <div class="hero-server-item">
              <div class="label">${escapeHtml(t("heroTyresLabel"))}</div>
              <div class="value">${renderHeroTokenGroups(buildTyreTokenGroups(rules))}</div>
            </div>
          </div>
        </div>
      </section>

      <aside class="hero-announcement-card schedule-modal-hero-pane">
        <div class="hero-announcement-inline-meta">
          <div class="stat hero-announcement-inline-stat hero-announcement-inline-stat-combined">
            <div class="value">${renderHeroTokenGroups(buildEntryTokenGroups(server))}</div>
            <div class="hero-announcement-inline-divider" aria-hidden="true"></div>
            <div class="value">${renderHeroTokenGroups(buildRaceFormatTokenGroups(session))}</div>
          </div>
        </div>

        <div class="hero-announcement-weather has-token-value">
          <div class="value">${renderHeroTokenGroups(buildWeatherTokenGroups(weather))}</div>
        </div>
      </aside>
      ${
        detailsUrl
          ? `<a class="event-details-link" href="${escapeHtml(detailsUrl)}">${escapeHtml(eventBadgeLabel(item))}</a>`
          : ""
      }
    </div>
  `;
}
function getFirstDefinedValue(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function getNumericModalValue(source, keys) {
  const value = getFirstDefinedValue(source, keys);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getBooleanModalValue(source, keys) {
  const value = getFirstDefinedValue(source, keys);
  if (value === true || value === false) return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "allowed"].includes(normalized)) return true;
    if (["false", "0", "no", "forbidden"].includes(normalized)) return false;
  }
  return null;
}

function formatModalHourOfDay(value) {
  if (typeof value === "string" && value.trim()) {
    const rawValue = value.trim();
    if (/^\d{1,2}:\d{2}$/.test(rawValue)) return rawValue.padStart(5, "0");
  }
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return t("modalNotSpecified");
  const hours = Math.max(0, Math.min(23, Math.floor(numericValue)));
  return `${String(hours).padStart(2, "0")}:00`;
}

function getSessionGameTimeValue(session) {
  const directValue = getFirstDefinedValue(session, [
    "in_game_start_time",
    "inGameStartTime",
    "session_start_time",
    "sessionStartTime"
  ]);
  if (typeof directValue === "string" && directValue.trim()) return formatModalHourOfDay(directValue);
  const hourValue = getNumericModalValue(session, ["hour_of_day", "hourOfDay"]);
  return hourValue === null ? t("modalNotSpecified") : formatModalHourOfDay(hourValue);
}

function getSessionTimeMultiplierValue(session) {
  return getNumericModalValue(session, [
    "time_multiplier",
    "timeMultiplier",
    "race_time_multiplier",
    "raceTimeMultiplier",
    "session_time_multiplier",
    "sessionTimeMultiplier"
  ]);
}

function formatModalAllowedValue(value) {
  if (value === true) return t("modalAllowed");
  if (value === false) return t("modalForbidden");
  return t("modalNotSpecified");
}

function formatModalYesNoValue(value) {
  if (value === true) return t("modalYes");
  if (value === false) return t("modalNo");
  return t("modalNotSpecified");
}

function formatModalMinutesValue(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value} ${currentLang === "ru" ? "мин" : "min"}`
    : t("modalNotSpecified");
}

function formatModalTimeMultiplierValue(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `×${value}`
    : t("modalNotSpecified");
}

function formatModalTemperatureValue(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value)}°C`
    : t("modalNotSpecified");
}

function formatModalPercentValue(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value)}%`
    : t("modalNotSpecified");
}

function formatModalMandatoryPitstopCountValue(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return t("modalNotSpecified");
  if (currentLang !== "ru") return value === 1 ? "1 mandatory" : `${value} mandatory`;
  const mod100 = value % 100;
  const mod10 = value % 10;
  const suffix = mod100 >= 11 && mod100 <= 14
    ? "\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0445"
    : mod10 === 1
      ? "\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0439"
      : "\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0445";
  return `${value} ${suffix}`;
}

function formatModalTyreSetCountValue(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return t("modalNotSpecified");
  if (currentLang !== "ru") return value === 1 ? "1 set" : `${value} sets`;
  const mod100 = Math.abs(value) % 100;
  const mod10 = mod100 % 10;
  const suffix = mod100 >= 11 && mod100 <= 14
    ? "\u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442\u043e\u0432"
    : mod10 === 1
      ? "\u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442"
      : mod10 >= 2 && mod10 <= 4
        ? "\u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442\u0430"
        : "\u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442\u043e\u0432";
  return `${value} ${suffix}`;
}

function getModalParticipantCountLabel(value) {
  if (typeof value !== "number" || value <= 0) return t("voteCountZero");
  return tf(value === 1 ? "modalParticipantOne" : "modalParticipantMany", { value });
}

function getScheduleModalViewModel(item) {
  const server = item?.server || announcementData?.server || {};
  const session = getEventSession(item, announcementData?.session || {});
  const rules = item?.rules || announcementData?.rules || {};
  const weather = item?.weather || announcementData?.weather || {};
  const voteState = getVoteState(item);
  const startTime = getLocalizedField(item, "start_time_local", item?.start_time_local || "--");
  const timezone = getLocalizedField(item, "timezone", item?.timezone || "UTC+3");
  return {
    item,
    trackName: getLocalizedField(item, "track_name", item?.track_name || "--"),
    startDateLabel: formatDate(item?.date),
    startTimeLabel: startTime,
    timezoneLabel: timezone,
    serverName: server.name || server.full_name || t("unknownValue"),
    password: server.password || t("passwordNone"),
    carClass: server.car_group || t("modalNotSpecified"),
    slotCount: getNumericModalValue(server, ["max_car_slots", "maxCarSlots"]),
    safetyRating: getNumericModalValue(server, ["safety_rating_requirement", "safetyRatingRequirement"]),
    preparationMinutes: minutesFromSeconds(session.pre_race_waiting_time_seconds),
    qualifyingMinutes: getNumericModalValue(session, ["qualifying_duration_minutes", "qualifyingDurationMinutes"]),
    raceMinutes: getNumericModalValue(session, ["race_duration_minutes", "raceDurationMinutes"]),
    inGameTime: formatGameTimeValue(item?.game_time) || getSessionGameTimeValue(session),
    inGameTimeIcon: getGameTimeVisualState(item?.game_time, session.hour_of_day ?? session.hourOfDay),
    timeMultiplier: getSessionTimeMultiplierValue(session),
    mandatoryPitstopCount: getNumericModalValue(rules, ["mandatory_pitstop_count", "mandatoryPitstopCount"]),
    pitWindowMinutes: getNumericModalValue(rules, ["pit_window_length_minutes", "pitWindowLengthMinutes"]),
    refuellingAllowed: getBooleanModalValue(rules, ["refuelling_allowed_in_race", "refuellingAllowedInRace"]),
    mandatoryRefuelling: getBooleanModalValue(rules, ["mandatory_pitstop_refuelling_required", "mandatoryPitstopRefuellingRequired"]),
    fixedRefuellingTime: getBooleanModalValue(rules, ["refuelling_time_fixed", "refuellingTimeFixed"]),
    tyreSetCount: getNumericModalValue(rules, ["tyre_set_count", "tyreSetCount"]),
    temperatureC: getNumericModalValue(weather, ["ambient_temp_c", "ambientTempC"]),
    cloudLevelPercent: percentValue(weather.cloud_level),
    rainProbabilityPercent: percentValue(weather.rain_level),
    weatherRandomness: getNumericModalValue(weather, ["weather_randomness", "weatherRandomness"]),
    voteState,
    detailsUrl: item?.details_url ? String(item.details_url) : ""
  };
}

function getEventDetailsV2IconSvg(name) {
  if (name.startsWith("cloud-") || name.startsWith("rain-")) return getWeatherMetricIconSvg(name);
  if (["morning", "day", "evening", "night"].includes(name)) return getGameTimeStateSvg(name);
  const icons = {
    calendar: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M8 3v3M16 3v3M4 9h16M5.75 5.75h12.5a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H5.75a2 2 0 0 1-2-2V7.75a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    close: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"></path></svg>`,
    copy: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M9 9h11v11H9z" fill="none" stroke="currentColor" stroke-width="1.8"></path><path d="M4 4h11v11H4z" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg>`,
    check: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M5 12.5 9.2 16.7 19 7.5" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    server: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M4.75 6.5h14.5M4.75 12h14.5M4.75 17.5h14.5M6.75 4.75h10.5a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    flag: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="m5 4 11 2.5-4 4 4 3.5-4 4L16 20 5 17.5V4Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    wrench: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="m14.4 6.6 3-3a2.12 2.12 0 0 1 3 3l-3 3M13 8l3 3-8.75 8.75H4.25v-3L13 8Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    timer: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="13" r="7.25" fill="none" stroke="currentColor" stroke-width="1.9"></circle><path d="M12 13V9.25M9.25 2.75h5.5M14.75 5.5l1.5-1.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    stopwatch: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="13" r="7.25" fill="none" stroke="currentColor" stroke-width="1.9"></circle><path d="M9.25 2.75h5.5M12 13l3.25-2.25M14.75 5.5l1.5-1.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    play: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.9"></circle><path d="m10.25 8.75 5 3.25-5 3.25V8.75Z" fill="currentColor"></path></svg>`,
    sun: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="12" r="4.25" fill="none" stroke="currentColor" stroke-width="1.9"></circle><path d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12h-2.5M18.54 5.46l-1.77 1.77M7.23 16.77l-1.77 1.77M18.54 18.54l-1.77-1.77M7.23 7.23 5.46 5.46" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path></svg>`,
    fast: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="m4.5 6.75 6.5 5.25-6.5 5.25V6.75Zm8.5 0 6.5 5.25-6.5 5.25V6.75Z" fill="currentColor"></path></svg>`,
    fuel: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M6.25 5.25h7.5a1.5 1.5 0 0 1 1.5 1.5v10.5a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5V6.75a1.5 1.5 0 0 1 1.5-1.5Zm9-1.5 3 3v7.25a1.75 1.75 0 0 1-3.5 0V12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    drop: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 4.25c3.4 4.16 5.1 6.95 5.1 9.1A5.1 5.1 0 1 1 6.9 13.35c0-2.15 1.7-4.94 5.1-9.1Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    tyre: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="12" r="7.25" fill="none" stroke="currentColor" stroke-width="1.9"></circle><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.9"></circle></svg>`,
    temp: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M10.25 6a2.25 2.25 0 1 1 4.5 0v7.2a4 4 0 1 1-4.5 0V6Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12.5 10v5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path></svg>`,
    cloud: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M7.25 18.25h9a4 4 0 0 0 .42-7.98A5.25 5.25 0 0 0 6.4 9.35 3.75 3.75 0 0 0 7.25 18.25Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    rain: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M7.25 15.5h9a4 4 0 0 0 .42-7.98A5.25 5.25 0 0 0 6.4 6.6a3.75 3.75 0 0 0 .85 8.9Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 17.75 8.25 20M13 17.75 12.25 20M17 17.75 16.25 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path></svg>`,
    wind: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M4 9.25h9.5a2.75 2.75 0 1 0-2.7-3.25M4 14h13.5a2.25 2.25 0 1 1-2.2 2.75M4 18.25h7.5a2.25 2.25 0 1 0-2.2 2.75" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
    users: `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M8.5 11.25a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Zm7 2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.75 18c.5-2.55 2.66-4.25 5.25-4.25S13.75 15.45 14.25 18M13.25 18c.38-1.78 1.88-3 3.75-3s3.37 1.22 3.75 3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`
  };
  return icons[name] || icons.server;
}

function buildEventDetailsV2Icon(name, className = "") {
  return `<span class="event-details-v2-icon${className ? ` ${className}` : ""}" aria-hidden="true">${getEventDetailsV2IconSvg(name)}</span>`;
}

function buildEventDetailsV2CopyButton(targetId) {
  return `
    <button
      class="hero-copy-btn event-details-v2-copy-button"
      type="button"
      data-copy-target="${escapeHtml(targetId)}"
      data-copy-label-key="heroPasswordLabel"
    >
      <span class="hero-copy-icon hero-copy-icon-copy" aria-hidden="true">${getEventDetailsV2IconSvg("copy")}</span>
      <span class="hero-copy-icon hero-copy-icon-done" aria-hidden="true">${getEventDetailsV2IconSvg("check")}</span>
    </button>
  `;
}

function buildEventDetailsV2Row(label, value, iconName, options = {}) {
  const rowClass = options.rowClass ? ` ${options.rowClass}` : "";
  const labelClass = options.accent ? " event-details-v2-info-label-accent" : "";
  const valueClass = options.accent ? " event-details-v2-info-value-accent" : "";
  const iconClass = options.accent ? " event-details-v2-info-icon-accent" : "";
  return `
    <div class="event-details-v2-info-row${rowClass}">
      <div class="event-details-v2-info-label${labelClass}">
        ${buildEventDetailsV2Icon(iconName, `event-details-v2-info-icon${iconClass}`)}
        <span>${escapeHtml(label)}</span>
      </div>
      <div class="event-details-v2-info-value${valueClass}">${value}</div>
    </div>
  `;
}

function buildEventDetailsV2Card(title, iconName, bodyClassName, rowsHtml) {
  return `
    <section class="event-details-v2-card ${escapeHtml(bodyClassName)}">
      <div class="event-details-v2-card-header">
        ${buildEventDetailsV2Icon(iconName, "event-details-v2-card-icon")}
        <h4 class="event-details-v2-card-title">${escapeHtml(title)}</h4>
      </div>
      <div class="event-details-v2-card-body">
        ${rowsHtml}
      </div>
    </section>
  `;
}

function buildEventDetailsV2Footer(viewModel) {
  const detailsLinkHtml = viewModel.detailsUrl
    ? `<a class="event-details-v2-details-link" href="${escapeHtml(viewModel.detailsUrl)}">${escapeHtml(currentLang === "ru" ? "\u041f\u043e\u0434\u0440\u043e\u0431\u043d\u0435\u0435" : "Details")}</a>`
    : "";
  if (isVotingDisabledForItem(viewModel.item)) {
    return `
      <footer class="event-details-v2-footer event-details-v2-footer-locked">
        <div class="event-details-v2-voting-notice">${escapeHtml(t("votingDisabledChampionship"))}</div>
        ${detailsLinkHtml}
      </footer>
    `;
  }
  const voteState = viewModel.voteState;
  const voteLabel = voteState.already_voted ? t("voteButtonDone") : t("voteButton");
  return `
    <footer class="event-details-v2-footer">
      <button
        class="event-details-v2-participation-button${voteState.already_voted ? " is-voted" : ""}"
        type="button"
        data-vote-event-id="${escapeHtml(voteState.eventId)}"
        ${(!votesApiBase || voteState.already_voted || voteState.pending) ? "disabled" : ""}
      >
        ${buildEventDetailsV2Icon("check", "event-details-v2-participation-icon")}
        <span>${escapeHtml(voteLabel)}</span>
      </button>
      ${
        voteState.already_voted
          ? `
            <button
              class="event-details-v2-cancel-button"
              type="button"
              data-unvote-event-id="${escapeHtml(voteState.eventId)}"
              aria-label="${escapeHtml(t("unvoteButton"))}"
              ${voteState.pending ? "disabled" : ""}
            >
              ${buildEventDetailsV2Icon("close", "event-details-v2-cancel-icon")}
            </button>
          `
          : `<div class="event-details-v2-cancel-placeholder" aria-hidden="true"></div>`
      }
      <div class="event-details-v2-participant-count">
        ${buildEventDetailsV2Icon("users", "event-details-v2-participant-icon")}
        <span>${escapeHtml(getModalParticipantCountLabel(voteState.votes))}</span>
      </div>
      <div class="event-details-v2-voting-notice">${buildCompactVoteLegalNoteHtml()}</div>
      ${detailsLinkHtml}
    </footer>
  `;
}

function buildScheduleModalDetailsV2(item) {
  const viewModel = getScheduleModalViewModel(item);
  const passwordId = `schedule-modal-password-v2-${escapeHtml(String(item?.event_id || item?.date || "slot"))}`;
  const connectionRows = [
    buildEventDetailsV2Row(t("heroServerLabel"), escapeHtml(viewModel.serverName), "server"),
    buildEventDetailsV2Row(
      t("heroPasswordLabel"),
      `<div class="event-details-v2-password-row"><span class="event-details-v2-password" id="${passwordId}">${escapeHtml(viewModel.password)}</span>${buildEventDetailsV2CopyButton(passwordId)}</div>`,
      "copy"
    ),
    buildEventDetailsV2Row(t("modalClassLabel"), `<span class="event-details-v2-class-badge">${escapeHtml(viewModel.carClass)}</span>`, "flag"),
    buildEventDetailsV2Row(t("modalSlotsLabel"), escapeHtml(viewModel.slotCount ?? t("modalNotSpecified")), "users"),
    buildEventDetailsV2Row(t("modalSafetyLabel"), escapeHtml(viewModel.safetyRating ?? t("modalNotSpecified")), "flag")
  ].join("");
  const formatRows = [
    buildEventDetailsV2Row(t("modalPreparationLabel"), escapeHtml(formatModalMinutesValue(viewModel.preparationMinutes)), "timer"),
    buildEventDetailsV2Row(t("modalQualifyingLabel"), escapeHtml(formatModalMinutesValue(viewModel.qualifyingMinutes)), "stopwatch"),
    buildEventDetailsV2Row(t("modalRaceLabel"), escapeHtml(formatModalMinutesValue(viewModel.raceMinutes)), "play"),
    buildEventDetailsV2Row(t("modalGameTimeLabel"), escapeHtml(viewModel.inGameTime), viewModel.inGameTimeIcon),
    buildEventDetailsV2Row(t("modalTimeMultiplierLabel"), escapeHtml(formatModalTimeMultiplierValue(viewModel.timeMultiplier)), "fast")
  ].join("");
  const conditionsRows = [
    buildEventDetailsV2Row(t("heroPitstopLabel"), escapeHtml(formatModalMandatoryPitstopCountValue(viewModel.mandatoryPitstopCount)), "wrench", { accent: true }),
    buildEventDetailsV2Row(t("modalPitWindowLabel"), escapeHtml(formatModalMinutesValue(viewModel.pitWindowMinutes)), "timer", { accent: true }),
    buildEventDetailsV2Row(t("modalRefuelAllowedLabel"), escapeHtml(formatModalAllowedValue(viewModel.refuellingAllowed)), "fuel"),
    buildEventDetailsV2Row(t("modalMandatoryRefuelLabel"), escapeHtml(formatModalYesNoValue(viewModel.mandatoryRefuelling)), "drop"),
    buildEventDetailsV2Row(t("modalRefuelFixedLabel"), escapeHtml(formatModalYesNoValue(viewModel.fixedRefuellingTime)), "timer"),
    buildEventDetailsV2Row(t("heroTyresLabel"), escapeHtml(formatModalTyreSetCountValue(viewModel.tyreSetCount)), "tyre", { rowClass: " event-details-v2-divider-row" }),
    buildEventDetailsV2Row(t("modalTemperatureLabel"), escapeHtml(formatModalTemperatureValue(viewModel.temperatureC)), "temp"),
    buildEventDetailsV2Row(t("modalCloudsLabel"), escapeHtml(formatModalPercentValue(viewModel.cloudLevelPercent)), getWeatherMetricIconName("cloud", viewModel.cloudLevelPercent)),
    buildEventDetailsV2Row(t("modalRainLabel"), escapeHtml(formatModalPercentValue(viewModel.rainProbabilityPercent)), getWeatherMetricIconName("rain", viewModel.rainProbabilityPercent)),
    buildEventDetailsV2Row(t("modalRandomnessLabel"), escapeHtml(viewModel.weatherRandomness ?? t("modalNotSpecified")), "wind")
  ].join("");
  return `
    <div class="event-details-v2" data-testid="event-details-modal-v2">
      <div class="event-details-v2-background"></div>
      <div class="event-details-v2-shade"></div>
      <div class="event-details-v2-inner">
        <header class="event-details-v2-header">
          <div class="event-details-v2-title-block">
            <div class="event-details-v2-eyebrow">${escapeHtml(t("scheduleModalEyebrow"))}</div>
            <h2 class="event-details-v2-title">${escapeHtml(viewModel.trackName)}</h2>
          </div>
          <div class="event-details-v2-date-time">
            ${buildEventDetailsV2Icon("calendar", "event-details-v2-date-time-icon")}
            <span>${escapeHtml(viewModel.startDateLabel)}</span>
            <span aria-hidden="true">•</span>
            <span>${escapeHtml(`${viewModel.startTimeLabel} ${viewModel.timezoneLabel}`.trim())}</span>
          </div>
        </header>
        <div class="event-details-v2-grid">
          ${buildEventDetailsV2Card(t("modalConnectionTitle"), "server", "event-details-v2-card-connection", connectionRows)}
          ${buildEventDetailsV2Card(t("modalFormatTitle"), "flag", "event-details-v2-card-format", formatRows)}
          ${buildEventDetailsV2Card(t("modalConditionsTitle"), "wrench", "event-details-v2-card-conditions", conditionsRows)}
        </div>
        ${buildEventDetailsV2Footer(viewModel)}
      </div>
    </div>
  `;
}
async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}
function formatDate(isoDate) {
  if (!isoDate) return "--";
  const date = new Date(`${isoDate}T00:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(t("locale"), { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Moscow" }).format(date);
}
function parseIsoDateParts(isoDate) {
  const match = String(isoDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
}
function getMoscowDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Moscow"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day)
  };
}
function formatCalendarMonthLabel(year, month) {
  return new Intl.DateTimeFormat(t("locale"), {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow"
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}
function getCalendarWeekdayNames() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 0, 5 + index, 12));
    return new Intl.DateTimeFormat(t("locale"), { weekday: "short", timeZone: "Europe/Moscow" }).format(date);
  });
}
function formatDateTimeLocal(isoString) {
  if (!isoString) return "--";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return String(isoString).replace("T", " ").slice(0, 16);
  return new Intl.DateTimeFormat(t("locale"), { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" }).format(date);
}
function formatPositionsDelta(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  if (value > 0) return `+${value}`;
  return `${value}`;
}
function renderPositionsDelta(value) {
  let cls = "delta-neutral";
  if (typeof value === "number" && value > 0) cls = "delta-positive";
  if (typeof value === "number" && value < 0) cls = "delta-negative";
  return `<span class="positions-delta ${cls}">${escapeHtml(formatPositionsDelta(value))}</span>`;
}
function formatStartPosition(row) { return typeof row?.start_position === "number" ? String(row.start_position) : "-"; }
function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function humanizeTrackName(track) {
  if (!track) return "-";
  return String(track).replace(/[_-]+/g, " ").replace(/\b\w/g, char => char.toUpperCase());
}
function normalizeEventId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
function canonicalizeSlotEventId(value) {
  const normalized = normalizeEventId(value);
  const match = normalized.match(/^hourly_(\d{4}-\d{2}-\d{2})_(\d{4})(?:_.+)?$/);
  if (!match) return normalized;
  return `hourly_${match[1]}_${match[2]}`;
}
function buildSlotEventId(item) {
  const explicitId = canonicalizeSlotEventId(item?.event_id);
  if (explicitId) return explicitId;
  const date = String(item?.date || "").trim();
  const time = String(item?.start_time_local || "").trim().replace(/[^0-9]/g, "");
  if (!date || !time) return "";
  return normalizeEventId(`hourly_${date}_${time}`);
}
function getBrowserVoterId() {
  const storageKey = "hourlyVoteVoterId";
  return getExpiringStorageValue(storageKey, VOTER_ID_STORAGE_TTL_MS);
}
function getVoteLabel(count) {
  if (typeof count !== "number" || count <= 0) return t("voteCountZero");
  return tf(count === 1 ? "voteCountOne" : "voteCountMany", { value: count });
}
function getVoteState(item) {
  const eventId = buildSlotEventId(item);
  return {
    eventId,
    pending: pendingVoteEventIds.has(eventId),
    ...(voteStateByEventId[eventId] || { votes: 0, already_voted: false })
  };
}
async function loadVotesForSchedule(items) {
  if (!votesApiBase) {
    votesEnabled = false;
    votesLoaded = false;
    voteStateByEventId = {};
    return;
  }
  const eventIds = items.filter(item => !isVotingDisabledForItem(item)).map(buildSlotEventId).filter(Boolean);
  if (!eventIds.length) return;
  try {
    const url = new URL("/votes", votesApiBase);
    url.searchParams.set("event_ids", eventIds.join(","));
    url.searchParams.set("voter_id", getBrowserVoterId());
    const response = await fetchWithTimeout(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (payload?.items && typeof payload.items === "object") {
      mergeVoteStateItems(payload.items);
      votesEnabled = true;
      votesLoaded = true;
    }
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.warn("hourly votes are unavailable.", error);
    }
    votesEnabled = Boolean(votesApiBase);
  }
}
async function submitVote(item) {
  if (!votesApiBase) return;
  const eventId = buildSlotEventId(item);
  if (!eventId || pendingVoteEventIds.has(eventId) || voteStateByEventId[eventId]?.already_voted) return;
  pendingVoteEventIds.add(eventId);
  renderScheduleTable(scheduleItems);
  renderUpcomingHeroV2(announcementData || {});
  try {
    const voterId = getBrowserVoterId();
    const body = {
      event_id: eventId,
      track: getLocalizedField(item, "track_name", item?.track_name || item?.track_code || "-"),
      date: item?.date || "",
      time: item?.start_time_local || "",
      voter_id: voterId
    };
    const response = await fetch(new URL("/vote", votesApiBase), {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    voteStateByEventId[eventId] = {
      event_id: eventId,
      votes: typeof payload?.votes === "number" ? payload.votes : 0,
      already_voted: Boolean(payload?.already_voted)
    };
    mergeVoteStateItems({ [eventId]: voteStateByEventId[eventId] });
  } catch (error) {
    console.warn("hourly vote failed.", error);
    voteStateByEventId[eventId] = {
      ...(voteStateByEventId[eventId] || { votes: 0, already_voted: false }),
      failed: true
    };
  } finally {
    pendingVoteEventIds.delete(eventId);
    if (selectedScheduleItem && buildSlotEventId(selectedScheduleItem) === eventId) renderScheduleModal();
    renderScheduleTable(scheduleItems);
    renderHeroVote();
    renderUpcomingHeroV2(announcementData || {});
  }
}
async function submitUnvote(item) {
  if (!votesApiBase) return;
  const eventId = buildSlotEventId(item);
  if (!eventId || pendingVoteEventIds.has(eventId)) return;
  pendingVoteEventIds.add(eventId);
  renderScheduleTable(scheduleItems);
  renderHeroVote();
  renderUpcomingHeroV2(announcementData || {});
  try {
    const response = await fetch(new URL("/unvote", votesApiBase), {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        event_id: eventId,
        date: item?.date || "",
        time: item?.start_time_local || "",
        voter_id: getBrowserVoterId()
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    voteStateByEventId[eventId] = {
      event_id: eventId,
      votes: typeof payload?.votes === "number" ? payload.votes : 0,
      already_voted: Boolean(payload?.already_voted)
    };
    mergeVoteStateItems({ [eventId]: voteStateByEventId[eventId] });
  } catch (error) {
    console.warn("hourly unvote failed.", error);
    voteStateByEventId[eventId] = {
      ...(voteStateByEventId[eventId] || { votes: 0, already_voted: false }),
      failed: true
    };
  } finally {
    pendingVoteEventIds.delete(eventId);
    if (selectedScheduleItem && buildSlotEventId(selectedScheduleItem) === eventId) renderScheduleModal();
    renderScheduleTable(scheduleItems);
    renderHeroVote();
    renderUpcomingHeroV2(announcementData || {});
  }
}
function buildVoteControls(item, context = "card") {
  if (isVotingDisabledForItem(item)) {
    const baseClass = context === "hero" ? "hero-vote" : "schedule-event-vote";
    return `
      <div class="${baseClass} ${baseClass}-locked">
        <div class="${baseClass}-meta">${escapeHtml(t("votingDisabledChampionship"))}</div>
      </div>
    `;
  }
  const voteState = getVoteState(item);
  const voteCountLabel = voteState.failed
    ? t("voteFailed")
    : voteState.pending
      ? t("voteSending")
      : votesLoaded || voteStateByEventId[voteState.eventId]
        ? getVoteLabel(voteState.votes)
        : t("voteSoon");
  const baseClass = context === "hero" ? "hero-vote" : "schedule-event-vote";
  return `
    <div class="${baseClass}">
      <div class="${baseClass}-actions">
        <button
          class="${baseClass}-btn${voteState.already_voted ? " is-voted" : ""}"
          type="button"
          data-vote-event-id="${escapeHtml(voteState.eventId)}"
          ${(!votesApiBase || voteState.already_voted || voteState.pending) ? "disabled" : ""}
        >
          <span>${escapeHtml(voteState.already_voted ? t("voteButtonDone") : t("voteButton"))}</span>
          <span class="${baseClass}-icon" aria-hidden="true">♥</span>
        </button>
        ${
          voteState.already_voted
            ? `
              <button
                class="${baseClass}-cancel"
                type="button"
                data-unvote-event-id="${escapeHtml(voteState.eventId)}"
                aria-label="${escapeHtml(t("unvoteButton"))}"
                ${voteState.pending ? "disabled" : ""}
              >×</button>
            `
            : ""
        }
      </div>
      <div class="${baseClass}-meta">${escapeHtml(voteCountLabel)}</div>
    </div>
  `;
}
function bindVoteControls(root = document) {
  root.querySelectorAll("[data-vote-event-id]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const eventId = button.dataset.voteEventId;
      const item = scheduleItems.find(row => buildSlotEventId(row) === eventId);
      if (item) void submitVote(item);
    });
  });
  root.querySelectorAll("[data-unvote-event-id]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const eventId = button.dataset.unvoteEventId;
      const item = scheduleItems.find(row => buildSlotEventId(row) === eventId);
      if (item) void submitUnvote(item);
    });
  });
}
function renderHeroVote() {
  const container = document.getElementById("hero-vote");
  if (!container) return;
  const firstSlot = scheduleItems[0] || null;
  if (!firstSlot) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = `
    ${buildVoteControls(firstSlot, "hero")}
    <div class="legal-inline-note">${buildCompactVoteLegalNoteHtml()}</div>
  `;
  bindVoteControls(container);
}
function applyHeroTrackBackground(trackCode) {
  const heroCard = document.querySelector(".hero-card");
  if (!heroCard) return;
  const backgroundUrl = getTrackBackgroundUrl(trackCode);
  heroCard.style.setProperty("--hero-track-photo", backgroundUrl ? `url("${backgroundUrl}")` : "none");
}
function applyHeroChampionshipCardBackground(trackCode) {
  const card = document.querySelector(".hero-announcement-card");
  if (!card) return;
  const backgroundUrl = getTrackBackgroundUrl(trackCode);
  card.style.setProperty("--hero-announcement-photo", backgroundUrl ? `url("${backgroundUrl}")` : "none");
}
function applyScheduleModalTrackBackground(trackCode) {
  const modalCard = document.querySelector("#schedule-modal .modal-card-slot");
  if (!modalCard) return;
  const backgroundUrl = getTrackBackgroundUrl(trackCode);
  modalCard.style.setProperty("--modal-track-photo", backgroundUrl ? `url("${backgroundUrl}")` : "none");
}
function applyRaceModalTrackBackground(trackCode) {
  const modalCard = document.querySelector("#race-results-modal .modal-card-race");
  if (!modalCard) return;
  const backgroundUrl = getTrackBackgroundUrl(trackCode);
  modalCard.style.setProperty("--modal-track-photo", backgroundUrl ? `url("${backgroundUrl}")` : "none");
}

function getTrackBackgroundUrl(trackCode) {
  const normalized = String(trackCode || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return HERO_TRACK_BACKGROUNDS[normalized]
    || HERO_TRACK_BACKGROUNDS[normalized.replaceAll("_", "")]
    || "";
}

function getHourlyConnectHref(server = {}) {
  const hourlyStatus = serverStatusData?.servers?.hourly || serverStatusData?.hourly || {};
  return buildAccConnectHref(normalizeAccConnectConfig({ ...server, ...hourlyStatus }, ACC_CONNECT_SERVER_FALLBACK));
}

function buildParticipationControlsV2(item, options = {}) {
  const variant = options.variant === "compact" ? "compact" : "hero";
  const showDetails = options.showDetails !== false;
  const voteState = getVoteState(item);
  const isLocked = isVotingDisabledForItem(item);
  const voteLabel = voteState.already_voted ? t("voteButtonDone") : t("voteButton");
  const countLabel = getModalParticipantCountLabel(voteState.votes);
  const detailsLink = showDetails && item?.details_url
    ? `<a class="hourly-v2-details-link" href="${escapeHtml(String(item.details_url))}">${escapeHtml(currentLang === "ru" ? "Подробнее" : "Details")}</a>`
    : "";

  if (isLocked) {
    return `
      <div class="hourly-v2-actions-main hourly-v2-actions-main-locked">
        <div class="hourly-v2-voting-note">${escapeHtml(t("votingDisabledChampionship"))}</div>
        ${detailsLink}
      </div>
    `;
  }

  return `
    <div class="hourly-v2-actions-main">
      <button
        class="hourly-v2-participation-button${variant === "compact" ? " is-compact" : ""}${voteState.already_voted ? " is-voted" : ""}"
        type="button"
        data-vote-event-id="${escapeHtml(voteState.eventId)}"
        ${voteState.pending ? "disabled" : ""}
      >
        ${buildEventDetailsV2Icon("check", "hourly-v2-participation-icon")}
        <span>${escapeHtml(voteLabel)}</span>
      </button>
      ${
        voteState.already_voted
          ? `
            <button
              class="hourly-v2-cancel-button"
              type="button"
              data-unvote-event-id="${escapeHtml(voteState.eventId)}"
              aria-label="${escapeHtml(t("unvoteButton"))}"
              ${voteState.pending ? "disabled" : ""}
            >
              ${buildEventDetailsV2Icon("close", "hourly-v2-cancel-icon")}
            </button>
          `
          : `<div class="hourly-v2-cancel-placeholder" aria-hidden="true"></div>`
      }
      <div class="hourly-v2-participant-count">
        ${buildEventDetailsV2Icon("users", "hourly-v2-participant-icon")}
        <span>${escapeHtml(countLabel)}</span>
      </div>
      ${detailsLink}
    </div>
  `;
}

function buildUpcomingEventInfoGrid(item) {
  const viewModel = getScheduleModalViewModel(item);
  const passwordId = `hourly-v2-password-${escapeHtml(String(item?.event_id || item?.date || "slot"))}`;
  const connectionRows = [
    buildEventDetailsV2Row(t("heroServerLabel"), escapeHtml(viewModel.serverName), "server"),
    buildEventDetailsV2Row(
      t("heroPasswordLabel"),
      `<div class="event-details-v2-password-row"><span class="event-details-v2-password" id="${passwordId}">${escapeHtml(viewModel.password)}</span>${buildEventDetailsV2CopyButton(passwordId)}</div>`,
      "copy"
    ),
    buildEventDetailsV2Row(t("modalClassLabel"), `<span class="event-details-v2-class-badge">${escapeHtml(viewModel.carClass)}</span>`, "flag"),
    buildEventDetailsV2Row(t("modalSlotsLabel"), escapeHtml(viewModel.slotCount ?? t("modalNotSpecified")), "users"),
    buildEventDetailsV2Row(t("modalSafetyLabel"), escapeHtml(viewModel.safetyRating ?? t("modalNotSpecified")), "flag")
  ].join("");

  const formatRows = [
    buildEventDetailsV2Row(t("modalPreparationLabel"), escapeHtml(formatModalMinutesValue(viewModel.preparationMinutes)), "timer"),
    buildEventDetailsV2Row(t("modalQualifyingLabel"), escapeHtml(formatModalMinutesValue(viewModel.qualifyingMinutes)), "stopwatch"),
    buildEventDetailsV2Row(t("modalRaceLabel"), escapeHtml(formatModalMinutesValue(viewModel.raceMinutes)), "play"),
    buildEventDetailsV2Row(t("modalGameTimeLabel"), escapeHtml(viewModel.inGameTime), viewModel.inGameTimeIcon),
    buildEventDetailsV2Row(t("modalTimeMultiplierLabel"), escapeHtml(formatModalTimeMultiplierValue(viewModel.timeMultiplier)), "fast")
  ].join("");

  const conditionsRows = [
    buildEventDetailsV2Row(t("heroPitstopLabel"), escapeHtml(formatModalMandatoryPitstopCountValue(viewModel.mandatoryPitstopCount)), "wrench", { accent: true }),
    buildEventDetailsV2Row(t("modalPitWindowLabel"), escapeHtml(formatModalMinutesValue(viewModel.pitWindowMinutes)), "timer", { accent: true }),
    buildEventDetailsV2Row(t("modalRefuelAllowedLabel"), escapeHtml(formatModalAllowedValue(viewModel.refuellingAllowed)), "fuel"),
    buildEventDetailsV2Row(t("modalMandatoryRefuelLabel"), escapeHtml(formatModalYesNoValue(viewModel.mandatoryRefuelling)), "drop"),
    buildEventDetailsV2Row(t("modalRefuelFixedLabel"), escapeHtml(formatModalYesNoValue(viewModel.fixedRefuellingTime)), "timer"),
    buildEventDetailsV2Row(t("heroTyresLabel"), escapeHtml(formatModalTyreSetCountValue(viewModel.tyreSetCount)), "tyre", { rowClass: " event-details-v2-divider-row" }),
    buildEventDetailsV2Row(t("modalTemperatureLabel"), escapeHtml(formatModalTemperatureValue(viewModel.temperatureC)), "temp"),
    buildEventDetailsV2Row(t("modalCloudsLabel"), escapeHtml(formatModalPercentValue(viewModel.cloudLevelPercent)), getWeatherMetricIconName("cloud", viewModel.cloudLevelPercent)),
    buildEventDetailsV2Row(t("modalRainLabel"), escapeHtml(formatModalPercentValue(viewModel.rainProbabilityPercent)), getWeatherMetricIconName("rain", viewModel.rainProbabilityPercent)),
    buildEventDetailsV2Row(t("modalRandomnessLabel"), escapeHtml(viewModel.weatherRandomness ?? t("modalNotSpecified")), "wind")
  ].join("");

  return [
    buildEventDetailsV2Card(t("modalConnectionTitle"), "server", "event-details-v2-card-connection hourly-v2-info-card", connectionRows),
    buildEventDetailsV2Card(t("modalFormatTitle"), "flag", "event-details-v2-card-format hourly-v2-info-card", formatRows),
    buildEventDetailsV2Card(t("modalConditionsTitle"), "wrench", "event-details-v2-card-conditions hourly-v2-info-card", conditionsRows)
  ].join("");
}

function renderUpcomingHeroV2(data) {
  const root = document.getElementById("hourly-upcoming-v2");
  if (!root) return;

  const titleEl = document.getElementById("hourly-upcoming-v2-title");
  const dateTimeEl = document.getElementById("hourly-upcoming-v2-date-time");
  const infoGridEl = document.getElementById("hourly-upcoming-v2-info-grid");
  const footerEl = document.getElementById("hourly-upcoming-v2-footer");
  const server = data?.server || {};
  const voteItem = scheduleItems[0] || data;
  const startTime = getLocalizedField(data, "start_time_local", data?.start_time_local || "--");
  const timezone = getLocalizedField(data, "timezone", data?.timezone || "UTC+3");
  const trackName = getLocalizedField(data, "track_name", data?.track_name || "--");

  if (titleEl) titleEl.textContent = trackName;
  if (dateTimeEl) {
    dateTimeEl.innerHTML = `
      ${buildEventDetailsV2Icon("calendar", "event-details-v2-date-time-icon")}
      <span>${escapeHtml(formatDate(data?.date))}</span>
      <span class="hourly-upcoming-v2-date-separator" aria-hidden="true">•</span>
      <span>${escapeHtml(`${startTime} ${timezone}`.trim())}</span>
    `;
  }
  if (infoGridEl) infoGridEl.innerHTML = buildUpcomingEventInfoGrid(data);
  if (footerEl) {
    footerEl.innerHTML = `
      <div class="hourly-v2-footer-side">
        ${buildParticipationControlsV2(voteItem, { showDetails: true })}
        <div class="hourly-v2-voting-note">${buildCompactVoteLegalNoteHtml()}</div>
      </div>
    `;
  }

  root.style.setProperty("--hourly-upcoming-track-photo", getTrackBackgroundUrl(data?.track_code) ? `url("${getTrackBackgroundUrl(data?.track_code)}")` : "none");
  bindHeroCopyButtons(root);
  bindVoteControls(root);
}

function renderChampionshipHeroV2(data) {
  const card = document.getElementById("hourly-championship-v2");
  if (!card) return;

  const championship = data?.championship || {};
  const session = data?.session || {};
  const rules = data?.rules || {};
  const nextChampionship = scheduleItems.find(isChampionshipEvent) || (isChampionshipEvent(data) ? data : null);
  const title = data?.championship_title || championship.title || nextChampionship?.championship_title || "ASG Racing June 2026";
  const slug = data?.championship_slug || championship.slug || nextChampionship?.championship_slug;
  const championshipUrl = slug ? `./championship/?slug=${encodeURIComponent(slug)}` : "./championship/";
  const eventHtml = nextChampionship
    ? `
      <div class="hourly-championship-v2-event-label">${escapeHtml(currentLang === "ru" ? "Событие чемпионата" : "Championship event")}</div>
      <div class="hourly-championship-v2-event-track">${escapeHtml(getLocalizedField(nextChampionship, "track_name", nextChampionship.track_code || "--"))}</div>
      <div class="hourly-championship-v2-event-row">${buildEventDetailsV2Icon("calendar", "hourly-championship-v2-event-icon")}<span>${escapeHtml(formatScheduleDateTime(nextChampionship))}</span></div>
      <div class="hourly-championship-v2-event-row hourly-schedule-conditions">${renderScheduleConditions(nextChampionship)}</div>
      <div class="hourly-championship-v2-event-row">${buildEventDetailsV2Icon("stopwatch", "hourly-championship-v2-event-icon")}<span>${escapeHtml(`Q ${session.qualifying_duration_minutes ?? "--"}m + R ${session.race_duration_minutes ?? "--"}m`)}</span></div>
      <div class="hourly-championship-v2-event-row">${buildEventDetailsV2Icon("wrench", "hourly-championship-v2-event-icon")}<span>${escapeHtml(`${typeof rules.mandatory_pitstop_count === "number" ? rules.mandatory_pitstop_count : t("modalNotSpecified")}${rules.pit_window_length_minutes ? ` / ${rules.pit_window_length_minutes}m` : ""}`)}</span></div>
    `
    : `<div class="empty">${escapeHtml(t("unknownValue"))}</div>`;

  const titleEl = document.getElementById("hourly-championship-v2-title");
  const metaEl = document.getElementById("hourly-championship-v2-meta");
  const eventEl = document.getElementById("hourly-championship-v2-event");
  const descriptionEl = document.getElementById("hourly-championship-v2-description");
  const buttonEl = document.getElementById("hourly-championship-v2-button");

  if (titleEl) titleEl.textContent = title;
  if (metaEl) metaEl.textContent = [championship.period, championship.status].filter(Boolean).join(" • ") || t("championshipBadge");
  if (eventEl) eventEl.innerHTML = eventHtml;
  if (descriptionEl) descriptionEl.textContent = championship.description || t("championshipNoDescription");
  if (buttonEl) {
    buttonEl.textContent = title;
    buttonEl.href = championshipUrl;
  }

  card.dataset.href = championshipUrl;
  card.style.setProperty("--hourly-championship-track-photo", getTrackBackgroundUrl(nextChampionship?.track_code || data?.track_code) ? `url("${getTrackBackgroundUrl(nextChampionship?.track_code || data?.track_code)}")` : "none");
}

function buildScheduleCardV2(row, index) {
  const backgroundUrl = getTrackBackgroundUrl(row?.track_code);
  return `
    <article
      class="hourly-slot-card-v2 is-interactive-row${isChampionshipEvent(row) ? " is-championship-event" : ""}${isEnduranceEvent(row) ? " is-endurance-event" : ""}"
      data-event-type="${escapeHtml(isEnduranceEvent(row) ? "endurance" : "hourly")}"
      data-schedule-index="${index}"
      tabindex="0"
      role="button"
      aria-label="${escapeHtml(`${t("openScheduleDetailsLabel")}: ${row.track_name || row.track_code || "-"}`)}"
      style="--hourly-slot-track-photo: ${backgroundUrl ? `url('${escapeHtml(backgroundUrl)}')` : "none"};"
    >
      <div class="hourly-slot-card-v2-inner">
        ${renderEventBadges(row)}
        <div class="hourly-slot-card-v2-time">${escapeHtml(formatScheduleCardDateTime(row))}</div>
        <div class="hourly-slot-card-v2-track">${escapeHtml(getLocalizedField(row, "track_name", row.track_name || "--"))}</div>
        <div class="hourly-slot-card-v2-weather">${renderScheduleConditions(row)}</div>
        <div class="hourly-slot-card-v2-footer">
          ${buildParticipationControlsV2(row, { variant: "compact", showDetails: false })}
        </div>
      </div>
    </article>
  `;
}

function applyTranslations() {
  document.documentElement.lang = t("htmlLang");
  document.title = t("pageTitle");
  const descriptionMeta = document.querySelector('meta[name="description"]');
  const ogTitleMeta = document.querySelector('meta[property="og:title"]');
  const ogDescriptionMeta = document.querySelector('meta[property="og:description"]');
  const ogLocaleMeta = document.querySelector('meta[property="og:locale"]');
  const twitterTitleMeta = document.querySelector('meta[name="twitter:title"]');
  const twitterDescriptionMeta = document.querySelector('meta[name="twitter:description"]');
  if (descriptionMeta) descriptionMeta.setAttribute("content", t("metaDescription"));
  if (ogTitleMeta) ogTitleMeta.setAttribute("content", t("ogTitle"));
  if (ogDescriptionMeta) ogDescriptionMeta.setAttribute("content", t("ogDescription"));
  if (ogLocaleMeta) ogLocaleMeta.setAttribute("content", t("ogLocale"));
  if (twitterTitleMeta) twitterTitleMeta.setAttribute("content", t("twitterTitle"));
  if (twitterDescriptionMeta) twitterDescriptionMeta.setAttribute("content", t("twitterDescription"));
  document.querySelectorAll("[data-i18n]").forEach(el => { const value = t(el.dataset.i18n); if (value !== undefined) el.textContent = value; });
  document.querySelectorAll("[data-i18n-aria-label]").forEach(el => { const value = t(el.dataset.i18nAriaLabel); if (value !== undefined) el.setAttribute("aria-label", value); });
  bindHeroCopyButtons();
  document.querySelectorAll(".lang-btn").forEach(btn => {
    const isActive = btn.dataset.lang === currentLang;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  renderNewsBell();
  renderNewsNotificationsModal();
  document.getElementById("top-nav-more")?.rebuildOverflowMenu?.();
}

function renderAnnouncement(data) {
  const announcementTitle =
    currentLang === "en"
      ? getLocalizedField(
          { title_en: data?.title_en, title: typeof data?.title === "object" ? data.title : undefined },
          "title",
          t("defaultAnnouncementTitle")
        )
      : getLocalizedField(data, "title", t("defaultAnnouncementTitle"));
  const announcementTime = getLocalizedField(
    data,
    "start_time_local",
    data.start_time_local || "--"
  );
  const announcementTimezone = getLocalizedField(
    data,
    "timezone",
    data.timezone || "UTC+3"
  );

  setText("announcement-date", formatDate(data.date));
  setText(
    "announcement-time",
    announcementTime === "--" ? announcementTime : `${announcementTime} ${announcementTimezone}`
  );
  setText("announcement-track", getLocalizedField(data, "track_name", data.track_name || "--"));
  applyHeroTrackBackground(data?.track_code);
}
function renderHeroDetails(data) {
  const server = data?.server || {};
  const session = getEventSession(data);
  const rules = data?.rules || {};
  const weather = data?.weather || {};
  setText("hero-server-name", server.name || server.full_name || t("unknownValue"));
  setText("hero-server-password", server.password || t("passwordNone"));
  setHeroTokenValue("hero-entry-rules", buildEntryTokenGroups(server));
  setHeroTokenValue("hero-race-format", buildRaceFormatTokenGroups(session));
  setHeroTokenValue("hero-pitstop-rules", buildPitstopTokenGroups(rules));
  setHeroTokenValue("hero-refuel-rules", buildRefuelTokenGroups(rules));
  setHeroTokenValue("hero-tyre-rules", buildTyreTokenGroups(rules));
  setHeroTokenValue("hero-weather", buildWeatherTokenGroups(weather));
  updateHeroConnectLink(server);
}
function renderChampionshipHero(data) {
  const titleEl = document.getElementById("hero-championship-title");
  const metaEl = document.getElementById("hero-championship-meta");
  const badgeEl = document.getElementById("hero-championship-badge");
  const trackEl = document.getElementById("hero-championship-track");
  const dateEl = document.getElementById("hero-championship-date");
  const weatherEl = document.getElementById("hero-championship-weather");
  const formatEl = document.getElementById("hero-championship-format");
  const pitEl = document.getElementById("hero-championship-pit");
  const descriptionEl = document.getElementById("hero-championship-description");
  const buttonEl = document.querySelector(".championship-summary-btn");
  const championship = data?.championship || {};
  const session = data?.session || {};
  const rules = data?.rules || {};
  const nextChampionship = scheduleItems.find(isChampionshipEvent) || (isChampionshipEvent(data) ? data : null);
  const title = data?.championship_title || championship.title || nextChampionship?.championship_title || "ASG Racing June 2026";
  const slug = data?.championship_slug || championship.slug || nextChampionship?.championship_slug;
  const championshipUrl = slug ? `./championship/?slug=${encodeURIComponent(slug)}` : "./championship/";
  if (titleEl) titleEl.textContent = title;
  if (metaEl) metaEl.textContent = [championship.period, championship.status].filter(Boolean).join(" · ") || eventBadgeLabel(nextChampionship || data);
  if (badgeEl) badgeEl.textContent = nextChampionship ? eventBadgeLabel(nextChampionship) : t("championshipBadge");
  if (trackEl) trackEl.textContent = nextChampionship ? getLocalizedField(nextChampionship, "track_name", nextChampionship.track_code || "--") : t("unknownValue");
  if (dateEl) dateEl.textContent = nextChampionship ? formatScheduleDateTime(nextChampionship) : t("unknownValue");
  if (weatherEl) {
    weatherEl.innerHTML = nextChampionship
      ? renderScheduleConditions(nextChampionship)
      : escapeHtml(t("unknownValue"));
  }
  if (formatEl) formatEl.textContent = session.format_label || t("unknownValue");
  if (pitEl) pitEl.textContent = typeof rules.mandatory_pitstop_count === "number"
    ? `${t("heroPitstopLabel")}: ${rules.mandatory_pitstop_count}${rules.pit_window_length_minutes ? ` / ${rules.pit_window_length_minutes}m` : ""}`
    : t("unknownValue");
  if (descriptionEl) descriptionEl.textContent = championship.description || t("championshipNoDescription");
  if (buttonEl) {
    buttonEl.textContent = title;
    buttonEl.href = championshipUrl;
  }
  const card = document.querySelector(".hero-announcement-card");
  if (card) card.dataset.href = championshipUrl;
  applyHeroChampionshipCardBackground(data?.track_code);
}
function renderChampionshipHistory(items) {
  const container = document.getElementById("championship-history-list");
  if (!container) return;
  if (!Array.isArray(items) || !items.length) {
    container.innerHTML = `<div class="empty">${escapeHtml(t("championshipHistoryEmpty"))}</div>`;
    return;
  }
  const cardsHtml = items.map(item => {
    const top3 = Array.isArray(item.results_top3) ? item.results_top3.slice(0, 3) : [];
    const winner = item.winner?.driver || top3[0]?.driver || t("unknownValue");
    const statusLabel = getChampionshipStatusLabel(item.status);
    const top3Html = top3.length
      ? `<div class="championship-history-podium">${top3.map((row, index) => `
          <div class="championship-history-podium-item">
            <span class="championship-history-podium-rank">${index + 1}</span>
            <span class="championship-history-podium-name">${escapeHtml(row?.driver || row?.public_id || "--")}</span>
          </div>
        `).join("")}</div>`
      : "";
    return `
      <article class="championship-history-card">
        <div class="championship-history-head">
          <div>
            <div class="championship-history-period">${escapeHtml(item.period || statusLabel)}</div>
            <h3 class="championship-history-title">${escapeHtml(item.title)}</h3>
          </div>
          <span class="championship-history-status is-${escapeHtml(item.status)}">${escapeHtml(statusLabel)}</span>
        </div>
        <p class="championship-history-description">${escapeHtml(item.description || t("championshipNoDescription"))}</p>
        <div class="championship-history-stats">
          <div class="championship-history-stat">
            <span class="championship-history-stat-label">${escapeHtml(t("championshipWinnerLabel"))}</span>
            <span class="championship-history-stat-value">${escapeHtml(winner)}</span>
          </div>
          <div class="championship-history-stat">
            <span class="championship-history-stat-label">${escapeHtml(t("championshipRacesLabel"))}</span>
            <span class="championship-history-stat-value">${escapeHtml(item.race_count || 0)}</span>
          </div>
          <div class="championship-history-stat">
            <span class="championship-history-stat-label">${escapeHtml(t("championshipDriversLabel"))}</span>
            <span class="championship-history-stat-value">${escapeHtml(item.driver_count || 0)}</span>
          </div>
        </div>
        ${top3Html}
        <a class="championship-history-link" href="${escapeHtml(getChampionshipUrl(item))}">${escapeHtml(item.title)}</a>
      </article>
    `;
  }).join("");
  container.innerHTML = `<div class="championship-history-grid">${cardsHtml}</div>`;
}
function renderSchedule(rows) {
  const container = document.getElementById("schedule-list");
  if (!Array.isArray(rows) || rows.length === 0) {
    container.innerHTML = `<div class="empty">${escapeHtml(t("scheduleEmpty"))}</div>`;
    return;
  }
  container.innerHTML = rows.map(row => `
    <article class="list-item">
      <div>
        <div class="item-title">${escapeHtml(getLocalizedField(row, "track_name", row.track_name || "--"))}</div>
        <div class="item-meta">${escapeHtml(formatDate(row.date))} · ${escapeHtml(row.start_time_local || "--")} · ${escapeHtml(row.timezone || "UTC+3")}</div>
      </div>
      <div class="item-side">${escapeHtml(getLocalizedField(row, "slot_label", row.slot_label || "--"))}</div>
    </article>
  `).join("");
}
function renderScheduleTable(rows) {
  const container = document.getElementById("schedule-v2-list") || document.getElementById("schedule-list");
  if (!container) return;
  if (!Array.isArray(rows) || rows.length === 0) {
    container.innerHTML = `<div class="empty">${escapeHtml(t("scheduleEmpty"))}</div>`;
    return;
  }
  container.innerHTML = rows.slice(0, 3).map((row, index) => buildScheduleCardV2(row, index)).join("");
  container.querySelectorAll("[data-schedule-index]").forEach(card => {
    const openCard = () => openScheduleModal(scheduleItems[Number(card.dataset.scheduleIndex)] || null, card);
    card.addEventListener("click", event => { if (!event.target.closest("a")) openCard(); });
    card.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openCard(); } });
  });
  bindVoteControls(container);
}
function renderCalendar(rows) {
  const grid = document.getElementById("calendar-v2-grid") || document.getElementById("calendar-grid");
  const count = document.getElementById("calendar-v2-count") || document.getElementById("calendar-count");
  if (!grid) return;
  const items = Array.isArray(rows) ? rows : [];
  const today = getMoscowDateParts();
  const currentMonthItems = items
    .map((row, index) => ({ row, index, dateParts: parseIsoDateParts(row?.date) }))
    .filter(item =>
      item.dateParts &&
      item.dateParts.year === today.year &&
      item.dateParts.month === today.month &&
      item.dateParts.day >= today.day
    );
  const itemsByDay = new Map();
  currentMonthItems.forEach(item => {
    if (!itemsByDay.has(item.dateParts.day)) itemsByDay.set(item.dateParts.day, []);
    itemsByDay.get(item.dateParts.day).push(item);
  });
  const monthLabel = formatCalendarMonthLabel(today.year, today.month);
  if (count) count.textContent = currentMonthItems.length ? `${monthLabel} · ${currentMonthItems.length}` : monthLabel;
  const daysInMonth = new Date(Date.UTC(today.year, today.month, 0, 12)).getUTCDate();
  const firstDayIndex = (new Date(Date.UTC(today.year, today.month - 1, 1, 12)).getUTCDay() + 6) % 7;
  const weekdayHeaders = getCalendarWeekdayNames()
    .map(dayName => `<div class="calendar-weekday">${escapeHtml(dayName)}</div>`)
    .join("");
  const leadingBlanks = Array.from({ length: firstDayIndex }, () => `<div class="calendar-day calendar-day-empty" aria-hidden="true"></div>`);
  const dayCells = Array.from({ length: daysInMonth }, (_, dayIndex) => {
    const day = dayIndex + 1;
    const dayEvents = itemsByDay.get(day) || [];
    const eventsHtml = dayEvents.map(({ row, index }) => {
      const trackCode = String(row?.track_code || "").trim().toLowerCase();
      const backgroundUrl = getTrackBackgroundUrl(trackCode);
      return `
        <button
          class="calendar-event${isChampionshipEvent(row) ? " is-championship-event" : ""}${isEnduranceEvent(row) ? " is-endurance-event" : ""}"
          type="button"
          data-calendar-index="${index}"
          style="--calendar-track-photo: ${backgroundUrl ? `url('${escapeHtml(backgroundUrl)}')` : "none"};"
        >
          <span class="calendar-event-time">${escapeHtml(row?.start_time_local || "--")}</span>
          <span class="calendar-event-track">${escapeHtml(getLocalizedField(row, "track_name", row?.track_name || row?.track_code || "--"))}</span>
          ${renderEventBadges(row)}
        </button>
      `;
    }).join("");
    return `
      <div class="calendar-day${day < today.day ? " is-past" : ""}">
        <div class="calendar-day-number">${escapeHtml(day)}</div>
        <div class="calendar-day-events">${eventsHtml}</div>
      </div>
    `;
  });
  grid.innerHTML = `${weekdayHeaders}${leadingBlanks.join("")}${dayCells.join("")}`;
  grid.querySelectorAll("[data-calendar-index]").forEach(button => {
    button.addEventListener("click", () => openScheduleModal(scheduleItems[Number(button.dataset.calendarIndex)] || null, button));
  });
}
function renderRecentRaces(rows) {
  const container = document.getElementById("recent-races-table");
  if (!container) return;
  if (!Array.isArray(rows) || rows.length === 0) {
    container.innerHTML = `<div class="empty">${escapeHtml(t("recentEmpty"))}</div>`;
    return;
  }
  const labels = t("racesCols");
  const headers = labels.map(label => `<th>${escapeHtml(label)}</th>`).join("");
  const rowsHtml = rows.map((race, index) => `
    <tr class="is-interactive-row" data-race-index="${index}" tabindex="0" role="button" aria-label="${escapeHtml(`${t("openRaceDetailsLabel")}: ${race.track_name || race.track || "-"}`)}">
      <td data-label="${escapeHtml(labels[0] || "")}">${escapeHtml(formatDateTimeLocal(race.finished_at || race.finished_at_local))}</td>
      <td data-label="${escapeHtml(labels[1] || "")}"><div class="race-track-cell"><span class="race-track-name">${escapeHtml(race.track_name || humanizeTrackName(race.track))}</span></div></td>
      <td data-label="${escapeHtml(labels[2] || "")}"><span class="race-winner">${escapeHtml(race.winner || t("noWinner"))}</span></td>
      <td data-label="${escapeHtml(labels[3] || "")}">${escapeHtml(race.participants_count ?? "-")}</td>
      <td data-label="${escapeHtml(labels[4] || "")}"><div>${escapeHtml(race.best_lap || "-")}</div><div class="race-note">${escapeHtml(race.best_lap_driver || "-")}</div></td>
    </tr>
  `).join("");
  container.innerHTML = `<table class="races-table"><thead><tr>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
  container.querySelectorAll("tbody tr[data-race-index]").forEach(row => {
    const openRow = () => openRaceResultsModal(recentRaceItems[Number(row.dataset.raceIndex)] || null, row);
    row.addEventListener("click", event => { if (!event.target.closest("a")) openRow(); });
    row.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openRow(); } });
  });
  renderRecentRacesPagination(container);
}
function buildRecentRacesPageUrl(page) {
  const url = new URL(recentRacesUrl, window.location.href);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(recentRacesPageSize));
  return url.toString();
}
async function loadRecentRacesPage(page = 1) {
  const payload = await loadJson(buildRecentRacesPageUrl(page));
  const allItems = Array.isArray(payload?.items) ? payload.items : [];
  const payloadPageSize = Number(payload?.page_size) || recentRacesPageSize;
  recentRacesPageSize = payloadPageSize;
  recentRacesTotalItems = Number(payload?.total_items) || allItems.length;
  recentRacesTotalPages = Number(payload?.total_pages) || Math.max(1, Math.ceil(recentRacesTotalItems / recentRacesPageSize));
  recentRacesPage = Math.min(Number(payload?.page) || page, recentRacesTotalPages);
  if (payload?.total_items == null && allItems.length > recentRacesPageSize) {
    const start = (recentRacesPage - 1) * recentRacesPageSize;
    recentRaceItems = allItems.slice(start, start + recentRacesPageSize);
  } else {
    recentRaceItems = allItems;
  }
  return recentRaceItems;
}
async function loadRecentRacesPageAndRender(page) {
  const container = document.getElementById("recent-races-table");
  if (container) container.innerHTML = `<div class="empty">${escapeHtml(t("loadingShort"))}</div>`;
  try {
    await loadRecentRacesPage(page);
    renderRecentRaces(recentRaceItems);
  } catch (error) {
    console.error(error);
    if (container) container.innerHTML = `<div class="empty">${escapeHtml(t("loadError"))}</div>`;
  }
}
function renderRecentRacesPagination(container) {
  if (recentRacesTotalPages <= 1) return;
  const start = recentRacesTotalItems ? ((recentRacesPage - 1) * recentRacesPageSize) + 1 : 0;
  const end = Math.min(recentRacesPage * recentRacesPageSize, recentRacesTotalItems);
  const buttons = [];
  buttons.push(`<button class="race-page-btn" type="button" data-page="${recentRacesPage - 1}" ${recentRacesPage <= 1 ? "disabled" : ""} aria-label="Previous page">&lt;</button>`);
  const first = Math.max(1, recentRacesPage - 2);
  const last = Math.min(recentRacesTotalPages, recentRacesPage + 2);
  for (let page = first; page <= last; page += 1) {
    buttons.push(`<button class="race-page-btn ${page === recentRacesPage ? "active" : ""}" type="button" data-page="${page}" ${page === recentRacesPage ? "aria-current=\"page\"" : ""}>${page}</button>`);
  }
  buttons.push(`<button class="race-page-btn" type="button" data-page="${recentRacesPage + 1}" ${recentRacesPage >= recentRacesTotalPages ? "disabled" : ""} aria-label="Next page">&gt;</button>`);
  container.insertAdjacentHTML("beforeend", `
    <div class="race-pagination">
      <div class="race-pagination-info">${escapeHtml(`${start}-${end} / ${recentRacesTotalItems}`)}</div>
      <div class="race-pagination-buttons">${buttons.join("")}</div>
    </div>
  `);
  container.querySelectorAll(".race-page-btn[data-page]").forEach(button => {
    button.addEventListener("click", () => {
      const page = Number(button.dataset.page);
      if (!Number.isFinite(page) || page < 1 || page > recentRacesTotalPages || page === recentRacesPage) return;
      loadRecentRacesPageAndRender(page);
    });
  });
}
function renderRaceResultsModal() {
  const titleEl = document.getElementById("race-results-title");
  const subtitleEl = document.getElementById("race-results-subtitle");
  const summaryEl = document.getElementById("race-modal-summary");
  const tableEl = document.getElementById("race-results-table");
  if (!titleEl || !subtitleEl || !summaryEl || !tableEl) return;
  if (!selectedRace) {
    applyRaceModalTrackBackground("");
    titleEl.textContent = "-";
    subtitleEl.textContent = "-";
    summaryEl.innerHTML = "";
    tableEl.innerHTML = `<div class="empty">${escapeHtml(t("recentEmpty"))}</div>`;
    return;
  }
  applyRaceModalTrackBackground(selectedRace.track);
  titleEl.textContent = selectedRace.track_name || humanizeTrackName(selectedRace.track);
  subtitleEl.textContent = formatDateTimeLocal(selectedRace.finished_at || selectedRace.finished_at_local);
  summaryEl.innerHTML = `
    <div class="race-summary-card"><div class="race-summary-label">${escapeHtml(t("raceSummaryTrack"))}</div><div class="race-summary-value">${escapeHtml(selectedRace.track_name || humanizeTrackName(selectedRace.track))}</div></div>
    <div class="race-summary-card"><div class="race-summary-label">${escapeHtml(t("raceSummaryWinner"))}</div><div class="race-summary-value">${escapeHtml(selectedRace.winner || t("noWinner"))}</div></div>
    <div class="race-summary-card"><div class="race-summary-label">${escapeHtml(t("raceSummaryDrivers"))}</div><div class="race-summary-value">${escapeHtml(selectedRace.participants_count ?? "-")}</div></div>
    <div class="race-summary-card"><div class="race-summary-label">${escapeHtml(t("raceSummaryBestLap"))}</div><div class="race-summary-value">${escapeHtml(selectedRace.best_lap || "-")}</div></div>
  `;
  const headers = t("raceModalCols").map(label => `<th>${escapeHtml(label)}</th>`).join("");
  const rows = (selectedRace.results || []).map(row => `
    <tr>
      <td><span class="rank-badge rank-${escapeHtml(row.position)}">#${escapeHtml(row.position)}</span></td>
      <td>${escapeHtml(formatStartPosition(row))}</td>
      <td>${renderPositionsDelta(row.positions_delta)}</td>
      <td><div class="driver-cell"><div class="driver-avatar">${escapeHtml(initials(row.driver))}</div><div class="driver-name-wrap"><div class="driver-name">${escapeHtml(row.driver || "-")}</div><div class="race-note">${escapeHtml(row.race_number != null ? `#${row.race_number}` : "")}</div></div></div></td>
      <td><div>${escapeHtml(row.best_lap || "-")}</div><div class="race-note">${row.had_best_lap ? escapeHtml(t("raceBestLapBadge")) : ""}</div></td>
      <td><div>${escapeHtml(row.car_name || "-")}</div><div class="race-note">${row.counted_for_stats === false ? escapeHtml(t("notCountedBadge")) : ""}</div></td>
      <td>${escapeHtml(row.gap || (row.position === 1 ? "-" : "-"))}</td>
      <td>${escapeHtml(row.points ?? 0)}</td>
      <td>${escapeHtml(row.penalty_points ?? 0)}</td>
    </tr>
  `).join("");
  tableEl.innerHTML = `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
}
const renderRaceResultsModalBase = renderRaceResultsModal;
renderRaceResultsModal = function() {
  renderRaceResultsModalBase();
  if (!selectedRace) return;
  const summaryEl = document.getElementById("race-modal-summary");
  if (!summaryEl) return;
  const extraCards = [];
  if (selectedRace?.weather?.summary_key) {
    extraCards.push(
      `<div class="race-summary-card"><div class="race-summary-label">${escapeHtml(t("heroWeatherLabel"))}</div><div class="race-summary-value weather-summary-inline">${renderWeatherStateIcon(selectedRace?.weather || { rain_level: selectedRace?.rain_level })}<span>${escapeHtml(buildScheduleCardWeatherBase(selectedRace))}</span></div></div>`
    );
  }
  const gameTimeValue = formatGameTimeValue(selectedRace?.game_time);
  if (gameTimeValue) {
    extraCards.push(
      `<div class="race-summary-card"><div class="race-summary-label">${escapeHtml(getGameTimeTitle())}</div><div class="race-summary-value game-time-summary-inline">${renderGameTimeStateIcon(selectedRace?.game_time)}<span>${escapeHtml(gameTimeValue)}</span></div></div>`
    );
  }
  if (extraCards.length) {
    summaryEl.insertAdjacentHTML("beforeend", extraCards.join(""));
  }
};
function renderScheduleModal() {
  const modal = document.getElementById("schedule-modal");
  const modalCard = document.querySelector("#schedule-modal .modal-card-slot");
  const headerEl = document.querySelector("#schedule-modal .modal-header");
  const titleEl = document.getElementById("schedule-modal-title");
  const subtitleEl = document.getElementById("schedule-modal-subtitle");
  const detailsEl = document.getElementById("schedule-modal-details");
  if (!modal || !modalCard || !headerEl || !titleEl || !subtitleEl || !detailsEl) return;
  if (!selectedScheduleItem) {
    applyScheduleModalTrackBackground("");
    modal.dataset.version = eventModalVersion;
    modalCard.classList.remove("is-event-details-v2");
    headerEl.classList.remove("event-details-v2-legacy-header");
    titleEl.textContent = "-";
    subtitleEl.textContent = "-";
    detailsEl.innerHTML = `<div class="empty">${escapeHtml(t("scheduleEmpty"))}</div>`;
    return;
  }
  applyScheduleModalTrackBackground(selectedScheduleItem.track_code);
  modal.dataset.version = eventModalVersion;
  if (useEventModalV2()) {
    modalCard.classList.add("is-event-details-v2");
    headerEl.classList.add("event-details-v2-legacy-header");
    titleEl.textContent = getLocalizedField(selectedScheduleItem, "track_name", selectedScheduleItem.track_name || "--");
    subtitleEl.textContent = `${formatDate(selectedScheduleItem?.date)} • ${`${getLocalizedField(selectedScheduleItem, "start_time_local", selectedScheduleItem?.start_time_local || "--")} ${getLocalizedField(selectedScheduleItem, "timezone", selectedScheduleItem?.timezone || "UTC+3")}`.trim()}`;
    detailsEl.innerHTML = buildScheduleModalDetailsV2(selectedScheduleItem);
    bindVoteControls(detailsEl);
    bindHeroCopyButtons(detailsEl);
    return;
  }
  modalCard.classList.remove("is-event-details-v2");
  headerEl.classList.remove("event-details-v2-legacy-header");
  titleEl.textContent = getLocalizedField(selectedScheduleItem, "track_name", selectedScheduleItem.track_name || "--");
  const server = announcementData?.server || {};
  const startTime = getLocalizedField(selectedScheduleItem, "start_time_local", selectedScheduleItem?.start_time_local || "--");
  const timezone = getLocalizedField(selectedScheduleItem, "timezone", selectedScheduleItem?.timezone || "UTC+3");
  const scheduleDateTime = `${formatDate(selectedScheduleItem?.date)} · ${`${startTime} ${timezone}`.trim()}`;
  subtitleEl.innerHTML = `
    <span class="schedule-modal-subtitle-grid">
      <span class="schedule-modal-subtitle-card">
        <span class="schedule-modal-subtitle-label">${escapeHtml(t("heroServerLabel"))}</span>
        <span class="schedule-modal-subtitle-value">${escapeHtml(server.name || server.full_name || t("unknownValue"))}</span>
      </span>
      <span class="schedule-modal-subtitle-card">
        <span class="schedule-modal-subtitle-label">${escapeHtml(t("heroPasswordLabel"))}</span>
        <span class="schedule-modal-subtitle-value">${escapeHtml(server.password || t("passwordNone"))}</span>
      </span>
      <span class="schedule-modal-subtitle-card">
        <span class="schedule-modal-subtitle-label">${escapeHtml(`${t("labelDate")} + ${t("labelTime")}`)}</span>
        <span class="schedule-modal-subtitle-value">${escapeHtml(formatDate(selectedScheduleItem?.date))}<br>${escapeHtml(`${startTime} ${timezone}`.trim())}</span>
      </span>
    </span>
  `;
  detailsEl.innerHTML = buildScheduleModalDetailsLegacy(selectedScheduleItem);
  bindVoteControls(detailsEl);
  bindHeroCopyButtons(detailsEl);
}
const renderScheduleModalBase = renderScheduleModal;
renderScheduleModal = function() {
  renderScheduleModalBase();
  if (!selectedScheduleItem) return;
  const gameTimeValue = formatGameTimeValue(selectedScheduleItem?.game_time);
  if (!gameTimeValue) return;
  const subtitleValues = document.querySelectorAll(".schedule-modal-subtitle-value");
  const dateTimeValue = subtitleValues[2];
  if (!dateTimeValue || dateTimeValue.dataset.gameTimeBound === "true") return;
  dateTimeValue.dataset.gameTimeBound = "true";
  dateTimeValue.innerHTML += `<br>${escapeHtml(`${getGameTimeTitle()}: ${gameTimeValue}`)}`;
};
function renderWeatherModal() {
  const detailsEl = document.getElementById("weather-modal-details");
  if (!detailsEl) return;
  const weather = announcementData?.weather || {};
  const cards = buildWeatherModalCards(weather);
  if (!cards.length) {
    detailsEl.innerHTML = `<div class="empty">${escapeHtml(t("unknownValue"))}</div>`;
    return;
  }
  detailsEl.innerHTML = cards.map(card => `
    <article class="weather-detail-card">
      <div class="weather-detail-head">
        ${card.icon ? `<img class="weather-detail-icon" src="${escapeHtml(card.icon)}" alt="" aria-hidden="true" />` : `<div class="weather-detail-value weather-detail-value-plain">${escapeHtml(card.value)}</div>`}
        ${card.icon ? `<div class="weather-detail-value">${escapeHtml(card.value)}</div>` : ""}
      </div>
      <div class="weather-detail-title">${escapeHtml(card.title)}</div>
      <div class="weather-detail-body">${escapeHtml(card.body)}</div>
    </article>
  `).join("");
}
function ensureModalMountedInBody(id) {
  const modal = document.getElementById(id);
  if (!modal || modal.parentElement === document.body) return;
  document.body.appendChild(modal);
}
function openModal() {
  const modal = document.getElementById("race-results-modal");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  renderRaceResultsModal();
}
function openScheduleModal(item, trigger = document.activeElement) {
  const modal = document.getElementById("schedule-modal");
  if (!modal || !item) return;
  lastScheduleModalTrigger = trigger instanceof HTMLElement ? trigger : document.activeElement;
  selectedScheduleItem = item;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  renderScheduleModal();
}
function openWeatherModal() {
  const modal = document.getElementById("weather-modal");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  renderWeatherModal();
}
function closeModal() {
  const modal = document.getElementById("race-results-modal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  selectedRace = null;
  applyRaceModalTrackBackground("");
}
function closeScheduleModal() {
  const modal = document.getElementById("schedule-modal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  selectedScheduleItem = null;
  applyScheduleModalTrackBackground("");
  if (lastScheduleModalTrigger instanceof HTMLElement) lastScheduleModalTrigger.focus();
  lastScheduleModalTrigger = null;
}
function closeWeatherModal() {
  const modal = document.getElementById("weather-modal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}
async function loadRaceDetails(race) {
  if (!race?.details_path) return race;
  if (raceDetailsCache.has(race.details_path)) return raceDetailsCache.get(race.details_path);
  const details = await loadJson(`${recentRaceDetailsBaseUrl}${race.details_path}`);
  raceDetailsCache.set(race.details_path, details);
  return details;
}
async function openRaceResultsModal(race) {
  if (!race) return;
  selectedRace = {
    track_name: race.track_name,
    track: race.track,
    finished_at: race.finished_at,
    participants_count: race.participants_count,
    winner: race.winner,
    best_lap: race.best_lap,
    results: []
  };
  openModal();
  try {
    selectedRace = await loadRaceDetails(race);
    renderRaceResultsModal();
  } catch (error) {
    console.error(error);
  }
}
function bindScheduleModal() {
  const modal = document.getElementById("schedule-modal");
  const closeButton = document.getElementById("schedule-modal-close");
  if (closeButton) closeButton.addEventListener("click", closeScheduleModal);
  if (modal) {
    modal.addEventListener("click", event => { if (event.target === modal) closeScheduleModal(); });
  }
}
function bindRaceModal() {
  const modal = document.getElementById("race-results-modal");
  const closeButton = document.getElementById("race-results-close");
  if (closeButton) closeButton.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", event => { if (event.target === modal) closeModal(); });
  }
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (document.getElementById("schedule-modal")?.classList.contains("is-open")) closeScheduleModal();
    if (document.getElementById("race-results-modal")?.classList.contains("is-open")) closeModal();
    if (document.getElementById("weather-modal")?.classList.contains("is-open")) closeWeatherModal();
  });
}
function bindWeatherModal() {
  const modal = document.getElementById("weather-modal");
  const closeButton = document.getElementById("weather-modal-close");
  const trigger = document.getElementById("hero-weather-card");
  if (closeButton) closeButton.addEventListener("click", closeWeatherModal);
  if (modal) {
    modal.addEventListener("click", event => { if (event.target === modal) closeWeatherModal(); });
  }
  if (trigger) {
    const openIfMobile = () => {
      if (!window.matchMedia("(max-width: 720px)").matches) return;
      openWeatherModal();
    };
    trigger.addEventListener("click", openIfMobile);
    trigger.addEventListener("keydown", event => {
      if ((event.key === "Enter" || event.key === " ") && window.matchMedia("(max-width: 720px)").matches) {
        event.preventDefault();
        openWeatherModal();
      }
    });
  }
}
function bindChampionshipCardLink() {
  document.querySelectorAll(".hero-announcement-card, .hourly-championship-v2").forEach(card => {
    if (!card || card.dataset.linkBound === "true") return;
    card.dataset.linkBound = "true";
    const open = event => {
      if (event.target.closest("a, button")) return;
      const href = card.dataset.href || "./championship/";
      window.location.href = href;
    };
    card.addEventListener("click", open);
    card.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      open(event);
    });
  });
}
function renderErrorState() {
  const scheduleList = document.getElementById("schedule-v2-list") || document.getElementById("schedule-list");
  if (scheduleList) scheduleList.innerHTML = `<div class="empty">${escapeHtml(t("loadError"))}</div>`;
  const calendarGrid = document.getElementById("calendar-v2-grid") || document.getElementById("calendar-grid");
  if (calendarGrid) calendarGrid.innerHTML = `<div class="empty">${escapeHtml(t("loadError"))}</div>`;
  document.getElementById("recent-races-table").innerHTML = `<div class="empty">${escapeHtml(t("loadError"))}</div>`;
  const championshipsContainer = document.getElementById("championship-history-list");
  if (championshipsContainer) championshipsContainer.innerHTML = `<div class="empty">${escapeHtml(t("loadError"))}</div>`;
  setText("announcement-date", "--");
  setText("announcement-time", "--");
  setText("announcement-track", "--");
  setText("hero-server-name", "--");
  setText("hero-server-password", "--");
  setText("hero-entry-rules", "--");
  setText("hero-race-format", "--");
  setText("hero-pitstop-rules", "--");
  setText("hero-refuel-rules", "--");
  setText("hero-tyre-rules", "--");
  setText("hero-weather", "--");
  applyHeroTrackBackground("");
  const upcomingTitle = document.getElementById("hourly-upcoming-v2-title");
  const upcomingDateTime = document.getElementById("hourly-upcoming-v2-date-time");
  const upcomingGrid = document.getElementById("hourly-upcoming-v2-info-grid");
  const upcomingFooter = document.getElementById("hourly-upcoming-v2-footer");
  const championshipTitle = document.getElementById("hourly-championship-v2-title");
  const championshipMeta = document.getElementById("hourly-championship-v2-meta");
  const championshipEvent = document.getElementById("hourly-championship-v2-event");
  const championshipDescription = document.getElementById("hourly-championship-v2-description");
  if (upcomingTitle) upcomingTitle.textContent = "--";
  if (upcomingDateTime) upcomingDateTime.textContent = "--";
  if (upcomingGrid) upcomingGrid.innerHTML = `<div class="empty">${escapeHtml(t("loadError"))}</div>`;
  if (upcomingFooter) upcomingFooter.innerHTML = "";
  if (championshipTitle) championshipTitle.textContent = "--";
  if (championshipMeta) championshipMeta.textContent = "--";
  if (championshipEvent) championshipEvent.innerHTML = `<div class="empty">${escapeHtml(t("loadError"))}</div>`;
  if (championshipDescription) championshipDescription.textContent = "--";
}
function renderUI() {
  applyTranslations();
  if (hasLoadError) {
    renderErrorState();
    return;
  }
  if (hourlyLoadState.core) {
    renderCoreLoadingState();
    if (hourlyLoadState.recent) renderRecentRacesLoadingState();
    return;
  }
  renderAnnouncement(announcementData || {});
  renderHeroDetails(announcementData || {});
  renderChampionshipHero(announcementData || {});
  renderUpcomingHeroV2(announcementData || {});
  renderChampionshipHeroV2(announcementData || {});
  renderChampionshipHistory(championshipItems);
  renderHeroVote();
  renderScheduleTable(scheduleItems);
  renderCalendar(scheduleItems);
  if (hourlyLoadState.recent) renderRecentRacesLoadingState();
  else renderRecentRaces(recentRaceItems);
  renderScheduleModal();
  renderRaceResultsModal();
}
function bindLanguageButtons() {
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      if (!translations[lang] || lang === currentLang) return;
      currentLang = lang;
      localStorage.setItem("asgLang", currentLang);
      renderUI();
    });
  });
}

function bindTopNavMoreMenu() {
  const root = document.getElementById("top-nav-more");
  const toggle = document.getElementById("top-nav-more-toggle");
  const menu = document.getElementById("top-nav-more-menu");
  const navMenu = document.querySelector(".top-nav-menu");
  if (navMenu?.querySelector(".top-nav-group")) {
    if (root) {
      root.hidden = true;
      root.classList.remove("is-visible", "is-open");
    }
    return;
  }
  const items = navMenu ? [...navMenu.querySelectorAll("[data-nav-item='true']")] : [];
  if (!root || !toggle || !menu || !navMenu || !items.length || root.dataset.bound === "true") return;

  const closeMenu = () => {
    toggle.setAttribute("aria-expanded", "false");
    menu.hidden = true;
    root.classList.remove("is-open");
  };

  const rebuildOverflowMenu = () => {
    menu.innerHTML = "";
    items.forEach(item => {
      item.hidden = false;
    });

    root.classList.remove("is-visible");
    closeMenu();

    if (window.innerWidth > 980) {
      return;
    }

    root.classList.add("is-visible");
    root.hidden = false;

    const availableWidth = navMenu.clientWidth;
    const toggleWidth = root.offsetWidth || toggle.getBoundingClientRect().width;
    const gap = 8;
    const maxVisibleRight = Math.max(0, availableWidth - toggleWidth - gap);

    items.forEach(item => {
      item.hidden = false;
    });

    items.forEach(item => {
      const itemRightEdge = item.offsetLeft + item.offsetWidth;
      if (itemRightEdge > maxVisibleRight) {
        item.hidden = true;
      }
    });

    const hiddenItems = items.filter(item => item.hidden);
    if (!hiddenItems.length) {
      root.classList.remove("is-visible");
      root.hidden = true;
      return;
    }

    hiddenItems.forEach(item => {
      const clone = item.cloneNode(true);
      clone.className = item.classList.contains("top-nav-link-hourly")
        ? "top-nav-more-link top-nav-more-link-hourly"
        : item.classList.contains("top-nav-link-championship")
          ? "top-nav-more-link top-nav-more-link-championship"
          : "top-nav-more-link";
      clone.hidden = false;
      clone.removeAttribute("data-nav-item");
      menu.appendChild(clone);
    });
  };

  const openMenu = () => {
    toggle.setAttribute("aria-expanded", "true");
    menu.hidden = false;
    root.classList.add("is-open");
  };

  toggle.addEventListener("click", event => {
    event.preventDefault();
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  document.addEventListener("click", event => {
    if (!root.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });

  menu.addEventListener("click", event => {
    if (event.target.closest("a")) closeMenu();
  });

  window.addEventListener("resize", rebuildOverflowMenu);

  requestAnimationFrame(rebuildOverflowMenu);
  window.addEventListener("load", rebuildOverflowMenu, { once: true });
  root.rebuildOverflowMenu = rebuildOverflowMenu;
  root.dataset.bound = "true";
}

function bindTopNavGroups() {
  const groups = [...document.querySelectorAll(".top-nav-group")];
  if (!groups.length || document.body.dataset.topNavGroupsBound === "true") return;
  const navMenu = document.querySelector(".top-nav-menu");
  navMenu?.classList.add("has-nav-groups");

  const closeGroup = (group) => {
    const toggle = group.querySelector(".top-nav-group-toggle");
    const menu = group.querySelector(".top-nav-group-menu");
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", "false");
    menu.hidden = true;
    group.classList.remove("is-open");
  };

  const closeAllGroups = (exceptGroup = null) => {
    groups.forEach(group => {
      if (group !== exceptGroup) closeGroup(group);
    });
  };

  groups.forEach(group => {
    const toggle = group.querySelector(".top-nav-group-toggle");
    const menu = group.querySelector(".top-nav-group-menu");
    if (!toggle || !menu) return;

    toggle.addEventListener("click", event => {
      event.preventDefault();
      const shouldOpen = menu.hidden;
      closeAllGroups(shouldOpen ? group : null);
      if (shouldOpen) {
        toggle.setAttribute("aria-expanded", "true");
        menu.hidden = false;
        group.classList.add("is-open");
      } else {
        closeGroup(group);
      }
    });

    menu.addEventListener("click", event => {
      if (event.target.closest("a")) closeGroup(group);
    });
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".top-nav-group")) closeAllGroups();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeAllGroups();
  });

  document.body.dataset.topNavGroupsBound = "true";
}

async function init() {
  ensureModalMountedInBody("schedule-modal");
  ensureModalMountedInBody("race-results-modal");
  ensureModalMountedInBody("weather-modal");
  window.addEventListener("storage", event => {
    if (event.key === VOTE_STATE_STORAGE_KEY) {
      syncVoteStateFromStorage();
    }
    if (event.key === NEWS_READ_STORAGE_KEY) {
      renderNewsBell();
      renderNewsNotificationsModal();
    }
  });
  currentLang = resolveInitialLanguage();
  bindLanguageButtons();
  bindTopNavGroups();
  bindTopNavMoreMenu();
  ensureNewsNotificationsUi();
  initNewsNotificationsModal();
  bindScheduleModal();
  bindRaceModal();
  bindWeatherModal();
  bindChampionshipCardLink();
  renderUI();
  void loadNewsFeed().then(() => {
    renderNewsBell();
    renderNewsNotificationsModal();
  });
  try {
    const [announcement, schedule, championships, serverStatus] = await Promise.all([
      loadJson(announcementUrl),
      loadJson(scheduleUrl),
      loadJson(championshipsUrl).catch(() => ({ items: [] })),
      loadJson(serverStatusUrl).catch(() => null)
    ]);
    announcementData = announcement || {};
    serverStatusData = serverStatus && typeof serverStatus === "object" ? serverStatus : null;
    scheduleItems = buildScheduleItems(schedule, announcementData);
    championshipItems = normalizeChampionshipItems(championships);
    hasLoadError = false;
    hourlyLoadState.core = false;
    renderUI();
    setupRecentRacesLazyLoad();
    loadVotesForSchedule(scheduleItems.slice(0, 3)).finally(() => {
      renderUI();
    });
  } catch (error) {
    console.error(error);
    hasLoadError = true;
    renderUI();
  }
}

document.addEventListener("DOMContentLoaded", init);

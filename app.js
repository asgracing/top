const IS_RACES_PAGE = /\/races(?:\/|\/index\.html)?$/i.test(window.location.pathname);
const IS_DRIVER_PAGE = /\/driver(?:\/|\/index\.html)?$/i.test(window.location.pathname);
const IS_CARS_PAGE = /\/cars(?:\/|\/index\.html)?$/i.test(window.location.pathname);
const dataBasePath = (IS_RACES_PAGE || IS_DRIVER_PAGE || IS_CARS_PAGE) ? "../" : "./";
const snapshotUrl = `${dataBasePath}snapshot.json`;
const leaderboardUrl = `${dataBasePath}leaderboard.json`;
const bestlapsUrl = `${dataBasePath}bestlaps.json`;
const globalStatsUrl = `${dataBasePath}global_stats.json`;
const safetyUrl = `${dataBasePath}safety.json`;
const driverOfDayUrl = `${dataBasePath}driver_of_the_day.json`;
const serverStatusUrl = `${dataBasePath}server_status.json`;
const onlineUrl = `${dataBasePath}online.json`;
const racesUrl = IS_RACES_PAGE ? "./races.json" : `${dataBasePath}races/races.json`;
const carsUrl = IS_CARS_PAGE ? "./cars.json" : `${dataBasePath}cars/cars.json`;
const driverIndexUrl = `${dataBasePath}drivers/drivers.json`;
const PAGE_SIZE = 10;

let leaderboardData = [];
let bestlapsData = [];
let todayStatsData = null;
let safetyData = [];
let driverOfDayData = null;
let racesData = [];
let carsData = [];
let leaderboardPage = 1;
let bestlapsPage = 1;
let safetyPage = 1;
let currentLang = localStorage.getItem("asgLang") || "en";
let leaderboardSearch = "";
let bestlapsSearch = "";
let safetySearch = "";
let leaderboardSort = { key: null, direction: null };
let bestlapsSort = { key: null, direction: null };
let safetySort = { key: null, direction: null };
let carsSort = { key: "wins", direction: "desc" };
let onlineData = [];
let selectedRace = null;
let driverIndexData = [];
let driverProfileData = null;

const translations = {
  en: {
    onlineTitle: "Unique players",
onlineNoData: "No data",
    todayStatsBtn: "Today Stats",
    todayStatsEyebrow: "Daily overview",
    todayStatsTitle: "Today's Statistics",
    todayUniquePlayers: "Unique drivers today",
    todayRaces: "Races today",
    todaySessions: "Sessions today",
    todayPoints: "Points earned today",
    todayWins: "Wins today",
    todayPodiums: "Podiums today",
    todayAvgPlayers: "Avg players per race",
    todayTracks: "Tracks raced today",
    todayBestLap: "Best lap today",
    todayMostActive: "Most active driver",
    todayMostSuccessful: "Most successful driver",
    driverOfDayBtn: "Driver of the day: {driver}",
    driverOfDayEyebrow: "Top performer today",
    driverOfDayTitle: "Driver of the Day",
    driverOfDayName: "Driver",
    driverOfDayPoints: "Points today",
    driverOfDayRaces: "Races today",
    driverOfDayWins: "Wins today",
    driverOfDayAvgFinish: "Average finish",
    driverOfDayAvgGain: "Avg pos delta",
    driverOfDayBestLap: "Best lap today",
    driverOfDayBestLapTrack: "Track",
    driverOfDayNoData: "No race data for today yet.",
    htmlLang: "en",
    pageTitle: "ASG Racing ACC Leaderboard | Assetto Corsa Competizione Stats",
    pageTitleRaces: "ASG Racing Last Races | Assetto Corsa Competizione Results",
    pageTitleCars: "ASG Racing Cars | Assetto Corsa Competizione Stats",
    metaDescription:
      "ASG Racing ACC Leaderboard - race stats, wins, podiums and best laps from the public Assetto Corsa Competizione server.",
    ogDescription:
      "Race stats, wins, podiums and best laps from the ASG Racing server in Assetto Corsa Competizione.",
    twitterDescription:
      "Races, wins, podiums and best laps from the public ACC server of ASG Racing.",
    ogLocale: "en_US",
    heroTitle: "🏁 ASG Racing Leaderboard",
    heroSubtitle:
      "Race statistics, wins, podiums and best laps from the <strong>ASG Racing</strong> server. Data is automatically updated based on dedicated server results.",
    btnChampionship: "Championship",
    btnLastRaces: "Last Races",
    btnCars: "Cars",
    lastRacesBtn: "Last Races",
    btnBackHome: "Back to Home",
    btnBestLaps: "Best Laps",
    btnWorstSafety: "Worst Safety",
    btnAboutServer: "About Server",
    driversCountLabel: "Drivers in leaderboard",
    driversCountNote: "Unique participants included in the stats.",
    bestLapHighlightLabel: "Best lap record",
    bestLapNoteFallback: "Best lap highlight will appear here.",
    bestLapNoteTemplate: "{driver} · {track}",
    top3Title: "Top 3 Drivers",
    top3Subtitle: "Current championship leaders by points.",
    championshipTitle: "Championship Leaderboard",
    championshipSubtitle: "Points, wins, podiums, average finish and best lap.",
    bestLapsTitle: "Best Laps",
    bestLapsSubtitle: "Fastest laps recorded during qualifying and race sessions.",
    worstSafetyTitle: "Worst Safety",
    worstSafetySubtitle: "Penalty count, penalty points and breakdown by penalty type.",
    aboutTitle: "About ASG Racing Server",
    aboutSubtitle: "Assetto Corsa Competizione public racing server",
    aboutP1:
      "<strong>ASG Racing</strong> is a public <strong>Assetto Corsa Competizione</strong> server where drivers compete on popular GT3 tracks, improve their lap times and compare their statistics with other racers.",
    aboutP2: "This page automatically publishes the server leaderboard including:",
    aboutList1: "🏁 number of races",
    aboutList2: "🥇 wins",
    aboutList3: "🏆 podium finishes",
    aboutList4: "📊 average finish position",
    aboutList5: "⚡ best laps",
    aboutP3:
      "Statistics are generated automatically from <strong>ACC Dedicated Server</strong> result files. After each race the data is recalculated and published on the website.",
    pointsTitle: "How points are calculated",
    pointsP1: "Points are awarded using a GT-style system:",
    pointsList1: "1st place - 25 points",
    pointsList2: "2nd place - 18 points",
    pointsList3: "3rd place - 15 points",
    pointsList4: "4th–10th - decreasing points",
    pointsP2:
      "Drivers also receive <strong>1 additional point</strong> for the fastest lap in race.",
    bestLapsInfoTitle: "Best laps",
    bestLapsInfoP1:
      "The <strong>Best Laps</strong> table contains the fastest lap times recorded both in qualifying and in race sessions. This makes it easy to compare the outright pace of the drivers.",
    joinTitle: "Join the server",
    joinP1: "To participate in races and appear in the leaderboard, join the server:",
    serverName: "ASG Racing ACC Public Server",
    joinP2: "Community news and communication are available in our channels:",
    footerText:
      "Statistics are generated from ACC Dedicated Server result files and published via GitHub Pages.",
    loading: "Loading...",
    loadingRaces: "Loading races...",
    loadingLeaderboard: "Loading leaderboard...",
    loadingBestLaps: "Loading best laps...",
    emptyTop3: "No top-3 data available yet.",
    emptyLeaderboard: "No leaderboard data yet.",
    emptyBestLaps: "No best lap data yet.",
    emptyRaces: "No race results yet.",
    emptySearch: "No matching drivers found.",
    errorLoading: "Data loading error.",
    errorLeaderboard: "Failed to load leaderboard.json",
    errorBestlaps: "Failed to load bestlaps.json",
    racesEyebrow: "Race archive",
    racesPageTitle: "Last Races",
    racesPageSubtitle: "Latest race sessions from ASG Racing. Click any row to open the full result sheet.",
    carsEyebrow: "Car stats",
    carsPageTitle: "Cars",
    carsPageSubtitle: "Performance overview by car model based on recorded race results.",
    carsSummaryTotal: "Car models",
    carsSummaryTopWinner: "Top winner",
    carsSummaryMostUsed: "Most used",
    carsTableTitle: "Cars Table",
    carsTableSubtitle: "Sorted by wins, podiums and race count.",
    carsCols: ["Car", "Races", "Wins", "Win Rate", "Podiums", "Drivers", "Avg Finish", "Fastest Laps", "Best Lap"],
    racesSummaryTotal: "Total races",
    racesSummaryLatestTrack: "Latest track",
    racesSummaryLatestWinner: "Latest winner",
    racesTableTitle: "Race Results",
    racesTableSubtitle: "Sorted from newest to oldest.",
    raceModalEyebrow: "Race details",
    racesCols: ["Date", "Track", "Winner", "Drivers", "Best Lap"],
    raceModalCols: ["Pos", "Start", "Δ", "Driver", "Best Lap", "Total Time", "Gap", "Pts", "Pen"],
    raceSummaryTrack: "Track",
    raceSummaryWinner: "Winner",
    raceSummaryDrivers: "Drivers",
    raceSummaryBestLap: "Best lap",
    racePenaltyShort: "Pen",
    raceBestLapBadge: "Fastest lap",
    noWinner: "No winner",
    pageTitleDriver: "ASG Racing Driver Profile | Assetto Corsa Competizione Stats",
    driverEyebrow: "Driver profile",
    driverPageSubtitle: "Personal race history, pace and safety metrics from the ASG Racing server.",
    driverSummaryPoints: "Points",
    driverSummaryAvgPoints: "Avg points / race",
    driverSummaryAvgGain: "Avg pos delta",
    driverSummaryRaces: "Races",
    driverSummaryWins: "Wins",
    driverSummaryAvgFinish: "Avg finish",
    driverSummaryBestLap: "Best lap",
    driverSummaryPenaltyPoints: "Penalty points",
    driverSummaryFastestLaps: "Fastest lap awards",
    driverSectionOverview: "Overview",
    driverSectionRaces: "Race History",
    driverSectionTracks: "Track Stats",
    driverSectionPenalties: "Penalty Breakdown",
    driverRecentForm: "Recent form",
    driverMostRacedTrack: "Most raced track",
    driverWinRate: "Win rate",
    driverPodiumRate: "Podium rate",
    driverNoData: "Driver profile not found.",
    driverLoading: "Loading driver profile...",
    driverRaceCols: ["Date", "Track", "Start", "Pos", "Δ", "Points", "Best Lap", "Total Time", "Gap", "Pen"],
    driverTrackCols: ["Track", "Races", "Wins", "Podiums", "Points", "Avg finish", "Best lap"],
    driverPenaltyReason: "Reason",
    driverPenaltyType: "Type",
    leaderboardCols: [
      "Rank",
      "Driver",
      "Points",
      "Wins",
      "Podiums",
      "Races",
      "Avg Finish",
      "Best Lap",
      "Car",
      "Session"
    ],
    bestlapsCols: ["Rank", "Driver", "Best Lap", "Car", "Session", "Updated"],
    safetyBaseCols: ["Rank", "Driver", "Penalties", "Penalty Points"],
    leaderboardSearchPlaceholder: "Search driver...",
    bestlapsSearchPlaceholder: "Search driver...",
    safetySearchPlaceholder: "Search driver...",
    metaLabels: {
      points: "Points",
      wins: "Wins",
      podiums: "Podiums",
      races: "Races",
      bestLap: "Best lap"
    },
    sessionRace: "Race",
    sessionQualifying: "Qualifying",
    paginationShown: "Showing {start}-{end} of {total}",
    prev: "← Prev",
    next: "Next →"
  },
  ru: {
    onlineTitle: "Уникальные игроки",
onlineNoData: "Нет данных",
    todayStatsBtn: "Статистика за сегодня",
    todayStatsEyebrow: "Сводка дня",
    todayStatsTitle: "Статистика за сегодня",
    todayUniquePlayers: "Уникальных пилотов сегодня",
    todayRaces: "Гонок сегодня",
    todaySessions: "Сессий сегодня",
    todayPoints: "Очков заработано сегодня",
    todayWins: "Побед сегодня",
    todayPodiums: "Подиумов сегодня",
    todayAvgPlayers: "Среднее пилотов на гонку",
    todayTracks: "Трассы сегодня",
    todayBestLap: "Лучший круг сегодня",
    todayMostActive: "Самый активный пилот",
    todayMostSuccessful: "Самый успешный пилот",
    driverOfDayBtn: "Гонщик дня: {driver}",
    driverOfDayEyebrow: "Лучший пилот дня",
    driverOfDayTitle: "Гонщик дня",
    driverOfDayName: "Пилот",
    driverOfDayPoints: "Очки за сегодня",
    driverOfDayRaces: "Гонок сегодня",
    driverOfDayWins: "Побед сегодня",
    driverOfDayAvgFinish: "Ср. финиш",
    driverOfDayAvgGain: "Ср. дельта поз.",
    driverOfDayBestLap: "Лучший круг сегодня",
    driverOfDayBestLapTrack: "Трасса",
    driverOfDayNoData: "Сегодня ещё нет данных по гонкам.",
    htmlLang: "ru",
    pageTitleCars: "ASG Racing Cars | Статистика Assetto Corsa Competizione",
    btnCars: "Машины",
    carsEyebrow: "Статистика машин",
    carsPageTitle: "Машины",
    carsPageSubtitle: "Обзор результатов по моделям машин на основе сохраненных гоночных результатов.",
    carsSummaryTotal: "Моделей машин",
    carsSummaryTopWinner: "Лидер по победам",
    carsSummaryMostUsed: "Самая популярная",
    carsTableTitle: "Таблица машин",
    carsTableSubtitle: "Сортировка по клику на заголовки столбцов.",
    carsCols: ["Машина", "Гонки", "Победы", "Винрейт", "Подиумы", "Пилоты", "Ср. финиш", "Лучшие круги", "Бестлап"],
    pageTitle: "ASG Racing ACC Leaderboard | Статистика Assetto Corsa Competizione",
    pageTitleRaces: "ASG Racing Последние гонки | Результаты Assetto Corsa Competizione",
    metaDescription:
      "ASG Racing ACC Leaderboard - статистика гонок, побед, подиумов и лучших кругов на публичном сервере Assetto Corsa Competizione.",
    ogDescription:
      "Статистика гонок, побед, подиумов и лучших кругов на сервере ASG Racing в Assetto Corsa Competizione.",
    twitterDescription:
      "Гонки, победы, подиумы и лучшие круги на публичном ACC сервере ASG Racing.",
    ogLocale: "ru_RU",
    heroTitle: "🏁 ASG Racing Leaderboard",
    heroSubtitle:
      "Статистика гонок, побед, подиумов и лучших кругов на сервере <strong>ASG Racing</strong>. Данные обновляются автоматически на основе результатов dedicated server.",
    btnChampionship: "Чемпионат",
    btnLastRaces: "Последние гонки",
    lastRacesBtn: "Последние гонки",
    btnBackHome: "На главную",
    btnBestLaps: "Лучшие круги",
    btnWorstSafety: "Худшая безопасность",
    btnAboutServer: "О сервере",
    driversCountLabel: "Пилотов в рейтинге",
    driversCountNote: "Уникальные участники, попавшие в статистику.",
    bestLapHighlightLabel: "Лучший круг",
    bestLapNoteFallback: "Лучший круг будет показан здесь.",
    bestLapNoteTemplate: "{driver} · {track}",
    top3Title: "Топ-3 пилота",
    top3Subtitle: "Текущие лидеры чемпионата по очкам.",
    championshipTitle: "Таблица чемпионата",
    championshipSubtitle: "Очки, победы, подиумы, средний финиш и лучший круг.",
    bestLapsTitle: "Лучшие круги",
    bestLapsSubtitle: "Быстрейшие круги из квалификаций и гонок.",
    worstSafetyTitle: "Худшая безопасность",
    worstSafetySubtitle: "Количество штрафов, штрафные баллы и разбивка по типам penalty.",
    aboutTitle: "О сервере ASG Racing",
    aboutSubtitle: "Публичный сервер Assetto Corsa Competizione",
    aboutP1:
      "<strong>ASG Racing</strong> - это публичный сервер <strong>Assetto Corsa Competizione</strong>, где пилоты соревнуются на популярных GT3 трассах, улучшают свои времена круга и сравнивают статистику с другими гонщиками.",
    aboutP2: "На этой странице автоматически публикуется leaderboard сервера, включающий:",
    aboutList1: "🏁 количество гонок",
    aboutList2: "🥇 победы",
    aboutList3: "🏆 подиумы",
    aboutList4: "📊 средний финиш",
    aboutList5: "⚡ лучшие круги",
    aboutP3:
      "Статистика обновляется автоматически на основе файлов результатов <strong>ACC Dedicated Server</strong>. После каждой гонки данные пересчитываются и публикуются на сайте.",
    pointsTitle: "Как считается рейтинг",
    pointsP1: "Очки начисляются по системе, похожей на чемпионаты GT:",
    pointsList1: "1 место - 25 очков",
    pointsList2: "2 место - 18 очков",
    pointsList3: "3 место - 15 очков",
    pointsList4: "4–10 место - уменьшающиеся очки",
    pointsP2:
      "Также пилот получает <strong>1 дополнительное очко</strong> за лучший круг в гонке.",
    bestLapsInfoTitle: "Лучшие круги",
    bestLapsInfoP1:
      "Таблица <strong>Best Laps</strong> содержит лучшие времена круга, показанные как в квалификации, так и в гонках. Это позволяет сравнить абсолютную скорость пилотов.",
    joinTitle: "Присоединиться к серверу",
    joinP1: "Чтобы участвовать в гонках и попасть в таблицу лидеров, подключайтесь к серверу:",
    serverName: "ASG Racing ACC Public Server",
    joinP2: "Общение и новости сервера доступны в наших сообществах:",
    footerText:
      "Данные собираются из файлов результатов ACC Dedicated Server и публикуются через GitHub Pages.",
    loading: "Загрузка...",
    loadingRaces: "Загрузка гонок...",
    loadingLeaderboard: "Загрузка leaderboard...",
    loadingBestLaps: "Загрузка best laps...",
    emptyTop3: "Пока нет данных для топ-3.",
    emptyLeaderboard: "Пока нет данных leaderboard.",
    emptyBestLaps: "Пока нет данных best laps.",
    emptyRaces: "Пока нет данных о гонках.",
    emptySearch: "Совпадений не найдено.",
    errorLoading: "Ошибка загрузки данных.",
    errorLeaderboard: "Не удалось загрузить leaderboard.json",
    errorBestlaps: "Не удалось загрузить bestlaps.json",
    racesEyebrow: "Архив гонок",
    racesPageTitle: "Последние гонки",
    racesPageSubtitle: "Последние гоночные сессии ASG Racing. Нажмите на строку, чтобы открыть полный протокол.",
    racesSummaryTotal: "Всего гонок",
    racesSummaryLatestTrack: "Последняя трасса",
    racesSummaryLatestWinner: "Последний победитель",
    racesTableTitle: "Результаты гонок",
    racesTableSubtitle: "Сортировка от новых к старым.",
    raceModalEyebrow: "Детали гонки",
    racesCols: ["Дата", "Трасса", "Победитель", "Пилоты", "Лучший круг"],
    raceModalCols: ["Pos", "Старт", "Δ", "Пилот", "Лучший круг", "Время", "Отставание", "Очки", "Штр."],
    raceSummaryTrack: "Трасса",
    raceSummaryWinner: "Победитель",
    raceSummaryDrivers: "Пилотов",
    raceSummaryBestLap: "Лучший круг",
    racePenaltyShort: "Штр.",
    raceBestLapBadge: "Быстрый круг",
    noWinner: "Нет победителя",
    pageTitleDriver: "ASG Racing Профиль пилота | Статистика Assetto Corsa Competizione",
    driverEyebrow: "Профиль пилота",
    driverPageSubtitle: "Личная история гонок, темп и safety-метрики на сервере ASG Racing.",
    driverSummaryPoints: "Очки",
    driverSummaryAvgPoints: "Ср. очков / гонку",
    driverSummaryAvgGain: "Ср. дельта поз.",
    driverSummaryRaces: "Гонки",
    driverSummaryWins: "Победы",
    driverSummaryAvgFinish: "Ср. финиш",
    driverSummaryBestLap: "Лучший круг",
    driverSummaryPenaltyPoints: "Штрафные очки",
    driverSummaryFastestLaps: "Лучшие круги в гонке",
    driverSectionOverview: "Обзор",
    driverSectionRaces: "История гонок",
    driverSectionTracks: "Статистика по трассам",
    driverSectionPenalties: "Разбор штрафов",
    driverRecentForm: "Последние результаты",
    driverMostRacedTrack: "Любимая трасса",
    driverWinRate: "Процент побед",
    driverPodiumRate: "Процент подиумов",
    driverNoData: "Профиль пилота не найден.",
    driverLoading: "Загрузка профиля пилота...",
    driverRaceCols: ["Дата", "Трасса", "Старт", "Поз", "Δ", "Очки", "Лучший круг", "Время", "Отставание", "Штр"],
    driverTrackCols: ["Трасса", "Гонки", "Победы", "Подиумы", "Очки", "Ср. финиш", "Лучший круг"],
    driverPenaltyReason: "Причина",
    driverPenaltyType: "Тип",
    leaderboardCols: [
      "Место",
      "Пилот",
      "Очки",
      "Победы",
      "Подиумы",
      "Гонки",
      "Ср. финиш",
      "Лучший круг",
      "Машина",
      "Сессия"
    ],
    bestlapsCols: ["Место", "Пилот", "Лучший круг", "Машина", "Сессия", "Обновлено"],
    safetyBaseCols: ["Место", "Пилот", "Нарушения", "Штрафные баллы"],
    leaderboardSearchPlaceholder: "Поиск пилота...",
    bestlapsSearchPlaceholder: "Поиск пилота...",
    safetySearchPlaceholder: "Поиск пилота...",
    metaLabels: {
      points: "Очки",
      wins: "Победы",
      podiums: "Подиумы",
      races: "Гонки",
      bestLap: "Лучший круг"
    },
    sessionRace: "Гонка",
    sessionQualifying: "Квалификация",
    paginationShown: "Показано {start}-{end} из {total}",
    prev: "← Назад",
    next: "Вперед →"
  }
};

const leaderboardColumns = [
  { key: "rank", type: "number" },
  { key: "driver", type: "string" },
  { key: "points", type: "number" },
  { key: "wins", type: "number" },
  { key: "podiums", type: "number" },
  { key: "races", type: "number" },
  { key: "average_finish", type: "number" },
  { key: "best_lap", type: "time" },
  { key: "best_lap_car_name", type: "string" },
  { key: "best_lap_session_type", type: "string" }
];

const bestlapsColumns = [
  { key: "rank", type: "number" },
  { key: "driver", type: "string" },
  { key: "best_lap", type: "time" },
  { key: "car_name", type: "string" },
  { key: "session_type", type: "string" },
  { key: "updated_at", type: "string" }
];

const racesColumns = [
  { key: "finished_at", type: "string" },
  { key: "track", type: "string" },
  { key: "winner", type: "string" },
  { key: "participants_count", type: "number" },
  { key: "best_lap", type: "time" }
];

const carsColumns = [
  { key: "car_name", type: "string" },
  { key: "races", type: "number" },
  { key: "wins", type: "number" },
  { key: "win_rate", type: "number" },
  { key: "podiums", type: "number" },
  { key: "unique_drivers", type: "number" },
  { key: "average_finish", type: "number" },
  { key: "fastest_lap_awards", type: "number" },
  { key: "best_lap", type: "time" }
];


function getSafetyPenaltyKeys(data = []) {
  const keys = new Set();
  data.forEach(row => {
    const penalties = row?.penalties && typeof row.penalties === "object" ? row.penalties : {};
    Object.keys(penalties).forEach(key => keys.add(key));
  });
  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

function formatShortDate(dateStr) {
  if (!dateStr) return "-";
  const [year, month, day] = String(dateStr).split("-");
  if (!day || !month) return dateStr;
  return `${day}.${month}`;
}

function getLast7DaysOnline(data) {
  if (!Array.isArray(data)) return [];

  return [...data]
    .filter(item => item && item.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7)
    .map(item => ({
      date: item.date,
      label: formatShortDate(item.date),
      value: Number(item.unique_players) || 0
    }));
}

function buildScaleValues(maxValue) {
  const safeMax = Math.max(1, Number(maxValue) || 1);
  return [
    safeMax,
    Math.round(safeMax * 0.66),
    Math.round(safeMax * 0.33),
    0
  ];
}

function renderOnlineWidget() {
  const chartEl = document.getElementById("online-chart");
  const scaleEl = document.getElementById("online-scale");
  const rangeEl = document.getElementById("online-range");
  const titleEl = document.querySelector(".hero-online-title");

  if (titleEl) titleEl.textContent = t("onlineTitle");
  if (!chartEl || !scaleEl || !rangeEl) return;

  const prepared = getLast7DaysOnline(onlineData);

  if (!prepared.length) {
    chartEl.innerHTML = `<div class="hero-online-empty">${escapeHtml(t("onlineNoData"))}</div>`;
    scaleEl.innerHTML = `<span>0</span>`;
    rangeEl.textContent = "-";
    return;
  }

  const maxValue = Math.max(...prepared.map(item => item.value), 1);
  const scaleValues = buildScaleValues(maxValue);

  chartEl.innerHTML = prepared.map(item => {
    const heightPercent = Math.max(4, Math.round((item.value / maxValue) * 100));
    return `
      <div class="hero-online-bar-group" title="${escapeHtml(item.label)} - ${escapeHtml(item.value)}">
        <div class="hero-online-bar" style="height:${heightPercent}%"></div>
        <div class="hero-online-date">${escapeHtml(item.label)}</div>
      </div>
    `;
  }).join("");

  scaleEl.innerHTML = scaleValues.map(value => `<span>${escapeHtml(value)}</span>`).join("");

  const first = prepared[0];
  const last = prepared[prepared.length - 1];
  rangeEl.textContent = `${first.label} - ${last.label}`;
}

function getSafetyColumns() {
  const dynamicPenaltyKeys = getSafetyPenaltyKeys(safetyData);
  return [
    { key: "rank", type: "number", label: t("safetyBaseCols")[0] },
    { key: "driver", type: "string", label: t("safetyBaseCols")[1] },
    { key: "penalty_count", type: "number", label: t("safetyBaseCols")[2] },
    { key: "penalty_points", type: "number", label: t("safetyBaseCols")[3] },
    ...dynamicPenaltyKeys.map(key => ({
      key: `penalties.${key}`,
      type: "number",
      label: key
    }))
  ];
}

function t(key) {
  return translations[currentLang][key] ?? translations.en[key] ?? key;
}

function replaceTokens(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value) {
  return encodeURIComponent(String(value ?? ""));
}

function sha1(input) {
  const text = unescape(encodeURIComponent(String(input ?? "")));
  const words = [];
  const bitLength = text.length * 8;

  for (let i = 0; i < text.length; i += 1) {
    words[i >> 2] |= text.charCodeAt(i) << (24 - (i % 4) * 8);
  }

  words[bitLength >> 5] |= 0x80 << (24 - (bitLength % 32));
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

  const rotateLeft = (value, shift) => (value << shift) | (value >>> (32 - shift));

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let i = 0; i < words.length; i += 16) {
    const w = new Array(80);
    for (let j = 0; j < 16; j += 1) w[j] = words[i + j] | 0;
    for (let j = 16; j < 80; j += 1) w[j] = rotateLeft(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let j = 0; j < 80; j += 1) {
      let f;
      let k;

      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (rotateLeft(a, 5) + f + e + k + w[j]) | 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  return [h0, h1, h2, h3, h4]
    .map(value => (value >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

function makePublicDriverId(playerId) {
  if (!playerId) return null;
  return `drv_${sha1(playerId).slice(0, 12)}`;
}

function getDriverProfileHref(publicId, playerId = null) {
  const resolvedId = publicId || makePublicDriverId(playerId);
  if (!resolvedId) return null;
  return `${dataBasePath}driver/?id=${escapeAttribute(resolvedId)}`;
}

function renderDriverLink(name, publicId, className = "driver-link", playerId = null) {
  const safeName = escapeHtml(name || "-");
  const href = getDriverProfileHref(publicId, playerId);
  if (!href) {
    return `<span class="${escapeHtml(className)}">${safeName}</span>`;
  }
  return `<a class="${escapeHtml(className)}" href="${href}">${safeName}</a>`;
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function sessionLabel(value) {
  const v = String(value || "").toUpperCase();
  if (v === "R") return `<span class="pill pill-session-r">${escapeHtml(t("sessionRace"))}</span>`;
  if (v === "Q") return `<span class="pill pill-session-q">${escapeHtml(t("sessionQualifying"))}</span>`;
  return `<span class="pill">${escapeHtml(v || "-")}</span>`;
}

function normalizeString(value) {
  return String(value ?? "").trim().toLocaleLowerCase(currentLang === "ru" ? "ru" : "en");
}

function parseNumeric(value) {
  if (value === null || value === undefined || value === "" || value === "-") {
    return Number.POSITIVE_INFINITY;
  }
  const num = Number(String(value).replace(",", "."));
  return Number.isFinite(num) ? num : Number.POSITIVE_INFINITY;
}

function parseLapTime(value) {
  if (!value || value === "-") return Number.POSITIVE_INFINITY;
  const str = String(value).trim();
  const parts = str.split(":");

  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const secParts = parts[1].split(".");
    const seconds = Number(secParts[0] || 0);
    const millis = Number(secParts[1] || 0);
    if ([minutes, seconds, millis].every(Number.isFinite)) {
      return minutes * 60000 + seconds * 1000 + millis;
    }
  }

  if (parts.length === 3) {
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const secParts = parts[2].split(".");
    const seconds = Number(secParts[0] || 0);
    const millis = Number(secParts[1] || 0);
    if ([hours, minutes, seconds, millis].every(Number.isFinite)) {
      return hours * 3600000 + minutes * 60000 + seconds * 1000 + millis;
    }
  }

  return Number.POSITIVE_INFINITY;
}

function getNestedValue(row, key) {
  if (!key.includes(".")) return row?.[key];
  return key.split(".").reduce((acc, part) => acc?.[part], row);
}

function getComparableValue(row, column) {
  const value = getNestedValue(row, column.key);
  switch (column.type) {
    case "number":
      return parseNumeric(value);
    case "time":
      return parseLapTime(value);
    default:
      return normalizeString(value);
  }
}

function filterByDriver(data, search) {
  const query = normalizeString(search);
  if (!query) return [...data];
  return data.filter(row => normalizeString(row.driver).includes(query));
}

function sortData(data, sortState, columns) {
  if (!sortState.key || !sortState.direction) return [...data];
  const column = columns.find(col => col.key === sortState.key);
  if (!column) return [...data];

  return [...data].sort((a, b) => {
    const av = getComparableValue(a, column);
    const bv = getComparableValue(b, column);
    if (av < bv) return sortState.direction === "asc" ? -1 : 1;
    if (av > bv) return sortState.direction === "asc" ? 1 : -1;
    return parseNumeric(a.rank) - parseNumeric(b.rank);
  });
}

function cycleSort(sortState, key) {
  if (sortState.key !== key) return { key, direction: "asc" };
  return { key, direction: sortState.direction === "asc" ? "desc" : "asc" };
}

function getSortClass(sortState, key) {
  if (sortState.key !== key) return "";
  return sortState.direction === "asc" ? "sort-asc" : "sort-desc";
}

function getProcessedLeaderboard() {
  return sortData(
    filterByDriver(leaderboardData, leaderboardSearch),
    leaderboardSort,
    leaderboardColumns
  );
}

function getProcessedBestlaps() {
  return sortData(
    filterByDriver(bestlapsData, bestlapsSearch),
    bestlapsSort,
    bestlapsColumns
  );
}

function getProcessedSafety() {
  return sortData(
    filterByDriver(safetyData, safetySearch),
    safetySort,
    getSafetyColumns()
  );
}

function getProcessedCars() {
  return sortData(
    carsData,
    carsSort,
    carsColumns
  );
}

async function loadJson(url) {
  const res = await fetch(url, { cache: "default" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

function debounce(fn, wait = 180) {
  let timeoutId = null;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), wait);
  };
}

function normalizeSnapshotPayload(snapshot) {
  return {
    leaderboard: Array.isArray(snapshot?.leaderboard) ? snapshot.leaderboard : [],
    bestlaps: Array.isArray(snapshot?.bestlaps) ? snapshot.bestlaps : [],
    globalStats: snapshot?.global_stats && typeof snapshot.global_stats === "object" ? snapshot.global_stats : null,
    safety: Array.isArray(snapshot?.safety) ? snapshot.safety : [],
    driverOfDay: snapshot?.driver_of_the_day && typeof snapshot.driver_of_the_day === "object" ? snapshot.driver_of_the_day : null,
    serverStatus: snapshot?.server_status && typeof snapshot.server_status === "object" ? snapshot.server_status : null,
    online: Array.isArray(snapshot?.online) ? snapshot.online : []
  };
}

function normalizeLegacyPayload(results) {
  const [
    leaderboardResult,
    bestlapsResult,
    globalStatsResult,
    safetyResult,
    driverOfDayResult,
    serverStatusResult,
    onlineResult
  ] = results;

  return {
    leaderboard: leaderboardResult.status === "fulfilled" && Array.isArray(leaderboardResult.value)
      ? leaderboardResult.value
      : [],
    bestlaps: bestlapsResult.status === "fulfilled" && Array.isArray(bestlapsResult.value)
      ? bestlapsResult.value
      : [],
    globalStats: globalStatsResult.status === "fulfilled" && globalStatsResult.value && typeof globalStatsResult.value === "object"
      ? globalStatsResult.value
      : null,
    safety: safetyResult.status === "fulfilled" && Array.isArray(safetyResult.value)
      ? safetyResult.value
      : [],
    driverOfDay: driverOfDayResult.status === "fulfilled" && driverOfDayResult.value && typeof driverOfDayResult.value === "object"
      ? driverOfDayResult.value
      : null,
    serverStatus: serverStatusResult.status === "fulfilled" && serverStatusResult.value && typeof serverStatusResult.value === "object"
      ? serverStatusResult.value
      : null,
    online: onlineResult.status === "fulfilled" && Array.isArray(onlineResult.value)
      ? onlineResult.value
      : []
  };
}

async function loadSiteData() {
  try {
    const snapshot = await loadJson(snapshotUrl);
    return normalizeSnapshotPayload(snapshot);
  } catch (snapshotError) {
    console.warn("snapshot.json is unavailable, falling back to legacy JSON files.", snapshotError);
  }

  const legacyResults = await Promise.allSettled([
    loadJson(leaderboardUrl),
    loadJson(bestlapsUrl),
    loadJson(globalStatsUrl),
    loadJson(safetyUrl),
    loadJson(driverOfDayUrl),
    loadJson(serverStatusUrl),
    loadJson(onlineUrl)
  ]);

  return normalizeLegacyPayload(legacyResults);
}

async function loadRacesData() {
  const data = await loadJson(racesUrl);
  return Array.isArray(data) ? data : [];
}

async function loadCarsData() {
  const data = await loadJson(carsUrl);
  return Array.isArray(data) ? data : [];
}

function getRequestedDriverId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function loadDriverProfile(publicId) {
  if (!publicId) return null;
  const data = await loadJson(`${dataBasePath}drivers/${encodeURIComponent(publicId)}.json`);
  return data && typeof data === "object" ? data : null;
}

function applyStaticTranslations() {
  document.documentElement.lang = t("htmlLang");
  document.title = IS_DRIVER_PAGE
    ? t("pageTitleDriver")
    : IS_CARS_PAGE
      ? t("pageTitleCars")
    : IS_RACES_PAGE
      ? t("pageTitleRaces")
      : t("pageTitle");

  const descriptionMeta = document.querySelector('meta[name="description"]');
  const ogDescriptionMeta = document.querySelector('meta[property="og:description"]');
  const twitterDescriptionMeta = document.querySelector('meta[name="twitter:description"]');
  const ogLocaleMeta = document.querySelector('meta[property="og:locale"]');

  if (!IS_RACES_PAGE) {
    if (descriptionMeta) descriptionMeta.setAttribute("content", t("metaDescription"));
    if (ogDescriptionMeta) ogDescriptionMeta.setAttribute("content", t("ogDescription"));
    if (twitterDescriptionMeta) twitterDescriptionMeta.setAttribute("content", t("twitterDescription"));
    if (ogLocaleMeta) ogLocaleMeta.setAttribute("content", t("ogLocale"));
  }

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    const value = t(key);
    if (value !== undefined) el.innerHTML = value;
  });

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });

  const leaderboardInput = document.getElementById("leaderboard-search");
  const bestlapsInput = document.getElementById("bestlaps-search");
  const safetyInput = document.getElementById("safety-search");

  if (leaderboardInput) leaderboardInput.placeholder = t("leaderboardSearchPlaceholder");
  if (bestlapsInput) bestlapsInput.placeholder = t("bestlapsSearchPlaceholder");
  if (safetyInput) safetyInput.placeholder = t("safetySearchPlaceholder");

  const bestLapNoteEl = document.getElementById("best-lap-note");
  if (bestlapsData.length > 0 && bestLapNoteEl) {
    updateBestLapNote(bestlapsData[0].driver, bestlapsData[0].track, bestlapsData[0].car_name);
  } else if (bestLapNoteEl) {
    bestLapNoteEl.textContent = t("bestLapNoteFallback");
  }

  updateDriverOfDayButtonLabel();
}

function getDriverOfDayName() {
  return driverOfDayData?.driver || "-";
}

function updateDriverOfDayButtonLabel() {
  const btn = document.getElementById("driver-of-day-btn");
  if (!btn) return;

  btn.textContent = replaceTokens(t("driverOfDayBtn"), {
    driver: getDriverOfDayName()
  });
}

function formatAverageFinish(value) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

function formatPercent(value) {
  return typeof value === "number" ? `${value.toFixed(2)}%` : "—";
}

function formatPositionsDelta(value) {
  if (typeof value !== "number") return "-";
  if (value > 0) return `+${value}`;
  return String(value);
}

function formatStartPosition(row) {
  if (typeof row?.start_position === "number") return String(row.start_position);
  return "-";
}

function renderPositionsDelta(value) {
  const formatted = formatPositionsDelta(value);
  let cls = "delta-neutral";
  if (typeof value === "number" && value > 0) cls = "delta-positive";
  if (typeof value === "number" && value < 0) cls = "delta-negative";
  return `<span class="positions-delta ${cls}">${escapeHtml(formatted)}</span>`;
}

function updateBestLapNote(driver, track, carName) {
  const noteEl = document.getElementById("best-lap-note");
  if (!noteEl) return;

  const base = replaceTokens(t("bestLapNoteTemplate"), {
    driver: driver || "Unknown",
    track: track || "Unknown track"
  });
  noteEl.textContent = carName ? `${base} · ${carName}` : base;
}

function renderTop3(data) {
  if (!Array.isArray(data) || !data.length) {
    return `<div class="empty-box">${escapeHtml(t("emptyTop3"))}</div>`;
  }

  const top3 = data.slice(0, 3);
  const classes = ["top1", "top2", "top3"];

  return top3.map((row, index) => `
    <article class="pilot-card ${classes[index] || ""}">
      <div class="pilot-rank">#${escapeHtml(row.rank)}</div>
      <h3 class="pilot-name">${renderDriverLink(row.driver, row.public_id, "driver-link driver-link-heading", row.player_id)}</h3>
      <div class="muted">${escapeHtml(t("metaLabels").bestLap)}: ${escapeHtml(row.best_lap || "-")}</div>
      <div class="pilot-meta">
        <div class="meta-box">
          <div class="meta-label">${escapeHtml(t("metaLabels").points)}</div>
          <div class="meta-value">${escapeHtml(row.points ?? 0)}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">${escapeHtml(t("metaLabels").wins)}</div>
          <div class="meta-value">${escapeHtml(row.wins ?? 0)}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">${escapeHtml(t("metaLabels").races)}</div>
          <div class="meta-value">${escapeHtml(row.races ?? 0)}</div>
        </div>
      </div>
    </article>
  `).join("");
}

function renderTop3Compact(data) {
  if (!Array.isArray(data) || !data.length) {
    return `<div class="empty-box">${escapeHtml(t("emptyTop3"))}</div>`;
  }

  const top3 = data.slice(0, 3);
  const classes = ["top1", "top2", "top3"];

  return top3.map((row, index) => `
    <article class="pilot-card ${classes[index] || ""}">
      <div class="pilot-topline">
        <div class="pilot-rank">#${escapeHtml(row.rank)}</div>
        <h3 class="pilot-name">${renderDriverLink(row.driver, row.public_id, "driver-link driver-link-heading", row.player_id)}</h3>
      </div>
      <div class="muted pilot-lap-line">
        <span>${escapeHtml(t("metaLabels").bestLap)}: ${escapeHtml(row.best_lap || "-")}</span>
        <span class="pilot-lap-car">${escapeHtml(row.best_lap_car_name || "-")}</span>
      </div>
      <div class="pilot-meta">
        <div class="meta-box">
          <div class="meta-label">${escapeHtml(t("metaLabels").points)}</div>
          <div class="meta-value">${escapeHtml(row.points ?? 0)}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">${escapeHtml(t("metaLabels").wins)}</div>
          <div class="meta-value">${escapeHtml(row.wins ?? 0)}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">${escapeHtml(t("metaLabels").races)}</div>
          <div class="meta-value">${escapeHtml(row.races ?? 0)}</div>
        </div>
      </div>
    </article>
  `).join("");
}

function paginate(data, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: data.slice(start, end),
    page: safePage,
    totalPages,
    totalItems: data.length,
    startIndex: data.length ? start + 1 : 0,
    endIndex: Math.min(end, data.length)
  };
}

function getPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

function renderPagination(
  containerId,
  infoId,
  wrapId,
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange
) {
  const container = document.getElementById(containerId);
  const info = document.getElementById(infoId);
  const wrap = document.getElementById(wrapId);

  if (!container || !info || !wrap) return;

  if (totalItems <= PAGE_SIZE) {
    wrap.style.display = "none";
    container.innerHTML = "";
    info.textContent = "";
    return;
  }

  wrap.style.display = "flex";
  info.textContent = replaceTokens(t("paginationShown"), {
    start: startIndex,
    end: endIndex,
    total: totalItems
  });

  const pageList = getPageList(currentPage, totalPages);

  let html = `
    <button class="page-btn" ${currentPage === 1 ? "disabled" : ""} data-page="${currentPage - 1}">
      ${escapeHtml(t("prev"))}
    </button>
  `;

  pageList.forEach(item => {
    if (item === "...") {
      html += `<span class="page-dots">...</span>`;
    } else {
      html += `
        <button class="page-btn ${item === currentPage ? "active" : ""}" data-page="${item}">
          ${item}
        </button>
      `;
    }
  });

  html += `
    <button class="page-btn" ${currentPage === totalPages ? "disabled" : ""} data-page="${currentPage + 1}">
      ${escapeHtml(t("next"))}
    </button>
  `;

  container.innerHTML = html;

  container.querySelectorAll(".page-btn[data-page]").forEach(btn => {
    btn.addEventListener("click", () => {
      const nextPage = Number(btn.dataset.page);
      if (!Number.isNaN(nextPage)) onPageChange(nextPage);
    });
  });
}

function renderLeaderboardHeaders() {
  const cols = t("leaderboardCols");
  return leaderboardColumns.map((col, index) => `
    <th class="sortable ${getSortClass(leaderboardSort, col.key)}" data-sort-key="${escapeHtml(col.key)}">
      ${escapeHtml(cols[index])}
    </th>
  `).join("");
}

function renderBestlapsHeaders() {
  const cols = t("bestlapsCols");
  return bestlapsColumns.map((col, index) => `
    <th class="sortable ${getSortClass(bestlapsSort, col.key)}" data-sort-key="${escapeHtml(col.key)}">
      ${escapeHtml(cols[index])}
    </th>
  `).join("");
}

function bindLeaderboardSortHandlers() {
  document.querySelectorAll("#leaderboard-table th[data-sort-key]").forEach(th => {
    th.addEventListener("click", () => {
      leaderboardSort = cycleSort(leaderboardSort, th.dataset.sortKey);
      leaderboardPage = 1;
      renderLeaderboardTablePage();
    });
  });
}

function bindBestlapsSortHandlers() {
  document.querySelectorAll("#bestlaps-table th[data-sort-key]").forEach(th => {
    th.addEventListener("click", () => {
      bestlapsSort = cycleSort(bestlapsSort, th.dataset.sortKey);
      bestlapsPage = 1;
      renderBestLapsTablePage();
    });
  });
}

function renderLeaderboardTablePage() {
  const result = paginate(getProcessedLeaderboard(), leaderboardPage, PAGE_SIZE);
  leaderboardPage = result.page;

  const tableEl = document.getElementById("leaderboard-table");
  const wrapEl = document.getElementById("leaderboard-pagination-wrap");

  if (!tableEl || !wrapEl) return;

  if (!result.totalItems) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(leaderboardSearch ? t("emptySearch") : t("emptyLeaderboard"))}</div>`;
    wrapEl.style.display = "none";
    return;
  }

  const rows = result.items.map(row => `
    <tr>
      <td><span class="rank-badge rank-${escapeHtml(row.rank)}">#${escapeHtml(row.rank)}</span></td>
      <td>
        <div class="driver-cell">
          <div class="driver-avatar">${escapeHtml(initials(row.driver))}</div>
          <div class="driver-name-wrap">
            <div class="driver-name">${renderDriverLink(row.driver, row.public_id, "driver-link", row.player_id)}</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(row.points ?? 0)}</td>
      <td>${escapeHtml(row.wins ?? 0)}</td>
      <td>${escapeHtml(row.podiums ?? 0)}</td>
      <td>${escapeHtml(row.races ?? 0)}</td>
      <td>${escapeHtml(row.average_finish ?? "-")}</td>
      <td>${escapeHtml(row.best_lap ?? "-")}</td>
      <td>${escapeHtml(row.best_lap_car_name ?? "-")}</td>
      <td>${sessionLabel(row.best_lap_session_type)}</td>
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table>
      <thead>
        <tr>${renderLeaderboardHeaders()}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  bindLeaderboardSortHandlers();

  renderPagination(
    "leaderboard-pagination",
    "leaderboard-pagination-info",
    "leaderboard-pagination-wrap",
    result.page,
    result.totalPages,
    result.totalItems,
    result.startIndex,
    result.endIndex,
    (page) => {
      leaderboardPage = page;
      renderLeaderboardTablePage();
      document.getElementById("championship")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  );
}

function renderBestLapsTablePage() {
  const result = paginate(getProcessedBestlaps(), bestlapsPage, PAGE_SIZE);
  bestlapsPage = result.page;

  const tableEl = document.getElementById("bestlaps-table");
  const wrapEl = document.getElementById("bestlaps-pagination-wrap");

  if (!tableEl || !wrapEl) return;

  if (!result.totalItems) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(bestlapsSearch ? t("emptySearch") : t("emptyBestLaps"))}</div>`;
    wrapEl.style.display = "none";
    return;
  }

  const rows = result.items.map(row => `
    <tr>
      <td><span class="rank-badge rank-${escapeHtml(row.rank)}">#${escapeHtml(row.rank)}</span></td>
      <td>
        <div class="driver-cell">
          <div class="driver-avatar">${escapeHtml(initials(row.driver))}</div>
          <div class="driver-name-wrap">
            <div class="driver-name">${renderDriverLink(row.driver, row.public_id, "driver-link", row.player_id)}</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(row.best_lap ?? "-")}</td>
      <td>${escapeHtml(row.car_name ?? "-")}</td>
      <td>${sessionLabel(row.session_type)}</td>
      <td>${escapeHtml(row.updated_at ?? "-")}</td>
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table>
      <thead>
        <tr>${renderBestlapsHeaders()}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  bindBestlapsSortHandlers();

  renderPagination(
    "bestlaps-pagination",
    "bestlaps-pagination-info",
    "bestlaps-pagination-wrap",
    result.page,
    result.totalPages,
    result.totalItems,
    result.startIndex,
    result.endIndex,
    (page) => {
      bestlapsPage = page;
      renderBestLapsTablePage();
      document.getElementById("bestlaps")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  );
}

function renderSafetyHeaders() {
  const columns = getSafetyColumns();
  return columns.map(col => `
    <th class="sortable ${getSortClass(safetySort, col.key)}" data-sort-key="${escapeHtml(col.key)}">
      ${escapeHtml(col.label)}
    </th>
  `).join("");
}

function bindSafetySortHandlers() {
  document.querySelectorAll("#safety-table th[data-sort-key]").forEach(th => {
    th.addEventListener("click", () => {
      safetySort = cycleSort(safetySort, th.dataset.sortKey);
      safetyPage = 1;
      renderSafetyTablePage();
    });
  });
}

function renderSafetyPenaltyBreakdown(row) {
  const penalties = row?.penalties && typeof row.penalties === "object" ? row.penalties : {};
  const columns = getSafetyColumns().filter(col => col.key.startsWith("penalties."));
  return columns.map(col => {
    const key = col.key.replace("penalties.", "");
    return `<td>${escapeHtml(penalties[key] ?? 0)}</td>`;
  }).join("");
}

function renderSafetyTablePage() {
  const result = paginate(getProcessedSafety(), safetyPage, PAGE_SIZE);
  safetyPage = result.page;

  const tableEl = document.getElementById("safety-table");
  const wrapEl = document.getElementById("safety-pagination-wrap");

  if (!tableEl || !wrapEl) return;

  if (!result.totalItems) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(safetySearch ? t("emptySearch") : t("errorLoading"))}</div>`;
    wrapEl.style.display = "none";
    return;
  }

  const rows = result.items.map(row => `
    <tr>
      <td><span class="rank-badge rank-${escapeHtml(row.rank)}">#${escapeHtml(row.rank)}</span></td>
      <td>
        <div class="driver-cell">
          <div class="driver-avatar">${escapeHtml(initials(row.driver))}</div>
          <div class="driver-name-wrap">
            <div class="driver-name">${renderDriverLink(row.driver, row.public_id, "driver-link", row.player_id)}</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(row.penalty_count ?? 0)}</td>
      <td>${escapeHtml(row.penalty_points ?? 0)}</td>
      ${renderSafetyPenaltyBreakdown(row)}
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table class="safety-table-dynamic">
      <thead>
        <tr>${renderSafetyHeaders()}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  bindSafetySortHandlers();

  renderPagination(
    "safety-pagination",
    "safety-pagination-info",
    "safety-pagination-wrap",
    result.page,
    result.totalPages,
    result.totalItems,
    result.startIndex,
    result.endIndex,
    (page) => {
      safetyPage = page;
      renderSafetyTablePage();
      document.getElementById("worst-safety")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  );
}

function bindLanguageButtons() {
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      if (!translations[lang] || lang === currentLang) return;
      currentLang = lang;
      localStorage.setItem("asgLang", currentLang);
      rerenderUI();
    });
  });
}

function bindSearchInputs() {
  const leaderboardInput = document.getElementById("leaderboard-search");
  const bestlapsInput = document.getElementById("bestlaps-search");
  const safetyInput = document.getElementById("safety-search");
  const handleLeaderboardInput = debounce((value) => {
    leaderboardSearch = value || "";
    leaderboardPage = 1;
    renderLeaderboardTablePage();
  });
  const handleBestlapsInput = debounce((value) => {
    bestlapsSearch = value || "";
    bestlapsPage = 1;
    renderBestLapsTablePage();
  });
  const handleSafetyInput = debounce((value) => {
    safetySearch = value || "";
    safetyPage = 1;
    renderSafetyTablePage();
  });

  if (leaderboardInput) {
    leaderboardInput.addEventListener("input", (e) => {
      handleLeaderboardInput(e.target.value);
    });
  }

  if (bestlapsInput) {
    bestlapsInput.addEventListener("input", (e) => {
      handleBestlapsInput(e.target.value);
    });
  }

  if (safetyInput) {
    safetyInput.addEventListener("input", (e) => {
      handleSafetyInput(e.target.value);
    });
  }
}

function formatDateTimeLocal(isoString, lang = "en") {
  if (!isoString) return "-";

  const locale = lang === "ru" ? "ru-RU" : "en-GB";
  const date = new Date(isoString);

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getCurrentLangSafe() {
  if (typeof currentLang !== "undefined") return currentLang;
  return document.documentElement.lang === "ru" ? "ru" : "en";
}

function findDriverNameByPlayerId(playerId) {
  if (!playerId) return null;

  if (
    todayStatsData?.most_successful_driver_today?.player_id === playerId &&
    todayStatsData?.most_successful_driver_today?.driver
  ) {
    return todayStatsData.most_successful_driver_today.driver;
  }

  if (Array.isArray(leaderboardData)) {
    const found = leaderboardData.find(item => item.player_id === playerId || item.playerId === playerId);
    if (found) return found.driver || found.name || found.player || null;
  }

  return null;
}

function findPublicIdByPlayerId(playerId) {
  if (!playerId) return null;

  if (
    todayStatsData?.most_successful_driver_today?.player_id === playerId &&
    todayStatsData?.most_successful_driver_today?.public_id
  ) {
    return todayStatsData.most_successful_driver_today.public_id;
  }

  if (Array.isArray(leaderboardData)) {
    const found = leaderboardData.find(item => item.player_id === playerId || item.playerId === playerId);
    if (found) return found.public_id || makePublicDriverId(playerId);
  }

  if (Array.isArray(driverIndexData)) {
    const found = driverIndexData.find(item => item.player_id === playerId);
    if (found) return found.public_id || makePublicDriverId(playerId);
  }

  return makePublicDriverId(playerId);
}

function humanizeTrackName(track) {
  if (!track) return "-";
  return String(track)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function getProcessedRaces() {
  return sortData(racesData, { key: "finished_at", direction: "desc" }, racesColumns);
}

function renderRacesSummary() {
  const totalEl = document.getElementById("races-total-count");
  const trackEl = document.getElementById("races-latest-track");
  const winnerEl = document.getElementById("races-latest-winner");
  if (!totalEl || !trackEl || !winnerEl) return;

  const latestRace = getProcessedRaces()[0];
  totalEl.textContent = racesData.length || "-";
  trackEl.textContent = latestRace ? humanizeTrackName(latestRace.track) : "-";
  winnerEl.innerHTML = latestRace
    ? renderDriverLink(latestRace.winner || t("noWinner"), latestRace.winner_public_id, "driver-link")
    : t("noWinner");
}

function renderRacesTable() {
  const tableEl = document.getElementById("races-table");
  if (!tableEl) return;

  const races = getProcessedRaces();
  if (!races.length) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("emptyRaces"))}</div>`;
    return;
  }

  const headers = t("racesCols").map(label => `<th>${escapeHtml(label)}</th>`).join("");
  const rows = races.map((race, index) => `
    <tr data-race-index="${escapeHtml(index)}">
      <td>${escapeHtml(formatDateTimeLocal(race.finished_at, currentLang))}</td>
      <td>
        <div class="race-track-cell">
          <span class="race-track-name">${escapeHtml(humanizeTrackName(race.track))}</span>
          
        </div>
      </td>
      <td><span class="race-winner">${renderDriverLink(race.winner || t("noWinner"), race.winner_public_id, "driver-link")}</span></td>
      <td>${escapeHtml(race.participants_count ?? "-")}</td>
      <td>
        <div>${escapeHtml(race.best_lap || "-")}</div>
        <div class="race-note">${renderDriverLink(race.best_lap_driver || "-", race.best_lap_public_id, "driver-link driver-link-subtle")}</div>
      </td>
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table class="races-table">
      <thead>
        <tr>${headers}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  tableEl.querySelectorAll("tbody tr[data-race-index]").forEach(row => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        return;
      }
      const index = Number(row.dataset.raceIndex);
      openRaceResultsModal(races[index] || null);
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
    titleEl.textContent = "-";
    subtitleEl.textContent = "-";
    summaryEl.innerHTML = "";
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("emptyRaces"))}</div>`;
    return;
  }

  titleEl.textContent = humanizeTrackName(selectedRace.track);
  subtitleEl.textContent = formatDateTimeLocal(selectedRace.finished_at, currentLang);

  summaryEl.innerHTML = `
    <div class="race-summary-card">
      <div class="race-summary-label">${escapeHtml(t("raceSummaryTrack"))}</div>
      <div class="race-summary-value">${escapeHtml(humanizeTrackName(selectedRace.track))}</div>
    </div>
    <div class="race-summary-card">
      <div class="race-summary-label">${escapeHtml(t("raceSummaryWinner"))}</div>
      <div class="race-summary-value">${renderDriverLink(selectedRace.winner || t("noWinner"), selectedRace.winner_public_id, "driver-link")}</div>
    </div>
    <div class="race-summary-card">
      <div class="race-summary-label">${escapeHtml(t("raceSummaryDrivers"))}</div>
      <div class="race-summary-value">${escapeHtml(selectedRace.participants_count ?? "-")}</div>
    </div>
    <div class="race-summary-card">
      <div class="race-summary-label">${escapeHtml(t("raceSummaryBestLap"))}</div>
      <div class="race-summary-value">${escapeHtml(selectedRace.best_lap || "-")}</div>
    </div>
  `;

  const headers = t("raceModalCols").map(label => `<th>${escapeHtml(label)}</th>`).join("");
  const rows = (selectedRace.results || []).map(row => `
    <tr>
      <td><span class="rank-badge rank-${escapeHtml(row.position)}">#${escapeHtml(row.position)}</span></td>
      <td>${escapeHtml(formatStartPosition(row))}</td>
      <td>${renderPositionsDelta(row.positions_delta)}</td>
      <td>
        <div class="driver-cell">
          <div class="driver-avatar">${escapeHtml(initials(row.driver))}</div>
          <div class="driver-name-wrap">
            <div class="driver-name">${renderDriverLink(row.driver, row.public_id, "driver-link", row.player_id)}</div>
            <div class="race-note">${escapeHtml(row.race_number != null ? `#${row.race_number}` : "")}</div>
          </div>
        </div>
      </td>
      <td>
        <div>${escapeHtml(row.best_lap || "-")}</div>
        <div class="race-note">${row.had_best_lap ? escapeHtml(t("raceBestLapBadge")) : ""}</div>
      </td>
      <td>${escapeHtml(row.total_time || "-")}</td>
      <td>${escapeHtml(row.gap || (row.position === 1 ? "-" : "-"))}</td>
      <td>${escapeHtml(row.points ?? 0)}</td>
      <td>${escapeHtml(row.penalty_count ?? 0)}</td>
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table>
      <thead>
        <tr>${headers}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function openRaceResultsModal(race) {
  const modal = document.getElementById("race-results-modal");
  if (!modal || !race) return;

  selectedRace = race;
  renderRaceResultsModal();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeRaceResultsModal() {
  const modal = document.getElementById("race-results-modal");
  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function initRaceResultsModal() {
  const modal = document.getElementById("race-results-modal");
  const closeBtn = document.getElementById("race-results-close");
  if (!modal || !closeBtn) return;

  closeBtn.addEventListener("click", closeRaceResultsModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeRaceResultsModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeRaceResultsModal();
    }
  });
}

function renderRacesPage() {
  renderRacesSummary();
  renderRacesTable();
  renderRaceResultsModal();
}

function renderCarsSummary() {
  const totalEl = document.getElementById("cars-total-count");
  const winnerEl = document.getElementById("cars-top-winner");
  const usedEl = document.getElementById("cars-most-used");
  if (!totalEl || !winnerEl || !usedEl) return;

  totalEl.textContent = carsData.length || "—";
  const topWinner = carsData[0] || null;
  const mostUsed = [...carsData].sort((a, b) => {
    const racesDiff = (b?.races ?? 0) - (a?.races ?? 0);
    if (racesDiff !== 0) return racesDiff;
    return String(a?.car_name || "").localeCompare(String(b?.car_name || ""));
  })[0] || null;

  winnerEl.textContent = topWinner ? topWinner.car_name : "—";
  usedEl.textContent = mostUsed ? mostUsed.car_name : "—";
}

function renderCarsTable() {
  const tableEl = document.getElementById("cars-table");
  if (!tableEl) return;

  if (!carsData.length) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("emptyRaces"))}</div>`;
    return;
  }

  const headers = t("carsCols").map(label => `<th>${escapeHtml(label)}</th>`).join("");
  const rows = carsData.map(row => `
    <tr>
      <td>${escapeHtml(row.car_name || "—")}</td>
      <td>${escapeHtml(row.races ?? 0)}</td>
      <td>${escapeHtml(row.wins ?? 0)}</td>
      <td>${escapeHtml(formatPercent(row.win_rate))}</td>
      <td>${escapeHtml(row.podiums ?? 0)}</td>
      <td>${escapeHtml(row.unique_drivers ?? 0)}</td>
      <td>${escapeHtml(formatAverageFinish(row.average_finish))}</td>
      <td>${escapeHtml(row.fastest_lap_awards ?? 0)}</td>
      <td>
        <div>${escapeHtml(row.best_lap || "—")}</div>
        <div class="race-note">${renderDriverLink(row.best_lap_driver || "—", row.best_lap_public_id, "driver-link driver-link-subtle")}</div>
      </td>
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table>
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderCarsPage() {
  renderCarsSummary();
  renderCarsTable();
}

function renderCarsTable() {
  const tableEl = document.getElementById("cars-table");
  if (!tableEl) return;

  const rowsData = getProcessedCars();

  if (!rowsData.length) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("emptyRaces"))}</div>`;
    return;
  }

  const headers = t("carsCols").map((label, index) => `
    <th class="sortable ${getSortClass(carsSort, carsColumns[index].key)}" data-sort-key="${carsColumns[index].key}">
      ${escapeHtml(label)}
    </th>
  `).join("");

  const rows = rowsData.map(row => `
    <tr>
      <td>${escapeHtml(row.car_name || "—")}</td>
      <td>${escapeHtml(row.races ?? 0)}</td>
      <td>${escapeHtml(row.wins ?? 0)}</td>
      <td>${escapeHtml(formatPercent(row.win_rate))}</td>
      <td>${escapeHtml(row.podiums ?? 0)}</td>
      <td>${escapeHtml(row.unique_drivers ?? 0)}</td>
      <td>${escapeHtml(formatAverageFinish(row.average_finish))}</td>
      <td>${escapeHtml(row.fastest_lap_awards ?? 0)}</td>
      <td>
        <div>${escapeHtml(row.best_lap || "—")}</div>
        <div class="race-note">${renderDriverLink(row.best_lap_driver || "—", row.best_lap_public_id, "driver-link driver-link-subtle")}</div>
      </td>
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table>
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  tableEl.querySelectorAll("th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      carsSort = cycleSort(carsSort, th.dataset.sortKey);
      renderCarsTable();
    });
  });
}

function renderRecentForm(items = []) {
  if (!Array.isArray(items) || !items.length) return `<span class="empty-inline">-</span>`;
  return items.map(item => `<span class="form-pill">${escapeHtml(item)}</span>`).join("");
}

function renderDriverRaceHistory() {
  const tableEl = document.getElementById("driver-races-table");
  if (!tableEl) return;

  const rowsData = Array.isArray(driverProfileData?.race_history) ? driverProfileData.race_history : [];
  if (!rowsData.length) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("driverNoData"))}</div>`;
    return;
  }

  const headers = t("driverRaceCols").map(label => `<th>${escapeHtml(label)}</th>`).join("");
  const rows = rowsData.map(row => `
    <tr>
      <td>${escapeHtml(formatDateTimeLocal(row.finished_at, currentLang))}</td>
      <td>${escapeHtml(humanizeTrackName(row.track))}</td>
      <td>${escapeHtml(formatStartPosition(row))}</td>
      <td>${escapeHtml(row.position ?? "-")}</td>
      <td>${renderPositionsDelta(row.positions_delta)}</td>
      <td>${escapeHtml(row.points ?? 0)}</td>
      <td>${escapeHtml(row.best_lap ?? "-")}</td>
      <td>${escapeHtml(row.total_time ?? "-")}</td>
      <td>${escapeHtml(row.gap ?? "-")}</td>
      <td>${escapeHtml(row.penalty_points ?? 0)}</td>
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table>
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderDriverTrackStats() {
  const tableEl = document.getElementById("driver-tracks-table");
  if (!tableEl) return;

  const rowsData = Array.isArray(driverProfileData?.track_stats) ? driverProfileData.track_stats : [];
  if (!rowsData.length) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("driverNoData"))}</div>`;
    return;
  }

  const headers = t("driverTrackCols").map(label => `<th>${escapeHtml(label)}</th>`).join("");
  const rows = rowsData.map(row => `
    <tr>
      <td>${escapeHtml(humanizeTrackName(row.track))}</td>
      <td>${escapeHtml(row.races ?? 0)}</td>
      <td>${escapeHtml(row.wins ?? 0)}</td>
      <td>${escapeHtml(row.podiums ?? 0)}</td>
      <td>${escapeHtml(row.points ?? 0)}</td>
      <td>${escapeHtml(row.average_finish ?? "-")}</td>
      <td>${escapeHtml(row.best_lap ?? "-")}</td>
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table>
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderPenaltyList(containerId, entries, labelKey) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const items = Object.entries(entries || {}).sort((a, b) => b[1] - a[1]);
  if (!items.length) {
    el.innerHTML = `<div class="empty-box">-</div>`;
    return;
  }

  el.innerHTML = items.map(([name, value]) => `
    <div class="penalty-item">
      <span class="penalty-name">${escapeHtml(name)}</span>
      <span class="penalty-value">${escapeHtml(value)}</span>
    </div>
  `).join("");
}

function renderDriverPage() {
  const nameEl = document.getElementById("driver-page-name");
  const subtitleEl = document.getElementById("driver-page-subtitle");
  const statsEl = document.getElementById("driver-stat-cards");
  const highlightsEl = document.getElementById("driver-highlights");
  if (!nameEl || !subtitleEl || !statsEl || !highlightsEl) return;

  if (!driverProfileData) {
    nameEl.textContent = "-";
    subtitleEl.textContent = t("driverNoData");
    statsEl.innerHTML = `<div class="empty-box">${escapeHtml(t("driverNoData"))}</div>`;
    highlightsEl.innerHTML = "";
    renderDriverRaceHistory();
    renderDriverTrackStats();
    renderPenaltyList("driver-penalty-reasons", {}, "driverPenaltyReason");
    renderPenaltyList("driver-penalty-types", {}, "driverPenaltyType");
    return;
  }

  const summary = driverProfileData.summary || {};
  document.title = `${driverProfileData.driver} | ${t("pageTitleDriver")}`;
  nameEl.textContent = driverProfileData.driver || "-";
  subtitleEl.textContent = t("driverPageSubtitle");

  statsEl.innerHTML = `
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryPoints"))}</div>
      <div class="driver-stat-value">${escapeHtml(summary.points ?? 0)}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryAvgPoints"))}</div>
      <div class="driver-stat-value">${escapeHtml(summary.average_points_per_race ?? 0)}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryAvgGain"))}</div>
      <div class="driver-stat-value">${renderPositionsDelta(summary.average_positions_delta)}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryRaces"))}</div>
      <div class="driver-stat-value">${escapeHtml(summary.races ?? 0)}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryWins"))}</div>
      <div class="driver-stat-value">${escapeHtml(summary.wins ?? 0)}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryAvgFinish"))}</div>
      <div class="driver-stat-value">${escapeHtml(summary.average_finish ?? "-")}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryBestLap"))}</div>
      <div class="driver-stat-value">${escapeHtml(summary.best_lap ?? "-")}</div>
      <div class="driver-stat-note">${escapeHtml(humanizeTrackName(summary.best_lap_track))}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryPenaltyPoints"))}</div>
      <div class="driver-stat-value">${escapeHtml(summary.penalty_points ?? 0)}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryFastestLaps"))}</div>
      <div class="driver-stat-value">${escapeHtml(summary.fastest_lap_awards ?? 0)}</div>
    </div>
  `;

  highlightsEl.innerHTML = `
    <div class="driver-highlight-card">
      <div class="driver-highlight-label">${escapeHtml(t("driverRecentForm"))}</div>
      <div class="driver-highlight-value">${renderRecentForm(driverProfileData.recent_form)}</div>
    </div>
    <div class="driver-highlight-card">
      <div class="driver-highlight-label">${escapeHtml(t("driverMostRacedTrack"))}</div>
      <div class="driver-highlight-value">${escapeHtml(humanizeTrackName(summary.most_raced_track))}</div>
    </div>
    <div class="driver-highlight-card">
      <div class="driver-highlight-label">${escapeHtml(t("driverWinRate"))}</div>
      <div class="driver-highlight-value">${escapeHtml(summary.win_rate ?? 0)}%</div>
    </div>
    <div class="driver-highlight-card">
      <div class="driver-highlight-label">${escapeHtml(t("driverPodiumRate"))}</div>
      <div class="driver-highlight-value">${escapeHtml(summary.podium_rate ?? 0)}%</div>
    </div>
  `;

  renderDriverRaceHistory();
  renderDriverTrackStats();
  renderPenaltyList("driver-penalty-reasons", driverProfileData.penalties?.reasons, "driverPenaltyReason");
  renderPenaltyList("driver-penalty-types", driverProfileData.penalties?.types, "driverPenaltyType");
}

function renderTodayStatsModal() {
  const lang = getCurrentLangSafe();
  const stats = todayStatsData;

  const uniquePlayersEl = document.getElementById("today-unique-players");
  const racesEl = document.getElementById("today-races");
  const sessionsEl = document.getElementById("today-sessions");
  const pointsEl = document.getElementById("today-points");
  const winsEl = document.getElementById("today-wins");
  const podiumsEl = document.getElementById("today-podiums");
  const avgPlayersEl = document.getElementById("today-avg-players");
  const tracksEl = document.getElementById("today-tracks");
  const bestLapEl = document.getElementById("today-best-lap");
  const bestLapNoteEl = document.getElementById("today-best-lap-note");
  const mostActiveEl = document.getElementById("today-most-active");
  const mostActiveNoteEl = document.getElementById("today-most-active-note");
  const mostSuccessfulEl = document.getElementById("today-most-successful");
  const mostSuccessfulNoteEl = document.getElementById("today-most-successful-note");
  const updatedEl = document.getElementById("today-stats-updated");

  if (!uniquePlayersEl) return;

  if (!stats) {
    uniquePlayersEl.textContent = "-";
    racesEl.textContent = "-";
    sessionsEl.textContent = "-";
    pointsEl.textContent = "-";
    winsEl.textContent = "-";
    podiumsEl.textContent = "-";
    avgPlayersEl.textContent = "-";
    tracksEl.textContent = "-";
    bestLapEl.innerHTML = `<span>-</span><span class="today-detail-side-inline">-</span>`;
    bestLapNoteEl.textContent = "-";
    mostActiveEl.textContent = "-";
    mostActiveNoteEl.textContent = "-";
    mostSuccessfulEl.textContent = "-";
    mostSuccessfulNoteEl.textContent = "-";
    updatedEl.textContent = "-";
    return;
  }

  uniquePlayersEl.textContent = stats.unique_players_today ?? "-";
  racesEl.textContent = stats.races_today ?? "-";
  sessionsEl.textContent = stats.sessions_today ?? "-";
  pointsEl.textContent = stats.points_earned_today ?? "-";
  winsEl.textContent = stats.wins_today ?? "-";
  podiumsEl.textContent = stats.podiums_today ?? "-";
  avgPlayersEl.textContent =
    typeof stats.avg_players_per_race_today === "number"
      ? stats.avg_players_per_race_today.toFixed(2)
      : "-";

  tracksEl.textContent =
    Array.isArray(stats.tracks_raced_today) && stats.tracks_raced_today.length
      ? stats.tracks_raced_today.join(", ")
      : "-";

  bestLapEl.innerHTML = `<span>${escapeHtml(stats.best_lap_today?.lap || "-")}</span><span class="today-detail-side-inline">${escapeHtml(stats.best_lap_today?.car_name || "-")}</span>`;
  bestLapNoteEl.textContent = stats.best_lap_today
    ? `${stats.best_lap_today.driver} · ${stats.best_lap_today.track}`
    : "-";

  const mostActiveName =
    findDriverNameByPlayerId(stats.most_active_driver_today?.player_id) ||
    stats.most_active_driver_today?.player_id ||
    "-";

  mostActiveEl.textContent = mostActiveName;
  mostActiveNoteEl.textContent =
    stats.most_active_driver_today?.races != null
      ? (lang === "ru"
          ? `Гонок за сегодня: ${stats.most_active_driver_today.races}`
          : `Races today: ${stats.most_active_driver_today.races}`)
      : "-";

  mostSuccessfulEl.textContent = stats.most_successful_driver_today?.driver || "-";
  mostSuccessfulNoteEl.textContent =
    stats.most_successful_driver_today?.points != null
      ? (lang === "ru"
          ? `Очков за сегодня: ${stats.most_successful_driver_today.points}`
          : `Points today: ${stats.most_successful_driver_today.points}`)
      : "-";

  updatedEl.textContent =
    lang === "ru"
      ? `Обновлено: ${formatDateTimeLocal(stats.updated_at, "ru")}`
      : `Updated: ${formatDateTimeLocal(stats.updated_at, "en")}`;
}

function renderDriverOfDayModal() {
  const data = driverOfDayData;
  const contentEl = document.getElementById("driver-of-day-content");
  let avgGainCard = document.getElementById("driver-of-day-avg-gain")?.closest(".today-stat-card");
  if (contentEl && !avgGainCard) {
    const card = document.createElement("div");
    card.className = "today-stat-card driver-day-card";
    card.innerHTML = `
      <div class="today-stat-label">${escapeHtml(t("driverOfDayAvgGain"))}</div>
      <div class="today-stat-value" id="driver-of-day-avg-gain">-</div>
    `;
    const bestLapCard = document.getElementById("driver-of-day-best-lap")?.closest(".today-stat-card");
    if (bestLapCard) {
      contentEl.insertBefore(card, bestLapCard);
    } else {
      contentEl.appendChild(card);
    }
    avgGainCard = card;
  }
  if (avgGainCard) {
    const labelEl = avgGainCard.querySelector(".today-stat-label");
    if (labelEl) labelEl.textContent = t("driverOfDayAvgGain");
  }

  const nameEl = document.getElementById("driver-of-day-name");
  const pointsEl = document.getElementById("driver-of-day-points");
  const racesEl = document.getElementById("driver-of-day-races");
  const winsEl = document.getElementById("driver-of-day-wins");
  const avgFinishEl = document.getElementById("driver-of-day-avg-finish");
  const avgGainEl = document.getElementById("driver-of-day-avg-gain");
  const bestLapEl = document.getElementById("driver-of-day-best-lap");
  const bestLapTrackEl = document.getElementById("driver-of-day-best-lap-track");
  const updatedEl = document.getElementById("driver-of-day-updated");
  const emptyEl = document.getElementById("driver-of-day-empty");

  if (!nameEl) return;

  if (!data || !data.driver) {
    nameEl.textContent = "-";
    pointsEl.textContent = "-";
    racesEl.textContent = "-";
    winsEl.textContent = "-";
    avgFinishEl.textContent = "-";
    avgGainEl.textContent = "-";
    avgGainEl.classList.remove("delta-positive", "delta-negative");
    avgGainEl.classList.add("positions-delta", "delta-neutral");
    bestLapEl.textContent = "-";
    bestLapTrackEl.textContent = "-";
    updatedEl.textContent = "-";
    if (emptyEl) emptyEl.textContent = t("driverOfDayNoData");
    if (emptyEl) emptyEl.hidden = false;
    if (contentEl) contentEl.classList.add("is-empty");
    return;
  }

  nameEl.textContent = data.driver || "-";
  pointsEl.textContent = data.points ?? 0;
  racesEl.textContent = data.races ?? 0;
  winsEl.textContent = data.wins ?? 0;
  avgFinishEl.textContent = formatAverageFinish(data.average_finish);
  avgGainEl.textContent = formatPositionsDelta(data.average_positions_delta);
  avgGainEl.classList.remove("delta-positive", "delta-negative", "delta-neutral");
  avgGainEl.classList.add("positions-delta");
  if (typeof data.average_positions_delta === "number" && data.average_positions_delta > 0) {
    avgGainEl.classList.add("delta-positive");
  } else if (typeof data.average_positions_delta === "number" && data.average_positions_delta < 0) {
    avgGainEl.classList.add("delta-negative");
  } else {
    avgGainEl.classList.add("delta-neutral");
  }
  bestLapEl.textContent = data.best_lap || "-";
  bestLapTrackEl.textContent = data.best_lap_track || "-";
  updatedEl.textContent = currentLang === "ru"
    ? `Обновлено: ${formatDateTimeLocal(data.updated_at, "ru")}`
    : `Updated: ${formatDateTimeLocal(data.updated_at, "en")}`;

  if (emptyEl) emptyEl.hidden = true;
  if (contentEl) contentEl.classList.remove("is-empty");
}

function openDriverOfDayModal() {
  const modal = document.getElementById("driver-of-day-modal");
  if (!modal) return;

  renderDriverOfDayModal();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeDriverOfDayModal() {
  const modal = document.getElementById("driver-of-day-modal");
  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function initDriverOfDayModal() {
  const openBtn = document.getElementById("driver-of-day-btn");
  const closeBtn = document.getElementById("driver-of-day-close");
  const modal = document.getElementById("driver-of-day-modal");

  if (!openBtn || !closeBtn || !modal) return;

  openBtn.addEventListener("click", openDriverOfDayModal);
  closeBtn.addEventListener("click", closeDriverOfDayModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeDriverOfDayModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeDriverOfDayModal();
    }
  });
}

function openTodayStatsModal() {
  const modal = document.getElementById("today-stats-modal");
  if (!modal) return;

  renderTodayStatsModal();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeTodayStatsModal() {
  const modal = document.getElementById("today-stats-modal");
  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function initTodayStatsModal() {
  const openBtn = document.getElementById("today-stats-btn");
  const closeBtn = document.getElementById("today-stats-close");
  const modal = document.getElementById("today-stats-modal");

  if (!openBtn || !closeBtn || !modal) return;

  openBtn.addEventListener("click", openTodayStatsModal);
  closeBtn.addEventListener("click", closeTodayStatsModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeTodayStatsModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeTodayStatsModal();
    }
  });
}

function rerenderUI() {
  applyStaticTranslations();

  if (IS_DRIVER_PAGE) {
    renderDriverPage();
    return;
  }

  if (IS_CARS_PAGE) {
    renderCarsPage();
    return;
  }

  if (IS_RACES_PAGE) {
    renderRacesPage();
    return;
  }

  const top3El = document.getElementById("top3-content");
  if (top3El) top3El.innerHTML = renderTop3Compact(leaderboardData);

  renderLeaderboardTablePage();
  renderBestLapsTablePage();
  renderSafetyTablePage();
  renderTodayStatsModal();
  renderDriverOfDayModal();
  renderOnlineWidget();
}

async function init() {
  const top3Content = document.getElementById("top3-content");
  bindLanguageButtons();
  if (IS_RACES_PAGE) {
    initRaceResultsModal();
  } else if (!IS_DRIVER_PAGE && !IS_CARS_PAGE) {
    bindSearchInputs();
    initTodayStatsModal();
    initDriverOfDayModal();
  }
  applyStaticTranslations();

  try {
    if (IS_DRIVER_PAGE) {
      driverProfileData = await loadDriverProfile(getRequestedDriverId());
      rerenderUI();
      return;
    }

    if (IS_CARS_PAGE) {
      carsData = await loadCarsData();
      rerenderUI();
      return;
    }

    if (IS_RACES_PAGE) {
      racesData = await loadRacesData();
      rerenderUI();
      return;
    }

    const data = await loadSiteData();

    leaderboardData = data.leaderboard;
    bestlapsData = data.bestlaps;
    todayStatsData = data.globalStats;
    safetyData = data.safety;
    driverOfDayData = data.driverOfDay;
    onlineData = data.online;

    const driversCountEl = document.getElementById("drivers-count");
    if (driversCountEl) {
      driversCountEl.textContent = leaderboardData.length;
    }

    const bestLapHighlightEl = document.getElementById("best-lap-highlight");
    const bestLapNoteEl = document.getElementById("best-lap-note");

    if (bestlapsData.length > 0) {
      if (bestLapHighlightEl) {
        bestLapHighlightEl.textContent = bestlapsData[0].best_lap || "-";
      }
      updateBestLapNote(bestlapsData[0].driver, bestlapsData[0].track, bestlapsData[0].car_name);
    } else {
      if (bestLapHighlightEl) {
        bestLapHighlightEl.textContent = "-";
      }
      if (bestLapNoteEl) {
        bestLapNoteEl.textContent = t("bestLapNoteFallback");
      }
    }

    const serverStatusEl = document.getElementById("serverStatusValue");
    const serverPlayersEl = document.getElementById("serverPlayersValue");

    if (serverStatusEl && serverPlayersEl) {
      const status =
        data.serverStatus && typeof data.serverStatus === "object"
          ? String(data.serverStatus.status || "offline").toLowerCase()
          : "offline";

      const players =
        data.serverStatus && Number.isFinite(data.serverStatus.players_online)
          ? data.serverStatus.players_online
          : 0;

      serverStatusEl.textContent = status.toUpperCase();
      serverPlayersEl.textContent = players;

      serverStatusEl.classList.remove("online", "offline", "degraded");
      serverStatusEl.classList.add(
        status === "online" ? "online" : status === "online_process_only" ? "degraded" : "offline"
      );
    }

    rerenderUI();
  } catch (error) {
    console.error(error);

    if (IS_DRIVER_PAGE) {
      const statsEl = document.getElementById("driver-stat-cards");
      const nameEl = document.getElementById("driver-page-name");
      const subtitleEl = document.getElementById("driver-page-subtitle");
      if (nameEl) nameEl.textContent = "-";
      if (subtitleEl) subtitleEl.textContent = t("driverNoData");
      if (statsEl) statsEl.innerHTML = `<div class="empty-box">${escapeHtml(t("driverNoData"))}</div>`;
      return;
    }

    if (IS_RACES_PAGE) {
      const racesTableEl = document.getElementById("races-table");
      if (racesTableEl) {
        racesTableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("errorLoading"))}</div>`;
      }
      return;
    }

    if (IS_CARS_PAGE) {
      const carsTableEl = document.getElementById("cars-table");
      if (carsTableEl) {
        carsTableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("errorLoading"))}</div>`;
      }
      return;
    }

    if (top3Content) {
      top3Content.innerHTML = `<div class="empty-box">${escapeHtml(t("errorLoading"))}</div>`;
    }

    const leaderboardTableEl = document.getElementById("leaderboard-table");
    const bestlapsTableEl = document.getElementById("bestlaps-table");
    const safetyTableEl = document.getElementById("safety-table");
    const leaderboardWrapEl = document.getElementById("leaderboard-pagination-wrap");
    const bestlapsWrapEl = document.getElementById("bestlaps-pagination-wrap");
    const safetyWrapEl = document.getElementById("safety-pagination-wrap");

    if (leaderboardTableEl) {
      leaderboardTableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("errorLeaderboard"))}</div>`;
    }
    if (bestlapsTableEl) {
      bestlapsTableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("errorBestlaps"))}</div>`;
    }
    if (safetyTableEl) {
      safetyTableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("errorLoading"))}</div>`;
    }
    if (leaderboardWrapEl) {
      leaderboardWrapEl.style.display = "none";
    }
    if (bestlapsWrapEl) {
      bestlapsWrapEl.style.display = "none";
    }
    if (safetyWrapEl) {
      safetyWrapEl.style.display = "none";
    }

    const serverStatusEl = document.getElementById("serverStatusValue");
    const serverPlayersEl = document.getElementById("serverPlayersValue");

    if (serverStatusEl) {
      serverStatusEl.textContent = "OFFLINE";
      serverStatusEl.classList.remove("online", "degraded");
      serverStatusEl.classList.add("offline");
    }

    if (serverPlayersEl) {
      serverPlayersEl.textContent = "--";
    }
  }
}

document.addEventListener("DOMContentLoaded", init);

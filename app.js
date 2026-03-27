const IS_RACES_PAGE = /\/races(?:\/|\/index\.html)?$/i.test(window.location.pathname);
const IS_DRIVER_PAGE = /\/driver(?:\/|\/index\.html)?$/i.test(window.location.pathname);
const IS_CARS_PAGE = /\/cars(?:\/|\/index\.html)?$/i.test(window.location.pathname);
const IS_FUN_STATS_PAGE = /\/fun-stats(?:\/|\/index\.html)?$/i.test(window.location.pathname);
const SITE_BASE_PATH = (IS_RACES_PAGE || IS_DRIVER_PAGE || IS_CARS_PAGE || IS_FUN_STATS_PAGE) ? "../" : "./";
const CAR_IMAGE_BASE_PATH = `${SITE_BASE_PATH}assets/car-icons`;
const TOP_DATA_BASE_URL = "https://asgracing.github.io/top-data";
const HOURLY_DATA_BASE_URL = "https://asgracing.github.io/hourly-data";
const snapshotUrl = `${TOP_DATA_BASE_URL}/snapshot.json`;
const leaderboardUrl = `${TOP_DATA_BASE_URL}/leaderboard.json`;
const bestlapsUrl = `${TOP_DATA_BASE_URL}/bestlaps.json`;
const globalStatsUrl = `${TOP_DATA_BASE_URL}/global_stats.json`;
const safetyUrl = `${TOP_DATA_BASE_URL}/safety.json`;
const driverOfDayUrl = `${TOP_DATA_BASE_URL}/driver_of_the_day.json`;
const serverStatusUrl = `${TOP_DATA_BASE_URL}/server_status.json`;
const onlineUrl = `${TOP_DATA_BASE_URL}/online.json`;
const hourlyAnnouncementUrl = `${HOURLY_DATA_BASE_URL}/announcement.json`;
const hourlyVotesApiUrl = "https://hourly-votes.asgracing.workers.dev";
const TWITCH_CHANNEL_NAME = "asgracing";
const TWITCH_CHANNEL_URL = `https://www.twitch.tv/${TWITCH_CHANNEL_NAME}`;
const TWITCH_LIVE_PREVIEW_URL = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${TWITCH_CHANNEL_NAME}-440x248.jpg`;
const YOUTUBE_CHANNEL_HANDLE = "@ASGRacingACC";
const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@ASGRacingACC";
const YOUTUBE_LIVE_URL = `${YOUTUBE_CHANNEL_URL}/live`;
const TWITCH_WIDGET_CHECK_INTERVAL_MS = 120000;
const TOP_GUIDE_STORAGE_KEY = "asgTopGuideSeen";
const TOP_GUIDE_MEDIA_QUERY = "(min-width: 1280px)";
const SERVER_CARD_BACKGROUNDS = {
  main: `${SITE_BASE_PATH}assets/main.jpg`,
  sunset: `${SITE_BASE_PATH}assets/sunset.jpeg`
};
const racesUrl = `${TOP_DATA_BASE_URL}/races/races.json`;
const carsUrl = `${TOP_DATA_BASE_URL}/cars/cars.json`;
const driverIndexUrl = `${TOP_DATA_BASE_URL}/drivers/drivers.json`;
const PAGE_SIZE = 10;

function resolveInitialLanguage() {
  const urlLang = new URLSearchParams(window.location.search).get("lang");
  if (urlLang && translations[urlLang]) return urlLang;

  const storedLang = localStorage.getItem("asgLang");
  if (storedLang && translations[storedLang]) return storedLang;

  const browserLanguages = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language];

  const preferred = browserLanguages
    .map(value => String(value || "").trim().toLowerCase())
    .find(Boolean);

  return preferred && preferred.startsWith("ru") ? "ru" : "en";
}

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
let racesPage = 1;
let currentLang = "en";
let leaderboardSearch = "";
let bestlapsSearch = "";
let safetySearch = "";
let racesSearch = "";
let racesTrackFilter = "";
let carsSearch = "";
let carsMinRacesFilter = "0";
let driverRaceSort = { key: "finished_at", direction: "desc" };
let driverTrackSort = { key: "points", direction: "desc" };
let leaderboardSort = { key: null, direction: null };
let bestlapsSort = { key: null, direction: null };
let safetySort = { key: null, direction: null };
let carsSort = { key: "wins", direction: "desc" };
let onlineData = [];
let hourlyAnnouncementData = null;
let hourlyVotesCount = null;
let hourlyVoteAlreadyVoted = false;
let hourlyVotePending = false;
let hourlyVoteFailed = false;
let raceActivityInsights = null;
let selectedRace = null;
let driverIndexData = [];
let driverProfileData = null;
let driverPreviewState = null;
let driverPreviewModalController = null;
let hourlyHeroModalController = null;
let onlineActivityModalController = null;
let selectedActivityDate = null;
let selectedActivityMonth = null;
let twitchWidgetCheckTimer = null;
let twitchWidgetState = {
  initialized: false,
  live: false,
  expanded: false,
  dismissed: true,
  checking: false,
  platform: null,
  embedUrl: "",
  openUrl: TWITCH_CHANNEL_URL
};
let topGuideState = {
  initialized: false,
  active: false,
  stepIndex: 0,
  highlightedElement: null,
  mediaQuery: null
};
let funStatsPeriod = "week";
const driverProfileCache = new Map();
const HOURLY_TRACK_BACKGROUNDS = {
  monza: "https://asgracing.github.io/hourly/assets/tracks/monza.jpg",
  silverstone: "https://asgracing.github.io/hourly/assets/tracks/silverstone.jpg",
  spa: "https://asgracing.github.io/hourly/assets/tracks/spa.jpg",
  nurburgring: "https://asgracing.github.io/hourly/assets/tracks/nurburgring.jpg"
};
const HOURLY_WEATHER_ICON_PATHS = {
  clouds: "https://asgracing.github.io/hourly/assets/weather/cloudness.png",
  rain: "https://asgracing.github.io/hourly/assets/weather/rain.png",
  random: "https://asgracing.github.io/hourly/assets/weather/random.png"
};

const translations = {
  en: {
    closeLabel: "Close",
    homeAriaLabel: "ASG Racing home",
    langSwitcherLabel: "Language switcher",
    navMore: "More",
    navMoreAriaLabel: "Open extra navigation",
    openRaceDetailsLabel: "Open race details",
    openDriverPreviewLabel: "Open driver quick view",
    onlineTitle: "Unique players",
onlineNoData: "No data",
    onlineActivityTitle: "Prime time by day",
    onlineActivityOpenLabel: "Open race activity details",
    onlineActivityEmpty: "Not enough race data yet.",
    onlineActivitySubtitle: "{date} · activity {score}/100",
    onlineActivityPrimeTime: "Prime time {hour} · score {score}",
    onlineActivityHoursTitle: "Hourly activity, unique drivers",
    onlineActivityMonthLabel: "Month",
    onlineActivityUniqueLabel: "Unique drivers",
    onlineActivityRacesLabel: "Races",
    onlineActivityAvgPlayersLabel: "Avg drivers per race",
    onlineActivityScoreLabel: "Activity",
    onlineActivityTracksLabel: "Tracks",
    onlineActivityHourRaces: "{value} races",
    onlineActivityHourUnique: "{value} unique",
    heroEyebrow: "ACC Public Leaderboard",
    hourlyEyebrow: "Next 1-Hour Race",
    hourlyStartsLabel: "Starts",
    hourlyTrackLabel: "Track",
    hourlyOpenBtn: "1-Hour Race!",
    hourlyVoteBtn: "I want to race!",
    hourlyVoteDone: "You're in",
    hourlyVoteSending: "Saving...",
    hourlyVoteFailed: "Try again",
    hourlyNoEvent: "No scheduled event yet",
    hourlyVotesZero: "No registrations yet",
    hourlyVotesOne: "{value} registered driver",
    hourlyVotesMany: "{value} registered drivers",
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
    pageTitleFunStats: "ASG Racing Fun Stats | Weekly and Monthly ACC Stories",
    metaDescription:
      "ASG Racing ACC Leaderboard - race stats, wins, podiums and best laps from the public Assetto Corsa Competizione server.",
    metaDescriptionFunStats:
      "Weekly and monthly fun stats from ASG Racing ACC: comeback heroes, clean racers, hot laps, grind leaders and more.",
    ogDescription:
      "Race stats, wins, podiums and best laps from the ASG Racing server in Assetto Corsa Competizione.",
    ogDescriptionFunStats:
      "Weekly and monthly stories from the ASG Racing server: points bosses, comeback heroes, clean racers and hot lap heroes.",
    twitterDescription:
      "Races, wins, podiums and best laps from the public ACC server of ASG Racing.",
    twitterDescriptionFunStats:
      "Weekly and monthly ASG Racing fun stats with the most active, fastest and wildest drivers on the server.",
    ogLocale: "en_US",
    heroTitle: "🏁 ASG Racing Leaderboard",
    heroSubtitle:
      "<strong>ASG Racing</strong> is an ACC community of enthusiasts. The public server runs 24/7 on Monza, and we also host daily one-hour events at 14:00 and 20:00 MSK. Data is automatically updated based on dedicated server results.",
    btnChampionship: "Championship",
    btnLastRaces: "Last Races",
    btnCars: "Cars",
    btnFunStats: "Fun Stats",
    lastRacesBtn: "Last Races",
    btnBackHome: "Back to Home",
    btnBestLaps: "Best Laps",
    btnWorstSafety: "Worst Safety",
    btnAboutServer: "About Server",
    serversLabel: "Servers",
    serverStatusLabel: "Server",
    serverStatusOnline: "ONLINE",
    serverStatusOffline: "OFFLINE",
    serverStatusDegraded: "DEGRADED",
    serverTotalPlayersLabel: "Total players",
    serverTotalPlayersNote: "Servers",
    serversWidgetTitle: "Server status",
    serverMainLabel: "Main",
    serverSunsetLabel: "Sunset",
    driversCountLabel: "Drivers in leaderboard",
    driversCountNote: "Unique participants included in the stats.",
    bestLapHighlightLabel: "Best lap record",
    bestLapNoteFallback: "Best lap highlight will appear here.",
    bestLapNoteTemplate: "{driver} · {track}",
    top3Title: "Top 3 Drivers",
    top3Subtitle: "Current championship leaders by points.",
    championshipTitle: "Championship Leaderboard",
    championshipSubtitle: "Row click opens quick view. Name opens full profile.",
    bestLapsTitle: "Best Laps",
    bestLapsSubtitle: "Row click opens quick view. Name opens full profile.",
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
    communityTelegramTitle: "Telegram",
    communityTelegramText: "The fastest way to catch race announcements, reminders, voting, results and all the live ASG Racing movement.",
    communityTelegramCta: "Join and stay in the loop",
    communityDiscordTitle: "Discord",
    communityDiscordText: "Voice chat, race talk, setup discussion, finding rivals and the kind of community energy that keeps you coming back.",
    communityDiscordCta: "Jump into the paddock",
    communityYoutubeTitle: "YouTube",
    communityYoutubeText: "Race replays, highlights and content worth rewatching after the checkered flag drops.",
    communityYoutubeCta: "Watch the highlights",
    communityTwitchTitle: "Twitch",
    communityTwitchText: "Race replays, highlights and content worth rewatching after the checkered flag drops.",
    communityTwitchCta: "Watch on Twitch",
    twitchWidgetTitle: "ASG Racing is streaming now!",
    twitchWidgetOpen: "Open stream",
    twitchWidgetExpand: "Bigger",
    twitchWidgetCollapse: "Smaller",
    twitchWidgetHide: "Hide",
    twitchWidgetShow: "Open stream",
    topGuideLauncher: "New here?",
    topGuideDismiss: "Skip",
    topGuideBack: "Back",
    topGuideNext: "Next",
    topGuideDone: "Got it",
    topGuideProgress: "Step {current} of {total}",
    topGuideStepWelcomeTitle: "Welcome to the server stats",
    topGuideStepWelcomeText: "This page brings together ASG Racing server stats, live info, race history and quick links to the community.",
    topGuideStepChampionshipTitle: "Start with the championship",
    topGuideStepChampionshipText: "This is the main leaderboard. Use it to find yourself, compare points and quickly jump into a full driver profile.",
    topGuideStepSearchTitle: "Find yourself in the top",
    topGuideStepSearchText: "Use this search field to jump straight to your name in the standings instead of scanning the full table manually.",
    topGuideStepProfileTitle: "Open your full driver stats",
    topGuideStepProfileText: "Click your name inside the championship table to open a full driver profile with race history, pace and detailed statistics.",
    topGuideStepRacesTitle: "Open the latest races",
    topGuideStepRacesText: "This button takes you to the recent race archive, where every session has a full result sheet and finishing order.",
    topGuideStepHourlyTitle: "Hourly events live here",
    topGuideStepHourlyText: "This card shows the next hourly event: track, start time, registrations and more detailed slot info.",
    communityTiktokTitle: "TikTok",
    communityTiktokText: "Short, punchy moments: overtakes, chaos, emotions and the most addictive ASG Racing clips.",
    communityTiktokCta: "Catch the best moments",
    footerText:
      "Statistics are generated from ACC Dedicated Server result files and published via GitHub Pages.",
    loading: "Loading...",
    loadingRaces: "Loading races...",
    loadingLeaderboard: "Loading leaderboard...",
    loadingBestLaps: "Loading best laps...",
    loadingSafety: "Loading safety...",
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
    racesSearchPlaceholder: "Search track or driver...",
    racesTrackFilterAll: "All tracks",
    clearFilters: "Clear filters",
    resultsCount: "Results: {count}",
    filterSearchLabel: "Search",
    filterTrackLabel: "Track",
    filterCarLabel: "Car",
    filterMinRacesLabel: "Min races",
    emptyFilteredRaces: "No races match the current filters.",
    emptyFilteredCars: "No cars match the current filters.",
    carsEyebrow: "Car stats",
    carsPageTitle: "Cars",
    carsPageSubtitle: "Performance overview by car model based on recorded race results.",
    carsSearchPlaceholder: "Search car model...",
    carsMinRacesLabel: "Min races",
    carsSummaryTotal: "Car models",
    carsSummaryTopWinner: "Top winner",
    carsSummaryMostUsed: "Most used",
    metaLabelRaces: "Races",
    metaLabelWins: "Wins",
    carsTableTitle: "Cars Table",
    carsTableSubtitle: "Sorted by wins, podiums and race count.",
    carsCols: ["Car", "Races", "Wins", "Win Rate", "Podiums", "Drivers", "Avg Finish", "Fastest Laps", "Best Lap"],
    funStatsEyebrow: "Weekly and monthly pulse",
    funStatsPageTitle: "Fun Stats",
    funStatsPageSubtitle:
      "Not just wins and podiums. This page highlights the busiest, fastest, cleanest and most chaotic stories from recent ASG Racing races.",
    funStatsWeekTab: "Last 7 days",
    funStatsMonthTab: "Last 30 days",
    funStatsPeriodSwitcherLabel: "Period switcher",
    funStatsWindowLabel: "Data window",
    funStatsSummaryRaces: "Races held",
    funStatsSummaryDrivers: "Active drivers",
    funStatsSummaryFastestLapsLeader: "Fastest lap leader",
    funStatsSummaryOvertakes: "Positions gained",
    funStatsAwardsTitle: "Fun Awards",
    funStatsAwardsSubtitle: "A lighter weekly and monthly view of who made noise on the server.",
    funStatsLeaderboardsTitle: "Quick Rankings",
    funStatsLeaderboardsSubtitle: "Top names and trends for the selected period.",
    funStatsEmpty: "Not enough race data for this period yet.",
    funStatsListActive: "Most active drivers",
    funStatsListMovers: "Biggest movers",
    funStatsListClean: "Cleanest racers",
    funStatsListStable: "Most consistent",
    funStatsListFastest: "Fastest lap kings",
    funStatsListCars: "Most used cars",
    funStatsAwardPointsBoss: "Points Boss",
    funStatsAwardGrindKing: "Grind King",
    funStatsAwardPodiumHunter: "Podium Hunter",
    funStatsAwardComebackHero: "Comeback Hero",
    funStatsAwardCleanOperator: "Clean Operator",
    funStatsAwardHotLapHero: "Hot Lap Hero",
    funStatsAwardChaosMagnet: "Chaos Magnet",
    funStatsAwardGarageFavorite: "Garage Favorite",
    funStatsAwardPointsBossNote: "{value} pts scored in the selected period.",
    funStatsAwardGrindKingNote: "{value} race starts logged.",
    funStatsAwardPodiumHunterNote: "{value} podium finishes collected.",
    funStatsAwardComebackHeroNote: "+{value} positions gained across races.",
    funStatsAwardCleanOperatorNote: "{value} penalty pts across {starts} starts.",
    funStatsAwardHotLapHeroNote: "{lap} on Monza.",
    funStatsAwardChaosMagnetNote: "{value} penalty pts received.",
    funStatsAwardGarageFavoriteNote: "{value} starts with this car.",
    funStatsSummaryFastestLapsLeaderNote: "{value} times",
    funStatsListStartsValue: "{value} starts",
    funStatsListGainValue: "+{value} positions",
    funStatsListPenaltyValue: "{value} penalty pts",
    funStatsListAvgFinishValue: "avg finish {value}",
    funStatsListFastestLapValue: "{value} fastest laps",
    funStatsListCarValue: "{value} starts",
    racesSummaryTotal: "Total races",
    racesSummaryAvgActive: "Avg active finishers",
    racesSummaryAvgOvertakes: "Avg overtakes",
    racesSummaryTopWinner: "Top winner",
    racesSummaryLatestWinner: "Latest winner",
    racesSummaryLastWinnerBestLap: "Winner best lap",
    racesTableTitle: "Race Results",
    racesTableSubtitle: "Row click opens quick view. Name opens full profile.",
    raceModalEyebrow: "Race details",
    racesCols: ["Date", "Track", "Winner", "Drivers", "Best Lap"],
    raceModalCols: ["Pos", "Start", "Δ", "Driver", "Best Lap", "Car", "Gap", "Pts", "Pen"],
    notCountedBadge: "Not counted",
    raceSummaryTrack: "Track",
    raceSummaryWinner: "Winner",
    raceSummaryDrivers: "Drivers",
    raceSummaryBestLap: "Best lap",
    racePenaltyShort: "Pen",
    raceBestLapBadge: "Fastest lap",
    noWinner: "No winner",
    pageTitleDriver: "ASG Racing Driver Profile | Assetto Corsa Competizione Stats",
    driverEyebrow: "Driver profile",
    driverPreviewEyebrow: "Driver quick view",
    driverPreviewSubtitle: "Key pace and results from the ASG Racing server.",
    driverPreviewOpenPage: "Go to driver page",
    driverPreviewRowHint: "Row click opens quick view",
    driverPreviewLinkHint: "Name opens full profile",
    driverPageSubtitle: "Personal race history, pace and safety metrics from the ASG Racing server.",
    driverSummaryPoints: "Points",
    driverSummaryAvgPoints: "Avg points / race",
    driverSummaryAvgGain: "Avg pos delta",
    driverSummaryRaces: "Races",
    driverSummaryWins: "Wins",
    driverSummaryPodiums: "Podiums",
    driverSummaryAvgFinish: "Avg finish",
    driverSummaryBestLap: "Best lap",
    driverSummaryAvgPace: "Average pace",
    driverSummaryPenaltyPoints: "Penalty points",
    driverSummaryFastestLaps: "Fastest lap awards",
    driverSectionOverview: "Overview",
    driverSectionRaces: "Race History",
    driverSectionRacesSubtitle: "Row click opens quick view.",
    driverSectionTracks: "Track Stats",
    driverSectionPenalties: "Penalty Breakdown",
    driverRecentForm: "Recent form",
    driverMostRacedTrack: "Most raced track",
    driverFavoriteCar: "Favorite car",
    driverWinRate: "Win rate",
    driverPodiumRate: "Podium rate",
    driverRankingPosition: "Ranking position",
    driverNoData: "Driver profile not found.",
    driverLoading: "Loading driver profile...",
    driverRaceCols: ["Date", "Track", "Start", "Pos", "Δ", "Points", "Best Lap", "Car", "Gap", "Pen"],
    driverTrackCols: ["Track", "Races", "Wins", "Podiums", "Points", "Avg finish", "Best lap"],
    driverPenaltyReason: "Reason",
    driverPenaltyType: "Type",
    leaderboardCols: [
      "#",
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
    bestlapsCols: ["#", "Driver", "Best Lap", "Car", "Session", "Updated"],
    safetyBaseCols: ["#", "Driver", "Penalties", "Penalty Points"],
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
    sessionQualifying: "Quali",
    paginationShown: "Showing {start}-{end} of {total}",
    prev: "← Prev",
    next: "Next →"
  },
  ru: {
    closeLabel: "Закрыть",
    homeAriaLabel: "Главная ASG Racing",
    langSwitcherLabel: "Переключение языка",
    navMore: "Еще",
    navMoreAriaLabel: "Открыть дополнительную навигацию",
    openRaceDetailsLabel: "Открыть детали гонки",
    openDriverPreviewLabel: "Открыть быстрое превью пилота",
    onlineTitle: "Уникальные игроки",
onlineNoData: "Нет данных",
    onlineActivityTitle: "Прайм-тайм по дням",
    onlineActivityOpenLabel: "Открыть активность гонок",
    onlineActivityEmpty: "Пока недостаточно данных по гонкам.",
    onlineActivitySubtitle: "{date} · активность {score}/100",
    onlineActivityPrimeTime: "Прайм-тайм {hour} · индекс {score}",
    onlineActivityHoursTitle: "Почасовая активность, уникальные пилоты",
    onlineActivityMonthLabel: "Месяц",
    onlineActivityUniqueLabel: "Уникальные пилоты",
    onlineActivityRacesLabel: "Гонки",
    onlineActivityAvgPlayersLabel: "Среднее пилотов на гонку",
    onlineActivityScoreLabel: "Активность",
    onlineActivityTracksLabel: "Трассы",
    onlineActivityHourRaces: "{value} гонок",
    onlineActivityHourUnique: "{value} уникальных",
    heroEyebrow: "Чемпионат публичного сервера ACC",
    hourlyEyebrow: "Ближайшая часовая гонка",
    hourlyStartsLabel: "Старт",
    hourlyTrackLabel: "Трасса",
    hourlyOpenBtn: "Часовая Гонка!",
    hourlyVoteBtn: "Я хочу поехать!",
    hourlyVoteDone: "Ты в списке",
    hourlyVoteSending: "Сохраняем...",
    hourlyVoteFailed: "Повтори позже",
    hourlyNoEvent: "Пока нет запланированного события",
    hourlyVotesZero: "Нет регистраций",
    hourlyVotesOne: "{value} участник",
    hourlyVotesMany: "{value} участников",
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
    pageTitleFunStats: "ASG Racing Fun Stats | Недельные и месячные истории ACC",
    pageTitleCars: "ASG Racing Cars | Статистика Assetto Corsa Competizione",
    btnCars: "Машины",
    btnFunStats: "Фан-стата",
    carsEyebrow: "Статистика машин",
    carsPageTitle: "Машины",
    carsPageSubtitle: "Обзор результатов по моделям машин на основе сохраненных гоночных результатов.",
    carsSearchPlaceholder: "Поиск по модели машины...",
    carsMinRacesLabel: "Мин. гонок",
    carsSummaryTotal: "Моделей машин",
    carsSummaryTopWinner: "Лидер по победам",
    carsSummaryMostUsed: "Самая популярная",
    metaLabelRaces: "Гонки",
    metaLabelWins: "Победы",
    carsTableTitle: "Таблица машин",
    carsTableSubtitle: "Сортировка по клику на заголовки столбцов.",
    carsCols: ["Машина", "Гонки", "Победы", "Винрейт", "Подиумы", "Пилоты", "Ср. финиш", "Лучшие круги", "Бестлап"],
    funStatsEyebrow: "Пульс недели и месяца",
    funStatsPageTitle: "Фан-стата",
    funStatsPageSubtitle:
      "Не только победы и подиумы. Здесь собраны самые живые истории последних гонок ASG Racing: активность, камбэки, чистые заезды, быстрые круги и немного хаоса.",
    funStatsWeekTab: "Последние 7 дней",
    funStatsMonthTab: "Последние 30 дней",
    funStatsPeriodSwitcherLabel: "Переключатель периода",
    funStatsWindowLabel: "Период данных",
    funStatsSummaryRaces: "Проведено гонок",
    funStatsSummaryDrivers: "Активных пилотов",
    funStatsSummaryFastestLapsLeader: "Лидер по быстрым кругам",
    funStatsSummaryOvertakes: "Отбитых позиций",
    funStatsAwardsTitle: "Фан-награды",
    funStatsAwardsSubtitle: "Более живой недельный и месячный взгляд на то, что происходило на сервере.",
    funStatsLeaderboardsTitle: "Быстрые рейтинги",
    funStatsLeaderboardsSubtitle: "Главные имена и тренды за выбранный период.",
    funStatsEmpty: "Пока недостаточно данных за этот период.",
    funStatsListActive: "Самые активные пилоты",
    funStatsListMovers: "Главные камбэкеры",
    funStatsListClean: "Самые чистые гонщики",
    funStatsListStable: "Самые стабильные",
    funStatsListFastest: "Короли быстрых кругов",
    funStatsListCars: "Самые популярные машины",
    funStatsAwardPointsBoss: "Босс по очкам",
    funStatsAwardGrindKing: "Король наката",
    funStatsAwardPodiumHunter: "Охотник за подиумами",
    funStatsAwardComebackHero: "Герой камбэков",
    funStatsAwardCleanOperator: "Чистый оператор",
    funStatsAwardHotLapHero: "Герой быстрого круга",
    funStatsAwardChaosMagnet: "Магнит для хаоса",
    funStatsAwardGarageFavorite: "Любимчик гаража",
    funStatsAwardPointsBossNote: "{value} очков за выбранный период.",
    funStatsAwardGrindKingNote: "{value} стартов за период.",
    funStatsAwardPodiumHunterNote: "{value} подиумов собрано.",
    funStatsAwardComebackHeroNote: "+{value} отыгранных позиций по сумме гонок.",
    funStatsAwardCleanOperatorNote: "{value} штрафных очков за {starts} стартов.",
    funStatsAwardHotLapHeroNote: "{lap} на Monza.",
    funStatsAwardChaosMagnetNote: "{value} штрафных очков получено.",
    funStatsAwardGarageFavoriteNote: "{value} стартов на этой машине.",
    funStatsSummaryFastestLapsLeaderNote: "{value} раз",
    funStatsListStartsValue: "{value} стартов",
    funStatsListGainValue: "+{value} позиций",
    funStatsListPenaltyValue: "{value} штраф. очков",
    funStatsListAvgFinishValue: "ср. финиш {value}",
    funStatsListFastestLapValue: "{value} быстрых кругов",
    funStatsListCarValue: "{value} стартов",
    pageTitle: "ASG Racing ACC Leaderboard | Статистика Assetto Corsa Competizione",
    pageTitleRaces: "ASG Racing Последние гонки | Результаты Assetto Corsa Competizione",
    metaDescription:
      "ASG Racing ACC Leaderboard - статистика гонок, побед, подиумов и лучших кругов на публичном сервере Assetto Corsa Competizione.",
    metaDescriptionFunStats:
      "Недельная и месячная фан-статистика ASG Racing ACC: камбэки, чистые гонщики, быстрые круги, активность и самые яркие истории сервера.",
    ogDescription:
      "Статистика гонок, побед, подиумов и лучших кругов на сервере ASG Racing в Assetto Corsa Competizione.",
    ogDescriptionFunStats:
      "Недельные и месячные истории ASG Racing: лидеры по очкам, камбэки, чистые гонщики, быстрые круги и самые активные пилоты.",
    twitterDescription:
      "Гонки, победы, подиумы и лучшие круги на публичном ACC сервере ASG Racing.",
    twitterDescriptionFunStats:
      "Фановая недельная и месячная статистика ASG Racing с самыми активными, быстрыми и безумными пилотами сервера.",
    ogLocale: "ru_RU",
    heroTitle: "🏁 ASG Racing Leaderboard",
    heroSubtitle:
      "<strong>ASG Racing</strong> - сообщество энтузиастов ACC. Открытый сервер работает 24/7 на трассе Monza. Мы также проводим ежедневные часовые эвенты в 14 и 20 мск. Данные обновляются автоматически на основе результатов dedicated server.",
    btnChampionship: "Рейтинг",
    btnLastRaces: "Гонки",
    lastRacesBtn: "Последние гонки",
    btnBackHome: "Главная",
    btnBestLaps: "Круги",
    btnWorstSafety: "Штрафы",
    btnAboutServer: "Сервер",
    serversLabel: "Серверы",
    serverStatusLabel: "Сервер",
    serverStatusOnline: "ОНЛАЙН",
    serverStatusOffline: "ОФФЛАЙН",
    serverStatusDegraded: "ЧАСТИЧНО",
    serverTotalPlayersLabel: "Всего игроков",
    serverTotalPlayersNote: "Серверы",
    serversWidgetTitle: "Статус серверов",
    serverMainLabel: "Главный",
    serverSunsetLabel: "На закате",
    driversCountLabel: "Пилотов в рейтинге",
    driversCountNote: "Уникальные участники, попавшие в статистику.",
    bestLapHighlightLabel: "Лучший круг",
    bestLapNoteFallback: "Лучший круг будет показан здесь.",
    bestLapNoteTemplate: "{driver} · {track}",
    top3Title: "Топ-3 пилота",
    top3Subtitle: "Текущие лидеры чемпионата по очкам.",
    championshipTitle: "Таблица чемпионата",
    championshipSubtitle: "Строка открывает быстрый просмотр, имя пилота ведёт в полный профиль.",
    bestLapsTitle: "Лучшие круги",
    bestLapsSubtitle: "Строка открывает быстрый просмотр, имя пилота ведёт в полный профиль.",
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
    communityTelegramTitle: "Telegram",
    communityTelegramText: "Самый быстрый способ не пропускать анонсы гонок, сборы, напоминания, голосования, результаты и весь движ ASG Racing.",
    communityTelegramCta: "Влететь в движ",
    communityDiscordTitle: "Discord",
    communityDiscordText: "Голос, общение, поиск соперников, разговоры про сетапы и то самое чувство живого паддока между заездами.",
    communityDiscordCta: "Зайти в паддок",
    communityYoutubeTitle: "YouTube",
    communityYoutubeText: "Записи гонок, хайлайты и моменты, которые хочется пересматривать уже после клетчатого флага.",
    communityYoutubeCta: "Смотреть хайлайты",
    communityTwitchTitle: "Twitch",
    communityTwitchText: "Записи гонок, хайлайты и моменты, которые хочется пересматривать уже после клетчатого флага.",
    communityTwitchCta: "Смотреть на Twitch",
    twitchWidgetTitle: "ASG Racing сейчас стримит!",
    twitchWidgetOpen: "Открыть стрим",
    twitchWidgetExpand: "Больше",
    twitchWidgetCollapse: "Меньше",
    twitchWidgetHide: "Свернуть",
    twitchWidgetShow: "Развернуть стрим",
    topGuideLauncher: "Впервые здесь?",
    topGuideDismiss: "Пропустить",
    topGuideBack: "Назад",
    topGuideNext: "Дальше",
    topGuideDone: "Понятно",
    topGuideProgress: "Шаг {current} из {total}",
    topGuideStepWelcomeTitle: "Добро пожаловать в статистику сервера",
    topGuideStepWelcomeText: "Здесь собрана статистика ASG Racing: рейтинг пилотов, статус сервера, история гонок и быстрые переходы в комьюнити.",
    topGuideStepChampionshipTitle: "Начните с чемпионата",
    topGuideStepChampionshipText: "Это главный рейтинг пилотов. Здесь можно найти себя, сравнить очки и перейти в полный профиль водителя.",
    topGuideStepSearchTitle: "Найди себя в топе",
    topGuideStepSearchText: "Используйте это поле поиска, чтобы быстро найти себя в таблице, а не просматривать весь рейтинг вручную.",
    topGuideStepProfileTitle: "Открой детальную статистику пилота",
    topGuideStepProfileText: "Кликните по своему имени в таблице чемпионата, чтобы открыть полный профиль пилота с историей гонок, темпом и детальной статистикой.",
    topGuideStepRacesTitle: "Здесь последние гонки",
    topGuideStepRacesText: "Эта кнопка ведет в архив недавних гонок, где у каждого заезда есть полный протокол и порядок финиша.",
    topGuideStepHourlyTitle: "А здесь часовые ивенты",
    topGuideStepHourlyText: "В этой карточке показана ближайшая часовая гонка: трасса, время старта, регистрации и подробности слота.",
    communityTiktokTitle: "TikTok",
    communityTiktokText: "Короткие яркие моменты: обгоны, хаос, эмоции и самые залипательные эпизоды ASG Racing.",
    communityTiktokCta: "Поймать лучшие моменты",
    footerText:
      "Данные собираются из файлов результатов ACC Dedicated Server и публикуются через GitHub Pages.",
    loading: "Загрузка...",
    loadingRaces: "Загрузка гонок...",
    loadingLeaderboard: "Загрузка leaderboard...",
    loadingBestLaps: "Загрузка best laps...",
    loadingSafety: "Загрузка safety...",
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
    racesSearchPlaceholder: "Поиск по трассе или пилоту...",
    racesTrackFilterAll: "Все трассы",
    clearFilters: "Сбросить фильтры",
    resultsCount: "Результатов: {count}",
    filterSearchLabel: "Поиск",
    filterTrackLabel: "Трасса",
    filterCarLabel: "Машина",
    filterMinRacesLabel: "Мин. гонок",
    emptyFilteredRaces: "Нет гонок, подходящих под текущие фильтры.",
    emptyFilteredCars: "Нет машин, подходящих под текущие фильтры.",
    racesSummaryTotal: "Всего гонок",
    racesSummaryAvgActive: "Ср. активных пилотов",
    racesSummaryAvgOvertakes: "Ср. обгонов",
    racesSummaryTopWinner: "Лучший победитель",
    racesSummaryLatestWinner: "Последний победитель",
    racesSummaryLastWinnerBestLap: "Лучший круг победителя",
    racesTableTitle: "Результаты гонок",
    racesTableSubtitle: "Клик по строке открывает модалку. Имя открывает полный профиль.",
    raceModalEyebrow: "Детали гонки",
    racesCols: ["Дата", "Трасса", "Победитель", "Пилоты", "Лучший круг"],
    raceModalCols: ["Pos", "Старт", "Δ", "Пилот", "Лучший круг", "Машина", "Отставание", "Очки", "Штр."],
    notCountedBadge: "Не засчитано",
    raceSummaryTrack: "Трасса",
    raceSummaryWinner: "Победитель",
    raceSummaryDrivers: "Пилотов",
    raceSummaryBestLap: "Лучший круг",
    racePenaltyShort: "Штр.",
    raceBestLapBadge: "Быстрый круг",
    noWinner: "Нет победителя",
    pageTitleDriver: "ASG Racing Профиль пилота | Статистика Assetto Corsa Competizione",
    driverEyebrow: "Профиль пилота",
    driverPreviewEyebrow: "Быстрый просмотр пилота",
    driverPreviewSubtitle: "Ключевые показатели темпа и результатов на сервере ASG Racing.",
    driverPreviewOpenPage: "Перейти на страницу пилота",
    driverPreviewRowHint: "Клик по строке открывает модалку",
    driverPreviewLinkHint: "Имя открывает полный профиль",
    driverPageSubtitle: "Личная история гонок, темп и safety-метрики на сервере ASG Racing.",
    driverSummaryPoints: "Очки",
    driverSummaryAvgPoints: "Ср. очков / гонку",
    driverSummaryAvgGain: "Ср. дельта поз.",
    driverSummaryRaces: "Гонки",
    driverSummaryWins: "Победы",
    driverSummaryPodiums: "Подиумы",
    driverSummaryAvgFinish: "Ср. финиш",
    driverSummaryBestLap: "Лучший круг",
    driverSummaryAvgPace: "Средний темп",
    driverSummaryPenaltyPoints: "Штрафные очки",
    driverSummaryFastestLaps: "Лучшие круги в гонке",
    driverSectionOverview: "Обзор",
    driverSectionRaces: "История гонок",
    driverSectionRacesSubtitle: "Клик по строке открывает модалку.",
    driverSectionTracks: "Статистика по трассам",
    driverSectionPenalties: "Разбор штрафов",
    driverRecentForm: "Последние результаты",
    driverMostRacedTrack: "Любимая трасса",
    driverFavoriteCar: "Любимая машина",
    driverWinRate: "Процент побед",
    driverPodiumRate: "Процент подиумов",
    driverRankingPosition: "Позиция в рейтинге",
    driverNoData: "Профиль пилота не найден.",
    driverLoading: "Загрузка профиля пилота...",
    driverRaceCols: ["Дата", "Трасса", "Старт", "Поз", "Δ", "Очки", "Лучший круг", "Машина", "Отставание", "Штр"],
    driverTrackCols: ["Трасса", "Гонки", "Победы", "Подиумы", "Очки", "Ср. финиш", "Лучший круг"],
    driverPenaltyReason: "Причина",
    driverPenaltyType: "Тип",
    leaderboardCols: [
      "№",
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
    bestlapsCols: ["№", "Пилот", "Лучший круг", "Машина", "Сессия", "Обновлено"],
    safetyBaseCols: ["№", "Пилот", "Нарушения", "Штрафные баллы"],
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
    sessionQualifying: "Квала",
    paginationShown: "Показано {start}-{end} из {total}",
    prev: "← Назад",
    next: "Вперед →"
  }
};

Object.assign(translations.en, {
  updatedPrefix: "Updated",
  todayRacesNote: "Races today: {value}",
  todayPointsNote: "Points today: {value}",
  heroFunnelTitle: "Monza 24/7, daily events, beginner-friendly help",
  heroFunnelNote: "Telegram and Discord are the most convenient ways to stay in touch with the community. Here you will find reminders, results, voting, and live sim racing conversations.",
  joinTelegramBtn: "Join Telegram",
  joinDiscordBtn: "Join Discord",
  heroOpenHourlyBtn: "Next hourly event",
  hourlyModalEyebrow: "Slot details",
  hourlyOpenDetailsLabel: "Open hourly event details",
  hourlyServerLabel: "Server",
  hourlyPasswordLabel: "Password",
  hourlyDateTimeLabel: "Date + time",
  hourlyEntryLabel: "Entry",
  hourlyFormatLabel: "Format",
  hourlyPitstopLabel: "Pitstop",
  hourlyRefuelLabel: "Refuel",
  hourlyTyresLabel: "Tyres",
  hourlyWeatherLabel: "Weather",
  hourlyPasswordNone: "No password",
  hourlyUnknownValue: "--",
  hourlyEntrySlots: "{value} slots",
  hourlyEntrySafety: "SAFETY {value}",
  hourlyEntryTrackMedals: "{value} medals",
  hourlyEntryRacecraft: "RC {value}",
  hourlyPitNoMandatory: "No mandatory stop",
  hourlyMandatoryPitstopCount: "{value} mandatory stop",
  hourlyMandatoryPitstopCountPlural: "{value} mandatory stops",
  hourlyPitWindow: "Window {value}m",
  hourlyPitRefuelAllowed: "Refuel allowed",
  hourlyPitRefuelFixed: "Fixed refuel time",
  hourlyRefuelMandatory: "Refuel required",
  hourlyRefuelNone: "No refuel",
  hourlyTyresMandatory: "Tyre change required",
  hourlyTyresSets: "{value} sets",
  hourlyTyresNone: "No tyre rule",
  hourlyWeatherTemp: "{value}°C",
  hourlyWeatherClouds: "Clouds {value}%",
  hourlyWeatherRain: "Rain {value}%",
  hourlyWeatherRandom: "Random {value}"
});

Object.assign(translations.ru, {
  updatedPrefix: "Обновлено",
  todayRacesNote: "Гонок за сегодня: {value}",
  todayPointsNote: "Очков за сегодня: {value}",
  heroFunnelTitle: "Monza 24/7, ежедневные ивенты, помощь новичкам",
  heroFunnelNote: "Telegram и Discord - самые удобные способы общения в комьюнити. Здесь ты найдешь: напоминания, результаты, голосования, живое общение на симрейсинговые темы.",
  joinTelegramBtn: "Вступить в Telegram",
  joinDiscordBtn: "Вступить в Discord",
  heroOpenHourlyBtn: "Ближайшая часовая гонка",
  hourlyModalEyebrow: "Детали слота",
  hourlyOpenDetailsLabel: "Открыть детали часового события",
  hourlyServerLabel: "Сервер",
  hourlyPasswordLabel: "Пароль",
  hourlyDateTimeLabel: "Дата + время",
  hourlyEntryLabel: "Вход",
  hourlyFormatLabel: "Формат",
  hourlyPitstopLabel: "Пит-стоп",
  hourlyRefuelLabel: "Заправка",
  hourlyTyresLabel: "Шины",
  hourlyWeatherLabel: "Погода",
  hourlyPasswordNone: "Без пароля",
  hourlyUnknownValue: "--",
  hourlyEntrySlots: "{value} слотов",
  hourlyEntrySafety: "SAFETY {value}",
  hourlyEntryTrackMedals: "{value} медалей",
  hourlyEntryRacecraft: "RC {value}",
  hourlyPitNoMandatory: "Без обязательного пита",
  hourlyMandatoryPitstopCount: "{value} обязательный пит-стоп",
  hourlyMandatoryPitstopCountPlural: "{value} обязательных пит-стопа",
  hourlyPitWindow: "Окно {value}м",
  hourlyPitRefuelAllowed: "Заправка разрешена",
  hourlyPitRefuelFixed: "Фикс. время заправки",
  hourlyRefuelMandatory: "Заправка обязательна",
  hourlyRefuelNone: "Без заправки",
  hourlyTyresMandatory: "Смена шин обязательна",
  hourlyTyresSets: "{value} комплектов",
  hourlyTyresNone: "Без правила по шинам",
  hourlyWeatherTemp: "{value}°C",
  hourlyWeatherClouds: "Облака {value}%",
  hourlyWeatherRain: "Дождь {value}%",
  hourlyWeatherRandom: "Рандом {value}"
});

currentLang = resolveInitialLanguage();

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

const carModelNames = {
  0: "Porsche 991 GT3 R",
  1: "Mercedes-AMG GT3",
  2: "Ferrari 488 GT3",
  3: "Audi R8 LMS",
  4: "Lamborghini Huracan GT3",
  5: "McLaren 650S GT3",
  6: "Nissan GT-R Nismo GT3 2018",
  7: "BMW M6 GT3",
  8: "Bentley Continental GT3 2018",
  9: "Porsche 991II GT3 Cup",
  10: "Nissan GT-R Nismo GT3 2017",
  11: "Bentley Continental GT3 2016",
  12: "Aston Martin V12 Vantage GT3",
  13: "Lamborghini Gallardo R-EX",
  14: "Jaguar G3",
  15: "Lexus RC F GT3",
  16: "Lamborghini Huracan Evo (2019)",
  17: "Honda NSX GT3",
  18: "Lamborghini Huracan SuperTrofeo",
  19: "Audi R8 LMS Evo (2019)",
  20: "AMR V8 Vantage (2019)",
  21: "Honda NSX Evo (2019)",
  22: "McLaren 720S GT3 (2019)",
  23: "Porsche 911II GT3 R (2019)",
  24: "Ferrari 488 GT3 Evo 2020",
  25: "Mercedes-AMG GT3 2020",
  26: "Ferrari 488 Challenge Evo",
  27: "BMW M2 CS Racing",
  28: "Porsche 911 GT3 Cup (Type 992)",
  29: "Lamborghini Huracán Super Trofeo EVO2",
  30: "BMW M4 GT3",
  31: "Audi R8 LMS GT3 evo II",
  32: "Ferrari 296 GT3",
  33: "Lamborghini Huracan Evo2",
  34: "Porsche 992 GT3 R",
  35: "McLaren 720S GT3 Evo 2023",
  36: "Ford Mustang GT3"
};

const driverRaceColumns = [
  { key: "finished_at", type: "string" },
  { key: "track", type: "string" },
  { key: "start_position", type: "number" },
  { key: "position", type: "number" },
  { key: "positions_delta", type: "number" },
  { key: "points", type: "number" },
  { key: "best_lap", type: "time" },
  { key: "car_name", type: "string" },
  { key: "gap", type: "string" },
  { key: "penalty_points", type: "number" }
];

const driverTrackColumns = [
  { key: "track", type: "string" },
  { key: "races", type: "number" },
  { key: "wins", type: "number" },
  { key: "podiums", type: "number" },
  { key: "points", type: "number" },
  { key: "average_finish", type: "number" },
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

function normalizeActivityScore(value, maxValue) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const safeMax = Math.max(1, Number(maxValue) || 1);
  return Math.round((value / safeMax) * 100);
}

function buildRaceActivityInsights(races = []) {
  const dayMap = new Map();

  races.forEach(race => {
    const finishedAt = race?.finished_at;
    if (!finishedAt) return;

    const finishedDate = new Date(finishedAt);
    if (Number.isNaN(finishedDate.getTime())) return;

    const dayKey = finishedAt.slice(0, 10);
    const hourKey = String(finishedDate.getHours()).padStart(2, "0");
    const participants = Array.isArray(race?.results) ? race.results : [];
    const participantsCount = Number.isFinite(race?.participants_count)
      ? race.participants_count
      : participants.length;

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, {
        date: dayKey,
        races: 0,
        entries: 0,
        uniquePlayers: new Set(),
        tracks: new Set(),
        hours: new Map(),
        participants: new Map()
      });
    }

    const dayEntry = dayMap.get(dayKey);
    dayEntry.races += 1;
    dayEntry.entries += participantsCount;
    if (race?.track) dayEntry.tracks.add(race.track);

    if (!dayEntry.hours.has(hourKey)) {
      dayEntry.hours.set(hourKey, {
        hour: hourKey,
        label: `${hourKey}:00`,
        races: 0,
        entries: 0,
        uniquePlayers: new Set()
      });
    }

    const hourEntry = dayEntry.hours.get(hourKey);
    hourEntry.races += 1;
    hourEntry.entries += participantsCount;

    participants.forEach(result => {
      const playerId = result?.player_id;
      if (!playerId) return;

      dayEntry.uniquePlayers.add(playerId);
      hourEntry.uniquePlayers.add(playerId);

      if (!dayEntry.participants.has(playerId)) {
        dayEntry.participants.set(playerId, {
          player_id: playerId,
          public_id: result?.public_id || findPublicIdByPlayerId(playerId),
          driver: result?.driver || findDriverNameByPlayerId(playerId) || "-",
          races: 0,
          points: 0,
          wins: 0,
          average_finish_sum: 0,
          average_finish_count: 0,
          average_finish: null,
          best_lap: null,
          best_lap_ms: null
        });
      }

      const participantEntry = dayEntry.participants.get(playerId);
      participantEntry.races += 1;
      participantEntry.points += Number(result?.points) || 0;

      const position = Number(result?.position);
      if (Number.isFinite(position) && position > 0) {
        participantEntry.average_finish_sum += position;
        participantEntry.average_finish_count += 1;
        participantEntry.average_finish = Number(
          (participantEntry.average_finish_sum / participantEntry.average_finish_count).toFixed(2)
        );
        if (position === 1) participantEntry.wins += 1;
      }

      const bestLapMs = Number(result?.best_lap_ms);
      if (Number.isFinite(bestLapMs) && bestLapMs > 0) {
        if (!Number.isFinite(participantEntry.best_lap_ms) || bestLapMs < participantEntry.best_lap_ms) {
          participantEntry.best_lap_ms = bestLapMs;
          participantEntry.best_lap = result?.best_lap || participantEntry.best_lap;
        }
      }
    });
  });

  const dayEntries = [...dayMap.values()];
  const maxDayRaces = Math.max(1, ...dayEntries.map(day => day.races || 0));
  const maxDayEntries = Math.max(1, ...dayEntries.map(day => day.entries || 0));
  const maxDayUnique = Math.max(1, ...dayEntries.map(day => day.uniquePlayers.size || 0));
  const allHours = dayEntries.flatMap(day => [...day.hours.values()]);
  const maxHourRaces = Math.max(1, ...allHours.map(hour => hour.races || 0));
  const maxHourEntries = Math.max(1, ...allHours.map(hour => hour.entries || 0));
  const maxHourUnique = Math.max(1, ...allHours.map(hour => hour.uniquePlayers.size || 0));

  return dayEntries
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map(day => {
      const normalizedRaces = normalizeActivityScore(day.races, maxDayRaces);
      const normalizedEntries = normalizeActivityScore(day.entries, maxDayEntries);
      const normalizedUnique = normalizeActivityScore(day.uniquePlayers.size, maxDayUnique);
      const activityScore = Math.round(normalizedUnique * 0.45 + normalizedEntries * 0.4 + normalizedRaces * 0.15);

      const hours = Array.from({ length: 24 }, (_, index) => {
        const key = String(index).padStart(2, "0");
        const bucket = day.hours.get(key) || {
          hour: key,
          label: `${key}:00`,
          races: 0,
          entries: 0,
          uniquePlayers: new Set()
        };
        const normalizedHourRaces = normalizeActivityScore(bucket.races, maxHourRaces);
        const normalizedHourEntries = normalizeActivityScore(bucket.entries, maxHourEntries);
        const normalizedHourUnique = normalizeActivityScore(bucket.uniquePlayers.size, maxHourUnique);
        const hourScore = Math.round(normalizedHourUnique * 0.5 + normalizedHourEntries * 0.35 + normalizedHourRaces * 0.15);

        return {
          hour: key,
          label: bucket.label,
          races: bucket.races,
          entries: bucket.entries,
          unique_players: bucket.uniquePlayers.size,
          activity_score: hourScore
        };
      });

      const peakHour = [...hours].sort((a, b) =>
        (b.activity_score - a.activity_score) ||
        (b.entries - a.entries) ||
        (b.unique_players - a.unique_players) ||
        (b.races - a.races) ||
        String(a.hour).localeCompare(String(b.hour))
      )[0] || null;

      const participants = [...day.participants.values()]
        .sort((a, b) =>
          (b.races - a.races) ||
          (b.points - a.points) ||
          (b.wins - a.wins) ||
          ((a.average_finish ?? 9999) - (b.average_finish ?? 9999)) ||
          String(a.driver || "").localeCompare(String(b.driver || ""))
        )
        .map(item => ({
          player_id: item.player_id,
          public_id: item.public_id,
          driver: item.driver,
          races: item.races,
          points: item.points,
          wins: item.wins,
          average_finish: item.average_finish,
          best_lap: item.best_lap
        }));

      return {
        date: day.date,
        races: day.races,
        entries: day.entries,
        unique_players: day.uniquePlayers.size,
        avg_players_per_race: day.races ? Number((day.entries / day.races).toFixed(2)) : 0,
        activity_score: activityScore,
        tracks: [...day.tracks].sort((a, b) => String(a).localeCompare(String(b))),
        peak_hour: peakHour && peakHour.activity_score > 0 ? peakHour : null,
        hours,
        participants
      };
    });
}

function renderOnlineWidget() {
  const chartEl = document.getElementById("online-chart");
  const scaleEl = document.getElementById("online-scale");
  const rangeEl = document.getElementById("online-range");
  const titleEl = document.querySelector(".hero-online-title");
  const cardEl = document.getElementById("hero-online-card");

  if (titleEl) titleEl.textContent = t("onlineTitle");
  if (cardEl) cardEl.setAttribute("aria-label", t("onlineActivityOpenLabel"));
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

function createHourlyModalToken(label, tone = "default", icon = "") {
  return { label, tone, icon };
}

function renderHourlyModalTokens(tokens = []) {
  const safeTokens = tokens.filter(token => token && token.label);
  const normalized = safeTokens.length
    ? safeTokens
    : [createHourlyModalToken(t("hourlyUnknownValue"), "muted")];

  return `<div class="hourly-modal-token-list">${normalized.map(token => `
    <span class="hourly-modal-token hourly-modal-token-${escapeHtml(token.tone || "default")}">
      ${token.icon ? `<img class="hourly-modal-token-icon" src="${escapeHtml(token.icon)}" alt="" aria-hidden="true" />` : ""}
      <span>${escapeHtml(token.label)}</span>
    </span>
  `).join("")}</div>`;
}

function getHourlyVotesLabel() {
  if (typeof hourlyVotesCount === "number") {
    return replaceTokens(
      t(hourlyVotesCount === 1 ? "hourlyVotesOne" : hourlyVotesCount > 1 ? "hourlyVotesMany" : "hourlyVotesZero"),
      { value: hourlyVotesCount }
    );
  }
  if (hourlyVoteFailed) return t("hourlyVoteFailed");
  return "—";
}

function formatHourlyMandatoryPitstopCount(value) {
  if (typeof value !== "number" || value <= 0) return t("hourlyPitNoMandatory");
  return value === 1
    ? replaceTokens(t("hourlyMandatoryPitstopCount"), { value })
    : replaceTokens(t("hourlyMandatoryPitstopCountPlural"), { value });
}

function buildHourlyEntryTokens(server) {
  if (!server || typeof server !== "object") return [];

  const tokens = [];
  if (server.car_group) tokens.push(createHourlyModalToken(server.car_group, "primary"));
  if (typeof server.max_car_slots === "number" && server.max_car_slots > 0) {
    tokens.push(createHourlyModalToken(replaceTokens(t("hourlyEntrySlots"), { value: server.max_car_slots })));
  }
  if (typeof server.safety_rating_requirement === "number" && server.safety_rating_requirement > 0) {
    tokens.push(createHourlyModalToken(replaceTokens(t("hourlyEntrySafety"), { value: server.safety_rating_requirement }), "muted"));
  }
  if (typeof server.track_medals_requirement === "number" && server.track_medals_requirement > 0) {
    tokens.push(createHourlyModalToken(replaceTokens(t("hourlyEntryTrackMedals"), { value: server.track_medals_requirement }), "muted"));
  }
  if (typeof server.racecraft_rating_requirement === "number" && server.racecraft_rating_requirement > 0) {
    tokens.push(createHourlyModalToken(replaceTokens(t("hourlyEntryRacecraft"), { value: server.racecraft_rating_requirement }), "muted"));
  }
  return tokens;
}

function buildHourlyFormatTokens(session) {
  if (!session || typeof session !== "object") return [];

  const tokens = [];
  if (typeof session.qualifying_duration_minutes === "number" && session.qualifying_duration_minutes > 0) {
    tokens.push(createHourlyModalToken(`Q ${session.qualifying_duration_minutes}m`, "primary"));
  }
  if (typeof session.race_duration_minutes === "number" && session.race_duration_minutes > 0) {
    tokens.push(createHourlyModalToken(`R ${session.race_duration_minutes}m`, "primary"));
  }
  if (!tokens.length && session.format_label) {
    session.format_label
      .split(" + ")
      .map(part => part.trim())
      .filter(Boolean)
      .forEach(part => tokens.push(createHourlyModalToken(part, "primary")));
  }

  const preRaceMinutes = minutesFromSeconds(session.pre_race_waiting_time_seconds);
  if (preRaceMinutes && preRaceMinutes > 0) {
    tokens.push(createHourlyModalToken(`Pre ${preRaceMinutes}m`, "muted"));
  }

  return tokens;
}

function buildHourlyPitstopTokens(rules) {
  if (!rules || typeof rules !== "object") return [];

  const tokens = [
    createHourlyModalToken(
      formatHourlyMandatoryPitstopCount(rules.mandatory_pitstop_count),
      rules.mandatory_pitstop_count > 0 ? "primary" : "muted"
    )
  ];
  if (typeof rules.pit_window_length_minutes === "number" && rules.pit_window_length_minutes > 0) {
    tokens.push(createHourlyModalToken(replaceTokens(t("hourlyPitWindow"), { value: rules.pit_window_length_minutes })));
  }
  return tokens;
}

function buildHourlyRefuelTokens(rules) {
  if (!rules || typeof rules !== "object") return [];

  const tokens = [];
  if (rules.refuelling_allowed_in_race) tokens.push(createHourlyModalToken(t("hourlyPitRefuelAllowed")));
  if (rules.refuelling_time_fixed) tokens.push(createHourlyModalToken(t("hourlyPitRefuelFixed"), "muted"));
  if (rules.mandatory_pitstop_refuelling_required) tokens.push(createHourlyModalToken(t("hourlyRefuelMandatory"), "primary"));
  if (!tokens.length) tokens.push(createHourlyModalToken(t("hourlyRefuelNone"), "muted"));
  return tokens;
}

function buildHourlyTyreTokens(rules) {
  if (!rules || typeof rules !== "object") return [];

  const tokens = [];
  if (rules.mandatory_pitstop_tyre_change_required) tokens.push(createHourlyModalToken(t("hourlyTyresMandatory"), "primary"));
  if (typeof rules.tyre_set_count === "number" && rules.tyre_set_count > 0) {
    tokens.push(createHourlyModalToken(replaceTokens(t("hourlyTyresSets"), { value: rules.tyre_set_count }), "muted"));
  }
  if (!tokens.length) tokens.push(createHourlyModalToken(t("hourlyTyresNone"), "muted"));
  return tokens;
}

function buildHourlyWeatherTokens(weather) {
  if (!weather || typeof weather !== "object") return [];

  const tokens = [];
  if (typeof weather.ambient_temp_c === "number") {
    tokens.push(createHourlyModalToken(replaceTokens(t("hourlyWeatherTemp"), { value: weather.ambient_temp_c })));
  }
  const cloudPercent = percentValue(weather.cloud_level);
  if (cloudPercent !== null) {
    tokens.push(createHourlyModalToken(`${cloudPercent}%`, "muted", HOURLY_WEATHER_ICON_PATHS.clouds));
  }
  const rainPercent = percentValue(weather.rain_level);
  if (rainPercent !== null) {
    tokens.push(createHourlyModalToken(`${rainPercent}%`, "muted", HOURLY_WEATHER_ICON_PATHS.rain));
  }
  if (typeof weather.weather_randomness === "number") {
    tokens.push(createHourlyModalToken(String(weather.weather_randomness), "muted", HOURLY_WEATHER_ICON_PATHS.random));
  }
  return tokens;
}

function applyHourlyModalTrackBackground(trackCode) {
  const modalCard = document.querySelector("#hourly-details-modal .modal-card-slot");
  if (!modalCard) return;

  const backgroundUrl = HOURLY_TRACK_BACKGROUNDS[String(trackCode || "").trim().toLowerCase()];
  modalCard.style.setProperty("--modal-track-photo", backgroundUrl ? `url("${backgroundUrl}")` : "none");
}

function buildHourlyHeroModalContent(data) {
  const server = data?.server || {};
  const session = data?.session || {};
  const rules = data?.rules || {};
  const weather = data?.weather || {};
  const canVote = Boolean(data?.event_id || data?.track_name);
  const voteLabel = hourlyVotePending
    ? t("hourlyVoteSending")
    : hourlyVoteAlreadyVoted
      ? t("hourlyVoteDone")
      : t("hourlyVoteBtn");

  return `
    <div class="hourly-modal-grid">
      <section class="hourly-modal-left-cluster">
        <div class="hourly-modal-panel-grid hourly-modal-panel-grid-three">
          <article class="hourly-modal-panel-item">
            <div class="hourly-modal-label">${escapeHtml(t("hourlyPitstopLabel"))}</div>
            ${renderHourlyModalTokens(buildHourlyPitstopTokens(rules))}
          </article>
          <article class="hourly-modal-panel-item">
            <div class="hourly-modal-label">${escapeHtml(t("hourlyRefuelLabel"))}</div>
            ${renderHourlyModalTokens(buildHourlyRefuelTokens(rules))}
          </article>
          <article class="hourly-modal-panel-item">
            <div class="hourly-modal-label">${escapeHtml(t("hourlyTyresLabel"))}</div>
            ${renderHourlyModalTokens(buildHourlyTyreTokens(rules))}
          </article>
        </div>
      </section>

      <aside class="hourly-modal-side-stack">
        <div class="hourly-modal-side-card hourly-modal-side-card-combined">
          <div class="hourly-modal-side-section">
            ${renderHourlyModalTokens(buildHourlyEntryTokens(server))}
          </div>
          <div class="hourly-modal-side-section">
            ${renderHourlyModalTokens(buildHourlyFormatTokens(session))}
          </div>
          <div class="hourly-modal-side-section hourly-modal-side-section-weather">
            ${renderHourlyModalTokens(buildHourlyWeatherTokens(weather))}
          </div>
        </div>
      </aside>
    </div>
    <div class="hourly-modal-details-cta">
      <button
        class="btn hero-hourly-btn hourly-modal-cta-btn${hourlyVoteAlreadyVoted ? " is-voted" : ""}${!hourlyVoteAlreadyVoted && !hourlyVotePending && canVote ? " pulse-attention" : ""}"
        id="hourly-modal-vote-btn"
        type="button"
        ${!canVote || hourlyVotePending ? "disabled" : ""}
      >${escapeHtml(voteLabel)} <span aria-hidden="true">♥</span></button>
      <div class="hourly-modal-cta-meta" id="hourly-modal-votes-summary">${escapeHtml(getHourlyVotesLabel())}</div>
    </div>
  `;
}

function renderHourlyHeroModal() {
  const titleEl = document.getElementById("hourly-details-title");
  const subtitleEl = document.getElementById("hourly-details-subtitle");
  const contentEl = document.getElementById("hourly-details-content");
  if (!titleEl || !subtitleEl || !contentEl) return;

  const data = hourlyAnnouncementData;
  if (!data?.track_name && !data?.event_id) {
    applyHourlyModalTrackBackground("");
    titleEl.textContent = t("hourlyNoEvent");
    subtitleEl.textContent = "—";
    contentEl.innerHTML = `<div class="empty-box">${escapeHtml(t("hourlyNoEvent"))}</div>`;
    return;
  }

  const server = data?.server || {};
  const startTime = getHourlyLocalizedField(data, "start_time_local", "—");
  const timezone = getHourlyLocalizedField(data, "timezone", "UTC+3");

  applyHourlyModalTrackBackground(data?.track_code);
  titleEl.textContent = getHourlyLocalizedField(data, "track_name", t("hourlyUnknownValue"));
  subtitleEl.innerHTML = `
    <span class="hourly-modal-subtitle-grid">
      <span class="hourly-modal-subtitle-card">
        <span class="hourly-modal-subtitle-label">${escapeHtml(t("hourlyServerLabel"))}</span>
        <span class="hourly-modal-subtitle-value">${escapeHtml(server.name || server.full_name || t("hourlyUnknownValue"))}</span>
      </span>
      <span class="hourly-modal-subtitle-card">
        <span class="hourly-modal-subtitle-label">${escapeHtml(t("hourlyPasswordLabel"))}</span>
        <span class="hourly-modal-subtitle-value">${escapeHtml(server.password || t("hourlyPasswordNone"))}</span>
      </span>
      <span class="hourly-modal-subtitle-card">
        <span class="hourly-modal-subtitle-label">${escapeHtml(t("hourlyDateTimeLabel"))}</span>
        <span class="hourly-modal-subtitle-value">${escapeHtml(formatDateOnlyForHourly(data?.date))}<br>${escapeHtml(`${startTime} ${timezone}`.trim())}</span>
      </span>
    </span>
  `;
  contentEl.innerHTML = buildHourlyHeroModalContent(data);

  const modalVoteBtn = document.getElementById("hourly-modal-vote-btn");
  if (modalVoteBtn && modalVoteBtn.dataset.bound !== "true") {
    modalVoteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      void submitHourlyHeroVote();
    });
    modalVoteBtn.dataset.bound = "true";
  }
}

function renderHourlyHeroCard() {
  const startsEl = document.getElementById("hourly-starts-value");
  const trackEl = document.getElementById("hourly-track-value");
  const votesEl = document.getElementById("hourly-votes-summary");
  const cardEl = document.getElementById("hero-hourly-card");
  const voteBtn = document.getElementById("hourly-vote-btn");

  if (!startsEl || !trackEl || !votesEl || !cardEl || !voteBtn) return;

  const data = hourlyAnnouncementData;
  trackEl.textContent = data?.track_name || t("hourlyNoEvent");
  startsEl.textContent = data?.start_time_local && data?.timezone
    ? `${data.start_time_local} ${data.timezone}`
    : "—";
  const trackCode = String(data?.track_code || "").trim().toLowerCase();
  const backgroundUrl = HOURLY_TRACK_BACKGROUNDS[trackCode];
  cardEl.style.setProperty("--hero-hourly-track-photo", backgroundUrl ? `url("${backgroundUrl}")` : "none");

  votesEl.textContent = getHourlyVotesLabel();

  voteBtn.textContent = hourlyVotePending
    ? t("hourlyVoteSending")
    : hourlyVoteAlreadyVoted
      ? t("hourlyVoteDone")
      : t("hourlyVoteBtn");

  voteBtn.disabled = !data?.event_id && !data?.track_name || hourlyVotePending;
  voteBtn.classList.toggle("is-voted", hourlyVoteAlreadyVoted);
  voteBtn.classList.toggle("pulse-attention", !hourlyVoteAlreadyVoted && !hourlyVotePending && Boolean(data?.event_id || data?.track_name));
  cardEl.setAttribute(
    "aria-label",
    `${t("hourlyOpenDetailsLabel")}: ${data?.track_name || t("hourlyNoEvent")}`
  );
  cardEl.setAttribute("aria-disabled", (!data?.event_id && !data?.track_name) ? "true" : "false");

  if (!voteBtn.dataset.bound) {
    voteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      void submitHourlyHeroVote();
    });
    voteBtn.addEventListener("keydown", (event) => {
      event.stopPropagation();
    });
    voteBtn.dataset.bound = "true";
  }
}

function normalizeHourlyEventId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildHourlyAnnouncementEventId(item) {
  const explicitId = normalizeHourlyEventId(item?.event_id);
  if (explicitId) return explicitId;
  const date = String(item?.date || "").trim();
  const time = String(item?.start_time_local || "").trim().replace(":", "");
  const trackCode = normalizeHourlyEventId(item?.track_code || item?.track_name || "slot");
  return normalizeHourlyEventId(`hourly_${date}_${time}_${trackCode}`);
}

async function loadHourlyVotes(announcement) {
  const eventId = buildHourlyAnnouncementEventId(announcement);
  if (!eventId) {
    hourlyVotesCount = null;
    hourlyVoteAlreadyVoted = false;
    hourlyVoteFailed = false;
    return;
  }
  try {
    const url = new URL("/votes", hourlyVotesApiUrl);
    url.searchParams.set("event_ids", eventId);
    url.searchParams.set("voter_id", getHourlyBrowserVoterId());
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const item = payload?.items?.[eventId];
    const count = item?.votes;
    hourlyVotesCount = typeof count === "number" ? count : 0;
    hourlyVoteAlreadyVoted = Boolean(item?.already_voted);
    hourlyVoteFailed = false;
  } catch (error) {
    console.warn("hourly votes are unavailable.", error);
    hourlyVotesCount = null;
    hourlyVoteAlreadyVoted = false;
    hourlyVoteFailed = true;
  }
}

async function submitHourlyHeroVote() {
  const eventId = buildHourlyAnnouncementEventId(hourlyAnnouncementData);
  if (!eventId || hourlyVotePending) return;

  hourlyVotePending = true;
  hourlyVoteFailed = false;
  renderHourlyHeroCard();
  renderHourlyHeroModal();

  try {
    const endpoint = hourlyVoteAlreadyVoted ? "/unvote" : "/vote";
    const body = hourlyVoteAlreadyVoted
      ? {
          event_id: eventId,
          voter_id: getHourlyBrowserVoterId()
        }
      : {
          event_id: eventId,
          track: hourlyAnnouncementData?.track_name || hourlyAnnouncementData?.track_code || "-",
          date: hourlyAnnouncementData?.date || "",
          time: hourlyAnnouncementData?.start_time_local || "",
          voter_id: getHourlyBrowserVoterId()
        };

    const response = await fetch(new URL(endpoint, hourlyVotesApiUrl), {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    hourlyVotesCount = typeof payload?.votes === "number" ? payload.votes : hourlyVotesCount;
    hourlyVoteAlreadyVoted = Boolean(payload?.already_voted);
    hourlyVoteFailed = false;
  } catch (error) {
    console.warn("hourly hero vote failed.", error);
    hourlyVoteFailed = true;
  } finally {
    hourlyVotePending = false;
    renderHourlyHeroCard();
    renderHourlyHeroModal();
  }
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

function tForLang(lang, key) {
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}

function replaceTokens(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function getHourlyLocalizedField(item, key, fallback = null) {
  if (!item || typeof item !== "object") return fallback ?? t("hourlyUnknownValue");

  const directLocalized = item[`${key}_${currentLang}`];
  if (typeof directLocalized === "string" && directLocalized.trim()) return directLocalized;

  const raw = item[key];
  if (typeof raw === "string" && raw.trim()) return raw;
  if (raw && typeof raw === "object") {
    const nested = raw[currentLang] ?? raw.en ?? raw.ru;
    if (typeof nested === "string" && nested.trim()) return nested;
  }

  return fallback ?? t("hourlyUnknownValue");
}

function percentValue(value) {
  return typeof value === "number" && !Number.isNaN(value) ? Math.round(value * 100) : null;
}

function minutesFromSeconds(value) {
  return typeof value === "number" && !Number.isNaN(value) ? Math.round(value / 60) : null;
}

function getHourlyBrowserVoterId() {
  const storageKey = "hourlyVoteVoterId";
  let value = localStorage.getItem(storageKey);
  if (!value) {
    value = `browser-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(storageKey, value);
  }
  return value;
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

function formatDateOnlyForHourly(dateString, lang = currentLang) {
  if (!dateString) return tForLang(lang, "hourlyUnknownValue");

  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const date = new Date(`${dateString}T00:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow"
  }).format(date);
}

function getTwitchEmbedParents() {
  const hosts = new Set();
  const hostname = String(window.location.hostname || "").trim();
  if (hostname) hosts.add(hostname);
  hosts.add("localhost");
  hosts.add("127.0.0.1");
  return [...hosts];
}

function buildTwitchPlayerUrl() {
  const url = new URL("https://player.twitch.tv/");
  url.searchParams.set("channel", TWITCH_CHANNEL_NAME);
  url.searchParams.set("autoplay", "false");
  getTwitchEmbedParents().forEach(parent => url.searchParams.append("parent", parent));
  return url.toString();
}

function extractYouTubeEmbedUrl(oembedPayload) {
  const html = String(oembedPayload?.html || "");
  const match = html.match(/src="([^"]+)"/i);
  if (!match?.[1]) return "";
  try {
    const url = new URL(match[1]);
    url.searchParams.set("autoplay", "0");
    url.searchParams.set("rel", "0");
    return url.toString();
  } catch {
    return "";
  }
}

async function detectYouTubeLive() {
  try {
    const oembedUrl = new URL("https://www.youtube.com/oembed");
    oembedUrl.searchParams.set("url", YOUTUBE_LIVE_URL);
    oembedUrl.searchParams.set("format", "json");
    const response = await fetch(oembedUrl.toString(), { cache: "no-store", mode: "cors" });
    if (!response.ok) return { live: false };
    const payload = await response.json();
    const embedUrl = extractYouTubeEmbedUrl(payload);
    if (!embedUrl) return { live: false };
    return {
      live: true,
      platform: "youtube",
      embedUrl,
      openUrl: YOUTUBE_LIVE_URL
    };
  } catch {
    return { live: false };
  }
}

async function detectActiveLiveStream() {
  const youtubeLive = await detectYouTubeLive();
  if (youtubeLive.live) return youtubeLive;

  const twitchLive = await detectTwitchLive();
  if (twitchLive) {
    return {
      live: true,
      platform: "twitch",
      embedUrl: buildTwitchPlayerUrl(),
      openUrl: TWITCH_CHANNEL_URL
    };
  }

  return {
    live: false,
    platform: null,
    embedUrl: "",
    openUrl: TWITCH_CHANNEL_URL
  };
}

function ensureTwitchWidget() {
  if (twitchWidgetState.initialized) return;

  const root = document.createElement("aside");
  root.className = "twitch-widget";
  root.id = "twitch-widget";
  root.hidden = true;
  root.innerHTML = `
    <div class="twitch-widget-shell">
      <div class="twitch-widget-header">
        <div class="twitch-widget-actions">
          <a
            class="twitch-widget-open"
            id="twitch-widget-open"
            href="${escapeHtml(TWITCH_CHANNEL_URL)}"
            target="_blank"
            rel="noopener noreferrer"
          >${escapeHtml(t("twitchWidgetOpen"))}</a>
          <button
            class="twitch-widget-expand"
            id="twitch-widget-expand"
            type="button"
            aria-expanded="false"
          >${escapeHtml(t("twitchWidgetExpand"))}</button>
          <button
            class="twitch-widget-hide"
            id="twitch-widget-hide"
            type="button"
          >${escapeHtml(t("twitchWidgetHide"))}</button>
        </div>
        <a
          class="twitch-widget-title-wrap"
          id="twitch-widget-link"
          href="${escapeHtml(TWITCH_CHANNEL_URL)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="twitch-widget-title" id="twitch-widget-title">${escapeHtml(t("twitchWidgetTitle"))}</span>
        </a>
      </div>
        <div class="twitch-widget-player-wrap">
          <iframe
            id="twitch-widget-frame"
            title="ASG Racing Twitch stream"
            allowfullscreen
          scrolling="no"
          allow="autoplay; fullscreen"
          src="about:blank"
          ></iframe>
        </div>
      </div>
      <button
        class="twitch-widget-launcher"
        id="twitch-widget-launcher"
        type="button"
      >${escapeHtml(t("twitchWidgetShow"))}</button>
    `;

    document.body.appendChild(root);

  const expandBtn = root.querySelector("#twitch-widget-expand");
  if (expandBtn) {
    expandBtn.addEventListener("click", (event) => {
      event.preventDefault();
      twitchWidgetState.expanded = !twitchWidgetState.expanded;
      renderTwitchWidget();
    });
  }

  const hideBtn = root.querySelector("#twitch-widget-hide");
  if (hideBtn) {
    hideBtn.addEventListener("click", (event) => {
      event.preventDefault();
      twitchWidgetState.dismissed = true;
      twitchWidgetState.expanded = false;
      renderTwitchWidget();
    });
  }

  const launcherBtn = root.querySelector("#twitch-widget-launcher");
  if (launcherBtn) {
    launcherBtn.addEventListener("click", (event) => {
      event.preventDefault();
      if (!twitchWidgetState.live) {
        const targetUrl = twitchWidgetState.openUrl || TWITCH_CHANNEL_URL;
        window.open(targetUrl, "_blank", "noopener,noreferrer");
        return;
      }
      twitchWidgetState.dismissed = false;
      renderTwitchWidget();
    });
  }

  twitchWidgetState.initialized = true;
  renderTwitchWidget();
}

function renderTwitchWidget() {
  if (!twitchWidgetState.initialized) return;

  const root = document.getElementById("twitch-widget");
  const frame = document.getElementById("twitch-widget-frame");
  const titleEl = document.getElementById("twitch-widget-title");
  const openEl = document.getElementById("twitch-widget-open");
  const expandEl = document.getElementById("twitch-widget-expand");
  const hideEl = document.getElementById("twitch-widget-hide");
  const launcherEl = document.getElementById("twitch-widget-launcher");
  const titleWrapEl = document.getElementById("twitch-widget-link");
  const shellEl = root.querySelector(".twitch-widget-shell");
  if (!root || !frame || !titleEl || !openEl || !expandEl || !hideEl || !launcherEl || !shellEl) return;

  titleEl.textContent = t("twitchWidgetTitle");
  openEl.textContent = t("twitchWidgetOpen");
  const activeOpenUrl = twitchWidgetState.openUrl || TWITCH_CHANNEL_URL;
  openEl.setAttribute("href", activeOpenUrl);
  if (titleWrapEl) titleWrapEl.setAttribute("href", activeOpenUrl);
  expandEl.textContent = twitchWidgetState.expanded ? t("twitchWidgetCollapse") : t("twitchWidgetExpand");
  expandEl.setAttribute("aria-expanded", twitchWidgetState.expanded ? "true" : "false");
  expandEl.setAttribute("aria-label", twitchWidgetState.expanded ? t("twitchWidgetCollapse") : t("twitchWidgetExpand"));
  hideEl.textContent = t("twitchWidgetHide");
  launcherEl.textContent = t("twitchWidgetShow");
  launcherEl.setAttribute("aria-label", t("twitchWidgetShow"));
  root.classList.toggle("is-platform-youtube", twitchWidgetState.platform === "youtube");
  root.classList.toggle("is-platform-twitch", twitchWidgetState.platform === "twitch");

  if (!twitchWidgetState.live) {
      root.hidden = false;
      root.classList.add("is-visible", "is-collapsed");
      root.classList.remove("is-expanded");
      shellEl.hidden = true;
      launcherEl.hidden = false;
      if (frame.getAttribute("src") !== "about:blank") frame.setAttribute("src", "about:blank");
      return;
    }

    root.hidden = false;
    root.classList.add("is-visible");
    root.classList.toggle("is-expanded", twitchWidgetState.expanded && !twitchWidgetState.dismissed);
    root.classList.toggle("is-collapsed", twitchWidgetState.dismissed);
    shellEl.hidden = twitchWidgetState.dismissed;
    launcherEl.hidden = !twitchWidgetState.dismissed;

    if (twitchWidgetState.dismissed) {
      if (frame.getAttribute("src") !== "about:blank") frame.setAttribute("src", "about:blank");
      return;
    }

    if (frame.getAttribute("src") !== twitchWidgetState.embedUrl) frame.setAttribute("src", twitchWidgetState.embedUrl);
  }

function detectTwitchLive() {
  return new Promise(resolve => {
    const image = new Image();
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timeoutId = window.setTimeout(() => finish(false), 8000);

    image.onload = () => {
      window.clearTimeout(timeoutId);
      const resolvedUrl = String(image.currentSrc || image.src || "").toLowerCase();
      const looksOfflinePlaceholder =
        resolvedUrl.includes("404_preview") ||
        resolvedUrl.includes("404-processing") ||
        resolvedUrl.includes("404_") ||
        resolvedUrl.includes("/404");
      finish(!looksOfflinePlaceholder);
    };
    image.onerror = () => {
      window.clearTimeout(timeoutId);
      finish(false);
    };
    image.src = `${TWITCH_LIVE_PREVIEW_URL}?ts=${Date.now()}`;
  });
}

async function refreshTwitchWidgetState() {
  if (twitchWidgetState.checking) return;
  twitchWidgetState.checking = true;

  try {
    const wasLive = twitchWidgetState.live;
    const previousPlatform = twitchWidgetState.platform;
    const result = await detectActiveLiveStream();
    twitchWidgetState.live = result.live;
    twitchWidgetState.platform = result.platform;
    twitchWidgetState.embedUrl = result.embedUrl || "";
    twitchWidgetState.openUrl = result.openUrl || TWITCH_CHANNEL_URL;
    if (!result.live) {
      twitchWidgetState.expanded = false;
      twitchWidgetState.dismissed = true;
    }
    if (!wasLive && result.live) {
      twitchWidgetState.dismissed = false;
      twitchWidgetState.expanded = false;
    }
    if (previousPlatform && previousPlatform !== result.platform) {
      twitchWidgetState.dismissed = false;
    }
    renderTwitchWidget();
  } finally {
    twitchWidgetState.checking = false;
  }
}

function initTwitchWidget() {
  ensureTwitchWidget();
  void refreshTwitchWidgetState();

  if (twitchWidgetCheckTimer) window.clearInterval(twitchWidgetCheckTimer);
  twitchWidgetCheckTimer = window.setInterval(() => {
    void refreshTwitchWidgetState();
  }, TWITCH_WIDGET_CHECK_INTERVAL_MS);

  if (!document.body.dataset.twitchVisibilityBound) {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) void refreshTwitchWidgetState();
    });
    document.body.dataset.twitchVisibilityBound = "true";
  }
}

function shouldEnableTopGuide() {
  return !IS_RACES_PAGE && !IS_DRIVER_PAGE && !IS_CARS_PAGE && !IS_FUN_STATS_PAGE;
}

function isTopGuideDesktop() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia(TOP_GUIDE_MEDIA_QUERY).matches;
}

function getTopGuideSteps() {
  return [
    {
      targetSelector: ".hero-card",
      titleKey: "topGuideStepWelcomeTitle",
      textKey: "topGuideStepWelcomeText",
      scrollBlock: "nearest"
    },
    {
      targetSelector: "#championship",
      titleKey: "topGuideStepChampionshipTitle",
      textKey: "topGuideStepChampionshipText",
      scrollBlock: "center"
    },
    {
      targetSelector: "#leaderboard-search",
      titleKey: "topGuideStepSearchTitle",
      textKey: "topGuideStepSearchText",
      scrollBlock: "center"
    },
    {
      targetSelector: "#leaderboard-table",
      titleKey: "topGuideStepProfileTitle",
      textKey: "topGuideStepProfileText",
      scrollBlock: "center"
    },
    {
      targetSelector: ".btn-last-races",
      titleKey: "topGuideStepRacesTitle",
      textKey: "topGuideStepRacesText",
      scrollBlock: "center"
    },
    {
      targetSelector: "#hero-hourly-card",
      titleKey: "topGuideStepHourlyTitle",
      textKey: "topGuideStepHourlyText",
      scrollBlock: "center"
    }
  ];
}

function clearTopGuideHighlight() {
  if (topGuideState.highlightedElement) {
    topGuideState.highlightedElement.classList.remove("top-guide-highlight");
    topGuideState.highlightedElement = null;
  }
}

function setTopGuideSeen() {
  try {
    localStorage.setItem(TOP_GUIDE_STORAGE_KEY, "1");
  } catch {
    // Ignore storage issues.
  }
}

function hasSeenTopGuide() {
  try {
    return localStorage.getItem(TOP_GUIDE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function scrollTopGuideTargetIntoView(target, block = "center") {
  if (!target || typeof target.getBoundingClientRect !== "function") return;

  const rect = target.getBoundingClientRect();
  const targetTop = rect.top + window.scrollY;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const navOffset = 96;
  let nextScrollTop = targetTop - navOffset;

  if (block === "center") {
    nextScrollTop = targetTop - Math.max(120, (viewportHeight - rect.height) / 2);
  }

  window.scrollTo({
    top: Math.max(0, nextScrollTop),
    behavior: "smooth"
  });
}

function closeTopGuide(markSeen = true) {
  topGuideState.active = false;
  clearTopGuideHighlight();
  if (markSeen) setTopGuideSeen();
  renderTopGuide();
}

function openTopGuide(stepIndex = 0, force = false) {
  if (!topGuideState.initialized || !shouldEnableTopGuide() || !isTopGuideDesktop()) return;
  if (!force && hasSeenTopGuide()) return;

  const steps = getTopGuideSteps();
  topGuideState.stepIndex = Math.max(0, Math.min(stepIndex, steps.length - 1));
  topGuideState.active = true;
  renderTopGuide();
}

function setTopGuideStep(nextStepIndex) {
  const steps = getTopGuideSteps();
  if (!steps.length) return;

  if (nextStepIndex >= steps.length) {
    closeTopGuide(true);
    return;
  }

  topGuideState.stepIndex = Math.max(0, Math.min(nextStepIndex, steps.length - 1));
  renderTopGuide();
}

function renderTopGuide() {
  if (!topGuideState.initialized) return;

  const root = document.getElementById("top-guide");
  const launcher = document.getElementById("top-guide-launcher");
  const scrim = document.getElementById("top-guide-scrim");
  const titleEl = document.getElementById("top-guide-title");
  const bodyEl = document.getElementById("top-guide-body");
  const progressEl = document.getElementById("top-guide-progress");
  const backBtn = document.getElementById("top-guide-back");
  const nextBtn = document.getElementById("top-guide-next");
  const skipBtn = document.getElementById("top-guide-skip");

  if (!root || !launcher || !scrim || !titleEl || !bodyEl || !progressEl || !backBtn || !nextBtn || !skipBtn) return;

  launcher.textContent = t("topGuideLauncher");
  launcher.setAttribute("aria-label", t("topGuideLauncher"));
  skipBtn.textContent = t("topGuideDismiss");
  backBtn.textContent = t("topGuideBack");

  if (!shouldEnableTopGuide() || !isTopGuideDesktop()) {
    topGuideState.active = false;
    clearTopGuideHighlight();
    root.hidden = true;
    scrim.hidden = true;
    launcher.hidden = true;
    return;
  }

  const steps = getTopGuideSteps();
  const step = steps[topGuideState.stepIndex];
  const total = steps.length;

  launcher.hidden = topGuideState.active;
  root.hidden = !topGuideState.active;
  scrim.hidden = !topGuideState.active;

  if (!topGuideState.active || !step) {
    clearTopGuideHighlight();
    return;
  }

  titleEl.textContent = t(step.titleKey);
  bodyEl.textContent = t(step.textKey);
  progressEl.textContent = replaceTokens(t("topGuideProgress"), {
    current: topGuideState.stepIndex + 1,
    total
  });
  backBtn.disabled = topGuideState.stepIndex === 0;
  nextBtn.textContent = topGuideState.stepIndex === total - 1 ? t("topGuideDone") : t("topGuideNext");

  clearTopGuideHighlight();
  const target = document.querySelector(step.targetSelector);
  if (target) {
    target.classList.add("top-guide-highlight");
    topGuideState.highlightedElement = target;
    scrollTopGuideTargetIntoView(target, step.scrollBlock);
  }
}

function ensureTopGuide() {
  if (topGuideState.initialized || !shouldEnableTopGuide()) return;

  const scrim = document.createElement("div");
  scrim.className = "top-guide-scrim";
  scrim.id = "top-guide-scrim";
  scrim.hidden = true;

  const root = document.createElement("aside");
  root.className = "top-guide";
  root.id = "top-guide";
  root.hidden = true;
  root.innerHTML = `
    <div class="top-guide-progress" id="top-guide-progress"></div>
    <h3 class="top-guide-title" id="top-guide-title"></h3>
    <p class="top-guide-body" id="top-guide-body"></p>
    <div class="top-guide-actions">
      <button class="top-guide-btn top-guide-btn-ghost" id="top-guide-skip" type="button"></button>
      <button class="top-guide-btn top-guide-btn-secondary" id="top-guide-back" type="button"></button>
      <button class="top-guide-btn top-guide-btn-primary" id="top-guide-next" type="button"></button>
    </div>
  `;

  const launcher = document.createElement("button");
  launcher.className = "top-guide-launcher";
  launcher.id = "top-guide-launcher";
  launcher.type = "button";

  document.body.appendChild(scrim);
  document.body.appendChild(root);
  document.body.appendChild(launcher);

  root.querySelector("#top-guide-skip")?.addEventListener("click", () => closeTopGuide(true));
  root.querySelector("#top-guide-back")?.addEventListener("click", () => setTopGuideStep(topGuideState.stepIndex - 1));
  root.querySelector("#top-guide-next")?.addEventListener("click", () => setTopGuideStep(topGuideState.stepIndex + 1));
  launcher.addEventListener("click", () => openTopGuide(0, true));

  topGuideState.mediaQuery = window.matchMedia?.(TOP_GUIDE_MEDIA_QUERY) || null;
  topGuideState.mediaQuery?.addEventListener?.("change", () => {
    if (!isTopGuideDesktop()) {
      topGuideState.active = false;
      clearTopGuideHighlight();
    }
    renderTopGuide();
  });

  window.addEventListener("resize", () => {
    if (topGuideState.active) renderTopGuide();
  });

  topGuideState.initialized = true;
  renderTopGuide();

  if (!hasSeenTopGuide()) {
    window.setTimeout(() => openTopGuide(0, true), 500);
  }
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
  return `${SITE_BASE_PATH}driver/?id=${encodeURIComponent(resolvedId)}`;
}

function getCarsPageHref(carName) {
  if (!carName) return null;
  return `${SITE_BASE_PATH}cars/?car=${encodeURIComponent(carName)}`;
}

function renderDriverLink(name, publicId, className = "driver-link", playerId = null) {
  const safeName = escapeHtml(name || "-");
  const href = getDriverProfileHref(publicId, playerId);
  if (!href) {
    return `<span class="${escapeHtml(className)}">${safeName}</span>`;
  }
  return `<a class="${escapeHtml(className)}" href="${href}">${safeName}</a>`;
}

function renderCarLink(name, className = "driver-link") {
  const safeName = escapeHtml(name || "-");
  const href = getCarsPageHref(name);
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

function getDriverPreviewRowData(row) {
  const publicId = row?.public_id || makePublicDriverId(row?.player_id);
  if (!publicId) return null;

  return {
    publicId,
    playerId: row?.player_id || null,
    driver: row?.driver || "-",
    href: getDriverProfileHref(publicId, row?.player_id),
  };
}

function buildDriverPreviewRowAttributes(row) {
  const preview = getDriverPreviewRowData(row);
  if (!preview) return "";

  return [
    'class="is-interactive-row is-driver-preview-row"',
    'tabindex="0"',
    'role="button"',
    `aria-label="${escapeAttribute(`${t("openDriverPreviewLabel")}: ${preview.driver}`)}"`,
    `data-driver-preview="true"`,
    `data-public-id="${escapeAttribute(preview.publicId)}"`,
    `data-player-id="${escapeAttribute(preview.playerId || "")}"`,
    `data-driver-name="${escapeAttribute(preview.driver)}"`
  ].join(" ");
}

function renderDriverNameMeta() {
  return "";
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

function formatLapTimeFromMs(value) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  const totalMs = Math.round(value);
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const milliseconds = totalMs % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
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
    const rankDiff = parseNumeric(a.rank) - parseNumeric(b.rank);
    return Number.isFinite(rankDiff) ? rankDiff : 0;
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

function getAriaSort(sortState, key) {
  if (sortState.key !== key || !sortState.direction) return "none";
  return sortState.direction === "asc" ? "ascending" : "descending";
}

function bindSortableHeaders(selector, sortState, onSort) {
  document.querySelectorAll(selector).forEach(th => {
    th.addEventListener("click", () => onSort(th.dataset.sortKey));
    th.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSort(th.dataset.sortKey);
      }
    });
    th.setAttribute("aria-sort", getAriaSort(sortState, th.dataset.sortKey));
  });
}

function renderSortableHeaders(columns, labels, sortState) {
  return columns.map((col, index) => `
    <th class="sortable ${getSortClass(sortState, col.key)}" data-sort-key="${escapeHtml(col.key)}" tabindex="0" role="button" aria-sort="${getAriaSort(sortState, col.key)}">
      ${escapeHtml(Array.isArray(labels) ? labels[index] : col.label ?? col.key)}
    </th>
  `).join("");
}

function bindInteractiveRows(container, selector, onOpen, { ignoreSelector = "a" } = {}) {
  container.querySelectorAll(selector).forEach(row => {
    const openRow = (event) => {
      if (event.target.closest(ignoreSelector)) return;
      onOpen(row, event);
    };

    row.addEventListener("click", openRow);
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openRow(event);
    });
  });
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
    filterCars(carsData),
    carsSort,
    carsColumns
  );
}

function getLatestRaceDate(data = racesData) {
  const timestamps = (Array.isArray(data) ? data : [])
    .map(race => new Date(race?.finished_at || race?.date || "").getTime())
    .filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)) : null;
}

function getFunStatsPeriodWindow(period) {
  const days = period === "month" ? 30 : 7;
  const anchor = getLatestRaceDate() || new Date();
  const end = new Date(anchor);
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return { start, end };
}

function getFunStatsPeriodRaces(period) {
  const { start, end } = getFunStatsPeriodWindow(period);
  const startTime = start.getTime();
  const endTime = end.getTime();

  return (Array.isArray(racesData) ? racesData : [])
    .filter(race => {
      const time = new Date(race?.finished_at || race?.date || "").getTime();
      return Number.isFinite(time) && time >= startTime && time <= endTime;
    })
    .sort((a, b) => new Date(b?.finished_at || 0).getTime() - new Date(a?.finished_at || 0).getTime());
}

function createFunDriverRecord(row) {
  return {
    publicId: row?.public_id || makePublicDriverId(row?.player_id),
    playerId: row?.player_id || null,
    driver: row?.driver || "-",
    starts: 0,
    points: 0,
    wins: 0,
    podiums: 0,
    fastestLapAwards: 0,
    finishTotal: 0,
    finishSamples: 0,
    positionsGain: 0,
    penaltyPoints: 0,
    penaltyCount: 0
  };
}

function aggregateFunStats(period) {
  const periodRaces = getFunStatsPeriodRaces(period);
  const { start, end } = getFunStatsPeriodWindow(period);
  const driverMap = new Map();
  const carMap = new Map();
  let overtakesTotal = 0;
  let fastestLapRecord = null;

  periodRaces.forEach(race => {
    const activeResults = (race?.results || []).filter(isActiveRaceResult);

    activeResults.forEach(row => {
      const key = row?.public_id || makePublicDriverId(row?.player_id) || row?.driver || "unknown_driver";
      const record = driverMap.get(key) || createFunDriverRecord(row);
      record.starts += 1;
      record.points += row?.points ?? 0;
      record.wins += row?.position === 1 ? 1 : 0;
      record.podiums += typeof row?.position === "number" && row.position <= 3 ? 1 : 0;
      record.fastestLapAwards += row?.had_best_lap ? 1 : 0;
      if (typeof row?.position === "number" && row.position > 0) {
        record.finishTotal += row.position;
        record.finishSamples += 1;
      }
      record.positionsGain += Math.max(0, row?.positions_delta ?? 0);
      record.penaltyPoints += row?.penalty_points ?? 0;
      record.penaltyCount += row?.penalty_count ?? 0;
      driverMap.set(key, record);

      overtakesTotal += Math.max(0, row?.positions_delta ?? 0);

      const carName = row?.car_name || "-";
      const carRecord = carMap.get(carName) || { car: carName, starts: 0, wins: 0 };
      carRecord.starts += 1;
      carRecord.wins += row?.position === 1 ? 1 : 0;
      carMap.set(carName, carRecord);

      if (typeof row?.best_lap_ms === "number" && row.best_lap_ms > 0) {
        if (!fastestLapRecord || row.best_lap_ms < fastestLapRecord.bestLapMs) {
          fastestLapRecord = {
            bestLapMs: row.best_lap_ms,
            lap: row.best_lap || formatLapTimeFromMs(row.best_lap_ms),
            driver: row.driver || "-",
            publicId: row.public_id || makePublicDriverId(row.player_id),
            playerId: row.player_id || null
          };
        }
      }
    });
  });

  const drivers = [...driverMap.values()];
  const cars = [...carMap.values()];
  const cleanPool = drivers.filter(driver => driver.starts >= (period === "month" ? 4 : 2));
  const stablePool = drivers
    .filter(driver => driver.starts >= (period === "month" ? 5 : 3) && driver.finishSamples > 0)
    .map(driver => ({
      ...driver,
      averageFinish: driver.finishTotal / driver.finishSamples
    }));
  const chaosMagnet = [...(Array.isArray(safetyData) ? safetyData : [])]
    .sort((a, b) => (b?.penalty_points ?? 0) - (a?.penalty_points ?? 0) || (b?.penalty_count ?? 0) - (a?.penalty_count ?? 0))
    [0] || null;
  const fastestLapLeader = [...drivers]
    .sort((a, b) => b.fastestLapAwards - a.fastestLapAwards || b.points - a.points || a.driver.localeCompare(b.driver))[0] || null;

  return {
    rangeLabel: `${formatDateLocal(start, currentLang)} - ${formatDateLocal(end, currentLang)}`,
    summary: {
      races: periodRaces.length,
      activeDrivers: drivers.length,
      fastestLapLeader,
      overtakes: overtakesTotal
    },
    awards: {
      pointsBoss: [...drivers].sort((a, b) => b.points - a.points || b.wins - a.wins || a.driver.localeCompare(b.driver))[0] || null,
      grindKing: [...drivers].sort((a, b) => b.starts - a.starts || b.points - a.points || a.driver.localeCompare(b.driver))[0] || null,
      podiumHunter: [...drivers].sort((a, b) => b.podiums - a.podiums || b.wins - a.wins || a.driver.localeCompare(b.driver))[0] || null,
      comebackHero: [...drivers].sort((a, b) => b.positionsGain - a.positionsGain || b.starts - a.starts || a.driver.localeCompare(b.driver))[0] || null,
      cleanOperator: [...cleanPool].sort((a, b) => a.penaltyPoints - b.penaltyPoints || b.starts - a.starts || b.points - a.points || a.driver.localeCompare(b.driver))[0] || null,
      hotLapHero: fastestLapRecord,
      chaosMagnet: chaosMagnet
        ? {
            driver: chaosMagnet.driver || "-",
            publicId: chaosMagnet.public_id || makePublicDriverId(chaosMagnet.player_id),
            playerId: chaosMagnet.player_id || null,
            penaltyPoints: chaosMagnet.penalty_points ?? 0
          }
        : null,
      garageFavorite: [...cars].sort((a, b) => b.starts - a.starts || b.wins - a.wins || a.car.localeCompare(b.car))[0] || null
    },
    lists: {
      active: [...drivers].sort((a, b) => b.starts - a.starts || b.points - a.points || a.driver.localeCompare(b.driver)).slice(0, 5),
      movers: [...drivers].sort((a, b) => b.positionsGain - a.positionsGain || b.starts - a.starts || a.driver.localeCompare(b.driver)).slice(0, 5),
      clean: [...cleanPool].sort((a, b) => a.penaltyPoints - b.penaltyPoints || b.starts - a.starts || b.points - a.points || a.driver.localeCompare(b.driver)).slice(0, 5),
      stable: [...stablePool].sort((a, b) => a.averageFinish - b.averageFinish || b.starts - a.starts || a.driver.localeCompare(b.driver)).slice(0, 5),
      fastest: [...drivers].sort((a, b) => b.fastestLapAwards - a.fastestLapAwards || b.points - a.points || a.driver.localeCompare(b.driver)).slice(0, 5),
      cars: [...cars].sort((a, b) => b.starts - a.starts || b.wins - a.wins || a.car.localeCompare(b.car)).slice(0, 5)
    }
  };
}

function renderFunStatsAwardCard(labelKey, titleMarkup, note, accent = "default") {
  return `
    <article class="fun-award-card fun-award-card-${escapeHtml(accent)}">
      <div class="fun-award-label">${escapeHtml(t(labelKey))}</div>
      <div class="fun-award-title">${titleMarkup}</div>
      <div class="fun-award-note">${escapeHtml(note)}</div>
    </article>
  `;
}

function renderFunStatsSummaryCard(labelMarkup, valueMarkup, note = "", extraClass = "") {
  return `
    <article class="fun-summary-card ${escapeHtml(extraClass)}">
      <div class="fun-summary-label">${labelMarkup}</div>
      <div class="fun-summary-value">${valueMarkup}</div>
      ${note ? `<div class="fun-summary-note">${escapeHtml(note)}</div>` : ""}
    </article>
  `;
}

function renderFunStatsListCard(titleKey, items, valueFormatter) {
  const listMarkup = items.length
    ? items.map((item, index) => `
        <li class="fun-list-item">
          <span class="fun-list-rank">#${index + 1}</span>
          <span class="fun-list-main">${item.label}</span>
          <span class="fun-list-side">${escapeHtml(valueFormatter(item))}</span>
        </li>
      `).join("")
    : `<li class="fun-list-item fun-list-item-empty">${escapeHtml(t("funStatsEmpty"))}</li>`;

  return `
    <article class="fun-list-card">
      <div class="fun-list-title">${escapeHtml(t(titleKey))}</div>
      <ul class="fun-list">${listMarkup}</ul>
    </article>
  `;
}

function renderFunStatsPage() {
  const summaryEl = document.getElementById("fun-stats-summary");
  const awardsEl = document.getElementById("fun-stats-awards");
  const leaderboardsEl = document.getElementById("fun-stats-leaderboards");
  const rangeEl = document.getElementById("fun-stats-range");
  const toggleButtons = document.querySelectorAll("[data-fun-period]");

  if (!summaryEl || !awardsEl || !leaderboardsEl || !rangeEl) return;

  toggleButtons.forEach(button => {
    const active = button.dataset.funPeriod === funStatsPeriod;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });

  const data = aggregateFunStats(funStatsPeriod);
  rangeEl.textContent = `${t("funStatsWindowLabel")}: ${data.rangeLabel}`;

  summaryEl.innerHTML = `
    ${renderFunStatsSummaryCard(
      escapeHtml(t("funStatsSummaryRaces")),
      escapeHtml(data.summary.races)
    )}
    ${renderFunStatsSummaryCard(
      escapeHtml(t("funStatsSummaryDrivers")),
      escapeHtml(data.summary.activeDrivers)
    )}
    ${renderFunStatsSummaryCard(
      escapeHtml(t("funStatsSummaryFastestLapsLeader")),
      data.summary.fastestLapLeader
        ? escapeHtml(replaceTokens(t("funStatsSummaryFastestLapsLeaderNote"), { value: data.summary.fastestLapLeader.fastestLapAwards }))
        : "-",
      data.summary.fastestLapLeader
        ? data.summary.fastestLapLeader.driver
        : ""
      ,
      "fun-summary-card-driver-note"
    )}
    ${renderFunStatsSummaryCard(
      escapeHtml(t("funStatsSummaryOvertakes")),
      escapeHtml(data.summary.overtakes)
    )}
  `;

  if (!data.summary.races) {
    awardsEl.innerHTML = `<div class="empty-box">${escapeHtml(t("funStatsEmpty"))}</div>`;
    leaderboardsEl.innerHTML = "";
    return;
  }

  const { pointsBoss, grindKing, podiumHunter, comebackHero, cleanOperator, hotLapHero, chaosMagnet, garageFavorite } = data.awards;

  awardsEl.innerHTML = [
    pointsBoss && renderFunStatsAwardCard(
      "funStatsAwardPointsBoss",
      renderDriverLink(pointsBoss.driver, pointsBoss.publicId, "driver-link driver-link-heading", pointsBoss.playerId),
      replaceTokens(t("funStatsAwardPointsBossNote"), { value: pointsBoss.points }),
      "accent"
    ),
    grindKing && renderFunStatsAwardCard(
      "funStatsAwardGrindKing",
      renderDriverLink(grindKing.driver, grindKing.publicId, "driver-link driver-link-heading", grindKing.playerId),
      replaceTokens(t("funStatsAwardGrindKingNote"), { value: grindKing.starts }),
      "warm"
    ),
    podiumHunter && renderFunStatsAwardCard(
      "funStatsAwardPodiumHunter",
      renderDriverLink(podiumHunter.driver, podiumHunter.publicId, "driver-link driver-link-heading", podiumHunter.playerId),
      replaceTokens(t("funStatsAwardPodiumHunterNote"), { value: podiumHunter.podiums }),
      "gold"
    ),
    comebackHero && renderFunStatsAwardCard(
      "funStatsAwardComebackHero",
      renderDriverLink(comebackHero.driver, comebackHero.publicId, "driver-link driver-link-heading", comebackHero.playerId),
      replaceTokens(t("funStatsAwardComebackHeroNote"), { value: comebackHero.positionsGain }),
      "cool"
    ),
    cleanOperator && renderFunStatsAwardCard(
      "funStatsAwardCleanOperator",
      renderDriverLink(cleanOperator.driver, cleanOperator.publicId, "driver-link driver-link-heading", cleanOperator.playerId),
      replaceTokens(t("funStatsAwardCleanOperatorNote"), { value: cleanOperator.penaltyPoints, starts: cleanOperator.starts }),
      "clean"
    ),
    hotLapHero && renderFunStatsAwardCard(
      "funStatsAwardHotLapHero",
      renderDriverLink(hotLapHero.driver, hotLapHero.publicId, "driver-link driver-link-heading", hotLapHero.playerId),
      replaceTokens(t("funStatsAwardHotLapHeroNote"), { lap: hotLapHero.lap }),
      "accent"
    ),
    chaosMagnet && renderFunStatsAwardCard(
      "funStatsAwardChaosMagnet",
      renderDriverLink(chaosMagnet.driver, chaosMagnet.publicId, "driver-link driver-link-heading", chaosMagnet.playerId),
      replaceTokens(t("funStatsAwardChaosMagnetNote"), { value: chaosMagnet.penaltyPoints }),
      "danger"
    ),
    garageFavorite && renderFunStatsAwardCard(
      "funStatsAwardGarageFavorite",
      renderCarLink(garageFavorite.car, "driver-link driver-link-heading"),
      replaceTokens(t("funStatsAwardGarageFavoriteNote"), { value: garageFavorite.starts }),
      "neutral"
    )
  ].filter(Boolean).join("");

  leaderboardsEl.innerHTML = [
    renderFunStatsListCard(
      "funStatsListActive",
      data.lists.active.map(item => ({
        label: renderDriverLink(item.driver, item.publicId, "driver-link", item.playerId),
        value: item.starts
      })),
      item => replaceTokens(t("funStatsListStartsValue"), { value: item.value })
    ),
    renderFunStatsListCard(
      "funStatsListMovers",
      data.lists.movers.map(item => ({
        label: renderDriverLink(item.driver, item.publicId, "driver-link", item.playerId),
        value: item.positionsGain
      })),
      item => replaceTokens(t("funStatsListGainValue"), { value: item.value })
    ),
    renderFunStatsListCard(
      "funStatsListClean",
      data.lists.clean.map(item => ({
        label: renderDriverLink(item.driver, item.publicId, "driver-link", item.playerId),
        value: item.penaltyPoints
      })),
      item => replaceTokens(t("funStatsListPenaltyValue"), { value: item.value })
    ),
    renderFunStatsListCard(
      "funStatsListStable",
      data.lists.stable.map(item => ({
        label: renderDriverLink(item.driver, item.publicId, "driver-link", item.playerId),
        value: item.averageFinish
      })),
      item => replaceTokens(t("funStatsListAvgFinishValue"), { value: Number(item.value).toFixed(2) })
    ),
    renderFunStatsListCard(
      "funStatsListFastest",
      data.lists.fastest.map(item => ({
        label: renderDriverLink(item.driver, item.publicId, "driver-link", item.playerId),
        value: item.fastestLapAwards
      })),
      item => replaceTokens(t("funStatsListFastestLapValue"), { value: item.value })
    ),
    renderFunStatsListCard(
      "funStatsListCars",
      data.lists.cars.map(item => ({
        label: renderCarLink(item.car, "driver-link"),
        value: item.starts
      })),
      item => replaceTokens(t("funStatsListCarValue"), { value: item.value })
    )
  ].join("");
}

function bindFunStatsControls() {
  document.querySelectorAll("[data-fun-period]").forEach(button => {
    button.addEventListener("click", () => {
      const nextPeriod = button.dataset.funPeriod;
      if (!nextPeriod || nextPeriod === funStatsPeriod) return;
      funStatsPeriod = nextPeriod;
      renderFunStatsPage();
      applyRevealAnimations();
    });
  });
}

function getBestLapClass(isHighlighted) {
  return isHighlighted ? "best-lap-value" : "";
}

function getFastestLapMs(items = [], key = "best_lap_ms") {
  const values = items
    .map(item => item?.[key])
    .filter(value => typeof value === "number" && value > 0);
  return values.length ? Math.min(...values) : null;
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

async function loadHourlyAnnouncementData() {
  try {
    const data = await loadJson(hourlyAnnouncementUrl);
    return data && typeof data === "object" ? data : null;
  } catch (error) {
    console.warn("hourly announcement is unavailable.", error);
    return null;
  }
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
  const data = await loadJson(`${TOP_DATA_BASE_URL}/drivers/${encodeURIComponent(publicId)}.json`);
  return data && typeof data === "object" ? data : null;
}

async function loadDriverProfileCached(publicId) {
  if (!publicId) return null;
  if (!driverProfileCache.has(publicId)) {
    driverProfileCache.set(
      publicId,
      loadDriverProfile(publicId).catch((error) => {
        driverProfileCache.delete(publicId);
        throw error;
      })
    );
  }
  return driverProfileCache.get(publicId);
}

async function loadDriverIndex() {
  const data = await loadJson(driverIndexUrl);
  return Array.isArray(data) ? data : [];
}

function applyStaticTranslations() {
  document.documentElement.lang = t("htmlLang");
  document.title = IS_DRIVER_PAGE
    ? t("pageTitleDriver")
    : IS_CARS_PAGE
      ? t("pageTitleCars")
      : IS_FUN_STATS_PAGE
        ? t("pageTitleFunStats")
        : IS_RACES_PAGE
          ? t("pageTitleRaces")
          : t("pageTitle");

  const descriptionMeta = document.querySelector('meta[name="description"]');
  const ogDescriptionMeta = document.querySelector('meta[property="og:description"]');
  const twitterDescriptionMeta = document.querySelector('meta[name="twitter:description"]');
  const ogLocaleMeta = document.querySelector('meta[property="og:locale"]');

  if (!IS_RACES_PAGE) {
    if (descriptionMeta) {
      descriptionMeta.setAttribute("content", IS_FUN_STATS_PAGE ? t("metaDescriptionFunStats") : t("metaDescription"));
    }
    if (ogDescriptionMeta) {
      ogDescriptionMeta.setAttribute("content", IS_FUN_STATS_PAGE ? t("ogDescriptionFunStats") : t("ogDescription"));
    }
    if (twitterDescriptionMeta) {
      twitterDescriptionMeta.setAttribute("content", IS_FUN_STATS_PAGE ? t("twitterDescriptionFunStats") : t("twitterDescription"));
    }
    if (ogLocaleMeta) {
      ogLocaleMeta.setAttribute("content", t("ogLocale"));
    }
  }

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    const value = t(key);
    if (value !== undefined) el.innerHTML = value;
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach(el => {
    const key = el.dataset.i18nAriaLabel;
    const value = t(key);
    if (value !== undefined) el.setAttribute("aria-label", value);
  });

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
    btn.setAttribute("aria-pressed", btn.dataset.lang === currentLang ? "true" : "false");
  });

  const leaderboardInput = document.getElementById("leaderboard-search");
  const bestlapsInput = document.getElementById("bestlaps-search");
  const safetyInput = document.getElementById("safety-search");
  const racesInput = document.getElementById("races-search");
  const carsInput = document.getElementById("cars-search");

  if (leaderboardInput) leaderboardInput.placeholder = t("leaderboardSearchPlaceholder");
  if (bestlapsInput) bestlapsInput.placeholder = t("bestlapsSearchPlaceholder");
  if (safetyInput) safetyInput.placeholder = t("safetySearchPlaceholder");
  if (racesInput) racesInput.placeholder = t("racesSearchPlaceholder");
  if (carsInput) carsInput.placeholder = t("carsSearchPlaceholder");

  const bestLapNoteEl = document.getElementById("best-lap-note");
  if (bestlapsData.length > 0 && bestLapNoteEl) {
    updateBestLapNote(bestlapsData[0].driver, bestlapsData[0].track, bestlapsData[0].car_name);
  } else if (bestLapNoteEl) {
    bestLapNoteEl.textContent = t("bestLapNoteFallback");
  }

  updateDriverOfDayButtonLabel();
  renderTwitchWidget();
  renderTopGuide();
  document.getElementById("top-nav-more")?.rebuildOverflowMenu?.();
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

function getFocusableElements(container) {
  if (!container) return [];
  return [...container.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter(el => !el.hasAttribute("hidden") && el.getAttribute("aria-hidden") !== "true");
}

function createModalController({ modalId, closeButtonId, openButtonId, onOpen, onClose }) {
  const modal = document.getElementById(modalId);
  const closeBtn = document.getElementById(closeButtonId);
  const openBtn = openButtonId ? document.getElementById(openButtonId) : null;
  if (!modal || !closeBtn) return null;

  let lastFocusedElement = null;

  const close = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (typeof onClose === "function") onClose();
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  };

  const open = (trigger = null) => {
    lastFocusedElement = trigger || document.activeElement;
    if (typeof onOpen === "function") onOpen();
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    window.requestAnimationFrame(() => {
      const [firstFocusable] = getFocusableElements(modal);
      (firstFocusable || closeBtn).focus();
    });
  };

  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = getFocusableElements(modal);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  if (openBtn) {
    openBtn.addEventListener("click", () => open(openBtn));
  }

  return { modal, open, close };
}

function shouldIgnoreDriverPreviewTrigger(target) {
  return Boolean(target?.closest("a, button, input, select, textarea, summary"));
}

function getDriverPreviewTriggerRow(target, tableRoot) {
  const row = target?.closest?.("tr[data-driver-preview='true']");
  if (!row || (tableRoot && !tableRoot.contains(row))) return null;
  return row;
}

function openDriverPreviewFromRowElement(rowEl, trigger) {
  const publicId = rowEl?.dataset?.publicId || null;
  const playerId = rowEl?.dataset?.playerId || null;
  const driver = rowEl?.dataset?.driverName || "-";
  if (!publicId || !driverPreviewModalController) return;

  driverPreviewState = {
    publicId,
    playerId,
    driver,
    href: getDriverProfileHref(publicId, playerId),
    loading: true,
    error: false,
    profile: null
  };

  driverPreviewModalController.open(trigger || rowEl);
  renderDriverPreviewModal();

  loadDriverProfileCached(publicId)
    .then((profile) => {
      if (!driverPreviewState || driverPreviewState.publicId !== publicId) return;
      driverPreviewState = {
        ...driverPreviewState,
        loading: false,
        error: !profile,
        profile: profile || null,
      };
      renderDriverPreviewModal();
    })
    .catch(() => {
      if (!driverPreviewState || driverPreviewState.publicId !== publicId) return;
      driverPreviewState = {
        ...driverPreviewState,
        loading: false,
        error: true,
        profile: null,
      };
      renderDriverPreviewModal();
    });
}

function bindDriverPreviewTableInteractions(tableRoot) {
  if (!tableRoot || tableRoot.dataset.driverPreviewBound === "true") return;

  tableRoot.addEventListener("click", (event) => {
    if (shouldIgnoreDriverPreviewTrigger(event.target)) return;
    const row = getDriverPreviewTriggerRow(event.target, tableRoot);
    if (!row) return;
    openDriverPreviewFromRowElement(row, row);
  });

  tableRoot.addEventListener("keydown", (event) => {
    const row = getDriverPreviewTriggerRow(event.target, tableRoot);
    if (!row) return;
    if (shouldIgnoreDriverPreviewTrigger(event.target)) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openDriverPreviewFromRowElement(row, row);
  });

  tableRoot.dataset.driverPreviewBound = "true";
}

function applyRevealAnimations() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const targets = document.querySelectorAll(
    ".hero-card, .pilot-card, .mini-stat, .driver-stat-card, .driver-highlight-card, .race-summary-card, .fun-summary-card, .fun-award-card, .fun-list-card"
  );

  if (!("IntersectionObserver" in window)) {
    targets.forEach(el => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14 });

  targets.forEach((el, index) => {
    if (el.classList.contains("is-visible")) return;
    el.classList.add("reveal-ready");
    el.style.setProperty("--reveal-delay", `${Math.min(index * 20, 180)}ms`);
    observer.observe(el);
  });
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

function formatTrendNumber(value, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const rounded = Number(value.toFixed(digits));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits).replace(/\.?0+$/, "");
}

function formatTrendDelta(change, metric) {
  const delta = Math.abs(change?.delta ?? NaN);
  if (!Number.isFinite(delta) || delta === 0) return "";

  if (metric === "best_lap_ms" || metric === "average_pace_ms") {
    return delta >= 1000
      ? `${formatTrendNumber(delta / 1000, 3)}s`
      : `${formatTrendNumber(delta, 0)}ms`;
  }

  if (metric === "average_finish" || metric === "average_positions_delta") {
    return formatTrendNumber(delta, 2);
  }

  return formatTrendNumber(delta, 0);
}

function formatTrendTitleValue(metric, value) {
  if (value == null) return "-";
  if ((metric === "best_lap_ms" || metric === "average_pace_ms") && typeof value === "number") {
    return formatLapTimeFromMs(value) || String(value);
  }
  if (typeof value === "number") {
    return formatTrendNumber(value, 2);
  }
  return String(value);
}

function renderTrendBadge(change, metric, { compact = false } = {}) {
  if (!change || !change.trend || change.trend === "same") return "";

  const trendClass = change.trend === "up" ? "trend-up" : "trend-down";
  const arrow = change.trend === "up" ? "▲" : "▼";
  const deltaLabel = formatTrendDelta(change, metric);
  const beforeText = formatTrendTitleValue(metric, change.before);
  const afterText = formatTrendTitleValue(metric, change.after);
  const title = `${beforeText} -> ${afterText}`;

  return `
    <span class="trend-badge ${compact ? "trend-badge-compact" : ""} ${trendClass}" title="${escapeAttribute(title)}" aria-label="${escapeAttribute(title)}">
      <span class="trend-arrow">${arrow}</span>
      ${deltaLabel ? `<span class="trend-value">${escapeHtml(deltaLabel)}</span>` : ""}
    </span>
  `;
}

function renderRankBadgeWithTrend(rank, change) {
  return `
    <span class="rank-badge-wrap">
      <span class="rank-badge rank-${escapeHtml(rank)}">#${escapeHtml(rank)}</span>
      ${renderTrendBadge(change, "championship_rank", { compact: true })}
    </span>
  `;
}

function renderStatValueWithTrend(valueMarkup, change, metric) {
  return `
    <div class="stat-with-trend">
      <span>${valueMarkup}</span>
      ${renderTrendBadge(change, metric, { compact: true })}
    </div>
  `;
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

function renderTop3Compact(data) {
  if (!Array.isArray(data) || !data.length) {
    return `<div class="empty-box">${escapeHtml(t("emptyTop3"))}</div>`;
  }

  const top3 = data.slice(0, 3);
  const classes = ["top1", "top2", "top3"];

  return top3.map((row, index) => `
    <article class="pilot-card ${classes[index] || ""}">
      <div class="pilot-topline">
        <div class="pilot-rank-wrap">
          <div class="pilot-rank">#${escapeHtml(row.rank)}</div>
          ${renderTrendBadge(row.rank_change, "championship_rank", { compact: true })}
        </div>
        <h3 class="pilot-name">${renderDriverLink(row.driver, row.public_id, "driver-link driver-link-heading", row.player_id)}</h3>
        ${renderCarImage(row, { className: "car-thumb car-thumb-inline pilot-topline-car", alt: row.best_lap_car_name || row.car_name || "" })}
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
  return renderSortableHeaders(leaderboardColumns, t("leaderboardCols"), leaderboardSort);
}

function renderBestlapsHeaders() {
  return renderSortableHeaders(bestlapsColumns, t("bestlapsCols"), bestlapsSort);
}

function bindLeaderboardSortHandlers() {
  bindSortableHeaders("#leaderboard-table th[data-sort-key]", leaderboardSort, (key) => {
    leaderboardSort = cycleSort(leaderboardSort, key);
    leaderboardPage = 1;
    renderLeaderboardTablePage();
  });
}

function bindBestlapsSortHandlers() {
  bindSortableHeaders("#bestlaps-table th[data-sort-key]", bestlapsSort, (key) => {
    bestlapsSort = cycleSort(bestlapsSort, key);
    bestlapsPage = 1;
    renderBestLapsTablePage();
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
    <tr ${buildDriverPreviewRowAttributes(row)}>
      <td>${renderRankBadgeWithTrend(row.rank, row.rank_change)}</td>
      <td>
        <div class="driver-cell">
          <div class="driver-avatar">${escapeHtml(initials(row.driver))}</div>
          <div class="driver-name-wrap">
            <div class="driver-name">${renderDriverLink(row.driver, row.public_id, "driver-link", row.player_id)}</div>
            ${renderDriverNameMeta(row)}
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
  bindDriverPreviewTableInteractions(tableEl);

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
    <tr ${buildDriverPreviewRowAttributes(row)}>
      <td>
        <span class="rank-badge-wrap">
          <span class="rank-badge rank-${escapeHtml(row.rank)}">#${escapeHtml(row.rank)}</span>
          ${renderTrendBadge(row.rank_change, "bestlap_rank", { compact: true })}
        </span>
      </td>
      <td>
        <div class="driver-cell">
          <div class="driver-avatar">${escapeHtml(initials(row.driver))}</div>
          <div class="driver-name-wrap">
            <div class="driver-name">${renderDriverLink(row.driver, row.public_id, "driver-link", row.player_id)}</div>
            ${renderDriverNameMeta(row)}
          </div>
        </div>
      </td>
      <td>${renderStatValueWithTrend(escapeHtml(row.best_lap ?? "-"), row.latest_changes?.best_lap_ms, "best_lap_ms")}</td>
      <td><span class="car-label-inline">${renderCarImage(row, { className: "car-thumb car-thumb-inline", alt: row.car_name || "" })}<span>${escapeHtml(row.car_name ?? "-")}</span></span></td>
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
  bindDriverPreviewTableInteractions(tableEl);

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
  return renderSortableHeaders(getSafetyColumns(), null, safetySort);
}

function bindSafetySortHandlers() {
  bindSortableHeaders("#safety-table th[data-sort-key]", safetySort, (key) => {
    safetySort = cycleSort(safetySort, key);
    safetyPage = 1;
    renderSafetyTablePage();
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

function bindTopNavMoreMenu() {
  const root = document.getElementById("top-nav-more");
  const toggle = document.getElementById("top-nav-more-toggle");
  const menu = document.getElementById("top-nav-more-menu");
  const navMenu = document.querySelector(".top-nav-menu");
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
      clone.className = "top-nav-more-link";
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

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  window.addEventListener("resize", () => {
    rebuildOverflowMenu();
  });

  requestAnimationFrame(rebuildOverflowMenu);
  window.addEventListener("load", rebuildOverflowMenu, { once: true });
  root.rebuildOverflowMenu = rebuildOverflowMenu;
  root.dataset.bound = "true";
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

function formatDateLocal(isoString, lang = "en") {
  if (!isoString) return "-";

  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short"
  }).format(date);
}

function getCurrentLangSafe() {
  if (typeof currentLang !== "undefined") return currentLang;
  return document.documentElement.lang === "ru" ? "ru" : "en";
}

function findDriverNameByPlayerId(playerId) {
  const found = findDriverRecordByPlayerId(playerId);
  return found?.driver || found?.name || found?.player || null;
}

function findPublicIdByPlayerId(playerId) {
  const found = findDriverRecordByPlayerId(playerId);
  if (found?.public_id) return found.public_id;
  return makePublicDriverId(playerId);
}

function findDriverRecordByPlayerId(playerId) {
  if (!playerId) return null;

  const dailyCandidates = [
    todayStatsData?.most_active_driver_today,
    todayStatsData?.most_successful_driver_today,
    driverOfDayData
  ];

  const dailyMatch = dailyCandidates.find(item => item?.player_id === playerId);
  if (dailyMatch) return dailyMatch;

  if (Array.isArray(leaderboardData)) {
    const found = leaderboardData.find(item => item.player_id === playerId || item.playerId === playerId);
    if (found) return found;
  }

  if (Array.isArray(driverIndexData)) {
    const found = driverIndexData.find(item => item.player_id === playerId || item.playerId === playerId);
    if (found) return found;
  }

  return null;
}

function formatLocalizedUpdatedLabel(updatedAt, lang = currentLang) {
  if (!updatedAt) return "-";
  return `${tForLang(lang, "updatedPrefix")}: ${formatDateTimeLocal(updatedAt, lang)}`;
}

function formatTodayActivityNote(value, lang = currentLang) {
  if (value == null) return "-";
  return replaceTokens(tForLang(lang, "todayRacesNote"), { value });
}

function formatTodayPointsNote(value, lang = currentLang) {
  if (value == null) return "-";
  return replaceTokens(tForLang(lang, "todayPointsNote"), { value });
}

function getLocalizedServerStatus(status, lang = currentLang) {
  const normalized = String(status || "offline").toLowerCase();
  if (normalized === "online") return tForLang(lang, "serverStatusOnline");
  if (normalized === "online_process_only") return tForLang(lang, "serverStatusDegraded");
  return tForLang(lang, "serverStatusOffline");
}

function resolveNamedServerStatus(serverStatus, name) {
  if (!serverStatus || typeof serverStatus !== "object") return null;
  if (serverStatus[name] && typeof serverStatus[name] === "object") return serverStatus[name];
  if (serverStatus.servers && typeof serverStatus.servers === "object" && serverStatus.servers[name] && typeof serverStatus.servers[name] === "object") {
    return serverStatus.servers[name];
  }
  return null;
}

function applyServerStatusClass(element, status) {
  if (!element) return;
  const normalized = String(status || "offline").toLowerCase();
  element.classList.remove("online", "offline", "degraded");
  element.classList.add(
    normalized === "online" ? "online" : normalized === "online_process_only" ? "degraded" : "offline"
  );
}

function updateServerCardBackgrounds() {
  const mainCard = document.getElementById("server-card-main");
  const sunsetCard = document.getElementById("server-card-sunset");
  if (mainCard) mainCard.style.setProperty("--server-card-bg", `url("${SERVER_CARD_BACKGROUNDS.main}")`);
  if (sunsetCard) sunsetCard.style.setProperty("--server-card-bg", `url("${SERVER_CARD_BACKGROUNDS.sunset}")`);
}

function humanizeTrackName(track) {
  if (!track) return "-";
  return String(track)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function isValidRaceTime(value) {
  return typeof value === "number" && value > 0 && value !== 2147483647 && value !== 4294967295;
}

function isActiveRaceResult(row) {
  if (!row || row.counted_for_stats === false) return false;
  if ((row.lap_count ?? 0) <= 0) return false;
  if (!isValidRaceTime(row.total_time_ms)) return false;
  return true;
}

function getResultCarName(row) {
  if (!row) return "-";
  if (row.car_name) return row.car_name;
  if (row.car_model != null && carModelNames[row.car_model]) return carModelNames[row.car_model];
  if (row.car_model_id != null && carModelNames[row.car_model_id]) return carModelNames[row.car_model_id];
  return "-";
}

function normalizeCarModelName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

function getCarModelId(row) {
  if (!row || typeof row !== "object") return null;

  const candidates = [
    row.car_model,
    row.car_model_id,
    row.best_lap_car_model,
    row.best_lap_car_model_id,
    row.carModel,
    row.carModelId
  ];

  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isInteger(numeric) && numeric >= 0 && carModelNames[numeric]) return numeric;
  }

  const nameCandidates = [
    row.car_name,
    row.best_lap_car_name,
    row.carName,
    row.bestLapCarName
  ]
    .map(normalizeCarModelName)
    .filter(Boolean);

  for (const [modelId, modelName] of Object.entries(carModelNames)) {
    if (nameCandidates.includes(normalizeCarModelName(modelName))) return Number(modelId);
  }

  return null;
}

function getCarImagePathByModelId(modelId, extension = "png") {
  if (!Number.isInteger(modelId) || modelId < 0) return "";
  return `${CAR_IMAGE_BASE_PATH}/${modelId}.${extension}`;
}

function renderCarImage(row, options = {}) {
  const {
    className = "car-thumb",
    alt = "",
    extension = "png"
  } = options;
  const modelId = getCarModelId(row);
  if (modelId == null) return "";

  const imagePath = getCarImagePathByModelId(modelId, extension);
  const imageAlt = alt || getResultCarName(row);

  return `<img class="${escapeHtml(className)}" src="${escapeHtml(imagePath)}" alt="${escapeHtml(imageAlt)}" loading="lazy" decoding="async" onerror="this.remove()">`;
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function updatePageQuery(params = {}) {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "" || value === "0") {
      url.searchParams.delete(key);
      return;
    }
    url.searchParams.set(key, value);
  });
  window.history.replaceState({}, "", url);
}

function getActiveFilterChips(items = []) {
  return items
    .filter(item => item && item.value)
    .map(item => `<span class="filter-chip"><span class="filter-chip-label">${escapeHtml(item.label)}:</span> ${escapeHtml(item.value)}</span>`)
    .join("");
}

function renderFilterMeta(containerId, { items = [], count = 0, onClearId = "" }) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const chips = getActiveFilterChips(items);
  const hasFilters = Boolean(chips);
  el.classList.toggle("is-empty", !hasFilters);
  el.innerHTML = `
    <div class="filter-meta-left">
      <div class="filter-meta-count">${escapeHtml(replaceTokens(t("resultsCount"), { count }))}</div>
      ${hasFilters ? `<div class="filter-chip-row">${chips}</div>` : ""}
    </div>
    ${hasFilters ? `<button class="btn btn-secondary btn-filter-clear" type="button" id="${escapeHtml(onClearId)}">${escapeHtml(t("clearFilters"))}</button>` : ""}
  `;

  if (!hasFilters || !onClearId) return;
  document.getElementById(onClearId)?.addEventListener("click", () => {
    if (containerId === "races-tools-meta") {
      racesSearch = "";
      racesTrackFilter = "";
      updatePageQuery({ q: null, track: null });
      renderRacesPage();
      return;
    }

    if (containerId === "cars-tools-meta") {
      carsSearch = "";
      carsMinRacesFilter = "0";
      updatePageQuery({ car: null, minRaces: null });
      renderCarsPage();
    }
  });
}

function filterRaces(data) {
  return [...data];
}

function getProcessedRaces() {
  return sortData(filterRaces(racesData), { key: "finished_at", direction: "desc" }, racesColumns);
}

function filterCars(data) {
  return [...data];
}

function renderRacesFilters() {
  return;
}

function renderCarsFilters() {
  return;
}

function renderRacesSummary() {
  const totalEl = document.getElementById("races-total-count");
  const avgActiveEl = document.getElementById("races-avg-active");
  const avgOvertakesEl = document.getElementById("races-avg-overtakes");
  const topWinnerEl = document.getElementById("races-top-winner");
  const winnerEl = document.getElementById("races-latest-winner");
  const lastWinnerBestLapEl = document.getElementById("races-last-winner-best-lap");
  const lastWinnerBestLapNoteEl = document.getElementById("races-last-winner-best-lap-note");
  if (!totalEl || !avgActiveEl || !avgOvertakesEl || !topWinnerEl || !winnerEl || !lastWinnerBestLapEl || !lastWinnerBestLapNoteEl) return;

  const processedRaces = getProcessedRaces();
  const latestRace = processedRaces[0];
  const winnerCounts = new Map();
  let activeDriversTotal = 0;
  let overtakesTotal = 0;

  processedRaces.forEach(race => {
    if (race?.winner) {
      const key = race.winner_public_id || race.winner;
      const existing = winnerCounts.get(key) || { count: 0, name: race.winner, publicId: race.winner_public_id };
      existing.count += 1;
      winnerCounts.set(key, existing);
    }

    const activeResults = (race.results || []).filter(isActiveRaceResult);
    activeDriversTotal += activeResults.length;
    overtakesTotal += activeResults.reduce((sum, row) => sum + Math.max(0, row?.positions_delta ?? 0), 0);
  });

  const topWinner = [...winnerCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0] || null;
  const latestWinnerRow = latestRace
    ? (latestRace.results || []).find(row =>
        (latestRace.winner_public_id && row.public_id === latestRace.winner_public_id) ||
        row.driver === latestRace.winner
      )
    : null;
  const latestWinnerCarName = getResultCarName(latestWinnerRow);

  
  totalEl.textContent = processedRaces.length || "-";
  avgActiveEl.textContent = processedRaces.length ? (activeDriversTotal / processedRaces.length).toFixed(2) : "-";
  avgOvertakesEl.textContent = processedRaces.length ? (overtakesTotal / processedRaces.length).toFixed(2) : "-";
  topWinnerEl.innerHTML = topWinner
    ? renderDriverLink(topWinner.name || t("noWinner"), topWinner.publicId, "driver-link")
    : t("noWinner");
  winnerEl.innerHTML = latestRace
    ? renderDriverLink(latestRace.winner || t("noWinner"), latestRace.winner_public_id, "driver-link")
    : t("noWinner");
  lastWinnerBestLapEl.textContent = latestWinnerRow?.best_lap || "-";
  lastWinnerBestLapNoteEl.textContent = latestWinnerCarName;
}

function renderRacesTablePage() {
  const tableEl = document.getElementById("races-table");
  const wrapEl = document.getElementById("races-pagination-wrap");
  if (!tableEl || !wrapEl) return;

  const result = paginate(getProcessedRaces(), racesPage, PAGE_SIZE);
  racesPage = result.page;

  if (!result.totalItems) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("emptyRaces"))}</div>`;
    wrapEl.style.display = "none";
    return;
  }

  const headers = t("racesCols").map(label => `<th>${escapeHtml(label)}</th>`).join("");
  const rows = result.items.map((race, index) => `
    <tr
      class="is-interactive-row"
      data-race-index="${escapeHtml(index)}"
      tabindex="0"
      role="button"
      aria-label="${escapeHtml(`${t("openRaceDetailsLabel")}: ${humanizeTrackName(race.track)}`)}"
    >
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

  bindInteractiveRows(tableEl, "tbody tr[data-race-index]", (row) => {
    const index = Number(row.dataset.raceIndex);
    openRaceResultsModal(result.items[index] || null, row);
  });

  renderPagination(
    "races-pagination",
    "races-pagination-info",
    "races-pagination-wrap",
    result.page,
    result.totalPages,
    result.totalItems,
    result.startIndex,
    result.endIndex,
    (page) => {
      racesPage = page;
      renderRacesTablePage();
      document.getElementById("races-table")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  );
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
      <div class="race-summary-value best-lap-value">${escapeHtml(selectedRace.best_lap || "-")}</div>
    </div>
  `;

  const headers = t("raceModalCols").map(label => `<th>${escapeHtml(label)}</th>`).join("");
  const highlightedDriverPublicId = IS_DRIVER_PAGE ? driverProfileData?.public_id : null;
  const rows = (selectedRace.results || []).map(row => `
    <tr class="${row.public_id && highlightedDriverPublicId && row.public_id === highlightedDriverPublicId ? "race-result-row-highlight" : ""}">
      <td>${renderRankBadgeWithTrend(row.position, row.rank_change)}</td>
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
        <div class="${getBestLapClass(Boolean(row.had_best_lap))}">${escapeHtml(row.best_lap || "-")}</div>
        <div class="race-note">${row.had_best_lap ? escapeHtml(t("raceBestLapBadge")) : ""}</div>
      </td>
      <td>
        <div>${renderCarLink(row.car_name || "-", "driver-link driver-link-subtle")}</div>
        <div class="race-note">${row.counted_for_stats === false ? escapeHtml(t("notCountedBadge")) : ""}</div>
      </td>
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

let raceResultsModalController = null;
let driverOfDayModalController = null;
let todayStatsModalController = null;

function openRaceResultsModal(race, trigger = null) {
  if (!raceResultsModalController || !race) return;
  selectedRace = race;
  raceResultsModalController.open(trigger);
}

function initRaceResultsModal() {
  raceResultsModalController = createModalController({
    modalId: "race-results-modal",
    closeButtonId: "race-results-close",
    onOpen: renderRaceResultsModal,
    onClose: () => {
      selectedRace = null;
    }
  });
}

function initDriverPreviewModal() {
  driverPreviewModalController = createModalController({
    modalId: "driver-preview-modal",
    closeButtonId: "driver-preview-close",
    onOpen: renderDriverPreviewModal,
    onClose: () => {
      driverPreviewState = null;
      renderDriverPreviewModal();
    }
  });
}

function renderRacesPage() {
  renderRacesSummary();
  renderRacesTablePage();
  renderRaceResultsModal();
}

function getRaceById(raceId) {
  if (!raceId || !Array.isArray(racesData)) return null;
  return racesData.find(race => race?.race_id === raceId) || null;
}

function renderCarsSummary() {
  const totalEl = document.getElementById("cars-total-count");
  const winnerEl = document.getElementById("cars-top-winner");
  const usedEl = document.getElementById("cars-most-used");
  const spotlightEl = document.getElementById("cars-hero-spotlight");
  const spotlightMediaEl = document.getElementById("cars-hero-spotlight-media");
  const spotlightNameEl = document.getElementById("cars-hero-spotlight-name");
  const spotlightRacesEl = document.getElementById("cars-hero-spotlight-races");
  const spotlightWinsEl = document.getElementById("cars-hero-spotlight-wins");
  if (!totalEl || !winnerEl) return;

  const processedCars = getProcessedCars();
  totalEl.textContent = processedCars.length || "—";
  const topWinner = processedCars[0] || null;
  const mostUsed = [...processedCars].sort((a, b) => {
    const racesDiff = (b?.races ?? 0) - (a?.races ?? 0);
    if (racesDiff !== 0) return racesDiff;
    return String(a?.car_name || "").localeCompare(String(b?.car_name || ""));
  })[0] || null;

  winnerEl.innerHTML = topWinner ? renderCarLink(topWinner.car_name, "driver-link") : "—";
  if (usedEl) {
    usedEl.innerHTML = mostUsed ? renderCarLink(mostUsed.car_name, "driver-link") : "—";
  }

  if (spotlightEl && spotlightMediaEl && spotlightNameEl && spotlightRacesEl && spotlightWinsEl) {
    if (mostUsed) {
      spotlightEl.hidden = false;
      spotlightMediaEl.innerHTML = renderCarImage(
        mostUsed,
        { className: "cars-hero-spotlight-image", alt: mostUsed.car_name || "" }
      );
      spotlightNameEl.innerHTML = renderCarLink(mostUsed.car_name || "—", "driver-link");
      spotlightRacesEl.textContent = String(mostUsed.races ?? 0);
      spotlightWinsEl.textContent = String(mostUsed.wins ?? 0);
    } else {
      spotlightEl.hidden = true;
      spotlightMediaEl.innerHTML = "";
      spotlightNameEl.textContent = "—";
      spotlightRacesEl.textContent = "—";
      spotlightWinsEl.textContent = "—";
    }
  }
}

function renderCarsPage() {
  renderCarsSummary();
  renderCarsTable();
}

function renderCarsTable() {
  const tableEl = document.getElementById("cars-table");
  if (!tableEl) return;

  const rowsData = getProcessedCars();
  const fastestLapMs = getFastestLapMs(rowsData);

  if (!rowsData.length) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("emptyRaces"))}</div>`;
    return;
  }

  const headers = t("carsCols").map((label, index) => `
    <th class="sortable ${getSortClass(carsSort, carsColumns[index].key)}" data-sort-key="${carsColumns[index].key}" tabindex="0" role="button" aria-sort="${getAriaSort(carsSort, carsColumns[index].key)}">
      ${escapeHtml(label)}
    </th>
  `).join("");

  const rows = rowsData.map(row => `
    <tr>
      <td><span class="car-label-inline">${renderCarImage(row, { className: "car-thumb car-thumb-inline", alt: row.car_name || "" })}${renderCarLink(row.car_name || "—", "driver-link")}</span></td>
      <td>${escapeHtml(row.races ?? 0)}</td>
      <td>${escapeHtml(row.wins ?? 0)}</td>
      <td>${escapeHtml(formatPercent(row.win_rate))}</td>
      <td>${escapeHtml(row.podiums ?? 0)}</td>
      <td>${escapeHtml(row.unique_drivers ?? 0)}</td>
      <td>${escapeHtml(formatAverageFinish(row.average_finish))}</td>
      <td>${escapeHtml(row.fastest_lap_awards ?? 0)}</td>
      <td>
        <div class="${getBestLapClass(row.best_lap_ms === fastestLapMs)}">${escapeHtml(row.best_lap || "—")}</div>
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

  bindSortableHeaders("#cars-table th.sortable", carsSort, (key) => {
    carsSort = cycleSort(carsSort, key);
    renderCarsTable();
  });
}

function renderRecentForm(items = []) {
  if (!Array.isArray(items) || !items.length) return `<span class="empty-inline">-</span>`;
  return items.map(item => `<span class="form-pill">${escapeHtml(item)}</span>`).join("");
}

function buildDriverHeroTitle(profile) {
  if (!profile) return "-";
  const rankInfo = getDriverRankInfo(profile);
  return `
    <span class="driver-title-name">${escapeHtml(profile.driver || "-")}</span>
    ${rankInfo ? `<span class="driver-rank-pill ${escapeHtml(rankInfo.rankClass)}" title="${escapeAttribute(t("driverRankingPosition"))}"><span class="driver-rank-label">${escapeHtml(t("driverRankingPosition"))}:</span><span class="driver-rank-value">#${escapeHtml(rankInfo.rank)}</span>${renderTrendBadge(rankInfo.change, "championship_rank", { compact: true })}</span>` : ""}
  `;
}

function buildDriverStatsMarkup(profile) {
  if (!profile) {
    return `<div class="empty-box">${escapeHtml(t("driverNoData"))}</div>`;
  }

  const summary = profile.summary || {};
  const favoriteCarName = getFavoriteCarName(profile);
  const averagePace = summary.average_pace ?? "-";

  return `
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryPoints"))}</div>
      <div class="driver-stat-value">${renderStatValueWithTrend(escapeHtml(summary.points ?? 0), summary.latest_changes?.points, "points")}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryAvgFinish"))}</div>
      <div class="driver-stat-value">${renderStatValueWithTrend(escapeHtml(summary.average_finish ?? "-"), summary.latest_changes?.average_finish, "average_finish")}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryAvgPoints"))}</div>
      <div class="driver-stat-value">${escapeHtml(summary.average_points_per_race ?? 0)}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryRaces"))}</div>
      <div class="driver-stat-value">${renderStatValueWithTrend(escapeHtml(summary.races ?? 0), summary.latest_changes?.races, "races")}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryWins"))}</div>
      <div class="driver-stat-value">${escapeHtml(summary.wins ?? 0)}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverWinRate"))}</div>
      <div class="driver-stat-value">${escapeHtml(summary.win_rate ?? 0)}%</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryAvgGain"))}</div>
      <div class="driver-stat-value">${renderStatValueWithTrend(renderPositionsDelta(summary.average_positions_delta), summary.latest_changes?.average_positions_delta, "average_positions_delta")}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryPodiums"))}</div>
      <div class="driver-stat-value">${renderStatValueWithTrend(escapeHtml(summary.podiums ?? 0), summary.latest_changes?.podiums, "podiums")}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverPodiumRate"))}</div>
      <div class="driver-stat-value">${escapeHtml(summary.podium_rate ?? 0)}%</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryBestLap"))}</div>
      <div class="driver-stat-value driver-stat-mainline">
        <span class="best-lap-value stat-with-trend">${escapeHtml(summary.best_lap ?? "-")}${renderTrendBadge(summary.latest_changes?.best_lap_ms, "best_lap_ms", { compact: true })}</span>
        <span class="driver-stat-side">${renderCarLink(summary.best_lap_car_name ?? "-", "driver-link driver-link-subtle")}</span>
      </div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverSummaryAvgPace"))}</div>
      <div class="driver-stat-value">${renderStatValueWithTrend(escapeHtml(averagePace), summary.latest_changes?.average_pace_ms, "average_pace_ms")}</div>
    </div>
    <div class="driver-stat-card">
      <div class="driver-stat-label">${escapeHtml(t("driverFavoriteCar"))}</div>
      <div class="driver-stat-value">${renderCarLink(favoriteCarName || "-", "driver-link driver-link-heading")}</div>
    </div>
  `;
}

function buildDriverHighlightsMarkup(profile) {
  if (!profile) return "";
  const summary = profile.summary || {};

  return `
    <div class="driver-highlight-card">
      <div class="driver-highlight-label">${escapeHtml(t("driverRecentForm"))}</div>
      <div class="driver-highlight-value">${renderRecentForm(profile.recent_form)}</div>
    </div>
    <div class="driver-highlight-card">
      <div class="driver-highlight-label">${escapeHtml(t("driverSummaryFastestLaps"))}</div>
      <div class="driver-highlight-value">${escapeHtml(summary.fastest_lap_awards ?? 0)}</div>
    </div>
    <div class="driver-highlight-card">
      <div class="driver-highlight-label">${escapeHtml(t("driverSummaryPenaltyPoints"))}</div>
      <div class="driver-highlight-value">${escapeHtml(summary.penalty_points ?? 0)}</div>
    </div>
  `;
}

function renderDriverRaceHistory() {
  const tableEl = document.getElementById("driver-races-table");
  if (!tableEl) return;

  const rawData = Array.isArray(driverProfileData?.race_history) ? driverProfileData.race_history : [];
  const rowsData = sortData(rawData, driverRaceSort, driverRaceColumns);
  const fastestLapMs = getFastestLapMs(rawData);
  if (!rowsData.length) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("driverNoData"))}</div>`;
    return;
  }

  const headers = renderSortableHeaders(driverRaceColumns, t("driverRaceCols"), driverRaceSort);
  const rows = rowsData.map(row => `
    <tr
      class="is-interactive-row"
      data-race-id="${escapeAttribute(row.race_id || "")}"
      tabindex="0"
      role="button"
      aria-label="${escapeAttribute(`${t("openRaceDetailsLabel")}: ${humanizeTrackName(row.track)}`)}"
    >
      <td>${escapeHtml(formatDateTimeLocal(row.finished_at, currentLang))}</td>
      <td>${escapeHtml(humanizeTrackName(row.track))}</td>
      <td>${escapeHtml(formatStartPosition(row))}</td>
      <td>${renderStatValueWithTrend(escapeHtml(row.position ?? "-"), row.rank_change, "championship_rank")}</td>
      <td>${renderPositionsDelta(row.positions_delta)}</td>
      <td>${escapeHtml(row.points ?? 0)}</td>
      <td><span class="${getBestLapClass(row.best_lap_ms === fastestLapMs)}">${escapeHtml(row.best_lap ?? "-")}</span></td>
      <td>
        <div>${renderCarLink(row.car_name ?? "-", "driver-link driver-link-subtle")}</div>
        <div class="race-note">${row.counted_for_stats === false ? escapeHtml(t("notCountedBadge")) : ""}</div>
      </td>
      <td>${escapeHtml(row.gap ?? "-")}</td>
      <td>${escapeHtml(row.penalty_points ?? 0)}</td>
    </tr>
  `).join("");

  tableEl.innerHTML = `
    <table class="driver-races-table">
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  bindSortableHeaders("#driver-races-table th.sortable", driverRaceSort, (key) => {
    driverRaceSort = cycleSort(driverRaceSort, key);
    renderDriverRaceHistory();
  });

  bindInteractiveRows(tableEl, "tbody tr[data-race-id]", (row) => {
    const race = getRaceById(row.dataset.raceId);
    openRaceResultsModal(race, row);
  });
}

function renderDriverTrackStats() {
  const tableEl = document.getElementById("driver-tracks-table");
  if (!tableEl) return;

  const rawData = Array.isArray(driverProfileData?.track_stats) ? driverProfileData.track_stats : [];
  const rowsData = sortData(rawData, driverTrackSort, driverTrackColumns);
  if (!rowsData.length) {
    tableEl.innerHTML = `<div class="empty-box">${escapeHtml(t("driverNoData"))}</div>`;
    return;
  }

  const headers = renderSortableHeaders(driverTrackColumns, t("driverTrackCols"), driverTrackSort);
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

  bindSortableHeaders("#driver-tracks-table th.sortable", driverTrackSort, (key) => {
    driverTrackSort = cycleSort(driverTrackSort, key);
    renderDriverTrackStats();
  });
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

function getDriverRankInfo(profile) {
  const publicId = profile?.public_id;
  const rankingSource = Array.isArray(driverIndexData) && driverIndexData.length
    ? driverIndexData
    : Array.isArray(leaderboardData) && leaderboardData.length
      ? leaderboardData
      : [];
  if (!publicId || !rankingSource.length) return null;

  const index = rankingSource.findIndex(row => row?.public_id === publicId);
  if (index === -1) return null;

  return {
    rank: profile?.summary?.championship_rank || index + 1,
    rankClass: index === 0 ? "rank-1" : index === 1 ? "rank-2" : index === 2 ? "rank-3" : "rank-default",
    change: profile?.summary?.latest_changes?.championship_rank || null,
  };
}

function getFavoriteCarName(profile) {
  const history = Array.isArray(profile?.race_history) ? profile.race_history : [];
  if (!history.length) return null;

  const counts = new Map();
  history.forEach(row => {
    const name = String(row?.car_name || "").trim();
    if (!name) return;
    counts.set(name, (counts.get(name) || 0) + 1);
  });

  if (!counts.size) return null;

  return [...counts.entries()]
    .sort((a, b) => {
      const countDiff = b[1] - a[1];
      if (countDiff !== 0) return countDiff;
      return a[0].localeCompare(b[0]);
    })[0][0];
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

  document.title = `${driverProfileData.driver} | ${t("pageTitleDriver")}`;
  nameEl.innerHTML = buildDriverHeroTitle(driverProfileData);
  subtitleEl.textContent = t("driverPageSubtitle");
  statsEl.innerHTML = buildDriverStatsMarkup(driverProfileData);
  highlightsEl.innerHTML = buildDriverHighlightsMarkup(driverProfileData);

  renderDriverRaceHistory();
  renderDriverTrackStats();
  renderPenaltyList("driver-penalty-reasons", driverProfileData.penalties?.reasons, "driverPenaltyReason");
  renderPenaltyList("driver-penalty-types", driverProfileData.penalties?.types, "driverPenaltyType");
}

function renderDriverPreviewModal() {
  const titleEl = document.getElementById("driver-preview-title");
  const subtitleEl = document.getElementById("driver-preview-subtitle");
  const statsEl = document.getElementById("driver-preview-stats");
  const highlightsEl = document.getElementById("driver-preview-highlights");
  const actionEl = document.getElementById("driver-preview-link");
  if (!titleEl || !subtitleEl || !statsEl || !highlightsEl || !actionEl) return;

  if (!driverPreviewState) {
    titleEl.textContent = "-";
    subtitleEl.textContent = t("driverPreviewSubtitle");
    statsEl.innerHTML = `<div class="loading">${escapeHtml(t("driverLoading"))}</div>`;
    highlightsEl.innerHTML = "";
    actionEl.hidden = true;
    return;
  }

  const profile = driverPreviewState.profile;
  if (driverPreviewState.loading) {
    titleEl.textContent = driverPreviewState.driver || "-";
    subtitleEl.textContent = t("driverPreviewSubtitle");
    statsEl.innerHTML = `<div class="loading">${escapeHtml(t("driverLoading"))}</div>`;
    highlightsEl.innerHTML = "";
  } else if (!profile || driverPreviewState.error) {
    titleEl.textContent = driverPreviewState.driver || "-";
    subtitleEl.textContent = t("driverPreviewSubtitle");
    statsEl.innerHTML = `<div class="empty-box">${escapeHtml(t("driverNoData"))}</div>`;
    highlightsEl.innerHTML = "";
  } else {
    titleEl.innerHTML = buildDriverHeroTitle(profile);
    subtitleEl.textContent = t("driverPreviewSubtitle");
    statsEl.innerHTML = buildDriverStatsMarkup(profile);
    highlightsEl.innerHTML = buildDriverHighlightsMarkup(profile);
  }

  if (driverPreviewState.href) {
    actionEl.href = driverPreviewState.href;
    actionEl.hidden = false;
  } else {
    actionEl.hidden = true;
  }
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
    mostActiveEl.innerHTML = `<span>-</span>`;
    mostActiveNoteEl.textContent = "-";
    mostSuccessfulEl.innerHTML = `<span>-</span>`;
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

  bestLapEl.innerHTML = `<span class="best-lap-value">${escapeHtml(stats.best_lap_today?.lap || "-")}</span><span class="today-detail-side-inline">${escapeHtml(stats.best_lap_today?.car_name || "-")}</span>`;
  bestLapNoteEl.textContent = stats.best_lap_today
    ? `${stats.best_lap_today.driver} · ${stats.best_lap_today.track}`
    : "-";

  const mostActiveName =
    findDriverNameByPlayerId(stats.most_active_driver_today?.player_id) ||
    stats.most_active_driver_today?.player_id ||
    "-";

  mostActiveEl.innerHTML = renderDriverLink(
    mostActiveName,
    stats.most_active_driver_today?.public_id || findPublicIdByPlayerId(stats.most_active_driver_today?.player_id),
    "driver-link",
    stats.most_active_driver_today?.player_id
  );
  mostActiveNoteEl.textContent = formatTodayActivityNote(stats.most_active_driver_today?.races, lang);

  mostSuccessfulEl.innerHTML = renderDriverLink(
    stats.most_successful_driver_today?.driver || "-",
    stats.most_successful_driver_today?.public_id || findPublicIdByPlayerId(stats.most_successful_driver_today?.player_id),
    "driver-link",
    stats.most_successful_driver_today?.player_id
  );
  mostSuccessfulNoteEl.textContent = formatTodayPointsNote(stats.most_successful_driver_today?.points, lang);

  updatedEl.textContent = formatLocalizedUpdatedLabel(stats.updated_at, lang);
}

function formatActivityDateLabel(dateStr, lang = currentLang) {
  if (!dateStr) return "-";
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const safeDate = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(safeDate.getTime())) return dateStr;
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(safeDate);
}

function formatActivityMonthLabel(monthStr, lang = currentLang) {
  if (!monthStr) return "-";
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const safeDate = new Date(`${monthStr}-01T12:00:00`);
  if (Number.isNaN(safeDate.getTime())) return monthStr;
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric"
  }).format(safeDate);
}

function getAvailableActivityMonths(days = []) {
  return [...new Set(days.map(day => String(day?.date || "").slice(0, 7)).filter(Boolean))]
    .sort((a, b) => String(b).localeCompare(String(a)));
}

function getSelectedActivityInsightsDay() {
  const days = Array.isArray(raceActivityInsights) ? raceActivityInsights : [];
  if (!days.length) return null;
  const months = getAvailableActivityMonths(days);
  if (!selectedActivityMonth || !months.includes(selectedActivityMonth)) {
    selectedActivityMonth = months[0] || null;
  }
  const visibleDays = selectedActivityMonth
    ? days.filter(day => String(day?.date || "").startsWith(selectedActivityMonth))
    : days;
  const matched = visibleDays.find(day => day?.date === selectedActivityDate);
  if (matched) return matched;
  selectedActivityDate = visibleDays[0]?.date || days[0]?.date || null;
  return visibleDays[0] || days[0] || null;
}

function buildActivitySummaryCard(label, value, accent = false) {
  return `
    <article class="activity-summary-card${accent ? " activity-summary-card-accent" : ""}">
      <div class="activity-summary-label">${escapeHtml(label)}</div>
      <div class="activity-summary-value">${escapeHtml(value)}</div>
    </article>
  `;
}

function renderOnlineActivityModal() {
  const daysEl = document.getElementById("online-activity-days");
  const monthsEl = document.getElementById("online-activity-months");
  const summaryEl = document.getElementById("online-activity-summary");
  const subtitleEl = document.getElementById("online-activity-subtitle");
  const primeTimeEl = document.getElementById("online-activity-prime-time");
  const hoursEl = document.getElementById("online-activity-hours");

  if (!daysEl || !monthsEl || !summaryEl || !subtitleEl || !primeTimeEl || !hoursEl) return;

  const days = Array.isArray(raceActivityInsights) ? raceActivityInsights : [];
  if (!days.length) {
    subtitleEl.textContent = t("onlineActivityEmpty");
    daysEl.innerHTML = "";
    monthsEl.innerHTML = "";
    summaryEl.innerHTML = `<div class="empty-box">${escapeHtml(t("onlineActivityEmpty"))}</div>`;
    primeTimeEl.textContent = t("onlineActivityEmpty");
    hoursEl.innerHTML = `<div class="empty-box">${escapeHtml(t("onlineActivityEmpty"))}</div>`;
    return;
  }

  const months = getAvailableActivityMonths(days);
  if (!selectedActivityMonth || !months.includes(selectedActivityMonth)) {
    selectedActivityMonth = months[0] || null;
  }
  monthsEl.innerHTML = months.map(month => `
    <option value="${escapeHtml(month)}"${month === selectedActivityMonth ? " selected" : ""}>
      ${escapeHtml(formatActivityMonthLabel(month, currentLang))}
    </option>
  `).join("");

  if (monthsEl.dataset.bound !== "true") {
    monthsEl.addEventListener("change", () => {
      selectedActivityMonth = monthsEl.value || selectedActivityMonth;
      selectedActivityDate = null;
      renderOnlineActivityModal();
    });
    monthsEl.dataset.bound = "true";
  }

  const selectedDay = getSelectedActivityInsightsDay();
  if (!selectedDay) return;
  const visibleDays = selectedActivityMonth
    ? days.filter(day => String(day?.date || "").startsWith(selectedActivityMonth))
    : days;

  subtitleEl.textContent = replaceTokens(t("onlineActivitySubtitle"), {
    date: formatActivityDateLabel(selectedDay.date, currentLang),
    score: selectedDay.activity_score ?? 0
  });

  daysEl.innerHTML = visibleDays.map(day => `
    <button
      class="activity-day-pill${day.date === selectedDay.date ? " is-active" : ""}"
      type="button"
      data-activity-date="${escapeHtml(day.date)}"
    >
      <span>${escapeHtml(formatActivityDateLabel(day.date, currentLang))}</span>
      <strong>${escapeHtml(day.activity_score ?? 0)}</strong>
    </button>
  `).join("");

  daysEl.querySelectorAll("[data-activity-date]").forEach(button => {
    if (button.dataset.bound === "true") return;
    button.addEventListener("click", () => {
      selectedActivityDate = button.dataset.activityDate || selectedActivityDate;
      renderOnlineActivityModal();
    });
    button.dataset.bound = "true";
  });

  const tracksLabel = Array.isArray(selectedDay.tracks) && selectedDay.tracks.length
    ? selectedDay.tracks.join(", ")
    : "-";
  const peakHour = selectedDay.peak_hour;

  summaryEl.innerHTML = [
    buildActivitySummaryCard(t("onlineActivityUniqueLabel"), selectedDay.unique_players ?? 0),
    buildActivitySummaryCard(t("onlineActivityRacesLabel"), selectedDay.races ?? 0),
    buildActivitySummaryCard(
      t("onlineActivityAvgPlayersLabel"),
      typeof selectedDay.avg_players_per_race === "number" ? selectedDay.avg_players_per_race.toFixed(2) : "-"
    ),
    buildActivitySummaryCard(t("onlineActivityTracksLabel"), tracksLabel),
    buildActivitySummaryCard(t("onlineActivityScoreLabel"), `${selectedDay.activity_score ?? 0}/100`, true)
  ].join("");

  primeTimeEl.textContent = peakHour
    ? replaceTokens(t("onlineActivityPrimeTime"), {
      hour: peakHour.label || `${peakHour.hour}:00`,
      score: peakHour.activity_score ?? 0
    })
    : t("onlineActivityEmpty");

  const hours = Array.isArray(selectedDay.hours) ? selectedDay.hours : [];
  hoursEl.innerHTML = hours.map(hour => {
    const height = hour.activity_score > 0 ? Math.max(8, hour.activity_score) : 2;
    const isPrime = peakHour && hour.hour === peakHour.hour;
    const tooltip = [
      hour.label || `${hour.hour}:00`,
      replaceTokens(t("onlineActivityHourRaces"), { value: hour.races ?? 0 }),
      replaceTokens(t("onlineActivityHourUnique"), { value: hour.unique_players ?? 0 })
    ].join(" • ");
    return `
      <article class="activity-hour-bar-card${isPrime ? " is-prime" : ""}" title="${escapeHtml(tooltip)}">
        <div class="activity-hour-unique">${escapeHtml(hour.unique_players ?? 0)}</div>
        <div class="activity-hour-bar-stage">
          <span class="activity-hour-bar-vertical" style="height:${height}%"></span>
        </div>
        <div class="activity-hour-axis-label">${escapeHtml(hour.hour)}</div>
      </article>
    `;
  }).join("");
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
  const bestLapTrackCard = bestLapTrackEl?.closest(".today-stat-card");
  const updatedEl = document.getElementById("driver-of-day-updated");
  const emptyEl = document.getElementById("driver-of-day-empty");

  if (!nameEl) return;
  if (bestLapTrackCard) bestLapTrackCard.hidden = true;

  if (!data || !data.driver) {
    nameEl.innerHTML = `<span>-</span>`;
    pointsEl.textContent = "-";
    racesEl.textContent = "-";
    winsEl.textContent = "-";
    avgFinishEl.textContent = "-";
    avgGainEl.textContent = "-";
    avgGainEl.classList.remove("delta-positive", "delta-negative");
    avgGainEl.classList.add("positions-delta", "delta-neutral");
    bestLapEl.textContent = "-";
    bestLapTrackEl.textContent = "";
    updatedEl.textContent = "-";
    if (emptyEl) emptyEl.textContent = t("driverOfDayNoData");
    if (emptyEl) emptyEl.hidden = false;
    if (contentEl) contentEl.classList.add("is-empty");
    return;
  }

  nameEl.innerHTML = renderDriverLink(
    data.driver || "-",
    data.public_id || findPublicIdByPlayerId(data.player_id),
    "driver-link",
    data.player_id
  );
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
  bestLapEl.innerHTML = `<span class="best-lap-value">${escapeHtml(data.best_lap || "-")}</span>`;
  bestLapTrackEl.textContent = "";
  updatedEl.textContent = formatLocalizedUpdatedLabel(data.updated_at, currentLang);

  if (emptyEl) emptyEl.hidden = true;
  if (contentEl) contentEl.classList.remove("is-empty");
}

function openDriverOfDayModal() {
  if (!driverOfDayModalController) return;
  driverOfDayModalController.open(document.getElementById("driver-of-day-btn"));
}

function initDriverOfDayModal() {
  driverOfDayModalController = createModalController({
    modalId: "driver-of-day-modal",
    closeButtonId: "driver-of-day-close",
    openButtonId: "driver-of-day-btn",
    onOpen: renderDriverOfDayModal
  });
}

function openTodayStatsModal() {
  if (!todayStatsModalController) return;
  todayStatsModalController.open(document.getElementById("today-stats-btn"));
}

function initTodayStatsModal() {
  todayStatsModalController = createModalController({
    modalId: "today-stats-modal",
    closeButtonId: "today-stats-close",
    openButtonId: "today-stats-btn",
    onOpen: renderTodayStatsModal
  });
}

function openOnlineActivityModal() {
  if (!onlineActivityModalController) return;
  onlineActivityModalController.open(document.getElementById("hero-online-card"));
}

function initOnlineActivityModal() {
  onlineActivityModalController = createModalController({
    modalId: "online-activity-modal",
    closeButtonId: "online-activity-close",
    onOpen: renderOnlineActivityModal
  });

  const cardEl = document.getElementById("hero-online-card");
  if (!cardEl || cardEl.dataset.activityModalBound === "true") return;

  cardEl.addEventListener("click", () => openOnlineActivityModal());
  cardEl.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openOnlineActivityModal();
  });
  cardEl.dataset.activityModalBound = "true";
}

function openHourlyHeroModal() {
  if (!hourlyHeroModalController || (!hourlyAnnouncementData?.event_id && !hourlyAnnouncementData?.track_name)) return;
  hourlyHeroModalController.open(document.getElementById("hero-hourly-card"));
}

function initHourlyHeroModal() {
  hourlyHeroModalController = createModalController({
    modalId: "hourly-details-modal",
    closeButtonId: "hourly-details-close",
    onOpen: renderHourlyHeroModal,
    onClose: () => applyHourlyModalTrackBackground("")
  });

  const cardEl = document.getElementById("hero-hourly-card");
  if (!cardEl || cardEl.dataset.modalBound === "true") return;

  const openFromCard = (event) => {
    if (event?.target?.closest?.("button, a")) return;
    openHourlyHeroModal();
  };

  cardEl.addEventListener("click", openFromCard);
  cardEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target?.closest?.("button, a")) return;
    event.preventDefault();
    openHourlyHeroModal();
  });
  cardEl.dataset.modalBound = "true";
}

function optimizeBackgroundMedia() {
  const video = document.querySelector(".site-bg-video");
  if (!video) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shouldUseStaticBackground =
    reduceMotion ||
    IS_DRIVER_PAGE ||
    IS_RACES_PAGE ||
    IS_CARS_PAGE ||
    IS_FUN_STATS_PAGE ||
    window.innerWidth < 900 ||
    navigator.connection?.saveData;

  if (shouldUseStaticBackground) {
    document.body.classList.add("lite-background");
    video.pause();
    video.removeAttribute("autoplay");
    return;
  }

  document.body.classList.remove("lite-background");
  const playPromise = video.play?.();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      document.body.classList.add("lite-background");
    });
  }
}

function updateTopNavModalOffset() {
  const topNav = document.getElementById("top-nav");
  const navHeight = topNav?.getBoundingClientRect?.().height || 0;
  const offset = Math.max(16, Math.ceil(navHeight) + 8);
  document.documentElement.style.setProperty("--top-nav-modal-offset", `${offset}px`);
}

function rerenderUI() {
  applyStaticTranslations();

  if (IS_DRIVER_PAGE) {
    renderDriverPage();
    renderRaceResultsModal();
    applyRevealAnimations();
    return;
  }

  if (IS_CARS_PAGE) {
    renderCarsPage();
    applyRevealAnimations();
    return;
  }

  if (IS_FUN_STATS_PAGE) {
    renderFunStatsPage();
    applyRevealAnimations();
    return;
  }

  if (IS_RACES_PAGE) {
    renderRacesPage();
    applyRevealAnimations();
    return;
  }

  const top3El = document.getElementById("top3-content");
  if (top3El) top3El.innerHTML = renderTop3Compact(leaderboardData);

  renderLeaderboardTablePage();
  renderBestLapsTablePage();
  renderSafetyTablePage();
  renderTodayStatsModal();
  renderOnlineActivityModal();
  renderDriverOfDayModal();
  renderDriverPreviewModal();
  renderHourlyHeroModal();
  renderHourlyHeroCard();
  renderOnlineWidget();
  applyRevealAnimations();
}

async function init() {
  updateServerCardBackgrounds();
  bindLanguageButtons();
  bindTopNavMoreMenu();
  bindFunStatsControls();
  bindSearchInputs();
  ensureTopGuide();
  initTwitchWidget();
  updateTopNavModalOffset();
  optimizeBackgroundMedia();
  window.addEventListener("resize", debounce(() => {
    updateTopNavModalOffset();
    optimizeBackgroundMedia();
  }, 120));
  if (IS_RACES_PAGE || IS_DRIVER_PAGE) {
    initRaceResultsModal();
  } else if (!IS_DRIVER_PAGE && !IS_CARS_PAGE) {
    initTodayStatsModal();
    initOnlineActivityModal();
    initDriverOfDayModal();
    initDriverPreviewModal();
    initHourlyHeroModal();
  }
  applyStaticTranslations();

  try {
    if (IS_DRIVER_PAGE) {
      const [profile, indexData, raceArchive] = await Promise.all([
        loadDriverProfile(getRequestedDriverId()),
        loadDriverIndex(),
        loadRacesData().catch(() => [])
      ]);
      driverProfileData = profile;
      driverIndexData = indexData;
      racesData = raceArchive;
      rerenderUI();
      return;
    }

    if (IS_CARS_PAGE) {
      carsData = await loadCarsData();
      rerenderUI();
      return;
    }

    if (IS_FUN_STATS_PAGE) {
      const [raceArchive, data] = await Promise.all([
        loadRacesData(),
        loadSiteData().catch(() => ({ safety: [] }))
      ]);
      racesData = raceArchive;
      safetyData = Array.isArray(data?.safety) ? data.safety : [];
      rerenderUI();
      return;
    }

    if (IS_RACES_PAGE) {
      racesData = await loadRacesData();
      rerenderUI();
      return;
    }

    const [data, hourlyAnnouncement, raceArchive] = await Promise.all([
      loadSiteData(),
      loadHourlyAnnouncementData(),
      loadRacesData().catch(() => [])
    ]);

    leaderboardData = data.leaderboard;
    bestlapsData = data.bestlaps;
    todayStatsData = data.globalStats;
    safetyData = data.safety;
    driverOfDayData = data.driverOfDay;
    onlineData = data.online;
    hourlyAnnouncementData = hourlyAnnouncement;
    racesData = Array.isArray(raceArchive) ? raceArchive : [];
    raceActivityInsights = buildRaceActivityInsights(racesData);
    await loadHourlyVotes(hourlyAnnouncementData);

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
    const mainServerStatusEl = document.getElementById("serverMainStatusValue");
    const mainServerPlayersEl = document.getElementById("serverMainPlayersValue");
    const sunsetServerStatusEl = document.getElementById("serverSunsetStatusValue");
    const sunsetServerPlayersEl = document.getElementById("serverSunsetPlayersValue");

    if (serverStatusEl && serverPlayersEl) {
      const totalPlayers =
        data.serverStatus && Number.isFinite(data.serverStatus.players_online)
          ? data.serverStatus.players_online
          : 0;

      serverStatusEl.textContent = t("serverTotalPlayersLabel");
      serverPlayersEl.textContent = totalPlayers;
      serverStatusEl.classList.remove("online", "offline", "degraded");
    }

    const mainServer = resolveNamedServerStatus(data.serverStatus, "main");
    const sunsetServer = resolveNamedServerStatus(data.serverStatus, "sunset");

    if (mainServerStatusEl && mainServerPlayersEl) {
      const mainStatus = String(mainServer?.status || "offline").toLowerCase();
      const mainPlayers = Number.isFinite(mainServer?.players_online) ? mainServer.players_online : 0;
      mainServerStatusEl.textContent = getLocalizedServerStatus(mainStatus, currentLang);
      mainServerPlayersEl.textContent = mainPlayers;
      applyServerStatusClass(mainServerStatusEl, mainStatus);
    }

    if (sunsetServerStatusEl && sunsetServerPlayersEl) {
      const sunsetStatus = String(sunsetServer?.status || "offline").toLowerCase();
      const sunsetPlayers = Number.isFinite(sunsetServer?.players_online) ? sunsetServer.players_online : 0;
      sunsetServerStatusEl.textContent = getLocalizedServerStatus(sunsetStatus, currentLang);
      sunsetServerPlayersEl.textContent = sunsetPlayers;
      applyServerStatusClass(sunsetServerStatusEl, sunsetStatus);
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

    if (IS_FUN_STATS_PAGE) {
      const summaryEl = document.getElementById("fun-stats-summary");
      const awardsEl = document.getElementById("fun-stats-awards");
      const leaderboardsEl = document.getElementById("fun-stats-leaderboards");
      if (summaryEl) {
        summaryEl.innerHTML = `<div class="empty-box">${escapeHtml(t("errorLoading"))}</div>`;
      }
      if (awardsEl) awardsEl.innerHTML = "";
      if (leaderboardsEl) leaderboardsEl.innerHTML = "";
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
    const mainServerStatusEl = document.getElementById("serverMainStatusValue");
    const mainServerPlayersEl = document.getElementById("serverMainPlayersValue");
    const sunsetServerStatusEl = document.getElementById("serverSunsetStatusValue");
    const sunsetServerPlayersEl = document.getElementById("serverSunsetPlayersValue");

    if (serverStatusEl) {
      serverStatusEl.textContent = t("serverTotalPlayersLabel");
      serverStatusEl.classList.remove("online", "offline", "degraded");
    }

    if (serverPlayersEl) {
      serverPlayersEl.textContent = "--";
    }

    if (mainServerStatusEl) {
      mainServerStatusEl.textContent = getLocalizedServerStatus("offline", currentLang);
      applyServerStatusClass(mainServerStatusEl, "offline");
    }

    if (mainServerPlayersEl) {
      mainServerPlayersEl.textContent = "--";
    }

    if (sunsetServerStatusEl) {
      sunsetServerStatusEl.textContent = getLocalizedServerStatus("offline", currentLang);
      applyServerStatusClass(sunsetServerStatusEl, "offline");
    }

    if (sunsetServerPlayersEl) {
      sunsetServerPlayersEl.textContent = "--";
    }
  }
}

document.addEventListener("DOMContentLoaded", init);

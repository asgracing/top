const leaderboardUrl = "./leaderboard.json";
const bestlapsUrl = "./bestlaps.json";
const PAGE_SIZE = 10;

let leaderboardData = [];
let bestlapsData = [];
let leaderboardPage = 1;
let bestlapsPage = 1;
let currentLang = localStorage.getItem("asgLang") || "en";
let leaderboardSearch = "";
let bestlapsSearch = "";
let leaderboardSort = { key: null, direction: null };
let bestlapsSort = { key: null, direction: null };

const translations = {
  en: {
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
    htmlLang: "en",
    pageTitle: "ASG Racing ACC Leaderboard | Assetto Corsa Competizione Stats",
    metaDescription: "ASG Racing ACC Leaderboard — race stats, wins, podiums and best laps from the public Assetto Corsa Competizione server.",
    ogDescription: "Race stats, wins, podiums and best laps from the ASG Racing server in Assetto Corsa Competizione.",
    twitterDescription: "Races, wins, podiums and best laps from the public ACC server of ASG Racing.",
    ogLocale: "en_US",
    heroTitle: "ACC Public Leaderboard",
    heroSubtitle: "Race statistics, wins, podiums and best laps from the <strong>ASG Racing</strong> server. Data is automatically updated based on dedicated server results.",
    btnChampionship: "Championship",
    btnBestLaps: "Best Laps",
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
    aboutTitle: "About ASG Racing Server",
    aboutSubtitle: "Assetto Corsa Competizione public racing server",
    aboutP1: "<strong>ASG Racing</strong> is a public <strong>Assetto Corsa Competizione</strong> server where drivers compete on popular GT3 tracks, improve their lap times and compare their statistics with other racers.",
    aboutP2: "This page automatically publishes the server leaderboard including:",
    aboutList1: "🏁 number of races",
    aboutList2: "🥇 wins",
    aboutList3: "🏆 podium finishes",
    aboutList4: "📊 average finish position",
    aboutList5: "⚡ best laps",
    aboutP3: "Statistics are generated automatically from <strong>ACC Dedicated Server</strong> result files. After each race the data is recalculated and published on the website.",
    pointsTitle: "How points are calculated",
    pointsP1: "Points are awarded using a GT-style system:",
    pointsList1: "1st place — 25 points",
    pointsList2: "2nd place — 18 points",
    pointsList3: "3rd place — 15 points",
    pointsList4: "4th–10th — decreasing points",
    pointsP2: "Drivers also receive <strong>1 additional point</strong> for the fastest lap in race.",
    bestLapsInfoTitle: "Best laps",
    bestLapsInfoP1: "The <strong>Best Laps</strong> table contains the fastest lap times recorded both in qualifying and in race sessions. This makes it easy to compare the outright pace of the drivers.",
    joinTitle: "Join the server",
    joinP1: "To participate in races and appear in the leaderboard, join the server:",
    serverName: "ASG Racing ACC Public Server",
    joinP2: "Community news and communication are available in our channels:",
    footerText: "Statistics are generated from ACC Dedicated Server result files and published via GitHub Pages.",
    loading: "Loading...",
    loadingLeaderboard: "Loading leaderboard...",
    loadingBestLaps: "Loading best laps...",
    emptyTop3: "No top-3 data available yet.",
    emptyLeaderboard: "No leaderboard data yet.",
    emptyBestLaps: "No best lap data yet.",
    emptySearch: "No matching drivers found.",
    errorLoading: "Data loading error.",
    errorLeaderboard: "Failed to load leaderboard.json",
    errorBestlaps: "Failed to load bestlaps.json",
    leaderboardCols: ["Rank", "Driver", "Points", "Wins", "Podiums", "Races", "Avg Finish", "Best Lap", "Track", "Session"],
    bestlapsCols: ["Rank", "Driver", "Best Lap", "Track", "Session", "Updated"],
    leaderboardSearchPlaceholder: "Search driver...",
    bestlapsSearchPlaceholder: "Search driver...",
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
    htmlLang: "ru",
    pageTitle: "ASG Racing ACC Leaderboard | Статистика Assetto Corsa Competizione",
    metaDescription: "ASG Racing ACC Leaderboard — статистика гонок, побед, подиумов и лучших кругов на публичном сервере Assetto Corsa Competizione.",
    ogDescription: "Статистика гонок, побед, подиумов и лучших кругов на сервере ASG Racing в Assetto Corsa Competizione.",
    twitterDescription: "Гонки, победы, подиумы и лучшие круги на публичном ACC сервере ASG Racing.",
    ogLocale: "ru_RU",
    heroTitle: "ACC Public Leaderboard",
    heroSubtitle: "Статистика гонок, побед, подиумов и лучших кругов на сервере <strong>ASG Racing</strong>. Данные обновляются автоматически на основе результатов dedicated server.",
    btnChampionship: "Чемпионат",
    btnBestLaps: "Лучшие круги",
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
    aboutTitle: "О сервере ASG Racing",
    aboutSubtitle: "Публичный сервер Assetto Corsa Competizione",
    aboutP1: "<strong>ASG Racing</strong> — это публичный сервер <strong>Assetto Corsa Competizione</strong>, где пилоты соревнуются на популярных GT3 трассах, улучшают свои времена круга и сравнивают статистику с другими гонщиками.",
    aboutP2: "На этой странице автоматически публикуется leaderboard сервера, включающий:",
    aboutList1: "🏁 количество гонок",
    aboutList2: "🥇 победы",
    aboutList3: "🏆 подиумы",
    aboutList4: "📊 средний финиш",
    aboutList5: "⚡ лучшие круги",
    aboutP3: "Статистика обновляется автоматически на основе файлов результатов <strong>ACC Dedicated Server</strong>. После каждой гонки данные пересчитываются и публикуются на сайте.",
    pointsTitle: "Как считается рейтинг",
    pointsP1: "Очки начисляются по системе, похожей на чемпионаты GT:",
    pointsList1: "1 место — 25 очков",
    pointsList2: "2 место — 18 очков",
    pointsList3: "3 место — 15 очков",
    pointsList4: "4–10 место — уменьшающиеся очки",
    pointsP2: "Также пилот получает <strong>1 дополнительное очко</strong> за лучший круг в гонке.",
    bestLapsInfoTitle: "Лучшие круги",
    bestLapsInfoP1: "Таблица <strong>Best Laps</strong> содержит лучшие времена круга, показанные как в квалификации, так и в гонках. Это позволяет сравнить абсолютную скорость пилотов.",
    joinTitle: "Присоединиться к серверу",
    joinP1: "Чтобы участвовать в гонках и попасть в таблицу лидеров, подключайтесь к серверу:",
    serverName: "ASG Racing ACC Public Server",
    joinP2: "Общение и новости сервера доступны в наших сообществах:",
    footerText: "Данные собираются из файлов результатов ACC Dedicated Server и публикуются через GitHub Pages.",
    loading: "Загрузка...",
    loadingLeaderboard: "Загрузка leaderboard...",
    loadingBestLaps: "Загрузка best laps...",
    emptyTop3: "Пока нет данных для топ-3.",
    emptyLeaderboard: "Пока нет данных leaderboard.",
    emptyBestLaps: "Пока нет данных best laps.",
    emptySearch: "Совпадений не найдено.",
    errorLoading: "Ошибка загрузки данных.",
    errorLeaderboard: "Не удалось загрузить leaderboard.json",
    errorBestlaps: "Не удалось загрузить bestlaps.json",
    leaderboardCols: ["Место", "Пилот", "Очки", "Победы", "Подиумы", "Гонки", "Средний финиш", "Лучший круг", "Трасса", "Сессия"],
    bestlapsCols: ["Место", "Пилот", "Лучший круг", "Трасса", "Сессия", "Обновлено"],
    leaderboardSearchPlaceholder: "Поиск пилота...",
    bestlapsSearchPlaceholder: "Поиск пилота...",
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
  { key: "best_lap_track", type: "string" },
  { key: "best_lap_session_type", type: "string" }
];

const bestlapsColumns = [
  { key: "rank", type: "number" },
  { key: "driver", type: "string" },
  { key: "best_lap", type: "time" },
  { key: "track", type: "string" },
  { key: "session_type", type: "string" },
  { key: "updated_at", type: "string" }
];

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
    .replace(/\"/g, "&quot;");
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
  return `<span class="pill">${escapeHtml(v || "—")}</span>`;
}

function normalizeString(value) {
  return String(value ?? "").trim().toLocaleLowerCase(currentLang === "ru" ? "ru" : "en");
}

function parseNumeric(value) {
  if (value === null || value === undefined || value === "" || value === "—") return Number.POSITIVE_INFINITY;
  const num = Number(String(value).replace(",", "."));
  return Number.isFinite(num) ? num : Number.POSITIVE_INFINITY;
}

function parseLapTime(value) {
  if (!value || value === "—") return Number.POSITIVE_INFINITY;
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

function getComparableValue(row, column) {
  const value = row?.[column.key];
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
  return sortData(filterByDriver(leaderboardData, leaderboardSearch), leaderboardSort, leaderboardColumns);
}

function getProcessedBestlaps() {
  return sortData(filterByDriver(bestlapsData, bestlapsSearch), bestlapsSort, bestlapsColumns);
}

async function loadJson(url) {
  const res = await fetch(url + "?t=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

function applyStaticTranslations() {
  document.documentElement.lang = t("htmlLang");
  document.title = t("pageTitle");

  const descriptionMeta = document.querySelector('meta[name="description"]');
  const ogDescriptionMeta = document.querySelector('meta[property="og:description"]');
  const twitterDescriptionMeta = document.querySelector('meta[name="twitter:description"]');
  const ogLocaleMeta = document.querySelector('meta[property="og:locale"]');

  if (descriptionMeta) descriptionMeta.setAttribute("content", t("metaDescription"));
  if (ogDescriptionMeta) ogDescriptionMeta.setAttribute("content", t("ogDescription"));
  if (twitterDescriptionMeta) twitterDescriptionMeta.setAttribute("content", t("twitterDescription"));
  if (ogLocaleMeta) ogLocaleMeta.setAttribute("content", t("ogLocale"));

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
  if (leaderboardInput) leaderboardInput.placeholder = t("leaderboardSearchPlaceholder");
  if (bestlapsInput) bestlapsInput.placeholder = t("bestlapsSearchPlaceholder");

  if (bestlapsData.length > 0) {
    updateBestLapNote(bestlapsData[0].driver, bestlapsData[0].track);
  } else {
    document.getElementById("best-lap-note").textContent = t("bestLapNoteFallback");
  }
}

function updateBestLapNote(driver, track) {
  document.getElementById("best-lap-note").textContent = replaceTokens(t("bestLapNoteTemplate"), {
    driver: driver || "Unknown",
    track: track || "Unknown track"
  });
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
      <h3 class="pilot-name">${escapeHtml(row.driver)}</h3>
      <div class="muted">${escapeHtml(t("metaLabels").bestLap)}: ${escapeHtml(row.best_lap || "—")}</div>
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
          <div class="meta-label">${escapeHtml(t("metaLabels").podiums)}</div>
          <div class="meta-value">${escapeHtml(row.podiums ?? 0)}</div>
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

function renderPagination(containerId, infoId, wrapId, currentPage, totalPages, totalItems, startIndex, endIndex, onPageChange) {
  const container = document.getElementById(containerId);
  const info = document.getElementById(infoId);
  const wrap = document.getElementById(wrapId);

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

  if (!result.totalItems) {
    document.getElementById("leaderboard-table").innerHTML = `<div class="empty-box">${escapeHtml(leaderboardSearch ? t("emptySearch") : t("emptyLeaderboard"))}</div>`;
    document.getElementById("leaderboard-pagination-wrap").style.display = "none";
    return;
  }

  let rows = result.items.map(row => `
    <tr>
      <td><span class="rank-badge rank-${escapeHtml(row.rank)}">#${escapeHtml(row.rank)}</span></td>
      <td>
        <div class="driver-cell">
          <div class="driver-avatar">${escapeHtml(initials(row.driver))}</div>
          <div class="driver-name-wrap">
            <div class="driver-name">${escapeHtml(row.driver)}</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(row.points ?? 0)}</td>
      <td>${escapeHtml(row.wins ?? 0)}</td>
      <td>${escapeHtml(row.podiums ?? 0)}</td>
      <td>${escapeHtml(row.races ?? 0)}</td>
      <td>${escapeHtml(row.average_finish ?? "—")}</td>
      <td>${escapeHtml(row.best_lap ?? "—")}</td>
      <td>${escapeHtml(row.best_lap_track ?? "—")}</td>
      <td>${sessionLabel(row.best_lap_session_type)}</td>
    </tr>
  `).join("");

  document.getElementById("leaderboard-table").innerHTML = `
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
      document.getElementById("championship").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  );
}

function renderBestLapsTablePage() {
  const result = paginate(getProcessedBestlaps(), bestlapsPage, PAGE_SIZE);
  bestlapsPage = result.page;

  if (!result.totalItems) {
    document.getElementById("bestlaps-table").innerHTML = `<div class="empty-box">${escapeHtml(bestlapsSearch ? t("emptySearch") : t("emptyBestLaps"))}</div>`;
    document.getElementById("bestlaps-pagination-wrap").style.display = "none";
    return;
  }

  let rows = result.items.map(row => `
    <tr>
      <td><span class="rank-badge rank-${escapeHtml(row.rank)}">#${escapeHtml(row.rank)}</span></td>
      <td>
        <div class="driver-cell">
          <div class="driver-avatar">${escapeHtml(initials(row.driver))}</div>
          <div class="driver-name-wrap">
            <div class="driver-name">${escapeHtml(row.driver)}</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(row.best_lap ?? "—")}</td>
      <td>${escapeHtml(row.track ?? "—")}</td>
      <td>${sessionLabel(row.session_type)}</td>
      <td>${escapeHtml(row.updated_at ?? "—")}</td>
    </tr>
  `).join("");

  document.getElementById("bestlaps-table").innerHTML = `
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
      document.getElementById("bestlaps").scrollIntoView({ behavior: "smooth", block: "start" });
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

  if (leaderboardInput) {
    leaderboardInput.addEventListener("input", (e) => {
      leaderboardSearch = e.target.value || "";
      leaderboardPage = 1;
      renderLeaderboardTablePage();
    });
  }

  if (bestlapsInput) {
    bestlapsInput.addEventListener("input", (e) => {
      bestlapsSearch = e.target.value || "";
      bestlapsPage = 1;
      renderBestLapsTablePage();
    });
  }
}

function rerenderUI() {
  applyStaticTranslations();
  document.getElementById("top3-content").innerHTML = renderTop3(leaderboardData);
  renderLeaderboardTablePage();
  renderBestLapsTablePage();
}

async function init() {
  const top3Content = document.getElementById("top3-content");
  bindLanguageButtons();
  bindSearchInputs();
  applyStaticTranslations();

  try {
    const [leaderboard, bestlaps] = await Promise.all([
      loadJson(leaderboardUrl),
      loadJson(bestlapsUrl)
    ]);

    leaderboardData = Array.isArray(leaderboard) ? leaderboard : [];
    bestlapsData = Array.isArray(bestlaps) ? bestlaps : [];

    document.getElementById("drivers-count").textContent = leaderboardData.length;

    if (bestlapsData.length > 0) {
      document.getElementById("best-lap-highlight").textContent = bestlapsData[0].best_lap || "—";
      updateBestLapNote(bestlapsData[0].driver, bestlapsData[0].track);
    } else {
      document.getElementById("best-lap-highlight").textContent = "—";
      document.getElementById("best-lap-note").textContent = t("bestLapNoteFallback");
    }

    rerenderUI();
  } catch (error) {
    console.error(error);
    top3Content.innerHTML = `<div class="empty-box">${escapeHtml(t("errorLoading"))}</div>`;
    document.getElementById("leaderboard-table").innerHTML = `<div class="empty-box">${escapeHtml(t("errorLeaderboard"))}</div>`;
    document.getElementById("bestlaps-table").innerHTML = `<div class="empty-box">${escapeHtml(t("errorBestlaps"))}</div>`;
    document.getElementById("leaderboard-pagination-wrap").style.display = "none";
    document.getElementById("bestlaps-pagination-wrap").style.display = "none";
  }
}
const TODAY_STATS = {
  date: "2026-03-13",
  unique_players_today: 45,
  races_today: 8,
  sessions_today: 17,
  points_earned_today: 673,
  wins_today: 8,
  podiums_today: 22,
  avg_players_per_race_today: 8.38,
  tracks_raced_today: ["monza"],
  best_lap_today: {
    lap: "1:47.175",
    lap_ms: 107175,
    driver: "Denis Denalget [ASG]",
    player_id: "S76561198179725961",
    track: "monza",
    session_type: "R"
  },
  most_active_driver_today: {
    player_id: "S76561199664057628",
    races: 8
  },
  most_successful_driver_today: {
    player_id: "S76561199664057628",
    driver: "Arsenii Kapustin",
    points: 171
  },
  updated_at: "2026-03-13T20:12:19"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTimeLocal(isoString, lang = "en") {
  if (!isoString) return "—";

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

  if (TODAY_STATS?.most_successful_driver_today?.player_id === playerId && TODAY_STATS?.most_successful_driver_today?.driver) {
    return TODAY_STATS.most_successful_driver_today.driver;
  }

  if (window.leaderboardData && Array.isArray(window.leaderboardData)) {
    const found = window.leaderboardData.find(item => item.player_id === playerId || item.playerId === playerId);
    if (found) return found.driver || found.name || found.player || null;
  }

  return null;
}

function renderTodayStatsModal() {
  const lang = getCurrentLangSafe();
  const t = TODAY_STATS;

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

  uniquePlayersEl.textContent = t.unique_players_today ?? "—";
  racesEl.textContent = t.races_today ?? "—";
  sessionsEl.textContent = t.sessions_today ?? "—";
  pointsEl.textContent = t.points_earned_today ?? "—";
  winsEl.textContent = t.wins_today ?? "—";
  podiumsEl.textContent = t.podiums_today ?? "—";
  avgPlayersEl.textContent =
    typeof t.avg_players_per_race_today === "number"
      ? t.avg_players_per_race_today.toFixed(2)
      : "—";
  tracksEl.textContent = Array.isArray(t.tracks_raced_today) && t.tracks_raced_today.length
    ? t.tracks_raced_today.join(", ")
    : "—";

  bestLapEl.textContent = t.best_lap_today?.lap || "—";
  bestLapNoteEl.textContent = t.best_lap_today
    ? `${t.best_lap_today.driver} · ${t.best_lap_today.track}`
    : "—";

  const mostActiveName =
    findDriverNameByPlayerId(t.most_active_driver_today?.player_id) ||
    t.most_successful_driver_today?.driver ||
    t.most_active_driver_today?.player_id ||
    "—";

  mostActiveEl.textContent = mostActiveName;
  mostActiveNoteEl.textContent = t.most_active_driver_today?.races != null
    ? (lang === "ru"
        ? `Гонок за сегодня: ${t.most_active_driver_today.races}`
        : `Races today: ${t.most_active_driver_today.races}`)
    : "—";

  mostSuccessfulEl.textContent = t.most_successful_driver_today?.driver || "—";
  mostSuccessfulNoteEl.textContent = t.most_successful_driver_today?.points != null
    ? (lang === "ru"
        ? `Очков за сегодня: ${t.most_successful_driver_today.points}`
        : `Points today: ${t.most_successful_driver_today.points}`)
    : "—";

  updatedEl.textContent =
    lang === "ru"
      ? `Обновлено: ${formatDateTimeLocal(t.updated_at, "ru")}`
      : `Updated: ${formatDateTimeLocal(t.updated_at, "en")}`;
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

document.addEventListener("DOMContentLoaded", () => {
  initTodayStatsModal();
  renderTodayStatsModal();
});
init();
import {
  ACHIEVEMENT_CATEGORY_ORDER,
  categoryCounts,
  normalizeFullAchievements,
  normalizePublicAchievements,
  selectAchievementCards
} from "./achievements-model.js?v=20260824titles1";
import { buildAuthReturnPath, normalizeAuthPayload } from "../../features/auth/header-auth.js?v=20260824titles1";
import { createHttpClient } from "../../shared/http-client.js";

const DEFAULT_DATA_BASE_URL = "https://data.asgracing.ru/achievements/v1";
const DEFAULT_AUTH_BASE_URL = "https://auth.asgracing.ru";

const COPY = Object.freeze({
  en: {
    title: "Achievements",
    loading: "Loading achievements...",
    empty: "No achievements have been calculated for this driver yet.",
    unavailable: "Achievements are temporarily unavailable.",
    retry: "Try again",
    earned: "earned",
    stale: "Last available snapshot",
    titleLabel: "Driver title",
    titleInfo: "Driver title details",
    publicHint: "A public preview is shown. Sign in with Steam to see every achievement and exact progress.",
    steamCta: "Sign in with Steam and view all",
    fullLoading: "Loading the full achievement collection...",
    fullUnavailable: "The full collection is temporarily unavailable. The public preview remains available.",
    nearest: "Closest",
    titlesTab: "Titles",
    completed: "Completed",
    locked: "In progress",
    times: "Completed {count} times",
    levels: "Levels {earned}/{total}",
    allLevels: "All levels completed: {earned}/{total}",
    showTiers: "Show milestone history",
    hideTiers: "Hide milestone history",
    info: "Achievement details",
    received: "earned",
    secretName: "Secret achievement",
    secretDescription: "Unlock it to reveal its condition.",
    progress: "{current} of {target}",
    categoryEmpty: "No achievements in this branch yet.",
    categories: {
      career: "Career", victories: "Victories", speed: "Speed", racecraft: "Racecraft",
      endurance: "Endurance", exploration: "Exploration", events: "Events", secret: "Secret"
    }
  },
  ru: {
    title: "Достижения",
    loading: "Загружаем достижения...",
    empty: "Для этого пилота достижения пока не рассчитаны.",
    unavailable: "Достижения временно недоступны.",
    retry: "Повторить",
    earned: "получено",
    stale: "Показан последний доступный снимок",
    titleLabel: "Звание пилота",
    titleInfo: "Подробнее о звании пилота",
    publicHint: "Сейчас показан публичный минимум. Войдите через Steam, чтобы увидеть все достижения и точный прогресс.",
    steamCta: "Войти через Steam и посмотреть все",
    fullLoading: "Загружаем полную коллекцию достижений...",
    fullUnavailable: "Полная коллекция временно недоступна. Публичный минимум продолжает работать.",
    nearest: "Ближе всего",
    titlesTab: "Звания",
    completed: "Получено",
    locked: "В процессе",
    times: "Выполнено {count} раз",
    levels: "Уровни {earned}/{total}",
    allLevels: "Все уровни получены: {earned}/{total}",
    showTiers: "Показать историю уровней",
    hideTiers: "Скрыть историю уровней",
    info: "Подробнее о достижении",
    received: "получено",
    secretName: "Секретное достижение",
    secretDescription: "Получите его, чтобы раскрыть условие.",
    progress: "{current} из {target}",
    categoryEmpty: "В этой ветке достижений пока нет.",
    categories: {
      career: "Карьера", victories: "Победы", speed: "Скорость", racecraft: "Racecraft",
      endurance: "Endurance", exploration: "Исследование", events: "Events", secret: "Secret"
    }
  }
});

const ACHIEVEMENT_DESCRIPTIONS = Object.freeze({
  early_winner: { ru: "Победить в одной из первых пяти официально засчитанных гонок карьеры.", en: "Win one of the first five officially counted races of the career." },
  win_streak_3: { ru: "Одержать 3 победы подряд.", en: "Win 3 officially counted races in a row." },
  win_streak_5: { ru: "Одержать 5 побед подряд.", en: "Win 5 officially counted races in a row." },
  podium_streak_5: { ru: "Финишировать на подиуме в 5 гонках подряд.", en: "Finish on the podium in 5 consecutive races." },
  win_margin_30s: { ru: "Победить с преимуществом строго больше 30 секунд над P2 на том же круге.", en: "Win by strictly more than 30 seconds over P2 on the same lap." },
  photo_finish: { ru: "Победить с преимуществом строго меньше 0,5 секунды над P2 на том же круге.", en: "Win by strictly less than 0.5 seconds over P2 on the same lap." },
  stole_victory: { ru: "Победить с преимуществом строго меньше 0,1 секунды над P2 на том же круге.", en: "Win by strictly less than 0.1 seconds over P2 on the same lap." },
  domination_lap: { ru: "Победить с преимуществом строго больше одного полного круга над P2.", en: "Win by strictly more than one full lap over P2." },
  big_grid_30: { ru: "Победить в гонке с 30 или более участниками.", en: "Win a race with at least 30 participants." },
  big_grid_40: { ru: "Победить в гонке с 40 или более участниками.", en: "Win a race with at least 40 participants." },
  david_goliath: { ru: "Победить соперника, чей ELO перед гонкой был минимум на 200 выше вашего.", en: "Beat an opponent whose pre-race ELO was at least 200 points higher." },
  grand_slam: { ru: "В одной гонке стартовать с Pole, показать fastest lap и победить.", en: "Take pole, set the fastest lap and win in the same race." },
  positions_5: { ru: "Финишировать минимум на 5 позиций выше подтверждённой стартовой позиции.", en: "Finish at least 5 places above a verified starting position." },
  positions_10: { ru: "Финишировать минимум на 10 позиций выше подтверждённой стартовой позиции.", en: "Finish at least 10 places above a verified starting position." },
  positions_15: { ru: "Финишировать минимум на 15 позиций выше подтверждённой стартовой позиции.", en: "Finish at least 15 places above a verified starting position." },
  rags_to_riches: { ru: "Стартовать ниже Top-15 и финишировать на подиуме.", en: "Start outside the Top 15 and finish on the podium." },
  last_to_first: { ru: "Стартовать последним и победить при полностью подтверждённой решётке.", en: "Start last and win with a fully verified starting grid." },
  top5_defender: { ru: "После старта из Top-5 финишировать, потеряв не более одной позиции.", en: "Start in the Top 5 and finish after losing no more than one position." },
  endurance_2h: { ru: "Завершить гонку длительностью не менее 2 часов.", en: "Finish a race lasting at least 2 hours." },
  endurance_3h: { ru: "Завершить гонку длительностью не менее 3 часов.", en: "Finish a race lasting at least 3 hours." },
  endurance_6h: { ru: "Завершить гонку длительностью не менее 6 часов.", en: "Finish a race lasting at least 6 hours." },
  endurance_12h: { ru: "Завершить гонку длительностью не менее 12 часов.", en: "Finish a race lasting at least 12 hours." },
  close_second: { ru: "Финишировать P2 строго менее чем в 0,2 секунды от победителя на том же круге.", en: "Finish P2 strictly less than 0.2 seconds behind the winner on the same lap." },
  century_combo: { ru: "Завершить 100 гонок, проехать 1 000 км и одержать 10 побед.", en: "Complete 100 races, cover 1,000 km and earn 10 victories." },
  monza_born: { ru: "Иметь не менее 100 засчитанных гонок, и ни одной гонки вне Monza.", en: "Have at least 100 counted races and no race outside Monza." },
  monza_addicted: { ru: "Завершить не менее 100 гонок на Monza и хотя бы одну гонку на другой трассе.", en: "Complete at least 100 races at Monza and at least one race at another track." },
  qualifying_is_for_the_weak: { ru: "Победить после старта с подтверждённой позиции P10 или ниже.", en: "Win after starting from a verified P10 position or lower." },
  quietly_did_it: { ru: "Победить без Pole и без лучшего круга при подтверждённой стартовой позиции.", en: "Win without pole or the fastest lap, with a verified starting position." },
  late_first_win: { ru: "Одержать первую победу в карьере только после своей 50-й засчитанной гонки.", en: "Earn the first career victory only after the 50th counted race." },
  fast_but_wrong_way: { ru: "Показать лучший круг гонки и финишировать вне Top-3.", en: "Set the race's fastest lap and finish outside the Top 3." },
  groundhog_day: { ru: "В трёх засчитанных гонках подряд финишировать на одной и той же позиции.", en: "Finish in the same position in three consecutive counted races." },
  race_bingo: { ru: "Хотя бы раз финишировать на каждой позиции от P1 до P10.", en: "Finish at least once in every position from P1 through P10." }
});

function element(documentRef, tag, className, value = "") {
  const node = documentRef.createElement(tag);
  if (className) node.className = className;
  if (value !== "") node.textContent = value;
  return node;
}

function currentLanguage(documentRef, windowRef) {
  const active = documentRef.querySelector(".lang-btn.active[data-lang]")?.dataset.lang;
  if (active === "ru" || active === "en") return active;
  try {
    const stored = windowRef.localStorage?.getItem("asgLang");
    if (stored === "ru" || stored === "en") return stored;
  } catch {}
  return String(documentRef.documentElement?.lang || "").toLowerCase().startsWith("ru") ? "ru" : "en";
}

function safePublicId(value) {
  const id = String(value || "").trim();
  return /^drv_[a-z0-9]+$/i.test(id) ? id : "";
}

function formatValue(value, language = "ru", maximumFractionDigits = 1) {
  const number = Number(value) || 0;
  return number.toLocaleString(language === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits });
}

function pluralRu(value, one, few, many) {
  const integer = Math.abs(Math.trunc(Number(value) || 0));
  if (integer % 10 === 1 && integer % 100 !== 11) return one;
  if (integer % 10 >= 2 && integer % 10 <= 4 && (integer % 100 < 12 || integer % 100 > 14)) return few;
  return many;
}

function unitLabel(unit, value, language) {
  if (unit === "km") return language === "ru" ? "км" : "km";
  if (unit === "sr") return "SR";
  const labels = {
    race: ["гонка", "гонки", "гонок", "race", "races"],
    win: ["победа", "победы", "побед", "victory", "victories"],
    podium: ["подиум", "подиума", "подиумов", "podium", "podiums"],
    fastest_lap: ["лучший круг", "лучших круга", "лучших кругов", "fastest lap", "fastest laps"],
    track: ["трасса", "трассы", "трасс", "track", "tracks"],
    race_day: ["гоночный день", "гоночных дня", "гоночных дней", "race day", "race days"],
    hourly_race: ["гонка Hourly", "гонки Hourly", "гонок Hourly", "Hourly race", "Hourly races"],
    hourly_win: ["победа Hourly", "победы Hourly", "побед Hourly", "Hourly victory", "Hourly victories"],
    lap: ["круг", "круга", "кругов", "lap", "laps"],
    p4_finish: ["финиш P4", "финиша P4", "финишей P4", "P4 finish", "P4 finishes"],
    same_position_finish: ["финиш без изменения позиции", "финиша без изменения позиции", "финишей без изменения позиции", "unchanged-position finish", "unchanged-position finishes"],
    monza_race: ["гонка на Monza", "гонки на Monza", "гонок на Monza", "Monza race", "Monza races"],
    finish_position: ["позиция", "позиции", "позиций", "position", "positions"]
  }[unit];
  if (!labels) return "";
  return language === "ru" ? pluralRu(value, labels[0], labels[1], labels[2]) : (Number(value) === 1 ? labels[3] : labels[4]);
}

export function createDriverAchievementsController({
  documentRef = document,
  windowRef = window,
  fetchImpl = globalThis.fetch,
  dataBaseUrl = DEFAULT_DATA_BASE_URL,
  authBaseUrl = DEFAULT_AUTH_BASE_URL
} = {}) {
  const root = documentRef.getElementById("driver-achievements-widget");
  if (!root || typeof fetchImpl !== "function") return null;
  const content = documentRef.getElementById("driver-achievements-content") || root;
  const publicId = safePublicId(new URLSearchParams(windowRef.location.search).get("id"));
  const client = createHttpClient({ fetchImpl, defaultTimeoutMs: 9000 });
  const state = {
    status: publicId ? "loading" : "error",
    publicData: null,
    fullData: null,
    authenticated: false,
    fullStatus: "idle",
    filter: "career"
  };
  let destroyed = false;
  let requestController = null;
  let tooltipSequence = 0;

  const copy = key => {
    const language = currentLanguage(documentRef, windowRef);
    return COPY[language]?.[key] ?? COPY.en[key] ?? key;
  };

  const language = () => currentLanguage(documentRef, windowRef);

  function localizedSeriesName(card) {
    return card.seriesNames?.[language()] || card.seriesName || card.name;
  }

  function achievementDescription(card, lockedSecret = false) {
    if (lockedSecret) return copy("secretDescription");
    const lang = language();
    const focus = card.nextTier || card.highestEarned || card;
    const fallback = ACHIEVEMENT_DESCRIPTIONS[focus.id]?.[lang];
    if (fallback) return fallback;
    const target = formatValue(focus.target, lang, focus.unit === "sr" ? 2 : 1);
    const unit = unitLabel(focus.unit, focus.target, lang);
    const generated = {
      career_races: lang === "ru" ? `Завершить ${target} официально засчитанных ${unit}.` : `Complete ${target} officially counted ${unit}.`,
      career_distance: lang === "ru" ? `Проехать ${target} км в засчитанных гонках; учитываются valid и invalid круги.` : `Cover ${target} km in counted races; both valid and invalid laps count.`,
      career_laps: lang === "ru" ? `Проехать ${target} ${unit} в засчитанных гонках; учитываются valid и invalid круги.` : `Complete ${target} ${unit} in counted races; both valid and invalid laps count.`,
      wins: lang === "ru" ? `Одержать ${target} ${unit} в официально засчитанных гонках.` : `Earn ${target} ${unit} in officially counted races.`,
      podiums: lang === "ru" ? `Финишировать на подиуме в ${target} засчитанных гонках.` : `Finish on the podium in ${target} counted races.`,
      p4_finishes: lang === "ru" ? `Финишировать ровно на P4 в ${target} засчитанных гонках.` : `Finish exactly P4 in ${target} counted races.`,
      fastest_laps: lang === "ru" ? `Показать лучший круг в ${target} засчитанных гонках.` : `Set the fastest lap in ${target} counted races.`,
      sr: lang === "ru" ? `Хотя бы один раз достичь Safety Rating ${target}.` : `Reach Safety Rating ${target} at least once.`,
      same_start_finish: lang === "ru" ? `В ${target} гонках финишировать на той же подтверждённой позиции, с которой началась гонка.` : `Finish in the verified starting position in ${target} races.`,
      hourly_races: lang === "ru" ? `Завершить ${target} ${unit}.` : `Complete ${target} ${unit}.`,
      hourly_wins: lang === "ru" ? `Одержать ${target} ${unit}.` : `Earn ${target} ${unit}.`,
      tracks: lang === "ru" ? `Завершить гонки на ${target} разных трассах.` : `Complete races on ${target} different tracks.`,
      race_days: lang === "ru" ? `Участвовать в гонках в ${target} разных календарных дней по московскому времени.` : `Race on ${target} different calendar days in Moscow time.`,
      monza_regular: lang === "ru" ? `Завершить ${target} ${unit}; гонки на других трассах не мешают прогрессу.` : `Complete ${target} ${unit}; races at other tracks do not reset progress.`
    }[card.seriesId];
    return generated || focus.description || card.description || (lang === "ru" ? "Условие достижения будет уточнено." : "Achievement condition will be clarified.");
  }

  function progressText(card) {
    const lang = language();
    if (card.isSeries) {
      const levelText = (card.complete ? copy("allLevels") : copy("levels"))
        .replace("{earned}", formatValue(card.tiersEarned, lang))
        .replace("{total}", formatValue(card.tiersTotal, lang));
      if (card.complete) return levelText;
      const unit = unitLabel(card.unit, card.target, lang);
      return `${formatValue(card.progress, lang, card.unit === "sr" ? 2 : 1)} / ${formatValue(card.target, lang, card.unit === "sr" ? 2 : 1)}${unit ? ` ${unit}` : ""} · ${levelText}`;
    }
    if (card.kind === "counter") return copy("times").replace("{count}", formatValue(card.counter, lang));
    const unit = unitLabel(card.unit, card.target, lang);
    if (card.earned) return `${formatValue(card.target, lang, card.unit === "sr" ? 2 : 1)}${unit ? ` ${unit}` : ""} — ${copy("received")}`;
    return `${formatValue(card.progress, lang, card.unit === "sr" ? 2 : 1)} / ${formatValue(card.target, lang, card.unit === "sr" ? 2 : 1)}${unit ? ` ${unit}` : ""}`;
  }

  function renderProgress(value, label, className = "") {
    const progress = element(documentRef, "div", `driver-achievements-progress ${className}`.trim());
    const bar = element(documentRef, "div", "driver-achievements-progress-bar");
    bar.style.width = `${Math.max(0, Math.min(100, value))}%`;
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    progress.setAttribute("aria-valuenow", String(Math.round(value)));
    progress.setAttribute("aria-label", label);
    progress.appendChild(bar);
    return progress;
  }

  function renderHeader(data) {
    const header = element(documentRef, "header", "driver-achievements-header");
    const heading = element(documentRef, "div", "driver-achievements-heading");
    const title = element(documentRef, "h2", "driver-achievements-title", `${copy("title")} — ${data.summary.earned}/${data.summary.total}`);
    title.id = "driver-achievements-title";
    heading.appendChild(title);
    if (data.summary.title) {
      const driverTitle = element(documentRef, "div", "driver-achievements-driver-title");
      driverTitle.tabIndex = 0;
      const titleTooltipId = `driver-achievement-title-tooltip-${++tooltipSequence}`;
      driverTitle.append(
        element(documentRef, "span", "driver-achievements-driver-title-label", copy("titleLabel")),
        element(documentRef, "strong", "", data.summary.title)
      );
      if (data.summary.titleDescription) {
        driverTitle.setAttribute("aria-describedby", titleTooltipId);
        const info = element(documentRef, "button", "driver-achievements-title-info", "i");
        info.type = "button";
        info.setAttribute("aria-label", copy("titleInfo"));
        info.setAttribute("aria-expanded", "false");
        info.addEventListener("click", event => {
          event.stopPropagation();
          const open = !driverTitle.classList.contains("is-tooltip-open");
          driverTitle.classList.toggle("is-tooltip-open", open);
          info.setAttribute("aria-expanded", String(open));
        });
        const tooltip = element(documentRef, "div", "driver-achievements-title-tooltip", data.summary.titleDescription);
        tooltip.id = titleTooltipId;
        tooltip.setAttribute("role", "tooltip");
        driverTitle.addEventListener("keydown", event => {
          if (event.key === "Escape") {
            driverTitle.classList.remove("is-tooltip-open");
            info.setAttribute("aria-expanded", "false");
            driverTitle.focus();
          }
        });
        driverTitle.append(info, tooltip);
      }
      heading.appendChild(driverTitle);
    }
    const percent = element(documentRef, "strong", "driver-achievements-percent", `${Math.round(data.summary.completionPercent)}%`);
    header.append(heading, percent);
    const shell = element(documentRef, "div", "driver-achievements-summary-progress");
    shell.appendChild(renderProgress(data.summary.completionPercent, `${copy("title")}: ${Math.round(data.summary.completionPercent)}%`));
    return [header, shell];
  }

  function renderCard(card, { compact = false } = {}) {
    const lockedSecret = card.secret && !card.earned;
    const description = achievementDescription(card, lockedSecret);
    const item = element(
      documentRef,
      "article",
      `driver-achievement-card ${card.earned ? "is-earned" : "is-locked"}${compact ? " is-compact" : ""}`
    );
    item.tabIndex = 0;
    item.classList.toggle("is-series", card.isSeries === true);
    const tooltipId = `driver-achievement-tooltip-${++tooltipSequence}`;
    item.setAttribute("aria-describedby", tooltipId);
    const icon = element(documentRef, "span", "driver-achievement-icon", lockedSecret ? "◆" : card.icon);
    icon.setAttribute("aria-hidden", "true");
    const body = element(documentRef, "div", "driver-achievement-body");
    const top = element(documentRef, "div", "driver-achievement-topline");
    top.append(
      element(documentRef, "strong", "driver-achievement-name", lockedSecret ? copy("secretName") : card.isSeries ? localizedSeriesName(card) : card.name || copy("title")),
      element(documentRef, "span", `driver-achievement-state ${card.earned ? "is-earned" : ""}`, card.earned ? copy("completed") : copy("locked"))
    );
    body.appendChild(top);
    if (!lockedSecret && (card.kind === "counter" || card.isSeries)) {
      body.appendChild(element(documentRef, "div", "driver-achievement-counter", progressText(card)));
      if (card.isSeries && !card.complete && card.target > 0) body.appendChild(renderProgress(card.ratio * 100, progressText(card), "driver-achievement-progress"));
    } else if (!lockedSecret && card.target > 0) {
      const value = element(
        documentRef,
        "div",
        "driver-achievement-progress-value",
        progressText(card)
      );
      body.append(value, renderProgress(card.ratio * 100, value.textContent, "driver-achievement-progress"));
    }
    const info = element(documentRef, "button", "driver-achievement-info", "i");
    info.type = "button";
    info.setAttribute("aria-label", copy("info"));
    info.setAttribute("aria-expanded", "false");
    info.addEventListener("click", event => {
      event.stopPropagation();
      const open = !item.classList.contains("is-tooltip-open");
      item.classList.toggle("is-tooltip-open", open);
      info.setAttribute("aria-expanded", String(open));
    });
    top.appendChild(info);
    const tooltip = element(documentRef, "div", "driver-achievement-tooltip", description);
    tooltip.id = tooltipId;
    tooltip.setAttribute("role", "tooltip");
    item.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        item.classList.remove("is-tooltip-open");
        info.setAttribute("aria-expanded", "false");
        item.focus();
      }
    });
    if (card.isSeries && !compact) {
      const toggle = element(documentRef, "button", "driver-achievement-series-toggle", copy("showTiers"));
      toggle.type = "button";
      toggle.setAttribute("aria-expanded", "false");
      const tierList = element(documentRef, "div", "driver-achievement-tier-list");
      tierList.hidden = true;
      for (const tier of card.tiers) {
        const tierRow = element(documentRef, "div", `driver-achievement-tier ${tier.earned ? "is-earned" : ""}`);
        const tierTooltipId = `driver-achievement-tier-tooltip-${++tooltipSequence}`;
        const tierDescription = achievementDescription(tier, tier.secret && !tier.earned);
        tierRow.tabIndex = 0;
        tierRow.setAttribute("aria-describedby", tierTooltipId);
        const tierInfo = element(documentRef, "button", "driver-achievement-tier-info", "i");
        tierInfo.type = "button";
        tierInfo.setAttribute("aria-label", copy("info"));
        tierInfo.setAttribute("aria-expanded", "false");
        tierInfo.addEventListener("click", event => {
          event.stopPropagation();
          const open = !tierRow.classList.contains("is-tooltip-open");
          tierRow.classList.toggle("is-tooltip-open", open);
          tierInfo.setAttribute("aria-expanded", String(open));
        });
        const tierTooltip = element(documentRef, "div", "driver-achievement-tier-tooltip", tierDescription);
        tierTooltip.id = tierTooltipId;
        tierTooltip.setAttribute("role", "tooltip");
        tierRow.addEventListener("keydown", event => {
          if (event.key === "Escape") {
            tierRow.classList.remove("is-tooltip-open");
            tierInfo.setAttribute("aria-expanded", "false");
            tierRow.focus();
          }
        });
        tierRow.append(
          element(documentRef, "span", "driver-achievement-tier-icon", tier.earned ? "✓" : "○"),
          element(documentRef, "span", "driver-achievement-tier-name", tier.name),
          element(documentRef, "span", "driver-achievement-tier-target", `${formatValue(tier.target, language(), tier.unit === "sr" ? 2 : 1)}${unitLabel(tier.unit, tier.target, language()) ? ` ${unitLabel(tier.unit, tier.target, language())}` : ""}`),
          tierInfo,
          tierTooltip
        );
        tierList.appendChild(tierRow);
      }
      toggle.addEventListener("click", event => {
        event.stopPropagation();
        tierList.hidden = !tierList.hidden;
        toggle.setAttribute("aria-expanded", String(!tierList.hidden));
        toggle.textContent = tierList.hidden ? copy("showTiers") : copy("hideTiers");
      });
      body.append(toggle, tierList);
    }
    item.append(icon, body);
    item.appendChild(tooltip);
    return item;
  }

  function renderPublic(data) {
    const fragment = documentRef.createDocumentFragment();
    renderHeader(data).forEach(node => fragment.appendChild(node));
    if (data.stale) fragment.appendChild(element(documentRef, "div", "driver-achievements-stale", copy("stale")));
    if (data.categories?.length) {
      const categories = element(documentRef, "div", "driver-achievements-category-summary");
      for (const category of data.categories) {
        const suffix = category.total === null ? "" : ` ${category.earned}/${category.total}`;
        categories.appendChild(element(documentRef, "span", "driver-achievements-category-chip", `${copy("categories")[category.id]}${suffix}`));
      }
      fragment.appendChild(categories);
    }
    const cards = element(documentRef, "div", "driver-achievements-cards driver-achievements-preview");
    data.cards.forEach(card => cards.appendChild(renderCard(card, { compact: true })));
    if (data.cards.length) fragment.appendChild(cards);
    if (!state.authenticated) {
      fragment.appendChild(element(documentRef, "p", "driver-achievements-auth-hint", copy("publicHint")));
      const cta = element(documentRef, "a", "driver-achievements-steam-cta");
      cta.href = `${authBaseUrl.replace(/\/+$/, "")}/v1/auth/steam/start?return_path=${encodeURIComponent(buildAuthReturnPath(windowRef.location))}`;
      cta.append(
        element(documentRef, "span", "driver-achievements-steam-mark", "S"),
        element(documentRef, "span", "", copy("steamCta"))
      );
      fragment.appendChild(cta);
    }
    return fragment;
  }

  function renderCategoryTabs(data) {
    const counts = categoryCounts(data.cards);
    const tabs = element(documentRef, "div", "driver-achievements-tabs");
    tabs.setAttribute("role", "tablist");
    const titleCards = data.cards.filter(card => card.title);
    if (titleCards.length) {
      const earnedTitles = titleCards.filter(card => card.earned).length;
      const titles = element(documentRef, "button", "driver-achievements-tab driver-achievements-tab--titles", `${copy("titlesTab")} ${earnedTitles}/${titleCards.length}`);
      titles.type = "button";
      titles.dataset.filter = "titles";
      titles.setAttribute("role", "tab");
      titles.setAttribute("aria-selected", String(state.filter === "titles"));
      if (state.filter === "titles") titles.classList.add("is-active");
      titles.addEventListener("click", () => { state.filter = "titles"; render(); });
      tabs.appendChild(titles);
    }
    for (const category of ACHIEVEMENT_CATEGORY_ORDER) {
      const count = counts.get(category);
      if (!count?.total) continue;
      const button = element(documentRef, "button", "driver-achievements-tab", `${copy("categories")[category]} ${count.earned}/${count.total}`);
      button.type = "button";
      button.dataset.filter = category;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(state.filter === category));
      if (state.filter === category) button.classList.add("is-active");
      button.addEventListener("click", () => { state.filter = category; render(); });
      tabs.appendChild(button);
    }
    const nearest = element(documentRef, "button", "driver-achievements-tab", copy("nearest"));
    nearest.type = "button";
    nearest.dataset.filter = "nearest";
    nearest.setAttribute("role", "tab");
    nearest.setAttribute("aria-selected", String(state.filter === "nearest"));
    if (state.filter === "nearest") nearest.classList.add("is-active");
    nearest.addEventListener("click", () => { state.filter = "nearest"; render(); });
    tabs.appendChild(nearest);
    return tabs;
  }

  function renderFull(data) {
    const fragment = documentRef.createDocumentFragment();
    renderHeader(data).forEach(node => fragment.appendChild(node));
    if (data.stale) fragment.appendChild(element(documentRef, "div", "driver-achievements-stale", copy("stale")));
    fragment.appendChild(renderCategoryTabs(data));
    const cards = selectAchievementCards(data.cards, state.filter);
    const list = element(documentRef, "div", "driver-achievements-cards");
    cards.forEach(card => list.appendChild(renderCard(card)));
    if (!cards.length) list.appendChild(element(documentRef, "div", "driver-achievements-empty", copy("categoryEmpty")));
    fragment.appendChild(list);
    return fragment;
  }

  function render() {
    if (destroyed) return;
    content.replaceChildren();
    root.dataset.state = state.status;
    if (state.status === "loading") {
      const loading = element(documentRef, "div", "driver-achievements-loading", copy("loading"));
      loading.setAttribute("role", "status");
      content.appendChild(loading);
      return;
    }
    if (state.fullData) {
      content.appendChild(renderFull(state.fullData));
      return;
    }
    if (state.publicData) {
      content.appendChild(renderPublic(state.publicData));
      if (state.authenticated && state.fullStatus === "loading") {
        const loading = element(documentRef, "div", "driver-achievements-full-state", copy("fullLoading"));
        loading.setAttribute("role", "status");
        content.appendChild(loading);
      } else if (state.authenticated && state.fullStatus === "error") {
        content.appendChild(element(documentRef, "div", "driver-achievements-full-state is-error", copy("fullUnavailable")));
      }
      return;
    }
    const message = element(documentRef, "div", "driver-achievements-empty", state.status === "empty" ? copy("empty") : copy("unavailable"));
    content.appendChild(message);
    if (state.status === "error" && publicId) {
      const retry = element(documentRef, "button", "driver-achievements-retry", copy("retry"));
      retry.type = "button";
      retry.addEventListener("click", () => void load());
      content.appendChild(retry);
    }
  }

  async function loadFull() {
    state.fullStatus = "loading";
    render();
    try {
      const payload = await client.requestJson(`${authBaseUrl.replace(/\/+$/, "")}/v1/drivers/${encodeURIComponent(publicId)}/achievements`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: requestController.signal,
        retries: 1
      });
      if (!destroyed) {
        state.fullData = normalizeFullAchievements(payload);
        state.fullStatus = "ready";
        const firstCategory = ACHIEVEMENT_CATEGORY_ORDER.find(category => state.fullData.cards.some(card => card.category === category));
        state.filter = firstCategory || "nearest";
        render();
      }
    } catch (error) {
      if (!destroyed && error?.kind !== "aborted") {
        state.fullStatus = "error";
        render();
      }
    }
  }

  async function checkAuth() {
    try {
      const payload = await client.requestJson(`${authBaseUrl.replace(/\/+$/, "")}/v1/me`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: requestController.signal,
        retries: 1
      });
      const auth = normalizeAuthPayload(payload);
      if (!destroyed && auth.authenticated) {
        state.authenticated = true;
        await loadFull();
      }
    } catch {}
  }

  async function load() {
    requestController?.abort();
    requestController = new AbortController();
    state.status = publicId ? "loading" : "error";
    state.publicData = null;
    state.fullData = null;
    state.fullStatus = "idle";
    render();
    if (!publicId) return;
    const publicPromise = client.requestJson(`${dataBaseUrl.replace(/\/+$/, "")}/drivers/${encodeURIComponent(publicId)}.json`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: requestController.signal,
      retries: 1
    });
    const authPromise = checkAuth();
    try {
      const payload = await publicPromise;
      if (!destroyed) {
        state.publicData = normalizePublicAchievements(payload);
        state.status = state.publicData.cards.length || state.publicData.summary.total ? "ready" : "empty";
        render();
      }
    } catch (error) {
      if (!destroyed && error?.kind !== "aborted") {
        state.status = "error";
        render();
      }
    }
    await authPromise;
  }

  const languageHandler = event => {
    if (event.target?.closest?.(".lang-btn[data-lang]")) windowRef.setTimeout(render, 0);
  };
  documentRef.addEventListener("click", languageHandler);
  void load();

  return Object.freeze({
    reload: load,
    destroy() {
      destroyed = true;
      requestController?.abort();
      documentRef.removeEventListener("click", languageHandler);
    }
  });
}

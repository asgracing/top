export const ACHIEVEMENT_CATEGORY_ORDER = Object.freeze([
  "career",
  "victories",
  "speed",
  "racecraft",
  "endurance",
  "exploration",
  "events",
  "secret"
]);

const CATEGORY_SET = new Set(ACHIEVEMENT_CATEGORY_ORDER);
const MIN_TITLE_DEFINITIONS_VERSION = 6;

const SERIES_DEFINITIONS = Object.freeze([
  { id: "career_races", names: { ru: "Гонки", en: "Races" }, unit: "race", tiers: ["career_first_start", "career_10", "career_50", "career_100", "career_250", "career_500", "career_750", "career_1000"] },
  { id: "career_distance", names: { ru: "Километраж", en: "Distance" }, unit: "km", tiers: ["distance_1000", "distance_5000", "distance_10000", "distance_around_world", "distance_twice_around_world", "distance_three_times_around_world"] },
  { id: "career_laps", names: { ru: "Круговорот", en: "Lap cycle" }, unit: "lap", tiers: ["laps_1000", "laps_5000", "laps_10000"] },
  { id: "wins", names: { ru: "Победы", en: "Victories" }, unit: "win", tiers: ["wins_1", "wins_5", "wins_10", "wins_25", "wins_50", "wins_100", "wins_150"] },
  { id: "podiums", names: { ru: "Подиумы", en: "Podiums" }, unit: "podium", tiers: ["podiums_1", "podiums_10", "podiums_25", "podiums_50", "podiums_100", "podiums_200", "podiums_300", "podiums_500"] },
  { id: "p4_finishes", names: { ru: "Почти получилось", en: "Almost made it" }, unit: "p4_finish", tiers: ["p4_first", "p4_10", "p4_25"] },
  { id: "win_streak", names: { ru: "Серия побед", en: "Winning streak" }, unit: "streak", tiers: ["win_streak_3", "win_streak_5"] },
  { id: "close_win", names: { ru: "Плотный финиш", en: "Close finish" }, unit: "occurrence", tiers: ["photo_finish", "stole_victory"] },
  { id: "big_grid_win", names: { ru: "Победы в большом пелотоне", en: "Big-grid victories" }, unit: "occurrence", tiers: ["big_grid_30", "big_grid_40"] },
  { id: "fastest_laps", names: { ru: "Лучшие круги", en: "Fastest laps" }, unit: "fastest_lap", tiers: ["fastest_1", "fastest_10", "fastest_50", "fastest_100", "fastest_200"] },
  { id: "comebacks", names: { ru: "Камбэки", en: "Comebacks" }, unit: "occurrence", tiers: ["positions_5", "positions_10", "positions_15"] },
  { id: "same_start_finish", names: { ru: "Всё по плану", en: "All according to plan" }, unit: "same_position_finish", tiers: ["same_position_first", "same_position_10", "same_position_50"] },
  { id: "sr", names: { ru: "Safety Rating", en: "Safety Rating" }, unit: "sr", tiers: ["sr_5", "sr_6", "sr_7", "sr_8", "sr_9"] },
  { id: "hourly_races", names: { ru: "Гонки Hourly", en: "Hourly races" }, unit: "hourly_race", tiers: ["hourly_1", "hourly_5", "hourly_25", "hourly_50", "hourly_100"] },
  { id: "hourly_wins", names: { ru: "Победы в Hourly", en: "Hourly victories" }, unit: "hourly_win", tiers: ["hourly_win_1", "hourly_win_10"] },
  { id: "endurance_duration", names: { ru: "Длительные гонки", en: "Endurance races" }, unit: "occurrence", tiers: ["endurance_2h", "endurance_3h", "endurance_6h", "endurance_12h"] },
  { id: "tracks", names: { ru: "Трассы", en: "Tracks" }, unit: "track", tiers: ["tracks_5", "tracks_10"] },
  { id: "race_days", names: { ru: "Гоночные дни", en: "Race days" }, unit: "race_day", tiers: ["race_days_10", "race_days_30", "race_days_100", "race_days_150", "race_days_250"] },
  { id: "monza_regular", names: { ru: "Монца зовёт", en: "Monza is calling" }, unit: "monza_race", tiers: ["monza_25", "monza_50", "monza_100"] }
]);

const SERIES_BY_ACHIEVEMENT = new Map();
for (const series of SERIES_DEFINITIONS) {
  series.tiers.forEach((id, index) => SERIES_BY_ACHIEVEMENT.set(id, { ...series, tierOrder: index + 1 }));
}

function text(value, maxLength = 180) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizePublicDriverTitle(raw) {
  if (!raw || typeof raw !== "object") return null;
  const definitionsVersion = number(raw.definitions_version, 0);
  const achievementId = text(raw.achievement_id, 128);
  const title = text(raw.title, 180);
  if (
    definitionsVersion < MIN_TITLE_DEFINITIONS_VERSION
    || !/^[a-z0-9_]+$/.test(achievementId)
    || !title
  ) return null;
  return {
    achievementId,
    title,
    description: text(raw.description, 360),
    icon: text(raw.icon, 16) || "✦",
    revision: text(raw.revision, 160) || null,
    selected: raw.selected === true
  };
}

export function normalizeAchievementCard(raw, { publicPreview = false } = {}) {
  if (!raw || typeof raw !== "object") return null;
  const id = text(raw.id, 128);
  if (!id) return null;
  const category = CATEGORY_SET.has(raw.category) ? raw.category : "career";
  const earned = raw.earned === true;
  const secret = raw.secret === true || raw.kind === "secret";
  const target = Math.max(0, number(raw.target));
  const progress = Math.max(0, number(raw.progress ?? raw.current));
  const ratio = clamp(number(raw.ratio, target > 0 ? progress / target : earned ? 1 : 0), 0, 1);
  const fallbackSeries = SERIES_BY_ACHIEVEMENT.get(id);
  return {
    id,
    category,
    name: text(raw.name || raw.title, 180),
    description: text(raw.description || raw.condition, 360),
    icon: text(raw.icon, 16) || "🏆",
    kind: ["progress", "counter", "secret"].includes(raw.kind) ? raw.kind : "progress",
    enabled: raw.enabled !== false,
    earned,
    earnedAt: text(raw.earned_at, 64) || null,
    progress,
    target,
    ratio,
    counter: Math.max(0, number(raw.counter ?? raw.times_earned ?? progress)),
    secret,
    evidenceStatus: text(raw.evidence_status, 64),
    unit: text(raw.unit, 32) || fallbackSeries?.unit || (raw.kind === "counter" ? "occurrence" : "count"),
    seriesId: text(raw.series_id, 128) || fallbackSeries?.id || null,
    seriesName: text(raw.series_name, 180) || fallbackSeries?.names?.ru || null,
    seriesNames: fallbackSeries?.names || null,
    tierOrder: Math.max(0, number(raw.tier_order, fallbackSeries?.tierOrder || 0)),
    repeatable: raw.repeatable === true || raw.kind === "counter",
    availability: text(raw.availability, 32) || "active",
    title: text(raw.title, 180),
    titlePriority: Math.max(0, number(raw.title_priority)),
    publicPreview
  };
}

function normalizeSummary(raw, cards) {
  const summary = raw && typeof raw === "object" ? raw : {};
  const enabled = cards.filter(card => card.enabled);
  const earnedFallback = enabled.filter(card => card.earned).length;
  const earned = Math.max(0, number(summary.earned, earnedFallback));
  const total = Math.max(earned, number(summary.total, enabled.length));
  const completionPercent = clamp(
    number(summary.completion_percent, total > 0 ? (earned / total) * 100 : 0),
    0,
    100
  );
  return {
    earned,
    total,
    completionPercent,
    title: text(summary.title, 180),
    titleDescription: text(summary.title_description, 360)
  };
}

export function normalizePublicAchievements(payload) {
  if (!payload || typeof payload !== "object") throw new TypeError("Invalid public achievements payload");
  const cards = (Array.isArray(payload.preview) ? payload.preview : [])
    .map(raw => normalizeAchievementCard(raw, { publicPreview: true }))
    .filter(Boolean)
    .slice(0, 3);
  const summary = normalizeSummary(payload.summary, cards);
  if (!summary.title) summary.title = text(payload.title, 180);
  if (!summary.titleDescription) summary.titleDescription = text(payload.title_description, 360);
  const rawCategories = Array.isArray(payload.categories)
    ? payload.categories
    : Array.isArray(payload.summary?.categories) ? payload.summary.categories : [];
  const categories = rawCategories.map(raw => {
    const category = typeof raw === "string" ? raw : raw?.id;
    if (!CATEGORY_SET.has(category)) return null;
    return {
      id: category,
      earned: typeof raw === "object" ? Math.max(0, number(raw.earned)) : null,
      total: typeof raw === "object" ? Math.max(0, number(raw.total)) : null
    };
  }).filter(Boolean);
  return {
    publicId: text(payload.public_id, 160),
    generatedAt: text(payload.generated_at, 64),
    stale: payload.stale === true,
    summary,
    categories,
    cards
  };
}

export function normalizeFullAchievements(payload) {
  if (!payload || typeof payload !== "object") throw new TypeError("Invalid private achievements payload");
  const source = Array.isArray(payload.achievements) ? payload.achievements : Array.isArray(payload.items) ? payload.items : [];
  const cards = source.map(raw => normalizeAchievementCard(raw)).filter(card => card?.enabled);
  const summary = normalizeSummary(payload.summary, cards);
  if (!summary.title) summary.title = text(payload.title, 180);
  if (!summary.titleDescription) summary.titleDescription = text(payload.title_description, 360);
  return {
    publicId: text(payload.public_id, 160),
    generatedAt: text(payload.generated_at, 64),
    stale: payload.stale === true,
    summary,
    cards
  };
}

export function categoryCounts(cards) {
  const counts = new Map(ACHIEVEMENT_CATEGORY_ORDER.map(category => [category, { earned: 0, total: 0 }]));
  for (const card of cards || []) {
    if (!card?.enabled || !counts.has(card.category)) continue;
    const value = counts.get(card.category);
    value.total += 1;
    if (card.earned) value.earned += 1;
  }
  return counts;
}

export function groupAchievementCards(cards) {
  const source = Array.isArray(cards) ? cards.filter(card => card?.enabled) : [];
  const grouped = new Map();
  const output = [];
  for (const card of source) {
    if (!card.seriesId) {
      output.push(card);
      continue;
    }
    if (!grouped.has(card.seriesId)) grouped.set(card.seriesId, []);
    grouped.get(card.seriesId).push(card);
  }
  for (const [seriesId, tiers] of grouped) {
    tiers.sort((left, right) => left.tierOrder - right.tierOrder || left.target - right.target || left.id.localeCompare(right.id));
    const earnedTiers = tiers.filter(card => card.earned);
    const remaining = tiers.filter(card => !card.earned);
    const highestEarned = earnedTiers.at(-1) || null;
    const nextTier = remaining[0] || null;
    const focus = nextTier || highestEarned || tiers[0];
    output.push({
      ...focus,
      id: `series:${seriesId}`,
      name: focus.seriesName || focus.seriesNames?.ru || focus.name,
      seriesId,
      seriesNames: focus.seriesNames,
      isSeries: true,
      earned: nextTier === null,
      complete: nextTier === null,
      tiers,
      tiersEarned: earnedTiers.length,
      tiersTotal: tiers.length,
      highestEarned,
      nextTier
    });
  }
  return output;
}

export function selectAchievementCards(cards, filter = "career") {
  const source = Array.isArray(cards) ? cards.filter(card => card?.enabled) : [];
  if (filter === "titles") {
    return source
      .filter(card => card.title)
      .map(card => ({ ...card, name: card.title, isTitle: true, seriesId: null }))
      .sort((left, right) => Number(right.earned) - Number(left.earned)
        || right.titlePriority - left.titlePriority
        || left.name.localeCompare(right.name, "ru"));
  }
  const grouped = groupAchievementCards(source);
  if (filter === "nearest") {
    return grouped
      .filter(card => !card.earned && !card.secret)
      .sort((left, right) => right.ratio - left.ratio || left.name.localeCompare(right.name, "ru"));
  }
  return grouped
    .filter(card => card.category === filter)
    .sort((left, right) => Number(left.earned) - Number(right.earned) || right.ratio - left.ratio || left.name.localeCompare(right.name, "ru"));
}

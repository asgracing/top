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
    title: text(summary.title, 180)
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

export function selectAchievementCards(cards, filter = "career") {
  const source = Array.isArray(cards) ? cards.filter(card => card?.enabled) : [];
  if (filter === "nearest") {
    return source
      .filter(card => !card.earned && !card.secret)
      .sort((left, right) => right.ratio - left.ratio || left.name.localeCompare(right.name, "ru"));
  }
  return source
    .filter(card => card.category === filter)
    .sort((left, right) => Number(right.earned) - Number(left.earned) || right.ratio - left.ratio || left.name.localeCompare(right.name, "ru"));
}

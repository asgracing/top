import test from "node:test";
import assert from "node:assert/strict";

import {
  categoryCounts,
  groupAchievementCards,
  normalizeFullAchievements,
  normalizePublicAchievements,
  selectAchievementCards
} from "../../src/pages/driver/achievements-model.js";

test("public achievements expose at most three preview cards and derive completion", () => {
  const payload = normalizePublicAchievements({
    public_id: "drv_test",
    summary: { earned: 2, total: 8, categories: ["career", "speed"] },
    preview: [
      { id: "one", category: "career", name: "One", earned: true, progress: 1, target: 1 },
      { id: "two", category: "speed", name: "Two", progress: 8, target: 10 },
      { id: "three", category: "events", name: "Three", progress: 2, target: 5 },
      { id: "four", category: "secret", name: "Four", secret: true }
    ]
  });

  assert.equal(payload.cards.length, 3);
  assert.equal(payload.summary.completionPercent, 25);
  assert.deepEqual(payload.categories.map(category => category.id), ["career", "speed"]);
});

test("tiered achievements are grouped into one series with the next milestone", () => {
  const payload = normalizeFullAchievements({
    achievements: [
      { id: "wins_1", category: "victories", name: "First", earned: true, progress: 59, target: 1 },
      { id: "wins_5", category: "victories", name: "Five", earned: true, progress: 59, target: 5 },
      { id: "wins_10", category: "victories", name: "Ten", earned: true, progress: 59, target: 10 },
      { id: "wins_25", category: "victories", name: "Twenty five", earned: true, progress: 59, target: 25 },
      { id: "wins_50", category: "victories", name: "Fifty", earned: true, progress: 59, target: 50 },
      { id: "wins_100", category: "victories", name: "Hundred", progress: 59, target: 100 }
    ]
  });

  const grouped = groupAchievementCards(payload.cards);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].seriesId, "wins");
  assert.equal(grouped[0].tiersEarned, 5);
  assert.equal(grouped[0].tiersTotal, 6);
  assert.equal(grouped[0].nextTier.id, "wins_100");
  assert.equal(grouped[0].progress, 59);
  assert.equal(grouped[0].target, 100);
});

test("full achievements exclude disabled definitions and count categories", () => {
  const payload = normalizeFullAchievements({
    summary: { earned: 1, total: 2 },
    achievements: [
      { id: "earned", category: "career", name: "Earned", enabled: true, earned: true, progress: 10, target: 10 },
      { id: "near", category: "career", name: "Near", enabled: true, progress: 9, target: 10 },
      { id: "blocked", category: "events", name: "Blocked", enabled: false, progress: 0, target: 1 }
    ]
  });

  assert.equal(payload.cards.length, 2);
  assert.deepEqual(categoryCounts(payload.cards).get("career"), { earned: 1, total: 2 });
});

test("closest filter hides locked secret details and sorts by ratio", () => {
  const payload = normalizeFullAchievements({
    achievements: [
      { id: "far", category: "career", name: "Far", progress: 2, target: 10 },
      { id: "near", category: "speed", name: "Near", progress: 9, target: 10 },
      { id: "secret", category: "secret", name: "Hidden", kind: "secret", progress: 99, target: 100 }
    ]
  });

  assert.deepEqual(selectAchievementCards(payload.cards, "nearest").map(card => card.id), ["near", "far"]);
});

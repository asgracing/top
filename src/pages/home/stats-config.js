export const leaderboardColumns = Object.freeze([
  { key: "rank", type: "number", className: "rank-column" },
  { key: "driver", type: "string", className: "driver-column" },
  { key: "elo", type: "number", className: "elo-column" },
  { key: "safety_rating", type: "number", className: "sr-column" },
  { key: "points", type: "number", className: "points-column" },
  { key: "wins", type: "number", className: "wins-column" },
  { key: "podiums", type: "number", className: "podiums-column" },
  { key: "races", type: "number", className: "races-column" },
  { key: "average_finish", type: "number", className: "avg-finish-column" },
  { key: "club", type: "string", className: "club-column", sortable: false },
  { key: "team", type: "string", className: "team-column", sortable: false }
]);

export const bestlapsColumns = Object.freeze([
  { key: "rank", type: "number" }, { key: "driver", type: "string" },
  { key: "elo", type: "number" }, { key: "safety_rating", type: "number" },
  { key: "best_lap", type: "time" }, { key: "car_name", type: "string" },
  { key: "session_type", type: "string" }, { key: "updated_at", type: "string" }
]);

export const clubsTeamsColumns = Object.freeze([
  { key: "position", type: "number", className: "rank-column" },
  { key: "display_name", type: "string" },
  { key: "short_name", type: "string" },
  { key: "total_points", type: "number", className: "points-column" },
  { key: "average_elo", type: "number", className: "elo-column" },
  { key: "average_sr", type: "number", className: "sr-column" },
  { key: "race_count", type: "number", className: "races-column" }
]);

export const HOME_STATS_TABS = Object.freeze({
  leaderboard: { panelId: "championship", subtitleKey: "combinedStatsSubtitleLeaderboard" },
  bestlaps: { panelId: "bestlaps", subtitleKey: "combinedStatsSubtitleBestlaps" },
  safety: { panelId: "worst-safety", subtitleKey: "combinedStatsSubtitleSafety" },
  clubsTeams: { panelId: "clubs-teams-stats", subtitleKey: "combinedStatsSubtitleClubsTeams" }
});

export function createHomeStatsState({ isHome = false } = {}) {
  return {
    activeTab: "leaderboard",
    pages: { leaderboard: 1, bestlaps: 1, safety: 1 },
    searches: { leaderboard: "", bestlaps: "", safety: "" },
    sorts: {
      leaderboard: { key: null, direction: null },
      bestlaps: { key: null, direction: null },
      safety: { key: null, direction: null }
    },
    bestlapsTrackFilter: "monza",
    deferredSections: { leaderboard: !isHome, bestlaps: !isHome, safety: !isHome, clubsTeams: !isHome }
  };
}

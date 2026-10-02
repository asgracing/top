export const normalizeChampionshipStatus = value => {
  const s = String(value||"").trim().toLowerCase();
  return s === "upcoming" ? "scheduled" : ["active", "scheduled", "finished"].includes(s) ? s : "archived";
}
export const championshipStatusTone = value => {
  const s = normalizeChampionshipStatus(value);
  return s === "archived" ? "finished" : s;
}

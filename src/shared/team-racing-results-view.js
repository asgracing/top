const escape = value => String(value ?? "—").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const lap = ms => Number.isFinite(ms) && ms > 0 && ms < 2147483647 ? `${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,"0")}.${String(ms%1000).padStart(3,"0")}` : "—";
export function renderTeamResults(race, language = "ru", {driverLink} = {}) {
  const en = language === "en", tx = (ru,english) => en ? english : ru;
  if (!Array.isArray(race?.team_results)) return `<p>${tx("Командные результаты обрабатываются.","Team results are being processed.")}</p>`;
  if (!race.team_results.length) return `<p class="site-empty">${tx("Командных результатов пока нет.","No team results yet.")}</p>`;
  const personal = new Map((race.results || []).map(p => [p.public_id, p]));
  return `<div class="table-wrap page-table-scroll"><table class="race-results-grid page-table results-table team-results-table"><thead><tr><th>#</th><th>${tx("Команда / экипаж","Team / crew")}</th><th>${tx("Машина","Car")}</th><th>${tx("Круги","Laps")}</th><th>${tx("Лучший круг","Best lap")}</th><th>${tx("Очки команды","Team points")}</th></tr></thead><tbody>${race.team_results.map(team=>`<tr${team.status === 'classified' && team.position >= 1 && team.position <= 3 ? ` data-podium-place="${escape(team.position)}"` : ''}><td>${escape(team.position ?? team.status)}</td><td><strong>${escape(team.team_name)}</strong> · #${escape(team.race_number)}${(team.drivers || []).map(pilot=>{
    const p = pilot.personal_result || personal.get(pilot.public_id);
    const name = p?.driver || pilot.display_name || pilot.public_id;
    const details = p ? `${tx("Очки","Points")}: ${p.points ?? "—"} · ΔElo ${p.elo_rating_delta ?? "—"} · SR ${p.safety_rating_after ?? p.safety_rating ?? p.safety_after ?? "—"}` : pilot.participated ? tx("Ехал","Drove") : tx("Не ехал","Did not drive");
    const linkedName = driverLink ? driverLink({public_id:pilot.public_id,driver:name}) : `<a class="driver-link" href="${en?"/driver/":"/ru/driver/"}?id=${encodeURIComponent(pilot.public_id)}">${escape(name)}</a>`;
    return `<div class="race-note">${linkedName} · ${escape(details)}</div>`;
  }).join("")}</td><td>${escape(team.car_name || `ACC #${team.car_model}`)}</td><td>${escape(team.lap_count)}</td><td>${escape(team.best_lap || lap(team.best_lap_ms))}</td><td>${escape(team.points ?? 0)}</td></tr>`).join("")}</tbody></table></div>`;
}
export function teamSeasonStandings(races) {
  const teams = new Map(), occurrences = new Map();
  for (const race of races) if (race.participation_mode === "team" && Array.isArray(race.team_results)) occurrences.set(race.occurrence_id || race.event_id,race);
  for (const race of occurrences.values()) for (const result of race.team_results) {
    const row = teams.get(result.team_id) || {public_id:result.team_id,team_id:result.team_id,driver:result.team_name,points:0,races:0,wins:0,podiums:0,best_laps:0,race_points:{}};
    row.points += result.points || 0; row.races += result.status !== "DNS";
    row.wins += result.status === "classified" && result.position === 1;
    row.podiums += result.status === "classified" && result.position <= 3;
    row.best_laps += result.had_best_lap === true;
    row.race_points[race.event_id] = result.points || 0; teams.set(result.team_id,row);
  }
  return [...teams.values()].sort((a,b)=>b.points-a.points || b.wins-a.wins || b.podiums-a.podiums || a.driver.localeCompare(b.driver)).map((row,index)=>({...row,rank:index+1}));
}

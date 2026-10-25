// Apply visibility/search before pagination; unknown legacy flags remain visible.
export function profileRaces(races, {showUncounted=false, query='', sort='date', trackName, date}) {
  const search=String(query).toLocaleLowerCase();
  return (races||[]).filter(race => (showUncounted || race.counted_for_stats!==false) &&
    `${trackName(race.track_code||race.track||'silverstone')} ${race.car_name||''} ${date(race.finished_at)}`.toLocaleLowerCase().includes(search))
    .sort((a,b) => sort==='position' ? (a.position??999)-(b.position??999) : String(b.finished_at).localeCompare(String(a.finished_at)));
}

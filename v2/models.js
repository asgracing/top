export function eventKind(event, singleModel = false) {
  const kind=String(event?.event_type||'').toLowerCase();
  if(kind.includes('endurance')||event?.race_format==='endurance')return 'endurance';
  if(kind.includes('championship')||event?.competition_mode==='championship')return 'championship';
  if(singleModel||kind.includes('mono'))return 'mono';
  return 'hourly';
}
export function normalizeTablePage(result) {
  if(!result)return {items:[],total_items:0};
  return {...result,total_items:result.total_items??result.totalItems??result.items?.length??0};
}
// Home previews and full rating rows publish the same SR counters under two schemas.
export function normalizeSafetyRow(row) {
  return {...row,
    active_strikes:row.strikes?.active??row.active_strikes??null,
    races_count:row.races_count??row.safety_races??null,
    total_laps:row.total_laps??row.safety_total_laps??null,
    total_invalid_laps:row.total_invalid_laps??row.safety_total_invalid_laps??null,
    total_counted_penalties:row.total_counted_penalties??row.safety_total_counted_penalties??null,
    total_incident_points:row.total_incident_points??row.safety_total_incident_points??null
  };
}

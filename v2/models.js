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

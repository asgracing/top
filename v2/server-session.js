// Published ACC status reports minutes remaining; do not invent a countdown
// between snapshots or display a timer for an offline/stale server.
export function serverSessionLabel(server, label, {compact=false}={}) {
  if(!server.online)return compact?'OFF':label('waiting');
  const source=server.server||{};
  const raw=String(source.session_type||source.current_session||source.session||server.session||'').trim().toLowerCase();
  const key=raw.startsWith('r')?'race':raw.startsWith('q')?'qualifying':raw.startsWith('p')?'practice':null;
  const phase=compact?(key?{race:'R',qualifying:'Q',practice:'P'}[key]:'—'):(key?label(key):'—');
  const value=source.session_remaining_minutes??source.remaining_minutes??source.session_time_left_minutes;
  const explicit=String(source.session_label||source.session_status_label||source.session_short_label||server.session||'').trim();
  const fallback=explicit.match(/^(?:[PQR]\s+)?(\d+(?:\.\d+)?)$/i)?.[1];
  const minutes=value==null||String(value).trim()===''?Number(fallback??NaN):Number(value);
  return Number.isFinite(minutes)&&minutes>=0?`${phase} (${Math.round(minutes)} ${label('minute')})`:phase;
}

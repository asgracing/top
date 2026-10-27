import {isInstanceStatusStale,serverObservationAgeMs,serverDetailMaxAgeMs} from './freshness.js?v=20261026smooth1';

export function serverConditions(server,now=Date.now()) {
  const fresh = stamp => {
    if (!server || server.server_online!==true || server.telemetry_state!=='live' || isInstanceStatusStale(server,now)) return false;
    const age=serverObservationAgeMs(server,stamp,now);
    return Number.isFinite(age) && age>=-1000 && age<=serverDetailMaxAgeMs(server);
  };
  const temperature=value=>typeof value==='number' && Number.isFinite(value) && value>=-100 && value<=100 ? `${Math.round(value)}°` : '—';
  const weather=fresh(server?.conditions_observed_at), clock=fresh(server?.game_time_observed_at);
  const rain=server?.rain_intensity, seconds=server?.game_time_seconds;
  const rainText=weather && typeof rain==='number' && Number.isFinite(rain) && rain>=0 && rain<=1
    ? rain>0 && rain<0.01 ? '<1%' : `${Math.round(rain*100)}%` : '—';
  const minutes=clock && typeof seconds==='number' && Number.isFinite(seconds) && seconds>=0 && seconds<86400 ? Math.floor(seconds/60) : null;
  return {air:weather?temperature(server.air_temperature_c):'—',track:weather?temperature(server.track_temperature_c):'—',rain:rainText,
    time:minutes===null?'—':`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`};
}

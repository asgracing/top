import {isInstanceStatusStale,serverObservationAgeMs,parseServerStatusUpdatedAt} from './freshness.js?v=20261026smooth1';

export const STATUS_GRACE_MS=10000;
// Align newly received hub data with the viewer clock; cached rows retain the
// original alignment and observation, so polling cannot renew their lifetime.
export function withViewerClock(server,serverNow,viewerNow=Date.now()){
  const offset=viewerNow-serverNow;
  return server&&Number.isFinite(serverNow)&&Number.isFinite(offset)&&Math.abs(offset)<=86400000
    ? {...server,viewer_clock_offset_ms:offset}:server;
}
const scope=s=>JSON.stringify([s?.boot_id||null,s?.track_code||null,s?.session?.id||null]);

// Presentation grace only: keep original observations, and never renew their
// lifetime merely because a failing endpoint or fallback is polled again.
export class ServerStatusContinuity {
  constructor(){this.rows=new Map();this.snapshot=null;}
  accept(snapshot,now=Date.now()){
    const incoming=snapshot;
    if(snapshot&&snapshot.source!=='asg-live-telemetry-status'&&![...this.rows.values()].some(old=>
      now-old.acceptedAt<=STATUS_GRACE_MS&&serverObservationAgeMs(old.row,old.row.observed_at||old.row.updated_at,now)<=STATUS_GRACE_MS))return snapshot;
    if(!snapshot||snapshot.source!=='asg-live-telemetry-status'){
      if(!this.snapshot)return snapshot;
      snapshot=this.snapshot;
    }
    const input=snapshot.servers||{},servers={};
    for(const key of new Set([...Object.keys(input).slice(0,128),...this.rows.keys()])){
      const row=incoming===snapshot&&snapshot.telemetry_stream===true
        ?withViewerClock(input[key],parseServerStatusUpdatedAt(snapshot.updated_at),now):input[key],old=this.rows.get(key);
      const age=row?serverObservationAgeMs(row,row.observed_at||row.updated_at,now):Infinity;
      const valid=row&&!isInstanceStatusStale(row,now)&&age>=-1000&&age<=STATUS_GRACE_MS;
      const newer=valid&&(!old||scope(old.row)!==scope(row)||
        parseServerStatusUpdatedAt(row.observed_at||row.updated_at)>=parseServerStatusUpdatedAt(old.row.observed_at||old.row.updated_at));
      if(newer){this.rows.set(key,{row,acceptedAt:now});servers[key]=row;continue;}
      const oldAge=old?serverObservationAgeMs(old.row,old.row.observed_at||old.row.updated_at,now):Infinity;
      const same=!row||scope(row)===scope(old?.row)||row.delivery==='stale';
      if(old&&same&&now-old.acceptedAt<=STATUS_GRACE_MS&&oldAge<=STATUS_GRACE_MS){servers[key]=old.row;continue;}
      this.rows.delete(key);
      if(row)servers[key]={...row,stale:true};
    }
    this.snapshot={...snapshot,servers};return this.snapshot;
  }
}

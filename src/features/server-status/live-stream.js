// One selected server, one SSE connection. No browser-side ratings or admission logic.
import {LiveClock,measureLiveClock,CLOCK_MAX_AGE_MS,CLOCK_MAX_UNCERTAINTY_MS} from './live-clock.js?v=20261025clock1';
export const DISPLAY_BUFFER_MS = 500;
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const forbidden = new Set(['__proto__','prototype','constructor']);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const identity = c => `${c.car_id}:${c.connection_id ?? ''}`;

function validate(value, depth=0, budget={left:100000}) {
  if (--budget.left < 0 || depth > 14) throw Error('Telemetry size limit');
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value === 'string' && value.length <= 4096) return;
  if (Array.isArray(value) && value.length <= 4096) {
    value.forEach(v=>validate(v,depth+1,budget)); return;
  }
  if (record(value) && Object.keys(value).length <= 4096) {
    for (const [key,v] of Object.entries(value)) {
      if (forbidden.has(key) || key.length > 256) throw Error('Invalid telemetry key');
      validate(v,depth+1,budget);
    }
    return;
  }
  throw Error('Invalid telemetry value');
}

export function mergeLivePatch(old, patch) {
  if (!record(patch)) return structuredClone(patch);
  const next = record(old) ? {...old} : {};
  if (own(patch,'$removed')) {
    if (!Array.isArray(patch.$removed) || patch.$removed.some(k=>typeof k!=='string'||forbidden.has(k))) throw Error('Invalid deletion');
    for (const key of patch.$removed) delete next[key];
  }
  for (const [key,value] of Object.entries(patch)) {
    if (forbidden.has(key)) throw Error('Invalid telemetry key');
    if (key !== '$removed') next[key] = mergeLivePatch(next[key],value);
  }
  return next;
}

export function publicLiveServer(keyed) {
  if (!record(keyed)) return null;
  const server = {...keyed};
  for (const key of ['drivers','classification','spectators']) {
    if (!record(server[key]) || Object.keys(server[key]).length > 256) return null;
    server[key] = Object.values(server[key]);
  }
  server.live_drivers = server.drivers;
  return server;
}

// Times belong to the VPS clock. This is the ONLY intentional display buffer;
// the VPS retains history but does not delay forwarding it by another 500 ms.
export class PoseTimeline {
  constructor() { this.clear(); }
  clear() { this.frames=[];this.tracks=new Map();this.offset=null;this.clockSample=null;this.scope=null; }
  synchronize(sample) {
    if (!sample || !finite(sample.offset_ms) || !finite(sample.measured_at) || !finite(sample.uncertainty_ms)
        || sample.uncertainty_ms<0 || sample.uncertainty_ms>CLOCK_MAX_UNCERTAINTY_MS) return;
    if(this.offset!==null&&Math.abs(sample.offset_ms-this.offset)>100){this.frames=[];this.tracks.clear();this.scope=null;}
    this.offset=sample.offset_ms;this.clockSample=sample;
  }
  ingest(history, serverTime, receivedAt) {
    if(!finite(serverTime)||!finite(receivedAt))throw Error('Invalid pose clock');
    if (!Array.isArray(history) || history.length>16) throw Error('Invalid pose history');
    for (const frame of history) {
      if (!record(frame) || !finite(frame.at_ms) || frame.at_ms>serverTime+1000 || frame.at_ms<serverTime-10000
          || !Array.isArray(frame.cars) || frame.cars.length>256) throw Error('Invalid pose frame');
      const scope=JSON.stringify([frame.boot_id,frame.session_id,frame.track_code,frame.clock_epoch]);
      if (scope!==this.scope) { this.frames=[];this.tracks.clear();this.scope=scope; }
      if (this.frames.length && frame.at_ms<=this.frames.at(-1).at_ms) continue;
      const seen=new Set();
      const cars=frame.cars.filter(c=>{
        if (!record(c) || !Number.isInteger(c.car_id) || c.car_id<0 || c.car_id>65535
            || c.connected===false || c.role==='spectator' || c.coordinates_source!=='acc-native-world-xz'
            || !finite(c.world_x) || !finite(c.world_z) || Math.abs(c.world_x)>1e6 || Math.abs(c.world_z)>1e6
            || frame.clock_verified!==true || !finite(c.position_at_ms)
            || c.position_at_ms>frame.at_ms || frame.at_ms-c.position_at_ms>5000
            || !finite(c.position_age_ms)||c.position_age_ms<0||c.position_age_ms>5000
            || c.position_age_ms>frame.at_ms-c.position_at_ms+50
            || !finite(c.clock_uncertainty_ms) || c.clock_uncertainty_ms<0 || c.clock_uncertainty_ms>CLOCK_MAX_UNCERTAINTY_MS
            || seen.has(c.car_id)) return false;
        seen.add(c.car_id);return true;
      });
      this.frames.push({...frame,cars});
      if (this.frames.length>20) this.frames.shift();
    }
    // Rebuild once per incoming batch; animation samples only these bounded tracks.
    this.tracks=new Map();
    for(const frame of this.frames)for(const car of frame.cars){
      const key=identity(car),points=this.tracks.get(key)||[];
      if(!points.length||car.position_at_ms>points.at(-1).position_at_ms)points.push(car);
      this.tracks.set(key,points);
    }
  }
  sample(now, reducedMotion=false) {
    if (!this.frames.length || this.offset===null || now<this.clockSample.measured_at
        || now-this.clockSample.measured_at>CLOCK_MAX_AGE_MS) return [];
    const target=now+this.offset-DISPLAY_BUFFER_MS;
    const newest=this.frames.at(-1);
    if (target<this.frames[0].at_ms || target-newest.at_ms>500) return [];
    let left=newest;
    for (let i=1;i<this.frames.length;i++) if (this.frames[i].at_ms>target) {
      left=this.frames[i-1];break;
    }
    return left.cars.flatMap(member=>{
      const points=this.tracks.get(identity(member))||[];
      let previous=null,next=null;
      for(const point of points){if(point.position_at_ms<=target)previous=point;else{next=point;break;}}
      if(!previous)return [];
      const uncertainty=this.clockSample.uncertainty_ms+previous.clock_uncertainty_ms;
      if(!next)return target-previous.position_at_ms<=uncertainty?[{...member,...previous}]:[];
      const elapsed=next.position_at_ms-previous.position_at_ms;
      const distance=Math.hypot(next.world_x-previous.world_x,next.world_z-previous.world_z);
      if(elapsed>350||distance>10+120*elapsed/1000
          ||(next.pit_state!==previous.pit_state&&[previous.pit_state,next.pit_state].includes('pit_box')))return [];
      if(reducedMotion)return [{...member,...next}];
      const t=(target-previous.position_at_ms)/elapsed;
      return [{...member,world_x:previous.world_x+(next.world_x-previous.world_x)*t,
        world_z:previous.world_z+(next.world_z-previous.world_z)*t,position_at_ms:target}];
    });
  }
}

export class LiveServerStream {
  constructor(key,{changed=()=>{},EventSourceClass=globalThis.EventSource,clock=()=>performance.now(),fetchImpl=globalThis.fetch}={}) {
    if (!/^(main|sunset|hourly|assetto-corsa-competizione-dedic(?:-[2-9]|-[1-9]\d{1,3})?)$/.test(key)) throw Error('Invalid server ID');
    this.key=key;this.changed=changed;this.clock=clock;this.timeline=new PoseTimeline();
    this.source=null;this.server=null;this.received=-Infinity;this.sequence=0;this.epoch=null;this.delivery='stale';
    this.EventSourceClass=EventSourceClass;this.fetchImpl=fetchImpl;this.clockSync=new LiveClock();this.connect();
    if(fetchImpl)this.synchronizeClock();
  }
  async synchronizeClock() {
    if(this.closed)return;
    this.clockAbort=new AbortController();this.clockTimeout=setTimeout(()=>this.clockAbort?.abort(),2000);
    try{
      const measured=await measureLiveClock(this.fetchImpl,this.clock,this.clockAbort.signal);
      if(!this.closed){this.timeline.synchronize(this.clockSync.observe(measured.sent,measured.received,measured.reply));this.changed();}
    }catch{/* Keep only still-valid earlier samples; otherwise motion stays unavailable. */}
    finally{
      clearTimeout(this.clockTimeout);
      if(!this.closed)this.clockTimer=setTimeout(()=>this.synchronizeClock(),5000);
    }
  }
  connect() {
    if (this.closed || !this.EventSourceClass) return;
    this.source=new this.EventSourceClass('https://data.asgracing.ru/telemetry/v1/stream/'+encodeURIComponent(this.key));
    this.source.addEventListener('telemetry',e=>{
      if(this.closed)return;
      try { this.accept(e.data); } catch {
        this.timeline.clear();this.server=null;this.source.close();this.source=null;
        // Browser reconnect must request a full baseline, never apply a patch to lost state.
        clearTimeout(this.retry);this.retry=setTimeout(()=>{this.sequence=0;this.epoch=null;this.connect();},1000);
      }
    });
    this.source.onerror=()=>{this.sequence=0;this.epoch=null;this.timeline.clear();};
  }
  accept(raw) {
    if (typeof raw!=='string' || raw.length>4*1024*1024) throw Error('Invalid telemetry event');
    const event=JSON.parse(raw);validate(event);
    if (!Number.isSafeInteger(event.sequence) || event.sequence<1 || !Number.isSafeInteger(event.base)
        || typeof event.hub_epoch!=='string' || !finite(event.server_time_ms) || event.buffer_ms!==DISPLAY_BUFFER_MS
        || !['direct','relay','stale'].includes(event.delivery)) throw Error('Invalid telemetry header');
    const reset=event.base===0;
    if (!reset && (event.base!==this.sequence || event.hub_epoch!==this.epoch || event.sequence!==this.sequence+1)) throw Error('Telemetry requires full baseline');
    const state=mergeLivePatch(reset?null:this.keyed,event.patch);
    const server=publicLiveServer(state);
    if (state!==null && (!server || server.id!==this.key)) throw Error('Telemetry server mismatch');
    if (reset || event.delivery!=='direct') this.timeline.clear();
    this.timeline.synchronize(this.clockSync.current(this.clock()));
    if (event.delivery==='direct') this.timeline.ingest(event.history,event.server_time_ms,this.clock());
    this.keyed=state;this.server=server;this.delivery=event.delivery;this.received=this.clock();
    this.sequence=event.sequence;this.epoch=event.hub_epoch;this.changed();
  }
  latest() { return this.clock()-this.received<=2000 ? this.server : null; }
  close() { this.closed=true;clearTimeout(this.retry);clearTimeout(this.clockTimer);clearTimeout(this.clockTimeout);
    this.clockAbort?.abort();this.source?.close();this.source=null;this.timeline.clear(); }
}

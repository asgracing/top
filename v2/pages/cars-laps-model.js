import {liveCarLaps} from '../live-stats.js';

// Published track rankings contain each driver's personal best, not every lap.
export function carLapsForTrack(payload,track) {
  if(!Array.isArray(payload?.items))throw new Error('Invalid track records');
  const records=new Map();
  for(const row of payload.items){
    if(!row||typeof row!=='object')continue;
    const code=row.track_code??row.track??row.best_lap_track;
    const model=row.best_lap_car_model_id??row.car_model_id;
    if(model==null||model==='')continue;
    const car=Number(model),ms=Number(row.best_lap_ms);
    if(code!==track||!Number.isInteger(car)||car<0||!Number.isFinite(ms)||ms<=0||[2147483647,4294967295].includes(ms))continue;
    const previous=records.get(car);
    if(previous&&(previous.best_lap_ms<ms||(previous.best_lap_ms===ms&&String(previous.best_lap_updated_at)>=String(row.best_lap_updated_at??row.updated_at??''))))continue;
    const minutes=Math.floor(ms/60000),seconds=Math.floor(ms%60000/1000),millis=Math.floor(ms%1000);
    records.set(car,{best_lap_ms:ms,best_lap:`${minutes}:${String(seconds).padStart(2,'0')}.${String(millis).padStart(3,'0')}`,best_lap_track:track,best_lap_public_id:/^drv_[a-z0-9]+$/i.test(row.public_id||'')?row.public_id:null,best_lap_driver:typeof row.driver==='string'?row.driver:null,best_lap_updated_at:row.best_lap_updated_at??row.updated_at??null,best_lap_session_type:row.best_lap_session_type??row.session_type??null});
  }
  return records;
}

export function createCarLapsLoader({request=globalThis.fetch,base='https://data.asgracing.ru/top-data/v2/',getRevision=()=>undefined}={}) {
  const cache=new Map();let active=null;
  function cancel(){active?.controller.abort();active=null;}
  function load(track){
    if(!/^[a-z0-9_-]+$/.test(track||''))return Promise.reject(new Error('Invalid track'));
    const revision=getRevision(),key=`${revision||''}:${track}`;
    if(active?.key===key)return active.promise;
    cancel();
    if(cache.has(key))return Promise.resolve(cache.get(key));
    const controller=new AbortController(),job={track,key,controller};active=job;
    job.promise=(async()=>{
      let result=await liveCarLaps(track,request,controller.signal,revision);
      if(result===null&&revision)throw Object.assign(new Error('Statistics rollback during record read'),{status:409});
      if(!result){
        // Keep only model records when the public API is unavailable.
        const response=await request(new URL(`tables/bestlaps-${track}.json`,base).href,{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(60000)])});
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        result=carLapsForTrack(await response.json(),track);
      }
      controller.signal.throwIfAborted();
      cache.set(key,result);if(cache.size>4)cache.delete(cache.keys().next().value);
      return result;
    })().finally(()=>{if(active===job)active=null;});
    return job.promise;
  }
  return {load,cancel};
}

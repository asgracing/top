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

export function createCarLapsLoader({request=globalThis.fetch,base='https://data.asgracing.ru/top-data/v2/'}={}) {
  const cache=new Map();let active=null;
  function cancel(){active?.controller.abort();active=null;}
  function load(track){
    if(!/^[a-z0-9_-]+$/.test(track||''))return Promise.reject(new Error('Invalid track'));
    if(active?.track===track)return active.promise;
    cancel();
    if(cache.has(track))return Promise.resolve(cache.get(track));
    const controller=new AbortController(),job={track,controller};active=job;
    job.promise=(async()=>{
      // Do not retain large rankings in the shared JSON cache. Keep only model records.
      const response=await request(new URL(`tables/bestlaps-${track}.json`,base).href,{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(60000)])});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const result=carLapsForTrack(await response.json(),track);
      controller.signal.throwIfAborted();
      cache.set(track,result);if(cache.size>4)cache.delete(cache.keys().next().value);
      return result;
    })().finally(()=>{if(active===job)active=null;});
    return job.promise;
  }
  return {load,cancel};
}

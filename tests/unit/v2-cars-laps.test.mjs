import assert from 'node:assert/strict';
import {test} from 'node:test';
import {carLapsForTrack,createCarLapsLoader} from '../../v2/pages/cars-laps-model.js';

const row=(ms,car=36,extra={})=>({track:'imola',car_model_id:car,best_lap_ms:ms,driver:'Pilot',public_id:'drv_123',updated_at:'2026-10-01',...extra});
test('model records select the fastest valid personal lap on the selected track and retain its author',()=>{
 const records=carLapsForTrack({items:[row(110001),row(100123,36,{driver:'Fast Pilot',public_id:'drv_456'}),row(99001,36,{track:'spa'}),row(120000,34),row(0,34),row(2147483647,34),row(1000,null),null]},'imola');
 assert.equal(records.size,2);assert.deepEqual(records.get(36),{best_lap_ms:100123,best_lap:'1:40.123',best_lap_track:'imola',best_lap_public_id:'drv_456',best_lap_driver:'Fast Pilot',best_lap_updated_at:'2026-10-01',best_lap_session_type:null});
 assert.equal(records.get(34).best_lap_ms,120000);assert.equal(records.has(0),false);
});
test('equal laps prefer the latest record; invalid driver identities never produce profile links',()=>{
 const records=carLapsForTrack({items:[row(110000,36,{driver:'Newer',updated_at:'2026-10-07',public_id:'bad/id'}),row(110000,36,{driver:'Older',updated_at:'2026-10-01'})]},'imola');
 assert.equal(records.get(36).best_lap_driver,'Newer');assert.equal(records.get(36).best_lap_public_id,null);
 assert.throws(()=>carLapsForTrack({},'imola'),/Invalid/);
 assert.equal(carLapsForTrack({items:[]},'imola').size,0);
});
test('loader coalesces requests, caches only compact results, retries failures and validates paths',async()=>{
 const calls=[];let fail=true;
 const loader=createCarLapsLoader({request:async url=>{calls.push(url);return fail?{ok:false,status:503}:{ok:true,json:async()=>({items:[row(100123)]})};}});
 await assert.rejects(loader.load('../secret'),/Invalid track/);assert.equal(calls.length,0);
 await assert.rejects(loader.load('imola'),/503/);fail=false;
 const first=loader.load('imola'),second=loader.load('imola');assert.equal(first,second);
 const result=await first;assert.equal(await loader.load('imola'),result);assert.equal(calls.length,2);assert.ok(result instanceof Map);
});
test('switching tracks cancels the previous load and never caches its late response',async()=>{
 let release,signal;
 const loader=createCarLapsLoader({request:async(url,options)=>{
  if(url.includes('imola')){signal=options.signal;return new Promise(resolve=>release=resolve);}
  return {ok:true,json:async()=>({items:[row(120000,36,{track:'spa'})]})};
 }});
 const previous=loader.load('imola');const rejected=assert.rejects(previous,{name:'AbortError'});
 await loader.load('spa');assert.equal(signal.aborted,true);
 release({ok:true,json:async()=>({items:[row(100123)]})});await rejected;
});

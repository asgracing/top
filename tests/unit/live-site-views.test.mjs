import assert from 'node:assert/strict';
import test from 'node:test';
import {liveSiteView,liveBestlapTracks} from '../../v2/live-stats.js';
import {createCarLapsLoader} from '../../v2/pages/cars-laps-model.js';

const cars={schema_version:1,generated_at:'2026-11-11T12:00:00+00:00',items:[{car_model_id:32,car_name:'Ferrari 296 GT3',races:5}]};
const period={summary:{races:1},awards:{},lists:Object.fromEntries(['active','movers','clean','stable','fastest','cars'].map(key=>[key,[]]))};
const fun={schema_version:1,generated_at:cars.generated_at,week:period,month:period};
const response=(payload,status=200)=>Response.json(payload,{status});
function site(t){globalThis.location={origin:'https://asgracing.ru'};t.after(()=>delete globalThis.location);}

test('whole cars and fun views use their own API and retain the sporting revision',async t=>{
  site(t);
  for(const [name,payload] of Object.entries({cars,fun})){
    const result=await liveSiteView(name,{request:async raw=>{
      assert.equal(new URL(raw).pathname,`/race-archive-shadow/v1/site/views/${name}`);
      return response({revision:120,archive_revision:127,payload});
    }});
    assert.deepEqual(result.payload,payload);assert.equal(result.revision,120);
  }
});

test('only an explicit legacy mode allows file fallback; ordinary errors and incomplete views remain errors',async t=>{
  site(t);
  assert.equal(await liveSiteView('fun',{request:async()=>response({error:'stats_legacy'},503)}),null);
  await assert.rejects(liveSiteView('fun',{request:async()=>response({error:'archive_unavailable'},503)}),{status:503});
  await assert.rejects(liveSiteView('fun',{request:async()=>response({revision:1,archive_revision:1,payload:{...fun,month:null}})}),/period/);
  await assert.rejects(liveSiteView('cars',{request:async()=>response({revision:1,archive_revision:1,payload:{...cars,items:[cars.items[0],cars.items[0]]}})}),/catalog/);
});

test('track catalogs and model records pin the catalog revision and invalidate cached laps after refresh',async t=>{
  site(t);let revision=10,calls=0;
  assert.deepEqual(await liveBestlapTracks({revision,request:async raw=>{
    assert.equal(new URL(raw).searchParams.get('revision'),'10');
    return response({revision,page:1,total_items:1,items:[{track_code:'spa'}]});
  }}),[{track_code:'spa'}]);
  const loader=createCarLapsLoader({getRevision:()=>revision,request:async raw=>{
    calls++;assert.equal(new URL(raw).searchParams.get('revision'),String(revision));
    return response({revision,total_items:1,items:[{car_model_id:32,best_lap_track:'spa',best_lap_ms:120000+revision}]});
  }});
  assert.equal((await loader.load('spa')).get(32).best_lap_ms,120010);
  await loader.load('spa');assert.equal(calls,1);
  revision=11;assert.equal((await loader.load('spa')).get(32).best_lap_ms,120011);assert.equal(calls,2);
  const rollback=createCarLapsLoader({getRevision:()=>revision,request:async()=>response({error:'stats_legacy'},503)});
  await assert.rejects(rollback.load('spa'),{status:409});
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {ServerStatusContinuity} from '../../src/features/server-status/continuity.js';
import {loadPreferredServerStatus} from '../../src/features/server-status/telemetry.js';
import {serverObservationAgeMs} from '../../src/features/server-status/freshness.js';
const start=Date.parse('2026-10-26T10:00:00Z');
const row=(extra={})=>({source:'acc-local-telemetry',status:'online',telemetry_state:'live',
  observed_at:new Date(start).toISOString(),source_age_ms:0,roster_complete:true,
  boot_id:'b',track_code:'monza',session:{id:'s'},players_online:12,...extra});
const snapshot=servers=>({schema_version:3,source:'asg-live-telemetry-status',updated_at:new Date(start).toISOString(),servers});

test('one incomplete/stale host sample cannot blank a healthy directory or extend its original lifetime',()=>{
  const c=new ServerStatusContinuity(),good=row();
  c.accept(snapshot({main:good}),start);
  for(const bad of [row({stale:true}),row({roster_complete:false}),row({status:'unknown'})]){
    assert.equal(c.accept(snapshot({main:bad}),start+600).servers.main,good);
  }
  const previousSession=row({stale:true,delivery:'stale',boot_id:'old',session:{id:'yesterday'}});
  assert.equal(c.accept(snapshot({main:previousSession}),start+900).servers.main,good,'A stale backup cannot confirm a new session');
  const held=c.accept(null,start+3000);
  assert.equal(held.servers.main.observed_at,good.observed_at);
  assert.equal(held.servers.main.players_online,12);
  assert.equal(c.accept(null,start+11000).servers.main.stale,true);
});

test('confirmed offline and changed boot/track/session do not inherit old online state',()=>{
  const c=new ServerStatusContinuity();c.accept(snapshot({main:row()}),start);
  const offline=row({status:'offline',telemetry_state:'offline',players_online:0});
  assert.equal(c.accept(snapshot({main:offline}),start+100).servers.main,offline);
  for(const extra of [{boot_id:'new'},{track_code:'spa'},{session:{id:'new'}}]){
    const cache=new ServerStatusContinuity();cache.accept(snapshot({main:row()}),start);
    assert.equal(cache.accept(snapshot({main:row({...extra,stale:true})}),start+600).servers.main.stale,true);
  }
});

test('old relay cannot roll back a newer direct roster; absent new instances survive only the grace period',()=>{
  const c=new ServerStatusContinuity(),good=row();c.accept(snapshot({main:good}),start);
  const older=row({observed_at:new Date(start-1000).toISOString(),players_online:2});
  assert.equal(c.accept(snapshot({main:older}),start+100).servers.main,good);
  assert.equal(c.accept(snapshot({}),start+1000).servers.main,good);
  assert.equal(c.accept(snapshot({}),start+11000).servers.main,undefined);
  const fallback={schema_version:2,servers:{main:{players_online:4}}};
  const newer=new ServerStatusContinuity();newer.accept(snapshot({main:good}),start);
  assert.equal(newer.accept(fallback,start+11000),fallback,'The legacy backup still works after the grace expires');
});

test('a total HTTP failure retains the previous snapshot without mutating source timestamps',async()=>{
  const continuity=new ServerStatusContinuity();
  const good=snapshot({main:row({observed_at:new Date().toISOString()})});
  await loadPreferredServerStatus('live','legacy',async()=>good,{directUrl:'direct',continuity});
  const result=await loadPreferredServerStatus('live','legacy',async()=>{throw Error('network');},{directUrl:'direct',continuity});
  assert.equal(result.servers.main.observed_at,good.servers.main.observed_at);
});

test('viewer clock skew does not turn live hub observations stale or renew a cached response',()=>{
  const c=new ServerStatusContinuity();
  const input={...snapshot({main:row()}),telemetry_stream:true};
  const aligned=c.accept(input,start-3100).servers.main;
  assert.equal(aligned.stale,undefined);
  assert.equal(aligned.observed_at,input.servers.main.observed_at);
  assert.equal(serverObservationAgeMs(aligned,aligned.observed_at,start-3100),0);
  assert.equal(c.accept(null,start-3100+11000).servers.main.stale,true);
});

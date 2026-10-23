import test from 'node:test';
import assert from 'node:assert/strict';
import {serverPilotCount,driverInterval,driverPitLabel,DETAIL_MAX_AGE_MS} from '../../src/features/server-status/live-details.js';
import {renderServerRoster} from '../../src/features/server-status/roster.js';

const now=Date.parse('2026-10-23T12:00:00Z');
const server=()=>({source:'acc-local-telemetry',telemetry_state:'live',status:'online',roster_complete:true,
  players_online:4,driver_capacity:29,source_age_ms:0,observed_at:new Date(now).toISOString(),session:{type:'Race'}});

test('pilot capacity is explicit, nullable and separate from lobby presentation',()=>{
  assert.equal(serverPilotCount(server(),now),'4 / 29');
  assert.equal(serverPilotCount({...server(),drivers_connected:0,players_online:30},now),'0 / 29');
  assert.equal(serverPilotCount({...server(),driver_capacity:undefined,max_players:30},now),'4 / —');
  assert.equal(serverPilotCount({...server(),stale:true},now),'— / 29');
  assert.equal(serverPilotCount({...server(),driver_capacity:true},now),'4 / —');
  assert.equal(serverPilotCount({...server(),telemetry_state:'offline',status:'offline',roster_complete:false,players_online:0},now),'0 / 29');
});

test('race intervals use the previous classified car and require an explicit lap deficit',()=>{
  const row={position:3,laps_behind_ahead:0,gap_to_ahead_ms:1234};
  assert.equal(driverInterval(server(),row,'ru',now),'+1.234');
  assert.equal(driverInterval(server(),{...row,laps_behind_ahead:1},'ru',now),'+1 круг');
  assert.equal(driverInterval(server(),{...row,laps_behind_ahead:2},'ru',now),'+2 круга');
  assert.equal(driverInterval(server(),{...row,laps_behind_ahead:11},'ru',now),'+11 кругов');
  assert.equal(driverInterval(server(),{...row,laps_behind_ahead:2},'en',now),'+2 laps');
  assert.equal(driverInterval(server(),{...row,laps_behind_ahead:null},'en',now),'—');
  assert.equal(driverInterval(server(),{...row,position:1},'en',now),'—');
  assert.equal(driverInterval(server(),row,'en',now+DETAIL_MAX_AGE_MS+1),'—');
});

test('qualifying best delta and pit states are not guessed from speed or race gaps',()=>{
  const q={...server(),session:{type:'Qualifying'}};
  assert.equal(driverInterval(q,{position:3,qualifying_best_delta_ms:2500},'en',now),'+2.500');
  assert.equal(driverPitLabel(server(),{pit_state:'pit_lane'},'ru',now),'Пит-лейн');
  assert.equal(driverPitLabel(server(),{pit_state:'pit_box'},'en',now),'Pit box');
  assert.equal(driverPitLabel(server(),{speed:0},'en',now),null);
  assert.equal(driverPitLabel(server(),{pit_state:'pit_box',connected:false},'en',now),null);
  assert.equal(driverPitLabel(server(),{pit_state:'pit_box'},'en',now+DETAIL_MAX_AGE_MS+1),null);
});

test('shared roster escapes the new interval/pit display and retains old rows',()=>{
  const s={...server(),observed_at:new Date().toISOString()};
  const html=renderServerRoster({server:s,drivers:[{name:'Pilot',position:2,pit_state:'pit_box',laps_behind_ahead:1}],
    lang:'en',esc:v=>String(v),renderName:()=>'<span>Pilot</span>',renderRatings:()=>'',renderCar:()=>''});
  assert.match(html,/Interval/);assert.match(html,/\+1 lap/);assert.match(html,/aria-label="Pit box"/);
  assert.equal((html.match(/<th scope/g)||[]).length,7);
});

test('bounded cadence budget expires original observations and never revives stale sources',()=>{
  const slow={...server(),detail_ttl_ms:45_000};
  const row={position:2,laps_behind_ahead:0,gap_to_ahead_ms:1234,pit_state:'pit_lane'};
  assert.equal(driverInterval(slow,row,'en',now+40_000),'+1.234');
  assert.equal(driverPitLabel(slow,row,'en',now+40_000),'Pit lane');
  assert.equal(driverInterval(slow,row,'ru',now+45_001),'—');
  assert.equal(driverPitLabel({...slow,status:'stale'},row,'ru',now+10_000),null);
  assert.equal(driverInterval({...slow,source_age_ms:5001},row,'ru',now+1000),'—');
  for (const invalid of [true,'45000',NaN,Infinity,0,300_001]) {
    assert.equal(driverInterval({...slow,detail_ttl_ms:invalid},row,'en',now+20_000),'—');
  }
  const ancient={...server(),detail_ttl_ms:239_000};
  assert.equal(driverInterval(ancient,row,'en',now+200_000),'+1.234');
  assert.equal(driverInterval(ancient,row,'en',now+239_001),'—');
});

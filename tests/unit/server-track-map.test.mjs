import test from 'node:test';
import assert from 'node:assert/strict';
import {mapCars,renderTrackMap} from '../../src/features/server-status/track-map.js';
import {driverPitLabel} from '../../src/features/server-status/live-details.js';

const now = Date.now(), observed_at = new Date(now).toISOString();
const car = (position=1)=>({car_id:position,position,connected:true,world_x:100+position*10,world_z:-50,
  coordinates_source:'acc-native-world-xz',position_age_ms:15,position_observed_at:observed_at});
const server = ()=>({source:'acc-local-telemetry',status:'online',telemetry_state:'live',roster_complete:true,
  source_age_ms:0,observed_at,drivers:[car(2),car(1)],
  track_map:{source:'acc-native-complete-lap',points:Array.from({length:20},(_,n)=>[500*Math.cos(n/20*Math.PI*2),500*Math.sin(n/20*Math.PI*2)])}});

test('car map uses live coordinates and classified positions, leader drawn last',()=>{
  const html=renderTrackMap(server(),'ru',now);
  assert.equal(mapCars(server(),now).length,2);
  assert.equal((html.match(/<circle/g)||[]).length,2);
  assert.match(html,/track-outline/);assert.match(html,/is-leader/);
  assert.ok(html.indexOf('Position')<0);assert.match(html,/Позиция 1/);
  assert.ok(html.indexOf('Позиция 2')<html.indexOf('Позиция 1'));
});

test('map excludes stale, departed, invalid, duplicate and unsupported coordinates',()=>{
  for(const override of [{connected:false},{world_x:NaN},{world_z:Infinity},{world_x:'123'},
    {coordinates_source:undefined},{position_age_ms:5001},{position_observed_at:'bad'},
    {position_observed_at:new Date(now-15001).toISOString()},{role:'spectator'}]) {
    const s=server();s.drivers=[{...car(),...override}];
    assert.equal(mapCars(s,now).length,0,JSON.stringify(override));
  }
  assert.equal(mapCars({...server(),status:'stale'},now).length,0);
  assert.equal(mapCars({...server(),drivers:[car(),car()]},now).length,1);
  assert.equal(renderTrackMap({source:'legacy-online-status'},'en',now),'');
});

test('missing/invalid geometry shows learning, without inventing track or position',()=>{
  for(const track_map of [null,{source:'external',points:server().track_map.points},
    {source:'acc-native-complete-lap',points:[[0,0]]},
    {source:'acc-native-complete-lap',points:[[NaN,0],...server().track_map.points]}]) {
    const html=renderTrackMap({...server(),track_map},'en',now);
    assert.match(html,/one complete lap/);assert.doesNotMatch(html,/<svg/);
  }
  const html=renderTrackMap({...server(),drivers:[{...car(),position:'<script>'}]},'en',now);
  assert.doesNotMatch(html,/<script>/);assert.match(html,/Position —/);
});

test('pit entry/lane/exit translated; stationary car does not imply pit box',()=>{
  assert.equal(driverPitLabel(server(),{pit_state:'pit_entry'},'ru',now),'Въезд в пит');
  assert.equal(driverPitLabel(server(),{pit_state:'pit_exit'},'en',now),'Pit exit');
  assert.equal(driverPitLabel(server(),{pit_state:'on_track',speed:0},'ru',now),null);
});

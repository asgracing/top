import test from 'node:test';
import assert from 'node:assert/strict';
import {mapCars,renderTrackMap,trackMapGeometry} from '../../src/features/server-status/track-map.js';
import {MONZA_MAP} from '../../assets/track-maps/monza.js';
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

test('Monza uses the same permanent circuit on Main and Sunset without any learned lap',()=>{
  const main={...server(),id:'main',track_code:'monza',track_map:null};
  const sunset={...server(),id:'sunset',track_code:'monza'};
  const path=html=>html.match(/class="track-outline" d="([^"]+)"/)[1];
  assert.equal(path(renderTrackMap(main,'ru',now)),path(renderTrackMap(sunset,'en',now)));
  assert.match(renderTrackMap(main,'ru',now),/data-track-map="monza-gp"/);
  assert.equal(trackMapGeometry(main).fixed,true);
  assert.ok(MONZA_MAP.points.length>100);
});

test('Monza remains visible without cars; stale and offline cars never reappear',()=>{
  for(const override of [{drivers:[]},{status:'stale'},{status:'offline'}]) {
    const html=renderTrackMap({...server(),track:'monza',track_map:null,...override},'en',now);
    assert.match(html,/<svg/);assert.match(html,/No fresh car positions/);
    assert.doesNotMatch(html,/class="track-car/);
  }
});

test('Monza calibration matches independently recorded ACC corner coordinates',()=>{
  // Public Sunset lap, 24 October: physical locations, without pilot identities.
  const anchors=[
    [[-286.22,-366.06],6], [[-163.7,-885.25],26], [[444.65,-1019.09],39],
    [[795.01,-1113.93],50], [[843.7,-795.15],61], [[-18.52,-32.36],85],
    [[-252.92,1041.05],103]
  ];
  const map=trackMapGeometry({track_code:'monza'});
  for(const [world,index] of anchors) {
    const actual=map.project(...world),expected=map.points[index];
    assert.ok(Math.hypot(actual[0]-expected[0],actual[1]-expected[1])<8,`corner ${index}`);
  }
  const lesmo=map.project(843.7,-795.15),parabolica=map.project(-252.92,1041.05);
  assert.ok(lesmo[0]<300&&lesmo[1]<140,'Lesmo is top left');
  assert.ok(parabolica[0]>850&&parabolica[1]>350,'Parabolica is right');
  assert.ok(Math.abs(map.points[0][1]-map.points[1][1])<.01,'main straight is horizontal');
  assert.ok(map.points[0][1]>450,'main straight is at bottom');
});

test('Monza preserves all three chicanes and does not snap pit/off-track XZ to the route',()=>{
  const map=trackMapGeometry({track_code:'monza'});
  assert.ok(map.points[2][1]-map.points[11][1]>12,'Rettifilo is retained');
  assert.ok(map.points[36][0]-map.points[41][0]>12,'Roggia is retained');
  assert.ok(map.points[91][1]-map.points[81][1]>20,'Ascari is retained');
  const a=map.project(-286.22,-366.06),b=map.project(-266.22,-366.06);
  const distance=Math.hypot(a[0]-b[0],a[1]-b[1]);
  assert.ok(distance>6&&distance<8,'20 m world offset remains a physical offset');
});

test('only exact Monza layout uses its asset; other track fallback and TTL stay unchanged',()=>{
  for(const track_code of ['monzaTG','spa','monza_1966','unknown']) {
    assert.equal(trackMapGeometry({...server(),track_code}).fixed,false);
    assert.equal(trackMapGeometry({...server(),track_code,track_map:null}),null);
  }
  const s={...server(),track_code:'monza',drivers:[{...car(),position_age_ms:5001}]};
  const html=renderTrackMap(s,'ru',now);
  assert.match(html,/Нет свежих координат/);assert.doesNotMatch(html,/class="track-car/);
  assert.match(html,/Tomislav Bacinger · MIT/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mapCars,renderTrackMap,trackMapGeometry} from '../../src/features/server-status/track-map.js';
import {MONZA_MAP} from '../../assets/track-maps/monza.js';
import {SPA_MAP} from '../../assets/track-maps/spa.js';
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
  assert.match(html,/<circle r="10\.4"/);
});

test('native map disclosure opens by default and can render collapsed without losing geometry',()=>{
  const s={...server(),track_code:'spa'};
  const open=renderTrackMap(s,'ru',now),closed=renderTrackMap(s,'en',now,{expanded:false});
  assert.match(open,/<details[^>]* open>/);
  assert.match(open,/<summary class="track-map-summary">/);
  assert.match(open,/Свернуть/);assert.match(closed,/Expand/);
  assert.doesNotMatch(closed,/<details[^>]* open>/);
  assert.match(closed,/track-outline/);
  assert.match(open,/<circle r="14\.4"/);
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

test('only reviewed layouts use assets; other track fallback and TTL stay unchanged',()=>{
  for(const track_code of ['monzaTG','spa_1966','spa_24h','monza_1966','unknown']) {
    assert.equal(trackMapGeometry({...server(),track_code}).fixed,false);
    assert.equal(trackMapGeometry({...server(),track_code,track_map:null}),null);
  }
  const s={...server(),track_code:'monza',drivers:[{...car(),position_age_ms:5001}]};
  const html=renderTrackMap(s,'ru',now);
  assert.match(html,/Нет свежих координат/);assert.doesNotMatch(html,/class="track-car/);
  assert.match(html,/Tomislav Bacinger · MIT/);
});

test('Spa shares one permanent route across servers and preserves labels without a learned lap or cars',()=>{
  const a={...server(),id:'assetto-corsa-competizione-dedic',track_code:'spa',track_map:null};
  const b={...server(),id:'assetto-corsa-competizione-dedic-5',track_code:'SPA',drivers:[]};
  const path=html=>html.match(/class="track-outline" d="([^"]+)"/)[1];
  assert.equal(path(renderTrackMap(a,'ru',now)),path(renderTrackMap(b,'en',now)));
  assert.equal(trackMapGeometry(a).id,'spa-gp');
  assert.equal(trackMapGeometry(a).fixed,true);
  assert.equal(SPA_MAP.points.length,153);
  assert.match(renderTrackMap(a,'ru',now),/Позиция 1/);
  for(const label of ['La Source','Eau Rouge','Raidillon','Kemmel','Les Combes','Malmedy',
    'Bruxelles','Double Gauche','Les Fagnes','Campus','Paul Frère','Blanchimont','Chicane']) {
    assert.ok(renderTrackMap(b,'en',now).includes(label),label);
  }
  for(const status of ['stale','offline']) {
    const html=renderTrackMap({...a,status},'en',now);
    assert.match(html,/data-track-map="spa-gp"/);
    assert.doesNotMatch(html,/class="track-car/);
  }
});

test('Spa calibration agrees with a second independently recorded ACC lap and the reference orientation',()=>{
  // Public geometry-only Second dedic-5 lap, not used for the fitted matrix.
  const anchors=[
    [[-1249.12,-2201.03],4],[[-670.45,-1765.92],16],[[-194.79,-609.41],32],
    [[-506.74,-177.14],48],[[-631.23,-898.1],72],[[-1020.07,-465.74],88],
    [[-1455.99,-460.88],112],[[-892.65,-1195.46],132],[[-971.69,-1712.24],148]
  ];
  const map=trackMapGeometry({track_code:'spa'});
  for(const [world,index] of anchors) {
    const actual=map.project(...world),expected=map.points[index];
    assert.ok(Math.hypot(actual[0]-expected[0],actual[1]-expected[1])<15,`Spa anchor ${index}`);
  }
  const laSource=map.points[4],lesCombes=map.points[32],bruxelles=map.points[48];
  assert.ok(laSource[0]<150&&laSource[1]>750,'La Source bottom left');
  assert.ok(lesCombes[0]>700&&lesCombes[1]<110,'Les Combes top');
  assert.ok(bruxelles[0]>1000&&bruxelles[1]>lesCombes[1],'Bruxelles right and below Les Combes');
  const a=map.project(-670.45,-1765.92),b=map.project(-650.45,-1765.92);
  assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])>5,'Off-track/pit offsets retain physical distance');
});

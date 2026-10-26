import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {trackMapGeometry,renderTrackMap} from '../../src/features/server-status/track-map.js';
const anchors=JSON.parse(await readFile(new URL('../fixtures/server-track-map-anchors.json',import.meta.url),'utf8'));
const expected={nurburgring:[133,'de-1927'],barcelona:[138,'es-1991'],kyalami:[86,'za-1961']};
const hashes={nurburgring:'3d205c6a69ea4ddd8cdcfdac442a73057c742a13279eed96e339493347646db7',barcelona:'0eca604e0d388ca1208ee99b56f43ab5b63a04030347d64f4a9423cdda95464b',kyalami:'8501d879d9063a1838ee02fe9bbb05970e938d6204382ed6f76c52537322f24e'};
for(const code of Object.keys(expected)){
 test(`${code}: permanent route survives empty/offline roster and unrelated learned geometry`,async()=>{
  const map=trackMapGeometry({track_code:code});assert.equal(map.fixed,true);assert.equal(map.points.length,expected[code][0]);
  assert.equal(map.source.file,`circuits/${expected[code][1]}.geojson`);
  assert.equal(map.source.license,'MIT');
  const raw=await readFile(new URL(`../../assets/track-maps/${code}-source.json`,import.meta.url));
  assert.equal(createHash('sha256').update(raw).digest('hex'),hashes[code]);
  for(const status of ['online','offline','stale']){
   const server={id:'arbitrary',track_code:code.toUpperCase(),source:'acc-local-telemetry',status,drivers:[]};
   const html=renderTrackMap(server,'en');assert.match(html,new RegExp(`data-track-map="${code}-gp"`));
   assert.match(html,/<svg/);assert.doesNotMatch(html,/class="track-car/);
   assert.equal(trackMapGeometry({...server,track_map:{source:'acc-native-complete-lap',points:Array.from({length:20},(_,i)=>[i,i])}}).points,map.points);
  }
 });
 test(`${code}: held-out coordinates from the same ACC lap align across the entire circuit`,()=>{
  const map=trackMapGeometry({track_code:code});
  // Geometry only. These samples are excluded from the ICP fit; they are not a second independent lap.
  for(const {world,index} of anchors[code]){
   const actual=map.project(...world),target=map.points[index];
   assert.ok(Math.hypot(actual[0]-target[0],actual[1]-target[1])<14,`${code} vertex ${index}`);
  }
  const a=map.project(...anchors[code][0].world),b=map.project(anchors[code][0].world[0]+20,anchors[code][0].world[1]);
  assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])>6,'raw pit/off-track displacement remains visible');
 });
}
test('reference orientations: Nürburgring GP, old Barcelona chicane and modern Kyalami',()=>{
 const n=trackMapGeometry({track_code:'nurburgring'}),b=trackMapGeometry({track_code:'barcelona'}),k=trackMapGeometry({track_code:'kyalami'});
 assert.ok(n.points[74][0]<180&&n.points[74][1]>600,'Dunlop bottom left');
 assert.ok(n.points[117][0]>900&&n.points[117][1]<150,'NGK top right');
 assert.ok(n.points[21][0]>500&&n.points[21][1]<300,'Arena upper middle');
 assert.equal(b.source.revision,'0d958c40116b25742be76a7573b44e0940a6dfc7','pre-2021 layout selected explicitly');
 assert.ok(Math.abs(b.points[0][1]-b.points[1][1])<.01&&b.points[0][1]>350,'Barcelona main straight horizontal at bottom');
 assert.ok(b.points[28][0]<150&&b.points[28][1]<250,'T3 left');
 assert.ok(b.points[123][0]>1000&&b.points[126][0]>b.points[123][0]+10,'final chicane preserved');
 assert.ok(k.points[15][0]>850&&k.points[15][1]<100,'Kyalami T5 at top');
 assert.ok(k.points[57][0]<150&&k.points[57][1]>550,'T10/11 bottom left');
 assert.ok(k.points[82][0]>550&&k.points[82][1]>600,'T16 at bottom');
 for(const code of ['nurburgring_24h','nurburgring_1967','barcelona_2023','kyalami_1967'])assert.equal(trackMapGeometry({track_code:code}),null,'unreviewed layouts never inherit an unrelated map');
});

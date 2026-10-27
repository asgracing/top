import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {trackMapGeometry,renderTrackMap} from '../../src/features/server-status/track-map.js';
const raw=await readFile(new URL('../../assets/track-maps/nurburgring_24h-source.json',import.meta.url));
const coordinates=JSON.parse(raw).features[0].geometry.coordinates;
const anchors=JSON.parse(await readFile(new URL('../fixtures/nordschleife-map-anchors.json',import.meta.url),'utf8'));
const map=trackMapGeometry({track_code:'nurburgring_24h'});
test('24h and explicit Nordschleife alias share the permanent combined layout, separate from GP',()=>{
 assert.equal(map.id,'nurburgring-24h');assert.equal(map.fixed,true);
 assert.equal(trackMapGeometry({track:'NORDSCHLEIFE'}).points,map.points);
 assert.notEqual(trackMapGeometry({track_code:'nurburgring'}).id,map.id);
 for(const code of ['nurburgring_24h_1967','nordschleife_touristenfahrten','nurburgring24h'])assert.equal(trackMapGeometry({track_code:code}),null);
 assert.equal(createHash('sha256').update(raw).digest('hex'),map.source.sha256);
 assert.equal(map.source.originalPoints,3079);assert.equal(map.source.license,null);
});
test('north-up orientation follows reference: GP bottom left, northern loop above and east',()=>{
 const gp=map.points.filter(p=>p[1]>850);
 assert.ok(gp.length>10);assert.ok(gp.every(p=>p[0]<500));
 assert.ok(Math.min(...map.points.map(p=>p[1]))<80);
 assert.ok(Math.max(...map.points.map(p=>p[0]))>900);
 assert.ok(map.points.length>500&&map.points.length<800);
});
test('simplified SVG follows the exact supplied GeoJSON to within one metre',()=>{
 const xs=coordinates.map(p=>p[0]),ys=coordinates.map(p=>p[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const metric=[71054.17166866265,111319.49079327358];
 const scale=Math.min(1000/((maxX-minX)*metric[0]),900/((maxY-minY)*metric[1]));
 const segmentDistance=(p,a,b)=>{
  const v=b.map((x,i)=>x-a[i]),w=p.map((x,i)=>x-a[i]);
  const t=Math.max(0,Math.min(1,(w[0]*v[0]+w[1]*v[1])/(v[0]*v[0]+v[1]*v[1]||1)));
  return Math.hypot(w[0]-t*v[0],w[1]-t*v[1]);
 };
 for(const [lon,lat] of coordinates){
  const point=[100+(lon-minX)*metric[0]*scale,70+(maxY-lat)*metric[1]*scale];
  const distance=Math.min(...map.points.map((a,i)=>segmentDistance(point,a,map.points[(i+1)%map.points.length])));
  assert.ok(distance<=scale+0.00002,'source bend preserved within 1 m');
 }
});
test('observed ACC positions align across the circuit and retain off-track displacement',()=>{
 const xs=coordinates.map(p=>p[0]),ys=coordinates.map(p=>p[1]);
 const minX=Math.min(...xs),maxY=Math.max(...ys);
 const scale=Math.min(1000/((Math.max(...xs)-minX)*71054.17166866265),900/((maxY-Math.min(...ys))*111319.49079327358));
 for(const {world,index} of anchors){
  const [lon,lat]=coordinates[index],actual=map.project(...world);
  const expected=[100+(lon-minX)*71054.17166866265*scale,70+(maxY-lat)*111319.49079327358*scale];
  assert.ok(Math.hypot(actual[0]-expected[0],actual[1]-expected[1])<6,`observed vertex ${index}`);
 }
 const a=map.project(0,0),b=map.project(20,0);
 assert.ok(Math.abs(Math.hypot(a[0]-b[0],a[1]-b[1])-20*scale)<0.01);
});
test('empty/stale servers retain 24h map and correct source credit without stale cars',()=>{
 const now=Date.now(),observed_at=new Date(now).toISOString();
 for(const status of ['online','stale','offline']){
  const server={source:'acc-local-telemetry',track_code:'nurburgring_24h',status,source_age_ms:0,observed_at,drivers:[]};
  const html=renderTrackMap(server,'en',now);
  assert.match(html,/data-track-map="nurburgring-24h"/);assert.match(html,/track-outline/);
  assert.match(html,/R1naldinho · TracksGEOJSON/);assert.doesNotMatch(html,/Tomislav|MIT|class="track-car/);
  assert.equal(trackMapGeometry({...server,track_map:{source:'acc-native-complete-lap',points:Array.from({length:20},(_,i)=>[i,i])}}).points,map.points);
 }
});

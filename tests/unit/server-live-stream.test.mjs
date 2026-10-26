import test from 'node:test';
import assert from 'node:assert/strict';
import {PoseTimeline,LiveServerStream,mergeLivePatch,publicLiveServer} from '../../src/features/server-status/live-stream.js';
import {driverInterval,serverPilotCount} from '../../src/features/server-status/live-details.js';
import {LiveClock,measureLiveClock} from '../../src/features/server-status/live-clock.js';

const car=(x=0,extra={})=>({car_id:1,connection_id:7,position:1,world_x:x,world_z:10,
  connected:true,coordinates_source:'acc-native-world-xz',position_age_ms:0,...extra});

test('keyed car identities do not reorder the live classification',()=>{
  const rows={10:{car_id:10,position:3},20:{car_id:20,position:1},30:{car_id:30,position:2},40:{car_id:40,position:null}};
  const server=publicLiveServer({drivers:rows,classification:rows,spectators:{}});
  assert.deepEqual(server.classification.map(d=>d.position),[1,2,3,null]);
  assert.deepEqual(server.drivers.map(d=>d.car_id),[20,30,10,40]);
  assert.equal(rows[10].position,3);
});
const frame=(at,x,extra={})=>{
  const value={at_ms:at,boot_id:'b',session_id:'s',track_code:'monza',clock_verified:true,clock_epoch:1,cars:[car(x)],...extra};
  value.cars=value.cars.map(c=>({position_at_ms:at,clock_uncertainty_ms:0,...c}));return value;
};
const history=()=>Array.from({length:8},(_,i)=>frame(900+i*100,i*10));
const timelineAt=(serverTime=1600,received=0)=>{
  const t=new PoseTimeline({bufferMs:500});t.synchronize({offset_ms:serverTime-received,uncertainty_ms:0,measured_at:received});return t;
};

test('continuous interpolation, bounded hold and history without extrapolation',()=>{
  const timeline=timelineAt();timeline.ingest(history(),1600,0);
  assert.equal(timeline.sample(0)[0].world_x,20);
  assert.equal(timeline.sample(25)[0].world_x,22.5);
  assert.equal(timeline.sample(50)[0].world_x,25);
  assert.equal(timeline.sample(50,true)[0].world_x,30);
  assert.equal(timeline.sample(500)[0].world_x,70);
  assert.equal(timeline.sample(600)[0].world_x,70); // Hold the last observed pose, not an invented trajectory.
  assert.deepEqual(timeline.sample(5000),[]);
  const bounded=timelineAt();
  for(let start=1700;start<17000;start+=1600)bounded.ingest(Array.from({length:16},(_,i)=>frame(start+i*100,i)),start+1500,0);
  assert.ok(bounded.frames.length<=100);
  assert.ok(bounded.frames.at(-1).at_ms-bounded.frames[0].at_ms<=8000);
});

test('no diagonal teleport, pit-box interpolation or blending reused car IDs',()=>{
  for(const next of [car(500),car(10,{pit_state:'pit_box'})]) {
    const t=timelineAt(1550);t.ingest([frame(1000,0),frame(1100,0,{cars:[next]})],1550,0);
    assert.equal(t.sample(0)[0].world_x,0);
  }
  const reused=timelineAt(1550);reused.ingest([frame(1000,0),frame(1100,0,{cars:[car(10,{connection_id:8})]})],1550,0);
  assert.deepEqual(reused.sample(0).map(c=>[c.connection_id,c.world_x]),[[8,10]]);
  const t=timelineAt(1550);t.ingest([frame(1000,0),frame(3000,20)],3000,0);
  assert.equal(t.sample(0)[0].world_x,0);
});

test('boot/session/track and large time discontinuities reset the timeline',()=>{
  for(const change of [{boot_id:'new'},{session_id:'new'},{track_code:'spa'}]) {
    const t=timelineAt();t.ingest(history(),1600,0);t.ingest([frame(1700,100,change)],1700,100);
    assert.equal(t.frames.length,1);assert.equal(t.sample(100)[0].world_x,100);
  }
  const t=timelineAt();t.ingest(history(),1600,0);t.synchronize({offset_ms:6900,uncertainty_ms:0,measured_at:100});t.ingest([frame(7000,1)],7000,100);
  assert.equal(t.frames.length,1);
});

test('invalid, stale, departed and spectator coordinates never animate',()=>{
  for(const extra of [{world_x:NaN},{world_x:'10'},{world_z:1000001},{coordinates_source:'guess'},
    {connected:false},{role:'spectator'},{position_age_ms:1501},{position_age_ms:null}]) {
    const t=timelineAt(1500);t.ingest([frame(1000,0,{cars:[car(0,extra)]})],1500,0);
    assert.deepEqual(t.sample(0),[]);
  }
  const t=timelineAt(1500);t.ingest([frame(1000,0,{cars:[car(0),car(20)]})],1500,0);
  assert.equal(t.sample(0).length,1);
});

test('delta preserves legitimate nulls and removes only explicit keys; rejects prototype keys',()=>{
  assert.deepEqual(mergeLivePatch({a:1,b:2,c:{x:1,y:2}},{a:null,$removed:['b'],c:{$removed:['x']}}),{a:null,c:{y:2}});
  assert.throws(()=>mergeLivePatch({},JSON.parse('{"__proto__":{"polluted":true}}')));
  assert.equal({}.polluted,undefined);
});

class FakeSource {
  constructor(url){this.url=url;this.listeners={};FakeSource.last=this;}
  addEventListener(key,handler){this.listeners[key]=handler;}
  close(){this.closed=true;}
}
const state=()=>({id:'main',source:'acc-local-telemetry',drivers:{'1:7':car()},classification:{},spectators:{}});
const event=(extra={})=>JSON.stringify({hub_epoch:'hub',sequence:1,base:0,buffer_ms:500,
  server_time_ms:1600,delivery:'direct',history:history(),patch:state(),...extra});

test('selected stream accepts full state then deltas; recovery requires baseline',()=>{
  let now=0;const stream=new LiveServerStream('main',{EventSourceClass:FakeSource,clock:()=>now,fetchImpl:null});
  assert.match(FakeSource.last.url,/\/stream\/main$/);
  stream.accept(event());assert.equal(stream.latest().drivers[0].connection_id,7);
  stream.accept(event({sequence:2,base:1,history:[],patch:{drivers:{'1:7':{world_x:10}}}}));
  assert.equal(stream.latest().drivers[0].world_x,10);
  assert.throws(()=>stream.accept(event({sequence:4,base:3,patch:{}})));
  assert.throws(()=>stream.accept(event({sequence:3,base:2,hub_epoch:'other',patch:{}})));
  stream.accept(event({hub_epoch:'other'}));
  now=2001;assert.ok(stream.latest());
  now=4000;assert.equal(stream.delivery,'recovering');
  now=10001;assert.equal(stream.latest(),null);
  stream.close();assert.ok(FakeSource.last.closed);
});

test('brief relay/stale transitions retain history; invalid protocol cannot contaminate state',()=>{
  const stream=new LiveServerStream('assetto-corsa-competizione-dedic-30',{EventSourceClass:FakeSource,clock:()=>0,fetchImpl:null});
  const patch={...state(),id:stream.key};stream.accept(event({patch}));
  stream.accept(event({sequence:2,base:1,delivery:'relay',history:[],patch:{}}));
  assert.equal(stream.timeline.frames.length,8);
  assert.throws(()=>stream.accept(event({buffer_ms:1000,patch})));
  assert.throws(()=>stream.accept(event({patch:state()})));
  assert.throws(()=>stream.accept(event({patch:JSON.parse('{"__proto__":{}}')})));
  assert.equal(publicLiveServer({...state(),drivers:[]}),null);
  stream.close();
});

test('VPS clock correction preserves original observations and public timing',()=>{
  const now=Date.now(),observed_at=new Date(now-20000).toISOString();
  const s={source:'acc-local-telemetry',telemetry_state:'live',status:'online',roster_complete:true,
    source_age_ms:0,source_clock_offset_ms:20000,observed_at,drivers_connected:3,driver_capacity:34,session:{type:'Race'}};
  assert.equal(serverPilotCount(s,now),'3 / 34');
  assert.equal(driverInterval(s,{position:2,laps_behind_ahead:0,gap_to_ahead_ms:1234},'ru',now),'+1.234');
  assert.equal(s.observed_at,observed_at);
});

test('clock midpoint is independent of event delivery latency and expires without inventing motion',()=>{
  const clock=new LiveClock();
  const sample=clock.observe(100,120,{received_ms:1110,sent_ms:1110});
  assert.equal(sample.offset_ms,1000);assert.equal(sample.uncertainty_ms,11);
  assert.equal(clock.current(15121),null);
  assert.throws(()=>clock.observe(0,500,{received_ms:1000,sent_ms:1000}));
  const t=new PoseTimeline({bufferMs:500});t.ingest(history(),1600,100);
  assert.deepEqual(t.sample(100),[],'SSE receipt cannot establish the source/display clock');
  t.synchronize({offset_ms:1500,uncertainty_ms:0,measured_at:100});
  assert.equal(t.sample(100)[0].world_x,20);
});

test('ordinary public RTT permits motion while source clock and browser limits remain bounded',()=>{
  const clock=new LiveClock();
  const sample=clock.observe(0,150,{received_ms:1075,sent_ms:1075});
  assert.equal(sample.offset_ms,1000);
  assert.equal(sample.uncertainty_ms,76);
  assert.throws(()=>clock.observe(0,500,{received_ms:1250,sent_ms:1250}));
  const t=new PoseTimeline();t.synchronize(sample);
  t.ingest(history(),1600,150);
  assert.ok(t.sample(600).length);
  const unsafe=history().map(f=>({...f,cars:f.cars.map(c=>({...c,clock_uncertainty_ms:51}))}));
  const invalid=new PoseTimeline();invalid.synchronize(sample);invalid.ingest(unsafe,1600,150);
  assert.deepEqual(invalid.sample(600),[]);
});

test('original per-car source time remains intact during interpolation and bounded holds',()=>{
  const t=timelineAt(1650);
  const frames=Array.from({length:8},(_,i)=>{
    const at=900+i*100,observed=at-150;
    return frame(at,observed/10,{cars:[car(observed/10,{position_at_ms:observed,position_age_ms:150})]});
  });
  t.ingest(frames,1650,0);
  assert.equal(t.sample(0)[0].world_x,115);
  assert.equal(t.sample(25)[0].world_x,117.5);
  assert.equal(t.sample(25)[0].position_at_ms,1175);
  const old=timelineAt(10500);
  old.ingest([frame(10000,0,{cars:[car(0,{position_at_ms:7339,position_age_ms:2661})]})],10500,0);
  assert.equal(old.sample(0)[0].position_at_ms,7339,'A held pose keeps its original observation time');
  assert.deepEqual(old.sample(5000),[]);
});

test('clock changes and unverified timing clear interpolation while counts remain available',()=>{
  const t=timelineAt();t.ingest(history(),1600,0);
  t.ingest([frame(1700,70,{clock_epoch:2})],1700,100);
  assert.equal(t.frames.length,1);assert.equal(t.sample(100)[0].world_x,70);
  const unverified=timelineAt();unverified.ingest(history().map(f=>({...f,clock_verified:false})),1600,0);
  assert.deepEqual(unverified.sample(0),[]);
});

test('clock fetch is a bounded public GET and a closed stream cannot reopen on late clock response',async()=>{
  let now=10,args;
  const exchange=await measureLiveClock(async(...value)=>{
    args=value;now=30;return {ok:true,text:async()=>JSON.stringify({received_ms:1020,sent_ms:1020})};
  },()=>now);
  assert.equal(exchange.sent,10);assert.equal(exchange.received,30);
  assert.equal(args[1].credentials,'omit');assert.equal(args[1].cache,'no-store');
  let finish;
  const stream=new LiveServerStream('main',{EventSourceClass:FakeSource,clock:()=>now,
    fetchImpl:()=>new Promise(resolve=>{finish=resolve;})});
  stream.close();finish({ok:true,text:async()=>JSON.stringify({received_ms:1020,sent_ms:1020})});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(stream.clockTimer,undefined);assert.equal(stream.timeline.frames.length,0);
});

test('default playback survives 600 ms holes, per-car gaps and jitter with a monotonic bounded-speed cursor',()=>{
  const t=new PoseTimeline();t.synchronize({offset_ms:100000,uncertainty_ms:5,measured_at:0});
  const queue=[];
  for(let at=0;at<=12000;at+=100){
    if(at>=5000&&at<5600)continue;
    const f=frame(100000+at,(at-150)*.05,{cars:[car((at-150)*.05,{position_at_ms:100000+at-150,position_age_ms:150})]});
    if(at>=8000&&at<8400)f.cars=[];
    queue.push({received:at+[40,100,180,60][at/100%4],f});
  }
  let previous=null,count=0,holds=0;
  for(let now=0;now<12000;now+=20){
    while(queue.length&&queue[0].received<=now){const {f}=queue.shift();t.ingest([f],f.at_ms+200,now);}
    const cars=t.sample(now);
    if(now<2000)continue;
    assert.equal(cars.length,1,'Jitter and missing poses must not remove a connected car');
    const x=cars[0].world_x;
    if(previous!==null){assert.ok(x>=previous-1e-7,'Playback must never rewind');assert.ok(x-previous<=1.1,'No catch-up jump');if(x===previous)holds++;}
    previous=x;count++;
  }
  assert.ok(count>400);assert.ok(holds<20,'The buffered stream should mostly move, rather than freeze');
});

test('short stale frames and SSE reconnects retain cars; actual departures/offline clear them',()=>{
  let now=0;
  const stream=new LiveServerStream('main',{EventSourceClass:FakeSource,clock:()=>now,fetchImpl:null});
  stream.accept(event());const initial=stream.latest();
  now=100;stream.accept(event({sequence:2,base:1,delivery:'stale',history:[],patch:{stale:true,status:'stale'}}));
  assert.equal(stream.latest(),initial);assert.equal(stream.delivery,'direct');
  FakeSource.last.onerror();assert.equal(stream.timeline.frames.length,8);
  now=700;stream.accept(event());assert.equal(stream.timeline.frames.length,8);
  stream.timeline.reconcileRoster({roster_complete:true,drivers:[]});
  stream.timeline.synchronize({offset_ms:1600,uncertainty_ms:0,measured_at:700});
  assert.deepEqual(stream.timeline.sample(700),[]);
  stream.accept(event({sequence:2,base:1,history:[],patch:{status:'offline'}}));
  assert.equal(stream.timeline.frames.length,0);assert.equal(stream.latest().status,'offline');
  stream.close();
});

test('clock sample expiry between packets switches to a valid newer estimate without blanking a frame',()=>{
  let now=15000;
  const stream=new LiveServerStream('main',{EventSourceClass:FakeSource,clock:()=>now,fetchImpl:null});
  stream.clockSync.observe(0,20,{received_ms:100010,sent_ms:100010});
  stream.clockSync.observe(10000,10040,{received_ms:110020,sent_ms:110020});
  stream.accept(event({server_time_ms:115000,history:[frame(114900,5)]}));
  assert.equal(stream.timeline.clockSample.measured_at,20);
  now=15021;
  assert.equal(stream.sample(now).length,1);
  assert.equal(stream.timeline.clockSample.measured_at,10040);
  stream.close();
});

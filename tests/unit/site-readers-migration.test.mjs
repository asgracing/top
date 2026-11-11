import test from 'node:test';
import assert from 'node:assert/strict';
import {createPilotSearch} from '../../src/pages/account/pilot-search-model.js';
import {liveDirectoryPage} from '../../v2/live-stats.js';
import {loadOverlayApi} from '../../overlay/data.js';

const driver=i=>({public_id:'drv_'+i.toString(16).padStart(12,'0'),driver:'Pilot '+i,is_banned:false});
const json=(data,status=200)=>Response.json(data,{status});
function site(t){globalThis.location={origin:'https://asgracing.ru'};t.after(()=>delete globalThis.location);}
const page=(items,{revision=5,total=items.length,p=1,limit=100}={})=>({revision,generated_at:'2026-11-11T09:00:00Z',items,page:p,total_items:total,total_pages:Math.max(1,Math.ceil(total/limit))});

test('picker queries the API lazily and pins Show more without reading the old index',async t=>{
 site(t);const urls=[],all=Array.from({length:230},(_,i)=>driver(i));
 const search=createPilotSearch({request:async url=>{const u=new URL(url);urls.push(u);const p=Number(u.searchParams.get('page'));return json(page(all.slice((p-1)*100,p*100),{total:230,p}));}});
 assert.deepEqual(await search.search('p'),{items:[],more:false});assert.equal(urls.length,0);
 const a=await search.search('Pilot',{limit:50,excludedPublicIds:[driver(0).public_id]});
 assert.equal(a.items.length,50);assert.equal(a.items[0].publicId,driver(1).public_id);assert.equal(a.more,true);assert.equal(urls.length,1);
 const b=await search.search('Pilot',{limit:150});assert.equal(b.items.length,150);assert.equal(urls.length,2);
 assert.equal(urls[1].searchParams.get('revision'),'5');assert.equal(urls[1].pathname,'/race-archive-shadow/v1/site/stats/directory');
 const c=await search.search('Pilot',{limit:300});assert.equal(c.items.length,230);assert.equal(c.more,false);
});

test('picker retries a changed revision and never mixes generations',async t=>{
 site(t);let generation=5;const calls=[];
 const search=createPilotSearch({request:async url=>{const u=new URL(url);calls.push(u);if(u.searchParams.get('revision')==='5'){generation=6;return json({error:'revision_changed'},409);}const p=Number(u.searchParams.get('page'));return json(page(Array.from({length:p===1?100:20},(_,i)=>driver(generation*1000+(p-1)*100+i)),{revision:generation,total:120,p}));}});
 await search.search('Pilot',{limit:50});const next=await search.search('Pilot',{limit:110});
 assert.equal(next.items.length,110);assert.ok(next.items.every(p=>Number.parseInt(p.publicId.slice(4),16)>=6000));assert.equal(calls.length,4);
});

test('failed current API does not silently replace search with stale JSON',async t=>{
 site(t);const search=createPilotSearch({request:async()=>json({},502),client:{requestJson(){assert.fail('legacy index requested');}}});
 await assert.rejects(search.search('Pilot'),/Statistics HTTP 502/);
});

test('directory rejects private searches and malformed or mixed revision pages',async t=>{
 site(t);await assert.rejects(liveDirectoryPage('76561198000000000',{request:()=>assert.fail()}),{code:'invalid_query'});
 await assert.rejects(liveDirectoryPage('Pilot',{request:async()=>json(page([driver(1)],{revision:6})),revision:5}),/Invalid driver directory/);
 await assert.rejects(liveDirectoryPage('Pilot',{request:async()=>json(page([{...driver(1),is_banned:'false'}]))}),/Invalid driver directory/);
});

test('a complete public ID resolves through its profile without searching the name-only index',async t=>{
 site(t);const id=driver(1).public_id,urls=[];
 const search=createPilotSearch({request:async url=>{urls.push(url);return json({revision:9,profile:{public_id:id,driver:'Pilot One',is_banned:true}});}});
 assert.deepEqual(await search.search(id),{items:[{publicId:id,displayName:'Pilot One'}],more:false});
 assert.equal(urls.length,1);assert.ok(new URL(urls[0]).pathname.endsWith('/stats/drivers/'+id));
 assert.equal(new URL(urls[0]).search,'');
});

test('overlay reads top 100 and Monza record at a coherent revision',async()=>{
 const urls=[];let turn=0;
 const data=await loadOverlayApi({request:async url=>{const u=new URL(url);urls.push(u);const rank=u.pathname.endsWith('/rankings');turn++;return json(page([driver(1)],{revision:turn<=2?(rank?5:6):7}));}});
 assert.equal(urls.length,4);assert.equal(data.leaderboard.length,1);assert.equal(urls[0].searchParams.get('limit'),'100');assert.equal(urls[1].searchParams.get('track'),'monza');assert.equal(urls[1].searchParams.get('limit'),'1');
});

test('overlay rollback is explicit; network failure does not select an old snapshot',async()=>{
 assert.equal(await loadOverlayApi({request:async()=>json({error:'stats_legacy'},503)}),null);
 await assert.rejects(loadOverlayApi({request:async()=>json({},502)}),/Overlay statistics HTTP 502/);
});

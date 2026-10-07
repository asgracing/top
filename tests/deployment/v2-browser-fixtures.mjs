// Browser integration: live controllers, bounded public fixtures, intercepted writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..');
const snapshot=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-home/public.json'),'utf8'));
// One real published activity day per month keeps historical-period checks bounded.
snapshot.home.race_activity=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-home/activity.json'),'utf8'));
const site=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-home/site.json'),'utf8'));
let pw;for(const folder of await fs.readdir('C:/Users/Andrew/AppData/Local/npm-cache/_npx')){try{pw=await import(pathToFileURL(`C:/Users/Andrew/AppData/Local/npm-cache/_npx/${folder}/node_modules/playwright/index.mjs`).href);break}catch{}}
assert.ok(pw,'Playwright is required');
const browser=await pw.chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const base=process.env.ASG_V2_PREVIEW||'http://127.0.0.1:8840',reports=[];
let fixtureWrites=0;
const populatedServer='assetto-corsa-competizione-dedic';
const futureEvent=structuredClone(snapshot.event),futureDate=new Date(Date.now()+86400000).toISOString().slice(0,10);
futureEvent.date=futureDate;futureEvent.status='scheduled';futureEvent.launch_at=futureDate+'T19:50:00+03:00';
const signedDriver=snapshot.home.driver_of_the_day.public_id;
function pagePayload(entries,kind,context='general',rating=false){return {schema_version:1,kind:rating?'clubs_teams_rating_page':'clubs_teams_catalog_page',entity_type:kind==='clubs'?'club':'team',context,context_version:1,season_id:null,rating_run_id:site.pointer.rating_run_id,page:1,total_pages:1,total:entries.length,limit:100,offset:0,completed_at:site.pointer.completed_at,entries,entries_sha256:createHash('sha256').update(JSON.stringify(entries)).digest('hex')}}
const publicRows=snapshot.leaderboard.items;
function strikeFixture(rows){return rows.map((row,i)=>i<6?{...row,active_strikes:i>=4?0:i,strikes:{active:i>=4?0:i},is_banned:i===5,global_banned:i===4}:row)}
const safetyRows=[...snapshot.home.safety,...publicRows.filter(r=>!snapshot.home.safety.some(s=>s.public_id===r.public_id))];
async function fixture(route,log,options={}){
  const request=route.request();let u=new URL(request.url());
  if(u.origin===base&&u.pathname.startsWith('/__asg_public__/'))u=new URL('https://data.asgracing.ru'+u.pathname.slice('/__asg_public__'.length)+u.search);
  const pathname=u.pathname;
  if(u.origin===base){return route.continue()}
  log.push({url:u.href,method:request.method()});
  let payload=null;
  const event=options.normalEvent?{...futureEvent,car_restriction:{mode:'all_gt3'},rules:{...futureEvent.rules,car_model:{mode:'all_gt3'}}}:futureEvent;
  if(u.hostname==='auth.asgracing.ru'&&/^\/v1\/drivers\/[^/]+\/title$/.test(pathname)){
    if(options.noTitle)return route.fulfill({status:404,contentType:'application/json',body:'{}'});
    payload={definitions_version:6,achievement_id:'grand_slam',title:'Grand Slam',icon:'♛',selected:true};
  }
  else if(u.hostname==='auth.asgracing.ru'){payload=options.signed?{authenticated:true,linked:true,driver:{public_id:signedDriver,display_name:'Andrei Soldatenkov [ASG]',profile_url:'/driver/?id='+signedDriver,rank:3,elo:1445,sr:Object.hasOwn(options,'viewerSr')?options.viewerSr:9.99},steam:{persona_name:'Test pilot'},permissions:{moderation_issue:Boolean(options.admin),portal_manage:Boolean(options.admin)},csrf_token:'test-only-csrf'}:{authenticated:false};}
  else if(u.hostname==='mc.yandex.ru'){return route.fulfill({status:200,contentType:'application/javascript',body:'window.__v2MetrikaLoaded=true;'})}
  else if(u.hostname==='data.asgracing.ru'){
    if(pathname==='/top-data/v2/manifest.json')payload={...snapshot.manifest,tables:{...snapshot.manifest.tables,safety:{...snapshot.manifest.tables.safety,total_items:safetyRows.length,total_pages:Math.ceil(safetyRows.length/10)}}};
    else if(pathname==='/top-data/v2/home.json')payload=options.strikeStates?{...snapshot.home,safety:strikeFixture(snapshot.home.safety)}:options.emptyHomePreviews?{...snapshot.home,leaderboard:[],bestlaps:[]}:snapshot.home;
    else if(pathname==='/top-data/server_status.json'){payload=structuredClone(snapshot.live_servers?{servers:snapshot.live_servers}:snapshot.servers);payload.updated_at=options.staleServers?'2020-01-01T00:00:00Z':new Date().toISOString();for(const s of Object.values(payload.servers||{}))s.updated_at=payload.updated_at;if(options.thresholds)for(const [key,sr] of Object.entries(options.thresholds))payload.servers[key].sr_requirement=sr;const s=payload.servers[populatedServer];if(options.largeRoster){const drivers=s.drivers;s.drivers=Array.from({length:32},(_,i)=>({...drivers[i%drivers.length],position:i+1}));s.players_online=32}if(options.missingRoster)s.drivers=[];}
    else if(pathname==='/hourly-data/announcement.json')payload=event;
    else if(pathname==='/hourly-data/schedule.json')payload={...snapshot.schedule,items:[event]};
    else if(pathname==='/donations-api/recent')payload=snapshot.donations;
    else if(pathname==='/top-data/v2/tracks/bestlaps.json')payload=snapshot.bestlap_tracks;
    else if(pathname==='/top-data/v2/tracks/bestlap-leaders.json')payload={items:[]};
    else if(pathname==='/public-cache-clubs-teams/current.json')payload=site.pointer;
    else if(pathname.endsWith('/manifest.json')&&pathname.includes('/public-cache-clubs-teams/'))payload={files:Object.keys(site.entity_details).map(key=>({path:'details/'+key+'.json'}))};
    else if(pathname.includes('/catalog/')){const kind=pathname.includes('/clubs/')?'clubs':'teams';payload=pagePayload(site.entities[kind],kind);}
    else if(pathname.includes('/ratings/')){const parts=pathname.split('/'),kind=parts.at(-2),context=parts.at(-3);payload=pagePayload(site.rankings?.[context]?.[kind]||[],kind,context,true);}
    else if(pathname.includes('/details/')&&pathname.includes('/public-cache-clubs-teams/')){const key=pathname.split('/details/')[1].replace('.json','');payload=site.entity_details[key]}
    else if(pathname.startsWith('/top-data/v2/drivers/')){const profile=snapshot.profiles[pathname.split('/').pop().replace('.json','')]||site.profiles[pathname.split('/').pop().replace('.json','')];if(profile)payload={...profile,summary:profile.summary||Object.fromEntries(['races','wins','podiums','elo','safety_rating','points'].map(key=>[key,profile[key]])),strikes:{active:options.bannedDriver?3:1},is_banned:Boolean(options.bannedDriver),races:Array.isArray(profile.races)?profile.races:[]};}
    else if(pathname.startsWith('/top-data/v2/races/details/'))payload=site.results[pathname.split('/').pop().replace('.json','')]||{...snapshot.home.latest_hourly_race,results:[{...publicRows[0],position:1,points:130,elo_rating_delta:18,safety_delta:.12,car_model_id:21,best_lap:'1:43.905'}]};
    else if(pathname.startsWith('/top-data/v2/tables/')){
      const p=Number(pathname.match(/page-(\d+)/)?.[1]||1),chunk=pathname.includes('chunk-'),safety=pathname.includes('/safety'),best=pathname.includes('/bestlaps');
      if(pathname.includes('/safety/'))return route.fulfill({status:404,contentType:'application/json',body:'{}'});
      const rows=best?snapshot.bestlap_tables[ pathname.match(/bestlaps-([^/]+)/)?.[1]||'monza']?.items||snapshot.home.bestlaps:safety?(options.strikeStates?strikeFixture(safetyRows):safetyRows):publicRows;
      const total=options.longPagination&&!safety&&!best?33314:rows.length;
      payload={items:chunk||pathname.endsWith('/safety.json')?rows:rows.slice((p-1)*10,p*10),page:p,page_size:10,total_items:total,total_pages:Math.ceil(total/10)};
    }
    else if(pathname.startsWith('/hourly-votes-api/')){
      if(request.method()!=='GET')fixtureWrites++;
      const eventId=snapshot.event.event_id;
      if(pathname.endsWith('/voter-token'))payload={voter_token:'test-only-browser-token',expires_at:new Date(Date.now()+3600000).toISOString()};
      else if(pathname.endsWith('/votes'))payload={items:{[eventId]:{event_id:eventId,votes:4,already_voted:false}}};
      else if(pathname.endsWith('/vote')){assert.equal(request.headers().authorization,'Bearer test-only-browser-token');if(options.failVote)return route.fulfill({status:500,contentType:'application/json',body:'{}'});payload={event_id:eventId,votes:5,already_voted:true}}
      else if(pathname.endsWith('/unvote')){assert.equal(request.headers().authorization,'Bearer test-only-browser-token');payload={event_id:eventId,votes:4,already_voted:false}}
    }
    else if(pathname.includes('/achievements/'))payload={items:[],earned:0,total:0};
  }
  if(payload!=null)return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
  return route.fulfill({status:404,contentType:'application/json',body:'{}'});
}

export {browser,base,fixture,root,snapshot,site,signedDriver};

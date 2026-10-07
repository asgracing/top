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
async function checkPagination(page){
  const total=Number(await page.locator('#v2-page-input').getAttribute('max'));
  assert.equal(await page.locator('#v2-site-shell .scroll-hint').count(),0);
  assert.equal(await page.locator('#v2-page-links [data-page]').first().getAttribute('data-page'),'1');
  assert.equal(await page.locator('#v2-page-links [data-page]').last().getAttribute('data-page'),String(total));
  if(total>1){
    await page.locator('#v2-page-links [data-page]').last().click();await page.waitForFunction(p=>document.querySelector('#v2-page-number')?.textContent===String(p)&&!document.querySelector('#v2-prev').disabled,total);
    assert.equal(await page.locator('#v2-next').isDisabled(),true);
    assert.equal(await page.locator('#v2-rating-table .rank-medal').count(),0,'No medal ranks on the last page');
    await page.locator('#v2-page-input').fill('2');await page.locator('#v2-page-jump button').click();await page.waitForFunction(()=>document.querySelector('#v2-page-number')?.textContent==='2'&&!document.querySelector('#v2-prev').disabled);
    assert.equal(await page.locator('#v2-rating-table .rank-medal').count(),0,'No medal ranks on page two');
    const laterColors=await page.locator('#v2-rating-table tbody tr td:first-child').evaluateAll(cells=>cells.slice(0,4).map(cell=>getComputedStyle(cell.firstElementChild||cell).color));
    assert.equal(new Set(laterColors).size,1,'Later-page ranks all have the normal color');
    await page.locator('#v2-page-links [data-page="1"]').click();await page.waitForFunction(()=>document.querySelector('#v2-page-number')?.textContent==='1'&&!document.querySelector('#v2-next').disabled);
  }
  assert.equal(await page.locator('#v2-prev').isDisabled(),true);
  const medals=await page.locator('#v2-rating-table .rank-medal').evaluateAll(nodes=>nodes.map(node=>({rank:node.textContent,color:getComputedStyle(node).color})));
  assert.deepEqual(medals,[{rank:'1',color:'rgb(247, 204, 67)'},{rank:'2',color:'rgb(195, 208, 223)'},{rank:'3',color:'rgb(214, 154, 101)'}]);
  assert.ok(await page.locator('.table-footer').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'Page controls fit horizontally');
}
async function checkServerSrAccess(page,options){
  await page.locator('#v2-rating-table .current-user-row').waitFor({state:'visible'});
  await page.locator('.asg-legal-banner-btn-secondary').click();
  const thresholds=options.thresholds||{main:2,hourly:2.5};
  const blocked=Object.keys(thresholds).filter(key=>options.viewerSr!=null&&options.viewerSr<thresholds[key]).sort();
  assert.deepEqual((await page.locator('#v2-servers .is-sr-blocked').evaluateAll(nodes=>nodes.map(n=>n.dataset.server))).sort(),blocked);
  for(const key of blocked){
    const card=page.locator('#v2-servers [data-server="'+key+'"]');await card.hover();
    const hint=await card.getAttribute('title');assert.ok(hint.includes(options.viewerSr.toFixed(2))&&hint.includes(thresholds[key].toFixed(2)));
    assert.ok(hint.includes(options.language==='en'?'Your SR is too low':'Вашего SR недостаточно'));
    assert.equal(await card.getAttribute('aria-label'),hint);assert.equal(await card.isDisabled(),false);
    assert.equal(await card.evaluate(n=>getComputedStyle(n).borderLeftColor),'rgb(255, 135, 151)');
  }
  if(blocked.length){
    await page.locator('#v2-servers').screenshot({path:path.join(root,`design-research/v2-verification/server-sr-${options.viewerSr}-${options.language||'ru'}.png`)});
    await page.locator('#v2-servers [data-server="'+blocked[0]+'"]').click();
    assert.ok((await page.locator('.server-sr-warning').textContent()).includes(options.viewerSr.toFixed(2)));await page.locator('#v2-modal .modal-close').click();
    await page.locator('#v2-site-shell [data-modal="servers"]').click();assert.equal(await page.locator('.server-summary-item.is-sr-blocked').count(),blocked.length);await page.locator('#v2-modal .modal-close').click();
  }
  // SR changes and logout must refresh admission without a server-status update.
  await page.evaluate(async()=>{const {subscribe,publish}=await import('/v2/bridge.js?v=20261006v2k');let state;subscribe(s=>state=s)();window.__srAccessState=state;window.__srAccessPublish=publish;publish({...state,auth:{...state.auth,driver:{...state.auth.driver,sr:5}}})});
  assert.equal(await page.locator('#v2-servers .is-sr-blocked').count(),0);
  await page.evaluate(()=>window.__srAccessPublish({...window.__srAccessState,auth:{authenticated:false}}));
  assert.equal(await page.locator('#v2-servers .is-sr-blocked').count(),0);
}
async function checkSafetyColumns(page,language,width){
  assert.deepEqual(await page.locator('#v2-rating-table th').allTextContents(),language==='ru'?['№','Пилот','SR','Страйки','Гонки','Всего кругов','Грязные круги','Автоштрафы','Инциденты']:['№','Driver','SR','Strikes','Races','Total laps','Invalid laps','Auto penalties','Incidents']);
  const row=snapshot.home.safety[0],values=await page.locator('#v2-rating-table tbody tr').first().locator('td').allTextContents();
  assert.equal(values[3],row.strikes.active+'/3');
  assert.deepEqual(values.slice(4).map(v=>v.replace(/[\s,]/g,'')),[row.races_count,row.total_laps,row.total_invalid_laps,row.total_counted_penalties,row.total_incident_points].map(String));
  assert.equal(await page.locator('#v2-rating-table [data-rating="elo"]').count(),0);
  assert.equal(await page.locator('#v2-rating-table tbody tr').first().locator('a[href*="/driver/"]').count(),1);
  assert.equal(await page.locator('#v2-rating-table tbody tr').first().locator('[data-rating="sr"]').count(),1);
  if(language==='ru')await page.screenshot({path:path.join(root,`design-research/v2-verification/safety-columns-${width}.png`)});
}
async function dialogSnapshot(page,name,language,width){
  await page.waitForTimeout(250);assert.ok(await page.locator('#v2-modal').evaluate(n=>n.scrollWidth<=n.clientWidth+1),name+' dialog overflow');
  if(language==='ru')await page.screenshot({path:path.join(root,`design-research/v2-verification/${name}-${language}-${width}.png`)});
}
const populatedServer='assetto-corsa-competizione-dedic';
async function serverModal(page,language,width){
  await page.locator(`#v2-servers [data-server="${populatedServer}"]`).click();
  assert.equal(await page.locator('#v2-modal').getAttribute('data-kind'),'server');
  assert.equal(await page.locator('.server-parameter-row>div').count(),4);
  assert.equal(await page.locator('.server-driver-list>li:not(.empty)').count(),3);
  assert.equal(await page.locator('.server-driver-list .pilot-name[href*="/driver/"]').count(),3);
  assert.equal(await page.locator('.server-driver-list .pilot-car img').count(),3);
  assert.ok(await page.locator('.server-driver-list .pilot-car img').first().getAttribute('src').then(src=>src.endsWith('/32.png')));
  assert.ok((await page.locator('.server-driver-list .pilot-car').first().textContent()).includes('Ferrari 296 GT3'));
  assert.ok(await page.locator('.server-driver-list').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'Server roster fits horizontally');
  await dialogSnapshot(page,'server-roster',language,width);
  await page.locator('.server-driver-list [data-rating="elo"]').first().click();await page.waitForTimeout(250);assert.equal(await page.locator('#v2-modal').getAttribute('data-kind'),'driver-elo');assert.equal(await page.locator('#v2-modal .elo-chart').count(),1);await page.locator('#v2-modal .modal-close').click();
  await page.locator('#v2-site-shell [data-modal="servers"]').click();assert.equal(await page.locator('#v2-modal').getAttribute('data-kind'),'servers');assert.equal(await page.locator('.server-summary-item').count(),9);
  await page.locator(`.server-summary-item[data-server="${populatedServer}"]`).click();assert.equal(await page.locator('#v2-modal').getAttribute('data-kind'),'server');await page.locator('.server-driver-list [data-rating="sr"]').first().click();await page.waitForTimeout(250);assert.equal(await page.locator('#v2-modal').getAttribute('data-kind'),'driver-sr');await page.locator('#v2-modal .modal-close').click();
}
const futureEvent=structuredClone(snapshot.event),futureDate=new Date(Date.now()+86400000).toISOString().slice(0,10);
futureEvent.date=futureDate;futureEvent.status='scheduled';futureEvent.launch_at=futureDate+'T19:50:00+03:00';
const signedDriver=snapshot.home.driver_of_the_day.public_id;
function pagePayload(entries,kind,context='general',rating=false){return {schema_version:1,kind:rating?'clubs_teams_rating_page':'clubs_teams_catalog_page',entity_type:kind==='clubs'?'club':'team',context,context_version:1,season_id:null,rating_run_id:site.pointer.rating_run_id,page:1,total_pages:1,total:entries.length,limit:100,offset:0,completed_at:site.pointer.completed_at,entries,entries_sha256:createHash('sha256').update(JSON.stringify(entries)).digest('hex')}}
const publicRows=snapshot.leaderboard.items;
function strikeFixture(rows){return rows.map((row,i)=>i<6?{...row,active_strikes:i>=4?0:i,strikes:{active:i>=4?0:i},is_banned:i===5,global_banned:i===4}:row)}
const safetyRows=[...snapshot.home.safety,...publicRows.filter(r=>!snapshot.home.safety.some(s=>s.public_id===r.public_id))];
async function fixture(route,log,options={}){
  const request=route.request(),u=new URL(request.url()),pathname=u.pathname;
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
try{
  for(const [width,height] of [[1920,936],[1280,720],[390,844],[320,844]])for(const language of ['ru','en']){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[],log=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>fixture(route,log));
    await page.goto(`${base}/v2/${language}/`,{waitUntil:'networkidle'});
    await page.locator('#v2-rating-table tbody tr[data-row]').first().waitFor();
    await page.waitForTimeout(500);
    await fs.mkdir(path.join(root,'design-research/v2-verification'),{recursive:true});
    if(width===1920||width===390)await page.screenshot({path:path.join(root,`design-research/v2-verification/home-${language}-${width}.png`)});
    const info=await page.evaluate(()=>({language:document.documentElement.lang,overflow:document.documentElement.scrollWidth-innerWidth,rows:document.querySelectorAll('#v2-rating-table tbody tr[data-row]').length,servers:document.querySelectorAll('#v2-servers .server-card').length,event:document.getElementById('v2-event-track').textContent,duplicates:[...document.querySelectorAll('[id]')].map(n=>n.id).filter((id,i,ids)=>ids.indexOf(id)!==i),geometry:['.site-shell','.dashboard','.page-intro','.winner-panel','.support-panel'].map(s=>{const el=document.querySelector(s),c=getComputedStyle(el);return {s,display:c.display,opacity:c.opacity,visibility:c.visibility,rect:el.getBoundingClientRect().toJSON(),clip:c.clipPath}})}));
    console.log(JSON.stringify({width,language,errors,rows:info.rows,servers:info.servers,overflow:info.overflow}));
    assert.deepEqual(errors,[]);assert.equal(info.language,language);assert.ok(info.overflow<=1,`overflow ${width}`);assert.equal(info.rows,10);assert.deepEqual(info.duplicates,[]);
    assert.equal(await page.locator('meta[name="yandex-metrika-id"]').getAttribute('content'),'107697834');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
    assert.ok(!log.some(x=>x.url.includes('mc.yandex.ru')),'No analytics without consent');
    await page.locator('.asg-legal-banner-btn-secondary').click();
    await serverModal(page,language,width);
    if(width>1000){
      assert.ok(await page.locator('#v2-servers').evaluate(list=>{const box=list.getBoundingClientRect();return [...list.children].every(card=>{const r=card.getBoundingClientRect();return r.left>=box.left&&r.right<=box.right+1&&r.bottom<=box.bottom+1})}),'All nine server cards fit the desktop widget');
    }
    if(width===1920){
      await page.locator('.servers-panel').screenshot({path:path.join(root,`design-research/v2-verification/servers-${language}-${width}.png`)});
      await page.locator('#v2-servers .server-card').first().click();assert.equal(await page.locator('#v2-modal .server-parameter-row').count(),1);assert.match(await page.locator('#v2-modal-title').textContent(),/ASG Racing/);assert.equal(await page.locator('.server-driver-list .empty').count(),1);await page.locator('#v2-modal .modal-close').click();
      assert.ok(await page.locator('#v2-day-ratings').evaluate(n=>{const [elo,sr]=n.children;return sr.getBoundingClientRect().left-elo.getBoundingClientRect().right>=7}),'Day rating badges have a gap');
      for(const key of ['support','servers'])assert.equal(await page.locator(`[data-widget-dock="${key}"] .dock-symbol svg`).count(),1,'Visible dock has a close icon');
      assert.ok(await page.locator('.upcoming-panel').evaluate(n=>n.querySelector('.event-topline').getBoundingClientRect().top-n.querySelector('.panel-head').getBoundingClientRect().bottom<=14),'Event content starts directly below heading');
      await page.locator('#v2-race-vote').click();await page.waitForTimeout(350);assert.match(await page.locator('#v2-race-vote').textContent(),language==='ru'?/отменить/:/cancel/);
      await page.locator('#v2-race-vote').click();await page.waitForTimeout(350);
      assert.match(await page.locator('body').evaluate(n=>getComputedStyle(n).fontFamily),/Segoe UI/);
      assert.equal(await page.locator('.track-backdrop').evaluate(n=>getComputedStyle(n).zIndex),'0');
      assert.ok(await page.locator('.track-layer.is-active').evaluate(n=>getComputedStyle(n).backgroundImage.includes('/assets/')));
      assert.equal(await page.locator('.upcoming-panel').getAttribute('data-event-kind'),'mono');
      const firstDriver=await page.locator('#v2-rating-table tbody tr').first().getAttribute('data-row');
      await checkPagination(page);
      await page.locator('#v2-next').click();await page.waitForTimeout(250);assert.equal(await page.locator('#v2-page-number').textContent(),'2');assert.notEqual(await page.locator('#v2-rating-table tbody tr').first().getAttribute('data-row'),firstDriver);await page.locator('#v2-prev').click();await page.waitForTimeout(250);
      await page.locator('#v2-rating-table tbody tr').first().click({position:{x:15,y:15}});assert.equal(await page.locator('#v2-modal').getAttribute('data-kind'),'driver');await page.waitForTimeout(250);assert.ok(await page.locator('#v2-driver-track').count());assert.match(await page.locator('#v2-modal-title').textContent(),/#1/);assert.match(await page.locator('.driver-achievement-title').textContent(),/Grand Slam/);assert.match(await page.locator('.driver-strikes').textContent(),/1 \/ 3/);assert.equal(await page.locator('.driver-ban-status.is-clear').count(),1);assert.ok(await page.locator('#v2-driver-lap-value').evaluate(n=>{const boxes=[...n.children].map(c=>c.getBoundingClientRect());return Math.max(...boxes.map(b=>b.top))-Math.min(...boxes.map(b=>b.top))<10}),'Best-lap data stay on one aligned desktop row');await dialogSnapshot(page,'driver',language,width);await page.locator('#v2-modal .modal-close').click();
      await page.locator('[data-modal="event"]').click();assert.equal(await page.locator('#v2-modal').getAttribute('data-kind'),'event');assert.ok(await page.locator('#v2-modal .race-session-registration').count());await dialogSnapshot(page,'event',language,width);await page.locator('#v2-modal .modal-close').click();
      await page.locator('#v2-rating-table [data-rating="elo"]').first().click();await page.waitForTimeout(250);assert.equal(await page.locator('#v2-modal').getAttribute('data-kind'),'driver-elo');assert.ok(await page.locator('#v2-modal .elo-chart').count());await dialogSnapshot(page,'driver-elo',language,width);await page.locator('#v2-modal .modal-close').click();
      await page.locator('#v2-rating-table [data-rating="sr"]').first().click();await page.waitForTimeout(250);assert.equal(await page.locator('#v2-modal').getAttribute('data-kind'),'driver-sr');await page.locator('#v2-modal .modal-close').click();
      await page.locator('.online').click();assert.equal(await page.locator('#v2-modal').getAttribute('data-kind'),'online');assert.ok(await page.locator('#v2-modal .hour-chart').count());const months=await page.locator('#v2-online-month option').evaluateAll(nodes=>nodes.map(n=>n.value));assert.ok(months.length>2);await page.locator('#v2-online-month').selectOption(months.at(-1));assert.ok((await page.locator('#v2-online-date').inputValue()).startsWith(months.at(-1)));assert.equal(await page.locator('.hour-chart>div').count(),24);await dialogSnapshot(page,'online-history',language,width);await page.locator('#v2-modal .modal-close').click();
      await page.locator('#v2-site-shell [data-tab="bestlaps"]').click();await page.waitForTimeout(250);assert.equal(await page.locator('#v2-ranking-track').isVisible(),true);assert.equal(await page.locator('#v2-rating-table tbody tr[data-row]').count(),10);
      await checkPagination(page);
      await page.locator('#v2-next').click();await page.waitForTimeout(250);assert.equal(await page.locator('#v2-page-number').textContent(),'2');assert.equal(await page.locator('#v2-rating-table tbody tr[data-row]').count(),10);
      await page.locator('#v2-site-shell [data-tab="safety"]').click();await page.waitForTimeout(250);assert.equal(await page.locator('#v2-rating-table tbody tr[data-row]').count(),10);
      await checkSafetyColumns(page,language,width);
      await checkPagination(page);
      await page.locator('#v2-next').click();await page.waitForTimeout(250);assert.equal(await page.locator('#v2-page-number').textContent(),'2');assert.equal(await page.locator('#v2-rating-table tbody tr[data-row]').count(),10);assert.ok(!log.some(r=>new URL(r.url).pathname.includes('/tables/safety/')));
      await page.locator('#v2-site-shell [data-tab="clubs"]').click();assert.ok(await page.locator('#v2-rating-table tbody tr[data-row]').count()>0);
      await checkPagination(page);
      await page.locator('#v2-ranking-club-type').selectOption('clubs');assert.ok(await page.locator('#v2-rating-table tbody a[href*="/clubs/"]').count()>0);
      await page.locator('#v2-ranking-club-context').selectOption('hourly');await page.waitForTimeout(250);assert.ok(await page.locator('#v2-rating-table tbody tr[data-row]').count()>0);
      await page.locator('#v2-site-shell [data-tab="leaderboard"]').click();await page.waitForTimeout(250);
      await page.locator('#v2-welcome-widget summary').click();assert.equal(await page.locator('#top-guide').isVisible(),true);assert.ok(await page.locator('#top-guide').evaluate(n=>n.getBoundingClientRect().width<=365));for(let step=2;step<=5;step++){await page.locator('#top-guide-next').click();assert.match(await page.locator('#top-guide-progress').textContent(),new RegExp(String(step)))}await page.locator('#top-guide-back').click();assert.match(await page.locator('#top-guide-progress').textContent(),/4/);await page.locator('#top-guide-next').click();assert.match(await page.locator('#top-guide-progress').textContent(),/5/);if(language==='ru')await page.screenshot({path:path.join(root,'design-research/v2-verification/guide-ru.png')});for(let step=6;step<=7;step++){await page.locator('#top-guide-next').click();assert.match(await page.locator('#top-guide-progress').textContent(),new RegExp(String(step)))}await page.locator('#top-guide-next').click();assert.equal(await page.locator('#top-guide').isVisible(),false);assert.equal(await page.locator('.nav-group').first().evaluate(n=>n.open),false);await page.locator('#v2-welcome-widget summary').click();for(let step=2;step<=5;step++)await page.locator('#top-guide-next').click();await page.keyboard.press('Escape');assert.equal(await page.locator('.nav-group').first().evaluate(n=>n.open),false);
      await page.locator('#v2-notification-trigger').click();assert.equal(await page.locator('#v2-notification-popover').evaluate(n=>n.matches(':popover-open')),true);assert.ok(await page.locator('#v2-notification-popover .v2-notice').count());await page.locator('#v2-notification-popover [data-close-popover]').click();
      await page.locator('#v2-site-shell [data-modal="elo"]').first().click();await dialogSnapshot(page,'elo-reference',language,width);assert.equal(await page.locator('#v2-modal .elo-category-card').count(),6);assert.ok(await page.locator('#v2-modal .elo-category-card strong').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().width>100)));await page.locator('#v2-modal .modal-close').click();
      await page.locator('#v2-stream-widget summary').click();assert.equal(await page.locator('#v2-stream-popover').evaluate(n=>n.matches(':popover-open')),true);await page.locator('#v2-stream-popover [data-close-popover]').click();
      await page.locator('[data-cookie-settings]').first().click();assert.equal(await page.locator('.asg-legal-banner').isVisible(),true);assert.equal(await page.locator('.asg-legal-banner-card').evaluate(n=>getComputedStyle(n).borderRadius),'4px');await page.locator('.asg-legal-banner-btn-primary').click();await page.waitForTimeout(150);assert.equal(log.filter(x=>x.url.includes('mc.yandex.ru/metrika/tag.js')).length,1);assert.equal(await page.evaluate(()=>window.ym.a.filter(args=>args[1]==='init').length),1);
      await page.locator('[data-widget-dock="support"]').click();assert.equal(await page.locator('.left-column').getAttribute('data-dock-open'),'false');await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.left-column').getAttribute('data-dock-open'),'false');
      await page.locator('[data-widget-dock="servers"]').click();assert.equal(await page.locator('.right-column').getAttribute('data-dock-open'),'false');assert.ok(await page.locator('#v2-winner-results').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'Winner counters fit when both docks are collapsed');if(language==='ru')await page.screenshot({path:path.join(root,'design-research/v2-verification/home-docks-collapsed.png')});
    }
    if(width===390){
      await page.locator('[data-modal="event"]').click();await dialogSnapshot(page,'event',language,width);await page.locator('#v2-modal .modal-close').click();
      await page.locator('#v2-rating-table tbody tr').first().click({position:{x:15,y:15}});await page.waitForTimeout(250);await dialogSnapshot(page,'driver',language,width);await page.locator('#v2-driver-lap-value').scrollIntoViewIfNeeded();assert.ok(await page.locator('#v2-driver-lap-value').evaluate(n=>n.scrollWidth<=n.clientWidth+1));if(language==='ru')await page.screenshot({path:path.join(root,'design-research/v2-verification/driver-lap-mobile.png')});await page.locator('#v2-modal .modal-close').click();
      await page.locator('#v2-site-shell [data-modal="elo"]').first().click();await dialogSnapshot(page,'elo-reference',language,width);await page.locator('#v2-modal .modal-close').click();
    }
    if(width<1280){await page.locator('#v2-site-shell [data-tab="safety"]').click();await page.waitForTimeout(250);await checkSafetyColumns(page,language,width);await checkPagination(page)}
    assert.deepEqual(errors,[]);reports.push({width,height,language,rows:info.rows,servers:info.servers});await page.close();
  }
  for(const options of [{strikeStates:true},{strikeStates:true,language:'en',width:390},{signed:true,srAccess:true,viewerSr:2.25},{signed:true,srAccess:true,viewerSr:1.5,language:'en',width:390},{signed:true,srAccess:true,viewerSr:2.5},{signed:true,srAccess:true,viewerSr:3.5,thresholds:{main:3,hourly:4}},{signed:true,srAccess:true,viewerSr:null},{signed:true},{signed:true,admin:true},{failVote:true},{emptyHomePreviews:true},{normalEvent:true},{carousel:true},{motion:true},{longPagination:true},{bannedDriver:true,noTitle:true},{largeRoster:true},{missingRoster:true},{staleServers:true}]){
    const page=await browser.newPage({viewport:{width:options.longPagination?320:options.width||1920,height:936},reducedMotion:'reduce'}),log=[],errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>fixture(r,log,options));
    if(options.carousel){await page.emulateMedia({reducedMotion:'no-preference'});await page.clock.install()}
    if(options.motion){await page.emulateMedia({reducedMotion:'no-preference'});await page.addInitScript(()=>sessionStorage.setItem('asgV2IntroSeen','1'))}
    await page.goto(base+(options.language?'/v2/'+options.language+'/':'/v2/'),{waitUntil:'networkidle'});assert.ok(page.url().endsWith('/v2/'+(options.language||'ru')+'/'));await page.waitForTimeout(250);
    if(options.strikeStates){
      await page.locator('.asg-legal-banner-btn-secondary').click();await page.locator('#v2-site-shell [data-tab="safety"]').click();await page.waitForFunction(()=>document.querySelector('#v2-rating-table tbody tr:nth-child(4) .banned-badge'));
      const cells=page.locator('#v2-rating-table tbody tr td:nth-child(4)');assert.deepEqual((await cells.allTextContents()).slice(0,5),['0/3','1/3','2/3',options.language==='en'?'BANNED':'ЗАБАНЕН',options.language==='en'?'BANNED':'ЗАБАНЕН']);
      assert.equal(await cells.nth(3).locator('.banned-badge').count(),1);assert.equal(await cells.nth(4).locator('.banned-badge').count(),1);assert.equal(await cells.nth(5).locator('.banned-badge').count(),1);
      await page.locator('#v2-rating-table').screenshot({path:path.join(root,`design-research/v2-verification/safety-strikes-${options.language||'ru'}.png`)});
    }
    else if(options.srAccess){await checkServerSrAccess(page,options)}
    else if(options.signed){await page.locator('#v2-rating-table .current-user-row').waitFor({state:'visible'});assert.equal(await page.locator('#v2-rating-table .current-user-row').count(),1);await page.locator('.asg-legal-banner-btn-secondary').click();await page.locator('#v2-profile-trigger').click();assert.equal(await page.locator('#v2-profile-popover').evaluate(n=>n.matches(':popover-open')),true);assert.equal(await page.locator('#v2-profile-popover [href*="/moderation/"]').count(),options.admin?1:0);assert.equal(await page.locator('#v2-profile-popover [href*="/portal-ops/"]').count(),options.admin?1:0);await page.screenshot({path:path.join(root,'design-research/v2-verification/header-profile.png')})}
    else if(options.failVote){await page.locator('#v2-race-vote').click();await page.waitForTimeout(200);assert.equal(await page.locator('#v2-participation-note .v2-error').count(),1);assert.ok(!(await page.locator('#v2-race-vote').textContent()).includes('\u043e\u0442\u043c\u0435\u043d\u0438\u0442\u044c'))}
    else if(options.emptyHomePreviews){assert.equal(await page.locator('#v2-rating-table tbody tr[data-row]').count(),10);await page.locator('#v2-site-shell [data-tab="bestlaps"]').click();await page.waitForTimeout(250);assert.equal(await page.locator('#v2-rating-table tbody tr[data-row]').count(),10)}
    else if(options.normalEvent){assert.equal(await page.locator('.upcoming-panel').getAttribute('data-event-kind'),'hourly');await page.locator('.asg-legal-banner-btn-secondary').click();await page.locator('[data-modal="event"]').click();assert.match(await page.locator('#v2-modal-eyebrow').textContent(),/Часовая гонка/);assert.equal(await page.locator('#v2-modal-eyebrow .event-kind').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(247, 204, 67)')}
    else if(options.carousel){const image=await page.locator('.track-layer.is-active').evaluate(n=>n.style.backgroundImage);await page.clock.fastForward(30000);assert.notEqual(await page.locator('.track-layer.is-active').evaluate(n=>n.style.backgroundImage),image);assert.equal(await page.locator('.home-loader').isVisible(),false)}
    else if(options.longPagination){await page.locator('.asg-legal-banner-btn-secondary').click();await checkPagination(page);await page.locator('#v2-page-input').fill('1500');await page.locator('#v2-page-input').press('Enter');await page.waitForFunction(()=>document.querySelector('#v2-page-number')?.textContent==='1500'&&!document.querySelector('#v2-next').disabled);assert.ok(await page.locator('.table-footer').evaluate(n=>n.scrollWidth<=n.clientWidth+1));assert.equal(await page.locator('#v2-page-links [aria-current="page"]').textContent(),'1500');await page.screenshot({path:path.join(root,'design-research/v2-verification/pagination-long-mobile.png')})}
    else if(options.motion){
      await page.locator('.asg-legal-banner-btn-secondary').click();await page.waitForTimeout(4100);
      assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0,'Idle homepage has no decorative frame loop');
      await page.evaluate(async()=>{const {subscribe,publish}=await import('/v2/bridge.js?v=20261006v2k');let model;subscribe(m=>model=m)();window.__motionModel=structuredClone(model);window.__motionModel.announcement.event_id+=':motion-test';window.__motionModel.donations.goal.raised_amount+=1;window.__motionPublish=publish;publish(window.__motionModel)});
      await page.waitForTimeout(120);
      assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running'&&['v2-multiplier','v2-fund-progress'].includes(a.effect.target.id||a.effect.target.parentElement?.id)).length),2);
      assert.ok(await page.evaluate(()=>document.getAnimations().filter(a=>a.effect.target.id==='v2-multiplier').every(a=>a.effect.getTiming().iterations===2&&a.effect.getKeyframes().every(k=>!('color' in k)&&!('textShadow' in k)))));
      const time=await page.evaluate(()=>{const a=document.getAnimations().find(a=>a.effect.target.id==='v2-multiplier');window.__motionModel.votes.pending=!window.__motionModel.votes.pending;window.__motionModel.donationsLoading=!window.__motionModel.donationsLoading;window.__motionPublish(window.__motionModel);return a.currentTime});await page.waitForTimeout(100);
      assert.ok(await page.evaluate(t=>document.getAnimations().find(a=>a.effect.target.id==='v2-multiplier').currentTime>=t,time),'Same data does not restart an accent');
      await page.evaluate(()=>{const center=document.querySelector('.center-column');center.scrollTo({top:center.scrollHeight,behavior:'instant'})});
      await page.waitForFunction(()=>document.getAnimations().filter(a=>a.effect.target.id==='v2-multiplier').every(a=>a.playState==='paused'));
      assert.ok(await page.evaluate(()=>document.getAnimations().filter(a=>a.effect.target.id==='v2-multiplier').every(a=>a.playState==='paused')),'Offscreen accent pauses');
      await page.evaluate(()=>document.querySelector('.center-column').scrollTo({top:0,behavior:'instant'}));
      await page.waitForFunction(()=>document.getAnimations().some(a=>a.effect.target.id==='v2-multiplier'&&a.playState==='running'));
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});
      assert.ok(await page.evaluate(()=>document.body.classList.contains('v2-motion-paused')&&document.getAnimations().filter(a=>a.effect.target.id==='v2-multiplier').every(a=>a.playState==='paused')));
      await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});
      await page.locator('[data-widget-dock="support"]').click();
      assert.ok(await page.evaluate(()=>document.getAnimations().filter(a=>a.effect.target.parentElement?.id==='v2-fund-progress').every(a=>a.playState==='paused')));
      await page.locator('[data-widget-dock="support"]').click();await page.waitForTimeout(200);
      assert.ok(await page.evaluate(()=>document.getAnimations().some(a=>a.effect.target.parentElement?.id==='v2-fund-progress'&&a.playState==='running')));
      await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
      assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0,'Reduced motion cancels JS and CSS accents');
    }
    else if(options.bannedDriver){await page.locator('.asg-legal-banner-btn-secondary').click();await page.locator('#v2-rating-table tbody tr').first().click({position:{x:15,y:15}});await page.waitForTimeout(500);assert.equal(await page.locator('.driver-ban-status.is-banned').count(),1);assert.match(await page.locator('.driver-strikes').textContent(),/3 \/ 3/);assert.match(await page.locator('.driver-achievement-title').textContent(),/\u0412\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e/);assert.ok(await page.locator('#v2-driver-track').count())}
    else if(options.largeRoster||options.missingRoster||options.staleServers){await page.locator('.asg-legal-banner-btn-secondary').click();await page.locator(`#v2-servers [data-server="${populatedServer}"]`).click();if(options.largeRoster){assert.equal(await page.locator('.server-driver-list>li:not(.empty)').count(),32);assert.ok(await page.locator('#v2-modal .modal-body').evaluate(n=>n.scrollHeight>n.clientHeight));await page.locator('.server-driver-list>li').last().scrollIntoViewIfNeeded();assert.ok(await page.locator('.server-driver-list>li').last().isVisible());await dialogSnapshot(page,'server-large-roster','ru',1920)}else{assert.equal(await page.locator('.server-driver-list .empty').count(),1);assert.match(await page.locator('.server-driver-list .empty').textContent(),options.staleServers?/Онлайн устарел/:/ещё не опубликован/)}await page.keyboard.press('Escape');assert.equal(await page.locator('#v2-modal').evaluate(n=>n.open),false);assert.equal(await page.locator('#v2-site-shell').evaluate(n=>n.inert),false)}
    assert.deepEqual(errors,[]);await page.close();
  }
  await fs.writeFile(path.join(root,'design-research/v2-verification/report.json'),JSON.stringify({reports,fixtureWrites,productionWrites:0},null,2));
}finally{await browser.close()}

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,fixture,root,site,snapshot,signedDriver} from './v2-browser-fixtures.mjs';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';

const compiled=process.env.ASG_V2_OUTPUT_DIR;assert.ok(compiled);
const cars=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/cars.json'),'utf8'));
const reports=[],id='2c3baa03bc2cc33b';
const driver=i=>({public_id:'drv_'+(0xa00000+i).toString(16).padStart(12,'0'),driver:'Fixture Pilot '+i,is_banned:false});
const directory=Array.from({length:120},(_,i)=>driver(i));
const pageData=(items,total=items.length,p=1,limit=100)=>({revision:7,archive_revision:9,generated_at:'2026-11-11T09:00:00Z',items,total_items:total,page:p,total_pages:Math.max(1,Math.ceil(total/limit))});
function owner(){const club=site.entity_details['clubs/asg-racing'];return {authenticated:true,linked:true,driver:{public_id:signedDriver,display_name:'Fixture Pilot [ASG]',profile_url:'/driver/?id='+signedDriver,elo:1445,sr:9.99},steam:{persona_name:'Fixture Pilot'},discord:{linked:true,sync_status:'synced'},csrf_token:'fixture-only',permissions:{portal_manage:true},clubs_teams:{enabled:true,pending_commands:0,pending_assets:0,applied_state:{public_id:signedDriver,club:{id:'fixture-club',public_id:club.public_id,slug:club.slug,display_name:club.display_name,status:'approved',role:'head',row_version:1,pending_revision:false},team:null},notifications:[],asset_notifications:[],membership_actions:[],team_club_actions:[],snapshot:{available:true,stale:false,revision:1}}};}
async function create(language,width=1280){
 const page=await browser.newPage({viewport:{width,height:936}}),reads=[],errors=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url()),pathname=u.pathname;
  if(req.method()!=='GET'){writes.push(pathname);return route.fulfill({status:403,body:'{}'});}
  if(u.origin==='https://asgracing.ru'){
   const relative=decodeURIComponent(pathname).replace(/^\//,'')+(pathname.endsWith('/')?'index.html':'');
   for(const base of [compiled,root]){const file=path.resolve(base,relative);if(!file.startsWith(path.resolve(base)+path.sep))break;
    try{const body=await fs.readFile(file);return route.fulfill({body,contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream'});}catch{}}
   return route.fulfill({status:404,body:'missing'});
  }
  reads.push(pathname+u.search);
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'https://asgracing.ru','access-control-allow-credentials':'true'},body:JSON.stringify(body)});
  if(u.hostname==='auth.asgracing.ru'&&pathname==='/v1/me')return json(owner());
  if(pathname.startsWith('/race-archive-shadow/v1/site/stats/')){
   const name=pathname.split('/').at(-1);
   if(name==='directory'){
    const q=u.searchParams.get('q'),p=Number(u.searchParams.get('page'));
    if(/^Fixture Pilot \d+$/.test(q))return json(pageData([{...driver(Number(q.split(' ').at(-1))),is_banned:true}]));
    return json(pageData(directory.slice((p-1)*100,p*100),120,p));
   }
   if(name==='tracks')return json(pageData([{track_code:'monza'},{track_code:'spa'}]));
   if(name==='cars')return json(pageData([{car_model_id:cars.cars[0].car_model_id,best_lap_ms:120123,best_lap:'2:00.123',best_lap_track:u.searchParams.get('track'),best_lap_public_id:driver(1).public_id,best_lap_driver:'Fixture Record'}]));
   if(name==='rankings'||name==='bestlaps'){
    const rows=name==='rankings'?snapshot.leaderboard.items:[{...driver(1),best_lap:'1:48.123',best_lap_ms:108123,track_code:'monza',best_lap_car_name:'Fixture Car'}];
    const limit=Number(u.searchParams.get('limit'));return json(pageData(rows.slice(0,limit),rows.length,1,limit));
   }
   if(pathname.endsWith('/drivers/'+directory[0].public_id))return json({revision:7,profile:directory[0]});
   return json({error:'stats_legacy'},503);
  }
  if(pathname==='/race-archive-shadow/v1/site/archive')return json({schema:1,revision:9,generated_at:'2026-11-11T09:00:00Z',archive_total:1,total_items:1,total_pages:1,page:1,items:[{race_id:id,kind:'hourly',source:'hourly',track_code:'monza',finished_at:'2026-11-10T19:00:00Z',participants_count:29,winner:'Fixture Winner',average_elo:1100}]});
  if(pathname==='/top-data/v2/cars/cars.json')return json(cars.cars);
  if(pathname==='/top-data/bans.json')return json({generated_at:'2026-11-11T09:00:00Z',items:Array.from({length:25},(_,i)=>({name:'Fixture Pilot '+i,banned_at:'2026-11-11T09:00:00Z',reason_code:'strike_limit'}))});
  return fixture(route,[]);
 });
 async function go(route){await page.goto(`https://asgracing.ru/v2/${language}/${route}`,{waitUntil:'networkidle'});const consent=page.locator('.asg-legal-banner-btn-secondary');if(await consent.isVisible())await consent.click();}
 return {page,reads,errors,writes,go};
}
try{
 for(const language of ['ru','en']){
  for(const route of ['', 'hourly/']){
   const c=await create(language);await c.go(route);
   if(!route)assert.ok(c.reads.some(u=>u.includes('/top-data/v2/home.json')),'home projection missing on home');
   else assert.equal(c.reads.some(u=>u.includes('/top-data/v2/home.json')),false);
   assert.ok(c.reads.some(u=>u.includes('/hourly-data/schedule.json')));
   assert.deepEqual(c.errors,[]);reports.push({language,route:route||'home',reads:c.reads.length,errors:c.errors});await c.page.close();
  }
  for(const route of ['races/','documents/read/?id=privacy','cars/','account/',`driver/?id=${signedDriver}`]){
   const c=await create(language,language==='ru'?1280:390);await c.go(route);
   assert.equal(c.reads.some(u=>u.includes('/top-data/v2/home.json')),false,route+' read home');
   assert.equal(c.reads.some(u=>u.includes('/tables/')||u.includes('/tracks/bestlap')),false,route+' read old rankings/tracks');
   assert.equal(c.reads.some(u=>u.includes('/hourly-data/announcement')||u.includes('/hourly-data/schedule')),false,route+' read hidden Hourly');
   if(route==='cars/'){
    await c.page.locator('#r24-car-track').selectOption('monza');
    await c.page.locator('#r24-car-content').getByText('2:00.123',{exact:true}).waitFor();
    assert.ok(c.reads.some(u=>u.includes('/stats/cars?')));assert.ok(c.reads.some(u=>u.includes('/stats/tracks?')));
    assert.equal(c.reads.some(u=>u.includes('/top-data/v2/tables/')),false);
   }
   if(route==='account/'){
    await c.page.locator('.control-account-hero').waitFor();
    await c.page.locator('[data-ct-manage-members="club"]').click();
    const input=c.page.locator('[data-ct-pilot-search]');await input.waitFor();
    assert.equal(c.reads.some(u=>u.includes('/stats/directory')),false);
    await input.fill('Fixture');await c.page.locator('[data-ct-select-pilot]').first().waitFor();
    assert.equal(await c.page.locator('[data-ct-select-pilot]').count(),50);
    await c.page.locator('[data-ct-show-more]').click();await c.page.waitForFunction(()=>document.querySelectorAll('[data-ct-select-pilot]').length===100);
    assert.ok(c.reads.some(u=>u.includes('/stats/directory?')&&u.includes('revision=7')&&u.includes('page=2')));
    await input.fill('x');await c.page.waitForFunction(()=>document.querySelectorAll('[data-ct-select-pilot]').length===0);
    await input.fill(directory[0].public_id);
    await c.page.waitForFunction(()=>document.querySelectorAll('[data-ct-select-pilot]').length===1);
    assert.ok(c.reads.some(u=>u.includes('/stats/drivers/'+directory[0].public_id)));
    assert.equal(c.reads.some(u=>u.includes('/drivers/search.json')),false);
   }
   assert.deepEqual(c.errors,[]);assert.equal(c.reads.some(u=>u.includes('/public-cache-clubs-teams/')&&u.includes('/details/')),route==='account/'||route.startsWith('driver/'));
   await c.page.screenshot({path:taskScratchPath(`migration-${language}-${route.split('/')[0]}.png`)});
   reports.push({language,route,reads:c.reads.length,errors:c.errors});await c.page.close();
  }
 }
 const c=await create('en');await c.page.goto('https://asgracing.ru/overlay/',{waitUntil:'networkidle'});
 await c.page.locator('#overlay-bestlap-time').getByText('1:48.123',{exact:true}).waitFor();
 assert.match(await c.page.locator('#overlay-bestlap-meta').textContent(),/monza.*Fixture Car/);
 assert.equal(c.reads.some(u=>u.includes('/overlay.json')||u.includes('/snapshot.json')),false);
 assert.equal(c.reads.filter(u=>u.includes('/stats/')).length,2);assert.deepEqual(c.errors,[]);
 reports.push({route:'overlay/',reads:c.reads.length,errors:c.errors});await c.page.close();
 const bans=await create('ru');await bans.go('bans/');
 await bans.page.waitForFunction(()=>document.querySelectorAll('.bans-table a[href*="driver/"]').length===10);
 assert.equal(bans.reads.filter(p=>p.includes('/stats/directory?')).length,10);
 await bans.page.locator('#site-bans-content [data-pagination-page="2"]').click();
 await bans.page.waitForFunction(()=>document.querySelector('.bans-table a')?.textContent.includes('Fixture Pilot 10'));
 await bans.page.waitForFunction(()=>document.querySelectorAll('.bans-table a[href*="driver/"]').length===10);
 assert.equal(bans.reads.filter(p=>p.includes('/stats/directory?')).length,20);
 assert.equal(bans.reads.some(p=>p.includes('/drivers/search.json')),false);assert.deepEqual(bans.errors,[]);
 reports.push({route:'bans visible identities',directoryReads:20,feedRows:25});await bans.page.close();
 const seasonal=await create('ru'),calls=[];
 await seasonal.page.route('https://asgracing.ru/__fixture__',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Fixture</title>'}));
 await seasonal.page.route('https://data.asgracing.ru/**',r=>{
  const u=new URL(r.request().url());calls.push(u.pathname);
  const card={race_id:id,kind:'championship',track_code:'spa',finished_at:'2026-10-02T19:00:00Z'};
  const row={...driver(1),position:1,points:26};
  let payload;
  if(u.pathname==='/hourly-data/events/fixture/races/event.json')payload={...card,results:[row]};
  else if(u.pathname==='/race-archive-shadow/v1/site/races/'+id)payload={race_id:id,archive_revision:9,card,protocol:{...card,average_elo:1300,results:[{...row,points:999,elo:1300,safety_rating_after:7}],qualifying:{status:'available',results:[{...row,best_lap:'2:18.000'}]}}};
  else return r.fulfill({status:404,body:'{}'});
  return r.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'https://asgracing.ru'},body:JSON.stringify(payload)});
 });
 await seasonal.page.goto('https://asgracing.ru/__fixture__');
 const result=await seasonal.page.evaluate(async id=>{
  const {createPageData}=await import('/v2/pages/data.js');
  return createPageData(()=>({}),{raceProtocol:true}).race('event',{_data_namespace:'season',_season_slug:'fixture',details_path:'races/event.json',_published_race:{race_id:id,details_path:`races/${id}.json`}});
 },id);
 assert.equal(result.results[0].points,26);assert.equal(result.results[0].elo,1300);assert.equal(result.qualifying.results.length,1);
 assert.equal(calls.some(p=>p.includes('/races/context/')||p===`/hourly-data/races/${id}.json`),false);
 reports.push({route:'seasonal protocol',points:result.results[0].points,elo:result.results[0].elo,qualifying:result.qualifying.results.length});await seasonal.page.close();
 const portal=await create('en');
 await portal.page.route('https://asgracing.ru/__fixture__',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Fixture</title><main id="workspace"></main>'}));
 await portal.page.goto('https://asgracing.ru/__fixture__');
 await portal.page.evaluate(async()=>{
  const {mountClubsManagement}=await import('/src/pages/portal-ops/portal-clubs-workspace.js');
  const workspace=mountClubsManagement({root:document.getElementById('workspace'),api:async()=>({available:true,stale:false,generated_at:'2026-11-11T09:00:00Z',entities:[]}),auth:()=>({authenticated:true,permissions:{portalManage:true},driver:{publicId:'drv_000000a00000'},csrfToken:'fixture-only'}),confirmAction:async()=>false,onError:()=>{},language:()=> 'en'});
  await workspace.load();
 });
 await portal.page.locator('[data-create="club"]').click();await portal.page.locator('[data-pilot-search]').fill('Fixture');
 await portal.page.locator('[data-pilot]').first().waitFor();assert.equal(await portal.page.locator('[data-pilot]').count(),12);
 await portal.page.locator('[data-pilot]').first().click();assert.match(await portal.page.locator('[data-pilot-selected]').textContent(),/Fixture Pilot/);
 assert.equal(portal.reads.some(p=>p.includes('/drivers/search.json')),false);assert.deepEqual(portal.errors,[]);
 reports.push({route:'portal pilot picker',reads:portal.reads.length});await portal.page.close();
 await fs.writeFile(taskScratchPath('reader-migration-browser.json'),JSON.stringify(reports,null,2));
 console.log('Reader migration passed: '+reports.length+' browser cases; both languages, 390/1280px, lazy paged member search and current overlay.');
}finally{await browser.close();}

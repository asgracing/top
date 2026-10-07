// Private responses are invented fixtures; every external write is intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root,signedDriver} from './v2-browser-fixtures.mjs';
const out=path.join(root,'../tmp/v2-control-check');await fs.mkdir(out,{recursive:true});
const reports=[],revision='a'.repeat(64);
const event={occurrence_id:'fixture_hourly_20261020',race_format:'hourly',points_multiplier:5,race_start_local:'2026-10-20T20:00',server_open_local:'2026-10-20T19:00',track_code:'monza',track_name:'Monza',practice_minutes:60,qualifying_minutes:20,race_minutes:60,pre_race_wait_seconds:120,session_overtime_seconds:600,server_window_minutes:180,hour_of_day:18,ambient_temp_c:25,cloud_level:.15,rain_level:0,weather_randomness:1,participation_mode:'individual',team_max_drivers:4,editable:true};
const club={entity_type:'club',public_id:'club_fixture',slug:'fixture',display_name:'Fixture Racing Club',row_version:2,status:'approved',active_members:2,pending_revision:true,pending_logo:false,revision:{changes:[{field:'description_ru',before:'Before',after:'After'}]},members:[{public_id:signedDriver,display_name:'Fixture Pilot',role:'head'}],requests:[],audit:[{action:'revision.submit',occurred_at:'2026-10-07T08:00:00Z',actor_type:'pilot',actor_public_id:signedDriver}]};
function auth(mode='admin'){
 if(mode==='guest')return {authenticated:false};
 return {authenticated:true,linked:mode!=='unlinked',driver:mode==='unlinked'?null:{public_id:signedDriver,display_name:'Fixture Pilot',profile_url:'/driver/?id='+signedDriver,rank:3,elo:1445,sr:9.99},steam:{persona_name:'Fixture Pilot'},discord:{linked:false},csrf_token:'fixture-csrf',permissions:{moderation_issue:mode!=='member',portal_manage:mode!=='member'},preferences:{race_number:765,can_change:true},titles:{enabled:true,definitions_version:6,active:{achievement_id:'grand_slam',title:'Grand Slam',icon:'♛'},available:[{achievement_id:'grand_slam',title:'Grand Slam',icon:'♛'}],selected_achievement_id:'grand_slam'}};
}
async function create(screen,language='ru',width=1920,mode='admin'){
 const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],writes=[],gets=[];let current=auth(mode),protectedDriver=false,strikes=0,numberApproved=false,fail=false;
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  const respond=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(url.hostname==='auth.asgracing.ru'){
   const p=url.pathname;
   if(req.method()!=='GET'){
    writes.push({path:p,method:req.method(),headers:req.headers(),body:req.postData()?req.postDataJSON():null});
    if(fail)return respond({detail:'conflict'},409);
    if(p.endsWith('/approve')){numberApproved=true;return respond({approved:true});}
    if(p==='/v1/me/race-number'){current.preferences.pending_request={request_id:'request_fixture',race_number:writes.at(-1).body.race_number};return respond({pending:true});}
    if(p.includes('/commands'))return respond({command:{command_id:'command_fixture'}});
    return respond({ok:true,enabled:false,settings:{show_avatar:true,show_race_number:true}});
   }
   gets.push(p);
   if(p==='/v1/me')return respond(current,mode==='error'?503:200);
   if(p==='/v1/me/driver-overlay')return respond({enabled:false,settings:{show_avatar:true,show_race_number:true}});
   if(p==='/v1/moderation/drivers')return respond({drivers:[{public_id:signedDriver,display_name:'Fixture Pilot',profile_url:'/driver/?id='+signedDriver,rank:3,elo:1445,sr:9.99,moderation:{active_strikes:strikes,protected:protectedDriver}}]});
   if(p==='/v1/moderation/race-number-requests')return respond({requests:numberApproved?[]:[{request_id:'request_fixture',public_id:signedDriver,display_name:'Fixture Pilot',requested_number:321,current_race_number:765,eligible:true}]});
   if(p==='/v1/portal-ops/hourly/events')return respond({available:mode!=='unavailable',stale:mode==='stale',schedule_revision:revision,tracks:[{code:'monza',name:'Monza'},{code:'spa',name:'Spa-Francorchamps'}],events:[event,{...event,occurrence_id:'championship_fixture',competition_mode:'championship',track_name:'Spa-Francorchamps',track_code:'spa',editable:false}]});
   if(p==='/v1/portal-ops/clubs-teams')return respond({available:mode!=='unavailable',stale:mode==='stale',revision,entities:[club,{...club,entity_type:'team',public_id:'team_fixture',display_name:'Fixture Racing Team'}]});
   if(p.includes('/commands/'))return respond({command:{status:fail?'conflict':'applied',receipt:fail?{error:{code:'conflict'}}:{result:{operation:'preview_change',occurrence_id:event.occurrence_id,confirm_token:'fixture-confirm',preview_sha256:'b'.repeat(64),schedule_revision:revision,changes:[{field:'points_multiplier',before:5,after:10}]}}}});
   return respond({});
  }
  if(req.method()!=='GET')return respond({ok:true});
  return fixture(route,[],{signed:mode!=='guest',admin:mode==='admin'});
 });
 const pathname={settings:'account/settings',moderation:'moderation',ops:'portal-ops'}[screen];
 await page.goto(base+`/v2/${language}/${pathname}/`,{waitUntil:'networkidle'});
 try {await page.locator('#v2-control-root').waitFor();}catch(error){console.log({screen,language,width,mode,errors,url:page.url(),pageView:await page.locator('#page-view').innerText().catch(()=>''),controls:await page.locator('.v2-language').count()});throw error;}
 const consent=page.locator('.asg-legal-banner-btn-secondary');if(await consent.isVisible())await consent.click();
 return {page,errors,writes,gets,setFail:()=>fail=true,setProtected:()=>protectedDriver=true,setStrikes:n=>strikes=n};
}
async function ready(c,screen){
 assert.deepEqual(c.errors,[],`${screen} initialization`);
 await c.page.locator(screen==='settings'?'#race-number-input':screen==='moderation'?'#moderation-search':'.portal-hourly-event').first().waitFor({state:'visible'});
 if(screen==='ops')await c.page.locator('#portal-hourly-form').waitFor({state:'visible'});
}
try{
 for(const screen of ['settings','moderation','ops'])for(const language of ['ru','en'])for(const width of [1920,1280,768,390,320]){
  const c=await create(screen,language,width);await ready(c,screen);
  assert.equal(await c.page.locator('.dashboard>aside:visible').count(),0);
  const links=await c.page.locator('.control-navigation a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
  assert.deepEqual(links,['account/','account/settings/','moderation/','portal-ops/'].map(p=>`/v2/${language}/${p}`));
  assert.match(await c.page.locator('.header .navigation').textContent(),language==='ru'?/Гонки/:/Races/);
  assert.equal(await c.page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0,`${screen}/${language}/${width} viewport overflow`);
  assert.ok(await c.page.locator('#v2-control-root').evaluate(node=>node.scrollWidth<=node.clientWidth+1),`${screen}/${language}/${width} content overflow`);
  assert.deepEqual(c.errors,[]);
  if(language==='ru')await c.page.screenshot({path:out+`/${screen}-${width}.png`});
  reports.push({screen,language,width});await c.page.close();
 }
 for(const screen of ['settings','moderation','ops'])for(const mode of ['guest','member','error']){
  const c=await create(screen,'ru',390,mode);assert.deepEqual(c.errors,[]);
  if(screen!=='settings'){
   assert.equal(await c.page.locator(screen==='ops'?'#portal-ops-workspace':'#moderation-workspace').isVisible(),false);
   assert.equal(c.gets.some(p=>p.includes('/portal-ops/')||p.includes('/moderation/')),false);
  }
  assert.equal(c.writes.length,0);await c.page.close();
 }
 const settings=await create('settings');await ready(settings,'settings');
 await settings.page.locator('#driver-title-save').click();await settings.page.waitForTimeout(100);
 assert.equal(settings.writes[0].path,'/v1/me/title');assert.equal(settings.writes[0].headers['x-csrf-token'],'fixture-csrf');
 await settings.page.locator('#race-number-release').click();await settings.page.locator('[data-control-cancel]').click();assert.equal(settings.writes.length,1);
 await settings.page.locator('#race-number-input').fill('321');await settings.page.locator('#race-number-submit').click();await settings.page.waitForTimeout(100);
 assert.equal(settings.writes.at(-1).body.race_number,321);
 await settings.page.locator('#driver-overlay-toggle').click();await settings.page.locator('#driver-overlay-manager').waitFor({state:'visible'});
 assert.deepEqual(settings.errors,[]);await settings.page.close();
 const moderation=await create('moderation');await ready(moderation,'moderation');
 await moderation.page.locator('#moderation-search').fill('Fixture');await moderation.page.locator('.moderation-result').click();
 await moderation.page.locator('#moderation-reason').selectOption('dangerous_driving');await moderation.page.locator('#moderation-comment').fill('Fixture evidence: dangerous contact on lap five.');
 await moderation.page.locator('#moderation-submit').click();await moderation.page.locator('[data-control-cancel]').click();assert.equal(moderation.writes.length,0);
 await moderation.page.locator('#moderation-submit').click();await moderation.page.locator('[data-control-confirm]').click();await moderation.page.waitForTimeout(2200);
 assert.equal(moderation.writes[0].body.action,'ban.issue');assert.equal(moderation.writes[0].headers['x-csrf-token'],'fixture-csrf');assert.match(await moderation.page.locator('#moderation-message').textContent(),/применено/);
 moderation.setProtected();await moderation.page.locator('#moderation-search').fill('Protected');await moderation.page.locator('.moderation-result').click();await moderation.page.locator('#moderation-submit').click();assert.equal(moderation.writes.length,1);
 await moderation.page.locator('[data-mod-view="numbers"]').click();await moderation.page.locator('.moderation-number-request button').click();await moderation.page.locator('[data-control-confirm]').click();await moderation.page.waitForTimeout(100);
 assert.equal(moderation.writes.at(-1).path,'/v1/moderation/race-number-requests/request_fixture/approve');assert.deepEqual(moderation.errors,[]);await moderation.page.close();
 const ops=await create('ops');await ready(ops,'ops');
 await ops.page.locator('#hourly-points-multiplier').fill('10');await ops.page.locator('#hourly-preview').click();await ops.page.locator('#hourly-preview-card').waitFor({state:'visible'});
 assert.equal(ops.writes[0].body.command_type,'portal.hourly.preview_change');assert.equal(ops.writes[0].body.expected_schedule_revision,revision);
 await ops.page.locator('#hourly-apply').click();await ops.page.locator('[data-control-cancel]').click();assert.equal(ops.writes.length,1);
 await ops.page.locator('#hourly-apply').click();await ops.page.locator('[data-control-confirm]').click();await ops.page.waitForTimeout(1700);
 assert.equal(ops.writes[1].body.command_type,'portal.hourly.apply_change');assert.equal(ops.writes[1].body.payload.confirm_token,'fixture-confirm');
 await ops.page.locator('[data-id="championship_fixture"]').click();assert.equal(await ops.page.locator('#hourly-preview').isDisabled(),true);
 await ops.page.locator('[data-panel="clubs"]').click();await ops.page.locator('#portal-clubs-form').waitFor({state:'visible'});
 await ops.page.locator('#portal-clubs-form button[type=submit]').click();await ops.page.locator('[data-control-confirm]').click();await ops.page.waitForTimeout(1700);
 assert.equal(ops.writes.at(-1).body.command_type,'portal.entity.revision_decide');assert.equal(ops.writes.at(-1).body.expected_entity_version,2);
 assert.match(await ops.page.locator('#portal-clubs-roster a').first().getAttribute('href'),/^\/v2\/ru\/driver\//);
 assert.deepEqual(ops.errors,[]);await ops.page.close();
 const stale=await create('ops','ru',390,'stale');await ready(stale,'ops');await stale.page.locator('#hourly-preview').click();await stale.page.waitForTimeout(50);assert.equal(stale.writes.length,0);assert.deepEqual(stale.errors,[]);await stale.page.close();
 const unavailable=await create('ops','ru',390,'unavailable');assert.match(await unavailable.page.locator('#portal-hourly-state').textContent(),/недоступны/);assert.equal(unavailable.writes.length,0);await unavailable.page.close();
 const third=await create('moderation');third.setStrikes(2);await ready(third,'moderation');
 await third.page.locator('#moderation-search').fill('Fixture');await third.page.locator('.moderation-result').click();await third.page.locator('[data-action="strike.issue"]').click();
 await third.page.locator('#moderation-reason').selectOption('dangerous_driving');await third.page.locator('#moderation-comment').fill('Fixture contact during the race on lap five.');
 await third.page.locator('#moderation-submit').click();await third.page.locator('[data-control-confirm]').click();await third.page.locator('[data-control-cancel]').click();assert.equal(third.writes.length,0,'third strike requires second confirmation');
 await third.page.locator('#moderation-submit').click();
 await third.page.evaluate(async()=>{const bridge=await import('/v2/bridge.js?v=20261006v2k');let model;bridge.subscribe(value=>model=value)();bridge.publish({...model,auth:{authenticated:false,permissions:{}}});});
 assert.equal(await third.page.locator('#v2-modal').isVisible(),false);assert.equal(await third.page.locator('#moderation-workspace').isVisible(),false);assert.equal(third.writes.length,0);assert.deepEqual(third.errors,[]);await third.page.close();
 await fs.writeFile(out+'/report.json',JSON.stringify(reports,null,2));console.log(`V2 control checks passed: ${reports.length} RU/EN layouts, access gates, title/number changes, sanctions/number approval, Hourly preview/apply, championship lock, entity approval, stale guard. All writes intercepted.`);
}finally{await browser.close();}

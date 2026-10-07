// Real account controllers; all identities and private responses are fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root,signedDriver,site} from './v2-browser-fixtures.mjs';
const out=path.join(root,'../tmp/v2-account-check');await fs.mkdir(out,{recursive:true});
const reports=[];
function payload(mode='owner'){
 const club=site.entity_details['clubs/asg-racing'];
 return {authenticated:true,linked:true,driver:{public_id:signedDriver,display_name:'Fixture Pilot [ASG]',profile_url:'/driver/?id='+signedDriver,rank:3,elo:1445,sr:9.99},steam:{persona_name:'Fixture Steam'},discord:{linked:mode!=='discord',sync_status:'synced'},csrf_token:mode==='csrf'?'':'fixture-csrf',preferences:{race_number:765,can_change:true},titles:{enabled:true,definitions_version:6,active:{achievement_id:'grand_slam',title:'Grand Slam',icon:'♛'},available:[],selected_achievement_id:null},permissions:{moderation_issue:mode==='admin',portal_manage:mode==='admin'},clubs_teams:{enabled:true,pending_commands:mode==='pending'?1:0,pending_assets:0,applied_state:{public_id:signedDriver,club:{id:'fixture-internal-club',public_id:club.public_id,slug:club.slug,display_name:club.display_name,status:'approved',role:mode==='member'?'member':'head',row_version:1,pending_revision:false},team:null},notifications:[{command_id:'fixture-command',status:'applied',created_at:'2026-10-05T10:00:00Z'}],asset_notifications:[],membership_actions:[],team_club_actions:[],snapshot:{available:true,stale:mode==='stale',revision:1}}};
}
async function create(language='ru',width=1920,mode='owner'){
 const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],writes=[];let auth=payload(mode),failWrite=false;
 if(mode==='unlinked')auth={...auth,driver:null,linked:false};
 if(mode==='guest')auth={authenticated:false};
 if(mode==='disabled')auth.clubs_teams.enabled=false;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async r=>{
  const req=r.request(),u=new URL(req.url());
  if(u.hostname==='auth.asgracing.ru'&&u.pathname==='/v1/me')return r.fulfill({status:mode==='error'?503:200,contentType:'application/json',body:JSON.stringify(auth)});
  if(u.hostname==='auth.asgracing.ru'&&u.pathname.startsWith('/v1/me/driver-overlay'))return r.fulfill({contentType:'application/json',body:JSON.stringify({enabled:false,settings:{show_avatar:true,show_race_number:true}})});
  if((u.hostname==='data.asgracing.ru'||u.pathname.startsWith('/__asg_public__/'))&&req.resourceType()==='image')return r.fulfill({contentType:'image/png',body:await fs.readFile(path.join(root,'social/asg.png'))});
  if(req.method()!=='GET'){
   if(u.hostname!=='auth.asgracing.ru')return fixture(r,[],{signed:true});
   writes.push({url:u.href,method:req.method(),headers:req.headers(),body:req.postDataJSON()});
   return r.fulfill({status:failWrite?403:200,contentType:'application/json',body:JSON.stringify(failWrite?{detail:'recent_auth_required'}:{command_id:'fixture-command',status:'applied'})});
  }
  if(u.hostname==='auth.asgracing.ru'&&u.pathname.includes('/v1/clubs-teams/commands/'))return r.fulfill({contentType:'application/json',body:JSON.stringify({command_id:'fixture-command',status:'applied'})});
  return fixture(r,[],{signed:mode!=='guest',admin:mode==='admin'});
 });
 await page.goto(base+`/v2/${language}/account/`,{waitUntil:'networkidle'});
 await page.locator('#account-content').waitFor();await page.waitForTimeout(250);
 const consent=page.locator('.asg-legal-banner-btn-secondary');if(await consent.isVisible())await consent.click();
 return {page,errors,writes,setFail:()=>failWrite=true};
}
try{
 for(const language of ['ru','en'])for(const width of [1920,1280,768,390,320]){
  const c=await create(language,width),{page}=c;
  await page.locator('.control-account-hero').waitFor();
  assert.equal(await page.locator('.control-summary>article').count(),4);
  assert.equal(await page.locator('.dashboard>aside:visible').count(),0);
  assert.equal(await page.locator('#account-content h1').textContent(),'Fixture Pilot [ASG]');
  assert.equal(await page.locator('[data-ct-mode="create"][data-ct-type="team"]').count(),1);
  assert.ok((await page.locator('.account-membership-link').getAttribute('href')).startsWith(`/v2/${language}/clubs/`));
  assert.ok(await page.locator('#account-content').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
  assert.match(await page.locator('head meta[name="robots"]').getAttribute('content'),/noindex/);
  await page.locator('#driver-overlay-toggle').click();await page.locator('#driver-overlay-manager').waitFor({state:'visible'});
  // Bridge refresh cannot discard an active workspace.
  await page.evaluate(async()=>{const b=await import('/v2/bridge.js?v=20261006v2k');let m;b.subscribe(v=>m=v)();b.publish({...m,auth:{...m.auth,steam:{...m.auth.steam,personaName:'Updated fixture'}}});});
  assert.equal(await page.locator('#driver-overlay-manager').isVisible(),true);
  if(language==='ru')await page.screenshot({path:out+`/account-${width}.png`});
  assert.deepEqual(c.errors,[]);reports.push({language,width,errors:c.errors});await page.close();
 }
 for(const mode of ['guest','unlinked','discord','csrf','stale','pending','member','admin','error','disabled']){
  const c=await create('ru',390,mode),{page}=c;
  if(['guest','unlinked','error','disabled'].includes(mode))assert.equal(await page.locator('[data-ct-mode]').count(),0);
  if(['discord','csrf','stale','pending'].includes(mode))assert.equal(await page.locator('[data-ct-mode="create"]').count(),0);
  if(mode==='member'){assert.equal(await page.locator('[data-ct-mode="revise"]').count(),0);await page.locator('[data-ct-leave]').click();await page.locator('[data-account-cancel]').click();assert.equal(c.writes.length,0);}
  if(mode==='admin')assert.equal(await page.locator('#account-content .control-links a').count(),2);
  else assert.equal(await page.locator('#account-content .control-links a').count(),0);
  assert.deepEqual(c.errors,[]);reports.push({mode,errors:c.errors});await page.close();
 }
 const c=await create(),{page}=c;
 await page.locator('[data-ct-mode="create"][data-ct-type="team"]').click();
 await page.locator('#account-entity-form [name="displayName"]').fill('Fixture Team');
 await page.locator('#account-entity-form [type="submit"]').click();await page.locator('.control-account-hero').waitFor();
 assert.equal(c.writes.length,1);assert.equal(c.writes[0].headers['x-csrf-token'],'fixture-csrf');
 assert.equal(c.writes[0].body.command_type,'team.create');
 c.setFail();await page.locator('[data-ct-mode="create"][data-ct-type="team"]').click();await page.locator('#account-entity-form [name="displayName"]').fill('Denied Team');await page.locator('#account-entity-form [type="submit"]').click();await page.waitForTimeout(200);
 assert.equal(await page.locator('.account-command-reauth').isVisible(),true);assert.equal(await page.locator('#account-entity-form [type="submit"]').isDisabled(),false);
 assert.deepEqual(c.errors,[]);await page.close();
 const legacy=await create();await legacy.page.goto(base+'/account/?lang=ru',{waitUntil:'networkidle'});await legacy.page.locator('.account-title').waitFor();assert.equal(await legacy.page.locator('.control-account-hero').count(),0);assert.equal(await legacy.page.locator('.account-title').textContent(),'Fixture Pilot [ASG]');assert.equal(await legacy.page.locator('[data-ct-mode="create"][data-ct-type="team"]').count(),1);assert.deepEqual(legacy.errors,[]);await legacy.page.close();
 await fs.writeFile(out+'/report.json',JSON.stringify(reports,null,2));console.log(`Account checks passed: ${reports.length} layout/access scenarios, intercepted create/failure, confirmation cancel and active-workspace refresh.`);
}finally{await browser.close()}

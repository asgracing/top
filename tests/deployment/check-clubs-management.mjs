// Runs against the isolated local site. Every external request is intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,site as publishedFixture} from './v2-browser-fixtures.mjs';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';

const out=taskScratchPath('clubs-browser');await fs.mkdir(out,{recursive:true});
const site=path.resolve(process.env.ASG_DIST_OUTPUT_DIR||'dist');
const driver='drv_fixture';
const fields={display_name:'Apex Racing Club',short_name:'APX',description_ru:'Клуб для совместных тренировок и командных гонок.',description_en:'A club for training and team races.',website_url:'https://example.test'};
const club={entity_type:'club',public_id:'clb_fixture',slug:'apex-racing',display_name:fields.display_name,status:'approved',row_version:3,profile:fields,club_public_id:null,active_members:2,pending_revision:false,pending_logo:false,revision:null,logo:null,members:[{public_id:driver,display_name:'Fixture Captain',role:'head',valid_from:'2026-11-01T12:00:00Z'},{public_id:'drv_member',display_name:'Another Driver',role:'member',valid_from:'2026-11-02T12:00:00Z'}],requests:[],audit:[{action:'club.create',occurred_at:'2026-11-01T12:00:00Z',actor_public_id:driver,actor_type:'admin'}]};
const team={...club,entity_type:'team',public_id:'tm_fixture',slug:'apex-team',display_name:'Apex Team',profile:{...fields,display_name:'Apex Team'},club_public_id:club.public_id,members:club.members.map((member,index)=>({...member,role:index?'member':'captain'}))};
function auth(admin=true,empty=false){return {authenticated:true,linked:true,driver:{public_id:driver,display_name:'Fixture Captain',profile_url:'/driver/?id='+driver},steam:{persona_name:'Fixture Captain'},csrf_token:'fixture-csrf',discord:{linked:true},permissions:{portal_manage:admin},preferences:{},clubs_teams:{enabled:true,pending_commands:0,pending_assets:0,notifications:[],asset_notifications:[],pending_invites:[],applied_state:{public_id:driver,club:empty?null:{id:'private_club',public_id:club.public_id,slug:club.slug,display_name:club.display_name,status:'approved',row_version:3,role:'head',pending_revision:false,editable_fields:fields,revision_rejection_reason:null},team:null},snapshot:{available:true,stale:false,revision:1,generated_at:'2026-11-03T00:00:00Z',received_at:'2026-11-03T00:00:01Z'}}};}
const reports=[];
async function create({language='ru',width=1440,screen='portal-ops',admin=true,empty=false}={}){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[],writes=[];let entities=structuredClone([club,team]),latest=null,stale=false,available=true,fail=false,hold=false;
 await page.addInitScript(()=>{const original=window.setTimeout;window.setTimeout=(callback,delay,...args)=>original(callback,delay===1500?15:delay,...args);});
 page.on('pageerror',error=>{errors.push(error.message);console.log(error.stack);});
 await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   const respond=(payload,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(payload)});
   if(url.origin===base){
     const relative=decodeURIComponent(url.pathname).replace(/^\/+/,''),file=path.resolve(site,relative.endsWith('/')||!relative?relative+'index.html':relative);
     assert.ok(file.startsWith(site+path.sep));
     const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream';
     try{return route.fulfill({contentType:type,body:await fs.readFile(file)});}catch{return route.fulfill({status:404,body:''});}
   }
   if(url.hostname==='auth.asgracing.ru'){
     if(req.method()!=='GET'){
       if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':base,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type,X-CSRF-Token','Access-Control-Allow-Methods':'GET,POST'}});
       const body=req.headers()['content-type']?.startsWith('image/')?null:req.postDataJSON();writes.push({path:url.pathname,body,headers:req.headers()});
       if(fail)return respond({detail:'version_conflict'},409);
       if(body?.command_type==='portal.entity.create'){
         latest={...structuredClone(club),public_id:'clb_created',display_name:body.payload.fields.display_name,profile:body.payload.fields,members:[{public_id:body.payload.leader_public_id,display_name:'Selected Leader',role:'head'}],active_members:1};entities.push(latest);
       }else if(body?.command_type==='portal.entity.update'){
         latest={...entities.find(entity=>entity.public_id===body.payload.entity_public_id),profile:body.payload.fields,display_name:body.payload.fields.display_name,row_version:4};entities=entities.map(entity=>entity.public_id===latest.public_id?latest:entity);
       }else latest=entities.find(entity=>entity.public_id===body?.payload?.entity_public_id)||entities[0];
       if(url.pathname.includes('/assets/'))return respond({asset:{asset_id:'cta_fixture',status:'pending'}});
       return respond({command:{command_id:'pcc_fixture',status:'pending'}});
     }
     if(url.pathname==='/v1/me')return respond(auth(admin,empty));
     if(url.pathname==='/v1/portal-ops/clubs-teams')return respond({available,stale,entities,total:entities.length,revision:3,generated_at:'2026-11-03T00:00:00Z'});
     if(url.pathname.includes('/portal-ops/clubs-teams/commands/'))return respond(hold?{command:{status:'pending'}}:{command:{status:'applied',receipt:{result:{entity_snapshot:latest}}}});
     if(url.pathname.includes('/clubs-teams/assets/'))return respond({asset:{status:'applied',receipt:{result:{entity_version:4}}}});
     if(url.pathname==='/v1/portal-ops/hourly/events')return respond({available:true,tracks:[],events:[],schedule_revision:'a'.repeat(64)});
     return respond({});
   }
   if(url.hostname==='data.asgracing.ru'&&url.pathname.endsWith('/drivers/drivers.json'))return respond({},410);
   if(url.hostname==='data.asgracing.ru'&&url.pathname.endsWith('/drivers/search.json'))return respond({schema_version:1,total_items:1,items:[{public_id:'drv_selected',driver:'Selected Leader',is_banned:false}]});
   if(url.hostname==='data.asgracing.ru'&&url.pathname.endsWith('/details/clubs/apex-racing.json'))return respond({
     ...publishedFixture.entity_details['clubs/asg-racing'],public_id:club.public_id,slug:club.slug,asset:null});
   return fixture(route,[],{});
 });
 await page.goto(`${base}/${language==='en'?'en/':''}${screen}/`,{waitUntil:'networkidle'});
 const cookies=page.getByRole('button',{name:/Только необходимые|Only necessary/});if(await cookies.count()&&await cookies.isVisible())await cookies.click();
 if(screen==='portal-ops'&&admin)await page.locator('[data-panel="clubs"]').click();
 const shot=async name=>page.screenshot({path:path.join(out,`${name}-${language}-${width}.png`),fullPage:true});
 return {page,errors,writes,shot,setStale:value=>stale=value,setAvailable:value=>available=value,setFail:value=>fail=value,setHold:value=>hold=value};
}
try{
 for(const language of ['ru','en'])for(const width of [1440,768,390]){
   const ctx=await create({language,width}),{page}=ctx;
   await page.locator('[data-entity="clb_fixture"]').click();
   await page.locator('[data-editor] [name=displayName]').waitFor();
   assert.equal(await page.locator('[data-editor] [name=displayName]').inputValue(),fields.display_name);
   assert.ok(await page.locator('[data-summary]').textContent());
   await ctx.shot('admin-profile');
   for(const tab of ['roster','logo','moderation','settings','history']){await page.locator(`[data-clubs-tab="${tab}"]`).click();assert.equal(await page.locator(`[data-clubs-tab="${tab}"]`).getAttribute('aria-current'),'page');}
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(ctx.errors,[]);
   reports.push({language,width,screen:'admin',errors:ctx.errors});await page.close();
 }
 const ctx=await create(),{page}=ctx;
 await page.locator('[data-create=club]').click();
 await page.locator('[data-profile-form] [name=displayName]').fill('New Fixture Club');
 await page.locator('[data-pilot-search]').fill('Selected');
 await page.locator('[data-pilot="drv_selected"]').click();
 await page.locator('[data-reason]').fill('Create selected leader fixture');
 await ctx.shot('admin-create');
 await page.locator('[data-profile-form] [type=submit]').click();
 await page.locator('[data-control-confirm]').click();
 await page.waitForFunction(()=>document.querySelector('[data-feedback]')?.dataset.kind==='success' && document.querySelector('[data-feedback]')?.closest('[aria-busy]')?.getAttribute('aria-busy')==='false');
 assert.equal(ctx.writes[0].body.payload.leader_public_id,'drv_selected');assert.equal(ctx.writes[0].body.expected_entity_version,0);
 assert.equal(ctx.writes[0].headers['x-csrf-token'],'fixture-csrf');
 await page.locator('[data-editor] [name=displayName]').fill('Edited Fixture Club');
 await page.locator('[data-reason]').fill('Update fixture profile');await page.locator('[data-profile-form] [type=submit]').click();await page.locator('[data-control-confirm]').click();
 await page.waitForFunction(()=>document.querySelector('[data-editor] h3')?.textContent==='Edited Fixture Club');
 await page.locator('[data-entity="clb_fixture"]').click();
 await page.locator('[data-clubs-tab=roster]').click();
 await page.locator('[data-reason]').fill('Transfer fixture leadership');
 await page.locator('[data-action="portal.leadership.transfer"]').click();await page.locator('[data-control-confirm]').click();
 await page.waitForFunction(()=>document.querySelector('[data-feedback]')?.dataset.kind==='success' && document.querySelector('[data-feedback]')?.closest('[aria-busy]')?.getAttribute('aria-busy')==='false');
 assert.equal(ctx.writes.at(-1).body.command_type,'portal.leadership.transfer');
 await page.locator('[data-clubs-tab=logo]').click();
 assert.equal(await page.locator('[data-action=upload]').isDisabled(),true);
 await page.locator('[data-logo-file]').setInputFiles({name:'fixture-logo.png',mimeType:'image/png',buffer:await fs.readFile(path.join(site,'favicon-32x32.png'))});
 await page.locator('[data-logo-preview]:not([hidden])').waitFor();
 await page.locator('[data-action=upload]').click();await page.locator('[data-control-confirm]').click();
 await page.waitForFunction(()=>document.querySelector('[data-feedback]')?.dataset.kind==='success' && document.querySelector('[data-feedback]')?.closest('[aria-busy]')?.getAttribute('aria-busy')==='false');
 assert.match(ctx.writes.at(-1).path,/\/portal-ops\/clubs-teams\/assets\//);
 await page.locator('[data-entity="clb_fixture"]').click();
 ctx.setStale(true);await page.locator('[data-refresh]').click();await page.waitForFunction(()=>document.querySelector('[data-create=club]')?.disabled);
 assert.equal(await page.locator('[data-editor] [type=submit]').isDisabled(),true);
 assert.deepEqual(ctx.errors,[]);await page.close();
 const waiting=await create();waiting.setHold(true);
 await waiting.page.locator('[data-entity="clb_fixture"]').click();
 await waiting.page.locator('[data-reason]').fill('Persist queued fixture operation');
 await waiting.page.locator('[data-profile-form] [type=submit]').click();await waiting.page.locator('[data-control-confirm]').click();
 await waiting.page.waitForFunction(()=>!document.querySelector('[data-pending]').hidden&&!document.querySelector('[data-resume]').disabled);
 assert.equal(await waiting.page.locator('[data-create=club]').isDisabled(),true);
 await waiting.page.reload({waitUntil:'networkidle'});await waiting.page.locator('[data-panel=clubs]').click();
 assert.equal(await waiting.page.locator('[data-create=club]').isDisabled(),true);
 waiting.setHold(false);await waiting.page.locator('[data-resume]').click();
 await waiting.page.waitForFunction(()=>document.querySelector('[data-feedback]')?.dataset.kind==='success' && document.querySelector('[data-feedback]')?.closest('[aria-busy]')?.getAttribute('aria-busy')==='false');
 assert.equal(waiting.writes.length,1);assert.equal(await waiting.page.locator('[data-pending]').isVisible(),false);
 waiting.setFail(true);await waiting.page.locator('[data-reason]').fill('Check explicit version conflict');await waiting.page.locator('[data-profile-form] [type=submit]').click();await waiting.page.locator('[data-control-confirm]').click();
 await waiting.page.waitForFunction(()=>document.querySelector('[data-feedback]')?.dataset.kind==='error');
 assert.match(await waiting.page.locator('[data-feedback]').textContent(),/Данные изменились/);assert.deepEqual(waiting.errors,[]);await waiting.page.close();
 for(const language of ['ru','en'])for(const width of [1440,390]){
   const ctx=await create({screen:'account',admin:false,empty:true,language,width}),{page}=ctx;
   await page.locator('[data-ct-mode=create][data-ct-type=club]').click();
   await page.locator('#account-entity-form [name=displayName]').fill('My Racing Community');
   await page.locator('#account-entity-form [name=shortName]').fill('MRC');
   await page.locator('#account-entity-form [name=descriptionRu]').fill('Описание сообщества для проверки предпросмотра.');
   assert.equal(await page.locator('[data-community-preview-name]').textContent(),'My Racing Community');
   if(width<760){assert.equal(await page.locator('.account-community-preview').getAttribute('open'),null);await page.locator('.account-community-preview summary').click();assert.equal(await page.locator('[data-community-preview-name]').isVisible(),true);await page.locator('.account-community-preview summary').click();}
   await ctx.shot('user-create');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(ctx.errors,[]);
   reports.push({language,width,screen:'account',errors:ctx.errors});await page.close();
 }
 for(const language of ['ru','en']){
   const ctx=await create({screen:'account',admin:false,language}),{page}=ctx;
   await page.locator('[data-ct-manage-members="club"]').click();
   await page.locator('[data-ct-pilot-search]').fill('Selected');
   await page.getByText('Selected Leader',{exact:true}).waitFor();
   assert.deepEqual(ctx.errors,[]);assert.equal(ctx.writes.length,0);
   await page.close();
 }
 const denied=await create({admin:false});assert.equal(await denied.page.locator('[data-create]').count(),2);assert.equal(await denied.page.locator('#portal-ops-workspace').isVisible(),false);assert.equal(denied.writes.length,0);await denied.page.close();
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({reports,mutations:ctx.writes.length},null,2));
 console.log(`Clubs management: ${reports.length} RU/EN desktop/mobile views; create/update, leadership, logo upload, pending reload/resume, conflict, CSRF, stale data, access and preview passed.`);
}finally{await browser.close();}

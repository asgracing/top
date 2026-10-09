import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'../..');
const out=path.resolve(process.env.ASG_TEAM_CHECK_OUTPUT || path.join(root,'../_archive/tmp/2026-10-09/team-registration/browser'));
await fs.mkdir(out,{recursive:true});
process.env.TEMP=out;process.env.TMP=out;
let pw;
try{pw=await import('playwright')}catch{
 for(const entry of await fs.readdir('C:/Users/Andrew/AppData/Local/npm-cache/_npx')){
  try{pw=await import(pathToFileURL(path.join('C:/Users/Andrew/AppData/Local/npm-cache/_npx',entry,'node_modules/playwright/index.mjs')).href);break}catch{}
 }
}
assert(pw,'Playwright must be available');
const compilation=process.env.ASG_V2_OUTPUT_DIR;
const siteRoot=path.resolve(process.env.ASG_TEAM_SITE_ROOT||root);
const server=http.createServer(async(request,response)=>{
 const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
 const owner=compilation&&pathname.startsWith('/v2/')?path.resolve(compilation):siteRoot;
 const file=path.resolve(owner,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(owner+path.sep)){response.writeHead(403).end();return}
 response.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'}[path.extname(file)])||'application/octet-stream');
 try{const bytes=await fs.readFile(file);response.end(bytes)}catch{
  if(owner!==root){try{response.end(await fs.readFile(path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''))));return}catch{}}
  response.writeHead(404).end();
 }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await pw.chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const members=[{public_id:'drv_a',display_name:'Pilot A',race_number:11,eligible:true},{public_id:'drv_b',display_name:'Pilot B',race_number:22,eligible:true},{public_id:'drv_c',display_name:'Pilot C with a very long name for mobile wrapping',race_number:33,eligible:true},{public_id:'drv_d',display_name:'Ineligible driver',race_number:null,eligible:false}];
const day=new Date(Date.now()+86400000).toISOString().slice(0,10);
const event={event_id:'fixture-event',occurrence_id:'fixture',title:'Spa team race',date:day,start_time_local:'20:00',timezone:'UTC+3',launch_at:day+'T16:00:00Z',closes_at:day+'T15:00:00Z',participation_mode:'team',race_format:'endurance',competition_mode:'standalone',track_code:'spa',track_name:'Spa',max_drivers:2,max_cars:24,max_connections:48,allowed_car_models:[30,32],registration_closed:false,voting_disabled:true,registrations:[],server:{name:'ASG Fixture',password:'fixture',car_group:'GT3',safety_rating_requirement:50},session:{practice_duration_minutes:60,qualifying_duration_minutes:20,race_duration_minutes:60},rules:{max_drivers_count:2}};
const teams=[{team_id:'tm_a',team_name:'Fixture Team A',members,club_id:null},{team_id:'tm_b',team_name:'Fixture Team B with a very long name',members:[members[0],members[2]],club_id:null}];
let actor='drv_a',registrations=[],stale=false,noTeams=false,stateFailure=false,lostResponse=false,pollFailure=false,hold=false,postError=null;
let publicFixture;
const mutations=[],keys=new Map(),commands=new Map();
async function pageFixture(width,lang){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',error=>errors.push(error.stack || error.message));
 await page.route('**/*',async route=>{
  const request=route.request();let url=new URL(request.url());
  if(url.origin===origin&&url.pathname.startsWith('/__asg_public__/'))url=new URL('https://data.asgracing.ru'+url.pathname.slice('/__asg_public__'.length)+url.search);
  if(url.origin===origin)return route.continue();
  if(request.resourceType()==='script')return route.fulfill({body:'',contentType:'text/javascript'});
  const item={...event,registrations};
  if(url.pathname==='/v1/me')return route.fulfill({json:actor?{authenticated:true,driver:members.find(m=>m.public_id===actor),csrf_token:'fixture-csrf'}:{authenticated:false}});
  if(url.pathname==='/v1/team-racing/events'){
   if(stateFailure)return route.fulfill({status:503,json:{detail:'team_racing_unavailable'}});
   return route.fulfill({json:{events:[item],teams:actor&&!noTeams?teams.filter(t=>t.members.some(m=>m.public_id===actor)):[],stale}});
  }
  if(url.pathname==='/v1/team-racing/commands'&&request.method()==='POST'){
   const body=request.postDataJSON();assert.equal(request.headers()['x-csrf-token'],'fixture-csrf');
   if(postError)return route.fulfill({status:409,json:{detail:postError}});
   let commandId=keys.get(body.idempotency_key);
   if(!commandId){
    commandId='fixture-command-'+(mutations.length+1);keys.set(body.idempotency_key,commandId);mutations.push(body);
    const team=teams.find(t=>t.team_id===body.payload.team_id),previous=registrations.find(r=>r.team_id===team.team_id);
    if(body.action==='register'||body.action==='update'){
     assert.equal(body.expected_version,previous?.version??null);
     const row={...body.payload,team_name:team.team_name,registered_by_public_id:previous?.registered_by_public_id||actor,race_number:members.find(m=>m.public_id===body.payload.captain_public_id).race_number,version:(previous?.version||0)+1,roster:body.payload.roster.map(public_id=>({...members.find(m=>m.public_id===public_id),confirmed:public_id===actor}))};
     row.status=row.roster.every(p=>p.confirmed)?'confirmed':'pending';registrations=registrations.filter(r=>r.team_id!==team.team_id).concat(row);
    }else if(body.action==='confirm'){assert.equal(body.expected_version,previous.version);previous.roster.find(p=>p.public_id===actor).confirmed=true;previous.status=previous.roster.every(p=>p.confirmed)?'confirmed':'pending';previous.version++;}
    else if(body.action==='withdraw'){assert.equal(body.expected_version,previous.version);registrations=registrations.filter(r=>r.team_id!==team.team_id);}
    commands.set(commandId,{status:'applied'});
   }
   if(lostResponse){lostResponse=false;return route.abort('failed')}
   return route.fulfill({status:202,json:{command:{command_id:commandId,status:'pending'}}});
  }
  if(url.pathname.startsWith('/v1/team-racing/commands/')){
   if(pollFailure)return route.abort('failed');
   return route.fulfill({json:{command:hold?{status:'pending'}:commands.get(url.pathname.split('/').pop())}});
  }
  if(url.pathname.endsWith('/announcement.json'))return route.fulfill({json:item});
  if(url.pathname.endsWith('/schedule.json'))return route.fulfill({json:{items:[item]}});
  if(url.pathname.endsWith('/races/races.json'))return route.fulfill({json:{items:[]}});
  if(url.hostname==='auth.asgracing.ru')return route.fulfill({json:{authenticated:false}});
  if(url.pathname.startsWith('/hourly-votes-api/')&&request.method()!=='GET'&&!url.pathname.endsWith('/voter-token'))throw Error('Team entry must not use solo voting: '+url.pathname);
  if(publicFixture)return publicFixture(route,[]);
  return route.fulfill({json:{items:[],servers:{}}});
 });
 return {page,errors};
}
const url=lang=>origin+'/hourly/team/?event=fixture&lang='+lang;
async function accepted(page){await page.waitForFunction(()=>document.getElementById('status').dataset.tone==='success')}
try{
 const {page,errors}=await pageFixture(1440,'ru');
 await page.goto(url('ru'));await page.locator('#registration-car').selectOption('30');
 await page.locator('input[value=drv_b]').check();await page.locator('#registration-captain').selectOption('drv_b');
 assert.match(await page.locator('#entry').innerText(),/#22/);
 assert.equal(await page.locator('input[value=drv_c]').isDisabled(),true);
 await page.locator('#refresh').click();assert.equal(await page.locator('#registration-captain').inputValue(),'drv_b');
 await page.getByRole('button',{name:'Зарегистрировать команду',exact:true}).click();await accepted(page);
 assert.equal(registrations[0].captain_public_id,'drv_b');assert.equal(registrations[0].roster[1].confirmed,false);
 assert.equal(await page.getByRole('button',{name:'Сохранить изменения',exact:true}).isDisabled(),true);
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__crewLink=text}}}));
 await page.getByRole('button',{name:'Скопировать ссылку для экипажа',exact:true}).click();
 assert.equal(new URL(await page.evaluate(()=>window.__crewLink)).searchParams.get('event'),'fixture');
 actor='drv_b';await page.locator('#refresh').click();
 await page.getByRole('button',{name:'Подтвердить участие',exact:true}).click();await accepted(page);
 assert.equal(registrations[0].status,'confirmed');assert.equal(mutations.length,2);
 assert.equal(await page.getByRole('button',{name:'Отозвать заявку',exact:true}).count(),0);
 actor='drv_a';await page.locator('#refresh').click();await page.locator('#registration-car').selectOption('32');
 await page.getByRole('button',{name:'Сохранить изменения',exact:true}).click();await accepted(page);
 assert.equal(registrations[0].roster[1].confirmed,false,'changing car requires renewed consent');
 await page.getByRole('button',{name:'Отозвать заявку',exact:true}).click();
 assert.equal(mutations.length,3);await page.getByRole('button',{name:'Оставить заявку',exact:true}).click();assert.equal(mutations.length,3);
 await page.getByRole('button',{name:'Отозвать заявку',exact:true}).click();await page.getByRole('button',{name:'Да, отозвать',exact:true}).click();await accepted(page);assert.equal(registrations.length,0);
 await page.locator('#registration-team').selectOption('tm_b');await page.locator('#registration-car').selectOption('32');
 await page.locator('#refresh').click();assert.equal(await page.locator('#registration-team').inputValue(),'tm_b');assert.equal(await page.locator('#registration-car').inputValue(),'32');
 lostResponse=true;await page.getByRole('button',{name:'Зарегистрировать команду',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Не удалось проверить ответ'));
 const before=mutations.length;assert.equal(await page.locator('#entry button[type=submit]').isDisabled(),true);
 await page.reload();await accepted(page);assert.equal(mutations.length,before,'lost response reuses idempotency after reload');
 pollFailure=true;await page.locator('#registration-car').selectOption('30');await page.getByRole('button',{name:'Сохранить изменения',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Не удалось проверить ответ'));
 assert.equal(await page.getByRole('button',{name:'Отозвать заявку',exact:true}).isDisabled(),true);
 pollFailure=false;await page.locator('#refresh').click();await accepted(page);
 const version=registrations[0].version;registrations[0].version++;
 await page.locator('#registration-car').selectOption('32');postError='version_conflict';
 await page.getByRole('button',{name:'Сохранить изменения',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Заявка уже изменилась'));
 postError=null;await page.locator('#refresh').click();assert.equal(registrations[0].version,version+1);
 await page.locator('#registration-car').selectOption('32');assert.equal(await page.getByRole('button',{name:'Сохранить изменения',exact:true}).isEnabled(),true);
 stateFailure=true;await page.locator('#refresh').click();await page.waitForFunction(()=>document.getElementById('status').dataset.tone==='error');
 assert.equal(await page.getByRole('button',{name:'Сохранить изменения',exact:true}).isDisabled(),true);
 stateFailure=false;await page.locator('#refresh').click();
 assert.deepEqual(errors,[]);await page.close();
 const slow=await pageFixture(1440,'ru');
 await slow.page.addInitScript(()=>{const timeout=window.setTimeout.bind(window);window.setTimeout=(fn,delay,...args)=>timeout(fn,delay===2000?1:delay,...args)});
 await slow.page.goto(url('ru'));await slow.page.locator('#registration-car').selectOption('32');hold=true;
 await slow.page.getByRole('button',{name:'Сохранить изменения',exact:true}).click();
 await slow.page.waitForFunction(()=>document.getElementById('status').textContent.includes('Заявка ещё обрабатывается'));
 const waitingCount=mutations.length;assert.equal(await slow.page.locator('#entry button[type=submit]').isDisabled(),true);
 hold=false;await slow.page.locator('#refresh').click();await accepted(slow.page);assert.equal(mutations.length,waitingCount,'timeout keeps command identity');
 assert.deepEqual(slow.errors,[]);await slow.page.close();
 for(const width of [1440,768,390,320])for(const lang of ['ru','en']){
  const {page,errors}=await pageFixture(width,lang);await page.goto(url(lang));await page.waitForSelector('.registration');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'entry fits '+width+' '+lang);
  assert.equal(await page.locator('#schedule-link').getAttribute('href'),lang==='en'?'/en/hourly/':'/hourly/');
  await page.screenshot({path:path.join(out,'entry-'+width+'-'+lang+'.png'),fullPage:true});
  event.registration_closed=true;await page.locator('#refresh').click();await page.waitForFunction(()=>document.getElementById('registration-state').textContent.match(/CLOSED|ЗАКРЫТО/));
  assert.equal(await page.locator('#entry form button:enabled,#entry .registration button:enabled,#registrations button:enabled').count(),0);event.registration_closed=false;
  stale=true;await page.locator('#refresh').click();assert.equal(await page.locator('#availability').isVisible(),true);assert.equal(await page.locator('#entry form button:enabled').count(),0);stale=false;
  assert.deepEqual(errors,[]);await page.close();
 }
 registrations=[];
 for(const scenario of ['guest','no-team','number','closed','stale','waiting','confirmed','new']){
  const {page,errors}=await pageFixture(390,'ru');
  await page.goto(origin+'/design-research/team-registration-20261009/frame.html?event=fixture&lang=ru&scenario='+scenario);
  await page.waitForFunction(()=>document.getElementById('registration-state')?.textContent);
  // The design fixture supplies data through fetch before the app boots.
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(scenario==='waiting')assert.equal(await page.getByRole('button',{name:'Подтвердить участие',exact:true}).count(),1);
  if(scenario==='number'){
   await page.locator('#registration-car').selectOption('30');assert.match(await page.locator('#entry-validation').innerText(),/номер от 1 до 998/);
   assert.equal(await page.getByRole('button',{name:'Зарегистрировать команду',exact:true}).isDisabled(),true);
  }
  await page.screenshot({path:path.join(out,'mock-'+scenario+'-390.png'),fullPage:true});assert.deepEqual(errors,[]);await page.close();
 }
 const prototype=await pageFixture(1440,'ru');await prototype.page.goto(origin+'/design-research/team-registration-20261009/');
 await prototype.page.frameLocator('#preview').locator('#registration-car').waitFor();
 await prototype.page.locator('#scenario').selectOption('waiting');await prototype.page.frameLocator('#preview').getByRole('button',{name:'Подтвердить участие',exact:true}).waitFor();
 await prototype.page.locator('#lang').selectOption('en');await prototype.page.frameLocator('#preview').getByRole('button',{name:'Confirm participation',exact:true}).waitFor();
 await prototype.page.locator('#width').selectOption('390px');await prototype.page.frameLocator('#preview').getByRole('button',{name:'Confirm participation',exact:true}).waitFor();
 assert.equal(await prototype.page.locator('#preview').evaluate(node=>node.clientWidth),388);
 assert.deepEqual(prototype.errors,[]);await prototype.page.close();
 // Exercise the actual V2 entry points with a distinct occurrence ID. These
 // reads/writes are intercepted just like the native registration workflow.
 process.env.ASG_V2_PREVIEW=origin;
 const support=await import('../deployment/v2-browser-fixtures.mjs');
 publicFixture=support.fixture;await support.browser.close();
 for(const lang of ['ru','en'])for(const width of [1440,390]){
  const {page,errors}=await pageFixture(width,lang);
  const expected='/hourly/team/?event=fixture&lang='+lang;
  const prefix=process.env.ASG_TEAM_SITE_ROOT?(lang==='en'?'/en/':'/'):'/v2/'+lang+'/';
  await page.goto(origin+prefix+'hourly/');
  await page.locator('.hero-event a[href*="/hourly/team/"]').waitFor();
  assert.equal(await page.locator('.hero-event a[href*="/hourly/team/"]').getAttribute('href'),expected);
  assert.equal(await page.locator('.hero-event [data-page-join]').count(),0);
  assert.match(await page.locator('.hero-event .page-participants').innerText(),/Командная гонка|Team race/);
  await page.locator('.hero-event [data-page-event]').click();
  await page.locator('#v2-modal a[href*="/hourly/team/"]').waitFor();
  assert.equal(await page.locator('#v2-modal a[href*="/hourly/team/"]').getAttribute('href'),expected);
  assert.equal(await page.locator('#v2-modal [data-page-join]').count(),0);
  await page.keyboard.press('Escape');
  await page.locator('.calendar-entry[data-page-event="fixture-event"]').click();
  await page.locator('#v2-modal a[href*="/hourly/team/"]').waitFor();
  assert.equal(await page.locator('#v2-modal a[href*="/hourly/team/"]').getAttribute('href'),expected);
  await page.locator('#v2-modal a[href*="/hourly/team/"]').click();await page.waitForURL('**/hourly/team/**');
  assert.equal(new URL(page.url()).searchParams.get('event'),'fixture');assert.equal(new URL(page.url()).searchParams.get('lang'),lang);
  await page.goto(origin+prefix);
  await page.locator('#v2-race-vote').waitFor();await page.waitForFunction(()=>!document.getElementById('v2-site-shell').inert);
  await page.locator('#v2-race-vote').click();await page.waitForURL('**/hourly/team/**');
  assert.equal(new URL(page.url()).searchParams.get('event'),'fixture');assert.equal(new URL(page.url()).searchParams.get('lang'),lang);
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Team registration: create, captain, confirmation, update consent, withdraw confirmation, drafts, conflicts, uncertain requests/reload, stale/closed and RU/EN at 1440/768/390/320 passed.');
 console.log('Screenshots: '+out);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}

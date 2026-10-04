import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'../..'),out=path.resolve(root,'../tmp/team-racing-ui-20261004');
await fs.mkdir(out,{recursive:true});
let pw;
try{pw=await import('playwright')}catch{
 for(const entry of await fs.readdir('C:/Users/Andrew/AppData/Local/npm-cache/_npx')){
  try{pw=await import(pathToFileURL(path.join('C:/Users/Andrew/AppData/Local/npm-cache/_npx',entry,'node_modules/playwright/index.mjs')).href);break}catch{}
 }
}
assert(pw,'Playwright must be available');
const server=http.createServer(async(request,response)=>{
 const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname),file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return}
 try{const bytes=await fs.readFile(file);response.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[path.extname(file)])||'application/octet-stream');response.end(bytes)}catch{response.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await pw.chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const members=[{public_id:'drv_a',display_name:'Pilot A',race_number:11,eligible:true},{public_id:'drv_b',display_name:'Pilot B',race_number:22,eligible:true}];
const event={event_id:'fixture',occurrence_id:'fixture',date:'2099-10-10',start_time_local:'20:00',timezone:'UTC+3',launch_at:'2099-10-10T16:00:00Z',closes_at:'2099-10-10T15:00:00Z',registration_closes_at:'2099-10-10T15:00:00Z',participation_mode:'team',race_format:'endurance',competition_mode:'standalone',track_code:'spa',track_name:'Spa',max_drivers:4,allowed_car_models:[30,32],registration_closed:false,voting_disabled:true,registrations:[]};
const team={team_id:'tm_a',team_name:'Fixture Team A',members,club_id:null};
let actor='drv_a',registration=null,mutations=0;
async function pageFixture(width,lang){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.stack || error.message));
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin===origin)return route.continue();
  if(request.resourceType()==='script')return route.fulfill({body:'',contentType:'text/javascript'});
  const registrations=registration?[registration]:[];
  const item={...event,registrations};
  if(url.pathname==='/v1/me')return route.fulfill({json:{authenticated:true,driver:members.find(member=>member.public_id===actor),csrf_token:'fixture-csrf'}});
  if(url.pathname==='/v1/team-racing/events')return route.fulfill({json:{events:[item],teams:[team],stale:false}});
  if(url.pathname==='/v1/team-racing/commands' && request.method()==='POST'){
   const body=request.postDataJSON();assert.equal(request.headers()['x-csrf-token'],'fixture-csrf');mutations++;
   if(body.action==='register'||body.action==='update')registration={...body.payload,team_name:team.team_name,registered_by_public_id:actor,race_number:members.find(m=>m.public_id===body.payload.captain_public_id).race_number,version:(registration?.version||0)+1,status:'pending',roster:body.payload.roster.map(public_id=>({...members.find(m=>m.public_id===public_id),confirmed:public_id===actor}))};
   else if(body.action==='confirm'){registration.roster.find(p=>p.public_id===actor).confirmed=true;registration.status='confirmed';registration.version++}
   else if(body.action==='withdraw')registration=null;
   return route.fulfill({status:202,json:{command:{command_id:'fixture-command',status:'pending'}}});
  }
  if(url.pathname.startsWith('/v1/team-racing/commands/'))return route.fulfill({json:{command:{status:'applied'}}});
  if(url.pathname.endsWith('/announcement.json'))return route.fulfill({json:{...item,title:'Spa team race',server:{name:'ASG Fixture',password:'fixture',car_group:'GT3'},session:{practice_duration_minutes:60,qualifying_duration_minutes:20,race_duration_minutes:120},rules:{max_drivers_count:4}}});
  if(url.pathname.endsWith('/schedule.json'))return route.fulfill({json:{items:[item]}});
  return route.fulfill({json:{items:[]}});
 });
 await page.addInitScript(lang=>{localStorage.setItem('asgLocale',lang);localStorage.setItem('asgLang',lang)},lang);
 return {page,errors};
}
try{
 const {page,errors}=await pageFixture(1440,'ru');
 await page.goto(`${origin}/hourly/team/?event=fixture&lang=ru`);
 await page.locator('#registration-car').selectOption('30');await page.locator('input[value=drv_b]').check();await page.locator('#registration-captain').selectOption('drv_b');
 assert.match(await page.locator('#entry').innerText(),/#22/);
 await page.getByRole('button',{name:'Зарегистрировать команду',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('status').textContent==='Изменение принято.');
 assert.equal(registration.captain_public_id,'drv_b');assert.equal(registration.roster[1].confirmed,false);
 actor='drv_b';await page.locator('#refresh').click();
 await page.getByRole('button',{name:'Подтвердить участие',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('registrations').textContent.includes('Состав подтверждён'));
 assert.equal(registration.status,'confirmed');assert.equal(mutations,2);assert.deepEqual(errors,[]);
 await page.close();
 for(const width of [1440,360])for(const lang of ['ru','en']){
  const {page,errors}=await pageFixture(width,lang);
  await page.goto(`${origin}/hourly/team/?event=fixture&lang=${lang}`);await page.waitForSelector('.registration');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`entry overflow ${width} ${lang}`);
  await page.screenshot({path:path.join(out,`entry-${width}-${lang}.png`),fullPage:true});
  event.registration_closed=true;await page.locator('#refresh').click();await page.waitForFunction(()=>document.getElementById('deadline').textContent.match(/CLOSED|ЗАКРЫТО/));
  assert.equal(await page.locator('#registrations button:enabled').count(),0);event.registration_closed=false;
  await page.goto(`${origin}/hourly/?lang=${lang}`);await page.waitForSelector('#schedule-v2-list [data-schedule-index]');
  assert.match(await page.locator('#schedule-v2-list').innerText(),/КОМАНДНАЯ ГОНКА|TEAM RACE/);
  await page.locator('#schedule-v2-list [data-schedule-index]').first().click();
  await page.waitForSelector('#schedule-modal .event-details-v2-footer a[href*="/hourly/team/"]');
  assert.equal(await page.locator('#schedule-modal [data-vote-event-id]').count(),0);
  await page.screenshot({path:path.join(out,`event-${width}-${lang}.png`),fullPage:true});
  assert.deepEqual(errors,[]);
  await page.goto(`${origin}/${lang==='ru'?'ru/':''}`);
  await page.addStyleTag({content:'*{animation:none!important;transition:none!important}'});
  await page.waitForFunction(()=>/КОМАНДНАЯ ГОНКА|TEAM RACE/.test(document.getElementById('hourly-eyebrow')?.textContent || ''));
  await page.locator('#hourly-vote-btn').click();await page.waitForURL('**/hourly/team/**');
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Team racing UI: create, nominate captain, confirm, cutoff, RU/EN desktop/mobile and event modal passed.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}

// Real views with intercepted public data. No votes, auth changes or production writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {browser,base,fixture,root,snapshot} from './v2-browser-fixtures.mjs';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
const output=taskScratchPath('browser');await fs.mkdir(output,{recursive:true});
const compiled=process.env.ASG_V2_OUTPUT_DIR,layout=process.env.ASG_TEST_ROOT_DIR;
assert.ok(compiled&&layout,'Build V2 and a root candidate first');
const source=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/public.json'),'utf8'));
const champs=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/championships.json'),'utf8'));
const slug=Object.keys(champs.seasons)[0];
const event={...structuredClone(source.event),date:new Date(Date.now()+86400000*2).toISOString().slice(0,10),status:'scheduled',event_type:'championship',competition_mode:'championship',championship_slug:slug};
event.launch_at=event.date+'T19:50:00+03:00';event.event_id='hourly_'+event.date+'_2000';
event.server={...event.server,name:'ASG Fixture <&" Server',password:'fixture <&" password'};
const profile=structuredClone(source.driver),id=profile.public_id;
profile.race_history=Array.from({length:15},(_,i)=>({...source.driver.race_history[0],race_id:'fixture-'+i,
 finished_at:new Date(Date.UTC(2026,9,25-i,12)).toISOString(),counted_for_stats:i>=3,track:i<3?'spa':'monza',track_code:i<3?'spa':'monza',position:i+1}));
const server=http.createServer(async(req,res)=>{
 try{
  let file=decodeURIComponent(new URL(req.url,base).pathname).replace(/^\/+/, '');if(!file||file.endsWith('/'))file+='index.html';
  let data;
  for(const directory of [layout,compiled,root]){
   const full=path.resolve(directory,file);if(!full.startsWith(path.resolve(directory)+path.sep))throw Error('Invalid path');
   try{data=await fs.readFile(full);break}catch{}
  }
  if(!data)throw Error('Missing file');
  res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream'});res.end(data);
 }catch{res.writeHead(404);res.end('not found')}
});
await new Promise(resolve=>server.listen(Number(new URL(base).port),'127.0.0.1',resolve));
const reports=[];
async function open(url,language,width){
 const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],log=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(route.request().method()!=='GET'&&/\/(?:vote|unvote)$/.test(u.pathname))throw Error('Unexpected vote in read-only check');
  const payloads={
   '/hourly-data/announcement.json':event,'/hourly-data/schedule.json':{...source.schedule,items:[event]},
   '/hourly-data/races/races.json':{items:[]},'/hourly-data/championships.json':champs.index,
   [`/hourly-data/events/${slug}/index.json`]:{...champs.seasons[slug],status:'active',upcoming_races:[event]},
   [`/top-data/v2/drivers/${id}.json`]:profile
  };
  if(u.hostname==='data.asgracing.ru'&&Object.hasOwn(payloads,u.pathname))return route.fulfill({json:payloads[u.pathname]});
  return fixture(route,log);
 });
 await page.goto(base+url,{waitUntil:'domcontentloaded'});
 const banner=page.locator('.asg-legal-banner-btn-secondary');if(await banner.isVisible())await banner.click();
 return {page,errors,log};
}
try{
 for(const language of ['ru','en'])for(const width of [1440,390]){
  for(const context of ['home','home-calendar','hourly','calendar','championship']){
   console.log('Event connection',language,width,context);
   const route=context.startsWith('home')?'':context==='championship'?'hourly/championship/':'hourly/';
   const {page,errors}=await open('/v2/'+language+'/'+route,language,width);
   assert.equal(await page.locator('[data-v1-home]').isVisible(),false);
   if(context==='home')await page.waitForFunction(track=>document.querySelector('#v2-event-track')?.textContent===track,event.track_name);
   if(context==='home-calendar')await page.locator('#v2-event-calendar').click();
   const selector=context==='home'?'#v2-site-shell [data-modal="event"]':context==='home-calendar'?'#v2-modal .calendar-entry[data-page-event]':context==='calendar'?'.calendar-entry[data-page-event]':'[data-page-event]';
   await page.locator(selector).first().click();
   await page.locator('#v2-modal .event-connection').waitFor();
   assert.deepEqual(await page.locator('#v2-modal .event-connection b').allTextContents(),[event.server.name,event.server.password]);
   assert.equal(await page.locator('#v2-modal .event-connection script').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   if(context==='home')await page.screenshot({path:path.join(output,`event-${language}-${width}.png`)});
   assert.deepEqual(errors,[]);reports.push({language,width,context,passed:true});await page.close();
  }
  console.log('Profile history',language,width);
  const {page,errors}=await open('/v2/'+language+'/driver/?id='+id,language,width);
  await page.locator('#profile-show-uncounted').waitFor();
  const table=page.locator('#profile-history-content'),rows=table.locator('tbody tr[data-page-race]');
  assert.equal(await page.locator('#profile-show-uncounted').isChecked(),false);assert.equal(await rows.count(),10);
  assert.equal(await table.locator('.profile-uncounted').count(),0);
  await table.locator('[data-profile-page="1"]').click();assert.equal(await rows.count(),2);
  await page.locator('#profile-show-uncounted').check();assert.equal(await rows.count(),10);
  assert.equal(await table.locator('.profile-uncounted').count(),3);
  const heights=await rows.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
  assert.ok(heights[0]<=heights[3]+2,'Uncounted badge does not add a second row');
  assert.equal(await table.locator('td .car-cell .profile-uncounted').count(),0);
  await table.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`profile-${language}-${width}.png`)});
  await page.locator('#profile-show-uncounted').uncheck();
  await page.locator('#profile-race-search').fill('spa');assert.equal(await rows.count(),0);
  await page.locator('#profile-show-uncounted').check();assert.equal(await rows.count(),3);
  assert.equal(await page.locator('#profile-race-search').inputValue(),'spa');
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('#profile-show-uncounted').waitFor();assert.equal(await page.locator('#profile-show-uncounted').isChecked(),false);
  assert.deepEqual(errors,[]);reports.push({language,width,context:'profile',passed:true});await page.close();
 }
 for(const [from,to] of [
  ['/old/','/'],['/old/en/hourly/','/en/hourly/'],
  ['/old/en/driver/?id='+id+'#history','/en/driver/?id='+id+'#history'],
  ['/old/races/?race_id=test&tab=qualifying#result','/race/?tab=qualifying&id=test#result'],
  ['/old/news/?slug=sample','/news/article/?id=sample'],['/old/hourly/privacy/','/privacy/']
 ]){
  const {page}=await open(from,'ru',1280);await page.waitForURL(base+to);reports.push({from,to,passed:true});await page.close();
 }
 await fs.writeFile(path.join(output,'validation.json'),JSON.stringify(reports,null,2)+'\n');
 console.log(JSON.stringify({scenarios:reports.length,remote_writes:0}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}

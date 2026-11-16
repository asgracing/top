import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
const calendar=JSON.parse(await fs.readFile(root+'/tests/fixtures/v2-pages/public.json','utf8'));
const upcoming=structuredClone(calendar.event);upcoming.date=new Date(Date.now()+86400000).toISOString().slice(0,10);upcoming.event_id='hourly_'+upcoming.date+'_2000';upcoming.occurrence_id=upcoming.event_id;upcoming.launch_at=upcoming.date+'T19:00:00+03:00';upcoming.status='scheduled';
const baseline=process.env.ASG_HOME_BASELINE==='1';
const result=[];
try{
 for(const language of ['ru','en'])for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[],log=[],requests=[];
  let historyFail=false,revisionFail=false;
  page.on('pageerror',e=>errors.push(e.message));
  const history={ok:true,complete:true,updated_at:Date.now()/1000,revision:'fixture-revision',total_items:101,
   currencies:[{currency:'RUB',count:100,total:10000,average:100,largest:1000,top:[{username:'Pilot <One>',amount:1500,count:2},{username:'Second',amount:500,count:1},{username:'Third',amount:400,count:1}]}]};
  function rows(offset,count){return Array.from({length:count},(_,i)=>({id:String(offset+i),username:'Donor '+(offset+i),amount:offset+i===1?10:100,currency:offset+i===1?'USD':'RUB',amount_rub:800,fx_rate:'80',fx_date:'2020-01-01',message:offset+i===0?'<img src=x onerror=alert(1)>':'',created_at:'2020-01-01 12:00:00'}));}
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(baseline&&url.origin===base&&url.pathname==='/v2/boot/home.js')return route.fulfill({status:200,contentType:'application/javascript',body:execFileSync('git',['show','33f76b3f:v2/boot/home.js'],{cwd:root})});
   const pathname=url.pathname.replace(/^\/__asg_public__/,'');
   if(pathname==='/donations-api/history'){
    requests.push(url.search);if(historyFail)return route.fulfill({status:503,body:'{}'});
    const offset=Number(url.searchParams.get('offset')||0),count=Math.min(50,101-offset);
    if(revisionFail&&offset)return route.fulfill({status:409,body:'{}'});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...history,offset,items:rows(offset,count),next_offset:offset+count<101?offset+count:null})});
   }
   if(pathname==='/hourly-data/schedule.json')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...calendar.schedule,items:[...calendar.schedule.items,upcoming]})});
   if(pathname==='/hourly-data/announcement.json')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(upcoming)});
   return fixture(route,log);
  });
  await page.goto(base+(language==='en'?'/en/':'/'),{waitUntil:'networkidle'});
  const dismiss=page.locator('.asg-legal-banner-btn-secondary');if(await dismiss.isVisible())await dismiss.click();
  await page.waitForFunction(()=>!document.getElementById('v2-site-shell').inert);
  const modal=page.locator('#v2-modal');
  await page.locator('#v2-event-calendar').click();try{await modal.locator('.calendar-grid').waitFor({timeout:10000});}catch(e){console.log(JSON.stringify({errors,body:await modal.innerText(),log:log.slice(-8)}));throw e;}
  const event=modal.locator('[data-page-event]').first();
  if(baseline){
   for(let i=0;i<3;i++)await event.click();
   assert(errors.some(e=>e.includes('normalizeEvent')));
   assert.equal(await modal.getAttribute('data-kind'),'home-calendar');
   for(let i=0;i<3;i++){await modal.locator('.modal-close').click();assert(await modal.evaluate(n=>n.open));}
   await modal.locator('.modal-close').click();assert.equal(await modal.evaluate(n=>n.open),false);
   console.log('Reproduced production baseline: 3 errors, 3 extra calendar frames');break;
  }
  for(let i=0;i<3;i++){
   await modal.locator('[data-page-event]').first().click();assert.equal(await modal.getAttribute('data-kind'),'event');
   await modal.locator('[data-home-races-back]').click();assert.equal(await modal.getAttribute('data-kind'),'home-calendar');
  }
  await modal.locator('.modal-close').click();assert.equal(await modal.evaluate(n=>n.open),false);
  await page.locator('[data-modal=event]').first().click();assert.equal(await modal.getAttribute('data-kind'),'event');
  await page.keyboard.press('Escape');assert.equal(await modal.evaluate(n=>n.open),false);
  assert.equal(await page.locator('.support-thanks-columns>section').count(),2);
  await page.locator('#v2-donation-top li').first().waitFor();assert.equal(await page.locator('#v2-donation-top li').count(),3);
  if(width!==320)await page.locator('.support-panel').screenshot({path:taskScratchPath(`support-panel-${language}-${width}.png`)});
  assert.equal(await page.locator('#v2-donation-top img').count(),0);
  await page.locator('#v2-donations-all').click();await modal.locator('.donation-history-row').first().waitFor();
  assert.equal(await modal.locator('.donation-top li').count(),3);
  assert.equal(await modal.locator('.donation-history-row').count(),50);
  assert.equal(await modal.locator('.donation-history-row img').count(),0);
  const more=modal.locator('[data-donations-more]');await more.click();await page.waitForFunction(()=>document.querySelectorAll('.donation-history-row').length===100);
  await more.click();await page.waitForFunction(()=>document.querySelectorAll('.donation-history-row').length===101);
  assert.equal(await more.isVisible(),false);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false);
  await modal.locator('#v2-modal-body').evaluate(n=>n.scrollTop=0);await modal.locator('.donation-history-scroll').evaluate(n=>n.scrollTop=0);
  if(width!==320)await page.screenshot({path:taskScratchPath(`support-${language}-${width}.png`)});
  await page.keyboard.press('Escape');assert.equal(await modal.evaluate(n=>n.open),false);
  historyFail=true;await page.locator('#v2-donations-all').click();await page.waitForTimeout(100);assert.equal(await modal.locator('.donation-history-row').count(),101,'last successful snapshot survives failure');
  await page.keyboard.press('Escape');historyFail=false;
  if(language==='ru'&&width===1440){
   historyFail=true;await page.reload({waitUntil:'networkidle'});
   await page.locator('#v2-donations-all').click();await modal.locator('[data-donations-retry]').waitFor();
   assert.equal(await modal.locator('.donation-top li').count(),0,'failed full history never fabricates ranks from recent donations');
   historyFail=false;history.currencies[0].top=[{username:'Euro donor',amount:1800,count:1},...history.currencies[0].top.slice(0,2)];
   await modal.locator('[data-donations-retry]').click();await modal.locator('.donation-history-row').first().waitFor();
   assert.equal(await modal.locator('[data-donation-currency]').count(),0);assert.match(await modal.locator('.donation-top').innerText(),/Euro donor/);
   revisionFail=true;await modal.locator('[data-donations-more]').click();await modal.locator('[data-donations-more][data-donations-retry]').waitFor();
   revisionFail=false;await modal.locator('[data-donations-retry]').click();await page.waitForFunction(()=>document.querySelectorAll('.donation-history-row').length===50);
   await page.keyboard.press('Escape');
  }
  // Role-specific report menu and read-only statistics screen.
  await page.route('https://auth.asgracing.ru/**',route=>{
   const path=new URL(route.request().url()).pathname;
   const payload=path==='/v1/reports/me'?{public_id:'drv_judge',judge:true}:path==='/v1/reports/moderation-statistics'?{total:7,available_since:1700000000,items:[{public_id:'drv_judge',display_name:'Judge name',bans:7,first_at:1700000000,last_at:1710000000}]}:{authenticated:true,driver:{public_id:'drv_judge'},permissions:{},csrf_token:'fixture'};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.goto(base+(language==='en'?'/en':'')+'/reports/?ban-stats=1',{waitUntil:'networkidle'});
  await page.locator('[data-ban-statistics] table').waitFor();assert.match(await page.locator('[data-ban-statistics]').innerText(),/Judge name/);
  assert.match(await page.locator('[data-ban-statistics]').innerText(),/7/);
  assert.equal(await page.locator('[data-ban-days]').inputValue(),'0');
  assert.deepEqual(errors,[]);result.push({language,width,calendar:true,donations:101,banStatistics:true});await page.close();
 }
 if(!baseline)console.log(JSON.stringify(result));
}finally{await browser.close();}

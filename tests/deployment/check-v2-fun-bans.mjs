// Live V2 renderers over bounded published fixtures. External writes are blocked.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
import {resolveBanProfiles,sortBans} from '../../v2/pages/bans-model.js';
const captured=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/fun-bans.json'),'utf8')),reports=[];
const resolved=resolveBanProfiles(sortBans(captured.bans.items),captured.drivers);
async function create(screen,language='ru',width=1920,options={}){
 const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce',timezoneId:'America/Los_Angeles'}),errors=[],reads={fun:0,bans:0,drivers:0};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const request=route.request();let u=new URL(request.url());
  if(request.method()!=='GET')return route.fulfill({status:403,contentType:'application/json',body:'{}'});
  if(u.origin===base&&u.pathname.startsWith('/__asg_public__/'))u=new URL('https://data.asgracing.ru'+u.pathname.slice('/__asg_public__'.length)+u.search);
  const key={'/top-data/v2/fun-stats.json':'fun','/top-data/bans.json':'bans','/top-data/v2/drivers/drivers.json':'drivers'}[u.pathname];
  if(u.hostname==='data.asgracing.ru'&&key){
   reads[key]++;
   if(options.offline||(key==='drivers'&&options.indexOffline))return route.fulfill({status:503,body:'{}'});
   if(key==='drivers'&&options.delayIndex)await new Promise(resolve=>setTimeout(resolve,options.delayIndex));
   const payload=key==='fun'?(options.fun||captured.fun):key==='bans'?(options.bans||captured.bans):captured.drivers;
   return route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  }
  return fixture(route,[]);
 });
 return {page,screen,language,errors,reads,options};
}
async function go(t,query=''){
 await t.page.goto(`${base}/v2/${t.language}/${t.screen==='fun'?'fun-stats':'bans'}/${query}`,{waitUntil:'networkidle'});
 if(await t.page.locator('.asg-legal-banner-btn-secondary').isVisible())await t.page.locator('.asg-legal-banner-btn-secondary').click();
}
const rows=page=>page.locator('.bans-table tbody tr');
const metricNumber=async locator=>Number((await locator.innerText()).replace(/\s/g,''));
try{
 for(const screen of ['fun','bans'])for(const language of ['ru','en'])for(const width of [1920,1280,768,390,320]){
  const t=await create(screen,language,width),{page}=t;await go(t);
  await page.locator(screen==='fun'?'.r24-award-grid':'.bans-table').waitFor();
  if(screen==='fun'){
   assert.equal(await page.locator('.r24-award').count(),8);
   assert.equal(await page.locator('.r24-fun-lists>.panel').count(),6);
   assert.equal(await metricNumber(page.locator('#r24-fun-content .site-summary .page-metric>b').first()),captured.fun.week.summary.races);
   assert.equal(await page.locator('.left-column').isVisible(),false);
   assert.equal(await page.locator('[data-site-label="fun"]').getAttribute('href'),`/v2/${language}/fun-stats/`);
  }else{
   assert.equal(await rows(page).count(),10);
   assert.equal(await rows(page).first().locator('td').first().innerText(),resolved[0].name);
   assert.equal(await page.locator('.dashboard').evaluate(el=>el.classList.contains('page-wide')),false);
   assert.equal(await page.locator('[data-route="bans/"]').getAttribute('href'),`/v2/${language}/bans/`);
   await page.locator('[data-site-step="bans"][data-step="1"]').click();
   assert.match(await page.locator('#site-bans-content .page-pagination>span').innerText(),/^11–20/);
   assert.equal(await rows(page).count(),10);
   assert.equal(await rows(page).first().locator('td').first().innerText(),resolved[10].name);
   await page.locator('[data-site-step="bans"][data-step="-1"]').click();
  }
  assert.equal(await page.locator('html').getAttribute('lang'),language);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
  assert.equal(await page.locator('meta[name="yandex-metrika-id"]').getAttribute('content'),'107697834');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${screen}/${language}/${width}: no page overflow`);
  if(width===1920||width===390){await page.evaluate(()=>document.querySelector('.center-column').scrollTop=0);await page.screenshot({path:path.join(root,`../tmp/v2-${screen}-${language}-${width}.png`),fullPage:width===390});}
  assert.deepEqual(t.errors,[]);reports.push({screen,language,width,layout:'passed'});await page.close();
 }
 const fun=await create('fun'),{page}=fun;await go(fun);
 await page.evaluate(()=>window.__tabs=document.querySelector('.r24-period-tabs'));
 await page.locator('[data-r24-period="month"]').click();
 assert.equal(await metricNumber(page.locator('#r24-fun-content .site-summary .page-metric>b').first()),captured.fun.month.summary.races);
 assert.equal(new URL(page.url()).searchParams.get('period'),'month');
 assert.equal(await page.locator('[data-r24-period="month"]').getAttribute('aria-pressed'),'true');
 assert.ok(await page.evaluate(()=>window.__tabs===document.querySelector('.r24-period-tabs')));
 assert.equal(fun.reads.fun,1);
 assert.match(await page.locator('.v2-language [data-language="en"]').getAttribute('href'),/period=month/);
 await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('[data-r24-period="month"]').getAttribute('aria-pressed'),'true');
 await page.locator('.v2-language [data-language="en"]').click();await page.waitForURL('**/v2/en/fun-stats/**');
 await page.locator('.r24-award').first().waitFor();assert.equal(await page.locator('[data-r24-period="month"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('[data-v1-home]').evaluate(a=>{a.click();return a.getAttribute('href')}),'/fun-stats/?period=month');
 await go(fun,'?period=month');
 const carLink=page.locator('.r24-award h2 a[href*="/cars/"]');assert.ok((await carLink.getAttribute('href')).startsWith('/v2/ru/cars/?car='));
 assert.ok((await page.locator('.r24-award h2 a[href*="/driver/"]').first().getAttribute('href')).startsWith('/v2/ru/driver/?id=drv_'));
 assert.deepEqual(fun.errors,[]);await page.close();reports.push({fun:'published totals, period/reload/language, stable controls and linked car/driver passed'});

 const bans=await create('bans'),bp=bans.page;await go(bans,'?page=999');
 assert.equal(await rows(bp).count(),1);assert.equal(new URL(bp.url()).searchParams.get('page'),'19');
 await bp.evaluate(()=>{window.__search=document.querySelector('#site-bans-search');window.__summary=document.querySelector('.site-summary')});
 await bp.locator('#site-bans-search').fill('Franz Hermann');
 assert.equal(await rows(bp).count(),captured.bans.items.filter(b=>b.name.toLowerCase()==='franz hermann').length);
 assert.equal(await bp.locator('.bans-table a').count(),0,'Ambiguous display names must not link to an arbitrary identity');
 assert.match(await bp.locator('.bans-table span[title]').first().getAttribute('title'),/не определён однозначно/);
 await bp.locator('#site-bans-search').fill('missing-not-a-pilot');assert.equal(await rows(bp).count(),0);assert.match(await bp.locator('#site-bans-content').innerText(),/ничего не найдено/);
 await bp.locator('#site-bans-search').fill('');await bp.locator('[data-site-step="bans"][data-step="1"]').click();
 assert.equal(bans.reads.bans,1);assert.equal(bans.reads.drivers,1);
 assert.ok(await bp.evaluate(()=>window.__search===document.querySelector('#site-bans-search')&&window.__summary===document.querySelector('.site-summary')));
 assert.match(await bp.locator('.v2-language [data-language="en"]').getAttribute('href'),/page=2/);
 const href=await bp.locator('.bans-table a').first().getAttribute('href');assert.ok(href.startsWith('/v2/ru/driver/?id=drv_'));
 await bp.locator('.bans-table a').first().click();await bp.waitForURL('**/v2/ru/driver/**');assert.equal(new URL(bp.url()).search,new URL(href,base).search);
 assert.deepEqual(bans.errors,[]);await bp.close();reports.push({bans:'10-row pages/clamping, search, unique identities, stable controls, one index read and pilot transition passed'});

 for(const [screen,options,expected] of [
  ['fun',{fun:{}},'Сводка за этот период'],
  ['fun',{fun:{...captured.fun,week:{summary:{races:0,activeDrivers:0},range_start:captured.fun.week.range_start,range_end:captured.fun.week.range_end}}},'Данных за период пока нет'],
  ['fun',{fun:{...captured.fun,month:null}},'Сводка за этот период'],
  ['bans',{bans:{items:[]}},'ничего не найдено'],
  ['bans',{indexOffline:true},'ЗАБАНЕН'],
  ['fun',{offline:true},'Данные временно недоступны'],
  ['bans',{offline:true},'Данные временно недоступны']]){
  const t=await create(screen,'ru',390,options);await go(t,options.fun?.month===null?'?period=month':'');
  assert.ok((await t.page.locator('#page-view').innerText()).includes(expected));
  if(options.offline){options.offline=false;await t.page.locator('#page-view button').click();await t.page.locator(screen==='fun'?'.r24-award':'.bans-table').first().waitFor();}
  if(options.indexOffline)assert.equal(await t.page.locator('.bans-table a').count(),0);
  assert.deepEqual(t.errors,[]);await t.page.close();
 }
 // An asynchronous profile-index enrichment must not reset an in-progress search.
 const delayed=await create('bans','en',390,{delayIndex:2000});
 await delayed.page.goto(`${base}/v2/en/bans/`,{waitUntil:'domcontentloaded'});await delayed.page.locator('#site-bans-search').fill('Franz');
 await delayed.page.waitForTimeout(2300);assert.equal(await delayed.page.locator('#site-bans-search').inputValue(),'Franz');
 assert.ok((await rows(delayed.page).allTextContents()).every(t=>t.includes('Franz')));assert.equal(delayed.reads.drivers,1);
 assert.deepEqual(delayed.errors,[]);await delayed.page.close();
 reports.push({states:'missing periods, partial/empty summaries, empty bans, index failure, offline/retry and delayed identity resolution passed'});
}finally{await browser.close();}
console.log(JSON.stringify(reports));

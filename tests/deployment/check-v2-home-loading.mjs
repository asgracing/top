// Real controllers with a deliberately stalled home payload. No external writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browser,base,fixture,snapshot} from './v2-browser-fixtures.mjs';
const reports=[];
try {
 for(const language of ['ru','en'])for(const width of [1440,375]) {
  const page=await browser.newPage({viewport:{width,height:667},reducedMotion:'reduce'}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  let releaseHome,homeRequested=false;
  const homeGate=new Promise(resolve=>releaseHome=resolve);
  await page.route('**/*',async route=>{
   let url=new URL(route.request().url());
   if(url.origin===base&&url.pathname.startsWith('/__asg_public__/'))url=new URL('https://data.asgracing.ru'+url.pathname.slice('/__asg_public__'.length)+url.search);
   requests.push({path:url.pathname,time:Date.now()});
   if(url.hostname==='data.asgracing.ru'&&url.pathname==='/top-data/v2/home.json'){homeRequested=true;await homeGate;}
   return fixture(route,[],{emptyHomePreviews:true,normalEvent:true});
  });
  try {
   await page.goto(base+(language==='en'?'/en/':'/'),{waitUntil:'domcontentloaded'});
   try{await page.waitForFunction(track=>document.querySelector('#v2-event-track')?.textContent===track,snapshot.event.track_name);}catch(error){console.log(JSON.stringify({language,width,homeRequested,errors,event:await page.locator('#v2-event-track').textContent(),requests:requests.map(r=>r.path)}));throw error;}
   assert.equal(homeRequested,true);
   await page.locator('#v2-servers [data-server]').first().waitFor({state:'attached'});
   assert.equal(await page.locator('.home-loader').isVisible(),false);
   assert.equal(await page.locator('#v2-site-shell').evaluate(n=>n.inert),false);
   assert.ok(!requests.some(r=>r.path.includes('/top-data/v2/tables/')),'Event/server cards are available before any ranking');
   releaseHome();
   await page.waitForFunction(()=>document.querySelector('#v2-day-driver')?.dataset.driver);
   if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
   if(width===375){
    await page.waitForTimeout(200);
    assert.ok(!requests.some(r=>r.path.includes('/top-data/v2/tables/')),'Offscreen mobile ranking is not downloaded');
    assert.ok(!requests.some(r=>r.path.includes('/public-cache-clubs-teams/')),'No offscreen club requests');
   }
   await page.locator('#v2-ranking').scrollIntoViewIfNeeded();
   await page.locator('#v2-rating-table tbody [data-driver]').first().waitFor();
   assert.ok(requests.some(r=>r.path==='/top-data/v2/tables/leaderboard/chunk-1.json'));
   assert.ok(!requests.some(r=>r.path.includes('/top-data/v2/tables/')&&/page-/.test(r.path)),'Manifest chunks replace potentially stale legacy pages');
   assert.ok(!requests.some(r=>r.path.includes('/tracks/bestlaps.json')||r.path.includes('/ratings/')),'Inactive tabs are not loaded');
   await page.locator('#v2-next').click();
   await page.waitForFunction(()=>document.querySelector('#v2-page-number')?.textContent==='2'&&!document.querySelector('#v2-prev').disabled);
   assert.ok(!requests.some(r=>r.path==='/top-data/v2/tables/leaderboard/page-2.json'));
   assert.ok((await page.locator('#v2-rating-table tbody [data-driver]').count())>0,'Second UI page slices the current chunk');
   await page.locator('[data-tab="bestlaps"]').click();
   await page.waitForFunction(()=>document.querySelector('#v2-track-filter-label')?.hidden===false&&document.querySelector('#v2-rating-table tbody [data-driver]'));
   assert.ok(requests.some(r=>r.path==='/top-data/v2/tracks/bestlaps.json'));
   assert.ok(requests.some(r=>r.path==='/top-data/v2/tables/bestlaps-monza/chunk-1.json'));
   await page.locator('[data-tab="clubs"]').click();
   await page.waitForFunction(()=>document.querySelector('#v2-rating-table tbody a[href*="slug="]'));
   assert.ok(requests.some(r=>r.path.includes('/ratings/')));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.deepEqual(errors,[]);
   reports.push({language,width,independentCards:true,offscreenDeferred:width===375,manifestStorage:true,optionalTabs:true});
  } finally {releaseHome();await page.close();}
 }
 // Direct SR anchors must work without scrolling, and empty/missing metadata
 // cannot leave the observer or table controls waiting for another update.
 for(const hash of ['#worst-safety','#bestlaps']) {
  const page=await browser.newPage({viewport:{width:375,height:667},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>fixture(route,[]));
  await page.goto(base+'/'+hash,{waitUntil:'networkidle'});
  await page.locator('#v2-rating-table tbody [data-driver]').first().waitFor();
  assert.equal(await page.locator('#v2-rating-table').getAttribute('data-view'),hash==='#bestlaps'?'bestlaps':'safety');
  assert.deepEqual(errors,[]);await page.close();
 }
 // A missing active chunk must offer retry, never fall back to stale pages.
 {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),requests=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());requests.push(url.pathname);
   if(url.pathname.includes('/tables/leaderboard/chunk-1.json'))return route.fulfill({status:404,json:{}});
   return fixture(route,[],{emptyHomePreviews:true});
  });
  await page.goto(base+'/#championship',{waitUntil:'networkidle'});
  await page.locator('[data-table-retry]').waitFor();
  assert.ok(requests.some(path=>path.includes('/tables/leaderboard/chunk-1.json')));
  assert.ok(!requests.some(path=>path.includes('/tables/leaderboard/page-1.json')));
  assert.deepEqual(errors,[]);await page.close();
 }
 // A broken home snapshot does not remove the independent event/server data.
 {
  const page=await browser.newPage({viewport:{width:375,height:667},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).pathname.endsWith('/top-data/v2/home.json')?route.fulfill({status:500,json:{}}):fixture(route,[]));
  await page.goto(base+'/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#v2-event-track').textContent(),snapshot.event.track_name);
  assert.ok(await page.locator('#v2-servers [data-server]').count());
  await page.locator('#v2-ranking').scrollIntoViewIfNeeded();
  assert.ok(await page.locator('[data-table-retry]').count());
  assert.deepEqual(errors,[]);await page.close();
 }
 await fs.writeFile('C:/Python/asgracing/tmp/home-loading-browser.json',JSON.stringify(reports,null,2));console.log(JSON.stringify({reports,directAnchors:true}));
}finally{await browser.close();}

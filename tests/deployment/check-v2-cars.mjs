// Approved Cars views over the live adapter; all external writes are blocked.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
import {carLapsForTrack} from '../../v2/pages/cars-laps-model.js';
const data=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/cars.json'),'utf8')),reports=[];
const trackData=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/cars-track-laps.json'),'utf8'));
const trackRows=(track='imola')=>data.cars.map(c=>({...c,best_lap:null,best_lap_ms:null,...carLapsForTrack(trackData.records[track],track).get(c.car_model_id)}));
async function create(width=1920,language='ru',options={}){
 const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],lapReads={};let reads=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const request=route.request();let u=new URL(request.url());
  if(request.method()!=='GET')return route.fulfill({status:403,contentType:'application/json',body:'{}'});
  if(u.origin===base&&u.pathname.startsWith('/__asg_public__/'))u=new URL('https://data.asgracing.ru'+u.pathname.slice('/__asg_public__'.length)+u.search);
  if(u.hostname==='data.asgracing.ru'&&u.pathname==='/top-data/v2/cars/cars.json'){
   reads++;
   if(options.offline)return route.fulfill({status:503,body:'{}'});
   const rows=options.empty?[]:options.rows||data.cars;
   return route.fulfill({contentType:'application/json',body:JSON.stringify(rows)});
  }
  if(u.hostname==='data.asgracing.ru'&&u.pathname==='/top-data/v2/tracks/bestlaps.json')return route.fulfill({contentType:'application/json',body:JSON.stringify(trackData.tracks)});
  const track=u.pathname.match(/^\/top-data\/v2\/tables\/bestlaps-(imola|kyalami)\.json$/)?.[1];
  if(u.hostname==='data.asgracing.ru'&&track){
   lapReads[track]=(lapReads[track]||0)+1;
   if(options.lapsOffline)return route.fulfill({status:503,body:'{}'});
   if(options.delayTrack===track)await new Promise(resolve=>setTimeout(resolve,700));
   return route.fulfill({contentType:'application/json',body:JSON.stringify(trackData.records[track])}).catch(()=>{});
  }
  return fixture(route,[]);
 });
 return {page,errors,language,reads:()=>reads,lapReads};
}
async function selectTrack(page,track){await page.locator('#r24-car-track').selectOption(track);await page.locator('#r24-car-content[aria-busy="false"]').waitFor();}
async function go(test,query=''){
 await test.page.goto(`${base}/v2/${test.language}/cars/${query}`,{waitUntil:'networkidle'});
 if(await test.page.locator('.asg-legal-banner-btn-secondary').isVisible())await test.page.locator('.asg-legal-banner-btn-secondary').click();
}
const rows=page=>page.locator('.r24-cars-table tbody tr:not(:has(td[colspan]))');
try {
 for(const language of ['ru','en'])for(const width of [1920,1280,768,390,320]){
  const test=await create(width,language),{page}=test;await go(test);
  await page.locator('.r24-car-hero').waitFor();
  assert.equal(await rows(page).count(),10);
  assert.equal(await page.locator('.left-column').isVisible(),false,'Cars use the approved full-width layout');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.equal(await page.locator('html').getAttribute('lang'),language);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
  assert.equal(await page.locator('meta[name="yandex-metrika-id"]').getAttribute('content'),'107697834');
  assert.equal(await page.locator('[data-site-label="cars"]').getAttribute('href'),`/v2/${language}/cars/`);
  assert.deepEqual(test.lapReads,{},'No large track rankings are loaded before choosing a circuit');
  await selectTrack(page,'imola');
  if(width===1920){const boxes=await page.locator('#r24-car-brand,#r24-car-track').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));assert.ok(boxes[1].x>boxes[0].x+boxes[0].width,'Track selector follows manufacturer');}
  await page.waitForFunction(()=>{const img=document.querySelector('.r24-car-image.large');return img.complete&&img.naturalWidth>0;});
  assert.equal(await page.locator('#r24-car-comparison tbody tr').count(),6);
  await page.locator('[data-r24-car-step="1"]').click();assert.match(await page.locator('#r24-car-content .page-pagination>span').innerText(),/^11–20/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(width===1920||width===390){await page.evaluate(()=>document.querySelector('.center-column').scrollTop=0);await page.screenshot({path:path.join(root,`../tmp/v2-cars-${language}-${width}.png`),fullPage:width===390});}
  assert.deepEqual(test.errors,[]);reports.push({language,width,layout:'passed'});await page.close();
 }
 const test=await create(),{page}=test;await go(test);
 await page.evaluate(()=>{window.__carSummary=document.querySelector('#r24-car-summary');window.__search=document.querySelector('#r24-car-search');});
 await page.locator('#r24-car-search').fill('Ferrari');assert.ok(await rows(page).count()>0);assert.ok((await page.locator('.r24-car-cell a').allTextContents()).every(v=>v.includes('Ferrari')));
 await page.locator('#r24-car-brand').selectOption('Ford');assert.equal(await rows(page).count(),0);assert.match(await page.locator('#r24-car-content').innerText(),/Машины не найдены/);
 await page.locator('#r24-car-search').fill('');assert.equal(await rows(page).count(),data.cars.filter(c=>c.car_name.startsWith('Ford ')).length);
 await page.locator('#r24-car-brand').selectOption('');
 await selectTrack(page,'imola');
 for(const key of ['races','wins','win_rate','podiums','unique_drivers','average_finish','fastest_lap_awards','best_lap','car_name']){
  await page.locator(`[data-r24-sort="${key}"]`).click();
  const direction=await page.locator(`th:has([data-r24-sort="${key}"])`).getAttribute('aria-sort');assert.ok(['ascending','descending'].includes(direction));
  const names=await page.locator('.r24-car-cell a').allTextContents();
  const available=c=>c[key]!=null&&c[key]!==''&&c[key]!=='—'&&c[key]!=='-'&&(key!=='best_lap'||c.best_lap_ms>0);
  const projected=trackRows();
  const expected=[...projected.filter(available).sort((a,b)=>{const av=key==='car_name'?a.car_name.toLowerCase():key==='best_lap'?a.best_lap_ms:a[key],bv=key==='car_name'?b.car_name.toLowerCase():key==='best_lap'?b.best_lap_ms:b[key];return (av<bv?-1:av>bv?1:0)*(direction==='ascending'?1:-1);}),...projected.filter(c=>!available(c))];
  assert.deepEqual(names,expected.slice(0,10).map(c=>c.car_name));
 }
 assert.ok(await page.evaluate(()=>window.__carSummary===document.querySelector('#r24-car-summary')&&window.__search===document.querySelector('#r24-car-search')),'Filtering/sorting retain the rest of the page');
 assert.equal(test.reads(),1,'Filters and sorting use the already loaded catalog');
 assert.equal(test.lapReads.imola,1,'Sorting and paging reuse the compact track records');
 await selectTrack(page,'kyalami');assert.equal(new URL(page.url()).searchParams.get('track'),'kyalami');
 await selectTrack(page,'imola');assert.equal(test.lapReads.imola,1,'Returning to a track uses its cached records');
 const selected=await page.locator('.r24-car-cell a').nth(2).innerText();await page.locator('.r24-car-cell a').nth(2).click();
 assert.equal(await page.locator('.r24-car-hero h2').innerText(),selected);assert.equal(new URL(page.url()).searchParams.get('car'),selected);
 assert.equal(new URL(await page.locator('.v2-language [data-language="en"]').getAttribute('href'),base).searchParams.get('car'),selected);
 assert.equal(new URL(await page.locator('.v2-language [data-language="en"]').getAttribute('href'),base).searchParams.get('track'),'imola');
 await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.r24-car-hero h2').innerText(),selected);
 assert.equal(await page.locator('#r24-car-track').inputValue(),'imola');
 await page.locator('[data-r24-compare="1"]').selectOption('36');assert.match(await page.locator('#r24-car-comparison').innerText(),/Ford Mustang/i);
 const ford=data.cars.find(c=>c.car_model_id===36);assert.equal((await page.locator('#r24-car-comparison tbody tr').first().locator('td').nth(2).innerText()).replace(/\s/g,''),String(ford.races));
 await page.locator('#r24-car-comparison [data-r24-car]').nth(1).click();assert.equal(await page.locator('.r24-car-hero h2').innerText(),ford.car_name);
 const profile=await page.locator('.r24-lap-note a').first().getAttribute('href');assert.ok(profile.startsWith('/v2/ru/driver/?id='));
 await page.locator('.r24-lap-note a').first().click();await page.waitForURL(url=>url.pathname==='/v2/ru/driver/');assert.equal(new URL(page.url()).search,new URL(profile,base).search);
 assert.deepEqual(test.errors,[]);reports.push({states:'filters, all sorts, pagination, selection/reload/language, comparison, profile transitions passed'});await page.close();
 for(const [options,query,selector] of [[{empty:true},'','.site-empty'],[{},'?car=missing','.r24-error'],[{offline:true},'','#page-view .r24-error'],[{rows:[data.cars[0]]},'','.r24-car-hero']]){
  const test=await create(390,'en',options);await go(test,query);await test.page.locator(selector).waitFor();
  if(options.offline){assert.match(await test.page.locator('#page-view').innerText(),/Data temporarily unavailable/);options.offline=false;await test.page.locator('#page-view button').click();await test.page.locator('.r24-car-hero').waitFor();}
  if(options.rows)assert.equal(await test.page.locator('#r24-car-comparison tbody tr').count(),6);
  assert.deepEqual(test.errors,[]);await test.page.close();
 }
 // A missing lap is always last; absent metrics are not rendered as zero.
 const sparse=[{...data.cars[0],best_lap:null,best_lap_ms:null,average_finish:null},{...data.cars[1]}];
 const partial=await create(390,'ru',{rows:sparse});await go(partial);await selectTrack(partial.page,'imola');
 for(let n=0;n<2;n++){await partial.page.locator('[data-r24-sort="best_lap"]').click();const ordered=await partial.page.locator('.r24-car-cell a').allTextContents(),records=carLapsForTrack(trackData.records.imola,'imola');const missing=ordered.filter(name=>!records.has(sparse.find(c=>c.car_name===name).car_model_id));if(missing.length)assert.equal(ordered.at(-1),missing.at(-1));}
 assert.ok((await partial.page.locator('.r24-cars-table').innerText()).includes('—'));await partial.page.close();
 const failedOptions={lapsOffline:true},failed=await create(390,'ru',failedOptions);await go(failed);await selectTrack(failed.page,'imola');assert.equal(await failed.page.locator('[data-car-laps-retry]').count(),1);assert.equal(await failed.page.locator('#r24-car-content .best-lap-value').count(),0);failedOptions.lapsOffline=false;await failed.page.locator('[data-car-laps-retry]').click();await failed.page.locator('#r24-car-content[aria-busy="false"]').waitFor();assert.ok(await failed.page.locator('#r24-car-content .best-lap-value').count()>0);assert.deepEqual(failed.errors,[]);await failed.page.close();
 const racing=await create(390,'ru',{delayTrack:'imola'});await go(racing);await racing.page.locator('#r24-car-track').selectOption('imola');await selectTrack(racing.page,'kyalami');await racing.page.waitForTimeout(900);assert.equal(await racing.page.locator('#r24-car-track').inputValue(),'kyalami');assert.ok((await racing.page.locator('.r24-lap-note').allTextContents()).every(s=>s.startsWith('Kyalami')));assert.deepEqual(racing.errors,[]);await racing.page.close();
 reports.push({errors:'empty, missing car, offline/retry, one model, absent lap/metrics passed'});
}finally{await browser.close();}
console.log(JSON.stringify(reports));

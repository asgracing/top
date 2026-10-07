// Real home presentation over bounded fixtures; all remote writes intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
const publicData=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-home/public.json'),'utf8'));
const day=publicData.home.driver_of_the_day,reports=[];
async function create(language='ru',width=1920){
 const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],log=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>fixture(route,log));
 await page.goto(`${base}/v2/${language}/`,{waitUntil:'networkidle'});
 if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
 await page.locator('#v2-day-driver').waitFor();
 return {page,errors,log};
}
async function publishDay(page,value){
 await page.evaluate(async day=>{
  const bridge=await import('/v2/bridge.js?v=20261006v2k');let model;bridge.subscribe(m=>model=m)();
  bridge.publish({...model,day,loading:{...model.loading,home:false}});
 },value);
}
try{
 for(const language of ['ru','en'])for(const width of [1920,1280,768,390,320]){
  const {page,errors,log}=await create(language,width);
  const before=log.filter(r=>/\/drivers\/drv_/.test(r.url)).length;
  await page.locator('#v2-day-driver').focus();await page.keyboard.press('Enter');
  await page.locator('.driver-day-stats').waitFor();
  assert.equal(await page.locator('#v2-modal').getAttribute('data-kind'),'driver-day');
  const modal=page.locator('#v2-modal');
  for(const [key,value] of Object.entries({points:day.points,races:day.races,wins:day.wins,podiums:day.podiums}))assert.equal((await modal.locator(`[data-day-stat="${key}"] b`).innerText()).replace(/\s/g,''),String(value));
  assert.equal(await modal.locator('[data-day-stat="positions-delta"] b').innerText(),language==='ru'?'0,00':'0.00');
  assert.equal(await modal.locator('.best-lap-value').innerText(),day.best_lap);
  assert.match(await modal.locator('.driver-day-summary .eyebrow').innerText(),/2026/);
  assert.equal(await modal.locator('.driver-day-profile').getAttribute('href'),`/v2/${language}/driver/?id=${day.public_id}`);
  assert.equal(await modal.locator('.lap-picker,.driver-achievement-title').count(),0,'Daily results do not contain career profile sections');
  assert.equal(log.filter(r=>/\/drivers\/drv_/.test(r.url)).length,before,'Opening daily statistics adds no profile fetch');
  assert.ok(await modal.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  assert.ok(await modal.locator('.modal-body').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  if(language==='ru'&&[1920,390].includes(width))await page.screenshot({path:path.join(root,`../tmp/v2-driver-day-${width}.png`)});
  await page.keyboard.press('Escape');assert.equal(await page.locator('#v2-day-driver').evaluate(e=>e===document.activeElement),true);
  await page.locator('#v2-day-ratings [data-rating="elo"]').click();await page.locator('.elo-chart').waitFor();assert.equal(await modal.getAttribute('data-kind'),'driver-elo');await modal.locator('.modal-close').click();
  await page.locator('#v2-day-ratings [data-rating="sr"]').click();await page.locator('.rating-history-summary').waitFor();assert.equal(await modal.getAttribute('data-kind'),'driver-sr');await modal.locator('.modal-close').click();
  assert.deepEqual(errors,[]);reports.push({language,width,passed:true});await page.close();
 }
 const {page,errors}=await create('ru',390);
 await page.locator('#v2-day-driver').click();
 await publishDay(page,{...day,points:99,races:0,wins:0,average_finish:null,average_positions_delta:-1.25,best_lap:null,best_lap_ms:null});
 assert.equal(await page.locator('[data-day-stat="points"] b').innerText(),'99');
 assert.equal(await page.locator('[data-day-stat="races"] b').innerText(),'0');
 assert.equal(await page.locator('[data-day-stat="wins"] b').innerText(),'0');
 assert.equal(await page.locator('[data-day-stat="average-finish"] b').innerText(),'—');
 assert.equal(await page.locator('[data-day-stat="positions-delta"] b').innerText(),'-1,25');
 assert.equal(await page.locator('#v2-modal .best-lap-value').innerText(),'—');
 await publishDay(page,null);await page.locator('.driver-day-empty').waitFor();assert.equal(await page.locator('[data-day-stat]').count(),0);
 await page.locator('#v2-modal .modal-close').click();
 await page.locator('#v2-day-driver').click();await page.locator('.driver-day-empty').waitFor();
 await publishDay(page,{...day,average_positions_delta:2.5});assert.equal(await page.locator('[data-day-stat="positions-delta"] b').innerText(),'+2,50');
 await page.locator('#v2-modal .driver-day-profile').click();await page.waitForURL(url=>url.pathname==='/v2/ru/driver/');assert.equal(new URL(page.url()).searchParams.get('id'),day.public_id);
 assert.deepEqual(errors,[]);await page.close();
 console.log(JSON.stringify({layouts:reports,states:'daily values, no career fetch, ELO/SR, focus, refresh, zero/missing data, signed deltas, profile link passed'}));
}finally{await browser.close();}

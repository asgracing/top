// Real home/Hourly renderers with bounded public data; no production writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
const data=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/public.json'),'utf8'));
const reports=[];
try{
 for(const language of ['ru','en'])for(const width of [1920,1280,768,390,320]){
  const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],log=[];
  let listFailure=false,detailFailure=false,detailDelay=0,emptyList=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   let url=new URL(route.request().url());
   if(url.origin===base&&url.pathname.startsWith('/__asg_public__/'))url=new URL('https://data.asgracing.ru'+url.pathname.slice('/__asg_public__'.length));
   if(url.hostname==='data.asgracing.ru'&&url.pathname==='/hourly-data/races/races.json')return route.fulfill({status:listFailure?503:200,contentType:'application/json',body:JSON.stringify(emptyList?{items:[]}:data.recent)});
   if(url.hostname==='data.asgracing.ru'&&data.recent.items.some(r=>url.pathname==='/hourly-data/'+r.details_path)){
    if(detailDelay)await new Promise(resolve=>setTimeout(resolve,detailDelay));
    return route.fulfill({status:detailFailure?503:200,contentType:'application/json',body:JSON.stringify(data.race)});
   }
   return fixture(route,log);
  });
  await page.goto(`${base}/v2/${language}/`,{waitUntil:'networkidle'});
  if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
  const modal=page.locator('#v2-modal'),trigger=page.locator('#v2-recent-races');
  await trigger.click();await modal.locator('.page-recent-race').first().waitFor();
  assert.equal(await modal.locator('.page-recent-race').count(),5);
  assert.equal(await modal.locator('.recent-profile-link').first().getAttribute('href'),`/v2/${language}/driver/?id=${data.recent.items[0].winner_public_id}`);
  assert.ok(await modal.locator('.home-recent-archive a').getAttribute('href')===`/v2/${language}/races/`);
  await modal.locator('[data-recent-page="1"]').click();
  const firstId=await modal.locator('.page-recent-race').first().getAttribute('data-page-race');
  assert.equal(firstId,data.recent.items[5].race_id);
  await page.evaluate(()=>document.getElementById('v2-modal-body').scrollTop=20);
  const scroll=await page.locator('#v2-modal-body').evaluate(n=>n.scrollTop);
  await modal.locator('.page-recent-race').first().focus();await page.keyboard.press('Enter');
  await modal.locator('.results-table').waitFor();
  assert.equal(await modal.getAttribute('data-kind'),'home-race');
  assert.equal(await modal.locator('.results-table .best-lap-value').count(),1);
  const number=await modal.locator('.result-driver-identity small').first().innerText();assert.match(number,/^#/);
  assert.equal(await modal.locator('.race-summary-grid').count(),1);
  if(width===1920&&language==='ru')await page.screenshot({path:path.join(root,'../tmp/v2-home-recent-results-1920.png')});
  await modal.locator('[data-rating-kind="sr"]').first().click();
  await modal.locator('.rating-history-controls').waitFor();
  await page.keyboard.press('Escape');assert.equal(await modal.locator('.results-table').count(),1);
  await page.keyboard.press('Escape');assert.equal(await modal.getAttribute('data-kind'),'home-recent');
  assert.equal(await modal.locator('.page-recent-race').first().getAttribute('data-page-race'),firstId);
  assert.equal(await page.locator('#v2-modal-body').evaluate(n=>n.scrollTop),scroll);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.pageRace),firstId);
  assert.ok(await modal.evaluate(n=>n.getBoundingClientRect().right<=innerWidth+1));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(language==='ru'&&[1920,390].includes(width))await page.screenshot({path:path.join(root,`../tmp/v2-home-recent-${width}.png`)});
  await modal.locator('.modal-close').click();assert.equal(await modal.evaluate(n=>n.open),false);assert.equal(await trigger.evaluate(n=>n===document.activeElement),true);
  if(width===1920&&language==='ru'){
   // A child request completing after Escape must never overwrite the restored list.
   await page.reload({waitUntil:'networkidle'});detailDelay=400;
   await trigger.click();await modal.locator('.page-recent-race').first().waitFor();
   await modal.locator('.page-recent-race').first().click();await page.keyboard.press('Escape');
   await page.waitForTimeout(700);assert.equal(await modal.getAttribute('data-kind'),'home-recent');assert.equal(await modal.locator('.results-table').count(),0);
   await modal.locator('.modal-close').click();
   await page.reload({waitUntil:'networkidle'});listFailure=true;
   await trigger.click();await modal.locator('[data-home-recent-retry]').waitFor();listFailure=false;
   await modal.locator('[data-home-recent-retry]').click();await modal.locator('.page-recent-race').first().waitFor();
   detailFailure=true;detailDelay=0;await modal.locator('.page-recent-race').first().click();await modal.locator('[data-home-race-retry]').waitFor();
   detailFailure=false;await modal.locator('[data-home-race-retry]').click();await modal.locator('.results-table').waitFor();
   await modal.locator('[data-home-races-back]').click();assert.equal(await modal.getAttribute('data-kind'),'home-recent');await page.keyboard.press('Escape');assert.equal(await modal.evaluate(n=>n.open),false);
   await page.reload({waitUntil:'networkidle'});emptyList=true;await trigger.click();await modal.locator('.empty').waitFor();assert.equal(await modal.locator('.page-recent-race').count(),0);assert.equal(await modal.locator('.home-recent-archive a').count(),1);await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors,[]);reports.push({language,width,nestedReturn:true});await page.close();
 }
 console.log(JSON.stringify(reports));
}finally{await browser.close();}

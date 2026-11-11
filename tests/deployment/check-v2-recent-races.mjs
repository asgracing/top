import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
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
  if(width===1920&&language==='ru')await page.screenshot({path:taskScratchPath('v2-home-recent-results-1920.png')});
  await modal.locator('[data-rating-kind="sr"]').first().click();
  await modal.locator('.rating-history-controls').waitFor();
  await page.keyboard.press('Escape');assert.equal(await modal.locator('.results-table').count(),1);
  await page.keyboard.press('Escape');assert.equal(await modal.getAttribute('data-kind'),'home-recent');
  assert.equal(await modal.locator('.page-recent-race').first().getAttribute('data-page-race'),firstId);
  assert.equal(await page.locator('#v2-modal-body').evaluate(n=>n.scrollTop),scroll);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.pageRace),firstId);
  assert.ok(await modal.evaluate(n=>n.getBoundingClientRect().right<=innerWidth+1));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(language==='ru'&&[1920,390].includes(width))await page.screenshot({path:taskScratchPath(`v2-home-recent-${width}.png`)});
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
 for(const language of ['ru','en'])for(const mode of ['api','rollback']){
  const width=language==='ru'?1280:390,page=await browser.newPage({viewport:{width,height:936}}),api=[],legacy=[],errors=[];
  const kinds=['hourly','monoclass','endurance','championship'];
  const rows=data.recent.items.slice(0,6).map((row,i)=>({...row,
   race_id:i===0?'2c3baa03bc2cc33b':i===1?'497805e147ef2082':row.race_id,
   kind:kinds[i%4],source:'hourly',finished_at:`2026-11-${String([10,8,7,6,5,4][i]).padStart(2,'0')}T18:30:00Z`,
   average_elo:1400-i*100,details_path:`races/details/${i===0?'2c3baa03bc2cc33b':i===1?'497805e147ef2082':row.race_id}.json`}));
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url()),prefix='/race-archive-shadow/v1/direct/';
   if(url.hostname==='data.asgracing.ru'&&url.pathname.startsWith(prefix)){
    api.push(url.pathname+url.search);
    if(mode==='rollback')return route.fulfill({status:503,json:{error:'archive_legacy'}});
    if(url.pathname===prefix+'archive'){
     const items=rows.filter(row=>row.kind===url.searchParams.get('kind'));
     return route.fulfill({json:{schema:1,revision:42,generated_at:'2026-11-11T09:00:00Z',page:1,
      total_items:items.length,total_pages:1,archive_total:rows.length,items}});
    }
    const card=rows.find(row=>url.pathname===prefix+'races/'+row.race_id);
    if(card)return route.fulfill({json:{race_id:card.race_id,archive_revision:42,card,
     protocol:{...data.race,...card,results:data.race.results}}});
   }
   if(url.hostname==='data.asgracing.ru'&&url.pathname.startsWith('/hourly-data/races/')){
    legacy.push(url.pathname);
    if(url.pathname.endsWith('/races.json'))return route.fulfill({json:data.recent});
    if(data.recent.items.some(row=>url.pathname==='/hourly-data/'+row.details_path))return route.fulfill({json:data.race});
   }
   return fixture(route,[]);
  });
  try{
   await page.goto(`${base}/v2/${language}/?raceData=api`,{waitUntil:'networkidle'});
   if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
   await page.locator('#v2-recent-races').click();
   const modal=page.locator('#v2-modal');await modal.locator('.page-recent-race').first().waitFor();
   if(mode==='api'){
    assert.equal(await modal.locator('.page-recent-race').first().getAttribute('data-page-race'),rows[0].race_id);
    assert.equal(await modal.locator('.page-recent-race').nth(1).getAttribute('data-page-race'),rows[1].race_id);
    const colors=await modal.locator('.recent-average-elo').evaluateAll(nodes=>nodes.map(n=>{
     const style=getComputedStyle(n);return {classes:n.className,color:style.color,background:style.backgroundColor,numberColor:getComputedStyle(n.querySelector('b')).color};
    }));
    assert.equal(new Set(colors.map(row=>row.color)).size,5);
    colors.forEach((row,i)=>{assert.ok(row.classes.includes('elo-'+(i+1)));assert.equal(row.color,row.numberColor);assert.notEqual(row.background,'rgba(0, 0, 0, 0)');});
    await modal.locator('[data-recent-page="1"]').click();
    assert.equal(await modal.locator('.recent-average-elo.elo-6').count(),1);
    await modal.locator('[data-recent-page="-1"]').click();
   }
   await modal.locator('.page-recent-race').first().click({position:{x:12,y:15}});
   await modal.locator('.results-table').first().waitFor();
   if(mode==='api'){
    assert.ok(api.some(url=>url===prefixForTest('races/'+rows[0].race_id)));
    assert.deepEqual(legacy,[],'Current list and protocol must use the archive API');
    await page.keyboard.press('Escape');await page.keyboard.press('Escape');
    const before=api.length;await page.locator('#v2-recent-races').click();await modal.locator('.page-recent-race').first().waitFor();
    assert.equal(api.length,before+4,'Reopening reads a fresh archive revision');
   }else assert.ok(legacy.includes('/hourly-data/races/races.json'));
   assert.deepEqual(errors,[]);reports.push({language,width,mode,protocol:true,coloredAverage:mode==='api'});
  }finally{await page.close();}
 }
 console.log(JSON.stringify(reports));
}finally{await browser.close();}
function prefixForTest(path){return '/race-archive-shadow/v1/direct/'+path;}

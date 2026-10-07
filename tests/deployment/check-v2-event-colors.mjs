// Event-type/color regression on real V2 views. All remote reads/writes mocked.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
const publicData=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/public.json'),'utf8'));
const archive=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/archive.json'),'utf8'));
const types=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/race-types.json'),'utf8'));
const endurance=publicData.schedule.items.find(e=>e.race_format==='endurance');
const normal=publicData.recent.items[0];
const rows=[archive.items[0],types.monoclass_summary,{...normal,details_path:`races/details/${normal.race_id}.json`}];
const manifest={...archive.manifest,races:{...archive.manifest.races,total_items:3,total_pages:1}};
const reports=[];
function light(color) {const channels=color.match(/[\d.]+/g).slice(0,3).map(Number);return channels.reduce((sum,v)=>sum+v,0)>400;}
try {
  for(const language of ['ru','en'])for(const width of [1920,390]) {
    const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],log=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
      let url=new URL(route.request().url());
      if(url.origin===base&&url.pathname.startsWith('/__asg_public__/'))url=new URL('https://data.asgracing.ru'+url.pathname.slice('/__asg_public__'.length)+url.search);
      const paths={
        '/hourly-data/announcement.json':endurance,
        '/hourly-data/schedule.json':{...publicData.schedule,items:[endurance,...publicData.schedule.items]},
        '/hourly-data/races/races.json':publicData.recent,
        '/top-data/v2/manifest.json':manifest,
        '/top-data/v2/races/chunk-1.json':{items:rows,total_items:3},
        [`/hourly-data/races/${types.monoclass_summary.race_id}.json`]:types.monoclass_detail,
        [`/hourly-data/races/${normal.race_id}.json`]:types.hourly_detail,
        [`/top-data/v2/races/details/${types.monoclass_summary.race_id}.json`]:types.monoclass_detail
      };
      const payload=url.hostname==='data.asgracing.ru'?paths[url.pathname]:undefined;
      if(payload!==undefined)return route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
      return fixture(route,log);
    });
    await page.goto(`${base}/v2/${language}/hourly/`,{waitUntil:'networkidle'});
    await page.locator('.hero-event.kind-endurance').waitFor();
    const styles=await page.locator('.hero-event').evaluate(card=>Object.fromEntries(['.page-event-content h2','.page-car-name','.page-event-date','.event-race-data','.event-kind'].map(s=>[s,getComputedStyle(card.querySelector(s)).color])));
    for(const [selector,color] of Object.entries(styles))assert.ok(light(color),`${selector} must be readable on the dark endurance card: ${color}`);
    assert.ok(light(await page.locator('.calendar-entry.kind-endurance').first().evaluate(n=>getComputedStyle(n).color)));
    await page.locator('.asg-legal-banner-btn-secondary').click();
    await page.locator('.hero-event [data-page-event]').click();
    assert.ok(light(await page.locator('#v2-modal .event-kind.kind-endurance').evaluate(n=>getComputedStyle(n).color)));
    await page.locator('#v2-modal .modal-close').click();
    await page.goto(`${base}/v2/${language}/races/`,{waitUntil:'networkidle'});
    await page.locator('.archive-table').waitFor();
    const publicBadge=page.locator('.archive-table .kind-public'),monoBadge=page.locator('.archive-table .kind-monoclass'),hourlyBadge=page.locator('.archive-table .kind-hourly');
    assert.equal(await publicBadge.count(),1);assert.equal(await monoBadge.count(),1);assert.equal(await hourlyBadge.count(),1);
    assert.equal(await monoBadge.innerText(),language==='ru'?'Монокласс':'Single model');
    const publicColor=await publicBadge.evaluate(n=>getComputedStyle(n).color),rgb=publicColor.match(/\d+/g).map(Number);
    assert.ok(Math.max(...rgb)-Math.min(...rgb)<15,'Public badge uses neutral grey rather than blue');
    assert.notEqual(await publicBadge.evaluate(n=>getComputedStyle(n).backgroundColor),await monoBadge.evaluate(n=>getComputedStyle(n).backgroundColor));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.locator('#site-archive-kind').selectOption('monoclass');await page.waitForFunction(()=>document.querySelectorAll('.archive-table tbody tr').length===1);
    assert.equal(await page.locator('.archive-table tbody tr').getAttribute('data-page-race'),types.monoclass_summary.race_id);
    await page.locator('#site-archive-kind').selectOption('hourly');await page.waitForFunction(id=>document.querySelector('.archive-table tbody tr')?.dataset.pageRace===id,normal.race_id);
    assert.equal(await page.locator('.archive-table tbody tr').count(),1,'Open GT3 event remains hourly even if winner and fastest driver use the same car');
    await page.goto(`${base}/v2/${language}/race/?id=${types.monoclass_summary.race_id}`,{waitUntil:'networkidle'});
    try{await page.locator('.site-intro .kind-monoclass').waitFor({timeout:10000});}catch(error){console.error({language,width,errors,content:await page.locator('#page-view').innerText()});throw error;}
    assert.deepEqual(errors,[]);reports.push({language,width,endurance:'readable',monoclass:'blue',public:'grey',filters:'passed'});await page.close();
  }
}finally{await browser.close();}
console.log(JSON.stringify(reports));

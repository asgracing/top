// Real archive/results controllers; bounded public fixtures and intercepted network.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
const sample=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/archive.json'),'utf8'));
const reports=[];
async function mock(page,{missing=false,failArchive=false,signed=false}={}) {
  const errors=[],reads=[];let failures=failArchive?1:0;
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
    let url=new URL(route.request().url());
    if(url.origin===base&&url.pathname.startsWith('/__asg_public__/'))url=new URL('https://data.asgracing.ru'+url.pathname.slice('/__asg_public__'.length)+url.search);
    if(url.hostname==='auth.asgracing.ru'&&url.pathname==='/v1/me'&&signed)return route.fulfill({contentType:'application/json',body:JSON.stringify({authenticated:true,linked:true,driver:{public_id:sample.profile.public_id,display_name:sample.profile.driver,profile_url:'/driver/?id='+sample.profile.public_id},steam:{persona_name:sample.profile.driver},permissions:{}})});
    if(url.hostname==='data.asgracing.ru') {
      let payload;
      if(url.pathname==='/top-data/v2/manifest.json')payload=sample.manifest;
      else if(url.pathname==='/top-data/v2/drivers/'+sample.profile.public_id+'.json')payload=sample.profile;
      else if(url.pathname.match(/\/races\/chunk-\d+\.json$/)) {
        reads.push(url.pathname);
        if(failures-->0)return route.fulfill({status:503,body:'{}'});
        const chunk=Number(url.pathname.match(/chunk-(\d+)/)[1]);payload={items:sample.items.slice((chunk-1)*20,chunk*20),total_items:25};
      }else if(url.pathname.startsWith('/top-data/v2/races/details/')) {
        if(missing)return route.fulfill({status:404,body:'{}'});
        payload=sample.race;
      }
      if(payload!==undefined)return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
    }
    return fixture(route,[]);
  });return {errors,reads};
}
try {
  for(const language of ['ru','en'])for(const width of [1920,1280,768,390,320]) {
    const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),{errors,reads}=await mock(page);
    await page.goto(`${base}/v2/${language}/races/`,{waitUntil:'networkidle'});
    try{await page.locator('.archive-table tbody tr').first().waitFor({timeout:10000});}catch(error){console.error({language,width,errors,reads,content:await page.locator('#page-view').innerText()});throw error;}
    assert.deepEqual(errors,[]);
    assert.equal(await page.locator('.archive-table tbody tr').count(),10);
    assert.equal(reads.length,1,'Initial view only loads one storage chunk');
    assert.equal(await page.locator('.archive-table tr').first().locator('th').count(),8);
    assert.equal(await page.locator('.archive-table tbody td:nth-child(2) .archive-server').first().getAttribute('title'),sample.items[0].server_name);
    assert.equal(await page.locator('.archive-table tbody tr').first().getAttribute('data-page-race'),sample.items[0].race_id);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
    assert.equal(await page.locator('meta[name="yandex-metrika-id"]').getAttribute('content'),'107697834');
    assert.equal(await page.locator('[data-route="races/"]').first().getAttribute('href'),'/v2/'+language+'/races/');
    const duplicateIds=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);});assert.deepEqual(duplicateIds,[]);
    await page.locator('.asg-legal-banner-btn-secondary').click();
    await page.evaluate(()=>window.__intro=document.querySelector('.site-intro'));
    const next=page.locator('[data-site-step="archive"][data-step="1"]');
    await next.click();await page.waitForFunction(()=>document.querySelector('.page-pagination b')?.textContent==='2 / 3');
    assert.equal(await page.locator('.archive-table tbody tr').count(),10);
    assert.equal(await page.locator('.archive-table tbody tr').first().getAttribute('data-page-race'),sample.items[10].race_id);
    assert.equal(reads.length,1,'Second UI page reuses its chunk');
    assert.equal(await page.locator('.v2-language a[data-language="en"]').getAttribute('href'),'/v2/en/races/?page=2');
    await next.click();await page.waitForFunction(()=>document.querySelector('.page-pagination b')?.textContent==='3 / 3');
    assert.equal(await page.locator('.archive-table tbody tr').count(),5);assert.equal(reads.length,2);
    assert.equal(await next.isDisabled(),true);
    assert.ok(await page.evaluate(()=>window.__intro===document.querySelector('.site-intro')),'Paging preserves surrounding blocks');
    assert.equal(await page.locator('.archive-table [data-podium-place]').count(),0);
    await page.locator('#site-archive-order').selectOption('asc');await page.waitForFunction(()=>document.querySelector('.page-pagination b')?.textContent==='1 / 3');
    assert.equal(await page.locator('.archive-table tbody tr').first().getAttribute('data-page-race'),sample.items[24].race_id);
    await page.locator('#site-archive-order').selectOption('desc');
    await page.waitForFunction(id=>document.querySelector('.archive-table tbody tr')?.dataset.pageRace===id,sample.items[0].race_id);
    await page.locator('.archive-table tbody tr').first().click({position:{x:12,y:15}});
    await page.locator('#v2-modal .results-table').waitFor();
    assert.equal(await page.locator('#v2-modal .results-table .best-lap-value').count(),1);
    assert.equal(await page.locator('#v2-modal .results-table [data-podium-place]').count(),3);
    assert.equal(await page.locator('#v2-modal .best-lap-driver a').getAttribute('href'),'/v2/'+language+'/driver/?id='+sample.race.best_lap_public_id);
    assert.ok(!(await page.locator('#v2-modal .results-table tbody td:nth-child(8)').first().innerText()).includes('—'),'Published internal ELO fallback is displayed');
    await page.locator('#v2-modal .modal-close').click();
    const resultLink=await page.locator('.archive-table tbody tr').first().locator('td:last-child a').getAttribute('href');
    await page.goto(base+resultLink,{waitUntil:'networkidle'});await page.locator('#page-view .results-table').waitFor();
    assert.equal(await page.locator('#page-view .results-table .best-lap-value').count(),1);
    assert.equal(await page.locator('#page-view .results-table [data-podium-place]').count(),3);
    const podiumColors=await page.locator('#page-view .results-table [data-podium-place] td:first-child').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).color));assert.equal(new Set(podiumColors).size,3);
    assert.equal(await page.locator('#page-view .results-table tbody tr').count(),sample.race.results.length);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.equal(await page.locator('.v2-language a[data-language="en"]').getAttribute('href'),'/v2/en/race/?id='+sample.items[0].race_id);
    assert.equal(await page.locator('#page-view .results-table tbody td:nth-child(4) a').first().getAttribute('href'),'/v2/'+language+'/driver/?id='+sample.race.results[0].public_id);
    await page.locator('#page-view [data-page-race]').click();await page.locator('#v2-modal .results-table').waitFor();
    assert.equal(await page.locator('#v2-modal .results-table .best-lap-value').count(),1);
    await page.locator('#v2-modal .modal-close').click();assert.deepEqual(errors,[]);
    if(width===1920) {
      await page.locator('#page-view .results-table tbody tr').first().locator('[data-rating-kind="elo"]').click();await page.locator('#v2-modal .elo-chart').waitFor();assert.equal(await page.locator('#v2-modal').getAttribute('data-kind'),'driver-elo');await page.locator('#v2-modal .modal-close').click();
      await page.locator('#page-view .results-table tbody tr').first().locator('[data-rating-kind="sr"]').click();await page.locator('#v2-modal .elo-chart').waitFor();assert.equal(await page.locator('#v2-modal').getAttribute('data-kind'),'driver-sr');await page.locator('#v2-modal .modal-close').click();
      assert.deepEqual(errors,[]);
    }
    if(width===1920)await page.screenshot({path:path.join(root,'../tmp/v2-archive-results-'+language+'.png')});
    reports.push({language,width,archive:'passed',results:'passed'});await page.close();
  }
  const page=await browser.newPage({viewport:{width:1280,height:936},reducedMotion:'reduce'}),{errors}=await mock(page);
  await page.goto(`${base}/v2/ru/races/`,{waitUntil:'networkidle'});await page.locator('.asg-legal-banner-btn-secondary').click();
  await page.locator('#site-archive-search').fill('NO_MATCH_012345');await page.waitForFunction(()=>document.querySelector('#site-archive-content .site-empty'));
  assert.equal(await page.locator('.page-pagination span').innerText(),'0–0 / 0');
  await page.locator('#site-archive-search').fill('');await page.locator('.archive-table').waitFor();
  await page.locator('#site-archive-kind').selectOption('public');await page.waitForFunction(()=>!document.getElementById('site-archive-content').hasAttribute('aria-busy'));
  const expected=sample.items.filter(r=>r.source!=='hourly'&&r.competition_mode!=='championship'&&r.race_format!=='endurance');assert.equal(await page.locator('.archive-table tbody tr').count(),Math.min(10,expected.length));
  await page.close();assert.deepEqual(errors,[]);reports.push({states:'filters-empty',status:'passed'});
  for(const options of [{missing:true},{failArchive:true}]) {
    const page=await browser.newPage({reducedMotion:'reduce'});const {errors}=await mock(page,options);
    await page.goto(`${base}/v2/ru/${options.missing?'race/?id=unknown-race':'races/'}`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('#page-view h1').innerText(),options.missing?'Гонка не найдена':'Данные временно недоступны');
    if(options.failArchive){await page.locator('.asg-legal-banner-btn-secondary').click();await page.locator('#page-view button').click();await page.locator('.archive-table').waitFor();}
    assert.deepEqual(errors,[]);reports.push({states:options.missing?'missing':'retry',status:'passed'});await page.close();
  }
  {
    const page=await browser.newPage({reducedMotion:'reduce'});const {errors}=await mock(page,{signed:true});
    await page.goto(`${base}/v2/ru/race/?id=${sample.race.race_id}`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.querySelector('#page-view .results-table .current-user-row'));
    assert.equal(await page.locator('#page-view .results-table .current-user-row').count(),1);
    assert.equal(await page.locator('#page-view .results-table .current-user-row .result-driver-identity a').getAttribute('href'),'/v2/ru/driver/?id='+sample.profile.public_id);
    await page.locator('.asg-legal-banner-btn-secondary').click();await page.locator('#page-view [data-page-race]').click();await page.locator('#v2-modal .results-table').waitFor();assert.equal(await page.locator('#v2-modal .current-user-row').count(),1);
    assert.deepEqual(errors,[]);reports.push({states:'authenticated-highlight',status:'passed'});await page.close();
  }
}finally{await browser.close();}
console.log(JSON.stringify(reports));

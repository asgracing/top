// Actual controllers with intercepted public reads. No live writes or messages.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root,snapshot,site} from './v2-browser-fixtures.mjs';
const sample=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/archive.json'),'utf8'));
const championship=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/championships.json'),'utf8'));
const race=structuredClone(sample.race), pilot=race.results[0];
pilot.elo=1234;pilot.safety_rating_after=0;
const context={result_context_version:1,qualifying:{status:'available',rating_basis:'race_result',results:[
  {position:1,public_id:pilot.public_id,driver:pilot.driver,best_lap:'1:30.123',race_number:25},
  {position:2,public_id:null,driver:'Q-only <pilot>',best_lap:null}
]},race_conditions:{status:'available',game_time:{hour_of_day:16,time_multiplier:3},ambient_temp_c:23,track_temp_c:29,rain:0,cloud_level:.25,weather_randomness:2,evidence:{ambient_temp_c:{basis:'configured',source:'launch_snapshot'}}}};
async function mock(page,{contextStatus=200}={}) {
  const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
    const request=route.request();let url=new URL(request.url());
    if(url.origin===base&&url.pathname.startsWith('/__asg_public__/'))url=new URL('https://data.asgracing.ru'+url.pathname.slice('/__asg_public__'.length)+url.search);
    assert.equal(request.method(),'GET','This check performs only public reads');
    if(url.hostname==='data.asgracing.ru') {
      requests.push(url.pathname);let payload;
      if(url.pathname.includes('/races/context/'))return route.fulfill({status:contextStatus,contentType:'application/json',body:JSON.stringify(contextStatus===200?context:{})});
      if(url.pathname==='/top-data/v2/manifest.json')payload=sample.manifest;
      else if(url.pathname.startsWith('/top-data/v2/drivers/'))payload={...Object.values(snapshot.profiles)[0],public_id:pilot.public_id,driver:pilot.driver,race_history:[sample.items[0]]};
      else if(url.pathname==='/hourly-data/races/races.json')payload={items:[...sample.items.map(item=>({...item,source:'hourly'})),...championship.recent.items]};
      else if(url.pathname==='/hourly-data/championships.json')payload=championship.index;
      else if(url.pathname==='/hourly-data/events/october-2026/index.json')payload=championship.seasons['october-2026'];
      else if(url.pathname==='/hourly-data/events/october-2026/'+championship.seasons['october-2026'].races[0].details_path)payload={...championship.protocol,results:race.results.map((row,i)=>i===0?{...row,points:4321}:row)};
      else if(/\/races\/chunk-\d+\.json$/.test(url.pathname))payload={items:sample.items,total_items:25};
      else if(url.pathname.includes('/races/details/')||/\/hourly-data\/races\/[^/]+\.json$/.test(url.pathname))payload=race;
      else if(url.pathname==='/top-data/server_status.json') {
        payload=structuredClone(snapshot.live_servers?{servers:snapshot.live_servers}:snapshot.servers);
        payload.updated_at=new Date().toISOString();
        for(const server of Object.values(payload.servers)) {
          server.updated_at=payload.updated_at;server.players_online=2;
          server.drivers=[{name:pilot.driver,public_id:pilot.public_id,elo:1234,safety_rating:0,position:1,raceNumber:25},
            {name:'Unknown pilot',public_id:null,elo:null,safety_rating:null,position:2}];
        }
      }
      if(payload!==undefined)return route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
    }
    return fixture(route,[]);
  });return {errors,requests,setContextStatus:value=>{contextStatus=value;}};
}
async function dismiss(page) {
  const consent=page.locator('.asg-legal-banner-btn-secondary');
  if(await consent.isVisible())await consent.click();
}
async function checkTabs(page,scope,requests,language) {
  const group=page.locator(scope+' [data-result-tabs]'), q=group.locator('[data-result-tab="qualifying"]');
  await group.waitFor();const count=requests.length;
  await q.click();
  assert.equal(await q.getAttribute('aria-selected'),'true');
  assert.equal(await group.locator('[data-result-panel="race"]').isVisible(),false);
  const table=group.locator('.qualifying-table');assert.equal(await table.locator('th').count(),5);
  assert.equal(await table.locator('tbody tr').count(),2);
  assert.match(await table.locator('tbody tr').first().innerText(),/1:30\.123/);
  assert.match(await table.locator('tbody tr').first().locator('td').nth(3).innerText(),/1234/);
  assert.match(await table.locator('tbody tr').first().locator('td').nth(4).innerText(),/0[.,]00/);
  assert.equal(await table.locator('tbody tr').first().locator('a').first().getAttribute('href'),(language==='en'?'/en':'')+'/driver/?id='+pilot.public_id);
  assert.match(await table.locator('tbody tr').nth(1).innerText(),/Q-only <pilot>/);
  assert.equal(await table.locator('tbody tr').nth(1).locator('a').count(),0);
  await q.focus();await page.keyboard.press('ArrowLeft');
  assert.equal(await group.locator('[data-result-tab="race"]').getAttribute('aria-selected'),'true');
  await page.keyboard.press('End');
  assert.equal(await q.getAttribute('aria-selected'),'true');
  assert.equal(requests.length,count,'Changing tabs does not fetch another dataset');
  const conditions=page.locator(scope+' .race-conditions').first();
  assert.match(await conditions.innerText(),/16:00/);assert.match(await conditions.innerText(),/23 °C/);
  assert.match(await conditions.innerText(),/0%/);assert.match(await conditions.innerText(),/25%/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No document overflow');
}
const report=[];
try {
  for(const language of ['ru','en'])for(const width of [1920,390,320]) {
    const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),state=await mock(page);
    const prefix=language==='en'?'/en':'';
    await page.goto(`${base}${prefix}/races/`,{waitUntil:'networkidle'});await dismiss(page);
    await page.locator('.archive-table tbody tr').first().click({position:{x:12,y:15}});
    await checkTabs(page,'#v2-modal',state.requests,language);
    if(width===390&&process.env.ASG_RESULT_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.ASG_RESULT_SCREENSHOT_DIR,'qualifying-modal-mobile-'+language+'.png')});
    await page.locator('#v2-modal .modal-close').click();
    await page.goto(`${base}${prefix}/race/?id=${sample.items[0].race_id}`,{waitUntil:'networkidle'});
    await checkTabs(page,'#page-view',state.requests,language);
    assert.deepEqual(state.errors,[]);
    if(width===1920&&process.env.ASG_RESULT_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.ASG_RESULT_SCREENSHOT_DIR,'qualifying-'+language+'.png')});
    report.push({language,width,archiveModal:'passed',standalone:'passed'});await page.close();
  }
  const page=await browser.newPage({viewport:{width:1280,height:936},reducedMotion:'reduce'}),state=await mock(page);
  await page.goto(base+'/',{waitUntil:'networkidle'});await dismiss(page);
  await page.locator('[data-server]').first().click();await page.locator('.server-driver-list').waitFor();
  const known=page.locator('.server-driver-list li').first();
  assert.match(await known.locator('.pilot-name').getAttribute('href'),new RegExp('id='+pilot.public_id));
  assert.match(await known.locator('.pilot-ratings').innerText(),/1234/);
  assert.equal(await page.locator('.server-driver-list li').nth(1).locator('a').count(),0);
  await page.locator('#v2-modal .modal-close').click();
  await page.locator('#v2-recent-races').click();await page.locator('#v2-modal [data-page-race]').first().click({position:{x:12,y:15}});
  await checkTabs(page,'#v2-modal',state.requests,'ru');
  await page.locator('#v2-modal .qualifying-table [data-rating-kind="elo"]').first().click();
  await page.locator('#v2-modal .rating-history-controls').waitFor();await page.locator('#v2-modal .modal-close').click();
  assert.equal(await page.locator('#v2-modal [data-result-tab="qualifying"]').getAttribute('aria-selected'),'true');
  assert.match(await page.locator('#v2-modal .race-conditions').innerText(),/16:00/);
  await page.goto(base+'/hourly/',{waitUntil:'networkidle'});
  await page.locator('[data-page-race]').first().click({position:{x:12,y:15}});
  await checkTabs(page,'#v2-modal',state.requests,'ru');
  await page.goto(base+'/hourly/championship/?slug=october-2026',{waitUntil:'networkidle'});
  await page.locator('[data-page-race]').first().click();await checkTabs(page,'#v2-modal',state.requests,'ru');
  await page.locator('#v2-modal [data-result-tab="race"]').click();
  assert.match(await page.locator('#v2-modal [data-result-panel="race"] tbody tr').first().locator('td').last().innerText(),/4.?321/,'Season points survive official rating enrichment');
  const team=site.entities.teams.find(t=>site.entity_details['teams/'+t.slug]?.recent_races?.length);
  if(team) {
    await page.goto(base+'/teams/detail/?slug='+team.slug,{waitUntil:'networkidle'});
    await page.locator('[data-page-race]').first().click();await checkTabs(page,'#v2-modal',state.requests,'ru');
  }
  await page.goto(base+'/driver/?id='+pilot.public_id,{waitUntil:'networkidle'});
  await page.locator('[data-page-race]').first().click({position:{x:12,y:15}});await checkTabs(page,'#v2-modal',state.requests,'ru');
  assert.deepEqual(state.errors,[]);await page.close();report.push({home:'passed',widget:'passed',nestedRating:'passed',hourly:'passed',championship:'passed',team:team?'passed':'no_fixture',driver:'passed'});
  for(const status of [404,503]) {
    const page=await browser.newPage({viewport:{width:390,height:936},reducedMotion:'reduce'}),state=await mock(page,{contextStatus:status});
    await page.goto(base+'/races/',{waitUntil:'networkidle'});await dismiss(page);
    await page.locator('.archive-table tbody tr').first().click({position:{x:12,y:15}});
    if(status===404) {
      await page.locator('[data-result-tab="qualifying"]').click();
      assert.match(await page.locator('[data-result-panel="qualifying"]').innerText(),/недоступны/);
    }else {
      const retry=page.locator('#v2-modal button[data-page-race]');await retry.waitFor();
      state.setContextStatus(200);await retry.click();await checkTabs(page,'#v2-modal',state.requests,'ru');
    }
    assert.deepEqual(state.errors,[]);await page.close();report.push({contextStatus:status,status:'passed'});
  }
  {
    const page=await browser.newPage({viewport:{width:1280,height:936},reducedMotion:'reduce'}),state=await mock(page);
    await page.goto(base+'/old/races/?race_id='+sample.items[0].race_id,{waitUntil:'networkidle'});
    const modal=page.locator('#race-results-modal');
    await modal.locator('[data-result-tab="qualifying"]').click();
    assert.equal(await modal.locator('.qualifying-table th').count(),5);
    assert.match(await modal.locator('.qualifying-table').innerText(),/1:30\.123/);
    assert.match(await modal.locator('.race-conditions').innerText(),/16:00/);
    assert.deepEqual(state.errors,[]);await page.close();report.push({classicArchive:'passed'});
  }
  console.log(JSON.stringify(report));
}finally {await browser.close();}

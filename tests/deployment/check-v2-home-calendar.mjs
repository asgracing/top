// Home calendar and event participation over the real shared renderers.
// All external writes are intercepted; no production vote is submitted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
const data=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/public.json'),'utf8'));
const reports=[];
try{
 for(const language of ['ru','en'])for(const width of [1920,1280,768,390,320]){
  const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],log=[],votes=new Map(),writes=[];
  let calendarFailure=false,entryFailure=false,voteFailure=false,voteDelay=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const req=route.request();let url=new URL(req.url());
   if(url.origin===base&&url.pathname.startsWith('/__asg_public__/'))url=new URL('https://data.asgracing.ru'+url.pathname.slice('/__asg_public__'.length)+url.search);
   if(url.hostname==='data.asgracing.ru'){
    let payload;
    if(url.pathname==='/hourly-data/announcement.json')payload=data.event;
    if(url.pathname==='/hourly-data/schedule.json'){
     if(calendarFailure)return route.fulfill({status:503,body:'{}'});
     payload=data.schedule;
    }
    if(url.pathname==='/hourly-data/races/races.json')payload=data.recent;
    if(data.recent.items.some(r=>url.pathname==='/hourly-data/'+r.details_path))payload=data.race;
    if(url.pathname.startsWith('/hourly-votes-api/')&&!url.pathname.endsWith('/voter-token')){
     if(req.method()==='POST'){
      const id=JSON.parse(req.postData()).event_id;writes.push({id,method:url.pathname.split('/').pop()});
      assert.equal(req.headers().authorization,'Bearer test-only-browser-token');
      if(voteDelay)await new Promise(resolve=>setTimeout(resolve,voteDelay));
      if(voteFailure)return route.fulfill({status:503,body:'{}'});
      votes.set(id,url.pathname.endsWith('/vote'));payload={event_id:id,votes:votes.get(id)?5:4,already_voted:votes.get(id)};
     }else{
      const ids=(url.searchParams.get('event_ids')||'').split(',');
      if(entryFailure&&ids.length===1&&ids[0]!==data.event.event_id)return route.fulfill({status:503,body:'{}'});
      payload={items:Object.fromEntries(ids.map(id=>[id,{event_id:id,votes:votes.get(id)?5:4,already_voted:Boolean(votes.get(id))}]))};
     }
    }
    if(payload!==undefined)return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
   }
   return fixture(route,log);
  });
  await page.goto(`${base}/v2/${language}/`,{waitUntil:'networkidle'});
  if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
  const modal=page.locator('#v2-modal'),trigger=page.locator('#v2-event-calendar');
  const headerOverflow=await page.locator('.upcoming-panel .panel-head').evaluate(n=>{const edge=n.getBoundingClientRect();return [...n.children].some(child=>child.getBoundingClientRect().right>edge.right+1);});
  assert.equal(headerOverflow,false,`Event header fits at ${language} ${width}`);
  await page.waitForFunction(()=>!document.getElementById('v2-site-shell').inert);
  await trigger.focus();await page.waitForFunction(()=>document.activeElement===document.getElementById('v2-event-calendar'));await page.keyboard.press('Enter');
  try{await modal.locator('.calendar-grid').waitFor({timeout:10000});}catch(error){console.log(JSON.stringify({language,width,errors,state:await modal.evaluate(n=>({open:n.open,kind:n.dataset.kind,body:document.getElementById('v2-modal-body').innerText,active:document.activeElement.id})),log:log.filter(r=>r.url.includes('hourly'))}));throw error;}
  assert.equal(await modal.getAttribute('data-kind'),'home-calendar');
  assert.equal(await modal.locator('.calendar-day').count(),42);assert.equal(await modal.locator('.legend-kind').count(),4);
  if(width<=600)assert.ok(await modal.locator('.calendar-grid').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'All seven weekdays fit on mobile');
  const month=await modal.locator('.calendar-controls>b').innerText();
  await modal.locator('[data-month-step="1"]').click();assert.notEqual(await modal.locator('.calendar-controls>b').innerText(),month);
  const future=data.schedule.items.find(e=>e.date.startsWith('2026-11')&&e.competition_mode!=='championship');
  const futureEntry=modal.locator(`[data-page-event="${future.event_id}"]`);await futureEntry.click();
  await modal.locator('[data-page-join]').waitFor();
  assert.equal(await modal.getAttribute('data-kind'),'event');
  assert.equal(await modal.locator('.pitstop-grid .rule-state').count(),5);
  assert.equal(await modal.locator('.modal-voting-disclosure a').first().getAttribute('href'),`/v2/${language}/privacy/`);
  assert.equal(await modal.locator('[data-page-participants] b').innerText(),'4');
  voteDelay=100;await modal.locator('[data-page-join]').click();assert.equal(await modal.locator('[data-page-join]').isDisabled(),true);
  await page.waitForFunction(()=>document.querySelector('#v2-modal [data-page-join]')?.getAttribute('aria-pressed')==='true');
  assert.equal(await modal.locator('[data-page-participants] b').innerText(),'5');
  await modal.locator('[data-page-join]').click();await page.waitForFunction(()=>document.querySelector('#v2-modal [data-page-join]')?.getAttribute('aria-pressed')==='false'&&!document.querySelector('#v2-modal [data-page-join]').disabled);
  assert.equal(await modal.locator('[data-page-participants] b').innerText(),'4');assert.equal(writes.at(-1).id,future.event_id);
  await page.keyboard.press('Escape');assert.equal(await modal.getAttribute('data-kind'),'home-calendar');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.pageEvent),future.event_id);
  assert.notEqual(await modal.locator('.calendar-controls>b').innerText(),month);
  await modal.locator('[data-month-reset]').click();assert.equal(await modal.locator('.calendar-controls>b').innerText(),month);
  const championship=data.schedule.items.find(e=>e.date.startsWith(data.event.date.slice(0,7))&&e.competition_mode==='championship');
  await modal.locator(`[data-page-event="${championship.event_id}"]`).click();await modal.locator('[data-page-join]').waitFor();
  assert.equal(await modal.locator('[data-page-join]').isDisabled(),false,'Championship entries stay open');
  assert.ok((await modal.locator('.event-kind').getAttribute('class')).includes('kind-championship'));
  await modal.locator('[data-home-races-back]').click();
  if(language==='ru'&&[1920,390].includes(width))await page.screenshot({path:path.join(root,`../tmp/v2-home-calendar-${width}.png`)});
  await modal.locator(`[data-page-event="${data.event.event_id}"]`).click();await modal.locator('[data-event-vote]').waitFor();
  await modal.locator('[data-event-vote]').click();await page.waitForFunction(()=>document.querySelector('#v2-race-vote')?.classList.contains('participation-active'));
  assert.match(await page.locator('#v2-participants').innerText(),/5/);
  await modal.locator('[data-event-vote]').click();await page.waitForFunction(()=>!document.querySelector('#v2-race-vote')?.classList.contains('participation-active')&&!document.querySelector('#v2-race-vote')?.disabled);
  await page.keyboard.press('Escape');
  await modal.locator('[data-page-race]').first().click();await modal.locator('.results-table').waitFor();assert.equal(await modal.locator('.results-table .best-lap-value').count(),1);
  await page.keyboard.press('Escape');assert.equal(await modal.getAttribute('data-kind'),'home-calendar');
  assert.ok(await modal.evaluate(n=>n.getBoundingClientRect().right<=innerWidth+1));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.keyboard.press('Escape');assert.equal(await modal.evaluate(n=>n.open),false);await page.waitForFunction(()=>document.activeElement===document.getElementById('v2-event-calendar')&&!document.getElementById('v2-site-shell').inert);
  if(width===1920&&language==='ru'){
   // Errors retain the event and permit retry; a failed mutation preserves prior state.
   await trigger.click();await modal.locator('.calendar-grid').waitFor();await modal.locator('[data-month-step="1"]').click();entryFailure=true;
   await modal.locator(`[data-page-event="${future.event_id}"]`).click();await modal.locator('[data-home-entry-retry]').waitFor();entryFailure=false;
   await modal.locator('[data-home-entry-retry]').click();await modal.locator('[data-page-join]').waitFor();
   voteFailure=true;await modal.locator('[data-page-join]').click();await modal.locator('.modal-participation [role="alert"]').waitFor();
   assert.equal(await modal.locator('[data-page-join]').getAttribute('aria-pressed'),'false');assert.equal(await modal.locator('[data-page-participants] b').innerText(),'4');
   voteFailure=false;await modal.locator('[data-page-join]').click();await page.waitForFunction(()=>document.querySelector('#v2-modal [data-page-join]')?.getAttribute('aria-pressed')==='true');
   await page.keyboard.press('Escape');await page.keyboard.press('Escape');
   // Remove the module read cache by reloading; test calendar-level retry.
   await page.reload({waitUntil:'networkidle'});calendarFailure=true;
   await trigger.click();await modal.locator('[data-home-calendar-retry]').waitFor();calendarFailure=false;
   await modal.locator('[data-home-calendar-retry]').click();await modal.locator('.calendar-grid').waitFor();await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors,[]);reports.push({language,width,participation:'passed',nestedReturn:true});await page.close();
 }
 console.log(JSON.stringify(reports));
}finally{await browser.close();}

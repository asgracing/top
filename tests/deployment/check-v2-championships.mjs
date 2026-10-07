// Approved championship views with public fixtures; every remote write intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
const data=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/championships.json'),'utf8'));
const season=data.seasons['october-2026'],event=season.upcoming_races[0],round=season.races[0],signed=season.standings[0].public_id;
const reports=[];
async function create(width=1920,language='ru',options={}) {
 const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],log=[],votes=new Map();
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const request=route.request();let url=new URL(request.url());
  if(url.origin===base&&url.pathname.startsWith('/__asg_public__/'))url=new URL('https://data.asgracing.ru'+url.pathname.slice('/__asg_public__'.length)+url.search);
  if(url.hostname==='auth.asgracing.ru'&&url.pathname==='/v1/me'&&options.signed)return route.fulfill({contentType:'application/json',body:JSON.stringify({authenticated:true,linked:true,driver:{public_id:signed,display_name:season.standings[0].driver,profile_url:'/driver/?id='+signed,elo:1300,sr:7},steam:{persona_name:'Test pilot'},permissions:{}})});
  if(url.hostname==='data.asgracing.ru') {
   let payload;
   if(url.pathname==='/hourly-data/championships.json'){if(options.offline)return route.fulfill({status:503,body:'{}'});payload=data.index;}
   else if(url.pathname==='/hourly-data/races/races.json')payload=data.recent;
   else if(url.pathname==='/hourly-data/schedule.json')payload={items:season.upcoming_races};
   else if(url.pathname==='/hourly-data/'+data.recent.items[0].details_path)payload=data.official;
   else if(url.pathname===`/hourly-data/events/october-2026/${round.details_path}`)payload=data.protocol;
   else if(/^\/hourly-data\/events\/[^/]+\/index.json$/.test(url.pathname)){payload=data.seasons[url.pathname.split('/')[3]];if(!payload)return route.fulfill({status:404,body:'{}'});}
   else if(url.pathname.startsWith('/hourly-data/events/')&&url.pathname.endsWith('.jpg'))return route.fulfill({contentType:'image/jpeg',body:await fs.readFile(path.join(root,'assets/spa.jpg'))});
   else if(url.pathname.startsWith('/hourly-votes-api/')&&!url.pathname.endsWith('/voter-token')) {
    if(request.method()==='POST'){assert.equal(request.headers().authorization,'Bearer test-only-browser-token');const id=JSON.parse(request.postData()).event_id;votes.set(id,url.pathname.endsWith('/vote'));payload={votes:votes.get(id)?5:4,already_voted:votes.get(id)};}
    else payload={items:Object.fromEntries((url.searchParams.get('event_ids')||'').split(',').map(id=>[id,{votes:votes.get(id)?5:4,already_voted:Boolean(votes.get(id))}]))};
   }
   if(payload!==undefined)return route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  }
  return fixture(route,log);
 });
 return {page,errors,log,language};
}
async function go(test,screen,query='') {
 await test.page.goto(`${base}/v2/${test.language}/${screen}/${query}`,{waitUntil:'networkidle'});
 try{await test.page.locator(screen==='championships'?'.r24-season-card':'.site-summary').first().waitFor({timeout:12000});}
 catch(error){console.error({screen,errors:test.errors,content:await test.page.locator('#page-view').innerText()});throw error;}
 if(await test.page.locator('.asg-legal-banner-btn-secondary').isVisible())await test.page.locator('.asg-legal-banner-btn-secondary').click();
}
try {
 for(const language of ['ru','en'])for(const width of [1920,1280,768,390,320])for(const screen of ['championships','hourly/championship']) {
  const test=await create(width,language),{page}=test;
  await go(test,screen,screen.includes('/')?'?slug=october-2026':'');
  assert.deepEqual(test.errors,[]);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page must fit the viewport');
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
  assert.equal(await page.locator('meta[name="yandex-metrika-id"]').getAttribute('content'),'107697834');
  assert.equal(await page.locator('.r24-season-card').count(),screen==='championships'?5:0);
  if(screen==='championships'){
   assert.equal(await page.locator('.r24-season-card .status-active').count(),1);
   assert.equal(await page.locator('.r24-season-card .status-scheduled').count(),1);
   assert.equal(await page.locator('.r24-season-card .status-finished').count(),3);
   assert.equal(new Set(await page.locator('.r24-season-card .season-status').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).backgroundColor))).size,3,'Season statuses have three distinct colors');
  }
  if(screen!=='championships') {
   assert.ok(await page.evaluate(()=>Boolean(document.querySelector('#r24-season-standings').closest('.page-panel').compareDocumentPosition(document.querySelector('#r24-championship-rankings').closest('.page-panel'))&Node.DOCUMENT_POSITION_FOLLOWING)),'Pilot standings precede club/team standings');
   if(width===1920){const bottoms=await page.locator('.season-intro .site-intro-actions select,.season-intro .site-intro-actions .button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().bottom));assert.ok(Math.max(...bottoms)-Math.min(...bottoms)<1,'Season select and navigation buttons share a baseline');}
   assert.equal(await page.locator('#r24-season-standings tbody tr').count(),10);
   assert.equal(await page.locator('.page-event-card').count(),season.upcoming_races.length);
   assert.equal(await page.locator('.page-event-card [data-page-join]:disabled').count(),0,'Championship registration stays open');
   assert.equal(await page.locator('.page-event-card a[href*="privacy"]').count(),season.upcoming_races.length);
   await page.locator('[data-r24-standing-step="1"]').click();
   assert.equal((await page.locator('#r24-season-standings td').first().innerText()).trim(),'11');
   assert.equal(await page.locator('#r24-season-standings [data-podium-place]').count(),0);
  }
  if(width===1920&&language==='ru')await page.screenshot({path:path.join(root,'../tmp/v2-'+screen.replace('/','-')+'.png')});
  reports.push({screen,language,width,layout:'passed'});await page.close();
 }
 const test=await create(1920,'ru',{signed:true}),{page}=test;
 await go(test,'championships');
 assert.equal(await page.locator('[data-route="championships/"]').getAttribute('href'),'/v2/ru/championships/');
 await page.locator('#r24-season-search').fill('November');assert.equal(await page.locator('.r24-season-card').count(),1);
 assert.equal(await page.locator('.r24-feature-season').count(),1,'Filtering does not replace the feature');
 await page.locator('#r24-season-search').fill('');await page.locator('#r24-season-status').selectOption('finished');assert.equal(await page.locator('.r24-season-card').count(),3);
 await go(test,'hourly/championship','?slug=october-2026');
 await page.waitForFunction(()=>document.querySelector('#r24-season-standings .current-user-row'));
 assert.equal(await page.locator('#r24-season-standings .current-user-row').count(),1);
 const card=page.locator('.page-event-card').first();
 await card.locator('[data-page-join]').click();await page.waitForFunction(()=>document.querySelector('.page-event-card [data-page-join]')?.classList.contains('is-voted'));
 await card.locator('[data-page-join]').click();await page.waitForFunction(()=>!document.querySelector('.page-event-card [data-page-join]')?.classList.contains('is-voted'));
 await card.locator('[data-page-event]').click();await page.locator('#v2-modal .race-session-registration').waitFor();
 assert.equal(await page.locator('#v2-modal .kind-championship').count(),1);
 assert.ok(await page.locator('#v2-modal a[href*="privacy"]').count());await page.locator('#v2-modal .modal-close').click();
 await page.locator('.site-rounds [data-page-race]').click();await page.locator('#v2-modal .results-table').waitFor();
 assert.equal(await page.locator('#v2-modal .results-table tbody tr').count(),data.protocol.results.length);
 assert.equal(await page.locator('#v2-modal .results-table .best-lap-value').count(),1);
 assert.equal(await page.locator('#v2-modal .results-table [data-podium-place]').count(),3);
 const first=page.locator('#v2-modal .results-table tbody tr').first();assert.equal((await first.locator('td').last().innerText()).trim(),String(data.protocol.results[0].points));
 assert.notEqual((await first.locator('td').nth(7).innerText()).trim(),'—','Official ELO is merged into the seasonal protocol');
 assert.ok(await first.locator('[data-rating-kind="sr"]').count());await page.locator('#v2-modal .modal-close').click();
 await page.locator('[data-r24-community="teams"]').click();assert.equal(await page.locator('[data-r24-community="teams"]').getAttribute('aria-pressed'),'true');
 await go(test,'hourly/championship','?slug=june-2026');assert.equal(await page.locator('.page-event-card').count(),0);assert.equal(await page.locator('[data-r24-prize]').count(),3);
 await page.locator('[data-r24-prize]').first().click();await page.locator('#v2-modal .site-zoom-image').waitFor();assert.ok(await page.locator('#v2-modal img').evaluate(img=>img.complete&&img.naturalWidth>0));await page.locator('#v2-modal .modal-close').click();
 await go(test,'hourly/championship','?slug=november-2026');assert.equal(await page.locator('.page-event-card').count(),data.seasons['november-2026'].upcoming_races.length);assert.ok(!(await page.locator('#page-view').innerText()).includes('Сезон завершён'));
 await page.goto(`${base}/v2/ru/hourly/championship/?slug=missing`,{waitUntil:'networkidle'});assert.equal(await page.locator('#page-view h1').innerText(),'Чемпионат не найден');assert.equal(await page.locator('#page-view a[href="/v2/ru/championships/"]').count(),1);
 assert.deepEqual(test.errors,[]);await page.close();reports.push({states:'search, status, auth row, registration, event/result modals, prizes, scheduled, missing passed'});
 const offline=await create(390,'en',{offline:true});await offline.page.goto(`${base}/v2/en/championships/`,{waitUntil:'networkidle'});assert.equal(await offline.page.locator('#page-view h1').innerText(),'Data temporarily unavailable');assert.equal(await offline.page.locator('#page-view button').innerText(),'Retry');assert.deepEqual(offline.errors,[]);await offline.page.close();reports.push({offline:'passed'});
}finally{await browser.close();}
console.log(JSON.stringify(reports));

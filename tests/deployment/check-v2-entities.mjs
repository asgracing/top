// Real V2 entity views with public fixtures; external writes are never forwarded.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
const data=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/entities.json'),'utf8'));
const club=data.details['clubs/asg-racing'],team=data.details['teams/asg-racing-ford-power'],signed=team.roster[0].public_id,reports=[];
async function create(width,language,options={}) {
 const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],log=[];let failContext=Boolean(options.failContext);
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const request=route.request();let url=new URL(request.url());
  if(url.origin===base&&url.pathname.startsWith('/__asg_public__/'))url=new URL('https://data.asgracing.ru'+url.pathname.slice('/__asg_public__'.length)+url.search);
  if(request.method()!=='GET')return route.fulfill({status:403,contentType:'application/json',body:'{}'});
  if(url.hostname==='auth.asgracing.ru'&&url.pathname==='/v1/me'&&options.signed)return route.fulfill({contentType:'application/json',body:JSON.stringify({authenticated:true,linked:true,driver:{public_id:signed,display_name:team.roster[0].display_name,profile_url:'/driver/?id='+signed,elo:1466,sr:9.99},steam:{persona_name:'Test pilot'},permissions:{}})});
  if(url.hostname==='data.asgracing.ru') {
   let payload;
   if(url.pathname==='/public-cache-clubs-teams/current.json'){if(options.offline)return route.fulfill({status:503,body:'{}'});payload=data.pointer;}
   const rating=url.pathname.match(/\/ratings\/(general|hourly|championship)\/(clubs|teams)\/page-(\d+)\.json$/);
   if(rating){if(failContext&&rating[1]==='hourly')return route.fulfill({status:503,body:'{}'});payload=data.ratings[rating[1]][rating[2]][Number(rating[3])-1];}
   const detail=url.pathname.match(/\/details\/(clubs|teams)\/([^/]+)\.json$/);
   if(detail&&url.pathname.includes('/public-cache-clubs-teams/')) {
    payload=structuredClone(data.details[detail[1]+'/'+detail[2]]);
    if(!payload)return route.fulfill({status:404,body:'{}'});
    if(options.empty){payload.roster=[];payload.teams=[];payload.club=null;payload.rating=null;payload.recent_races=[];payload.asset=null;}
    if(options.longRaces){payload.recent_races.push(...payload.recent_races.map((r,i)=>({...r,race_uid:'test_additional_'+i,points:100+i})));}
    if(options.unsafe)payload.website_url='javascript:alert(1)';
   }
   if(url.pathname.includes('/public-cache-clubs-teams/')&&url.pathname.includes('/assets/'))return route.fulfill({contentType:'image/jpeg',body:await fs.readFile(path.join(root,'assets/spa.jpg'))});
   if(url.pathname===`/top-data/v2/races/details/${data.race_path}.json`)payload=data.race;
   if(payload!==undefined)return route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  }
  return fixture(route,log);
 });
 return {page,errors,language,restoreContext:()=>failContext=false};
}
async function go(test,screen,query=''){
 await test.page.goto(`${base}/v2/${test.language}/${screen}/${query}`,{waitUntil:'networkidle'});
 try{await test.page.locator(screen==='teams'?'.site-entity-card':'.site-entity-hero').first().waitFor({timeout:12000});}
 catch(error){console.error({screen,errors:test.errors,content:await test.page.locator('#page-view').innerText()});throw error;}
 if(await test.page.locator('.asg-legal-banner-btn-secondary').isVisible())await test.page.locator('.asg-legal-banner-btn-secondary').click();
}
try {
 for(const language of ['ru','en'])for(const width of [1920,1280,768,390,320])for(const [screen,query] of [['teams',''],['clubs','?slug=asg-racing'],['teams/detail','?slug=asg-racing-ford-power']]){
  const test=await create(width,language),{page}=test;await go(test,screen,query);
  assert.deepEqual(test.errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page fits the viewport');
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');assert.equal(await page.locator('meta[name="yandex-metrika-id"]').getAttribute('content'),'107697834');
  assert.equal(await page.locator('.brand').first().getAttribute('href'),`/v2/${language}/`);
  assert.equal(await page.locator('.v2-language [data-language="en"]').getAttribute('href'),'/v2/en/'+screen+'/'+query);
  if(screen==='teams')assert.equal(await page.locator('.site-entity-card').count(),data.ratings.general.clubs[0].total);
  else {
   const detail=screen==='clubs'?club:team;
   assert.equal(await page.locator('#site-roster-content tbody tr').count(),detail.roster.length);
   assert.equal(await page.locator('#site-entity-races [data-page-race]').count(),10);
   assert.equal(await page.locator('.site-reader a[href*="membership_target"]').count(),1);
   const request=new URL(await page.locator('.site-reader a[href*="membership_target"]').getAttribute('href'),base);assert.equal(request.searchParams.get('membership_target'),detail.public_id);assert.equal(request.searchParams.get('membership_type'),screen==='clubs'?'club':'team');
   assert.equal(await page.locator('.dashboard').evaluate(node=>node.classList.contains('page-wide')),true);
   assert.ok(await page.locator('.site-entity-hero img').evaluate(img=>img.complete&&img.naturalWidth>0));
  }
  if(width===1920&&language==='ru')await page.screenshot({path:path.join(root,'../tmp/v2-entities-'+screen.replace('/','-')+'.png')});
  reports.push({screen,language,width,layout:'passed'});await page.close();
 }
 const test=await create(1920,'ru',{signed:true,failContext:true,longRaces:true}),{page}=test;
 await go(test,'teams');await page.evaluate(()=>window.testIntro=document.querySelector('.site-intro'));
 await page.locator('[data-site-catalog="teams"]').click();assert.equal(await page.locator('.site-entity-card').count(),data.ratings.general.teams[0].total);
 await page.locator('#site-catalog-search').fill('FORD');assert.equal(await page.locator('.site-entity-card').count(),1);
 await page.locator('#site-catalog-context').selectOption('hourly');await page.locator('[data-catalog-retry]').waitFor();test.restoreContext();await page.locator('[data-catalog-retry]').click();await page.locator('.site-entity-card').waitFor();
 assert.equal(await page.locator('#site-catalog-search').inputValue(),'FORD');assert.ok(await page.evaluate(()=>window.testIntro===document.querySelector('.site-intro')),'Filter does not rebuild the page');
 await page.locator('#site-catalog-context').selectOption('championship');await page.locator('.site-entity-card').waitFor();
 const expected=data.ratings.championship.teams[0].entries.find(e=>e.slug===team.slug);assert.equal((await page.locator('.site-entity-stats b').first().innerText()).replace(/\s/g,''),new Intl.NumberFormat('ru-RU').format(expected.total_points).replace(/\s/g,''));
 assert.ok(new URL(page.url()).searchParams.get('q'));assert.equal(new URL(await page.locator('.v2-language [data-language="en"]').getAttribute('href'),base).searchParams.get('context'),'championship');
 await page.locator('.site-entity-heading h2 a').click();await page.locator('.site-entity-hero').waitFor();assert.ok(page.url().includes('/v2/ru/teams/detail/'));
 await page.waitForFunction(()=>document.querySelector('#site-roster-content .current-user-row'));assert.equal(await page.locator('#site-roster-content .current-user-row').count(),1);
 await page.locator('#site-roster-search').fill(team.roster[0].display_name);assert.equal(await page.locator('#site-roster-content tbody tr').count(),1);await page.locator('#site-roster-search').fill('zzzz');assert.equal(await page.locator('#site-roster-content tbody tr').count(),0);await page.locator('#site-roster-search').fill('');
 await page.locator('#site-roster-content [data-rating-kind="elo"]').first().click();await page.locator('#v2-modal .rating-chart-wrap').waitFor();await page.locator('#v2-modal .modal-close').click();
 await page.locator('#site-roster-content [data-rating-kind="sr"]').first().click();await page.locator('#v2-modal .rating-chart-wrap').waitFor();await page.locator('#v2-modal .modal-close').click();
 await page.locator('#site-entity-races [data-page-race]').first().click();await page.locator('#v2-modal .results-table').waitFor();assert.equal(await page.locator('#v2-modal .results-table tbody tr').count(),data.race.results.length);assert.equal(await page.locator('#v2-modal .results-table .best-lap-value').count(),1);await page.locator('#v2-modal .modal-close').click();
 await page.locator('[data-entity-races-step="1"]').click();assert.equal(await page.locator('#site-entity-races [data-page-race]').count(),10);assert.ok((await page.locator('#site-entity-races [data-page-race]').first().getAttribute('data-page-race')).startsWith('test_additional_'));
 const affiliated=await page.locator('.site-entity-hero .entity-link').getAttribute('href');assert.equal(affiliated,'/v2/ru/clubs/?slug=asg-racing');
 assert.deepEqual(test.errors,[]);await page.close();reports.push({states:'tabs, context, search, retry, auth, roster, rating/race modals, recent paging, links passed'});
 for(const options of [{empty:true},{offline:true},{unsafe:true}]){
  const t=await create(390,'en',options);await t.page.goto(base+'/v2/en/clubs/?slug=asg-racing',{waitUntil:'networkidle'});
  if(options.empty){await t.page.locator('.site-entity-hero').waitFor();assert.equal(await t.page.locator('#site-roster-content tbody tr').count(),0);assert.ok(!(await t.page.locator('.site-summary').innerText()).includes('NaN'));}
  else {assert.equal(await t.page.locator('#page-view h1').innerText(),'Data temporarily unavailable');assert.equal(await t.page.locator('#page-view button').innerText(),'Retry');}
  assert.deepEqual(t.errors,[]);await t.page.close();
 }
 const missing=await create(390,'ru');await missing.page.goto(base+'/v2/ru/clubs/?slug=missing',{waitUntil:'networkidle'});assert.equal(await missing.page.locator('#page-view h1').innerText(),'Клуб или команда не найдены');assert.equal(await missing.page.locator('#page-view a').getAttribute('href'),'/v2/ru/teams/');await missing.page.close();reports.push({missing_empty_offline_unsafe:'passed'});
}finally{await browser.close();}
console.log(JSON.stringify(reports));

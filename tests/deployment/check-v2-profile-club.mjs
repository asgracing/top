// Real V2 pages; all public/private API traffic stays inside fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
const data=JSON.parse(await fs.readFile(root+'/tests/fixtures/v2-pages/public.json','utf8'));
const entities=JSON.parse(await fs.readFile(root+'/tests/fixtures/v2-pages/entities.json','utf8'));
const id=data.driver.public_id,avatar='https://avatars.steamstatic.com/fixture_full.jpg';
const selected={definitions_version:6,achievement_id:'race_days_100',title:'Здесь как дома',description:'Гонки в 100 разных календарных дней.',icon:'🏠',selected:true};
const full={...data.achievements,achievements:[...data.achievements.preview,...Array.from({length:5},(_,i)=>({id:'test_'+i,name:'Additional '+i,description:'Requirement',category:i%2?'speed':'career',progress:i,target:10,earned:false}))]};
async function check(language,width,options={}){
  const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('asgV2IntroSeen','1'));
  await page.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    requests.push(url.pathname);
    if(request.method()!=='GET'&&!url.pathname.endsWith('/voter-token'))return route.fulfill({status:403,json:{}});
    if(url.hostname==='avatars.steamstatic.com')return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKZkAAAAASUVORK5CYII=','base64')});
    if(url.hostname==='auth.asgracing.ru'){
      if(url.pathname.endsWith('/steam-profile'))return route.fulfill({json:{avatar_url:options.failedAvatar?null:avatar}});
      if(url.pathname.endsWith('/title'))return options.failedTitle?route.fulfill({status:503,json:{}}):route.fulfill({json:options.noTitle?{definitions_version:6,selected:false}:selected});
      if(url.pathname.endsWith('/achievements'))return route.fulfill({json:full});
      if(url.pathname==='/v1/me')return route.fulfill({json:options.signed?{authenticated:true,linked:true,driver:{public_id:id,display_name:data.driver.driver},steam:{persona_name:'Test pilot'}}:{authenticated:false}});
    }
    if(url.hostname==='data.asgracing.ru'){
      if(url.pathname===`/top-data/v2/drivers/${id}.json`)return route.fulfill({json:{...data.driver,avatar_url:null}});
      if(url.pathname===`/achievements/v1/drivers/${id}.json`)return route.fulfill({json:data.achievements});
      if(url.pathname==='/public-cache-clubs-teams/current.json')return route.fulfill({json:entities.pointer});
      const detail=url.pathname.match(/\/details\/(clubs|teams)\/([^/]+)\.json$/);
      if(detail&&url.pathname.includes('/public-cache-clubs-teams/'))return route.fulfill({json:entities.details[detail[1]+'/'+detail[2]]});
    }
    return fixture(route,[]);
  });
  const prefix=language==='en'?'/en/':'/';
  await page.goto(`${base}${prefix}driver/?id=${id}`,{waitUntil:'networkidle'});
  await page.locator('.profile-heading h1').waitFor();
  if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
  const title=await page.locator('.achievement-summary h3').textContent();
  assert.equal(title,options.failedTitle?(language==='ru'?'Временно недоступно':'Temporarily unavailable'):options.noTitle?(language==='ru'?'Не выбран':'Not selected'):selected.title);
  if(options.failedAvatar)assert.equal(await page.locator('.profile-portrait>span').count(),1);
  else {assert.equal(await page.locator('.profile-portrait img').getAttribute('src'),avatar);assert.ok(await page.locator('.profile-portrait img').evaluate(img=>img.complete&&img.naturalWidth>0));}
  assert.equal(await page.locator('.achievement-footer a[target="_blank"]').count(),0);
  await page.locator('[data-profile-achievements]').click();
  const modal=page.locator('#v2-modal');assert.equal(await modal.getAttribute('data-kind'),'achievements');
  await page.locator('#driver-achievements-widget[data-state="ready"]').waitFor();
  if(options.signed){
    await page.locator('.driver-achievements-tabs').waitFor();
    await page.locator('.driver-achievements-tab[data-category="speed"]').count();
    assert.ok(requests.includes(`/v1/drivers/${id}/achievements`));
    const tabs=page.locator('.driver-achievements-tabs button');await tabs.last().click();assert.ok(await page.locator('.driver-achievement-card').count());
  }else assert.equal(await page.locator('.driver-achievements-steam-cta').count(),1);
  assert.equal(await page.locator('.driver-achievements-driver-title').isVisible(),false,'Collection does not substitute an automatically awarded title');
  assert.ok(await modal.evaluate(n=>n.scrollWidth<=n.clientWidth+1),'Achievement modal fits');
  if(language==='ru'&&width===320)await page.screenshot({path:root+'/../tmp/v2-profile-collection-320.png'});
  await modal.locator('.modal-close').click();await page.locator('[data-profile-achievements]').click();await page.locator('#driver-achievements-widget[data-state="ready"]').waitFor();await modal.locator('.modal-close').click();
  await page.goto(`${base}${prefix}clubs/?slug=asg-racing`,{waitUntil:'networkidle'});
  await page.locator('.site-entity-hero').waitFor();
  const columns=page.locator('.site-detail-grid>div');
  assert.equal(await columns.nth(0).locator('.site-linked-list').count(),0);
  const teams=columns.nth(1).locator('section').nth(1).locator('.site-linked-list');assert.equal(await teams.count(),1);
  assert.equal(await columns.nth(1).locator('section').nth(0).locator('#site-entity-races').count(),1);
  assert.equal(await columns.nth(1).locator('section').nth(1).locator('.site-linked-list').count(),1);
  assert.equal(await teams.locator('a').first().getAttribute('href'),`${prefix}teams/detail/?slug=${entities.details['clubs/asg-racing'].teams[0].slug}`);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(language==='ru'&&width===1920)await page.screenshot({path:root+'/../tmp/v2-club-teams-right.png'});
  assert.deepEqual(errors,[]);await page.close();
}
try{
  for(const lang of ['ru','en'])for(const width of [1920,768,390,320])await check(lang,width);
  await check('ru',1920,{signed:true});
  await check('ru',390,{noTitle:true,failedAvatar:true});
  await check('en',390,{failedTitle:true,failedAvatar:true});
  console.log('Club teams/right column and driver Steam avatar/saved title/full collection: RU/EN, desktop/tablet/mobile, guest/signed-in, missing data, repeat open; no writes.');
}finally{await browser.close()}

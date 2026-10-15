import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
import {browser,base,fixture,root,snapshot} from './v2-browser-fixtures.mjs';

// Exercise the shipped controllers with intercepted data and no external writes.
const read=async name=>JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/'+name+'.json'),'utf8'));
const [publicData,champ,editorial,cars,stats,archive,entities]=await Promise.all(['public','championships','editorial','cars','fun-bans','archive','entities'].map(read));
const profile=structuredClone(publicData.driver);
profile.race_history=Array.from({length:85},(_,i)=>({...profile.race_history[i%profile.race_history.length],race_id:'pagination-fixture-'+i}));
const reports=[];
async function create(width){
  const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],reads=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
    const request=route.request();let u=new URL(request.url());
    if(request.method()!=='GET')return route.fulfill({status:403,body:'{}'});
    if(u.origin===base&&u.pathname.startsWith('/__asg_public__/'))u=new URL('https://data.asgracing.ru'+u.pathname.slice('/__asg_public__'.length)+u.search);
    let payload;
    if(u.origin===base&&u.pathname==='/news-content/news.json')payload=editorial.news;
    if(u.origin===base&&u.pathname==='/community/posts.js')return route.fulfill({contentType:'application/javascript',body:'window.ASG_COMMUNITY_POSTS='+JSON.stringify(editorial.community)});
    if(u.hostname==='data.asgracing.ru'){
      payload={'/hourly-data/announcement.json':publicData.event,'/hourly-data/schedule.json':publicData.schedule,'/hourly-data/races/races.json':publicData.recent,'/hourly-data/championships.json':champ.index,'/top-data/v2/cars/cars.json':cars.cars,'/top-data/bans.json':stats.bans,'/top-data/v2/drivers/drivers.json':stats.drivers,['/top-data/v2/drivers/'+profile.public_id+'.json']:profile,'/public-cache-clubs-teams/current.json':entities.pointer}[u.pathname];
      if(/^\/hourly-data\/events\/[^/]+\/index.json$/.test(u.pathname))payload=champ.seasons[u.pathname.split('/')[3]];
      const detail=u.pathname.match(/\/details\/(clubs|teams)\/([^/]+)\.json$/);
      if(detail&&u.pathname.includes('/public-cache-clubs-teams/')){
        payload=structuredClone(entities.details[detail[1]+'/'+detail[2]]);
        if(payload)payload.recent_races=Array.from({length:25},(_,i)=>({...payload.recent_races[i%10],race_uid:'pagination-entity-'+i,points:i}));
      }
      const ranking=u.pathname.match(/\/ratings\/(general|hourly|championship)\/(clubs|teams)\/page-(\d+)\.json$/);
      if(ranking)payload=entities.ratings[ranking[1]][ranking[2]][Number(ranking[3])-1];
      if(u.pathname==='/top-data/v2/manifest.json')payload={...snapshot.manifest,races:archive.manifest.races};
      if(/\/races\/chunk-\d+\.json$/.test(u.pathname)){
        reads.push(u.pathname);const chunk=Number(u.pathname.match(/chunk-(\d+)/)[1]);
        payload={items:archive.items.slice((chunk-1)*20,chunk*20),total_items:archive.items.length};
      }
    }
    if(payload!==undefined)return route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
    return fixture(route,[]);
  });
  return {page,errors,reads};
}
const cases=[
  ['driver/?id='+profile.public_id,'profile','#profile-history-content tbody tr'],
  ['races/','archive','.archive-table tbody tr'],
  ['hourly/','recent','.page-recent-race'],
  ['hourly/championship/?slug=october-2026','standing','#r24-season-standings tbody tr'],
  ['clubs/?slug=asg-racing','entity','#site-entity-races [data-page-race]'],
  ['teams/detail/?slug=asg-racing-ford-power','entity','#site-entity-races [data-page-race]'],
  ['cars/','cars','.r24-cars-table tbody tr'],
  ['bans/','bans','#site-bans-content tbody tr'],
  ['news/','news','.site-news-card'],
  ['community/','community','.site-post'],
  ['','recent','#v2-modal .page-recent-race']
];
async function current(pager,value){await pager.locator(`[aria-current="page"][data-pagination-page="${value}"]`).waitFor();}
async function jump(pager,value){await pager.locator('input[name="page"]').fill(String(value));await pager.locator('button[type="submit"]').click();}
try{
  for(const language of ['ru','en'])for(const width of [1920,390,320])for(const [route,name,rows] of cases){
    const {page,errors,reads}=await create(width),prefix=language==='en'?'/en/':'/';
    try{
      await page.goto(base+prefix+route,{waitUntil:'networkidle'});
      if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
      if(!route)await page.locator('#v2-recent-races').click();
      const pager=page.locator(`[data-pagination="${name}"]`);
      await current(pager,1);
      const max=Number(await pager.locator('input').getAttribute('max'));
      assert.ok(max>1,route+' needs multiple fixture pages');
      assert.equal(await pager.locator('input').getAttribute('aria-label'),language==='ru'?'Номер страницы':'Page number');
      const initial=await page.locator(rows).first().innerText();
      await pager.locator('[data-pagination-page="2"]').click();await current(pager,2);
      assert.notEqual(await page.locator(rows).first().innerText(),initial,route+' page 2 changes rows');
      await jump(pager,max);await current(pager,max);
      assert.equal(await pager.locator('nav>button').last().isDisabled(),true);
      await jump(pager,1);await current(pager,1);
      assert.equal(await pager.locator('nav>button').first().isDisabled(),true);
      assert.equal(await page.locator(rows).first().innerText(),initial,route+' returns to first rows');
      for(const invalid of ['0',String(max+1),'1.5','']){
        await pager.locator('input').fill(invalid);await pager.locator('input').press('Enter');await current(pager,1);
        assert.equal(await pager.locator('input').evaluate(n=>n.checkValidity()),false,'reject '+invalid);
      }
      await pager.locator('input').fill('2');await pager.locator('input').press('Enter');await current(pager,2);
      if(name==='profile'){
        assert.ok(await pager.locator('.page-gap').count(),'long list has compact gaps');
        await page.locator('#profile-race-search').fill('no-matching-circuit-fixture');await current(pager,1);
        assert.equal(await pager.locator('input').isDisabled(),true);
        assert.match(await pager.innerText(),/0–0 \/ 0/);
        await page.locator('#profile-race-search').fill('');await current(pager,1);
        assert.equal(await pager.locator('input').isDisabled(),false);
        await page.locator('#profile-race-sort').selectOption('position');await current(pager,1);
      }
      if(name==='archive')assert.equal(reads.length,2,'page jumps load only required chunks and reuse cache');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'document fits '+route);
      assert.ok(await pager.evaluate(n=>n.scrollWidth<=n.clientWidth+1),'pager fits '+route);
      const bounds=await pager.locator('form').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1,'jump is on screen');
      assert.deepEqual(errors,[]);
      if(language==='ru'&&['profile','recent'].includes(name)&&width!==390){await pager.scrollIntoViewIfNeeded();await page.screenshot({path:taskScratchPath(`pagination-${route?'page':'dialog'}-${name}-${width}.png`)});}
      reports.push({route:prefix+route,language,width,name,max,status:'passed'});
    }catch(error){console.error({route,language,width,name,errors});await page.screenshot({path:taskScratchPath('pagination-failure.png')});throw error;}
    finally{await page.close();}
  }
}finally{await browser.close();await fs.writeFile(taskScratchPath('pagination-browser.json'),JSON.stringify({reports,externalWrites:0},null,2));}
console.log(`Pagination passed: ${reports.length} RU/EN desktop/mobile checks; external writes 0.`);

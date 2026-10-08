import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
const entities=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/entities.json'),'utf8'));
const image=await fs.readFile(path.join(root,'assets/spa.jpg')),reports=[];
try {
 for(const lang of ['ru','en'])for(const width of [1440,768,320])for(const kind of ['club','team']) {
  const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],requested=[];let active=0,maxActive=0;
  page.on('pageerror',error=>errors.push(error.message));
  const detail=entities.details[kind==='club'?'clubs/asg-racing':'teams/asg-racing-ford-power'];
  await page.route('**/*',async route=>{
   const req=route.request();let u=new URL(req.url());
   if(req.method()!=='GET')return route.fulfill({status:403,body:'{}'});
   if(u.origin===base&&u.pathname.startsWith('/__asg_public__/'))u=new URL('https://data.asgracing.ru'+u.pathname.slice('/__asg_public__'.length)+u.search);
   if(u.hostname==='auth.asgracing.ru'&&u.pathname.endsWith('/steam-profile')) {
    const id=u.pathname.split('/').at(-2);requested.push(id);active++;maxActive=Math.max(maxActive,active);
    await new Promise(resolve=>setTimeout(resolve,60));active--;
    const idx=detail.roster.findIndex(p=>p.public_id===id);
    return route.fulfill({contentType:'application/json',body:JSON.stringify({avatar_url:idx===0?'https://avatars.steamstatic.com/test.jpg':idx===2?'https://avatars.steamstatic.com/missing.jpg':null})});
   }
   if(u.hostname==='avatars.steamstatic.com')return route.fulfill(u.pathname.includes('missing')?{status:404,body:''}:{contentType:'image/jpeg',body:image});
   if(u.hostname==='data.asgracing.ru') {
    let payload;
    if(u.pathname==='/public-cache-clubs-teams/current.json')payload=entities.pointer;
    const rating=u.pathname.match(/\/ratings\/(general|hourly|championship)\/(clubs|teams)\/page-(\d+)\.json$/);
    if(rating)payload=entities.ratings[rating[1]][rating[2]][Number(rating[3])-1];
    const d=u.pathname.match(/\/details\/(clubs|teams)\/([^/]+)\.json$/);
    if(d&&u.pathname.includes('/public-cache-clubs-teams/'))payload=entities.details[d[1]+'/'+d[2]];
    if(u.pathname.includes('/public-cache-clubs-teams/')&&u.pathname.includes('/assets/'))return route.fulfill({contentType:'image/jpeg',body:image});
    if(payload)return route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
   }
   return fixture(route,[]);
  });
  const url=(lang==='en'?'/en':'')+(kind==='club'?'/clubs/?slug=asg-racing':'/teams/detail/?slug=asg-racing-ford-power');
  await page.goto(base+url,{waitUntil:'networkidle'});
  await page.locator('.site-entity-hero').waitFor({timeout:12000});
  if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
  await page.locator('[data-entity-avatar]').first().scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('[data-entity-avatar] img')?.naturalWidth>0);
  assert.deepEqual(errors,[]);if(detail.roster.length>20)assert.ok(requested.length<detail.roster.length,'Offscreen avatars wait for scrolling');assert.ok(maxActive<=4,'At most four profile lookups');
  assert.ok(await page.locator('[data-entity-avatar]').nth(1).innerText(),'Missing avatar keeps initials');
  if(detail.roster.length>2)assert.equal(await page.locator('[data-entity-avatar]').nth(2).locator('img').count(),0,'Broken image keeps initials');
  const heights=await page.evaluate(()=>{
   const rows=[...document.querySelectorAll('#site-roster-content tbody tr,.site-linked-list>a,.site-linked-list>button')];
   const withImages=rows.map(r=>r.getBoundingClientRect().height);
   const style=document.createElement('style');style.textContent='.entity-miniature,.entity-track-miniature{display:none!important}.entity-roster-name,.entity-team-name,.entity-result-track{padding-left:0!important}';document.head.append(style);
   const withoutImages=rows.map(r=>r.getBoundingClientRect().height);style.remove();
   return {withImages,withoutImages};
  });
  assert.deepEqual(heights.withImages,heights.withoutImages,'Thumbnails keep row heights');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page fits viewport');
  await page.locator('#site-entity-races').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll('.entity-track-miniature')].some(img=>img.naturalWidth>0));
  if(kind==='club') {
   assert.equal(await page.locator('.entity-team-name').count(),detail.teams.length);
   await page.locator('.entity-team-name').first().scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('.team-miniature img')?.naturalWidth>0);
   assert.ok(await page.locator('.team-miniature').last().innerText(),'Missing team logo keeps abbreviation');
  }
  await page.locator('#site-roster-search').fill(detail.roster[0].display_name);
  await page.locator('[data-entity-avatar]').first().scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('[data-entity-avatar] img')?.naturalWidth>0);
  assert.equal(requested.filter(id=>id===detail.roster[0].public_id).length,1,'Filtering reuses cached avatar');
  reports.push({lang,width,kind,rows:heights.withImages.length,rowHeights:[...new Set(heights.withImages)],avatarLookups:requested.length,maxActive});
  await page.close();
 }
 await fs.writeFile(path.join(root,'../tmp/entity-thumbnails-check.json'),JSON.stringify(reports,null,2));
 console.log(JSON.stringify({cases:reports.length,reports}));
} finally {await browser.close();}

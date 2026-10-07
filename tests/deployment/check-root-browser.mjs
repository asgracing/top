// Every external request is intercepted; this check never uses real identities or writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root,site,snapshot} from './v2-browser-fixtures.mjs';
import {pageRegistry} from '../../v2/page-registry.js';
import {versionHref,languageHref,screenPath,migratedRoutes,excludedRoute} from '../../v2/site-routing.js';
const read=async name=>JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/'+name+'.json'),'utf8'));
const publicData=await read('public'),champ=await read('championships'),editorial=await read('editorial'),cars=await read('cars'),stats=await read('fun-bans');
const archive=await read('archive');
const reports=[],failures=[];
const queries={driver:'?id='+publicData.driver.public_id,race:'?id='+Object.keys(site.results)[0],championship:'?slug=october-2026',club:'?id=asg-racing',team:'?id=asg-racing-ford-power',article:'?id='+editorial.news.items[0].slug,document:'?id=privacy',guide:'?id=join'};
async function create(width=1920,options={}){
 const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],log=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('asgLang','en');localStorage.setItem('asg:lang',JSON.stringify({version:1,value:'en',expiresAt:0}));});
 await page.route('**/*',async route=>{
  const req=route.request();let u=new URL(req.url());
  if(req.method()!=='GET')return route.fulfill({status:403,body:'{}'});
  if(u.origin===base&&u.pathname.startsWith('/__asg_public__/'))u=new URL('https://data.asgracing.ru'+u.pathname.slice('/__asg_public__'.length)+u.search);
  if(u.hostname==='data.asgracing.ru'&&/\/missing-release-record(?:\.json|\/index\.json)$/.test(u.pathname))return route.fulfill({status:404,contentType:'application/json',body:'{}'});
  let payload;
  if(u.origin===base&&u.pathname==='/news-content/news.json')payload=editorial.news;
  if(u.origin===base&&u.pathname==='/community/posts.js')return route.fulfill({contentType:'application/javascript',body:'window.ASG_COMMUNITY_POSTS='+JSON.stringify(editorial.community)});
  if(u.hostname==='data.asgracing.ru'){
   payload={'/hourly-data/announcement.json':publicData.event,'/hourly-data/schedule.json':publicData.schedule,'/hourly-data/races/races.json':publicData.recent,'/hourly-data/championships.json':champ.index,'/top-data/v2/cars/cars.json':cars.cars,'/top-data/v2/fun-stats.json':stats.fun,'/top-data/bans.json':stats.bans,'/top-data/v2/drivers/drivers.json':stats.drivers,['/top-data/v2/drivers/'+publicData.driver.public_id+'.json']:publicData.driver}[u.pathname];
   if(/^\/hourly-data\/events\/[^/]+\/index.json$/.test(u.pathname))payload=champ.seasons[u.pathname.split('/')[3]];
   if(u.pathname.startsWith('/hourly-data/events/')&&u.pathname.endsWith('.jpg'))return route.fulfill({contentType:'image/jpeg',body:await fs.readFile(path.join(root,'assets/spa.jpg'))});
   if(u.pathname.startsWith('/hourly-data/races/')&&u.pathname!=='/hourly-data/races/races.json')payload=publicData.race;
  }
  if(payload!==undefined)return route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  if(u.hostname==='data.asgracing.ru'&&u.pathname==='/top-data/v2/manifest.json')return route.fulfill({contentType:'application/json',body:JSON.stringify({...snapshot.manifest,races:archive.manifest.races})});
  if(u.hostname==='data.asgracing.ru'&&/\/races\/chunk-\d+\.json$/.test(u.pathname)){const chunk=Number(u.pathname.match(/chunk-(\d+)/)[1]);return route.fulfill({contentType:'application/json',body:JSON.stringify({items:archive.items.slice((chunk-1)*20,chunk*20),total_items:archive.items.length})});}
  return fixture(route,log,options);
 });
 return {page,errors,log};
}
async function check(entry,lang,width=1920){
 const {page,errors}=await create(width),url=entry.target[lang]+(['privacy/','cookies/'].includes(entry.route)?'':queries[entry.screen]||'');
 try{
  console.log(`Root check ${lang}/${entry.screen}/${width}`);
  const response=await page.goto(base+url,{waitUntil:'networkidle'});assert.equal(response.status(),200);
  if(entry.screen==='home')await page.locator('#v2-day-driver').filter({hasText:/\S/}).waitFor();
  else {await page.locator('#page-view').waitFor();await page.waitForFunction(()=>document.querySelector('#page-view')?.innerText.trim().length>50);}
  await page.waitForTimeout(150);
  assert.deepEqual(errors,[],url);
  assert.equal(await page.locator('html').getAttribute('lang'),lang);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),entry.indexable?'index,follow':'noindex,follow','indexing '+url);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+url);
  const loc={href:page.url(),pathname:new URL(page.url()).pathname,origin:base},context={layout:'root',version:'v2'};
  for(const language of ['ru','en'])assert.equal(await page.locator(`.v2-language a[data-language="${language}"]`).getAttribute('href'),languageHref(language,loc,context));
  assert.equal(await page.locator('[data-v1-home]').getAttribute('href'),versionHref('old',loc,lang,context));
  if(entry.screen==='article')assert.ok(await page.locator('.site-article').count(),'real article, not a missing-entity view');
  if(entry.route==='cookies/')assert.match(await page.locator('#page-view').innerText(),/Cookie|куки/i);
  const links=await page.locator('#v2-site-shell a[href]').evaluateAll(nodes=>nodes.map(n=>({href:n.getAttribute('href'),version:n.hasAttribute('data-v1-home'),language:!!n.closest('.v2-language')})));
  for(const link of links){
   if(link.version||link.language||link.href.startsWith('#'))continue;
   const u=new URL(link.href,page.url());if(u.origin!==base)continue;
   const p=screenPath(u.pathname);if(!migratedRoutes.has(p)||excludedRoute(p))continue;
   assert.ok(!/^\/(?:v2|ru|old)\//.test(u.pathname),'wrong version link '+url+' -> '+link.href);
   if(lang==='en')assert.ok(u.pathname.startsWith('/en/'),'wrong language link '+url+' -> '+link.href);
  }
  reports.push({screen:entry.screen,language:lang,width,url,links:links.length,status:'passed'});
 }catch(e){failures.push({url,width,error:e.message,errors});console.error(failures.at(-1));}
 finally{await page.close();}
}
try{
 if(process.env.ASG_ROOT_BROWSER_STAGE!=='transitions'){
  for(const lang of ['ru','en'])for(const entry of pageRegistry)await check(entry,lang);
  for(const screen of ['home','hourly','driver','cars','championship','document','settings'])for(const lang of ['ru','en'])await check(pageRegistry.find(p=>p.screen===screen),lang,390);
  for(const width of [320,768,1280])for(const screen of ['home','hourly','driver','championship','settings'])await check(pageRegistry.find(p=>p.screen===screen),'ru',width);
  for(const lang of ['ru','en'])for(const screen of ['driver','article','championship']){
   const {page,errors}=await create(),entry=pageRegistry.find(p=>p.screen===screen),url=entry.target[lang]+'?id=missing-release-record';
   try{
    await page.goto(base+url,{waitUntil:'domcontentloaded'});
    await page.locator('#page-view .r24-error').waitFor();
    await page.waitForFunction(()=>document.querySelector('meta[name="robots"]')?.content==='noindex,follow');
    assert.deepEqual(errors,[]);reports.push({screen:'missing '+screen,language:lang,url,status:'passed'});
   }finally{await page.close();}
  }
 }
 // Use actual clicks, not just computed hrefs, to catch stale click handlers.
 const t=await create();await t.page.goto(base+'/driver/?id='+publicData.driver.public_id+'#history',{waitUntil:'networkidle'});
 await t.page.locator('[data-v1-home]').click();await t.page.waitForURL('**/old/driver/**');
 await t.page.locator('[data-v2-home]').waitFor();assert.equal(new URL(t.page.url()).searchParams.get('id'),publicData.driver.public_id);
 await t.page.locator('.lang-btn[data-lang="en"]').click();await t.page.waitForURL('**/old/en/driver/**');
 assert.equal(await t.page.locator('html').getAttribute('lang'),'en');
 await t.page.locator('[data-v2-home]').click();await t.page.waitForURL('**/en/driver/**');
 assert.equal(new URL(t.page.url()).searchParams.get('id'),publicData.driver.public_id);
 assert.equal(new URL(t.page.url()).hash,'#history');
 await t.page.reload({waitUntil:'networkidle'});await t.page.goBack({waitUntil:'networkidle'});
 assert.ok(new URL(t.page.url()).pathname.startsWith('/old/en/driver/'));await t.page.close();
 reports.push({screen:'version/language clicks and browser history',status:'passed'});
 const race=await create(),raceId=Object.keys(site.results)[0];
 await race.page.goto(base+'/old/races/?race_id='+raceId,{waitUntil:'networkidle'});
 await race.page.locator('#race-results-modal').waitFor();assert.deepEqual(race.errors,[]);await race.page.close();
 reports.push({screen:'direct legacy race result opens its modal',status:'passed'});
 for(const p of ['','hourly/','races/','hourly/championship/','account/','account/settings/','moderation/','portal-ops/','news/'])for(const lang of ['ru','en']){
  const t=await create(),url='/old/'+(lang==='en'?'en/':'')+p+(p==='hourly/championship/'?'?slug=october-2026':'');
  console.log('Legacy check '+url);
  await t.page.goto(base+url,{waitUntil:'networkidle'});await t.page.locator('[data-v2-home]').waitFor();
  assert.equal(await t.page.locator('html').getAttribute('lang'),lang);
  assert.deepEqual(t.errors,[],url);
  const loc={href:t.page.url(),pathname:new URL(t.page.url()).pathname,origin:base};
  assert.equal(await t.page.locator('[data-v2-home]').getAttribute('href'),versionHref('v2',loc,lang,{layout:'root',version:'old'}));
  const other=lang==='ru'?'en':'ru';await t.page.locator(`.lang-btn[data-lang="${other}"]`).first().click();
  await t.page.waitForURL(base+languageHref(other,loc,{layout:'root',version:'old'}));
  await t.page.waitForLoadState('networkidle');assert.equal(await t.page.locator('html').getAttribute('lang'),other);
  await t.page.close();reports.push({screen:'legacy '+p,language:lang,status:'passed'});
 }
 for(const lang of ['ru','en']){
  const t=await create(1920,{signed:true,admin:true});await t.page.goto(base+(lang==='en'?'/en/':'/'),{waitUntil:'networkidle'});
  await t.page.locator('#v2-profile-trigger').click();await t.page.locator('#v2-profile-popover').waitFor();
  for(const p of ['account/','account/settings/','moderation/','portal-ops/'])assert.ok(await t.page.locator(`#v2-profile-popover a[href="${lang==='en'?'/en/':'/'}${p}"]`).count());
  await t.page.close();reports.push({screen:'authenticated profile navigation',language:lang,status:'passed'});
 }
 // Existing analytics start only after consent and initialize once on each URL scheme.
 for(const lang of ['ru','en']){
  const t=await create();await t.page.goto(base+(lang==='en'?'/en/':'/'),{waitUntil:'networkidle'});
  await t.page.locator('.asg-legal-banner-btn-secondary').click();
  const metric=()=>t.log.filter(r=>r.url.includes('mc.yandex.ru/metrika/tag.js')).length;
  assert.equal(metric(),0);await t.page.locator('[data-cookie-settings]').first().click();
  await t.page.locator('.asg-legal-banner-btn-primary').click();await t.page.waitForFunction(()=>window.__v2MetrikaLoaded);
  assert.equal(metric(),1);assert.equal(await t.page.evaluate(()=>window.ym.a.filter(args=>args[1]==='init'&&args[0]===107697834).length),1);
  await t.page.locator('[data-cookie-settings]').first().click();await t.page.locator('.asg-legal-banner-btn-primary').click();assert.equal(metric(),1);
  await t.page.close();reports.push({screen:'Metrika consent and single initialization',language:lang,status:'passed'});
 }
}finally{
 await fs.writeFile(path.join(root,'../tmp/v2-step2-browser.json'),JSON.stringify({reports,failures,externalWrites:0},null,2));
 await browser.close();
}
assert.deepEqual(failures,[]);console.log(`Root browser passed: ${reports.length} checks, external writes 0.`);

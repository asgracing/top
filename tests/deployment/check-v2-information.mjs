// Actual V2 boot/render over public fixtures; external writes are blocked.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
import content from '../../v2/pages/information-content.js';
const editorial=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/editorial.json'),'utf8'));
const cars=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/cars.json'),'utf8'));
const championships=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/championships.json'),'utf8'));
const screens={about:'about/',instructions:'instructions/',guide:'join/',documents:'documents/',privacy:'privacy/',cookies:'cookies/',notfound:'404/'};
const reports=[];
const stage=process.env.ASG_V2_INFORMATION_STAGE||'all';
async function create(language='ru',width=1920,options={}){
 const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const request=route.request();let u=new URL(request.url());
  if(u.origin===base&&u.pathname.startsWith('/__asg_public__/'))u=new URL('https://data.asgracing.ru'+u.pathname.slice('/__asg_public__'.length)+u.search);
  if(request.method()!=='GET')return route.fulfill({status:403,body:'{}'});
  if(u.origin===base&&u.pathname==='/news-content/news.json')return route.fulfill({contentType:'application/json',body:JSON.stringify(editorial.news)});
  if(u.hostname==='data.asgracing.ru'&&u.pathname==='/top-data/v2/cars/cars.json')return route.fulfill({contentType:'application/json',body:JSON.stringify(cars.cars)});
  if(u.hostname==='data.asgracing.ru'&&u.pathname==='/hourly-data/championships.json')return route.fulfill({contentType:'application/json',body:JSON.stringify(championships.index)});
  if(u.hostname==='data.asgracing.ru'&&options.missing&&(/\/(?:drivers|profiles|details)\//.test(u.pathname)||/\/events\//.test(u.pathname)))return route.fulfill({status:404,body:'{}'});
  if(u.hostname==='data.asgracing.ru'&&options.offline)return route.fulfill({status:503,body:'{}'});
  return fixture(route,[]);
 });
 return {page,errors,language};
}
async function go(t,p,query=''){
 await t.page.goto(`${base}/v2/${t.language}/${p}${query}`,{waitUntil:'networkidle'});
 if(await t.page.locator('.asg-legal-banner-btn-secondary').isVisible())await t.page.locator('.asg-legal-banner-btn-secondary').click();
 try{await t.page.locator('#page-view h1').waitFor();}catch(error){console.log({url:t.page.url(),errors:t.errors,content:await t.page.locator('#page-view').innerText().catch(()=>''),headings:await t.page.locator('#page-view h1').count()});await t.page.screenshot({path:path.join(root,'../tmp/v2-information-failure.png')});throw error;}
}
try{
 if(stage==='all'||stage==='layouts'){
 for(const [screen,p] of Object.entries(screens))for(const lang of ['ru','en'])for(const width of [1920,1280,768,390,320]){
  if(process.env.ASG_V2_INFORMATION_SCREEN&&!process.env.ASG_V2_INFORMATION_SCREEN.split(',').includes(screen))continue;
  console.log(`Checking ${screen}/${lang}/${width}`);
  const t=await create(lang,width),{page}=t;await go(t,p);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${screen}/${lang}/${width} overflow`);
  assert.equal(await page.locator('html').getAttribute('lang'),lang);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
  assert.equal(await page.locator('meta[name="yandex-metrika-id"]').getAttribute('content'),'107697834');
  assert.equal(await page.locator('meta[name="legal-base-path"]').getAttribute('content'),`/v2/${lang}/`);
  assert.equal(await page.locator('#page-view h1').count(),1);
  if(screen==='instructions')assert.equal(await page.locator('.site-instruction-steps>article').count(),4);
  if(screen==='about')assert.equal(await page.locator('.r24-about-layout .site-reader>section').count(),4);
  if(screen==='documents')assert.equal(await page.locator('.site-document-card').count(),2);
  if(['privacy','cookies'].includes(screen)){
   assert.equal(await page.locator('.site-document-reader>section').count(),content.documents[screen].sections.length);
   assert.match(await page.locator('.site-document-reader').innerText(),/English Note/);
   assert.equal(await page.locator('.site-document-note').count(),lang==='en'?1:0);
  }
  for(const k of ['about','instructions','documents'])assert.equal(await page.locator(`[data-site-label="${k}"]`).getAttribute('href'),`/v2/${lang}/${k}/`);
  assert.equal(await page.locator('.footer-links a').first().getAttribute('href'),`/v2/${lang}/privacy/`);
  if(width===1920&&lang==='ru'||width===390&&lang==='ru'&&screen==='cookies')await page.screenshot({path:path.join(root,`../tmp/v2-information-${screen}-${width}.png`),fullPage:width===390});
  assert.deepEqual(t.errors,[]);await page.close();reports.push({screen,lang,width,layout:'passed'});
 }
 console.log('RU/EN layout variants passed.');
 }
 if(stage==='all'||stage==='interactions'){
 const t=await create(),{page}=t;await go(t,'documents/');
 await page.locator('.site-document-card').first().click();await page.waitForURL('**/documents/read/?id=privacy');await page.locator('.site-document-reader').waitFor();
 await page.locator('.site-document-toc a').nth(8).click();assert.match(page.url(),/#document-section-9$/);
 assert.ok(await page.locator('.center-column').evaluate(e=>e.scrollTop>0));
 await page.locator('.v2-language [data-language="en"]').click();await page.waitForURL('**/v2/en/**');await page.locator('.site-document-note').waitFor();assert.match(page.url(),/id=privacy#document-section-9$/);
 await page.locator('.footer-links a[href*="cookies"]').click();await page.waitForURL('**/v2/en/cookies/**');await page.locator('.site-document-reader').waitFor();
 await page.locator('.site-document-reader .legal-links-inline a[href*="privacy"]').click();await page.waitForURL('**/v2/en/privacy/**');await page.locator('.site-document-reader').waitFor();
 await page.locator('[data-cookie-settings]').click();await page.locator('.asg-legal-banner').waitFor();
 const consentLinks=await page.locator('.asg-legal-banner a.asg-legal-link[href]').evaluateAll(nodes=>nodes.map(a=>new URL(a.href).pathname));
 assert.ok(consentLinks.includes('/v2/en/privacy/'));assert.ok(consentLinks.includes('/v2/en/cookies/'));
 await page.locator('.asg-legal-banner-btn-secondary').click();
 await go(t,'instructions/');
 for(const kind of ['rules','elo','safety']){
  await page.locator(`.site-reference-card[data-modal="${kind}"]`).click();await page.locator('#v2-modal[open]').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('#v2-modal').evaluate(e=>e.open),false);
 }
 assert.deepEqual(t.errors,[]);await page.close();reports.push({interactions:'reader navigation, TOC, RU/EN hash, related policies, all reference modals passed'});
 }
 if(stage==='all'||stage==='states'){
 for(const [p,q,title] of [['join/','?id=absent','Инструкция'],['documents/read/','?id=absent','Документ'],['news/article/','?slug=absent','Новость'],['cars/','?car=absent','Машина'],['driver/','?id=absent','Пилот'],['race/','?id=absent','Гонка'],['hourly/championship/','?slug=absent','Чемпионат'],['clubs/','?slug=absent','Клуб'],['teams/detail/','?slug=absent','Команда']]){
  const s=await create('ru',390,{missing:true});await go(s,p,q);await s.page.locator('.r24-error').waitFor();assert.match(await s.page.locator('#missing-title').innerText(),new RegExp(title));assert.deepEqual(s.errors,[]);await s.page.close();
 }
 const failed=await create('ru',390,{offline:true});await go(failed,'driver/','?id=drv_b466bb6eedd8');assert.equal(await failed.page.locator('.r24-error-code').count(),0);assert.match(await failed.page.locator('#page-view h1').innerText(),/временно недоступны/);await failed.page.close();
 const unknown=await create();await go(unknown,'unavailable-page/');assert.match(unknown.page.url(),/\/404\/\?path=/);assert.match(await unknown.page.locator('.r24-error code').innerText(),/unavailable-page/);assert.deepEqual(unknown.errors,[]);await unknown.page.close();
 reports.push({states:'9 entity types, service outage distinct from 404, actual unknown URL fallback passed'});
 }
 await fs.writeFile(path.join(root,`../tmp/v2-information-browser-${stage}-report.json`),JSON.stringify(reports,null,2));console.log('Information checks passed: '+stage);
}catch(error){for(const page of browser.contexts().flatMap(c=>c.pages())){console.log({failedURL:page.url(),pageText:(await page.locator('#page-view').innerText().catch(()=>'')),runtimeText:(await page.locator('#v2-site-shell').innerText().catch(()=>'')).slice(0,120)});await page.screenshot({path:path.join(root,'../tmp/v2-information-interaction-failure.png')});}throw error;}finally{await browser.close();}

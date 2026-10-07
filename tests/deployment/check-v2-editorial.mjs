// Approved pages over public fixtures; no request writes to external services.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
import {prepareNews} from '../../v2/pages/editorial-model.js';
const editorial=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/editorial.json'),'utf8'));
const championships=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/championships.json'),'utf8'));
const paths={seasons:'hourly/championship/history',news:'news',article:'news/article',community:'community'},reports=[];
const stage=process.env.ASG_V2_EDITORIAL_STAGE||'all';
const selectors={seasons:'.site-season-card',news:'.site-news-card',article:'.site-article',community:'.site-post'};
async function create(screen,language='ru',width=1920,options={}){
 const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce',timezoneId:'America/Los_Angeles'}),errors=[],likes=new Set(),counts={news:0,posts:0,index:0,likes:0,writes:0};
 // Fixture POSTs exercise the deployed client; the local preview remains read-only.
 await page.addInitScript(()=>Object.defineProperty(window,'ASG_V2_READ_ONLY_PREVIEW',{get:()=>false,set(){}}));
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const request=route.request();let u=new URL(request.url());
  if(u.origin===base&&u.pathname.startsWith('/__asg_public__/'))u=new URL('https://data.asgracing.ru'+u.pathname.slice('/__asg_public__'.length)+u.search);
  if(u.origin===base&&u.pathname==='/__asg_community_likes__/likes')u=new URL('https://community-likes.asgracing.workers.dev/likes'+u.search);
  if(u.hostname==='community-likes.asgracing.workers.dev'){
   if(options.likesOffline||(request.method()==='POST'&&options.likeFailure))return route.fulfill({status:503,body:'{}'});
   if(request.method()==='POST'){
    counts.writes++;const body=JSON.parse(request.postData());assert.ok(body.voter_id);
    likes.add(body.post_id);if(options.delayedLike)await new Promise(resolve=>setTimeout(resolve,400));
    return route.fulfill({contentType:'application/json',body:JSON.stringify({likes:8,already_liked:true})});
   }
   counts.likes++;return route.fulfill({contentType:'application/json',body:JSON.stringify({items:Object.fromEntries((u.searchParams.get('post_ids')||'').split(',').map(id=>[id,{likes:likes.has(id)?8:7,already_liked:likes.has(id)}]))})});
  }
  if(request.method()!=='GET')return route.fulfill({status:403,body:'{}'});
  if(u.origin===base&&u.pathname==='/news-content/news.json'){
   counts.news++;if(options.offline)return route.fulfill({status:503,body:'{}'});
   return route.fulfill({contentType:'application/json',body:JSON.stringify(options.news||editorial.news)});
  }
  if(u.origin===base&&u.pathname==='/community/posts.js'){
   counts.posts++;if(options.offline)return route.fulfill({status:503,body:'{}'});
   return route.fulfill({contentType:'application/javascript',body:'window.ASG_COMMUNITY_POSTS='+JSON.stringify(options.posts||editorial.community)});
  }
  if(u.hostname==='data.asgracing.ru'){
   if(u.pathname==='/hourly-data/championships.json'){
    counts.index++;if(options.offline)return route.fulfill({status:503,body:'{}'});
    return route.fulfill({contentType:'application/json',body:JSON.stringify(options.index||championships.index)});
   }
   if(u.pathname==='/hourly-data/announcement.json')return route.fulfill({contentType:'application/json',body:JSON.stringify({championship_slug:'october-2026',...championships.seasons['october-2026'].upcoming_races[0]})});
   if(u.pathname==='/hourly-data/races/races.json')return route.fulfill({contentType:'application/json',body:JSON.stringify(championships.recent)});
   if(/^\/hourly-data\/events\/[^/]+\/index.json$/.test(u.pathname)){
    const value=championships.seasons[u.pathname.split('/')[3]];return route.fulfill({status:options.detailMissing?404:200,contentType:'application/json',body:JSON.stringify(value)});
   }
  }
  return fixture(route,[]);
 });
 return {page,screen,language,errors,counts,options};
}
async function go(t,query=''){
 if(t.screen==='article'&&!query)query='?slug='+prepareNews(editorial.news,t.language)[0].slug;
 await t.page.goto(`${base}/v2/${t.language}/${paths[t.screen]}/${query}`,{waitUntil:'networkidle'});
 if(await t.page.locator('.asg-legal-banner-btn-secondary').isVisible())await t.page.locator('.asg-legal-banner-btn-secondary').click();
}
try{
 if(stage==='all'||stage==='layouts'){
 for(const screen of Object.keys(paths))for(const language of ['ru','en'])for(const width of [1920,1280,768,390,320]){
  const t=await create(screen,language,width),{page}=t;await go(t);await page.locator(selectors[screen]).first().waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${screen}/${language}/${width} root overflow`);
  assert.equal(await page.locator('html').getAttribute('lang'),language);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
  assert.equal(await page.locator('meta[name="yandex-metrika-id"]').getAttribute('content'),'107697834');
  assert.equal(await page.locator('.dashboard').evaluate(e=>e.classList.contains('page-wide')),screen==='article');
  if(screen==='news')assert.equal(await page.locator('.site-news-card').count(),Math.min(6,prepareNews(editorial.news,language).length));
  if(screen==='seasons'){
   assert.equal(await page.locator('.site-season-card').count(),4);
   assert.equal(await page.locator('.site-season-card[href*="october-2026"]').count(),0);
   assert.equal(await page.locator('.season-status.status-finished').count(),3);
   assert.equal(await page.locator('.season-status.status-scheduled').count(),1);
   const colors=await page.locator('.status-finished').first().evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}));assert.equal(colors.background,'rgb(70, 83, 96)');
  }
  if(screen==='community'){
   assert.equal(await page.locator('.site-post').count(),3);
   assert.equal(await page.locator('.site-post-actions button[data-site-like]').first().isEnabled(),true);
   assert.ok((await page.locator('.site-post-actions button[data-site-like]').first().innerText()).includes('7'));
   assert.equal(await page.locator('meta[name="community-likes-api"]').getAttribute('content'),'https://community-likes.asgracing.workers.dev');
  }
  if(width===1920||width===390){await page.evaluate(()=>document.querySelector('.center-column').scrollTop=0);await page.screenshot({path:path.join(root,`../tmp/v2-${screen}-${language}-${width}.png`),fullPage:width===390});}
  assert.deepEqual(t.errors,[]);reports.push({screen,language,width,layout:'passed'});await page.close();
 }
 }
 if(stage==='all'||stage==='interactions'){
 const history=await create('seasons'),hp=history.page;await go(history);
 await hp.evaluate(()=>window.__historySearch=document.querySelector('#site-history-search'));
 await hp.locator('#site-history-search').fill('June');assert.equal(await hp.locator('.site-season-card').count(),1);
 await hp.locator('#site-history-status').selectOption('scheduled');assert.match(await hp.locator('#site-history-content').innerText(),/Сезоны не найдены/);
 await hp.locator('#site-history-status').selectOption('finished');assert.equal(await hp.locator('.site-season-card').count(),1);
 assert.equal(await hp.locator('.site-season-card').getAttribute('href'),'/v2/ru/hourly/championship/?slug=june-2026');
 assert.ok(await hp.evaluate(()=>window.__historySearch===document.querySelector('#site-history-search')));assert.equal(history.counts.index,1);
 assert.match(await hp.locator('.v2-language [data-language="en"]').getAttribute('href'),/q=June.*status=finished/);
 await hp.reload({waitUntil:'networkidle'});assert.equal(await hp.locator('#site-history-search').inputValue(),'June');
 await hp.locator('.site-season-card').click();await hp.waitForURL('**/v2/ru/hourly/championship/**');await hp.locator('.site-summary').first().waitFor();
 assert.deepEqual(history.errors,[]);await hp.close();reports.push({history:'real season details, current-season exclusion, colors, filters, stable controls/reload/language and detail transition passed'});

 const extended={items:[...editorial.news.items,...Array.from({length:8},(_,i)=>({id:'fixture-extra-'+i,slug:'fixture-extra-'+i,title:{en:'Fixture article '+i,ru:'Пример '+i},summary:{en:'Example',ru:'Пример'},body:['RU: Пример','EN: Example'],published_at:'2026-09-01',kind:'update'}))]};
 const news=await create('news','ru',1920,{news:extended}),np=news.page;await go(news);
 await np.evaluate(()=>{window.__newsSearch=document.querySelector('#site-news-search');window.__newsIntro=document.querySelector('.site-intro')});const reads=news.counts.news;
 await np.locator('[data-site-step="news"][data-step="1"]').click();assert.equal(await np.locator('.site-news-card').count(),6);assert.match(await np.locator('.page-pagination>span').last().innerText(),/^7–12/);
 await np.locator('#site-news-search').fill('Safety');assert.ok(await np.locator('.site-news-card').count()>0);
 await np.locator('#site-news-search').fill('no-such-article');assert.equal(await np.locator('.site-news-card').count(),0);
 await np.locator('#site-news-search').fill('');await np.locator('#site-news-kind').selectOption('announcement');assert.ok((await np.locator('.site-news-card').allTextContents()).length>0);
 assert.ok(await np.evaluate(()=>window.__newsSearch===document.querySelector('#site-news-search')&&window.__newsIntro===document.querySelector('.site-intro')));assert.equal(news.counts.news,reads);
 assert.match(await np.locator('.v2-language [data-language="en"]').getAttribute('href'),/kind=announcement/);
 await np.locator('#site-news-kind').selectOption('');const href=await np.locator('.site-news-card h2 a').first().getAttribute('href');
 await np.locator('.site-news-card h2 a').first().click();await np.waitForURL('**/v2/ru/news/article/**');await np.locator('.site-article').waitFor();
 assert.equal(new URL(np.url()).searchParams.get('slug'),new URL(href,base).searchParams.get('slug'));
 assert.ok(await np.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('asgReadNewsIds.v2'))||{}).length>0));
 await np.locator('.site-article>a.button').click();await np.waitForURL('**/v2/ru/news/');await np.locator('.site-news-card').first().waitFor();assert.match(await np.locator('.site-news-card .text-link').first().innerText(),/Прочитано/);
 await np.locator('#v2-notification-trigger').click();assert.ok((await np.locator('#v2-notification-popover-content a[data-news-read]').first().getAttribute('href')).startsWith('/v2/ru/news/article/?slug='));
 assert.deepEqual(news.errors,[]);await np.close();reports.push({news:'6-card pages, filters/empty state, stable DOM, real read-state synchronization and V2 notification/article links passed'});

 const community=await create('community','ru',1920,{delayedLike:true}),cp=community.page;await go(community);
 await cp.evaluate(()=>{window.__post=document.querySelector('.site-post');window.__image=document.querySelector('.site-post-gallery img')});
 const id=await cp.locator('[data-site-like]').first().getAttribute('data-site-like');await cp.locator('[data-site-like]').first().click();
 await cp.waitForFunction(id=>document.querySelector(`[data-site-like="${id}"]`)?.getAttribute('aria-pressed')==='true',id);
 assert.match(await cp.locator(`[data-site-like="${id}"]`).innerText(),/8/);assert.equal(await cp.locator(`[data-site-like="${id}"]`).isDisabled(),true);assert.equal(community.counts.writes,1);
 assert.ok(await cp.evaluate(()=>window.__post===document.querySelector('.site-post')&&window.__image===document.querySelector('.site-post-gallery img')));
 const photo=cp.locator('[data-site-image]').first();await photo.click();await cp.locator('#v2-modal[open] .site-zoom-image').waitFor();
 const src=await cp.locator('#v2-modal .site-zoom-image').getAttribute('src');assert.ok(src.startsWith('/news-content/'));
 await cp.keyboard.press('Escape');assert.equal(await cp.locator('#v2-modal').getAttribute('open'),null);
 await cp.locator('[data-site-step="community"][data-step="1"]').click();assert.equal(await cp.locator('.site-post').count(),2);assert.equal(community.counts.posts,1);assert.equal(community.counts.likes,1);
 assert.match(await cp.locator('.v2-language [data-language="en"]').getAttribute('href'),/page=2/);
 const joinHref=await cp.locator('.site-community-aside a[href*="/join/"]').getAttribute('href');assert.equal(joinHref,'/ru/join/');
 await cp.locator('[data-about-nav]').last().click();await cp.waitForURL('**/v2/ru/#about-server');await cp.waitForFunction(()=>document.querySelector('.about-more')?.open===true);
 assert.deepEqual(community.errors,[]);await cp.close();reports.push({community:'one-way likes/pending, no post repaint, image modal/Escape, 3-post pagination, language and about-server transitions passed'});

 }
 if(stage==='all'||stage==='states'){
 for(const [screen,options,query,expected] of [
 ['news',{news:{items:[]}},'','ничего не найдено'],['seasons',{index:{items:[]}},'','Сезоны не найдены'],['community',{posts:[]},'','Публикаций пока нет'],
 ['article',{},'?slug=absent','Новость не найдена'],['article',{news:{items:[{...editorial.news.items[0],id:'expired-article',slug:'expired-article',expires_at:'2026-09-01'}]}},'?slug=expired-article','Новость не найдена'],
 ['news',{offline:true},'','Данные временно недоступны'],['community',{offline:true},'','Данные временно недоступны'],['seasons',{detailMissing:true},'','Данные временно недоступны']]){
  const t=await create(screen,'ru',390,options);await go(t,query);assert.ok((await t.page.locator('#page-view').innerText()).includes(expected),screen+': '+expected);
  if(options.offline){options.offline=false;await t.page.locator('#page-view button').click();await t.page.locator(selectors[screen]).first().waitFor();}
  assert.deepEqual(t.errors,[]);await t.page.close();
 }
 const likesFailure=await create('community','en',390,{likesOffline:true});await go(likesFailure);assert.match(await likesFailure.page.locator('.site-post-actions small').first().innerText(),/Likes unavailable/);
 likesFailure.options.likesOffline=false;await likesFailure.page.locator('[data-likes-retry]').first().click();await likesFailure.page.locator('[data-site-like]').first().waitFor();await likesFailure.page.waitForFunction(()=>!document.querySelector('[data-site-like]').disabled);
 likesFailure.options.likeFailure=true;await likesFailure.page.locator('[data-site-like]').first().click();await likesFailure.page.waitForFunction(()=>document.querySelector('[data-likes-retry]'));assert.equal(await likesFailure.page.locator('[data-site-like]').first().getAttribute('aria-pressed'),'false');assert.deepEqual(likesFailure.errors,[]);await likesFailure.page.close();
 const legacy=await create('news','en',390);await go(legacy,'?slug=safety-rating-server-access');await legacy.page.locator('.site-article').waitFor();assert.equal(await legacy.page.locator('html').getAttribute('data-v2-page'),'article');assert.match(await legacy.page.locator('.site-intro h1').innerText(),/Server Access/);assert.ok(!(await legacy.page.locator('.site-article').innerText()).includes('На серверах ASG Racing'));assert.deepEqual(legacy.errors,[]);await legacy.page.close();
 reports.push({states:'empty pages, missing/expired article, offline/retry, missing season detail, like load/write failures and legacy article alias passed'});
 }
}finally{await browser.close();}
console.log(JSON.stringify(reports));

// Browser integration: live controllers, bounded public fixtures, intercepted writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..');
const snapshot=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-home/public.json'),'utf8'));
const site=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-home/site.json'),'utf8'));
let pw;for(const folder of await fs.readdir('C:/Users/Andrew/AppData/Local/npm-cache/_npx')){try{pw=await import(pathToFileURL(`C:/Users/Andrew/AppData/Local/npm-cache/_npx/${folder}/node_modules/playwright/index.mjs`).href);break}catch{}}
assert.ok(pw,'Playwright is required');
const browser=await pw.chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const base=process.env.ASG_V2_PREVIEW||'http://127.0.0.1:8840',reports=[];
let fixtureWrites=0;
const futureEvent=structuredClone(snapshot.event),futureDate=new Date(Date.now()+86400000).toISOString().slice(0,10);
futureEvent.date=futureDate;futureEvent.status='scheduled';futureEvent.launch_at=futureDate+'T19:50:00+03:00';
const signedDriver=snapshot.home.driver_of_the_day.public_id;
function pagePayload(entries,kind,context='general',rating=false){return {schema_version:1,kind:rating?'clubs_teams_rating_page':'clubs_teams_catalog_page',entity_type:kind==='clubs'?'club':'team',context,context_version:1,season_id:null,rating_run_id:site.pointer.rating_run_id,page:1,total_pages:1,total:entries.length,limit:100,offset:0,completed_at:site.pointer.completed_at,entries,entries_sha256:createHash('sha256').update(JSON.stringify(entries)).digest('hex')}}
const publicRows=snapshot.leaderboard.items;
async function fixture(route,log,options={}){
  const request=route.request(),u=new URL(request.url()),pathname=u.pathname;
  if(u.origin===base){return route.continue()}
  log.push({url:u.href,method:request.method()});
  let payload=null;
  if(u.hostname==='auth.asgracing.ru'){payload=options.signed?{authenticated:true,linked:true,driver:{public_id:signedDriver,display_name:'Andrei Soldatenkov [ASG]',profile_url:'/driver/?id='+signedDriver,rank:3,elo:1445,sr:9.99},steam:{persona_name:'Test pilot'},permissions:{moderation_issue:false,portal_manage:false},csrf_token:'test-only-csrf'}:{authenticated:false};}
  else if(u.hostname==='mc.yandex.ru'){return route.fulfill({status:200,contentType:'application/javascript',body:'window.__v2MetrikaLoaded=true;'})}
  else if(u.hostname==='data.asgracing.ru'){
    if(pathname==='/top-data/v2/manifest.json')payload=snapshot.manifest;
    else if(pathname==='/top-data/v2/home.json')payload=options.emptyHomePreviews?{...snapshot.home,leaderboard:[],bestlaps:[]}:snapshot.home;
    else if(pathname==='/top-data/server_status.json'){payload=structuredClone(snapshot.live_servers?{servers:snapshot.live_servers}:snapshot.servers);payload.updated_at=new Date().toISOString();for(const s of Object.values(payload.servers||{}))s.updated_at=payload.updated_at;}
    else if(pathname==='/hourly-data/announcement.json')payload=futureEvent;
    else if(pathname==='/hourly-data/schedule.json')payload={...snapshot.schedule,items:[futureEvent]};
    else if(pathname==='/donations-api/recent')payload=snapshot.donations;
    else if(pathname==='/top-data/v2/tracks/bestlaps.json')payload=snapshot.bestlap_tracks;
    else if(pathname==='/top-data/v2/tracks/bestlap-leaders.json')payload={items:[]};
    else if(pathname==='/public-cache-clubs-teams/current.json')payload=site.pointer;
    else if(pathname.endsWith('/manifest.json')&&pathname.includes('/public-cache-clubs-teams/'))payload={files:Object.keys(site.entity_details).map(key=>({path:'details/'+key+'.json'}))};
    else if(pathname.includes('/catalog/')){const kind=pathname.includes('/clubs/')?'clubs':'teams';payload=pagePayload(site.entities[kind],kind);}
    else if(pathname.includes('/ratings/')){const parts=pathname.split('/'),kind=parts.at(-2),context=parts.at(-3);payload=pagePayload(site.rankings?.[context]?.[kind]||[],kind,context,true);}
    else if(pathname.includes('/details/')&&pathname.includes('/public-cache-clubs-teams/')){const key=pathname.split('/details/')[1].replace('.json','');payload=site.entity_details[key]}
    else if(pathname.startsWith('/top-data/v2/drivers/')){const profile=snapshot.profiles[pathname.split('/').pop().replace('.json','')]||site.profiles[pathname.split('/').pop().replace('.json','')];if(profile)payload={...profile,summary:profile.summary||Object.fromEntries(['races','wins','podiums','elo','safety_rating','points'].map(key=>[key,profile[key]])),races:Array.isArray(profile.races)?profile.races:[]};}
    else if(pathname.startsWith('/top-data/v2/races/details/'))payload=site.results[pathname.split('/').pop().replace('.json','')]||{...snapshot.home.latest_hourly_race,results:[{...publicRows[0],position:1,points:130,elo_rating_delta:18,safety_delta:.12,car_model_id:21,best_lap:'1:43.905'}]};
    else if(pathname.startsWith('/top-data/v2/tables/')){
      const p=Number(pathname.match(/page-(\d+)/)?.[1]||1),chunk=pathname.includes('chunk-'),safety=pathname.includes('/safety/'),best=pathname.includes('/bestlaps');
      const rows=best?snapshot.bestlap_tables[ pathname.match(/bestlaps-([^/]+)/)?.[1]||'monza']?.items||snapshot.home.bestlaps:safety?snapshot.home.safety:publicRows;
      payload={items:chunk?rows.slice(0,100):rows.slice((p-1)*10,p*10),page:p,page_size:10,total_items:rows.length,total_pages:Math.ceil(rows.length/10)};
    }
    else if(pathname.startsWith('/hourly-votes-api/')){
      if(request.method()!=='GET')fixtureWrites++;
      const eventId=snapshot.event.event_id;
      if(pathname.endsWith('/voter-token'))payload={voter_token:'test-only-browser-token',expires_at:new Date(Date.now()+3600000).toISOString()};
      else if(pathname.endsWith('/votes'))payload={items:{[eventId]:{event_id:eventId,votes:4,already_voted:false}}};
      else if(pathname.endsWith('/vote')){assert.equal(request.headers().authorization,'Bearer test-only-browser-token');if(options.failVote)return route.fulfill({status:500,contentType:'application/json',body:'{}'});payload={event_id:eventId,votes:5,already_voted:true}}
      else if(pathname.endsWith('/unvote')){assert.equal(request.headers().authorization,'Bearer test-only-browser-token');payload={event_id:eventId,votes:4,already_voted:false}}
    }
    else if(pathname.includes('/achievements/'))payload={items:[],earned:0,total:0};
  }
  if(payload!=null)return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
  return route.fulfill({status:404,contentType:'application/json',body:'{}'});
}
try{
  for(const [width,height] of [[1920,936],[1280,720],[390,844],[320,844]])for(const language of ['ru','en']){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[],log=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>fixture(route,log));
    await page.goto(`${base}/v2/${language}/`,{waitUntil:'networkidle'});
    await page.waitForTimeout(500);
    await fs.mkdir(path.join(root,'design-research/v2-verification'),{recursive:true});
    if(width===1920||width===390)await page.screenshot({path:path.join(root,`design-research/v2-verification/home-${language}-${width}.png`)});
    const info=await page.evaluate(()=>({language:document.documentElement.lang,overflow:document.documentElement.scrollWidth-innerWidth,rows:document.querySelectorAll('#v2-rating-table tbody tr[data-row]').length,servers:document.querySelectorAll('#v2-servers .server-card').length,event:document.getElementById('v2-event-track').textContent,duplicates:[...document.querySelectorAll('[id]')].map(n=>n.id).filter((id,i,ids)=>ids.indexOf(id)!==i),geometry:['.site-shell','.dashboard','.page-intro','.winner-panel','.support-panel'].map(s=>{const el=document.querySelector(s),c=getComputedStyle(el);return {s,display:c.display,opacity:c.opacity,visibility:c.visibility,rect:el.getBoundingClientRect().toJSON(),clip:c.clipPath}})}));
    console.log(JSON.stringify({width,language,errors,rows:info.rows,servers:info.servers,overflow:info.overflow}));
    assert.deepEqual(errors,[]);assert.equal(info.language,language);assert.ok(info.overflow<=1,`overflow ${width}`);assert.equal(info.rows,10);assert.deepEqual(info.duplicates,[]);
    assert.equal(await page.locator('meta[name="yandex-metrika-id"]').getAttribute('content'),'107697834');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
    assert.ok(!log.some(x=>x.url.includes('mc.yandex.ru')),'No analytics without consent');
    if(width===1920){
      await page.locator('.asg-legal-banner-btn-secondary').click();
      await page.locator('#v2-race-vote').click();await page.waitForTimeout(350);assert.match(await page.locator('#v2-race-vote').textContent(),language==='ru'?/отменить/:/cancel/);
      await page.locator('#v2-race-vote').click();await page.waitForTimeout(350);
      await page.locator('#v2-rating-table tbody tr').first().click({position:{x:15,y:15}});assert.equal(await page.locator('#driver-preview-modal').getAttribute('aria-hidden'),'false');await page.locator('#driver-preview-close').click();
      await page.locator('[data-modal="event"]').click();assert.equal(await page.locator('#hourly-details-modal').getAttribute('aria-hidden'),'false');await page.locator('#hourly-details-close').click();
      await page.locator('#v2-rating-table [data-rating="elo"]').first().click();assert.equal(await page.locator('#elo-modal').getAttribute('aria-hidden'),'false');await page.locator('#elo-modal-close').click();
      await page.locator('#v2-rating-table [data-rating="sr"]').first().click();assert.equal(await page.locator('#safety-modal').getAttribute('aria-hidden'),'false');await page.locator('#safety-modal-close').click();
      await page.locator('#v2-site-shell [data-tab="bestlaps"]').click();await page.waitForTimeout(250);assert.equal(await page.locator('#v2-ranking-track').isVisible(),true);assert.equal(await page.locator('#v2-rating-table tbody tr[data-row]').count(),10);
      await page.locator('#v2-site-shell [data-tab="safety"]').click();await page.waitForTimeout(250);assert.equal(await page.locator('#v2-rating-table tbody tr[data-row]').count(),10);
      await page.locator('#v2-site-shell [data-tab="clubs"]').click();assert.ok(await page.locator('#v2-rating-table tbody tr[data-row]').count()>0);
      await page.locator('#v2-ranking-club-type').selectOption('clubs');assert.ok(await page.locator('#v2-rating-table tbody a[href*="/clubs/"]').count()>0);
      await page.locator('#v2-ranking-club-context').selectOption('hourly');await page.waitForTimeout(250);assert.ok(await page.locator('#v2-rating-table tbody tr[data-row]').count()>0);
      await page.locator('#v2-site-shell [data-tab="leaderboard"]').click();await page.waitForTimeout(250);
      await page.locator('#v2-welcome-widget summary').click();assert.equal(await page.locator('#top-guide').isVisible(),true);await page.keyboard.press('Escape');
      await page.locator('#v2-stream-widget summary').click();assert.equal(await page.locator('#v2-stream-popover').evaluate(n=>n.matches(':popover-open')),true);await page.locator('#v2-stream-popover [data-close-popover]').click();
      await page.locator('[data-cookie-settings]').first().click();assert.equal(await page.locator('.asg-legal-banner').isVisible(),true);await page.locator('.asg-legal-banner-btn-primary').click();await page.waitForTimeout(150);assert.equal(log.filter(x=>x.url.includes('mc.yandex.ru/metrika/tag.js')).length,1);assert.equal(await page.evaluate(()=>window.ym.a.filter(args=>args[1]==='init').length),1);
      await page.locator('[data-widget-dock="support"]').click();assert.equal(await page.locator('.left-column').getAttribute('data-dock-open'),'false');await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.left-column').getAttribute('data-dock-open'),'false');
    }
    reports.push({width,height,language,rows:info.rows,servers:info.servers});await page.close();
  }
  for(const options of [{signed:true},{failVote:true},{emptyHomePreviews:true}]){
    const page=await browser.newPage({viewport:{width:1920,height:936},reducedMotion:'reduce'}),log=[],errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>fixture(r,log,options));
    await page.goto(base+'/v2/',{waitUntil:'networkidle'});assert.ok(page.url().endsWith('/v2/ru/'));await page.waitForTimeout(250);
    if(options.signed){assert.equal(await page.locator('#v2-rating-table .current-user-row').count(),1);await page.locator('.pilot-profile-trigger').click();assert.equal(await page.locator('.auth-header [href*="/moderation/"]').count(),0);assert.equal(await page.locator('.auth-header [href*="/portal-ops/"]').count(),0)}
    else if(options.failVote){await page.locator('#v2-race-vote').click();await page.waitForTimeout(200);assert.equal(await page.locator('#v2-participation-note .v2-error').count(),1);assert.ok(!(await page.locator('#v2-race-vote').textContent()).includes('\u043e\u0442\u043c\u0435\u043d\u0438\u0442\u044c'))}
    else{assert.equal(await page.locator('#v2-rating-table tbody tr[data-row]').count(),10);await page.locator('#v2-site-shell [data-tab="bestlaps"]').click();await page.waitForTimeout(250);assert.equal(await page.locator('#v2-rating-table tbody tr[data-row]').count(),10)}
    assert.deepEqual(errors,[]);await page.close();
  }
  await fs.writeFile(path.join(root,'design-research/v2-verification/report.json'),JSON.stringify({reports,fixtureWrites,productionWrites:0},null,2));
}finally{await browser.close()}

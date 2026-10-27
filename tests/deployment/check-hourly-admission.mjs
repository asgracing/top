// Real renderers and modal clicks; all external traffic is intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
const root=path.resolve(import.meta.dirname,'../..'),compiled=process.env.ASG_V2_OUTPUT_DIR;
assert.ok(compiled,'Build into ASG_V2_OUTPUT_DIR first');
const server=http.createServer(async(req,res)=>{
  try {
    const relative=decodeURIComponent(new URL(req.url,'http://fixture').pathname).replace(/^\/+/,''),file=relative.endsWith('/')?relative+'index.html':relative;
    let raw;
    for(const folder of [compiled,root]) {
      const full=path.resolve(folder,file);assert.ok(full.startsWith(path.resolve(folder)+path.sep));
      try {raw=await fs.readFile(full);break;} catch {}
    }
    assert.ok(raw);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'});res.end(raw);
  } catch {res.writeHead(404);res.end('not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;process.env.ASG_V2_PREVIEW=base;
const {browser,fixture,snapshot}=await import('./v2-browser-fixtures.mjs');
const source=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/public.json'),'utf8'));
const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10),slug='fixture-season';
const event={...source.event,date:tomorrow,status:'scheduled',event_id:'hourly_sr33_fixture',championship_slug:slug,
  competition_mode:'standalone',event_type:'hourly',launch_at:tomorrow+'T19:00:00+03:00',
  server:{...source.event.server,sr_requirement:2.5,racecraft_rating_requirement:2.5}};
const round={...event,event_id:'hourly_sr33_round',competition_mode:'championship',event_type:'championship',start_time_local:'21:00'};
const championship={slug,title:'Fixture season',status:'active',period:'Fixture',standings:[],races:[],upcoming_races:[round]};
event.championship=championship;
const status=structuredClone(snapshot.live_servers?{servers:snapshot.live_servers}:snapshot.servers);
status.updated_at=new Date().toISOString();
for(const s of Object.values(status.servers))s.updated_at=status.updated_at;
delete status.servers.hourly.sr_requirement;
status.servers.hourly.admission_ready=false;
const reports=[],nonGet=[];let writes=0;
try {
  for(const language of ['ru','en'])for(const width of [1280,390])for(const screen of ['home','hourly','championship','servers']) {
    const page=await browser.newPage({viewport:{width,height:940},reducedMotion:'reduce'}),errors=[],log=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
      const req=route.request();let u=new URL(req.url());
      if(u.origin===base&&u.pathname.startsWith('/__asg_public__/'))u=new URL('https://data.asgracing.ru'+u.pathname.slice('/__asg_public__'.length)+u.search);
      if(req.method()!=='GET')nonGet.push({method:req.method(),host:u.hostname,path:u.pathname});
      if(req.method()==='POST'&&/\/hourly-votes-api\/(vote|unvote)$/.test(u.pathname))writes++;
      let payload;
      if(u.hostname==='data.asgracing.ru') {
        if(u.pathname==='/top-data/server_status.json')payload=status;
        else if(u.pathname==='/hourly-data/announcement.json')payload=event;
        else if(u.pathname==='/hourly-data/schedule.json')payload={items:[event,round]};
        else if(u.pathname==='/hourly-data/races/races.json')payload=source.recent;
        else if(u.pathname==='/hourly-data/championships.json')payload={items:[championship]};
        else if(u.pathname.startsWith('/hourly-data/events/'+slug+'/'))payload=championship;
      }
      if(payload!==undefined)return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
      return fixture(route,log);
    });
    const url=screen==='home'?'':screen==='championship'?'hourly/championship/?season='+slug:screen+'/';
    await page.goto(base+'/v2/'+language+'/'+url,{waitUntil:'networkidle'});
    const consent=page.locator('.asg-legal-banner-btn-secondary');if(await consent.isVisible())await consent.click();
    if(screen==='home'||screen==='servers') {
      const card=page.locator((screen==='home'?'#v2-servers':'#server-directory-grid')+' [data-server="hourly"]');
      await card.waitFor();assert.match(await card.innerText(),/SR\s*3[.,]3/);
      await card.click();await page.waitForFunction(()=>document.querySelector('#v2-modal')?.open);
      assert.match(await page.locator('#v2-modal .server-parameter-row').innerText(),/SR\s*3[.,]3/);
      await page.keyboard.press('Escape');
    }
    if(screen==='home') {
      assert.match(await page.locator('#v2-event-facts').innerText(),/SR\s*3[.,]3/);
      await page.locator('#v2-site-shell [data-modal="event"]').first().click();
    } else if(screen==='hourly'||screen==='championship') {
      const cards=page.locator('.page-event-card');await cards.first().waitFor();
      for(const card of await cards.all())assert.match(await card.innerText(),/SR\s*3[.,]3/);
      await cards.first().locator('[data-page-event]').click();
    }
    if(screen!=='servers') {
      await page.waitForFunction(()=>document.querySelector('#v2-modal')?.open);
      assert.match(await page.locator('#v2-modal .race-summary').innerText(),/SR\s*3[.,]3/);
      await page.keyboard.press('Escape');
    }
    if(screen==='hourly') {
      await page.locator('.page-calendar [data-page-event]').first().click();
      await page.waitForFunction(()=>document.querySelector('#v2-modal')?.open);
      assert.match(await page.locator('#v2-modal .race-summary').innerText(),/SR\s*3[.,]3/);
      await page.keyboard.press('Escape');
    }
    assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(screen==='hourly')await page.screenshot({path:taskScratchPath(`sr33-${language}-${width}.png`)});
    reports.push({language,width,screen,passed:true});await page.close();
  }
  assert.equal(writes,0);await fs.writeFile(taskScratchPath('browser-validation.json'),JSON.stringify({reports,writes,nonGet},null,2));
  console.log(JSON.stringify({scenarios:reports.length,remote_writes:writes,threshold:3.3,calendar_modal:true}));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}

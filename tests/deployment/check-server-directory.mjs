// Full V2 render, intercepted telemetry and no production writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
import {pageRegistry} from '../../v2/page-registry.js';

const root=path.resolve(import.meta.dirname,'../..'),compiled=process.env.ASG_V2_OUTPUT_DIR;
assert.ok(compiled,'Build V2 into ASG_V2_OUTPUT_DIR first');
const output=taskScratchPath('server-directory-browser');await fs.mkdir(output,{recursive:true});
const fixture=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-home/public.json'),'utf8'));
let pw;
for(const folder of await fs.readdir('C:/Users/Andrew/AppData/Local/npm-cache/_npx')){
  try{pw=await import(pathToFileURL(`C:/Users/Andrew/AppData/Local/npm-cache/_npx/${folder}/node_modules/playwright/index.mjs`).href);break}catch{}
}
assert.ok(pw,'Existing Playwright installation required');
const server=http.createServer(async(req,res)=>{
  try{
    const relative=decodeURIComponent(new URL(req.url,'http://fixture').pathname).replace(/^\/+/,''),file=relative.endsWith('/')?relative+'index.html':relative;
    let raw;
    for(const base of [compiled,root]){
      const full=path.resolve(base,file);if(!full.startsWith(path.resolve(base)+path.sep))throw Error('Invalid path');
      try{raw=await fs.readFile(full);break}catch{}
    }
    if(!raw)throw Error('Not found');
    res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream'});res.end(raw);
  }catch{res.writeHead(404);res.end('not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await pw.chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
function status(count,stale=false){
  const observed=new Date(Date.now()-(stale?600000:0)).toISOString();
  const ids=['hourly','main','sunset',...Array.from({length:Math.max(0,count-3)},(_,i)=>'assetto-corsa-competizione-dedic'+(i?'-'+(i+1):''))].slice(0,count);
  return {schema_version:3,source:'asg-live-telemetry-status',updated_at:observed,servers:Object.fromEntries(ids.map((id,index)=>{
    const drivers=[1,2].map(position=>({car_id:position,position,race_number:position,name:'Fixture pilot '+position,connected:true,lap_count:4,
      best_lap_ms:108000,last_lap_ms:109000,car_model_id:35,elo:1200,safety_rating:5,
      gap_to_ahead_ms:position===2?1234:null,laps_behind_ahead:0,pit_state:position===2?'pit_box':'on_track',pit_source:'acc-native',
      world_x:100+position*10,world_z:-50,coordinates_source:'acc-native-world-xz',position_age_ms:0,position_observed_at:observed}));
    const track=['monza','mount_panorama','spa','nurburgring_24h'][index%4];
    return [id,{id,name:'ASG Racing '+(index===ids.length-1?'Long final server name — Mount Panorama endurance practice':'Server '+String(index+1).padStart(2,'0')),
      source:'acc-local-telemetry',status:'online',telemetry_state:'live',server_online:true,observed_at:observed,updated_at:observed,source_age_ms:0,
      players_online:2,drivers_connected:2,driver_capacity:34,roster_complete:true,track_code:track,sa_requirement:70,sr_requirement:3.3,
      session:{type:'Race',phase:'session',remaining_ms:720000},drivers,
      track_map:{source:'acc-native-complete-lap',points:Array.from({length:24},(_,i)=>[500*Math.cos(i/12*Math.PI),500*Math.sin(i/12*Math.PI)])}}];
  }))};
}
const reports=[];
try{
  // Navigation is present before JS on every generated route, both languages.
  for(const language of ['ru','en'])for(const entry of pageRegistry){
    const html=await fs.readFile(path.join(compiled,'v2',language,entry.route,'index.html'),'utf8');
    assert.match(html,/<a[^>]*data-route="servers\/"[^>]*data-server-nav/);
    assert.match(html,/<a[^>]*data-copy="serverDetails"/);
  }
  const cases=[...([9,10,15,30].map(count=>({count,language:'ru',width:1280,height:800,screen:'home'}))),
    {count:30,language:'en',width:1920,height:1080,screen:'home'},
    {count:30,language:'ru',width:1366,height:650,screen:'home'},
    {count:30,language:'en',width:390,height:844,screen:'home'},
    {count:30,language:'ru',width:768,height:1024,screen:'home'},
    ...[['ru',1280,800],['en',1920,1080],['ru',390,844],['en',320,760]].map(([language,width,height])=>({count:30,language,width,height,screen:'servers'})),
    {count:30,language:'en',width:1280,height:800,screen:'servers',stale:true},
    {count:0,language:'ru',width:390,height:844,screen:'servers',unavailable:true}];
  for(const test of cases){
    console.log('Checking server layout',JSON.stringify(test));
    const {count,language,width,height,screen}=test;
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];
    let writes=0,reads=0,live=status(count,test.stale);
    page.on('pageerror',e=>errors.push(String(e)));
    await page.route('**/*',async route=>{
      const req=route.request(),url=new URL(req.url());if(url.origin===base)return route.continue();
      if(req.method()!=='GET')writes++;
      let data={};
      if(url.hostname==='data.asgracing.ru'){
        if(url.pathname.endsWith('/server_status_live.json')){reads++;if(test.unavailable)return route.fulfill({status:503,body:'{}'});data=live;}
        else if(url.pathname.endsWith('/server_status.json'))return route.fulfill({status:503,body:'{}'});
        else if(url.pathname.endsWith('/v2/manifest.json'))data=fixture.manifest;
        else if(url.pathname.endsWith('/v2/home.json'))data=fixture.home;
        else if(url.pathname.includes('/v2/tables/'))data={items:[],total_items:0,total_pages:1,page:1,page_size:10};
      }else if(url.hostname==='auth.asgracing.ru')data={authenticated:false};
      return route.fulfill({contentType:url.pathname.endsWith('.js')?'text/javascript':'application/json',body:url.pathname.endsWith('.js')?'':JSON.stringify(data)});
    });
    await page.goto(base+'/v2/'+language+'/'+(screen==='servers'?'servers/':''),{waitUntil:'domcontentloaded'});
    const dismiss=page.locator('.asg-legal-banner-btn-secondary');if(await dismiss.isVisible())await dismiss.click();
    const locale=page.locator('.locale-suggestion-dismiss');if(await locale.isVisible())await locale.click();
    const container=page.locator(screen==='home'?'#v2-servers':'#server-directory-grid');
    if(test.unavailable){
      await page.waitForFunction(()=>document.querySelector('#server-directory-grid .page-empty')?.textContent.includes('недоступны'));
      assert.equal(await container.locator('[data-server]').count(),0);
    }else{
      try {
        await page.waitForFunction(({selector,count})=>document.querySelectorAll(selector+' [data-server]').length===count,
          {selector:screen==='home'?'#v2-servers':'#server-directory-grid',count});
      } catch(error) {
        await page.screenshot({path:path.join(output,'failure.png')});
        throw new Error(JSON.stringify({test,errors,reads,heading:await page.locator('h1').allTextContents(),cards:await container.locator('[data-server]').count()}),{cause:error});
      }
      assert.equal(await page.locator('[data-server-nav]').first().getAttribute('href'),'/v2/'+language+'/servers/');
      const cards=container.locator('[data-server]');
      const heights=await cards.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
      assert.ok(Math.min(...heights)>=(screen==='home'?63:220),'Every card retains readable height');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No horizontal page overflow');
      if(screen==='home'){
        assert.equal(await container.evaluate(e=>getComputedStyle(e).overflowY),'auto');
        if(count===30)assert.equal(await container.evaluate(e=>e.scrollHeight>e.clientHeight+100),true,'Thirty cards have a bounded scroll area');
        assert.equal(await page.locator('.servers-foot a').getAttribute('href'),'/v2/'+language+'/servers/');
      }else{
        for(const aside of await page.locator('.dashboard>aside').all())assert.equal(await aside.isVisible(),false,'Directory has no side widgets');
        assert.equal(await page.locator('.knowledge').isVisible(),false,'Directory contains only server content');
        assert.match(await cards.first().getAttribute('style'),/\/assets\/v2-light\/tracks\/.*\.webp/);
        await page.screenshot({path:path.join(output,`directory-top-${language}-${width}.png`)});
      }
      if(screen==='home'&&count===15){
        await page.locator('.servers-foot a').click();
        await page.waitForURL(base+'/v2/'+language+'/servers/');
        await page.waitForFunction(()=>document.querySelectorAll('#server-directory-grid [data-server]').length===15);
        assert.equal(await page.locator('.dashboard>aside').first().isVisible(),false);
      }
      if(test.stale){
        assert.equal(await container.locator('.is-stale').count(),count);
        assert.match(await page.locator('#server-directory-summary').innerText(),/—/);
      }else if(count===30){
        const last=cards.last(),key=await last.getAttribute('data-server');
        await last.scrollIntoViewIfNeeded();
        if(screen==='home'){
          assert.equal(await last.evaluate(e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return r.top>=p.top-1&&r.bottom<=p.bottom+1;}),true,'Last widget row is reachable');
        }
        await page.screenshot({path:path.join(output,`${screen}-${language}-${width}-${height}.png`),fullPage:screen==='servers'});
        const scroll=await container.evaluate(e=>e.scrollTop);
        // Opening a card refreshes the real shared model. It must preserve list scroll and modal focus return.
        const row=live.servers[key];row.drivers[1].gap_to_ahead_ms=2345;row.updated_at=new Date().toISOString();row.observed_at=row.updated_at;
        live.updated_at=row.updated_at;
        await last.click();
        await page.waitForFunction(()=>document.querySelector('#v2-modal')?.open&&[...document.querySelectorAll('#v2-modal .pilot-interval')].some(node=>node.textContent.includes('2.345')));
        assert.equal(await page.locator('#v2-modal .server-driver-list tbody tr').count(),2);
        assert.ok(await page.locator('#v2-modal .pilot-pit').count()>0);
        assert.ok(await page.locator('#v2-modal .server-track-map svg').count()>0,'Existing live map is reused');
        assert.equal(await container.evaluate(e=>e.scrollTop),scroll,'Refresh preserves widget scroll');
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(()=>document.activeElement?.dataset?.server),key,'Focus returns to refreshed card');
        await page.locator(screen==='home'?'#v2-servers [data-server="'+key+'"]':'#server-directory-grid [data-server="'+key+'"]').press('Enter');
        await page.waitForFunction(()=>document.querySelector('#v2-modal')?.open);
        await page.keyboard.press('Escape');
        assert.ok(reads>=2,'Opening a server refreshed telemetry');
      }
    }
    assert.deepEqual(errors,[]);assert.equal(writes,0);
    reports.push({...test,cards:count,readable:true,errors,writes});await page.close();
  }
  await fs.writeFile(path.join(output,'validation.json'),JSON.stringify(reports,null,2)+'\n');
  console.log(JSON.stringify({scenarios:reports.length,servers:30,navigation_pages:pageRegistry.length*2,remote_writes:0}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}

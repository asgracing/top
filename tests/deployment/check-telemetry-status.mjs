// Real V2 rendering with synthetic telemetry and intercepted remote requests.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';

const root=path.resolve(import.meta.dirname,'../..');
const compiled=process.env.ASG_V2_OUTPUT_DIR;
assert.ok(compiled,'Build V2 into ASG_V2_OUTPUT_DIR first');
const output=taskScratchPath('telemetry-browser');await fs.mkdir(output,{recursive:true});
let pw;
for(const folder of await fs.readdir('C:/Users/Andrew/AppData/Local/npm-cache/_npx')){
  try{pw=await import(pathToFileURL(`C:/Users/Andrew/AppData/Local/npm-cache/_npx/${folder}/node_modules/playwright/index.mjs`).href);break}catch{}
}
assert.ok(pw,'Existing Playwright installation required');
const fixture=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-home/public.json'),'utf8'));
const server=http.createServer(async(req,res)=>{
  try{
    const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '');
    const requested=relative.endsWith('/')||!relative?relative+'index.html':relative;
    let raw;let name;
    for(const base of [compiled,root]){
      name=path.resolve(base,requested);
      if(!name.startsWith(path.resolve(base)+path.sep))throw Error('Invalid path');
      try{raw=await fs.readFile(name);break}catch{}
    }
    if(!raw)throw Error('Not found');
    res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'})[path.extname(name)]||'application/octet-stream','Cache-Control':'no-store'});res.end(raw);
  }catch{res.writeHead(404);res.end('not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await pw.chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const reports=[];
try{
  for(const [language,width,height] of [['ru',1280,800],['en',390,844]]){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    const errors=[];let remoteWrites=0;const requested=[];const observed=new Date().toISOString();
    const ids=['main','sunset','hourly',...Array.from({length:6},(_,i)=>'assetto-corsa-competizione-dedic'+(i?'-'+(i+1):''))];
    const servers=Object.fromEntries(ids.map(id=>[id,{id,name:'ASG '+id,source:'acc-local-telemetry',status:'online',server_online:true,
      telemetry_state:'live',observed_at:observed,updated_at:observed,source_age_ms:0,roster_complete:true,
      players_online:id==='main'?1:0,track_code:'monza',sa_requirement:0,sr_requirement:0,
      session:{type:'Race',phase:'session',remaining_ms:120000,timer_meaning:'session_countdown'},
      drivers:id==='main'?[{name:'Telemetry pilot',position:3,race_number:765,car_model_id:36,
        best_lap_ms:115132,last_lap_ms:116500,lap_count:3,public_id:null,elo:1600,safety_rating:7}]:[]} ]));
    const live={schema_version:3,source:'asg-live-telemetry-status',updated_at:observed,players_online:1,servers};
    page.on('pageerror',e=>errors.push(String(e)));
    await page.route('**/*',async route=>{
      const req=route.request();const url=new URL(req.url());if(url.origin===base)return route.continue();
      if(req.method()!=='GET')remoteWrites++;
      requested.push(url.pathname);
      let data={};
      if(url.hostname==='data.asgracing.ru'){
        if(url.pathname.endsWith('/server_status_live.json'))data=live;
        else if(url.pathname.endsWith('/server_status.json'))data={...fixture.servers,updated_at:observed,players_online:26};
        else if(url.pathname.endsWith('/v2/manifest.json'))data=fixture.manifest;
        else if(url.pathname.endsWith('/v2/home.json'))data=fixture.home;
        else if(url.pathname.includes('/v2/tables/'))data={items:[],total_items:0,total_pages:1,page:1,page_size:10};
      }else if(url.hostname==='auth.asgracing.ru')data={authenticated:false};
      if(url.pathname.endsWith('.js'))return route.fulfill({contentType:'text/javascript',body:''});
      return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
    });
    await page.goto(base+'/v2/'+language+'/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelectorAll('#v2-servers [data-server]').length===9);
    const clock=page.locator('#v2-servers [data-server="main"] [data-live-session]').last();
    const before=await clock.textContent();await page.waitForTimeout(1400);const after=await clock.textContent();
    assert.notEqual(before,after,'The displayed countdown advances without a new snapshot');
    const dismiss=page.locator('.asg-legal-banner-btn-secondary');if(await dismiss.isVisible())await dismiss.click();
    await page.locator('#v2-servers [data-server="main"]').click();
    await page.locator('#v2-modal .server-driver-list li').waitFor();
    assert.equal(await page.locator('#v2-modal .pilot-position').textContent(),'3');
    assert.equal(await page.locator('#v2-modal .pilot-position').isVisible(),true,'Current place remains visible on mobile');
    assert.equal(await page.locator('#v2-modal .pilot-position').isVisible(),true,'Current place remains visible on mobile');
    assert.match(await page.locator('#v2-modal .pilot-car').textContent(),/1:55\.132/);
    assert.match(await page.locator('#v2-modal .pilot-car').textContent(),/1:56\.500/);
    assert.equal(await page.locator('#v2-modal .pilot-number').textContent(),'#765');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No horizontal page overflow');
    await page.screenshot({path:path.join(output,language+'-'+width+'.png'),fullPage:false});
    assert.equal(requested.filter(p=>p.endsWith('/server_status.json')).length,0,'Legacy status must not override the live file');
    assert.deepEqual(errors,[]);assert.equal(remoteWrites,0);
    reports.push({language,width,servers:9,position:3,countdown_advanced:true,lap_times_rendered:true,remote_writes:remoteWrites});
    await page.close();
  }
  await fs.writeFile(path.join(output,'validation.json'),JSON.stringify(reports,null,2)+'\n');
  console.log(JSON.stringify(reports));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}

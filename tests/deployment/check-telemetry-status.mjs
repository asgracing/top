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
    if(requested==='legacy-fixture/index.html'){
      const html=(await fs.readFile(path.join(root,'v1-source/html/index.html'),'utf8')).replace('<head>','<head><base href="/">');
      res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(html);return;
    }
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
  for(const [language,width,height,variant] of [['ru',1280,800,'v2'],['en',390,844,'v2'],['en',1280,800,'legacy']]){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    const errors=[];let remoteWrites=0;const requested=[];const observed=new Date().toISOString();
    const ids=['main','sunset','hourly',...Array.from({length:6},(_,i)=>'assetto-corsa-competizione-dedic'+(i?'-'+(i+1):''))];
    const servers=Object.fromEntries(ids.map(id=>[id,{id,name:'ASG '+id,source:'acc-local-telemetry',status:'online',server_online:true,
      telemetry_state:'live',observed_at:observed,updated_at:observed,source_age_ms:0,roster_complete:true,
      players_online:id==='main'?1:0,track_code:'monza',sa_requirement:0,sr_requirement:0,
      session:{type:'Race',phase:'session',remaining_ms:120000,timer_meaning:'session_countdown'},
      drivers:id==='main'?[{name:'Telemetry pilot',position:3,race_number:765,car_model_id:36,
        best_lap_ms:115132,last_lap_ms:116500,lap_count:3,public_id:null,elo:1600,safety_rating:7}]:[]} ]));
    servers.main.drivers=[
      {...servers.main.drivers[0]},
      {...servers.main.drivers[0],name:'Personal best pilot',position:4,race_number:2,best_lap_ms:115400,last_lap_ms:115400},
      {...servers.main.drivers[0],name:'Session record pilot',position:5,race_number:3,best_lap_ms:115132,last_lap_ms:115132},
      {...servers.main.drivers[0],name:'No timed lap',position:6,race_number:4,best_lap_ms:null,last_lap_ms:null},
      {...servers.main.drivers[0],name:'Very long driver name for narrow viewport verification',position:7,race_number:5,best_lap_ms:115900,last_lap_ms:116100}
    ];
    servers.main.players_online=servers.main.drivers.length;
    const live={schema_version:3,source:'asg-live-telemetry-status',updated_at:observed,players_online:5,servers};
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
    const legacy=variant==='legacy',modal=legacy?'#server-players-modal':'#v2-modal';
    await page.goto(base+(legacy?'/legacy-fixture/':'/v2/'+language+'/'),{waitUntil:'domcontentloaded'});
    const card=legacy?'.server-sticky-card[data-server-key]':'#v2-servers [data-server]';
    await page.waitForFunction(selector=>document.querySelectorAll(selector).length===9,card);
    if(!legacy){
      const clock=page.locator('#v2-servers [data-server="main"] [data-live-session]').last();
      const before=await clock.textContent();await page.waitForTimeout(1400);const after=await clock.textContent();
      assert.notEqual(before,after,'The displayed countdown advances without a new snapshot');
    }
    const localeDismiss=page.locator('.locale-suggestion-dismiss');if(await localeDismiss.isVisible())await localeDismiss.click();
    const dismiss=page.locator('.asg-legal-banner-btn-secondary');if(await dismiss.isVisible())await dismiss.click();
    await page.locator(legacy?'.server-sticky-card[data-server-key="main"]':'#v2-servers [data-server="main"]').click();
    const rows=page.locator(modal+' .server-driver-list tbody tr');
    await rows.first().waitFor();
    assert.equal(await page.locator(modal+' .server-roster-table thead th').count(),6);
    assert.equal(await rows.count(),5);
    assert.equal(await rows.first().locator('td').count(),6);
    assert.equal(await rows.first().locator('.pilot-position').textContent(),'3');
    assert.equal(await rows.first().locator('.pilot-position').isVisible(),true,'Current place remains visible on mobile');
    assert.equal(await rows.first().locator('.pilot-best-lap').textContent(),'1:55.132');
    assert.equal(await rows.first().locator('.pilot-last-lap').textContent(),'1:56.500');
    assert.equal(await rows.first().locator('.pilot-number').textContent(),'#765');
    assert.equal(await rows.first().locator('.pilot-line> :first-child').getAttribute('class'),'pilot-number');
    assert.equal(await rows.first().locator('.roster-rating-pair>span').count(),2);
    const color=(index,cell)=>rows.nth(index).locator(cell).evaluate(el=>getComputedStyle(el).color);
    assert.equal(await color(0,'.pilot-best-lap'),'rgb(196, 154, 255)');
    assert.equal(await color(0,'.pilot-last-lap'),'rgb(255, 255, 255)');
    for(const cell of ['.pilot-best-lap','.pilot-last-lap']){
      assert.equal(await color(1,cell),legacy?'rgb(57, 217, 138)':'rgb(64, 229, 142)');
      assert.equal(await color(2,cell),'rgb(196, 154, 255)');
      assert.equal(await rows.nth(3).locator(cell).textContent(),'—');
    }
    assert.equal(await color(4,'.pilot-best-lap'),legacy?'rgb(57, 217, 138)':'rgb(64, 229, 142)');
    assert.equal(await color(4,'.pilot-last-lap'),'rgb(255, 255, 255)');
    const aligned=await rows.evaluateAll(elements=>elements.map(row=>Array.from(row.cells,cell=>Math.round(cell.getBoundingClientRect().left))));
    assert.deepEqual(aligned[0],aligned[1],'All six columns align between rows');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No horizontal page overflow');
    assert.equal(await page.locator(modal+' .server-roster-scroll').evaluate(el=>el.clientWidth<=el.parentElement.clientWidth+1),true,'Table scroll stays inside its parent');
    if(!legacy)assert.equal(await page.locator('#v2-modal .modal-body').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'Modal body has no horizontal overflow');
    assert.equal(await rows.last().locator('.pilot-name').evaluate(el=>getComputedStyle(el).whiteSpace),'nowrap');
    assert.equal(await rows.last().locator('.pilot-identity').getAttribute('title'),'Very long driver name for narrow viewport verification');
    const lines=await rows.first().evaluate(row=>Array.from(row.querySelectorAll('.pilot-number,.pilot-name,.pilot-meta'),el=>Math.round(el.getBoundingClientRect().top)));
    assert.ok(Math.max(...lines)-Math.min(...lines)<8,'Number, name and lap count share a single line');
    assert.equal(await page.locator(modal+' thead th').nth(3).evaluate(el=>getComputedStyle(el).whiteSpace),'nowrap');
    assert.equal(await rows.first().locator('.pilot-car').evaluate(el=>Math.round(el.getBoundingClientRect().width)),220);
    assert.equal(await rows.first().locator('.pilot-car img').evaluate(el=>Math.round(el.getBoundingClientRect().width)),44);
    const heights=await rows.evaluateAll(elements=>elements.map(el=>Math.round(el.getBoundingClientRect().height)));
    assert.ok(Math.max(...heights)-Math.min(...heights)<=1,'Long names do not increase row height');
    await page.screenshot({path:path.join(output,language+'-'+width+'-'+variant+'.png'),fullPage:false});
    if(width<600){
      await page.locator(modal+' .server-roster-scroll').evaluate(el=>{el.scrollLeft=275;});
      await page.screenshot({path:path.join(output,language+'-'+width+'-laps.png'),fullPage:false});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Only the table scrolls');
    }
    servers.main.drivers[1].best_lap_ms=114000;servers.main.drivers[1].last_lap_ms=114000;
    live.updated_at=new Date().toISOString();
    await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForFunction(selector=>document.querySelectorAll(selector+' .pilot-best-lap')[1]?.textContent==='1:54.000',modal);
    assert.equal(await color(1,'.pilot-best-lap'),'rgb(196, 154, 255)');
    assert.equal(await color(1,'.pilot-last-lap'),'rgb(196, 154, 255)');
    assert.equal(await color(0,'.pilot-best-lap'),legacy?'rgb(57, 217, 138)':'rgb(64, 229, 142)');
    if(width<600)assert.equal(await page.locator(modal+' .server-roster-scroll').evaluate(el=>el.scrollLeft),275,'Snapshot refresh preserves table scroll');
    assert.equal(requested.filter(p=>p.endsWith('/server_status.json')).length,0,'Legacy status must not override the live file');
    assert.deepEqual(errors,[]);assert.equal(remoteWrites,0);
    reports.push({language,width,variant,servers:9,columns:6,rows:5,position:3,countdown_advanced:!legacy,lap_colors_checked:true,live_recolor_checked:true,remote_writes:remoteWrites});
    await page.close();
  }
  await fs.writeFile(path.join(output,'validation.json'),JSON.stringify(reports,null,2)+'\n');
  console.log(JSON.stringify(reports));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}

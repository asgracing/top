// Real EventSource over local HTTP, full V2 boot, no production data or writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';

const root=path.resolve(import.meta.dirname,'../..'),compiled=process.env.ASG_V2_OUTPUT_DIR;
assert.ok(compiled,'Set ASG_V2_OUTPUT_DIR to an isolated V2 build');
const output=taskScratchPath('live-telemetry-browser');await fs.mkdir(output,{recursive:true});
const fixture=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-home/public.json'),'utf8'));
let pw;
for(const folder of await fs.readdir('C:/Users/Andrew/AppData/Local/npm-cache/_npx')) {
  try{pw=await import(pathToFileURL(`C:/Users/Andrew/AppData/Local/npm-cache/_npx/${folder}/node_modules/playwright/index.mjs`).href);break}catch{}
}
assert.ok(pw,'Use the existing Playwright installation');
let mode='direct',paused=false,omitPoses=false,connections=0,active=0;
const car=(n,at=Date.now())=>({car_id:n,connection_id:n+10,position:n,race_number:n,name:'Fixture '+n,
  role:'driver',connected:true,world_x:100+n*20+((at-150)%100000)/100,world_z:-50,
  coordinates_source:'acc-native-world-xz',position_age_ms:150,position_observed_at:new Date(at-150-1109).toISOString()});
function row(at=Date.now()) {
  const observed=new Date(at).toISOString();
  return {id:'main',name:'Monza fixture',track_code:'monza',source:'acc-local-telemetry',status:'online',telemetry_state:'live',
    observed_at:observed,updated_at:observed,source_age_ms:0,players_online:2,drivers_connected:2,driver_capacity:34,
    roster_complete:true,boot_id:'fixture',session:{id:'s',type:'Race',phase:'session',remaining_ms:700000},
    drivers:[car(1,at),car(2,at)],classification:[],spectators:[],
    ...(mode==='stale'?{stale:true,status:'stale',telemetry_state:'stale'}:{})};
}
const keyed=server=>({...server,drivers:Object.fromEntries(server.drivers.map(c=>[`${c.car_id}:${c.connection_id}`,c])),classification:{},spectators:{}});
const pose=at=>({at_ms:at,boot_id:'fixture',session_id:'s',track_code:'monza',clock_epoch:1,clock_verified:true,
  cars:(omitPoses?[]:[car(1,at),car(2,at)]).map(c=>({...c,position_at_ms:at-150,clock_uncertainty_ms:7}))});
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://fixture');
  if(url.pathname==='/fixture-stream') {
    connections++;active++;let seq=0;
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Accel-Buffering':'no'});
    const send=()=>{
      if(paused)return;
      const at=Date.now(),current=row(at);
      const data={hub_epoch:'fixture',buffer_ms:500,delivery:mode,server_time_ms:at,sequence:++seq,base:seq===1?0:seq-1,
        patch:seq===1?keyed(current):{drivers:keyed(current).drivers,observed_at:current.observed_at,updated_at:current.updated_at},
        history:mode==='direct'?(seq===1?Array.from({length:8},(_,i)=>pose(at-700+i*100)):[pose(at)]):[]};
      res.write('event: telemetry\ndata: '+JSON.stringify(data)+'\n\n');
    };
    send();const timer=setInterval(send,100);res.on('close',()=>{clearInterval(timer);active--;});return;
  }
  try {
    const relative=decodeURIComponent(url.pathname).replace(/^\/+/,''),file=relative.endsWith('/')?relative+'index.html':relative;
    let raw;
    for(const base of [compiled,root]) {
      const full=path.resolve(base,file);if(!full.startsWith(path.resolve(base)+path.sep))throw Error('Invalid path');
      try{raw=await fs.readFile(full);break}catch{}
    }
    if(!raw)throw Error('Not found');
    res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream'});res.end(raw);
  }catch {res.writeHead(404);res.end('not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await pw.chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const reports=[];
try {
  for(const [lang,width,reducedMotion] of [['ru',1280,'no-preference'],['en',390,'reduce']]) {
    mode='direct';paused=false;omitPoses=false;
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion}),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.addInitScript(()=>{
      const Native=window.EventSource;
      window.EventSource=class extends Native {constructor(url){super(url.includes('/telemetry/v1/stream/')?location.origin+'/fixture-stream':url);}};
    });
    await page.route('**/*',async route=>{
      const request=route.request(),url=new URL(request.url());if(url.origin===base)return route.continue();
      assert.equal(request.method(),'GET','Fixture must never send a mutation');
      let data={};
      if(url.hostname==='data.asgracing.ru') {
        if(url.pathname==='/telemetry/v1/status')data={schema_version:3,source:'asg-live-telemetry-status',telemetry_stream:true,updated_at:new Date().toISOString(),servers:{main:row()}};
        else if(url.pathname==='/telemetry/v1/clock'){
          // Exercise a public Internet RTT, rather than a zero-latency clock fixture.
          await new Promise(r=>setTimeout(r,75));
          const now=Date.now();data={received_ms:now,sent_ms:now};
          await new Promise(r=>setTimeout(r,75));
        }
        else if(url.pathname.endsWith('/server_status_live.json'))return route.fulfill({status:503,body:'{}'});
        else if(url.pathname.endsWith('/server_status.json'))return route.fulfill({status:503,body:'{}'});
        else if(url.pathname.endsWith('/v2/manifest.json'))data=fixture.manifest;
        else if(url.pathname.endsWith('/v2/home.json'))data=fixture.home;
        else if(url.pathname.includes('/v2/tables/'))data={items:[],total_items:0,total_pages:1,page:1,page_size:10};
      }else if(url.hostname==='auth.asgracing.ru')data={authenticated:false};
      return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
    });
    await page.goto(base+'/v2/'+lang+'/servers/',{waitUntil:'domcontentloaded'});
    for(const selector of ['.asg-legal-banner-btn-secondary','.locale-suggestion-dismiss'])if(await page.locator(selector).isVisible())await page.locator(selector).click();
    await page.locator('#server-directory-grid [data-server="main"]').click();
    await page.waitForFunction(()=>document.querySelector('.server-delivery')?.textContent.match(/Прямой|Direct/));
    await page.locator('#v2-modal .track-car').first().waitFor({state:'attached'});
    const read=()=>page.locator('#v2-modal .track-car').first().getAttribute('transform');
    const first=await read();
    await page.waitForFunction(value=>document.querySelector('#v2-modal .track-car')?.getAttribute('transform')!==value,first,{timeout:3000});
    const second=await read();
    assert.notEqual(second,first,'Real SSE frames move map markers');
    await page.locator('#v2-modal .track-car').first().evaluate(n=>{window.fixtureMarker=n;});
    await page.waitForTimeout(1200);
    assert.equal(await page.evaluate(()=>window.fixtureMarker.isConnected),true,'One-second table update retains the SVG marker');
    assert.equal(await page.locator('#v2-modal .track-car.is-leader').count(),1);
    assert.match(await page.locator('#v2-modal .server-track-map svg + p').innerText(),/Красный|Red/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:path.join(output,`stream-${lang}-${width}.png`)});
    for(const fault of ['stale','missing','pause']){
      mode=fault==='stale'?'stale':'direct';omitPoses=fault==='missing';paused=fault==='pause';
      const counts=await page.evaluate(async()=>{
        const result=[];for(let i=0;i<24;i++){
          result.push({count:document.querySelectorAll('#v2-modal .track-car').length,
            stale:/Данные устарели|Stale data/.test(document.querySelector('#server-directory-grid')?.textContent||'')});
          await new Promise(r=>setTimeout(r,50));
        }return result;
      });
      assert.ok(counts.every(s=>s.count===2&&!s.stale),fault+' must not flash stale data or lose markers');
      mode='direct';paused=false;omitPoses=false;await page.waitForTimeout(1700);
    }
    mode='relay';
    await page.waitForFunction(()=>document.querySelector('.server-delivery')?.textContent.match(/Резервная|Relay/));
    mode='direct';
    await page.waitForFunction(()=>document.querySelector('.server-delivery')?.textContent.match(/Прямой|Direct/));
    paused=true;
    await page.waitForFunction(()=>document.querySelector('.server-delivery')?.textContent.match(/Восстанавливаем|Reconnecting/));
    assert.equal(await page.locator('#v2-modal .track-car').count(),2);
    paused=false;
    await page.waitForFunction(()=>document.querySelector('.server-delivery')?.textContent.match(/Прямой|Direct/));
    await page.evaluate(()=>document.getElementById('v2-modal').close());await page.waitForTimeout(200);
    assert.equal(active,0,'Closing the modal closes the stream');
    assert.deepEqual(errors,[]);reports.push({lang,width,reducedMotion,passed:true});await page.close();
  }
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({reports,connections},null,2));
  console.log(JSON.stringify({reports,connections,output}));
}finally {await browser.close();await new Promise(resolve=>server.close(resolve));}

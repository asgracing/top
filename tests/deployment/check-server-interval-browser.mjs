// Real V2 dialogs: an old initial snapshot must refresh on open and keep polling.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {taskScratchPath,assertArchiveScratchPath} from '../../scripts/workspace-scratch.mjs';

const output=path.resolve(process.env.ASG_DIST_OUTPUT_DIR||taskScratchPath('v2-root-release-candidate'));
assertArchiveScratchPath(output);
const mime={'.js':'text/javascript','.css':'text/css','.json':'application/json','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  try {
    let file=path.resolve(output,'.'+decodeURIComponent(new URL(req.url,'http://fixture').pathname));
    if(file!==output&&!file.startsWith(output+path.sep))throw Error('Path escape');
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    res.end(await readFile(file));
  } catch {res.statusCode=404;res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
process.env.ASG_V2_PREVIEW=`http://127.0.0.1:${server.address().port}`;
let browser;
const reports=[];
try {
  const tools=await import('./v2-browser-fixtures.mjs');browser=tools.browser;
  for(const [lang,width] of [['ru',1440],['en',414]]) {
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    const errors=[];let reads=0;
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.hostname==='data.asgracing.ru'&&url.pathname==='/top-data/server_status_live.json') {
        reads++;
        // A configured 45-second delivery budget must keep a 40-second source
        // observation, without rewriting it to the time of this HTTP response.
        const observed=new Date(Date.now()-(reads===1?20000:reads===2?40000:0)).toISOString();
        const drivers=[1,2,3].map((position)=>({position,race_number:position,
          name:'Interval Fixture '+position,connected:true,lap_count:position===3?2:3,
          best_lap_ms:108000,last_lap_ms:109000,car_model_id:35,
          laps_behind_ahead:position===1?null:position===3?1:0,
          gap_to_ahead_ms:position===2?1234+reads*100:null,
          timing_source:position===1?null:'acc-native-checkpoint',timing_observed_at:observed,
          car_id:position,world_x:100+position*50+reads*10,world_z:50+position*20,
          coordinates_source:'acc-native-world-xz',position_observed_at:observed,position_age_ms:20,
          pit_state:position===2?'pit_entry':position===3?'pit_exit':'on_track',pit_observed_at:observed}));
        const main={id:'main',name:'Main Interval Fixture',source:'acc-local-telemetry',
          status:'online',telemetry_state:'live',roster_complete:true,source_age_ms:0,
          detail_ttl_ms:reads===2?45000:15000,
          observed_at:observed,updated_at:observed,players_online:3,drivers_connected:3,
          driver_capacity:34,track:'Monza',session:{type:'Race',phase:'session',remaining_ms:600000},
          drivers,classification:drivers,
          track_map:{source:'acc-native-complete-lap',points:Array.from({length:40},(_,n)=>[500*Math.cos(n*Math.PI/20),300*Math.sin(n*Math.PI/20)])}};
        return route.fulfill({status:200,json:{schema_version:3,source:'asg-live-telemetry-status',
          updated_at:observed,servers:{main}}});
      }
      return tools.fixture(route,[]);
    });
    await page.goto(tools.base+(lang==='en'?'/en/':'/'),{waitUntil:'domcontentloaded'});
    await page.locator('#v2-servers [data-server="main"]').waitFor();
    if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
    const before=reads;
    await page.locator('#v2-servers [data-server="main"]').click();
    await page.waitForFunction(()=>document.querySelector('#v2-modal')?.open);
    await page.waitForFunction(()=>document.querySelectorAll('#v2-modal .pilot-interval')[1]?.textContent.startsWith('+1.'),null,{timeout:10000});
    assert.ok(reads>before,'Opening a server dialog must fetch fresh timing immediately');
    const cells=page.locator('#v2-modal .pilot-interval');
    assert.equal(await cells.nth(0).textContent(),'—');
    assert.equal(await cells.nth(2).textContent(),lang==='ru'?'+1 круг':'+1 lap');
    const initial=reads;
    // Cross the 15-second detail TTL; the old 30-second refresh loses intervals.
    for(let i=0;i<4;i++) {
      await page.waitForResponse(r=>new URL(r.url()).pathname==='/top-data/server_status_live.json',{timeout:8000});
      const expected='+'+((1234+reads*100)/1000).toFixed(3);
      await page.waitForFunction(value=>document.querySelectorAll('#v2-modal .pilot-interval')[1]?.textContent===value,expected);
    }
    assert.ok(reads>=initial+4,'An open dialog must keep polling within the timing TTL');
    assert.equal(await page.locator('#v2-modal .track-car').count(),3);
    assert.equal(await page.locator('#v2-modal .track-car.is-leader text').textContent(),'1');
    assert.equal(await page.locator('#v2-modal .track-car.is-leader circle').evaluate(el=>getComputedStyle(el).fill),'rgb(220, 53, 69)');
    assert.equal(await page.locator('#v2-modal .pilot-pit').nth(0).textContent(),'PIT IN');
    assert.equal(await page.locator('#v2-modal .pilot-pit').nth(1).textContent(),'PIT OUT');
    assert.ok(await page.locator('#v2-modal .server-track-map svg').isVisible());
    assert.ok((await page.locator('#v2-modal .server-track-map svg').boundingBox()).height>=200);
    assert.ok(await page.locator('#v2-modal .server-track-map').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    assert.deepEqual(errors,[]);
    const dir=taskScratchPath('browser');await mkdir(dir,{recursive:true});
    await page.screenshot({path:path.join(dir,`interval-${lang}-${width}.png`)});
    reports.push({lang,width,immediateRefresh:true,updatesAfterOpen:reads-initial,interval:await cells.nth(1).textContent()});
    await page.close();
  }
  await writeFile(taskScratchPath('browser-results.json'),JSON.stringify(reports,null,2)+'\n');
  console.log(JSON.stringify({serverIntervals:reports}));
} finally {
  if(browser)await browser.close();
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}

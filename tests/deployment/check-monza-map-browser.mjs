// Actual built server dialogs; all external reads/writes are intercepted fixtures.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {taskScratchPath,assertArchiveScratchPath} from '../../scripts/workspace-scratch.mjs';
import {trackMapGeometry} from '../../src/features/server-status/track-map.js';

const output=path.resolve(process.env.ASG_DIST_OUTPUT_DIR||taskScratchPath('build'));
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
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
    const errors=[];let reads=0;
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.hostname==='data.asgracing.ru'&&url.pathname==='/top-data/server_status_live.json') {
        reads++;
        const observed=new Date().toISOString();
        const anchors=[[-286.22,-366.06],[-163.7,-885.25],[444.65,-1019.09],[795.01,-1113.93],[843.7,-795.15],[-18.52,-32.36],[-252.92,1041.05]];
        const drivers=anchors.map(([world_x,world_z],i)=>({position:i+1,race_number:80+i,
          name:`Map fixture ${i+1}`,connected:true,lap_count:3,car_model_id:35,
          best_lap_ms:108000,last_lap_ms:109000,car_id:i+1,
          world_x:world_x+(i===0?reads:0),world_z,
          coordinates_source:'acc-native-world-xz',position_observed_at:observed,position_age_ms:20,
          pit_state:'on_track',pit_observed_at:observed}));
        const row={source:'acc-local-telemetry',status:'online',telemetry_state:'live',
          roster_complete:true,source_age_ms:0,observed_at:observed,updated_at:observed,
          players_online:7,drivers_connected:7,driver_capacity:34,track:'monza',track_code:'monza',
          session:{type:'Race',phase:'session',remaining_ms:600000},drivers,classification:drivers};
        return route.fulfill({status:200,json:{schema_version:3,source:'asg-live-telemetry-status',updated_at:observed,
          servers:{main:{...row,id:'main',name:'Monza Main'},sunset:{...row,id:'sunset',name:'Monza Sunset',
            track_map:{source:'acc-native-complete-lap',points:Array.from({length:20},(_,n)=>[100*Math.cos(n),100*Math.sin(n)])}}}}});
      }
      return tools.fixture(route,[]);
    });
    await page.goto(tools.base+(lang==='en'?'/en/':'/'),{waitUntil:'domcontentloaded'});
    await page.locator('#v2-servers [data-server="main"]').waitFor();
    if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
    let mainPath;
    for(const key of ['main','sunset']) {
      await page.locator(`#v2-servers [data-server="${key}"]`).click();
      const map=page.locator('#v2-modal .server-track-map[data-track-map="monza-gp"]');
      await map.waitFor();
      await page.waitForFunction(()=>document.querySelectorAll('#v2-modal .track-car').length===7);
      await map.scrollIntoViewIfNeeded();
      const routePath=await map.locator('.track-outline').getAttribute('d');
      if(key==='main')mainPath=routePath;else assert.equal(routePath,mainPath,'same contour despite unrelated learned lap');
      assert.equal(await map.locator('.track-car.is-leader text').textContent(),'1');
      assert.equal(await map.locator('.track-car.is-leader circle').evaluate(el=>getComputedStyle(el).fill),'rgb(220, 53, 69)');
      assert.match(await map.textContent(),/Curve di Lesmo/);assert.match(await map.textContent(),/Curva Parabolica/);
      assert.ok(await map.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'no horizontal overflow');
      const box=await map.locator('svg').boundingBox();assert.ok(box.height>=250&&box.width>250);
      const before=await map.locator('.track-car.is-leader').getAttribute('transform');
      await page.waitForResponse(r=>new URL(r.url()).pathname==='/top-data/server_status_live.json',{timeout:8000});
      await page.waitForFunction(value=>document.querySelector('#v2-modal .track-car.is-leader')?.getAttribute('transform')!==value,before);
      assert.equal(await map.locator('.track-outline').getAttribute('d'),routePath,'car update never regenerates circuit');
      const dir=taskScratchPath('browser');await mkdir(dir,{recursive:true});
      await page.screenshot({path:path.join(dir,`monza-${key}-${lang}-${width}.png`)});
      reports.push({lang,width,key,fixedMap:true,updates:true,markers:7});
      await page.keyboard.press('Escape');
      await page.waitForFunction(()=>!document.querySelector('#v2-modal')?.open);
    }
    assert.deepEqual(errors,[]);await page.close();
  }
  assert.equal(trackMapGeometry({track_code:'monza'}).points.length,125);
  await writeFile(taskScratchPath('browser-results.json'),JSON.stringify(reports,null,2)+'\n');
  console.log(JSON.stringify({monzaMaps:reports}));
} finally {
  if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}

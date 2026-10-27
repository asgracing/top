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
process.env.ASG_V2_PREVIEW=process.env.ASG_PRODUCTION_ORIGIN||`http://127.0.0.1:${server.address().port}`;
let browser;
const reports=[];
const anchors=JSON.parse(await readFile(new URL('../fixtures/nordschleife-map-anchors.json',import.meta.url),'utf8'));
const anchorsByCode={nurburgring_24h:anchors,nordschleife:structuredClone(anchors)};
for(const rows of Object.values(anchorsByCode))rows.splice(7);

try {
  const tools=await import('./v2-browser-fixtures.mjs');browser=tools.browser;
  for(const code of ['nurburgring_24h','nordschleife']) for(const [lang,width,screen] of [['ru',1440,'home'],['en',414,'home'],['ru',1440,'servers'],['en',414,'servers']]) {
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
    const errors=[];let reads=0;
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.hostname==='data.asgracing.ru'&&url.pathname==='/top-data/server_status_live.json') {
        reads++;
        const observed=new Date().toISOString();
        const anchors=anchorsByCode[code].map(row=>row.world);
        const drivers=anchors.map(([world_x,world_z],i)=>({position:i+1,race_number:80+i,
          name:`Map fixture ${i+1}`,connected:true,lap_count:3,car_model_id:35,
          best_lap_ms:108000,last_lap_ms:109000,car_id:i+1,
          world_x:world_x+(i===0?reads:0),world_z,
          coordinates_source:'acc-native-world-xz',position_observed_at:observed,position_age_ms:20,
          pit_state:'on_track',pit_observed_at:observed}));
        const row={source:'acc-local-telemetry',status:'online',telemetry_state:'live',
          roster_complete:true,source_age_ms:0,observed_at:observed,updated_at:observed,
          players_online:7,drivers_connected:7,driver_capacity:34,track:code,track_code:code,
          session:{type:'Race',phase:'session',remaining_ms:600000},drivers,classification:drivers};
        return route.fulfill({status:200,json:{schema_version:3,source:'asg-live-telemetry-status',updated_at:observed,
          servers:{main:{...row,id:'main',name:`${code} Main`},sunset:{...row,id:'sunset',name:`${code} Sunset`,
            track_map:{source:'acc-native-complete-lap',points:Array.from({length:20},(_,n)=>[100*Math.cos(n),100*Math.sin(n)])}}}}});
      }
      return tools.fixture(route,[]);
    });
    await page.goto(tools.base+(lang==='en'?'/en/':'/')+(screen==='servers'?'servers/':''),{waitUntil:'domcontentloaded'});
    const container=screen==='servers'?'#server-directory-grid':'#v2-servers';
    await page.locator(`${container} [data-server="main"]`).waitFor();
    if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
    let mainPath;
    for(const key of ['main']) {
      await page.locator(`${container} [data-server="${key}"]`).click();
      const map=page.locator(`#v2-modal .server-track-map[data-track-map="nurburgring-24h"]`);
      await map.waitFor();
      await page.waitForFunction(()=>document.querySelectorAll('#v2-modal .track-car').length===7);
      await map.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
      assert.ok(await map.evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('#v2-modal .server-roster-heading'))&Node.DOCUMENT_POSITION_FOLLOWING)),'map precedes roster title and table');
      const dimensions=await map.locator('.track-car circle').first().evaluate(el=>({radius:parseFloat(getComputedStyle(el).r||el.getAttribute('r')),
        font:parseFloat(getComputedStyle(el.nextElementSibling).fontSize)}));
      assert.ok(Math.abs(dimensions.radius-(width<600?22.4:14.4))<.01,'car radius reduced by 20%');
      assert.ok(Math.abs(dimensions.font-(width<600?22.4:13.6))<.01,'position font reduced by 20%');
      const createdRadius=await page.evaluate(async({code,world})=>{
        const {animateLiveMap}=await import('/src/features/server-status/live-map.js');
        const root=document.querySelector('#v2-modal .server-track-map').parentElement.cloneNode(true);
        root.querySelectorAll('.track-car').forEach(node=>node.remove());
        animateLiveMap(root,{track_code:code},[{car_id:99,position:1,world_x:world[0],world_z:world[1]}]);
        return root.querySelector('.track-car circle').getAttribute('r');
      },{code,world:anchorsByCode[code][0].world});
      assert.equal(createdRadius,'14.4','new animated markers use the same reduced size');
      const routePath=await map.locator('.track-outline').getAttribute('d');
      if(key==='main')mainPath=routePath;else assert.equal(routePath,mainPath,'same contour despite unrelated learned lap');
      assert.equal(await map.locator('.track-car.is-leader text').textContent(),'1');
      assert.equal(await map.locator('.track-car.is-leader circle').evaluate(el=>getComputedStyle(el).fill),'rgb(220, 53, 69)');
      assert.match(await map.locator('.track-map-credit').textContent(),/R1naldinho/);
      assert.ok(await map.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'no horizontal overflow');
      assert.ok(await map.locator('svg').evaluate(svg=>{
        const bounds=svg.getBoundingClientRect();
        return [...svg.querySelectorAll('.track-label')].every(label=>{
          if(getComputedStyle(label).display==='none')return true;
          const box=label.getBoundingClientRect();
          return box.left>=bounds.left-1&&box.right<=bounds.right+1
            &&box.top>=bounds.top-1&&box.bottom<=bounds.bottom+1;
        });
      }),'corner names fit inside the map on desktop and mobile');
      const box=await map.locator('svg').boundingBox();assert.ok(box.height>(code==='barcelona'?120:200)&&box.width>250);
      const before=await map.locator('.track-car.is-leader').getAttribute('transform');
      await page.waitForResponse(r=>new URL(r.url()).pathname==='/top-data/server_status_live.json',{timeout:8000});
      await page.waitForFunction(value=>document.querySelector('#v2-modal .track-car.is-leader')?.getAttribute('transform')!==value,before);
      assert.equal(await map.locator('.track-outline').getAttribute('d'),routePath,'car update never regenerates circuit');
      const oldMap=await map.elementHandle();
      await map.locator('summary').click();
      assert.equal(await map.evaluate(el=>el.open),false);
      assert.equal(await map.locator('svg').isVisible(),false);
      await page.waitForFunction(el=>!el.isConnected,oldMap,{timeout:8000});
      assert.equal(await map.evaluate(el=>el.open),false,'collapsed state survives refreshed telemetry');
      assert.ok(await map.locator('summary').evaluate(el=>document.activeElement===el),'keyboard focus survives roster refresh');
      assert.ok((await map.boundingBox()).height<100,'folded map releases space for roster');
      await map.locator('summary').press('Enter');
      assert.equal(await map.evaluate(el=>el.open),true);
      await map.locator('summary').press('Space');
      assert.equal(await map.evaluate(el=>el.open),false);
      await map.locator('summary').press('Enter');
      assert.equal(await map.locator('svg').isVisible(),true);
      assert.equal(await map.locator('.track-outline').getAttribute('d'),routePath);
      const dir=taskScratchPath('browser');await mkdir(dir,{recursive:true});
      await page.screenshot({path:path.join(dir,`${code}-${screen}-${key}-${lang}-${width}.png`)});
      reports.push({code,lang,width,screen,key,fixedMap:true,updates:true,markers:7,collapse:true,keyboard:true,smallerMarkers:true,mapBeforeRoster:true});
      await page.keyboard.press('Escape');
      await page.waitForFunction(()=>!document.querySelector('#v2-modal')?.open);
    }
    assert.deepEqual(errors,[]);await page.close();
  }
  for(const code of Object.keys(anchorsByCode))assert.equal(trackMapGeometry({track_code:code}).fixed,true);
  await writeFile(taskScratchPath('browser-results.json'),JSON.stringify(reports,null,2)+'\n');
  console.log(JSON.stringify({additionalMaps:reports}));
} finally {
  if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}

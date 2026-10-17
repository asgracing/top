// Real RU/EN controllers with all remote reads intercepted by existing fixtures.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {taskScratchPath,assertArchiveScratchPath} from '../../scripts/workspace-scratch.mjs';
const output=path.resolve(process.env.ASG_DIST_OUTPUT_DIR||taskScratchPath('chat-bot-site-dist'));
assertArchiveScratchPath(output);
const mime={'.js':'text/javascript','.css':'text/css','.json':'application/json','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  let file=path.resolve(output,'.'+decodeURIComponent(new URL(req.url,'http://fixture').pathname));
  if(file!==output&&!file.startsWith(output+path.sep))throw Error('Path escape');
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
process.env.ASG_V2_PREVIEW=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
 const tools=await import('./v2-browser-fixtures.mjs');browser=tools.browser;
 const reports=[];
 for(const [lang,width] of [['ru',1440],['en',414]]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.pathname.endsWith('/server_status.json')){
    const servers=structuredClone(tools.snapshot.live_servers||tools.snapshot.servers?.servers||{});
    servers.main={...(servers.main||{}),name:'Main Fixture',status:'online',players_online:0,drivers:[],producer_epoch:'fixture',bot_connected:true,roster_complete:true,observed_at:new Date().toISOString()};
    servers.sunset={...(servers.sunset||{}),name:'Sunset Stale Fixture',status:'stale',stale:true,players_online:null,drivers:[{name:'MUST NOT APPEAR',player_id:'private'}],observed_at:new Date(Date.now()-600000).toISOString()};
    return route.fulfill({status:200,json:{updated_at:new Date().toISOString(),servers}});
   }
   return tools.fixture(route,[]);
  });
  await page.goto(tools.base+(lang==='en'?'/en/':'/'),{waitUntil:'networkidle'});
  const stale=page.locator('#v2-servers [data-server="sunset"]');await stale.waitFor();
  await page.waitForFunction(()=>document.querySelector('#v2-servers [data-server="sunset"]')?.textContent.includes('—'));
  assert.match(await stale.textContent(),lang==='ru'?/Нет данных/:/No data/);
  const fresh=await page.locator('#v2-servers [data-server="main"]').textContent();
  assert.ok(!/Нет данных|No data/.test(fresh),'Fresh zero-player Main must remain available');
  assert.match(await page.locator('#v2-servers [data-server="main"] .server-live').textContent(),/^0\s/);
  if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
  await stale.click();
  await page.waitForFunction(()=>document.querySelector('#v2-modal')?.open);
  const body=await page.locator('#v2-modal .modal-body').textContent();
  assert.match(body,lang==='ru'?/Онлайн устарел/:/Online status is stale/);
  assert.ok(!body.includes('MUST NOT APPEAR'));
  assert.deepEqual(errors,[]);
  const report=taskScratchPath('chat-bot-browser');await mkdir(report,{recursive:true});
  await page.screenshot({path:path.join(report,`status-${lang}-${width}.png`),fullPage:false});
  reports.push({lang,width,staleRosterHidden:true});await page.close();
 }
 console.log(JSON.stringify({chatBotStatus:reports}));
}finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
const root=path.resolve(import.meta.dirname,'../..'),output=taskScratchPath('reports-browser');
await fs.mkdir(output,{recursive:true});
const server=http.createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/fixture'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="ru"><meta name="viewport" content="width=device-width"><body><main id="root"></main></body></html>');return;}const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/plain');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
let pw;for(const folder of await fs.readdir('C:/Users/Andrew/AppData/Local/npm-cache/_npx')){try{pw=await import(pathToFileURL(`C:/Users/Andrew/AppData/Local/npm-cache/_npx/${folder}/node_modules/playwright/index.mjs`).href);break;}catch{}}
assert(pw,'Playwright required');const browser=await pw.chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const race={race_id:'race1',namespace:'top',finished_at:Date.now()/1000-60,title:'Monza',drivers:{drv_author:'Reporter',drv_target:'Accused driver with a very long name'}};
const base={report_id:'rpt_'+'a'.repeat(24),number:1,version:1,author_id:'drv_author',participants:['drv_author','drv_target'],accused:['drv_target'],race,description:'A dangerous rejoin caused an avoidable collision.',moment:'Lap 3, 00:40',reason_code:'dangerous_driving',evidence:['https://example.com/video'],status:'submitted',assigned_id:null,decision:null,appeal:null,execution:{status:'not_required'},access:'private',history:[]};
let scenarios=0;
try{
 for(const language of ['ru','en'])for(const width of [360,1280]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[],writes=[];let draft={};let c=structuredClone(base);
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(url.origin===origin)return route.continue();if(url.origin!=='https://auth.asgracing.ru')return route.abort();let data;
   if(url.pathname==='/v1/me')data={authenticated:true,csrf_token:'fixture_csrf'};
   else if(url.pathname==='/v1/reports/me')data={public_id:'drv_author',judge:false,chief:false,owner:false};
   else if(url.pathname==='/v1/reports/race')data=race;
   else if(url.pathname==='/v1/reports/draft'){if(req.method()==='POST')draft=req.postDataJSON().payload;data=draft;}
   else if(url.pathname==='/v1/reports'&&req.method()==='POST'){writes.push(req.postDataJSON());data=c;}
   else if(url.pathname==='/v1/reports')data={items:[c],next_before:null};
   else if(url.pathname.endsWith(c.report_id))data=c;
   else throw Error('Unexpected fixture request '+url.pathname);
   await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'*'},body:JSON.stringify(data)});
  });
  await page.goto(origin+'/fixture');await page.evaluate(language=>document.documentElement.lang=language,language);
  await page.evaluate(async()=>{window.reports=await import('/v2/reports/index.js');await reports.startReport({race_id:'race1',namespace:'top',accused_id:'drv_target'});});
  await page.locator('[data-people] form').waitFor();await page.locator('[data-people] form button').click();
  await page.locator('[name=moment]').fill('Lap 3, 00:40');await page.locator('[name=description]').fill('Unsafe rejoin caused an avoidable collision.');await page.locator('[name=evidence]').fill('https://example.com/video');
  await page.locator('dialog form button:not([type=button])').click();await page.locator('[data-submit]').click();await page.locator('dialog a.button').waitFor();
  assert.equal(writes.length,1);assert.deepEqual(writes[0].payload.accused,['drv_target']);assert.equal(writes[0].payload.race_id,'race1');
  await page.screenshot({path:path.join(output,`submitted-${language}-${width}.png`)});
  await page.locator('[data-close]').click();await page.evaluate(async id=>reports.mountCase(document.getElementById('root'),id),c.report_id);
  assert.equal(await page.locator('[data-action=claim]').count(),0);assert.equal(await page.locator('[data-action=comment]').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await page.close();scenarios++;
 }
 const page=await browser.newPage();await page.goto(origin+'/fixture');
 const model=await page.evaluate(async()=>{const {actionsFor,reportButton}=await import('/v2/reports/model.js');return {
  involved:actionsFor({access:'private',author_id:'drv_a',participants:['drv_a'],accused:['drv_t'],status:'submitted'}, {public_id:'drv_a',judge:true}),
  markup:reportButton({race_id:'"><script>',source:'hourly'},{public_id:'drv_target'})};});
 assert(!model.involved.includes('claim'));assert(!model.markup.includes('<script>'));await page.close();
 console.log(`Reports browser: ${scenarios} RU/EN mobile/desktop flows passed; all API writes intercepted.`);
}finally{await browser.close();await new Promise(r=>server.close(r));}

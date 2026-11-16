import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
const root=path.resolve(import.meta.dirname,'../..'),output=taskScratchPath('reports-menu');
await fs.mkdir(output,{recursive:true});
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/fixture'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="ru"><meta name="viewport" content="width=device-width"><style>body{margin:0;background:#17212c;color:#eef2f6;font:14px/1.5 Segoe UI,sans-serif}main{max-width:1100px;margin:auto}*{box-sizing:border-box}</style><body><main class="report-section" id="root"></main></body></html>');return;}const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/plain');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
let pw;for(const folder of await fs.readdir('C:/Users/Andrew/AppData/Local/npm-cache/_npx')){try{pw=await import(pathToFileURL(`C:/Users/Andrew/AppData/Local/npm-cache/_npx/${folder}/node_modules/playwright/index.mjs`).href);break;}catch{}}
const browser=await pw.chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
let scenarios=0;
try{
 for(const role of ['author','target','judge','chief','guest'])for(const language of ['ru','en'])for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900},hasTouch:width===390}),queries=[],errors=[];
  const staff=['judge','chief'].includes(role),me=role==='guest'?null:{public_id:'drv_'+role,judge:staff,chief:role==='chief',global_unban:role==='chief'};
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(url.origin===origin)return route.continue();if(url.origin!=='https://auth.asgracing.ru')return route.abort();assert.equal(req.method(),'GET');let data;
   if(url.pathname==='/v1/me')data={authenticated:!!me};
   else if(url.pathname==='/v1/reports/me')data=me;
   else if(url.pathname==='/v1/reports'){queries.push(Object.fromEntries(url.searchParams));data={items:[],next_before:null,counts:{active:5,archive:2,review:1}};}
   else throw Error('Unexpected '+url.pathname);
   await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true'},body:JSON.stringify(data)});
  });
  await page.goto(origin+'/fixture');await page.evaluate(async language=>{document.documentElement.lang=language;window.reports=await import('/v2/reports/index.js');await reports.mountReportsPage(document.getElementById('root'));},language);
  await page.locator('.report-help svg').waitFor();await page.waitForFunction(()=>getComputedStyle(document.querySelector('.report-controls')).paddingTop==='12px');assert.equal(await page.locator('#root h1').count(),1);assert.equal(await page.locator('#root h2').count(),0);
  assert.equal(await page.locator('[data-status]').count(),staff?1:0);assert.equal(await page.locator('.report-filters').count(),staff?1:0);
  assert.equal(await page.locator('[data-scope]').count(),me?1:0);
  assert.equal(await page.locator('.report-entry-actions').getByRole('button',{name:language==='ru'?'Полный разбан':'Full unban',exact:true}).count(),role==='chief'?1:0);
  if(me){
   const change=async value=>{const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/v1/reports');await page.locator('[data-scope]').selectOption(value);await response;};
   await change('filed');assert.equal(queries.at(-1).driver,me.public_id);assert.equal(queries.at(-1).direction,'filed');
   await change('against');assert.equal(queries.at(-1).direction,'against');assert(!queries.at(-1).assigned);
   await change('involved');assert.equal(queries.at(-1).mine,'true');assert(!queries.at(-1).driver);
   assert.equal(await page.locator('[data-scope] option[value=assigned]').count(),staff?1:0);
   if(staff){await change('assigned');assert.equal(queries.at(-1).assigned,me.public_id);const stage=page.waitForResponse(r=>new URL(r.url()).pathname==='/v1/reports');await page.locator('[data-status]').selectOption('review');await stage;}
   const completed=page.waitForResponse(r=>new URL(r.url()).pathname==='/v1/reports');await page.locator('[data-completed]').click();await completed;
   assert.equal(queries.at(-1).view,'archive');assert.equal(queries.at(-1).mine,'true');assert(!queries.at(-1).assigned);assert(!queries.at(-1).status);
   assert.equal(await page.locator('[data-scope]').inputValue(),'involved');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const bar=await page.locator('.report-controls').boundingBox();if(width===1280)assert(bar.height<125,`Too tall: ${bar.height}`);
  const layout=await page.locator('.report-controls .report-toolbar').evaluate(el=>getComputedStyle(el).justifyContent);assert.equal(layout,'flex-start');
  await page.screenshot({path:path.join(output,`${role}-${language}-${width}.png`),animations:'disabled'});
  assert.deepEqual(errors,[]);await page.close();scenarios++;
 }
 console.log(`Report menu: ${scenarios} role/language/viewport scenarios passed; private scope, assignments, archive, compact layout and help icon verified.`);
}finally{await browser.close();await new Promise(r=>server.close(r));}

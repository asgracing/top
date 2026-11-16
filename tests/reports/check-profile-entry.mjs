import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
const root=path.resolve(process.env.ASG_DIST_OUTPUT_DIR),output=taskScratchPath('report-profile-menu');await fs.mkdir(output,{recursive:true});
const server=http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(p.endsWith('/'))p+='index.html';const file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;process.env.ASG_V2_PREVIEW=origin;
const {browser,fixture,signedDriver}=await import('../deployment/v2-browser-fixtures.mjs');
let scenarios=0;
try{
 for(const role of ['pilot','judge','admin','portal','owner','unlinked','guest'])for(const lang of ['ru','en'])for(const width of [390,1280]){
  const signed=role!=='guest',linked=signed&&role!=='unlinked',page=await browser.newPage({viewport:{width,height:900},hasTouch:width===390}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='auth.asgracing.ru'&&url.pathname==='/v1/me')return route.fulfill({contentType:'application/json',body:JSON.stringify({authenticated:signed,linked,
    driver:linked?{public_id:signedDriver,display_name:'Menu fixture · '+role,profile_url:'/driver/?id='+signedDriver,rank:3,elo:1445,sr:9.99}:null,
    steam:{persona_name:'Menu fixture · '+role},preferences:{},permissions:{moderation_issue:['admin','owner'].includes(role),portal_manage:['portal','owner'].includes(role)}})});
   if(url.hostname==='auth.asgracing.ru'&&url.pathname.startsWith('/v1/reports')){
    let data={items:[],next_before:null,counts:{active:0,archive:0,review:0}};
    if(url.pathname.endsWith('/status'))data={enabled:true};
    if(url.pathname.endsWith('/me'))data=signed&&linked?{public_id:signedDriver,judge:role==='judge',chief:role==='owner',owner:role==='owner'}:null;
    return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
   }
   return fixture(route,[],{signed,admin:['admin','owner'].includes(role)});
  });
  await page.goto(origin+(lang==='en'?'/en/':'/'));await page.locator('#v2-profile-trigger').waitFor();
  if(signed)await page.getByRole('button',{name:lang==='ru'?'Открыть панель профиля':'Open profile panel'}).getByText('Menu fixture · '+role,{exact:true}).waitFor();
  else await page.locator('#v2-profile-trigger').getByText(lang==='ru'?'Войти через Steam':'Sign in with Steam',{exact:true}).waitFor();
  if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
  await page.locator('#v2-profile-trigger').click();await page.waitForFunction(()=>document.querySelector('#v2-profile-popover').matches(':popover-open'));
  const entry=page.locator('#v2-profile-popover [data-profile-reports]');assert.equal(await entry.count(),signed?1:0);
  if(signed){
   assert.equal(await entry.getAttribute('href'),(lang==='en'?'/en':'')+'/reports/');assert((await entry.innerText()).includes(lang==='ru'?'РЕПОРТЫ':'REPORTS'));
   assert.equal(await entry.evaluate(el=>!!el.closest('.admin-preview')),false);
   if(['pilot','owner'].includes(role)&&lang==='ru')await page.screenshot({path:path.join(output,`${role}-${width}.png`),animations:'disabled'});
   await entry.click();await page.locator('.report-controls').waitFor();assert(new URL(page.url()).pathname.endsWith('/reports/'));
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();scenarios++;
 }
 console.log(`Profile report entry: ${scenarios} role/language/viewport scenarios passed; direct report navigation works for every authenticated permission set.`);
}finally{await browser.close();await new Promise(r=>server.close(r));}

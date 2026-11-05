import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
const root=path.resolve(process.env.ASG_DIST_OUTPUT_DIR),output=taskScratchPath('reports-mounted');await fs.mkdir(output,{recursive:true});
const server=http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(p.endsWith('/'))p+='index.html';const file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep))throw Error('path');const ext=path.extname(file);res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[ext]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;process.env.ASG_V2_PREVIEW=origin;
const {browser,fixture,signedDriver}=await import('../deployment/v2-browser-fixtures.mjs');
let cases=0;
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname==='auth.asgracing.ru'&&url.pathname.startsWith('/v1/reports')){let data={};if(url.pathname.endsWith('/status'))data={enabled:true};else if(url.pathname.endsWith('/me'))data={public_id:signedDriver,judge:true,chief:false,owner:false};else if(url.pathname.endsWith('/draft'))data={};else if(url.pathname.endsWith('/race'))data={race_id:'fixture_report_race',namespace:'top',title:'Monza',finished_at:Date.now()/1000-60,drivers:{[signedDriver]:'Fixture pilot'}};else data={items:[],next_before:null};return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});}return fixture(route,[],{signed:true,admin:true});});
  const localePrefix=width===1280?'/en':'';
  await page.goto(origin+localePrefix+'/race/?id=fixture_report_race');
  const trigger=page.locator('[data-report-race]').first();
  await trigger.waitFor();
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-report-race]')).backgroundColor==='rgb(165, 24, 45)');
  assert.equal(await trigger.locator('[aria-hidden="true"]').textContent(),'!');
  assert.equal(await trigger.and(page.getByRole('button',{name:localePrefix?'Report':'Репорт',exact:true})).count(),1);
  await trigger.click();await page.locator('.report-dialog').waitFor();await page.locator('[data-people]').waitFor();await page.screenshot({path:path.join(output,`race-form-${width}.png`)});await page.locator('[data-close]').click();
  await page.goto(origin+'/driver/?id='+signedDriver);await page.locator('#report-section h2').waitFor();
  await page.goto(origin+'/moderation/');await page.locator('#report-section [data-status]').waitFor();
  await page.goto(origin+'/reports/');await page.locator('[data-status]').waitFor();
  assert.deepEqual(errors,[]);await page.close();cases++;
 }
 for(const chief of [false,true]){
  const page=await browser.newPage();let submitted;
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.hostname!=='auth.asgracing.ru'||!url.pathname.startsWith('/v1/reports'))return fixture(route,[],{signed:true,admin:true});
   let data={items:[],next_before:null};
   if(url.pathname==='/v1/reports/status')data={enabled:true};
   else if(url.pathname==='/v1/reports/me')data={public_id:signedDriver,judge:true,chief,global_unban:chief};
   else if(url.pathname==='/v1/reports/global-unbans'&&req.method()==='POST'){
    submitted=req.postDataJSON();data={command_id:'ucmd_fixture'};
   }else if(url.pathname==='/v1/reports/global-unbans/ucmd_fixture'){
    data={status:'applied',result:{global_banned:false}};
   }
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto(origin+'/en/reports/');await page.locator('[data-status]').waitFor();
  const launch=page.getByRole('button',{name:'Full unban',exact:true});
  if(chief){
   await launch.click();const form=page.getByRole('dialog');
   await form.getByLabel('Pilot public ID').fill('drv_fixture');
   await form.getByLabel('Reason for unban').fill('Approved removal of every active ban ground.');
   await form.getByRole('checkbox').check();
   await form.getByRole('button',{name:'Send to Main'}).click();
   await form.getByText('Применено на Main / Applied on Main',{exact:true}).waitFor();
   assert.equal(submitted.payload.target_public_id,'drv_fixture');
  }else{
   assert.equal(await launch.count(),0);assert.equal(submitted,undefined);
  }
  await page.close();
 }
 console.log(`Mounted reports: ${cases} mobile/desktop paths passed: race trigger, profile, judge registry, reports page.`);
 console.log('Chief-only global unban UI and bilingual execution receipt passed.');
}finally{await browser.close();await new Promise(r=>server.close(r));}

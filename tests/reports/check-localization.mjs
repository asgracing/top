import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
const root=path.resolve(import.meta.dirname,'../..'),output=taskScratchPath('report-localization');
await fs.mkdir(output,{recursive:true});
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/fixture'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="ru"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/v2/pages/views/pages.css"><body><main id="root" class="panel report-section"></main></body></html>');return;}
 const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))throw Error('path');
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/plain');res.end(await fs.readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
process.env.ASG_V2_PREVIEW=origin;
const {browser}=await import('../deployment/v2-browser-fixtures.mjs');
const actions=['claim','comment','evidence','request_evidence','extend_evidence','escalate','release','decide','appeal','internal_note','exception','appoint_reviewer','retry_execution'];
let forms=0;
async function uiLanguage(page,language){
 const text=await page.locator('label,button,h1,h2,h3,legend,small,summary,dt,option,[role=alert],[data-error]').allTextContents();
 if(language==='en')assert(!/[А-Яа-яЁё]/.test(text.join(' ')),text.join(' '));
 else assert(/[А-Яа-яЁё]/.test(text.join(' ')));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
}
try{
 for(const language of ['ru','en'])for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[],writes=[];
  const race={race_id:'race1',namespace:'top',finished_at:Date.now()/1000-90000,title:'Monza',
   drivers:{drv_author:'Reporter',drv_target:'Alex Same',drv_other:'Alex Same'},driver_numbers:{drv_author:[55],drv_target:[72],drv_other:[73]}};
  const c={report_id:'rpt_'+'a'.repeat(24),number:1,version:3,author_id:'drv_author',participants:['drv_author','drv_target'],accused:['drv_target'],race,
   description:'An unsafe rejoin caused a collision.',moment:'Lap 2',reason_code:'dangerous_driving',evidence:['https://example.com/video'],
   status:'awaiting_evidence',assigned_id:'drv_judge',decision_at:Date.now()/1000-90000,
   decision:{summary:'Fixture decision',findings:[{public_id:'drv_target',outcome:'upheld',sanction:'strike'}]},
   execution:{status:'not_required'},access:'private',history:[],available_actions:actions};
  let draft={};
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());if(url.origin===origin)return route.continue();if(url.origin!=='https://auth.asgracing.ru')return route.abort();let data;
   if(url.pathname==='/v1/me')data={authenticated:true,csrf_token:'fixture_csrf'};
   else if(url.pathname==='/v1/reports/me')data={public_id:'drv_author',judge:true,chief:true};
   else if(url.pathname==='/v1/reports/race')data=race;
   else if(url.pathname==='/v1/reports/draft'){if(req.method()==='POST')draft=req.postDataJSON().payload;data=draft;}
   else if(url.pathname==='/v1/reports/statistics')data={days:30,items:[]};
   else if(url.pathname==='/v1/reports'&&req.method()==='POST'){writes.push(req.postDataJSON());data=c;}
   else if(url.pathname==='/v1/reports')data={items:[c],next_before:null,counts:{active:1,archive:0,review:1}};
   else if(url.pathname.endsWith(c.report_id))data=c;
   else throw Error('Unexpected fixture request '+url.pathname);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto(origin+'/fixture');await page.evaluate(language=>document.documentElement.lang=language,language);
  await page.evaluate(async()=>{window.reports=await import('/v2/reports/index.js');await reports.startReport();});
  await page.locator('[name=race]').waitFor();await uiLanguage(page,language);forms++;
  await page.locator('[name=race]').fill('https://asgracing.ru/race/?id=race1&source=top');await page.locator('[data-load]').click();
  await page.locator('[name=accused][value=drv_target]').waitFor();
  for(const [id,number] of [['drv_target',72],['drv_other',73]]){
   const choice=page.locator(`label:has(input[name=accused][value=${id}])`);
   assert.equal((await choice.textContent()).trim(),`#${number} · Alex Same`);
  }
  await page.locator('[name=accused][value=drv_target]').check();
  await page.locator('[data-people] details').evaluate(el=>el.open=true);
  await page.locator('[name=participants][value=drv_other]').check();
  await uiLanguage(page,language);forms++;await page.locator('[data-people] button').click();
  await page.locator('[name=late_reason]').waitFor();await uiLanguage(page,language);forms++;
  await page.locator('[name=moment]').fill('Lap 2');await page.locator('[name=description]').fill('An unsafe rejoin caused a collision.');
  await page.locator('[name=late_reason]').fill('Evidence became available later.');await page.locator('[name=evidence]').fill('http://example.com/bad');
  await page.locator('dialog form button:not([type=button])').click();await page.locator('[data-error]').filter({hasText:language==='en'?'HTTPS':'HTTPS'}).waitFor();await uiLanguage(page,language);forms++;
  await page.locator('[name=evidence]').fill('https://example.com/video');await page.locator('[name=video_moment]').fill('02:14');
  await page.screenshot({path:path.join(output,`late-form-${language}-${width}.png`)});
  await page.locator('dialog form button:not([type=button])').click();await page.locator('[data-submit]').waitFor();
  assert((await page.locator('.report-review').innerText()).includes('#72 · Alex Same'));assert((await page.locator('.report-review').innerText()).includes('#73 · Alex Same'));
  await uiLanguage(page,language);forms++;await page.locator('[data-submit]').click();
  await page.locator('dialog a.button').waitFor();assert((await page.locator('dialog a.button').getAttribute('href')).startsWith(language==='en'?'/en/reports/':'/reports/'));
  assert.deepEqual(writes[0].payload.accused,['drv_target']);assert(writes[0].payload.participants.includes('drv_other'));
  await uiLanguage(page,language);forms++;await page.locator('[data-close]').click();
  for(const action of actions){
   await page.evaluate(async id=>reports.mountCase(document.getElementById('root'),id),c.report_id);
   await page.locator(`[data-action=${action}]`).evaluate(el=>el.click());await page.locator('[data-action-form] form').waitFor();
   await uiLanguage(page,language);forms++;
   if(action==='appeal')assert.equal(await page.locator('[name=late_reason]').count(),1);
   if(action==='request_evidence'){await page.locator('[data-preset="0"]').click();const value=await page.locator('[name=reason]').inputValue();assert(value.includes(language==='en'?'private window':'приватном окне'));}
  }
  for(const query of ['?help=1','?stats=1']){
   await page.evaluate(async query=>{history.replaceState(null,'',query);await reports.mountReportsPage(document.getElementById('root'));},query);
   await uiLanguage(page,language);forms++;
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log(`Report localization: ${forms} RU/EN mobile/desktop form screens passed, including late filing, every user/judge editor, errors, guides and duplicate-name drivers #72/#73; all provider writes intercepted.`);
}finally{await browser.close();await new Promise(r=>server.close(r));}

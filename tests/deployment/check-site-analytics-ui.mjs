import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
const reports=[];
try {
 for(const language of ['ru','en']) {
  const context=await browser.newContext(),page=await context.newPage(),requests=[];
  await page.addInitScript(()=>localStorage.setItem('asgPrivacyConsent',JSON.stringify({version:'2026-04-30',analytics:true,savedAt:new Date().toISOString()})));
  const artifact=process.env.ASG_METRIKA_ARTIFACT;
  assert.ok(artifact,'ASG_METRIKA_ARTIFACT must point to a compiled candidate');
  await page.route('**/*',async r=>{
   const url=new URL(r.request().url());
   if(url.origin!==base)return fixture(r,requests);
   const relative=decodeURIComponent(url.pathname).replace(/^\//,'')+(url.pathname.endsWith('/')?'index.html':'');
   const file=resolve(artifact,relative);
   assert.ok(file.startsWith(resolve(artifact)), 'Artifact paths stay within candidate');
   const contentType={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml'}[extname(file)]||'application/octet-stream';
   try{return r.fulfill({contentType,body:await readFile(file)})}catch{
    if(process.env.ASG_METRIKA_BASE_REVISION)try{
     const body=execFileSync('git',['show',process.env.ASG_METRIKA_BASE_REVISION+':'+relative],{cwd:root,maxBuffer:10*1024*1024,stdio:['ignore','pipe','ignore']});
     return r.fulfill({contentType,body});
    }catch { /* A missing production asset remains a 404. */ }
    return r.fulfill({status:404,body:''});
   }
  });
  await page.goto(base+(language==='en'?'/en/':'/'));
  await page.waitForFunction(()=>window.__v2MetrikaLoaded);
  await page.locator('#v2-tab-safety').click();
  await page.locator('[data-modal="rules"]').first().click();
  await page.locator('#v2-modal').waitFor({state:'visible'});
  await page.keyboard.press('Escape');
  await page.locator('[data-modal="announce1"]').click();
  await page.locator('#v2-modal[data-kind="track-guide"]').waitFor({state:'visible'});
  await page.keyboard.press('Escape');
  await page.locator('#v2-servers [data-server]').first().click();
  await page.locator('#v2-modal[data-kind="server"]').waitFor({state:'visible'});
  await page.keyboard.press('Escape');
  await page.locator('[data-tour-start]').click();
  await page.locator('#top-guide').waitFor({state:'visible'});
  const goals=await page.evaluate(()=>Array.from(window.ym.a||[],a=>Array.from(a)).filter(a=>a[1]==='reachGoal'));
  for(const id of ['asg_stats_interaction','asg_rules_open','asg_track_guide_open','asg_server_details_open','asg_tour_open'])assert.equal(goals.filter(a=>a[2]===id).length,1,id);
  assert.equal(requests.filter(r=>r.method!=='GET'&&!new URL(r.url).pathname.endsWith('/voter-token')).length,0,'No votes or commands during analytics checks');
  await page.screenshot({path:taskScratchPath(`analytics-ui-${language}.png`)});
  reports.push({language,goals:goals.map(a=>a[2]),externalWrites:0});await context.close();
 }
 console.log('Analytics UI: real compiled RU/EN pages, five visible actions each, no production writes.');
} finally {await writeFile(taskScratchPath('analytics-ui.json'),JSON.stringify(reports,null,2)+'\n');await browser.close();}

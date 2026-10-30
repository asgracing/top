// Exercise the production consent loader and real delegated DOM listeners.
// Every external request is intercepted; no test reaches the real counter.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {browser,base,root} from './v2-browser-fixtures.mjs';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
const legal=await readFile(resolve(root,'legal.js'),'utf8'),reports=[];
const controls=`<button data-modal="announce1"><span>Guide</span></button><button data-tour-start>Tour</button><button data-modal="rules">Rules</button><button data-server="private-server-key">Server</button><button data-page-join="private-event-id">Join</button><button data-event-vote class="participation-active">Cancel</button><button data-page-join disabled>Disabled</button><button data-tab="safety">SR</button><a href="/driver/?id=drv_private">Profile</a><a href="https://discord.gg/private-invite">Discord</a><a href="https://donationalerts.com/r/asgracing">Donate</a><div class="track-guide-links"><a href="https://drive.google.com/file/d/private">Setup</a></div><input value="private@email.example">`;
try {
 for(const language of ['ru','en'])for(const mode of ['allowed','denied','blocked','private']) {
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({mode})=>{
   if(!localStorage.getItem('asgPrivacyConsent'))localStorage.setItem('asgPrivacyConsent',JSON.stringify({version:'2026-04-30',analytics:mode!=='denied',savedAt:new Date().toISOString()}));
   document.addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault()},true);
  },{mode});
  await page.route('**/*',r=>r.request().url().includes('mc.yandex.ru')?(mode==='blocked'?r.abort():r.fulfill({contentType:'application/javascript',body:'window.testAnalyticsCalls=window.ym.a; window.testTagLoaded=true;'})):r.fulfill({contentType:'text/html',body:`<!doctype html><html lang="${language}" data-page-language="${language}"><head><meta name="yandex-metrika-id" content="107697834"></head><body>${controls}</body></html>`}));
  await page.goto(base+(language==='en'?'/en':'')+(mode==='private'?'/account/settings/':'/'));
  await page.addScriptTag({content:legal});
  if(mode==='allowed'||mode==='private')await page.waitForFunction(()=>window.testTagLoaded);
  if(mode==='blocked')await page.waitForFunction(()=>document.querySelector('script[src*="mc.yandex.ru"]'));
  for(const selector of ['[data-modal="announce1"] span','[data-tour-start]','[data-modal="rules"]','[data-server]','[data-page-join]:not(:disabled)','[data-event-vote]','[data-tab]','a[href^="/driver"]','a[href*="discord"]','a[href*="donationalerts"]','.track-guide-links a'])await page.locator(selector).click();
  const calls=await page.evaluate(()=>Array.from(window.ym?.a||[],args=>Array.from(args)));
  const goals=calls.filter(a=>a[1]==='reachGoal');
  assert.equal(goals.length,mode==='allowed'?10:0,`${language}/${mode}`);
  if(mode==='allowed') {
   assert.equal(new Set(goals.map(a=>a[2])).size,10,'nested targets must not duplicate events');
   assert.equal(goals.find(a=>a[2]==='asg_social_click')[3].asg.category,'discord');
   assert.equal(goals.find(a=>a[2]==='asg_race_interest_click')[3].asg.category,'general');
   assert.equal(goals[0][3].asg.language,language);
   assert.doesNotMatch(JSON.stringify(goals),/private|email|drv_|invite/);
   await page.evaluate(()=>window.ASGLegal.openSettings());
   await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('.asg-legal-banner-btn-secondary').click()]);
   await page.addScriptTag({content:legal});
   await page.locator('[data-modal="rules"]').click();
   assert.equal(await page.evaluate(()=>window.ASGLegal.hasAnalyticsConsent()),false);
   assert.equal(await page.evaluate(()=>window.ym?.a?.filter(a=>a[1]==='reachGoal').length||0),0,'withdrawal stops events');
  }
  if(mode==='private') {
   const options=calls.find(a=>a[1]==='init')[2];
   assert.equal(options.webvisor,false);assert.equal(options.clickmap,false);assert.equal(options.trackLinks,false);
  }
  assert.deepEqual(errors,[]);reports.push({language,mode,goals:goals.length});await context.close();
 }
 console.log(`Site analytics: ${reports.length} RU/EN consent, failure, withdrawal and private-page scenarios passed.`);
} finally {
 const output=taskScratchPath('site-analytics.json');await mkdir(dirname(output),{recursive:true});
 await writeFile(output,JSON.stringify({reports,realAnalyticsEvents:0},null,2)+'\n');await browser.close();
}

// Owner tools can partition/deny storage. No events go to the real counter.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {browser,base,root,fixture} from './v2-browser-fixtures.mjs';
const legal=await readFile(resolve(root,'legal.js'),'utf8'),reports=[];
const denied={version:'2026-04-30',analytics:false,savedAt:new Date().toISOString()};
try{
 for(const language of ['ru','en'])for(const blocked of [false,true]){
  const context=await browser.newContext(),page=await context.newPage();
  const errors=[],log=[];page.on('pageerror',e=>errors.push(e.message));
  const html=`<!doctype html><html lang="${language}" data-page-language="${language}" data-site-version="v2"><head><meta name="yandex-metrika-id" content="107697834"></head><body><a class="home-partner-banner" href="https://dudarevmotorsport.ru?utm_campaign=web">Dudarev</a><footer><div class="footer-left"></div></footer></body></html>`;
  await page.addInitScript(({blocked,denied})=>{
    document.addEventListener('click',e=>{if(e.target.closest?.('.home-partner-banner'))e.preventDefault();},true);
    if(blocked){
      const no=()=>{throw new DOMException('Storage denied in owner frame','SecurityError');};
      Object.defineProperty(window,'localStorage',{get:no});Object.defineProperty(window,'sessionStorage',{get:no});
      Object.defineProperty(document,'cookie',{get:no,set:no});
    }else localStorage.setItem('asgPrivacyConsent',JSON.stringify(denied));
  },{blocked,denied});
  await page.route('**/*',async route=>{
    if(route.request().url().startsWith(base+'/__analytics_test__'))return route.fulfill({contentType:'text/html',body:html});
    return fixture(route,log);
  });
  await page.goto(base+'/__analytics_test__?_ym_debug=1');await page.addScriptTag({content:legal});
  assert.equal(await page.locator('.asg-legal-banner').isVisible(),true,'debug must offer consent even after previous refusal');
  await page.locator('.asg-legal-banner-btn-secondary').click();
  await page.locator('.home-partner-banner').click();assert.equal(log.filter(r=>r.url.includes('/metrika/tag.js')).length,0);
  await page.evaluate(()=>window.ASGLegal.openSettings());await page.locator('.asg-legal-banner-btn-primary').click();
  await page.waitForFunction(()=>window.__v2MetrikaLoaded);assert.equal(await page.evaluate(()=>window.ASGLegal.hasAnalyticsConsent()),true);
  await page.locator('.home-partner-banner').click();
  const queued=await page.evaluate(()=>window.ym.a.map(args=>Array.from(args)));
  assert.equal(queued.filter(args=>args[1]==='init').length,1);
  assert.equal(queued.filter(args=>args[1]==='reachGoal'&&args[2]==='dudarev_banner_click').length,1);
  assert.equal(queued.find(args=>args[1]==='reachGoal')[3].placement,'desktop');
  await page.evaluate(()=>window.ASGLegal.openSettings());await page.locator('.asg-legal-banner-btn-primary').click();
  assert.equal(log.filter(r=>r.url.includes('/metrika/tag.js')).length,1);
  assert.deepEqual(errors,[]);reports.push({language,blockedStorage:blocked,status:'passed'});await context.close();
 }
 // Keep the published stylesheet API readable to replay tools: external CSS,
 // no nested inline imports, immutable name and absolute image/font URLs.
 const html=await readFile(resolve(process.env.ASG_METRIKA_ARTIFACT||root,'index.html'),'utf8');
 assert.doesNotMatch(html,/<style>@import/);
 const style=html.match(/href="(\/v2\/styles\/runtime-[a-f0-9]{16}\.css)"/);assert.ok(style);
 const css=await readFile(resolve(process.env.ASG_METRIKA_ARTIFACT||root,style[1].slice(1)),'utf8');
 assert.doesNotMatch(css,/@import/);assert.match(css,/@layer v1Runtime/);
 assert.doesNotMatch(css,/url\(["']?\.\.\//);
 console.log(`Metrica compatibility passed: ${reports.length} consent/storage scenarios, explicit banner goal, replay stylesheet.`);
}finally{
 await writeFile(resolve(root,'../tmp/metrika-compat.json'),JSON.stringify({reports,realAnalyticsEvents:0},null,2)+'\n');await browser.close();
}

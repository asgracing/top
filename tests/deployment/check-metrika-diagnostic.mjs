import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
import {browser,base,root,fixture} from './v2-browser-fixtures.mjs';
const legal=await readFile(resolve(root,'legal.js'),'utf8'),css=await readFile(resolve(root,'legal.css'),'utf8');
let passed=0;
try {
 for(const language of ['ru','en']) for(const mode of ['normal','allowed','denied','blocked','transient','http499']) {
  const context=await browser.newContext(),page=await context.newPage(),log=[];
  const recovering=mode==='transient'||mode==='http499';
  let releaseRetry;
  const retryResponse=new Promise(resolve=>{releaseRetry=resolve;});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(({mode})=>{
   localStorage.setItem('asgPrivacyConsent',JSON.stringify({version:'2026-04-30',analytics:mode!=='denied',savedAt:new Date().toISOString()}));
  },{mode});
  await page.addInitScript(language=>{localStorage.setItem('asgLang',language);},language);
  await page.route('**/*',async route=>{
   if(route.request().url().startsWith(base+'/__diagnostic__'))return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="${language}"><head><meta name="yandex-metrika-id" content="107697834"></head><body><footer class="footer-left"></footer></body></html>`});
   if(route.request().url().includes('mc.yandex.ru/metrika/tag.js')){
    log.push({url:route.request().url()});
    if(mode==='blocked'||mode==='transient'&&log.length===1)return route.abort('blockedbyclient');
    if(mode==='http499'&&log.length===1)return route.fulfill({status:499,contentType:'text/plain',body:'Fixture: request filtered before the vendor library loads.'});
    if(recovering)await retryResponse;
    return route.fulfill({contentType:'application/javascript',body:'window.Ya={Metrika2:{counters:()=>[{id:107697834}]}};'});
   }
   return fixture(route,log);
  });
  await page.goto(base+'/__diagnostic__'+(mode==='normal'?'':'?_ym_debug=2'));
  await page.addStyleTag({content:css});
  await page.addScriptTag({content:legal});
  const panel=page.locator('#asg-metrika-diagnostic'),status=panel.locator('[data-metrika-status]'),retry=panel.locator('[data-metrika-retry]');
  if(mode==='normal')assert.equal(await panel.count(),0);
  else {
   assert.equal(await panel.isVisible(),true);assert.match(await status.innerText(),/107697834/);
   if(mode==='allowed'){
    await page.waitForFunction(()=>window.Ya?.Metrika2?.counters?.().length);
    assert.equal(await retry.isVisible(),false);
    await panel.locator('button').nth(1).click();
    assert.match(await status.innerText(),language==='ru'?/Счётчик зарегистрирован: да/:/Counter registered: yes/);
    // Stored acceptance still exposes settings without changing the choice.
    await panel.locator('button').first().click();assert.equal(await page.locator('.asg-legal-banner').isVisible(),true);
   } else if(mode==='blocked'||recovering){
    await page.waitForFunction(()=>document.querySelector('[data-metrika-status]')?.textContent.match(/ошибка загрузки|failed to load/));
    assert.equal(await page.evaluate(()=>window.ASGLegal.hasAnalyticsConsent()),true);
    assert.equal(await retry.isVisible(),true);
    if(recovering){
     await page.setViewportSize({width:360,height:740});
     const bounds=await panel.boundingBox();
     assert.ok(bounds.x>=0&&bounds.x+bounds.width<=360&&bounds.y+bounds.height<=740,'mobile diagnostics and retry fit the viewport');
     if(mode==='http499')await page.screenshot({path:taskScratchPath(`metrika-load-error-${language}.png`)});
    }
    assert.match(await status.innerText(),language==='ru'?/блокировка или сбой сети/:/blocking or a network error/);
    assert.equal(log.length,1);
    // Refreshing diagnostics is read-only; the explicit retry issues a new request.
    await panel.locator('button').nth(1).click();assert.equal(log.length,1);
    const request=page.waitForRequest(r=>r.url().includes('mc.yandex.ru/metrika/tag.js'));
    await retry.click();await request;
    if(recovering){
     assert.equal(await retry.isVisible(),false,'retry is unavailable while the request is pending');
     // Accepting again while a retry is pending must not duplicate the tag or init.
     await page.evaluate(()=>window.ASGLegal.openSettings());
     await page.locator('.asg-legal-banner-btn-primary').click();
     assert.equal(log.length,2);
     assert.equal(await page.locator('script[src="https://mc.yandex.ru/metrika/tag.js"]').count(),1);
     const queued=await page.evaluate(()=>window.ym.a.map(args=>Array.from(args)));
     assert.equal(queued.filter(args=>args[1]==='init').length,1);
     assert.equal(queued.find(args=>args[1]==='init')[2].webvisor,true);
     releaseRetry();
     await page.waitForFunction(()=>window.Ya?.Metrika2?.counters?.().length);
     await panel.locator('button').nth(1).click();
     assert.match(await status.innerText(),language==='ru'?/Счётчик зарегистрирован: да/:/Counter registered: yes/);
     assert.equal(await retry.isVisible(),false);
     await page.evaluate(()=>window.ASGLegal.openSettings());
     await page.locator('.asg-legal-banner-btn-primary').click();
     assert.equal(log.length,2,'a successful retry is retained');
    }else{
     await page.waitForFunction(()=>document.querySelector('[data-metrika-status]')?.textContent.match(/ошибка загрузки|failed to load/));
     assert.equal(log.length,2,'one click performs one retry without an automatic loop');
     assert.equal(await retry.isVisible(),true);
    }
   } else {
    assert.equal(log.length,0);assert.match(await status.innerText(),language==='ru'?/Согласие на аналитику: нет/:/Analytics consent: not allowed/);
    assert.equal(await retry.isVisible(),false);
    await retry.evaluate(button=>button.click());assert.equal(log.length,0,'retry cannot load analytics without consent');
   }
  }
  assert.deepEqual(errors,[]);releaseRetry();passed++;await context.close();
 }
 console.log(`Metrica diagnostic passed: ${passed} RU/EN consent, blocked-script, HTTP 499 and retry scenarios; no real analytics events.`);
} finally {await browser.close();}

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {browser,base,root,fixture} from './v2-browser-fixtures.mjs';
const legal=await readFile(resolve(root,'legal.js'),'utf8'),css=await readFile(resolve(root,'legal.css'),'utf8');
let passed=0;
try {
 for(const language of ['ru','en']) for(const mode of ['normal','allowed','denied','blocked']) {
  const context=await browser.newContext(),page=await context.newPage(),log=[];
  await page.addInitScript(({mode})=>{
   localStorage.setItem('asgPrivacyConsent',JSON.stringify({version:'2026-04-30',analytics:mode!=='denied',savedAt:new Date().toISOString()}));
  },{mode});
  await page.addInitScript(language=>{localStorage.setItem('asgLang',language);},language);
  await page.route('**/*',async route=>{
   if(route.request().url().startsWith(base+'/__diagnostic__'))return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="${language}"><head><meta name="yandex-metrika-id" content="107697834"></head><body><footer class="footer-left"></footer></body></html>`});
   if(route.request().url().includes('mc.yandex.ru/metrika/tag.js')){
    log.push({url:route.request().url()});
    if(mode==='blocked')return route.abort('blockedbyclient');
    return route.fulfill({contentType:'application/javascript',body:'window.Ya={Metrika2:{counters:()=>[{id:107697834}]}};'});
   }
   return fixture(route,log);
  });
  await page.goto(base+'/__diagnostic__'+(mode==='normal'?'':'?_ym_debug=2'));
  await page.addStyleTag({content:css});
  await page.addScriptTag({content:legal});
  const panel=page.locator('#asg-metrika-diagnostic'),status=panel.locator('[data-metrika-status]');
  if(mode==='normal')assert.equal(await panel.count(),0);
  else {
   assert.equal(await panel.isVisible(),true);assert.match(await status.innerText(),/107697834/);
   if(mode==='allowed'){
    await page.waitForFunction(()=>window.Ya?.Metrika2?.counters?.().length);
    await panel.locator('button').nth(1).click();
    assert.match(await status.innerText(),language==='ru'?/Счётчик зарегистрирован: да/:/Counter registered: yes/);
    // Stored acceptance still exposes settings without changing the choice.
    await panel.locator('button').first().click();assert.equal(await page.locator('.asg-legal-banner').isVisible(),true);
   } else if(mode==='blocked'){
    await page.waitForFunction(()=>document.querySelector('[data-metrika-status]')?.textContent.match(/ошибка загрузки|failed to load/));
    assert.equal(await page.evaluate(()=>window.ASGLegal.hasAnalyticsConsent()),true);
   } else {
    assert.equal(log.length,0);assert.match(await status.innerText(),language==='ru'?/Согласие на аналитику: нет/:/Analytics consent: not allowed/);
   }
  }
  passed++;await context.close();
 }
 console.log(`Metrica diagnostic passed: ${passed} RU/EN consent, blocked-script and normal-page scenarios; no real analytics events.`);
} finally {await browser.close();}

import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
const reports=[];
try{
 for(const path of ['/','/en/','/old/','/old/en/'])for(const initial of [null,false,true]){
  console.log(`Checking consent ${path}: ${initial}`);
  const context=await browser.newContext(),page=await context.newPage(),log=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const consent=initial===null?null:{version:'2026-04-30',analytics:initial,savedAt:'2026-10-01T00:00:00.000Z'};
  // Cookie fallback reproduces a previous visit without relying on a new key.
  if(consent)await context.addCookies([{name:'asg_privacy_consent',value:encodeURIComponent(JSON.stringify(consent)),url:base}]);
  await page.route('**/*',r=>r.request().method()!=='GET'?r.fulfill({status:403,body:'{}'}):fixture(r,log));
  await page.goto(base+path,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.ASGLegal));
  // V2 binds its footer action in the module bootstrap, after legal.js exists.
  // A click before that module runs cannot exercise the actual settings action.
  if(!path.startsWith('/old/'))try{await page.waitForFunction(()=>document.querySelectorAll('#v2-rating-table tr[data-row]').length===10);}catch(e){console.error({path,initial,url:page.url(),errors,table:await page.locator('#v2-rating-table').innerText(),modules:await page.locator('script[type="module"]').evaluateAll(nodes=>nodes.map(n=>n.src))});throw e;}
  if(initial===true)await page.waitForFunction(()=>window.__v2MetrikaLoaded);
  const tags=()=>log.filter(r=>r.url.includes('mc.yandex.ru/metrika/tag.js')).length;
  assert.equal(tags(),initial===true?1:0);
  if(initial!==null)assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('asgPrivacyConsent')).analytics),initial);
  if(initial===null)await page.locator('.asg-legal-banner-btn-secondary').click();
  const settings=page.locator('[data-cookie-settings],.asg-legal-link-button').first();
  await settings.click();await page.locator('.asg-legal-banner-btn-primary').click();
  await page.waitForFunction(()=>window.__v2MetrikaLoaded);
  assert.equal(tags(),1);
  assert.equal(await page.evaluate(()=>window.ym.a.filter(a=>a[1]==='init'&&a[0]===107697834).length),1);
  await settings.click();await page.locator('.asg-legal-banner-btn-primary').click();assert.equal(tags(),1);
  await page.evaluate(()=>{document.cookie='_ym_uid=test; path=/';localStorage.setItem('_ym_uid','test');});
  await settings.click();
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('.asg-legal-banner-btn-secondary').click()]);
  await page.waitForFunction(()=>Boolean(window.ASGLegal));
  assert.equal(tags(),1,'withdrawal must not reinitialize');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('asgPrivacyConsent')).analytics),false);
  assert.equal(await page.evaluate(()=>localStorage.getItem('_ym_uid')),null);
  assert.ok(!(await context.cookies()).some(c=>c.name==='_ym_uid'));
  assert.deepEqual(errors,[]);
  reports.push({path,initial,status:'passed'});console.log(`Passed consent ${path}: ${initial}`);await context.close();
 }
}finally{await browser.close();}
await writeFile(resolve(root,'../tmp/v2-step5-consent.json'),JSON.stringify({reports,realAnalyticsEvents:0,realWrites:0},null,2)+'\n');
console.log(`Consent regression passed: ${reports.length} RU/EN/V1/V2 cases, cookie migration, deny/accept/withdrawal and one initialization.`);

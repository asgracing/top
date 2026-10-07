import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {browser,base,fixture,root,snapshot,site} from './v2-browser-fixtures.mjs';
const driver=Object.keys(snapshot.profiles)[0],race=Object.keys(site.results)[0],reports=[],failures=[];
const paths=['','hourly/','driver/?id='+driver,'races/','race/?id='+race,'news/','championships/','teams/','documents/read/?id=privacy','documents/read/?id=cookies','account/','account/settings/','moderation/','portal-ops/'];
try{
 for(const lang of ['ru','en'])for(const path of paths){
  const page=await browser.newPage({viewport:{width:1920,height:936},reducedMotion:'reduce'}),errors=[],log=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().method()!=='GET'?route.fulfill({status:403,body:'{}'}):fixture(route,log));
  const url=(lang==='en'?'/en/':'/')+path;
  try{
   assert.equal((await page.goto(base+url,{waitUntil:'networkidle'})).status(),200);
   await page.waitForTimeout(150);
   assert.equal(await page.locator('html').getAttribute('lang'),lang);
   assert.deepEqual(errors,[],url);
   assert.ok((await page.locator('body').innerText()).trim().length>50,'real legacy content');
   assert.equal(await page.locator('html').getAttribute('data-site-fallback'),'1');
   if(path.startsWith('race/'))assert.ok(await page.locator('#race-results-modal').evaluate(n=>!n.hidden),'direct race modal');
   if(path.startsWith('documents/read/'))assert.match(await page.locator('main').innerText(),path.endsWith('cookies')?/Cookie|cookie|куки/i:/персональн|Personal|personal/i);
   const wrong=await page.locator('a[href]').evaluateAll(list=>list.filter(a=>/^\/(?:ru|v2|preview)\//.test(a.getAttribute('href'))).map(a=>a.getAttribute('href')));
   assert.deepEqual(wrong,[],'no retired-prefix links');
   reports.push({url,lang,status:'passed'});
  }catch(e){failures.push({url,error:e.message,errors});console.error(failures.at(-1));}finally{await page.close();}
 }
}finally{await browser.close();}
await writeFile(resolve(root,'../tmp/v2-step4-fallback-browser.json'),JSON.stringify({reports,failures,realWrites:0},null,2)+'\n');
assert.deepEqual(failures,[]);
console.log(`Fallback browser passed: ${reports.length} root RU/EN screens, direct race results, policies and native access gates; no external writes.`);

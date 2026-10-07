// Public production feeds through the local GET proxy. No login, analytics or writes.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {browser,base,root} from './v2-browser-fixtures.mjs';
const reports=[],errors=[],failures=[];
try{
 const page=await browser.newPage({viewport:{width:1920,height:936},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push({url:page.url(),error:e.message}));
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(!['GET','HEAD'].includes(request.method()))return route.fulfill({status:403,body:'{}'});
  if(url.origin===base)return route.continue();
  if(url.hostname==='auth.asgracing.ru')return route.fulfill({contentType:'application/json',body:'{"authenticated":false}'});
  if(url.hostname==='data.asgracing.ru'&&!url.pathname.startsWith('/hourly-votes-api/'))return route.continue();
  return route.fulfill({status:403,body:'{}'});
 });
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelectorAll('#v2-rating-table tr[data-row]').length===10,{},{timeout:45000});
 await page.locator('.asg-legal-banner-btn-secondary').click();
 const profile=await page.locator('#v2-rating-table tr[data-row]').first().getAttribute('data-row');
 for(const tab of ['leaderboard','bestlaps','safety','clubs']){
  await page.locator(`#v2-site-shell [data-tab="${tab}"]`).click();
  await page.waitForFunction(()=>document.querySelector('#v2-page-input')&&!document.querySelector('#v2-page-input').disabled&&document.querySelector('#v2-rating-table tr[data-row]'),{},{timeout:45000});
  const before=await page.locator('#v2-rating-table tbody').innerText();
  if(!await page.locator('#v2-next').isDisabled()){
   await page.locator('#v2-next').click();
   await page.waitForFunction(()=>document.querySelector('#v2-page-number')?.textContent==='2'&&!document.querySelector('#v2-prev').disabled,{},{timeout:45000});
   assert.notEqual(await page.locator('#v2-rating-table tbody').innerText(),before);
   assert.equal(await page.locator('#v2-rating-table .rank-medal').count(),0);
  }
  reports.push({path:'/',table:tab,status:'passed'});
 }
 const paths=['/','/en/','/hourly/','/en/hourly/','/races/','/championships/','/hourly/championship/','/cars/','/fun-stats/','/bans/','/news/','/community/','/documents/','/privacy/','/driver/?id='+encodeURIComponent(profile)];
 for(const path of paths){
  try{
   console.log('Live read-only '+path);
   const response=await page.goto(base+path,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
   if(path==='/'||path==='/en/')await page.waitForFunction(()=>document.querySelectorAll('#v2-rating-table tr[data-row]').length===10,{},{timeout:45000});
   else await page.waitForFunction(()=>{const el=document.querySelector('#page-view');return el&&el.innerText.trim().length>80&&!/^(Загрузка…|Loading…)$/.test(el.innerText.trim());},{},{timeout:45000});
   assert.equal(await page.locator('#page-view .r24-error').count(),0,'Public data unavailable '+path);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+path);
   reports.push({path,status:'passed'});
  }catch(e){failures.push({path,error:e.message});console.error(failures.at(-1));}
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
}finally{
 await writeFile(resolve(root,'../tmp/v2-final-live-readonly.json'),JSON.stringify({reports,errors,failures,productionWrites:0,analyticsRequests:0},null,2)+'\n');
 await browser.close();
}
console.log(`Root public-data check passed: ${reports.length} page/table checks, no production writes.`);

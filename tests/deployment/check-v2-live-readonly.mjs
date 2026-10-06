// Optional public-data smoke. Never forwards mutation, auth, analytics or voting requests.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'../..');
let pw;
for(const folder of await fs.readdir('C:/Users/Andrew/AppData/Local/npm-cache/_npx')){
  try{pw=await import(pathToFileURL(`C:/Users/Andrew/AppData/Local/npm-cache/_npx/${folder}/node_modules/playwright/index.mjs`).href);break}catch{}
}
assert.ok(pw,'Playwright is required');
const base=process.env.ASG_V2_PREVIEW||'http://127.0.0.1:8840';
const browser=await pw.chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report={transport:'browser direct',errors:[],responses:[],failedRequests:[],consoleErrors:[],blockedMutations:0};
try{
  const page=await browser.newPage({viewport:{width:1920,height:936},reducedMotion:'reduce'});
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('requestfailed',request=>{if(report.failedRequests.length<20)report.failedRequests.push({url:request.url(),error:request.failure()?.errorText})});
  page.on('console',message=>{if(message.type()==='error'&&report.consoleErrors.length<10)report.consoleErrors.push(message.text())});
  page.on('response',response=>{
    if(response.url().startsWith('https://data.asgracing.ru/'))report.responses.push({url:response.url(),status:response.status()});
  });
  await page.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(!['GET','HEAD'].includes(request.method())){report.blockedMutations++;return route.fulfill({status:403,contentType:'application/json',body:'{}'})}
    if(url.origin===base)return route.continue();
    if(url.hostname==='auth.asgracing.ru')return route.fulfill({status:200,contentType:'application/json',body:'{"authenticated":false}'});
    if(url.hostname==='data.asgracing.ru'&&!url.pathname.startsWith('/hourly-votes-api/'))return route.continue();
    return route.fulfill({status:403,contentType:'application/json',body:'{}'});
  });
  await page.goto(base+'/v2/ru/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelectorAll('#v2-rating-table tr[data-row]').length===10,{},{timeout:45000});
  await page.waitForTimeout(1000);
  await page.locator('.asg-legal-banner-btn-secondary').click();
  await page.locator('#v2-site-shell [data-tab="clubs"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('#v2-rating-table tr[data-row]').length>0,{},{timeout:15000});
  report.clubs=await page.locator('#v2-rating-table tr[data-row]').count();
  await page.locator('#v2-site-shell [data-tab="leaderboard"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('#v2-rating-table tr[data-row]').length===10);
  report.servers=await page.locator('#v2-servers .server-card').count();
  report.event=await page.locator('#v2-event-track').textContent();
  report.winner=await page.locator('#v2-winner-name').textContent();
  report.profileStats=await page.locator('#v2-winner-results').textContent();
  await page.screenshot({path:path.join(root,'design-research/v2-verification/live-home-ru.png')});
  assert.deepEqual(report.errors,[]);assert.equal(report.servers,9);
  assert.ok(report.responses.some(response=>response.url.includes('/top-data/v2/home.json')&&response.status===200));
  console.log(JSON.stringify(report));
  await fs.writeFile(path.join(root,'design-research/v2-verification/live-readonly.json'),JSON.stringify(report,null,2));
}catch(error){await fs.writeFile(path.join(root,'design-research/v2-verification/live-readonly.json'),JSON.stringify({...report,failure:error.message},null,2));console.log(JSON.stringify(report));throw error}finally{await browser.close()}

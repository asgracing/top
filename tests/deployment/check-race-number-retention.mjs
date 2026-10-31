// Real built account and bell controllers; every remote request is intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,signedDriver,root} from './v2-browser-fixtures.mjs';
const output=process.env.ASG_QA_OUTPUT_DIR;
assert.ok(output,'Set ASG_QA_OUTPUT_DIR to the task scratch directory');
await fs.mkdir(output,{recursive:true});
const reports=[];
try {
 for(const lang of ['ru','en']) for(const width of [1280,390,320]) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[],writes=[],failedAssets=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)failedAssets.push(response.url());});
  const expires=new Date(Date.now()+3*86400000).toISOString();
  const auth={authenticated:true,linked:true,driver:{public_id:signedDriver,display_name:'Fixture Pilot',profile_url:'/driver/?id='+signedDriver},
   steam:{persona_name:'Fixture Pilot'},csrf_token:'fixture-csrf',preferences:{race_number:765,can_change:true,
    retention:{activity_verified:true,expires_at:expires}},titles:{enabled:true,available:[],active:null},clubs_teams:{enabled:false}};
  let taken=false,fail=false,availabilityReads=0;
  await page.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.hostname==='auth.asgracing.ru') {
    if(url.pathname==='/v1/me')return route.fulfill({contentType:'application/json',body:JSON.stringify(auth)});
    if(url.pathname==='/v1/me/race-numbers') {
     availabilityReads++;
     return route.fulfill({status:fail?503:200,contentType:'application/json',body:JSON.stringify({min:1,max:999,assigned:taken?[7,77,765]:[77,765],pending:[88],revision:1})});
    }
    if(url.pathname==='/v1/me/notifications')return route.fulfill({contentType:'application/json',body:JSON.stringify({linked:true,
     items:[{id:1,event_type:'race_number.expiring',occurred_at:new Date().toISOString(),read:false,actionable:true,details:{number:765,expires_at:expires}}],unread_count:1,latest_id:1,next_before:null})});
    if(url.pathname==='/v1/me/race-number') {
     writes.push(request.postDataJSON());assert.equal(request.headers()['x-csrf-token'],'fixture-csrf');taken=true;
     return route.fulfill({status:409,contentType:'application/json',body:'{"detail":"race_number_taken"}'});
    }
   }
   if(url.hostname==='data.asgracing.ru'&&url.pathname==='/hourly-votes-api/voter-token')return fixture(route,[],{signed:true});
   assert.equal(request.method(),'GET','Unexpected mutation '+url.pathname);
   return fixture(route,[],{signed:true});
  });
  await page.goto(base+(lang==='en'?'/en':'')+'/account/settings/',{waitUntil:'networkidle'});
  const consent=page.locator('.asg-legal-banner-btn-secondary');if(await consent.isVisible())await consent.click();
  const picker=page.locator('#race-number-picker');
  await picker.locator('[data-number="1"]').waitFor({timeout:10000}).catch(async error=>{
   await page.screenshot({path:path.join(output,`failed-${lang}-${width}.png`),fullPage:true});
   console.log(JSON.stringify({lang,width,errors,failedAssets,availabilityReads,picker:await picker.count(),url:page.url(),text:await page.locator('body').innerText()}));throw error;
  });
  assert.match(await page.locator('#race-number-retention').textContent(),/60/);
  assert.match(await page.locator('#race-number-retention').textContent(),/00:00/);
  assert.match(await picker.locator('[role="status"]').textContent(),/996/);
  const search=picker.locator('input[type="search"]');
  await search.fill('7');await picker.locator('[data-number="7"]').click();
  assert.equal(await page.locator('#race-number-input').inputValue(),'7');
  await search.fill('77');await picker.locator('[data-number-filter="occupied"]').click();
  assert.equal(await picker.locator('[data-number="77"]').isDisabled(),true);
  const assignedColor=await picker.locator('[data-number="77"]').evaluate(el=>getComputedStyle(el).borderTopColor);
  await search.fill('88');assert.equal(await picker.locator('[data-number="88"]').getAttribute('data-number-status'),'pending');
  const pendingColor=await picker.locator('[data-number="88"]').evaluate(el=>getComputedStyle(el).borderTopColor);
  assert.notEqual(assignedColor,pendingColor,'Assigned and pending numbers have distinct labels and colours');
  await search.fill('765');assert.equal(await picker.locator('[data-number="765"]').getAttribute('data-number-status'),'own');
  await search.fill('7');await picker.locator('[data-number-filter="free"]').click();
  const styles=await picker.locator('[data-number="7"]').evaluate(el=>({border:getComputedStyle(el).borderTopWidth,display:getComputedStyle(el.parentElement).display}));
  assert.equal(styles.display,'grid');assert.notEqual(styles.border,'0px');
  await page.locator('#race-number-submit').click();
  await page.waitForFunction(()=>document.getElementById('race-number-message')?.dataset.kind==='error');
  await page.waitForFunction(()=>!document.querySelector('#race-number-picker [data-number="7"]'));
  assert.deepEqual(writes,[{race_number:7}]);assert.ok(availabilityReads>=2);
  fail=true;await picker.locator('.race-number-picker-tools button').click();
  await page.waitForFunction(()=>document.querySelector('#race-number-picker [role="status"]')?.textContent.includes(document.documentElement.lang==='en'?'could not':'Не удалось'));
  assert.equal(await picker.locator('[data-number]').count(),0,'Failed request must not present unchecked numbers as free');
  fail=false;await picker.locator('.race-number-picker-tools button').click();
  await picker.locator('[data-number="17"]').waitFor();
  await search.fill('');await picker.locator('[data-number-filter="all"]').click();
  assert.equal(await picker.locator('[data-number="7"]').getAttribute('aria-pressed'),'false');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await picker.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`numbers-${lang}-${width}.png`)});
  const bell=page.locator('.personal-notifications-bell');await bell.click();
  const dialog=page.locator('.personal-notifications-dialog');await dialog.waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelectorAll('.personal-notifications-dialog .personal-notification').length===1);
  assert.match(await dialog.textContent(),lang==='ru'?/Зайдите на игровой сервер/:/Join an ASG game server/);
  assert.match(await dialog.textContent(),lang==='ru'?/Дата отвязки/:/Release date/);
  assert.match(await dialog.locator('a').getAttribute('href'),/account\/settings\//);
  assert.ok(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1));
  await page.screenshot({path:path.join(output,`warning-${lang}-${width}.png`)});
  assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
  reports.push({lang,width,availabilityReads,writes:1,errors,failedAssets});await page.close();
 }
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(reports,null,2));
 console.log(`Race-number retention UI: ${reports.length} built RU/EN desktop/mobile scenarios passed; all remote requests intercepted.`);
} finally { await browser.close(); }

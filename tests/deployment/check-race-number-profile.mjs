// Expiry stays in the private account, never on the public driver profile.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
const output=process.env.ASG_QA_OUTPUT_DIR;assert.ok(output,'Set the task QA output directory');
await fs.mkdir(output,{recursive:true});
const profile=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/public.json'),'utf8')).driver;
const now=Date.now(),day=86400000,expires=new Date(now+2*day).toISOString(),reports=[];
const payload={authenticated:true,linked:true,driver:{public_id:profile.public_id,display_name:'Fixture Pilot',profile_url:'/driver/?id='+profile.public_id},
 steam:{persona_name:'Fixture Pilot'},csrf_token:'fixture-csrf',preferences:{race_number:77,can_change:true,retention:{activity_verified:true,expires_at:expires}},
 titles:{enabled:true,available:[],active:null},clubs_teams:{enabled:false}};
async function publish(page,auth){
 await page.evaluate(async raw=>{
  const {normalizeAuthPayload}=await import('/src/features/auth/header-auth.js?v=20261102adminnumbers1');
  const bridge=await import('/v2/bridge.js?v=20261006v2k');let model;bridge.subscribe(next=>model=next)();
  bridge.publish({...model,auth:normalizeAuthPayload(raw)});
 },auth);
}
async function create(lang,width,screen,auth=payload){
 const page=await browser.newPage({viewport:{width,height:940},reducedMotion:'reduce'}),errors=[];
 await page.addInitScript(value=>Date.now=()=>value,now);
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.hostname==='auth.asgracing.ru'&&url.pathname==='/v1/me')return route.fulfill({contentType:'application/json',body:JSON.stringify(auth)});
  if(url.hostname==='data.asgracing.ru'&&url.pathname==='/top-data/v2/drivers/'+profile.public_id+'.json')return route.fulfill({contentType:'application/json',body:JSON.stringify({...profile,race_number:77})});
  if(url.hostname==='data.asgracing.ru'&&url.pathname==='/hourly-votes-api/voter-token')return fixture(route,[],{signed:true});
  assert.equal(request.method(),'GET','No production mutations are permitted');return fixture(route,[],{signed:auth.authenticated});
 });
 await page.goto(base+(lang==='en'?'/en':'')+(screen==='account'?'/account/':'/driver/?id='+profile.public_id),{waitUntil:'networkidle'});
 const consent=page.locator('.asg-legal-banner-btn-secondary');if(await consent.isVisible())await consent.click();
 return {page,errors};
}
try{
 for(const screen of ['account'])for(const lang of ['ru','en'])for(const width of [1280,390,320]){
  const {page,errors}=await create(lang,width,screen),card=page.locator('.race-number-validity');
  await card.waitFor();assert.equal(await card.count(),1);
  assert.equal(await card.getAttribute('data-number-validity'),'warning');
  assert.match(await card.textContent(),/#77/);assert.match(await card.textContent(),lang==='ru'?/2 дня/:/2 days/);
  assert.match(await card.textContent(),lang==='ru'?/МСК/:/MSK/);
  assert.ok(await card.evaluate(el=>getComputedStyle(el).borderTopWidth!=='0px'));
  assert.equal(await card.evaluate(el=>Boolean(el.closest('.control-summary>article'))),true);
  await card.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`${screen}-${lang}-${width}.png`)});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await publish(page,{...payload,preferences:{...payload.preferences,retention:{activity_verified:true,expires_at:new Date(now+60*day).toISOString()}}});
  await page.waitForFunction(()=>document.querySelector('.race-number-validity')?.dataset.numberValidity==='active');
  assert.match(await card.textContent(),lang==='ru'?/60 дней/:/60 days/);
  await publish(page,{...payload,preferences:{...payload.preferences,retention:{activity_verified:true,expires_at:null,permanent:true}}});
  await page.waitForFunction(()=>document.querySelector('.race-number-validity')?.dataset.numberValidity==='permanent');
  assert.match(await card.textContent(),lang==='ru'?/Закреплён бессрочно/:/Reserved indefinitely/);
  assert.equal(await card.locator('time').count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await card.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`admin-${screen}-${lang}-${width}.png`)});
  await publish(page,{...payload,preferences:{...payload.preferences,retention:{activity_verified:false,expires_at:null}}});
  await page.waitForFunction(()=>document.querySelector('.race-number-validity')?.dataset.numberValidity==='unknown');
  assert.equal(await card.locator('time').count(),0);
  await publish(page,{...payload,preferences:{race_number:null}});
  await page.waitForFunction(()=>!document.querySelector('.race-number-validity'));
  await publish(page,payload);await card.waitFor();
  await publish(page,{authenticated:false});await page.waitForFunction(()=>!document.querySelector('.race-number-validity'));
  assert.deepEqual(errors,[]);reports.push({screen,lang,width,errors});await page.close();
 }
 for(const lang of ['ru','en'])for(const width of [1280,390,320])for(const auth of [payload,{authenticated:false},{...payload,driver:{...payload.driver,public_id:'drv_other'}}]){
  const {page,errors}=await create(lang,width,'driver',auth);await page.locator('.profile-heading').waitFor();
  assert.equal(await page.locator('.race-number-validity').count(),0);
  assert.equal(await page.locator('[data-profile-number-validity]').count(),0);
  assert.equal(await page.locator('[data-number-validity-style]').count(),0);
  await publish(page,payload);
  await publish(page,{...payload,preferences:{...payload.preferences,retention:{activity_verified:true,expires_at:new Date(now+60*day).toISOString()}}});
  await page.waitForTimeout(1100);
  assert.equal(await page.locator('.race-number-validity,[data-profile-number-validity]').count(),0,'Owner auth/renewal must never add an expiry to the public profile');
  assert.equal(await page.locator('[data-number-validity-style]').count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const audience=auth.authenticated?(auth.driver.public_id===profile.public_id?'owner':'other'):'guest';
  if(audience==='owner'&&width===390)await page.screenshot({path:path.join(output,`public-driver-${lang}-${width}.png`)});
  assert.deepEqual(errors,[]);reports.push({screen:'driver',audience,lang,width,errors});await page.close();
 }
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(reports,null,2));
 console.log(`Private number validity: ${reports.length} built UI scenarios passed; account renewal/unknown/release/logout and public owner/guest/other privacy.`);
}finally{await browser.close();}

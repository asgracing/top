// Real controllers; occupied numbers, requests and auth are isolated fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,signedDriver,root} from './v2-browser-fixtures.mjs';
const out=path.resolve(process.env.ASG_QA_OUTPUT_DIR||path.join(root,'../_archive/tmp/2026-10-11/race-number-feedback/browser'));
await fs.mkdir(out,{recursive:true});
const reports=[];
async function waitReply(getReply){for(let attempt=0;attempt<200;attempt++){if(getReply())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Fixture request did not arrive');}
try{
 for(const language of ['ru','en'])for(const width of [1280,390,320])for(const classic of [false,true]){
  const page=await browser.newPage({viewport:{width,height:800},reducedMotion:'reduce'}),errors=[],writes=[];
  page.on('pageerror',error=>errors.push(error.message));
  let detail='race_number_taken',reply;
  const auth={authenticated:true,linked:true,driver:{public_id:signedDriver,display_name:'Fixture Pilot',profile_url:'/driver/?id='+signedDriver},steam:{persona_name:'Fixture Pilot'},csrf_token:'fixture-csrf',preferences:{race_number:765,can_change:true},titles:{enabled:true,available:[],active:null},clubs_teams:{enabled:false}};
  await page.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.hostname==='auth.asgracing.ru'&&url.pathname==='/v1/me')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(auth)});
   if(url.hostname==='auth.asgracing.ru'&&url.pathname==='/v1/me/race-number'){
    assert.equal(request.headers()['x-csrf-token'],'fixture-csrf');writes.push(request.postDataJSON());
    const decision=await new Promise(resolve=>reply=resolve);
    if(decision){auth.preferences.pending_request={request_id:'fixture-request',race_number:writes.at(-1).race_number,requested_at:new Date().toISOString()};return route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({preferences:auth.preferences})});}
    return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({detail})});
   }
   if(url.hostname==='data.asgracing.ru'&&url.pathname==='/hourly-votes-api/voter-token')return fixture(route,[],{signed:true});
   assert.equal(request.method(),'GET','Unexpected mutation: '+url.pathname);
   return fixture(route,[],{signed:true});
  });
  const prefix=classic?(language==='en'?'/old/en/':'/old/'):(language==='en'?'/en/':'/');
  await page.goto(base+prefix+'account/settings/',{waitUntil:'networkidle'});
  const consent=page.locator('.asg-legal-banner-btn-secondary');if(await consent.isVisible())await consent.click();
  const input=page.locator('#race-number-input'),button=page.locator('#race-number-submit'),message=page.locator('#race-number-message');
  await input.fill('77');await button.click();
  await page.waitForFunction(()=>document.getElementById('race-number-submit')?.getAttribute('aria-busy')==='true');
  assert.equal(await button.isDisabled(),true);
  assert.match(await message.textContent(),language==='ru'?/Выполняем/:/Processing/);
  await page.waitForFunction(()=>document.getElementById('race-number-submit')?.disabled);
  await waitReply(()=>reply);reply(false);
  await page.waitForFunction(()=>document.getElementById('race-number-message')?.dataset.kind==='error');
  assert.match(await message.textContent(),language==='ru'?/Номер #77.*Выберите другой номер/:/Number #77.*Choose a different number/);
  assert.equal(await input.inputValue(),'77');assert.equal(await input.getAttribute('aria-invalid'),'true');
  assert.equal(await button.isDisabled(),false);assert.equal(await button.getAttribute('aria-busy'),null);
  const measured=await message.evaluate(node=>{const rect=node.getBoundingClientRect();return {top:rect.top,bottom:rect.bottom,viewport:innerHeight,insideNumberPanel:Boolean(node.closest('.account-number-settings'))};});
  assert.equal(measured.insideNumberPanel,true);assert.ok(measured.top>=-1&&measured.bottom<=measured.viewport+1,JSON.stringify(measured));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  if(!classic&&language==='ru')await page.screenshot({path:path.join(out,`taken-${width}.png`)});
  await input.fill('1000');assert.equal(await input.getAttribute('aria-invalid'),null);assert.equal(await message.textContent(),'');
  await button.click();assert.equal(writes.length,1);assert.match(await message.textContent(),language==='ru'?/целое число от 1 до 999/:/whole number from 1 to 999/);
  for(const [code,expected] of [['race_number_already_assigned',language==='ru'?/за вами/:/assigned to you/],['race_number_request_pending',language==='ru'?/уже есть заявка/:/pending number request/],['race_number_cooldown',language==='ru'?/пока нельзя/:/cannot change/]]){
   detail=code;reply=null;await input.fill('78');await button.click();await page.waitForFunction(()=>document.getElementById('race-number-submit')?.getAttribute('aria-busy')==='true');await waitReply(()=>reply);reply(false);await page.waitForFunction(()=>document.getElementById('race-number-message')?.dataset.kind==='error');assert.match(await message.textContent(),expected);
  }
  reply=null;await input.fill('79');await button.click();await page.waitForFunction(()=>document.getElementById('race-number-submit')?.getAttribute('aria-busy')==='true');await waitReply(()=>reply);reply(true);
  await page.waitForFunction(()=>document.getElementById('race-number-message')?.dataset.kind==='success');
  assert.match(await message.textContent(),language==='ru'?/Заявка отправлена/:/Request sent for moderation/);
  assert.equal(await input.isDisabled(),true);assert.equal(await button.isDisabled(),true);
  assert.deepEqual(errors,[]);reports.push({language,width,classic,requests:writes.length,measured,errors});await page.close();
 }
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(reports,null,2));
 console.log(`Race-number feedback passed: ${reports.length} RU/EN desktop/mobile/classic scenarios; occupied, validation, own number, pending request, cooldown and success; all mutations intercepted.`);
}finally{await browser.close()}

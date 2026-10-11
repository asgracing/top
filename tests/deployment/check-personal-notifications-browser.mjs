// Real header/controllers; all API traffic and read mutations stay in fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,signedDriver} from './v2-browser-fixtures.mjs';

const output=process.env.ASG_NOTIFICATION_CHECK_OUTPUT;
if(!output)throw Error('Set ASG_NOTIFICATION_CHECK_OUTPUT to the task scratch directory');
await fs.mkdir(output,{recursive:true});
const reports=[];
try{
 for(const lang of ['ru','en'])for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[],log=[];let writes=0,fail=false;
  page.on('pageerror',e=>errors.push(e.message));
  const items=[
   {id:4,event_type:'ban.issued',occurred_at:'2026-10-11T10:00:00Z',read:false,actionable:true,details:{reason_code:'strike_limit',comment:'Test reason <script>window.__bad=true</script>',active_strikes:3}},
   {id:3,event_type:'invitation.team',occurred_at:'2026-10-11T09:00:00Z',read:false,actionable:true,details:{target_display_name:'ASG Test Team',sender_display_name:'Captain',initiated_by_public_id:signedDriver,expires_at:'2099-01-01T00:00:00Z'}},
   {id:2,event_type:'race_number.approved',occurred_at:'2026-10-11T08:00:00Z',read:false,actionable:true,details:{number:77}},
   {id:1,event_type:'invitation.club',occurred_at:'2026-10-10T08:00:00Z',read:true,actionable:false,details:{target_display_name:'Expired Club'}},
  ];
  await page.route('**/*',route=>fixture(route,log,{signed:true,admin:true}));
  await page.route('**/*.kaspersky-labs.com/**',route=>route.abort());
  await page.route('https://auth.asgracing.ru/v1/me/notifications**',async route=>{
   const req=route.request();
   if(fail&&req.method()==='GET')return route.fulfill({status:503,body:'{}'});
   if(req.method()==='POST'){
    writes++;assert.equal(req.headers()['x-csrf-token'],'test-only-csrf');
    const selection=req.postDataJSON();for(const item of items)if(selection.ids?.includes(item.id)||item.id<=selection.all_before)item.read=true;
   }else assert.equal(req.method(),'GET');
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({linked:true,items,unread_count:items.filter(i=>!i.read).length,latest_id:4,next_before:null})});
  });
  await page.goto(`${base}/${lang}/`,{waitUntil:'domcontentloaded'});
  const bell=page.locator('.personal-notifications-bell');await bell.waitFor();
  await bell.click();const dialog=page.locator('.personal-notifications-dialog');await dialog.waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelectorAll('.personal-notifications-dialog .personal-notification').length===4);
  assert.equal(writes,0,'Opening the bell does not mark notifications read');
  assert.equal(await dialog.locator('.personal-notification').count(),4);
  assert.equal(await page.evaluate(()=>window.__bad),undefined);
  assert.equal(await dialog.locator('.personal-notification').last().locator('a').count(),0,'Inactive invitation has no acceptance link');
  assert.ok(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1),'Mobile dialog has no horizontal overflow');
  await dialog.locator('[data-notification-focus="read-4"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.personal-notifications-dialog .is-unread').length===2);
  assert.equal(writes,1);await page.screenshot({path:path.join(output,`notifications-${lang}-${width}.png`)});
  await dialog.locator('[data-notification-focus="all"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.personal-notifications-dialog .is-unread').length===0);
  await dialog.getByRole('button',{name:lang==='ru'?'Новости':'News',exact:true}).click();
  assert.ok(await dialog.locator('.personal-notification').count()>0,'Existing news remain available');
  assert.equal(writes,2,'News tab does not change private read state');
  await dialog.getByRole('button',{name:lang==='ru'?'Личные':'Personal',exact:true}).click();
  await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);
  await page.waitForFunction(()=>document.activeElement?.classList.contains('personal-notifications-bell'));
  fail=true;await bell.click();
  await page.waitForFunction(()=>document.querySelector('.personal-notifications-dialog [role="status"]')?.textContent.includes(document.documentElement.lang==='en'?'could not':'Не удалось'));
  assert.equal(errors.length,0,errors.join('\n'));
  reports.push({lang,width,items:4,fixtureWrites:writes});await page.close();
 }
 for(const route of ['/ru/races/','/ru/hourly/','/ru/account/','/ru/moderation/','/ru/portal-ops/']){
  const page=await browser.newPage({viewport:{width:390,height:900}}),log=[];
  await page.route('**/*',request=>fixture(request,log,{signed:true,admin:true}));
  await page.route('**/*.kaspersky-labs.com/**',request=>request.abort());
  await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.locator('.personal-notifications-bell').waitFor();
  assert.equal(await page.locator('.personal-notifications-bell').count(),1,route);reports.push({route,bell:true});await page.close();
 }
 {
  const page=await browser.newPage(),log=[];let requests=0;
  await page.route('**/*',route=>fixture(route,log));
  await page.route('**/*.kaspersky-labs.com/**',route=>route.abort());
  await page.route('https://auth.asgracing.ru/v1/me/notifications**',route=>{requests++;return route.fulfill({status:401,body:'{}'})});
  await page.goto(base+'/ru/',{waitUntil:'domcontentloaded'});
  await page.locator('#v2-profile-trigger').getByText('Войти через Steam').waitFor();
  assert.equal(requests,0,'Guest never queries another driver inbox');
  assert.equal(await page.locator('.personal-notifications-dialog').count(),0,'Private UI is loaded only after authentication');
  reports.push({anonymous:true,privateRequests:requests});await page.close();
 }
 console.log(JSON.stringify(reports));
}finally{await browser.close()}

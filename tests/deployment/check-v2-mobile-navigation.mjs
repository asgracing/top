import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browser,base,fixture,signedDriver} from './v2-browser-fixtures.mjs';
const reports=[],image=await fs.readFile('C:/Python/asgracing/top/assets/spa.jpg');
async function setup(lang,width,signed) {
 const page=await browser.newPage({viewport:{width,height:667},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>sessionStorage.setItem('asgV2IntroSeen','1'));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(signed&&url.hostname==='auth.asgracing.ru'&&url.pathname==='/v1/me')return route.fulfill({contentType:'application/json',body:JSON.stringify({authenticated:true,linked:true,driver:{public_id:signedDriver,display_name:'Andrei Soldatenkov [ASG]',profile_url:'/driver/?id='+signedDriver,rank:3,elo:1445,sr:9.99},steam:{persona_name:'Test pilot',avatar_url:'https://avatars.steamstatic.com/header-test.jpg'},preferences:{race_number:765},permissions:{}})});
  if(url.hostname==='avatars.steamstatic.com')return route.fulfill({contentType:'image/jpeg',body:image});
  return fixture(route,[],{signed,admin:signed});
 });
 await page.goto(base+(lang==='en'?'/en/':'/'),{waitUntil:'networkidle'});
 await page.locator('#v2-profile-trigger').waitFor();
 if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
 if(signed)await page.waitForFunction(()=>document.querySelector('#v2-header-profile-ratings'));
 return {page,errors};
}
try {
 for(const lang of ['ru','en'])for(const width of [320,360,375,390,430,600,601,768,1024,1440])for(const signed of [false,true]) {
  const {page,errors}=await setup(lang,width,signed),mobile=width<=600;
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal page overflow');
  assert.equal(await page.locator('#v2-menu-trigger').isVisible(),mobile);
  if(mobile) {
   assert.equal(await page.locator('.header>.navigation').count(),0);
   assert.equal(await page.locator('#v2-mobile-menu .version-switch').count(),1);
   assert.equal(await page.locator('#v2-mobile-menu #v2-language a').count(),2);
   const rects=await page.evaluate(()=>{
    const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    return {header:rect('.header'),profile:rect('#v2-profile-trigger'),bell:rect('#v2-notification-trigger'),menu:rect('#v2-menu-trigger'),badges:[...document.querySelectorAll('#v2-header-profile-ratings .rating-badge')].map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})};
   });
   assert.ok(rects.profile.top>=rects.menu.bottom,'Profile is on its own row');
   assert.ok(rects.bell.height>=44&&rects.menu.height>=44,'Comfortable touch targets');
   assert.ok(rects.profile.right<=width&&rects.profile.left>=0);
   if(signed){assert.equal(rects.badges.length,2);assert.ok(rects.badges[0].right+3<=rects.badges[1].left,'ELO and SR separated');assert.ok(rects.badges.every(r=>r.right<=rects.profile.right&&r.bottom<=rects.profile.bottom),'Badges stay inside profile');}
   await page.locator('#v2-menu-trigger').click();
   await page.waitForFunction(()=>document.querySelector('#v2-mobile-menu').matches(':popover-open'));
   assert.equal(await page.locator('#v2-menu-trigger').getAttribute('aria-expanded'),'true');
   assert.ok(await page.locator('#v2-mobile-menu .navigation>a').first().isVisible());
   const groups=page.locator('#v2-mobile-menu .nav-group');
   await groups.first().locator('summary').click();
   assert.ok(await groups.first().locator('a').first().isVisible());
   const groupRect=await groups.first().evaluate(n=>({width:n.getBoundingClientRect().width,scrollWidth:n.scrollWidth}));assert.ok(groupRect.scrollWidth<=groupRect.width+1);
   await page.keyboard.press('Escape');
   await page.waitForFunction(()=>!document.querySelector('#v2-mobile-menu').matches(':popover-open'));
   assert.equal(await page.locator('#v2-menu-trigger').evaluate(n=>n===document.activeElement),true);
   await page.locator('#v2-profile-trigger').click();
   await page.waitForFunction(()=>document.querySelector('#v2-profile-popover').matches(':popover-open'));
   if(signed)assert.equal(await page.locator('#v2-profile-popover .driver-ratings .rating-badge').count(),2);
   await page.keyboard.press('Escape');
   await page.locator('#v2-notification-trigger').click();
   await page.waitForFunction(()=>document.querySelector('#v2-notification-popover').matches(':popover-open'));
   await page.keyboard.press('Escape');
   if(width===375&&lang==='ru'&&signed){
    await page.screenshot({path:'C:/Python/asgracing/tmp/mobile-header-375.png'});
    await page.locator('#v2-menu-trigger').click();
    await page.screenshot({path:'C:/Python/asgracing/tmp/mobile-menu-375.png'});
    await page.keyboard.press('Escape');
    await page.setViewportSize({width:1024,height:667});await page.waitForFunction(()=>document.querySelector('.header>.navigation'));
    assert.equal(await page.locator('.header>.navigation').count(),1);assert.equal(await page.locator('.header-actions>.v2-language').count(),1);
    await page.setViewportSize({width:375,height:667});await page.waitForFunction(()=>document.querySelector('#v2-mobile-menu .navigation'));
    assert.equal(await page.locator('#v2-mobile-menu .navigation').count(),1);
    await page.locator('#v2-menu-trigger').click();
    await page.locator('#v2-mobile-menu [data-modal="rules"]').click();
    await page.locator('#v2-modal').waitFor({state:'visible'});
    assert.equal(await page.locator('#v2-mobile-menu').evaluate(n=>n.matches(':popover-open')),false);
    await page.locator('#v2-modal .modal-close').click();
    await page.waitForFunction(()=>document.activeElement?.id==='v2-menu-trigger');
    assert.equal(await page.locator('#v2-menu-trigger').evaluate(n=>n===document.activeElement),true,'Return focus from rules to menu');
    await page.setViewportSize({width:667,height:375});await page.waitForFunction(()=>document.querySelector('.header>.navigation'));
    await page.setViewportSize({width:375,height:375});await page.waitForFunction(()=>document.querySelector('#v2-mobile-menu .navigation'));
    await page.locator('#v2-menu-trigger').click();
    const menuBounds=await page.locator('#v2-mobile-menu').boundingBox();assert.ok(menuBounds.y+menuBounds.height<=375,'Menu fits a short viewport');
    const hourly=page.locator('#v2-mobile-menu [data-copy="hourlyNav"]');
    await hourly.locator('xpath=ancestor::details/summary').click();
    await hourly.click();await page.waitForFunction(()=>document.documentElement.dataset.v2Page==='hourly');
    await page.locator('#v2-menu-trigger').waitFor({state:'visible'});
   }
  } else {
   assert.equal(await page.locator('.header>.navigation').count(),1);
   assert.equal(await page.locator('.header-actions>.version-switch').count(),1);
  }
  assert.deepEqual(errors,[]);reports.push({lang,width,signed,mobile});await page.close();
 }
 await fs.writeFile('C:/Python/asgracing/tmp/mobile-navigation-check.json',JSON.stringify(reports,null,2));console.log(JSON.stringify({passed:reports.length}));
} finally {await browser.close();}

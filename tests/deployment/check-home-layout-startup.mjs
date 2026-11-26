import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
import {browser,base,fixture} from './v2-browser-fixtures.mjs';

const reports=[];
try{
 for(const test of [
  {name:'membership-slow-config',version:'membership',configDelay:700},
  {name:'membership-slow-css',version:'membership',cssDelay:700},
  {name:'membership-new-year',version:'membership',newYear:true},
  {name:'current-en-mobile',version:'current',language:'en',width:390},
  {name:'membership-en-mobile',version:'membership',language:'en',width:390},
  {name:'config-error',version:'current',configError:true},
  {name:'config-timeout',version:'current',configVersion:'membership',configDelay:3200},
  {name:'css-error',version:'current',configVersion:'membership',cssError:true},
  {name:'css-timeout',version:'current',configVersion:'membership',cssDelay:4800},
  {name:'boot-unavailable',version:'current',bootError:true},
  {name:'javascript-disabled',version:'current',noJS:true}
 ]){
  const page=await browser.newPage({viewport:{width:test.width||1440,height:900},reducedMotion:'reduce',javaScriptEnabled:!test.noJS}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   window.__homePaints=[];
   const sample=()=>{
    const root=document.documentElement,shell=document.getElementById('v2-site-shell');
    if(shell){const style=getComputedStyle(shell);if(style.visibility!=='hidden'&&style.display!=='none'&&style.opacity!=='0'){
     const frame={version:root.dataset.homeVersion||'unselected',state:root.dataset.homeLayoutState||'unprotected'};
     const previous=window.__homePaints.at(-1);if(!previous||previous.version!==frame.version||previous.state!==frame.state)window.__homePaints.push(frame);
    }}
    requestAnimationFrame(sample);
   };requestAnimationFrame(sample);
  });
  let configReads=0,newYearRequested=false;
  await page.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.pathname==='/src/features/site-appearance/new-year.js')newYearRequested=true;
   if(url.hostname==='auth.asgracing.ru'&&url.pathname==='/v1/public/site-appearance'){
    configReads++;
    if(test.configDelay)await new Promise(resolve=>setTimeout(resolve,test.configDelay));
    try{await route.fulfill({status:test.configError?503:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':base},body:JSON.stringify({home_version:test.configVersion||test.version,new_year_enabled:Boolean(test.newYear),revision:1})});}catch{}
    return;
   }
   if(url.origin===base&&url.pathname==='/v2/membership/home.css'){
    if(test.cssDelay)await new Promise(resolve=>setTimeout(resolve,test.cssDelay));
    if(test.cssError)return route.abort();
   }
   if(test.bootError&&url.origin===base&&url.pathname==='/v2/boot/home.js')return route.abort();
   try{return await fixture(route,[],{normalEvent:true});}catch(error){if(!test.cssDelay)throw error;}
  });
  await page.goto(base+(test.language==='en'?'/en/':'/'),{waitUntil:'domcontentloaded'});
  if(test.noJS){
   assert.equal(await page.locator('#v2-site-shell').isVisible(),true);
   assert.equal(await page.locator('.home-loader').isVisible(),false);
   assert.equal(configReads,0);reports.push({name:test.name,staticFallbackVisible:true});await page.close();continue;
  }
  await page.waitForFunction(()=>['ready','fallback'].includes(document.documentElement.dataset.homeLayoutState),{},{timeout:12000});
  await page.waitForTimeout(test.configDelay>2500||test.cssDelay>4000?1000:150);
  const result=await page.evaluate(()=>({version:document.documentElement.dataset.homeVersion,state:document.documentElement.dataset.homeLayoutState,paints:window.__homePaints,loaderVisible:getComputedStyle(document.querySelector('.home-loader')).display!=='none'&&!document.querySelector('.home-loader').hidden,overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.equal(result.version,test.version,test.name);
  assert.ok(result.paints.length,test.name+' must paint a usable page');
  assert.ok(result.paints.every(p=>p.version===test.version&&p.state!=='pending'&&p.state!=='unprotected'),test.name+': '+JSON.stringify(result.paints));
  assert.equal(result.loaderVisible,false);assert.equal(result.overflow,false);
  assert.equal(configReads,1,test.name+' must share the one early config request');
  if(test.newYear)assert.equal(newYearRequested,true,'seasonal styling consumes shared initial config');
  if(!test.bootError)assert.deepEqual(errors,[],test.name);
  if(test.version==='membership'){
   assert.equal(await page.locator('.membership-offer').isVisible(),true);
   if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
   await page.locator('.membership-chart').click();await page.locator('#v2-modal[open]').waitFor({state:'visible'});
   await page.locator('#v2-modal .modal-close').click();
  }
  reports.push({name:test.name,...result,configReads,errors});await page.close();
 }
 await fs.writeFile(taskScratchPath('home-layout-startup-browser.json'),JSON.stringify(reports,null,2));
 console.log(JSON.stringify({passed:reports.length,reports}));
}finally{await browser.close();}

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browser,base,fixture} from './v2-browser-fixtures.mjs';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
const results=[];
const recentFixture=JSON.parse(await fs.readFile(new URL('../fixtures/v2-home/public.json',import.meta.url),'utf8')).donations;
recentFixture.items=Array.from({length:15},(_,i)=>({...recentFixture.items[i%recentFixture.items.length],id:'fit-'+i,username:'Fixture donor '+(i+1)}));
try{
 for(const language of ['ru','en'])for(const [width,height] of [[1920,1080],[1920,900],[1366,768],[1280,720],[1024,768],[390,844],[320,640]]){
  console.log(JSON.stringify({checking:language,width,height}));
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const path=new URL(route.request().url()).pathname.replace(/^\/__asg_public__/,'');
   if(path==='/donations-api/recent')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(recentFixture)});
   if(path==='/donations-api/history')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,complete:true,revision:'fit-fixture',updated_at:Date.now()/1000,total_items:3,items:[],next_offset:null,currencies:[{currency:'RUB',total:24046.47,average:8015.49,largest:10000,top:[{username:'Дмитрий А',amount:10000,count:1},{username:'Ецлцеокиви',amount:8046.47,count:1},{username:'Mikhail Voronov',amount:6000,count:3}]}]})});
   return fixture(route,[]);
  });
  await page.goto(base+(language==='en'?'/en/':'/'),{waitUntil:'networkidle'});
  const consent=page.locator('.asg-legal-banner-btn-secondary');if(await consent.isVisible())await consent.click();
  await page.waitForFunction(()=>!document.getElementById('v2-site-shell').inert);
  try{await page.locator('#v2-donation-top li').first().waitFor();}catch(error){console.log(JSON.stringify({language,width,height,errors}));throw error;}
  const metrics=await page.locator('.support-panel').evaluate(panel=>{
   const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
   const qr=panel.querySelector('.qr-section'),dock=panel.closest('.sidebar-content'),list=panel.querySelector('.donation-list');
   return {panel:box(panel),list:{...box(list),scrollHeight:list.scrollHeight,clientHeight:list.clientHeight},welcome:box(document.querySelector('#v2-welcome-widget')),stream:box(document.querySelector('.right-column .compact-widget')),qr:box(qr),image:box(qr.querySelector('img')),dock:dock?box(dock):null,rows:[...panel.querySelectorAll('#v2-donation-top li')].map(n=>{const b=n.querySelector('b'),s=n.querySelector('strong');return {name:box(b),amount:box(s),nameFits:b.scrollWidth<=b.clientWidth+1,rankVisible:getComputedStyle(n.querySelector('.donation-place')).display!=='none'}}),recent:[...panel.querySelectorAll('.donation-row')].filter(n=>getComputedStyle(n).display!=='none').length,cta:box(panel.querySelector('.support-cta')),all:box(panel.querySelector('#v2-donations-all')),thanks:[...panel.querySelectorAll('.thanks-list>span,.support-thanks-columns .eyebrow')].map(n=>({fits:n.scrollWidth<=n.clientWidth+1,display:getComputedStyle(n).display})),overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  try{
   assert.equal(metrics.recent,10);for(const item of metrics.thanks)if(item.display!=='inline')assert(item.fits,'thanks names/headings fit');assert.equal(metrics.overflow,false);
   for(const row of metrics.rows){assert(!row.rankVisible);assert(row.nameFits,'full current leader name fits');assert(Math.abs(row.name.y-row.amount.y)<2,'name and amount share one line');}
   assert(metrics.rows[2].amount.bottom-metrics.rows[0].name.y<60,'three compact single-line leaders');
   if(width>1000){assert(metrics.dock);assert(metrics.qr.bottom<=Math.min(metrics.dock.bottom,metrics.panel.bottom)+1,'entire QR section fits without sidebar scrolling');assert(metrics.panel.bottom-metrics.qr.bottom<=12,'QR stays at bottom');assert(Math.abs(metrics.welcome.bottom-metrics.dock.bottom)<2,'welcome fills dock bottom');assert(Math.abs(metrics.welcome.bottom-metrics.stream.bottom)<2,'left and right widget footers align');}
   else{assert(metrics.image.width>=90);assert(metrics.cta.height>=44);assert(metrics.all.height>=44);}
   assert.deepEqual(errors,[]);
  }catch(error){console.log(JSON.stringify({language,width,height,metrics}));throw error;}
  assert.equal(await page.locator('#v2-donations').getAttribute('tabindex'),'0');
  if(metrics.list.scrollHeight>metrics.list.clientHeight+2){await page.locator('#v2-donations').press('End');await page.waitForFunction(()=>(()=>{const n=document.getElementById('v2-donations');return n.scrollTop+n.clientHeight>=n.scrollHeight-1})());assert.equal(await page.locator('#v2-donations .donation-row').last().locator('b').innerText(),'Fixture donor 10');const qrAfter=await page.locator('.support-panel .qr-section').boundingBox();const panelAfter=await page.locator('.support-panel').boundingBox();assert(Math.abs((qrAfter.y-panelAfter.y)-(metrics.qr.y-metrics.panel.y))<2,'QR remains fixed within the panel while donations scroll');}
  await page.locator('.support-panel').screenshot({path:taskScratchPath(`fit-${language}-${width}-${height}.png`)});
  results.push({language,width,height,panelHeight:metrics.panel.height,donations:metrics.recent,scrollable:metrics.list.scrollHeight>metrics.list.clientHeight+2,qrVisible:true});await page.close();
 }
 console.log(JSON.stringify(results));
}finally{await browser.close();}

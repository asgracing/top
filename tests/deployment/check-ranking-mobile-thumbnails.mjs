import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
import {browser,base,fixture,root,site,snapshot,signedDriver} from './v2-browser-fixtures.mjs';
const revision='a'.repeat(64),reports=[],failures=[];
for(const rows of [snapshot.leaderboard.items,snapshot.home.leaderboard?.items||snapshot.home.leaderboard||[]])for(const row of rows){if(row.public_id===signedDriver)row.rank=4;else if(row.rank===4)row.rank=3;}
for(const context of Object.values(site.rankings))for(const rows of Object.values(context))for(const row of rows){row.display_name='LongUnbrokenClubOrTeamName'.repeat(5);row.total_points=999999999;}
async function create(width,language,options={}){
 const page=await browser.newPage({viewport:{width,height:960},deviceScaleFactor:options.dpr||1,reducedMotion:'reduce'}),errors=[],log=[],images=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/assets/v2-mini/')&&r.status()!==200)failures.push(r.url());});
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.method()!=='GET')return route.fulfill({status:403,body:'{}'});
  if(url.origin===base&&url.pathname.startsWith('/assets/v2-mini/')){
   const original=url.pathname.replace('/v2-mini/','/v2-light/').replace(/-(96|192)\.webp$/,'.webp'),file=await fs.readFile(path.join(root,options.baseline?original:url.pathname));
   images.push({path:url.pathname,bytes:file.length});return route.fulfill({contentType:'image/webp',body:file});
  }
  if(url.pathname==='/top-data/v2/manifest.json')return route.fulfill({contentType:'application/json',body:JSON.stringify({...snapshot.manifest,rankings:{...snapshot.manifest.rankings,leaderboard:{schema_version:1,prefix_length:2,shard_path:'rankings/leaderboard/{prefix}.json',revision}}})});
  if(url.pathname.startsWith('/top-data/v2/rankings/leaderboard/'))return route.fulfill({contentType:'application/json',body:JSON.stringify({schema_version:1,revision,prefix:url.pathname.split('/').pop().slice(0,2),ranks:{[signedDriver]:4}})});
  return fixture(route,log,{signed:true});
 });
 return {page,errors,log,images};
}
try{
 for(const language of ['ru','en'])for(const width of [320,360,390,430,1440]){
  console.log('Layout',language,width);
  const {page,errors}=await create(width,language);await page.goto(base+(language==='ru'?'/':'/en/'));await page.locator('#v2-ranking').scrollIntoViewIfNeeded();await page.locator('#v2-rating-table tbody tr[data-row]').first().waitFor();
  await page.locator('.asg-legal-banner-btn-secondary').click();
  await page.locator('#v2-profile-trigger').click();await page.waitForFunction(()=>document.querySelector('.profile-preview-facts div:last-child b')?.textContent==='4');await page.locator('#v2-profile-trigger').click();
  const pilot=page.locator(`#v2-rating-table tr[data-row="${signedDriver}"]`);assert.equal((await pilot.locator('.col-rank').textContent()).trim(),'4');
  await pilot.locator('.col-rank').click();await page.waitForFunction(()=>document.querySelector('#v2-modal-title')?.textContent.includes('#4'));await page.locator('#v2-modal .modal-close').click();
  await page.locator('#v2-site-shell [data-tab="clubs"]').click();
  for(const type of ['teams','clubs']){
   await page.locator('#v2-ranking-club-type').selectOption(type);await page.waitForFunction(()=>document.querySelector('#v2-rating-table tbody .col-display_name')?.textContent.includes('LongUnbroken'));
   const geometry=await page.evaluate(()=>{
    const row=document.querySelector('#v2-rating-table tbody tr');
    const cells=[...row.children].slice(0,3),wrap=row.closest('table').parentElement,box=wrap.getBoundingClientRect();
    return {viewport:innerWidth,wrap:{left:box.left,right:box.right},cells:cells.map(cell=>{const b=cell.getBoundingClientRect();return {left:b.left,right:b.right,width:b.width,text:cell.textContent,scroll:cell.scrollWidth,client:cell.clientWidth};}),link:(()=>{const a=cells[1].querySelector('a');return {scroll:a.scrollWidth,client:a.clientWidth,href:a.getAttribute('href')};})()};
   });
   if(width<760){assert.ok(geometry.cells[2].right<=geometry.wrap.right+1,JSON.stringify(geometry));assert.ok(geometry.cells[1].right<=geometry.cells[2].left+1);assert.ok(geometry.link.scroll>geometry.link.client);assert.ok(geometry.cells[2].scroll<=geometry.cells[2].client+1,JSON.stringify(geometry));}
   await page.locator('#v2-rating-table').screenshot({path:taskScratchPath(`browser/${type}-${width}-${language}.png`)});
   reports.push({width,language,type,geometry});
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 for(const language of ['ru','en']){
  const {page,errors,log}=await create(390,language);await page.goto(base+(language==='ru'?'/driver/':'/en/driver/')+'?id='+signedDriver);
  await page.locator('.profile-rank').waitFor();assert.ok((await page.locator('.profile-rank').textContent()).includes('#4'));
  await page.locator('.asg-legal-banner-btn-secondary').click();
  await page.screenshot({path:taskScratchPath(`browser/profile-rank-${language}.png`),fullPage:true});
  assert.deepEqual(errors,[]);assert.ok(log.every(r=>!r.url.includes('/tables/leaderboard.json')));await page.close();
 }
 const transfer=[];
 for(const dpr of [1,2])for(const baseline of [true,false]){
  const {page,images}=await create(390,'ru',{dpr,baseline});await page.goto(base+'/driver/?id='+signedDriver);await page.locator('.profile-rank').waitFor();await page.locator('.asg-legal-banner-btn-secondary').click();
  await page.locator('.car-cell img').first().scrollIntoViewIfNeeded();await page.waitForFunction(()=>[...document.querySelectorAll('.car-cell img')].some(n=>n.complete&&n.naturalWidth));
  transfer.push({dpr,baseline,images,bytes:images.reduce((sum,r)=>sum+r.bytes,0)});await page.close();
 }
 for(const dpr of [1,2]){const before=transfer.find(r=>r.dpr===dpr&&r.baseline).bytes,after=transfer.find(r=>r.dpr===dpr&&!r.baseline).bytes;assert.ok(after<before*.25,JSON.stringify(transfer));}
 await fs.writeFile(taskScratchPath('browser/thumbnail-transfer.json'),JSON.stringify(transfer,null,2));
 assert.deepEqual(failures,[]);
 await fs.writeFile(taskScratchPath('browser/ranking-mobile-report.json'),JSON.stringify(reports,null,2));
 console.log('Verified 20 mobile/desktop club/team layouts, current header/profile ranks and miniature delivery.');
}finally{await browser.close();}

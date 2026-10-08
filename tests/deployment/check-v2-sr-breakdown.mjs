import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browser,base,fixture,snapshot} from './v2-browser-fixtures.mjs';
const driver=snapshot.leaderboard.items[0].public_id,reports=[];
const sample=snapshot.profiles[driver]||Object.values(snapshot.profiles)[0];
const rows=[
 {race_id:'ae11111111111111',clean:.05,incident:.10,delta:0,rating:9.99},
 {race_id:'ae22222222222222',clean:-.05,incident:-.10,delta:-.15,rating:9.84},
 {race_id:'ae33333333333333',clean:0,incident:0,delta:0,rating:9.84},
 {race_id:'ae44444444444444',incident:-.02,delta:-.02,rating:9.82,unavailable:true},
 {race_id:'ae55555555555555',delta:0,rating:9.82,missing:true}
];
try {
 for(const lang of ['ru','en'])for(const width of [1440,375]) {
  const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('asgV2IntroSeen','1'));
  await page.route('**/*',async route=>{
   const request=route.request();let url=new URL(request.url());
   if(url.origin===base&&url.pathname.startsWith('/__asg_public__/'))url=new URL('https://data.asgracing.ru'+url.pathname.slice('/__asg_public__'.length));
   if(!['GET','HEAD'].includes(request.method()))return route.fulfill({status:403,body:'{}'});
   if(url.hostname==='data.asgracing.ru'&&url.pathname.endsWith('/drivers/'+driver+'.json'))return route.fulfill({contentType:'application/json',body:JSON.stringify({...sample,public_id:driver,safety_rating:9.82,safety_history:rows.map((r,i)=>({race_id:r.race_id,finished_at:`2026-10-07T${String(16+i).padStart(2,'0')}:00:00Z`,track:'monza',delta_sr:r.delta,new_sr:r.rating,completed_laps:12,invalid_laps:1,incident_points:2,counted_penalties_count:0,...(r.incident===undefined?{}:{incident_penalty_delta:r.incident})}))})});
   const selected=rows.find(r=>url.pathname.endsWith('/'+r.race_id+'.json'));
   if(selected&&url.hostname==='data.asgracing.ru') {
    requests.push(selected.race_id);
    if(selected.unavailable)return route.fulfill({status:404,body:'{}'});
    if(selected===rows[0])await new Promise(r=>setTimeout(r,120));
    const r=selected;
    return route.fulfill({contentType:'application/json',body:JSON.stringify({race_id:r.race_id,track:'monza',results:[{public_id:driver,safety_rating:r.rating,safety_rating_after:r.rating,safety_delta:r.delta,safety_final_delta:r.delta,...(r.missing?{}:{safety_base_delta:r.clean,safety_incident_penalty_delta:r.incident}),safety_penalty_delta:0}]})});
   }
   return fixture(route,[]);
  });
  await page.goto(base+(lang==='en'?'/en/':'/'),{waitUntil:'networkidle'});
  if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
  await page.locator(`#v2-rating-table [data-rating="sr"][data-driver="${driver}"]`).first().click();
  await page.locator('[data-sr-history-index]').first().waitFor();
  const point=i=>page.locator(`[data-sr-history-race-id="${rows[i].race_id}"]`);
  const notes=page.locator('#v2-sr-inspection .sr-component-note');
  async function choose(i,clean,incident) {
   await point(i).focus();await page.keyboard.press('Enter');
   await page.waitForFunction(()=>{const n=document.querySelector('#v2-sr-inspection .sr-component-note');return n&&!/Loading|\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430/.test(n.textContent);});
   const values=await notes.locator('span').allTextContents();assert.deepEqual(values,[clean,incident]);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  // A second selection must win even if the earlier protocol arrives later.
  await point(0).focus();await page.keyboard.press('Enter');
  await choose(1,'-0.05 SR','-0.10 SR');
  await choose(0,'+0.05 SR','+0.10 SR');
  await choose(2,'0.00 SR','0.00 SR');
  await choose(3,'\u2014','-0.02 SR');
  await choose(4,'\u2014','\u2014');
  await choose(0,'+0.05 SR','+0.10 SR');
  assert.equal(requests.filter(r=>r===rows[0].race_id).length,1,'Cached protocol is reused');
  assert.deepEqual(errors,[]);
  if(lang==='ru'&&width===375){await page.locator('#v2-sr-inspection').scrollIntoViewIfNeeded();await page.screenshot({path:'C:/Python/asgracing/tmp/sr-breakdown-mobile.png'});}
  reports.push({lang,width,gain:true,loss:true,zero:true,ratingCap:true,missing:true,staleRequestGuard:true,cached:true});await page.close();
 }
 await fs.writeFile('C:/Python/asgracing/tmp/sr-breakdown-browser.json',JSON.stringify(reports,null,2));console.log(JSON.stringify({cases:reports.length,reports}));
}finally{await browser.close();}

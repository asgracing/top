// Regression: legacy ten-row files can return 200 with old totals and rows.
// The manifest's current chunks must win without changing lazy loading.
import assert from 'node:assert/strict';
import {browser,base,fixture,snapshot} from './v2-browser-fixtures.mjs';

const driver='drv_b466bb6eedd8',fastDriver='drv_ef8eac311bfb';
const leaderboard=Array.from({length:100},(_,i)=>({...snapshot.leaderboard.items[i%snapshot.leaderboard.items.length],public_id:i===0?driver:`fixture_rank_${i}`,driver:i===0?'Andrei Soldatenkov [ASG]':`Pilot ${i+1}`,rank:i+1,points:i===0?6982:6900-i}));
const bestlaps=[{...snapshot.bestlap_tables.monza.items[0],public_id:fastDriver,driver:'Ale Gas',rank:1,best_lap_ms:105747,best_lap:'1:45.747',track:'monza'}];
const pagePayload=(items,total)=>({items,page:1,page_size:10,total_items:total,total_pages:Math.ceil(total/10)});
const reports=[];
try {
 for(const [language,width] of [['ru',1440],['en',375]]){
  const page=await browser.newPage({viewport:{width,height:800},reducedMotion:'reduce'}),requests=[],errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
   const pathname=new URL(route.request().url()).pathname;requests.push(pathname);
   if(pathname.endsWith('/tables/leaderboard/page-1.json'))return route.fulfill({status:200,json:pagePayload([{...leaderboard[0],points:6028}],26868)});
   if(pathname.endsWith('/tables/leaderboard/chunk-1.json'))return route.fulfill({status:200,json:{...pagePayload(leaderboard,33740),storage_page_size:100,chunk:1}});
   if(pathname.endsWith('/tables/leaderboard/chunk-2.json'))return route.fulfill({status:200,json:{...pagePayload([{...leaderboard[1],public_id:'fixture_rank_100',rank:101,points:6700}],33740),storage_page_size:100,chunk:2}});
   if(/\/tables\/bestlaps(?:-monza)?\/page-1\.json$/.test(pathname))return route.fulfill({status:200,json:pagePayload([{...bestlaps[0],best_lap_ms:105960,best_lap:'1:45.960'}],17837)});
   if(/\/tables\/bestlaps(?:-monza)?\/chunk-1\.json$/.test(pathname))return route.fulfill({status:200,json:{...pagePayload(bestlaps,22689),storage_page_size:100,chunk:1}});
   return fixture(route,[],{emptyHomePreviews:true});
  });
  await page.goto(base+(language==='en'?'/en/':'/')+'#championship',{waitUntil:'networkidle'});
  const row=page.locator(`#v2-rating-table [data-driver="${driver}"]`).first();await row.waitFor();
  const text=await row.evaluate(node=>node.closest('tr').textContent.replace(/[\s,]/g,''));
  assert.ok(text.includes('6982'),'Current points, not the stale 6028');
  assert.ok((await page.locator('#v2-table-count').textContent()).replace(/[\s,]/g,'').endsWith('33740'),'Current leaderboard total');
  if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
  await page.locator('#v2-next').click();
  await page.waitForFunction(()=>document.querySelector('#v2-page-number')?.textContent==='2'&&!document.querySelector('#v2-next').disabled);
  assert.ok((await page.locator('#v2-table-count').textContent()).replace(/\s/g,'').startsWith('11–20'));
  await page.locator('#v2-page-input').fill('11');await page.locator('#v2-page-jump button').click();
  await page.locator('#v2-rating-table [data-driver="fixture_rank_100"]').first().waitFor();
  assert.ok(requests.some(path=>path.endsWith('/tables/leaderboard/chunk-2.json')),'Crossing a storage chunk loads current data');
  await page.locator('[data-tab="bestlaps"]').click();
  await page.locator(`#v2-rating-table [data-driver="${fastDriver}"]`).first().waitFor();
  assert.ok((await page.locator('#v2-rating-table tbody').textContent()).includes('1:45.747'),'Current best lap, not the stale 1:45.960');
  assert.ok(!requests.some(path=>/\/tables\/[^/]+\/page-\d+\.json$/.test(path)),'Never request legacy page files when manifest selects chunks');
  assert.deepEqual(errors,[]);reports.push({language,width,points:6982,total:33740,bestLap:'1:45.747',chunkBoundary:true});
  await page.close();
 }
 console.log(JSON.stringify({rankingFreshness:reports}));
} finally {await browser.close();}

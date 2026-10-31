import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';

const publicData=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/public.json'),'utf8'));
const profile=structuredClone(publicData.driver),seed=profile.race_history[0];
const history=Array.from({length:37},(_,i)=>({race_id:'sr-integration-'+i,finished_at:new Date(Date.now()-(38-i)*86400000).toISOString(),track:'monza',old_sr:4+i*.1,new_sr:4+(i+1)*.1,delta_sr:.1,completed_laps:12,invalid_laps:1,incident_points:1,incident_penalty_delta:.05,counted_penalties_count:0}));
Object.assign(history[35],{old_sr:9.91,new_sr:9.99,delta_sr:.08,incident_penalty_delta:.1,incident_points:0});
Object.assign(history[36],{old_sr:9.99,new_sr:9.99,delta_sr:0,incident_penalty_delta:-.05,incident_points:5,completed_laps:3,invalid_laps:2});
profile.safety_history=history;profile.safety_rating=9.99;profile.safety_races=37;
profile.race_history=Array.from({length:85},(_,i)=>{
  const h=history[i];
  return {...seed,race_id:h?.race_id||'race-integration-'+i,finished_at:h?.finished_at||seed.finished_at,counted_for_stats:true,...(h?{safety_rating_before:h.old_sr,safety_rating_after:h.new_sr,safety_delta:h.delta_sr,safety_base_delta:.05,safety_incident_penalty_delta:h.incident_penalty_delta,safety_penalty_delta:0,safety_final_delta:i===35?.15:i===36?0:.1,safety_completed_laps:h.completed_laps,safety_leader_laps:12,safety_enough_distance:i!==36}:{} )};
});
if(profile.summary){profile.summary.safety_history=history;profile.summary.safety_rating=9.99;}
const reports=[];
try {
  for(const language of ['ru','en'])for(const width of [1440,390,320]) {
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>sessionStorage.setItem('asgV2IntroSeen','1'));
    await page.route('**/*',async route=>{
      const request=route.request();let url=new URL(request.url());
      if(url.origin===base&&url.pathname.startsWith('/__asg_public__/'))url=new URL('https://data.asgracing.ru'+url.pathname.slice('/__asg_public__'.length)+url.search);
      if(!['GET','HEAD'].includes(request.method()))return route.fulfill({status:403,body:'{}'});
      if(url.hostname==='data.asgracing.ru'&&url.pathname===`/top-data/v2/drivers/${profile.public_id}.json`)return route.fulfill({contentType:'application/json',body:JSON.stringify(profile)});
      return fixture(route,[]);
    });
    await page.goto(`${base}/${language==='en'?'en/':''}driver/?id=${profile.public_id}&profileTab=sr`);
    await page.locator('.driver-sr-race').first().waitFor();
    await page.locator('[data-sr-period="all"]').click();
    const pager=page.locator('[data-pagination="profile-sr"]');
    assert.equal(await page.locator('.driver-sr-race').count(),5);
    await pager.locator('[data-pagination-page="2"]').click();
    assert.equal(await pager.locator('[aria-current="page"]').textContent(),'2');
    await pager.locator('input[name="page"]').fill('8');
    await pager.locator('input[name="page"]').press('Enter');
    assert.equal(await pager.locator('[aria-current="page"]').textContent(),'8');
    assert.equal(await page.locator('.driver-sr-race').count(),2);
    await page.locator('[data-sr-filter="zero"]').click();
    assert.equal(await page.locator('.driver-sr-race').count(),1);
    await page.locator('.driver-sr-race').click();
    assert.match(await page.locator('#profile-sr-breakdown').textContent(),language==='ru'?/Недостаточно дистанции/:/Not enough distance/);
    await page.locator('[data-sr-filter="gain"]').click();
    await page.locator('.driver-sr-race[data-sr-race="sr-integration-35"]').click();
    assert.match(await page.locator('.driver-sr-verdict').textContent(),/9.99/);
    assert.match(await page.locator('.driver-sr-adjustment').textContent(),/0.07/);
    await page.locator('#profile-tab-races').click();
    assert.equal(await page.locator('#profile-history-content tbody tr').count(),10);
    const racePager=page.locator('[data-pagination="profile"]');
    await racePager.locator('[data-pagination-page="2"]').click();
    assert.equal(await racePager.locator('[aria-current="page"]').textContent(),'2');
    await racePager.locator('input[name="page"]').fill('9');
    await racePager.locator('input[name="page"]').press('Enter');
    assert.equal(await page.locator('#profile-history-content tbody tr').count(),5);
    await page.locator('#profile-race-search').fill('not-a-real-circuit');
    assert.equal(await racePager.locator('input[name="page"]').inputValue(),'1');
    assert.equal(await racePager.locator('[data-profile-page="1"]').isDisabled(),true);
    await page.locator('#profile-tab-sr').click();
    assert.equal(await page.locator('#profile-sr-panel').isVisible(),true);
    assert.equal(await page.locator('#profile-races-panel').isVisible(),false);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page must fit the viewport');
    assert.deepEqual(errors,[]);
    reports.push({language,width,srPages:8,racePages:9,checks:'numbered pagination, jump, filters, cap, distance, tab state, empty results, viewport'});
    if(width===1440)await page.screenshot({path:taskScratchPath(`driver-safety-${language}.png`),fullPage:true});
    await page.close();
  }
  await fs.writeFile(taskScratchPath('driver-safety-browser.json'),JSON.stringify(reports,null,2));
  console.log(JSON.stringify({passed:reports.length,reports}));
} finally {await browser.close();}

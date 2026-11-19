import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';

const publicData=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/public.json'),'utf8'));
const profile=structuredClone(publicData.driver),seed=profile.race_history[0];
const history=Array.from({length:37},(_,i)=>({race_id:'sr-integration-'+i,finished_at:new Date(Date.now()-(38-i)*86400000).toISOString(),track:'monza',old_sr:4+i*.1,new_sr:4+(i+1)*.1,delta_sr:.1,completed_laps:12,invalid_laps:1,incident_points:1,incident_penalty_delta:.05,counted_penalties_count:0}));
Object.assign(history[32],{completed_laps:4,leader_laps:10,valid_laps:2,invalid_laps:2,base_delta:0,
  calculation_version:'sr_variant_a_v1',incident_coverage:'verified',distance_bonus:.1,incident_deduction:0,
  incident_episodes:[],incident_points:0,incident_penalty_delta:.1});
Object.assign(history[33],{track:'nurburgring_24h',calculation_version:'sr_variant_a_v1',distance_bonus:0,incident_deduction:.10});
Object.assign(history[34],{old_sr:7.4,new_sr:7.54,delta_sr:.14,completed_laps:10,leader_laps:10,valid_laps:8,invalid_laps:2,
  calculation_version:'sr_variant_a_v1',incident_coverage:'verified',distance_bonus:.1,incident_deduction:.02,incident_points:2,
  incident_episodes:[{kind:'contact',damage_growth:1,deduction:.01},{kind:'contact',damage_growth:null,deduction:.01}],
  incident_penalty_delta:.08,base_delta:.06});
Object.assign(history[35],{old_sr:9.91,new_sr:9.99,delta_sr:.08,incident_penalty_delta:.1,incident_points:0});
Object.assign(history[36],{old_sr:9.99,new_sr:9.99,delta_sr:0,incident_penalty_delta:-.05,incident_points:5,completed_laps:3,invalid_laps:2});
profile.safety_history=history;profile.safety_rating=9.99;profile.safety_races=37;
profile.race_history=Array.from({length:85},(_,i)=>{
  const h=history[i];
  return {...seed,race_id:h?.race_id||'race-integration-'+i,finished_at:h?.finished_at||seed.finished_at,counted_for_stats:true,...(h?{safety_rating_before:h.old_sr,safety_rating_after:h.new_sr,safety_delta:h.delta_sr,safety_base_delta:h.base_delta??.05,safety_incident_penalty_delta:h.incident_penalty_delta,safety_penalty_delta:0,safety_final_delta:i===35?.15:h.delta_sr,safety_completed_laps:h.completed_laps,safety_leader_laps:h.leader_laps??12,safety_enough_distance:i!==36,safety_calculation_version:h.calculation_version}:{} )};
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
    const guide=page.locator('.driver-sr-guide');
    const example=guide.locator('.driver-sr-guide-example');
    assert.equal(await example.isVisible(),false);
    await guide.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await example.isVisible(),true);
    assert.match(await example.textContent(),language==='ru'?/10 кругов.*сошли после 4.*0,10 SR/s:/10-lap.*retire after 4.*0\.10 SR/s);
    assert.match(await guide.textContent(),/SRv4[\s\S]*50%/);
    assert.doesNotMatch(await guide.textContent(),/SR (?:A|v3)\b/);
    const rulesHref=language==='ru'?'/#safety-about':'/en/#safety-about';
    assert.equal(await guide.locator('a').getAttribute('href'),rulesHref);
    await page.locator('[data-sr-period="all"]').click();
    assert.equal(await example.isVisible(),true);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'expanded SR guide must fit the viewport');
    await guide.locator('summary').click();
    assert.equal(await example.isVisible(),false);
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
    await page.locator('.driver-sr-race[data-sr-race="sr-integration-34"]').click();
    const component=title=>page.locator('.driver-sr-components > div').filter({has:page.getByRole('heading',{name:title,exact:true})});
    const bonusCard=component(language==='ru'?'Бонус безопасности':'Safety bonus');
    const lapsCard=component(language==='ru'?'Чистота езды':'Lap cleanliness');
    const incidentsCard=component(language==='ru'?'Инциденты':'Incidents');
    assert.equal(await bonusCard.count(),0);
    assert.equal(await lapsCard.locator(':scope > strong').textContent(),'+0.06');
    assert.match(await lapsCard.innerText(),/80\s*%.*100\s*%/s);
    assert.equal(await incidentsCard.locator(':scope > strong').textContent(),'+0.08');
    assert.match(await incidentsCard.innerText(),/\+0\.10 − 0\.02/);
    const episodeDetails=page.locator('.driver-sr-episodes');
    assert.equal(await episodeDetails.locator('ol').isVisible(),false);
    await episodeDetails.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await episodeDetails.locator('li').count(),2);
    assert.match(await episodeDetails.locator('li').first().innerText(),language==='ru'?/касание.*\+1 ед\..*−0\.01 SR/s:/contact.*\+1 units.*−0\.01 SR/s);
    assert.match(await episodeDetails.locator('li').last().innerText(),language==='ru'?/Рост повреждений не подтверждён/:/Damage increase unverified/);
    await page.locator('.driver-sr-race[data-sr-race="sr-integration-33"]').click();
    assert.equal(await episodeDetails.count(),0);
    assert.match(await page.locator('.driver-sr-verdict').textContent(),/Nürburgring 24h/);
    await page.locator('.driver-sr-race[data-sr-race="sr-integration-32"]').click();
    assert.match(await lapsCard.innerText(),/50\s*%.*40\s*%/s);
    assert.equal(await lapsCard.locator(':scope > strong').textContent(),'0.00');
    assert.equal(await incidentsCard.locator(':scope > strong').textContent(),'+0.10');
    assert.equal(await bonusCard.count(),0);
    assert.equal(await episodeDetails.count(),0);
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
    reports.push({language,width,srPages:8,racePages:9,checks:'SRv4, lap cleanliness, leader distance, incident net and details, short-distance base, pagination, filters, cap, tab state, viewport'});
    if(width===1440)await page.screenshot({path:taskScratchPath(`driver-safety-${language}.png`),fullPage:true});
    {
      await page.goto(base+rulesHref);
      const modal=page.locator('#v2-modal[open]');
      const rules=modal.locator('.safety-about-block');
      await rules.waitFor();
      assert.match(await modal.locator('h2').textContent(),/SRv4/);
      assert.match(await rules.locator('.safety-rules-lead').innerText(),/50%/);
      assert.match(await rules.locator('.safety-rules-example').innerText(),language==='ru'?/0,10 SR/:/0\.10 SR/);
      assert.match(await rules.locator('.safety-rules-date').innerText(),language==='ru'?/12:00 МСК/:/09:00 UTC/);
      const details=rules.locator('.safety-rules-details');
      assert.equal(await details.evaluate(el=>el.open),false);
      await details.locator('summary').focus();
      await page.keyboard.press('Enter');
      assert.equal(await details.evaluate(el=>el.open),true);
      assert.match(await details.innerText(),language==='ru'?/Подтверждённый ущерб без связанного контакта.*30%/s:/Verified damage without a linked contact.*30%/s);
      assert.ok(await modal.locator('.modal-body').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'SR rules must fit the modal');
    }
    await page.close();
  }
  await fs.writeFile(taskScratchPath('driver-safety-browser.json'),JSON.stringify(reports,null,2));
  console.log(JSON.stringify({passed:reports.length,reports}));
} finally {await browser.close();}

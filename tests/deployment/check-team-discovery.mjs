// Actual home/schedule/modal/entry navigation. All remote traffic is mocked.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
const out=process.env.ASG_TASK_OUTPUT_DIR;
assert(out,'Set ASG_TASK_OUTPUT_DIR to task scratch');
const data=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/public.json'),'utf8'));
const future=offset=>new Date(Date.now()+offset*86400000).toISOString().slice(0,10);
const seed=data.schedule.items[0];
const ordinary=Array.from({length:4},(_,i)=>({...seed,date:future(i+1),event_id:'ordinary-'+i,occurrence_id:'ordinary-'+i,participation_mode:'individual',status:'scheduled'}));
const team={...seed,event_id:'team-discovery',occurrence_id:'team-discovery',date:future(6),start_time_local:'20:00',timezone:'UTC+3',launch_at:future(6)+'T16:50:00Z',registration_closes_at:future(6)+'T16:40:00Z',track_code:'spa',track_name:'Spa Team Discovery',participation_mode:'team',competition_mode:'standalone',race_format:'endurance',status:'scheduled',max_drivers:2};
const schedule={...data.schedule,items:[...ordinary,team]};
const reports=[];
try {
  for(const language of ['ru','en'])for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:960},reducedMotion:'reduce'}),errors=[],consoleErrors=[],requests=[];
    let nearestTeam=false,closed=false,hideTeams=false;
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
    page.on('response',response=>{if(response.status()>=400)consoleErrors.push(response.status()+' '+response.url());});
    await page.route('**/*',async route=>{
      const request=route.request();let url=new URL(request.url());
      if(url.origin===base&&url.pathname.startsWith('/__asg_public__/'))url=new URL('https://data.asgracing.ru'+url.pathname.slice('/__asg_public__'.length)+url.search);
      const current={...team,registration_closed:closed,closes_at:team.registration_closes_at};
      if(url.hostname==='data.asgracing.ru'&&url.pathname==='/hourly-data/announcement.json')return route.fulfill({json:nearestTeam?current:ordinary[0]});
      if(url.hostname==='data.asgracing.ru'&&url.pathname==='/hourly-data/schedule.json')return route.fulfill({json:{...schedule,items:hideTeams?ordinary:nearestTeam?[current,...ordinary]:[...ordinary,current]}});
      if(url.hostname==='data.asgracing.ru'&&url.pathname==='/hourly-data/races/races.json')return route.fulfill({json:data.recent});
      if(url.hostname==='data.asgracing.ru'&&url.pathname==='/hourly-data/championships.json')return route.fulfill({json:{items:[]}});
      if(url.hostname==='auth.asgracing.ru'&&url.pathname==='/v1/team-racing/events')return route.fulfill({json:{schema_version:1,generated_at:new Date().toISOString(),stale:false,events:[current],teams:[]}});
      return fixture(route,requests);
    });
    const start=language==='ru'?'/':'/en/';
    await page.goto(base+start,{waitUntil:'networkidle'});
    try {await page.locator('.team-race-spotlight').waitFor({timeout:10000});}
    catch(error) {console.error(JSON.stringify({url:page.url(),errors,consoleErrors,content:(await page.locator('.center-column').innerText()).slice(0,1000),features:await page.locator('[id*="team-race-feature"]').evaluateAll(nodes=>nodes.map(n=>({id:n.id,hidden:n.hidden,html:n.innerHTML.slice(0,200)})))}));throw error;}
    const spotlight=page.locator('.team-race-spotlight');
    assert.match(await spotlight.innerText(),/Spa Team Discovery/);
    assert.match(await spotlight.innerText(),language==='ru'?/Админы могут участвовать/:/Admins can participate/);
    assert.equal(await spotlight.locator('a').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 122, 89)');
    assert(await spotlight.boundingBox().then(box=>box.y<960),'Team event is visible near the top');
    await spotlight.locator('a').click();
    await page.locator('#deadline-rule').waitFor();
    assert.match(await page.locator('#deadline-rule').innerText(),/10/);
    assert.equal(new URL(page.url()).searchParams.get('event'),'team-discovery');
    await page.goto(base+start+'hourly/',{waitUntil:'networkidle'});
    try {await page.locator('.team-race-spotlight').waitFor({timeout:10000});}
    catch(error) {console.error(JSON.stringify({url:page.url(),errors,consoleErrors,content:(await page.locator('body').innerText()).slice(0,400),requests:requests.slice(-3)}));throw error;}
    assert(await page.locator('.team-race-spotlight').boundingBox().then(box=>box.y<600));
    if(!await page.locator('.calendar-entry.kind-team').count())await page.locator('[data-month-step="1"]').click();
    assert.equal(await page.locator('.calendar-entry.kind-team').count(),1);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(out,`team-discovery-${language}-${width}.png`),fullPage:true});
    await page.locator('.team-race-spotlight').screenshot({path:path.join(out,`team-spotlight-${language}-${width}.png`)});
    // The closest event is also team: card, home action and modal must agree.
    nearestTeam=true;
    await page.goto(base+start+'hourly/',{waitUntil:'networkidle'});
    await page.locator('.hero-event.kind-team').waitFor();
    await page.locator('.hero-event [data-page-event]').click();
    await page.locator('#v2-modal .event-kind.kind-team').waitFor();
    assert.match(await page.locator('#v2-modal').innerText(),/10/);
    assert.equal(await page.locator('#v2-modal a[href*="team-discovery"]').count(),1);
    await page.goto(base+start,{waitUntil:'networkidle'});
    await page.locator('.upcoming-panel[data-event-kind="team"]').waitFor();
    assert.equal(await page.locator('#v2-race-vote').isEnabled(),true);
    await page.evaluate(cutoff=>{Date.now=()=>Date.parse(cutoff);},team.registration_closes_at);
    await page.waitForFunction(label=>document.querySelector('#v2-race-vote')?.textContent===label,language==='ru'?'Посмотреть составы':'View crews');
    assert.match(await page.locator('.team-race-spotlight a').innerText(),language==='ru'?/Посмотреть составы/:/View crews/);
    await page.locator('#v2-race-vote').click();
    await page.locator('#deadline-rule').waitFor();
    closed=true;
    await page.goto(base+start+'hourly/',{waitUntil:'networkidle'});
    try {await page.locator('.team-race-spotlight').waitFor({timeout:10000});}
    catch(error) {console.error(JSON.stringify({url:page.url(),errors,content:(await page.locator('body').innerText()).slice(0,1400),requests:requests.slice(-8)}));throw error;}
    assert.match(await page.locator('.team-race-spotlight a').innerText(),language==='ru'?/Посмотреть составы/:/View crews/);
    hideTeams=true;nearestTeam=false;
    await page.goto(base+start,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.querySelector('#v2-event-track')?.textContent&&!document.querySelector('#v2-event-track')?.textContent.includes('Loading'));
    assert.equal(await page.locator('.team-race-spotlight').count(),0);
    assert.deepEqual(errors,[]);
    assert.equal(requests.filter(r=>r.method==='POST'&&/team-racing\/commands|\/vote\b/.test(r.url)).length,0);
    reports.push({language,width,discovery:true,directRegistration:true,teamColor:true,modal:true,closed:true,noEvents:true});
    await page.close();
  }
} finally {await browser.close();}
await fs.writeFile(path.join(out,'team-discovery-report.json'),JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports));

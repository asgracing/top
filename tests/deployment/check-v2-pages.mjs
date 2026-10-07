// Real V2 controllers with bounded public datasets. Every external call is intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
const data=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/public.json'),'utf8'));
const id=data.driver.public_id,reports=[];
const diagnostics=[];
const routes={
  '/hourly-data/announcement.json':data.event,
  '/hourly-data/schedule.json':data.schedule,
  '/hourly-data/races/races.json':data.recent,
  ['/top-data/v2/drivers/'+id+'.json']:data.driver,
  ['/achievements/v1/drivers/'+id+'.json']:data.achievements
};
for(const r of data.recent.items)routes['/hourly-data/'+r.details_path]=data.race;
try {
  for(const screen of ['hourly','driver'])for(const language of ['ru','en'])for(const width of [1920,1280,768,390,320]) {
    const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],log=[],votes=new Map();
    const diagnostic={screen,language,width,errors,failed:[]};diagnostics.push(diagnostic);
    page.on('requestfailed',r=>{if(r.url().startsWith(base))diagnostic.failed.push({url:r.url(),reason:r.failure()?.errorText});});
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
      const request=route.request();let url=new URL(request.url());
      if(url.origin===base&&url.pathname.startsWith('/__asg_public__/'))url=new URL('https://data.asgracing.ru'+url.pathname.slice('/__asg_public__'.length)+url.search);
      let payload=url.hostname==='data.asgracing.ru'?routes[url.pathname]:undefined;
      if(url.hostname==='data.asgracing.ru'&&url.pathname.startsWith('/top-data/v2/races/details/'))payload=data.race;
      if(url.hostname==='data.asgracing.ru'&&url.pathname.startsWith('/hourly-votes-api/')&&!url.pathname.endsWith('/voter-token')) {
        if(request.method()==='POST') {
          const eventId=JSON.parse(request.postData()).event_id;
          assert.equal(request.headers().authorization,'Bearer test-only-browser-token');
          votes.set(eventId,url.pathname.endsWith('/vote'));
          payload={votes:votes.get(eventId)?5:4,already_voted:votes.get(eventId)};
        }else payload={items:Object.fromEntries((url.searchParams.get('event_ids')||'').split(',').map(eventId=>[eventId,{votes:votes.get(eventId)?5:4,already_voted:Boolean(votes.get(eventId))}]))};
      }
      if(payload!==undefined)return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
      return fixture(route,log);
    });
    await page.goto(`${base}/v2/${language}/${screen}/`+(screen==='driver'?'?id='+id:''),{waitUntil:'networkidle'});
    await page.locator('.v2-language a[data-language="en"]').waitFor();
    await page.waitForTimeout(250);
    assert.deepEqual(errors,[]);
    assert.equal(await page.locator('#home-view').isVisible(),false);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.equal(await page.locator('html').getAttribute('lang'),language);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
    assert.equal(await page.locator('meta[name="yandex-metrika-id"]').getAttribute('content'),'107697834');
    assert.equal(await page.locator('.v2-language a[data-language="en"]').getAttribute('href'),'/v2/en/'+screen+'/'+(screen==='driver'?'?id='+id:''));
    assert.equal(await page.locator('.brand').first().getAttribute('href'),'/v2/'+language+'/');
    const duplicateIds=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);});
    assert.deepEqual(duplicateIds,[]);
    await page.locator('.asg-legal-banner-btn-secondary').click();
    if(screen==='hourly') {
      assert.equal(await page.locator('.feature-event').count(),2);
      assert.equal(await page.locator('.page-championship [data-page-join]').isDisabled(),false);
      assert.equal(await page.locator('.page-slot-grid .page-event-card').count(),3);
      assert.equal(await page.locator('.page-recent-race').count(),5);
      assert.equal(await page.locator('.hero-event [data-page-participants] b').innerText(),'4');
      assert.equal(await page.locator('.page-seo').innerText().then(s=>s.includes('????')),false,'SEO copy has readable text');
      await page.locator('.page-rank-clubs a').first().waitFor();
      assert.notEqual(await page.locator('.page-rank-clubs a').first().innerText(),'—','Entity names come from the ranking row');
      assert.ok((await page.locator('.page-rank-clubs a').first().getAttribute('href')).startsWith('/v2/'+language+'/teams/detail/'));
      await page.locator('[data-club-type="clubs"]').click();
      assert.notEqual(await page.locator('.page-rank-clubs a').first().innerText(),'—');
      assert.ok((await page.locator('.page-rank-clubs a').first().getAttribute('href')).startsWith('/v2/'+language+'/clubs/'));
      if(width===1920){
        const link=page.locator('.recent-winner a.recent-profile-link').first();
        assert.ok((await link.getAttribute('title')).includes(language==='ru'?'Открыть профиль':'Open driver profile'));
        const before=await link.evaluate(n=>getComputedStyle(n).backgroundColor);
        await link.hover();assert.notEqual(await link.evaluate(n=>getComputedStyle(n).backgroundColor),before);
        const geometry=await link.evaluate(n=>{const a=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect();return {link:a.width,parent:p.width};});
        assert.ok(geometry.link<geometry.parent-8,'Only the name is a profile link, rather than the remaining row space');
      }
      if(width===1920) {
        const geometry=await page.evaluate(()=>{
          const cards=[...document.querySelectorAll('.feature-event')].map(n=>n.getBoundingClientRect());
          const panels=['.page-calendar','.page-recent'].map(s=>document.querySelector(s).getBoundingClientRect());
          return {cardHeight:cards[0].height-cards[1].height,panelHeight:panels[0].height-panels[1].height};
        });
        assert.ok(Math.abs(geometry.cardHeight)<1);assert.ok(Math.abs(geometry.panelHeight)<1);
      }
      await page.evaluate(()=>window.__firstCard=document.querySelector('.hero-event'));
      await page.locator('[data-month-step="1"]').click();
      await page.locator('[data-recent-page="1"]').click();
      assert.ok(await page.evaluate(()=>window.__firstCard===document.querySelector('.hero-event')),'Calendar/pagination retain the feature cards');
      await page.locator('.hero-event [data-page-event]').click();
      assert.equal(await page.locator('#v2-modal').getAttribute('data-kind'),'event');
      assert.equal(await page.locator('.pitstop-grid .rule-state').count(),5);
      await page.locator('#v2-modal .modal-close').click();
      await page.locator('.hero-event [data-page-join]').click();
      await page.waitForFunction(()=>document.querySelector('.hero-event [data-page-join]')?.getAttribute('aria-pressed')==='true');
      assert.equal(await page.locator('.hero-event [data-page-participants] b').innerText(),'5');
      await page.locator('.hero-event [data-page-join]').click();
      await page.waitForFunction(()=>document.querySelector('.hero-event [data-page-join]')?.getAttribute('aria-pressed')==='false');
      await page.locator('.page-recent-race').first().click();
    } else {
      assert.equal(await page.locator('.profile-example-picker').count(),0);
      assert.equal(await page.locator('.profile-achievements .achievement-card').count(),data.achievements.preview.length);
      assert.equal(await page.locator('#profile-history-content tbody tr').count(),10);
      assert.equal(await page.locator('.profile-stat-grid .page-metric').nth(1).locator('b').innerText(),String(data.driver.races));
      assert.equal(await page.locator('.profile-lap-grid option[value=""]').count(),0);
      const latest=[...data.driver.race_history].sort((a,b)=>b.finished_at.localeCompare(a.finished_at))[0];
      const eloHistory=[...(data.driver.summary?.elo_history||[]),...(data.driver.elo_history||[])];
      const eloPoint=eloHistory.findLast(r=>r.race_file===latest.source_file);
      const eloCell=page.locator('#profile-history-content tbody tr').first().locator('td').nth(9);
      assert.equal((await eloCell.innerText()).replace(/\s+/g,' ').trim(),`${eloPoint.new_rating} ${latest.elo_rating_delta>0?'+':''}${latest.elo_rating_delta}`);
      assert.ok((await page.locator('#profile-history-content th').nth(9).innerText()).includes('ELO'));
      if(width===1920){assert.equal(await page.locator('.left-column').isVisible(),false);assert.ok(await page.locator('.profile-ratings .rating-badge').evaluateAll(badges=>Math.abs(badges[0].getBoundingClientRect().top-badges[1].getBoundingClientRect().top)<1),'Profile ELO and SR share one row');}
      await page.locator('.profile-ratings [data-rating="elo"]').click();
      await page.locator('.elo-chart').waitFor();
      assert.equal(await page.locator('#v2-modal').getAttribute('data-kind'),'driver-elo');
      await page.locator('#v2-modal .modal-close').click();
      await page.locator('.profile-ratings [data-rating="sr"]').click();
      await page.waitForFunction(()=>document.querySelector('#v2-modal').dataset.kind==='driver-sr');
      await page.locator('#v2-modal .modal-close').click();
      await page.locator('#profile-history-content [data-page-race]').first().click();
    }
    await page.locator('.results-table').waitFor();
    assert.equal(await page.locator('.results-table tbody .best-lap-value').count(),1,'Only the race record setter has a purple lap');
    assert.equal(await page.locator('.results-table tbody [data-podium-place]').count(),3);
    await page.locator('#v2-modal .modal-close').click();
    if(screen==='hourly'&&width===1920){
      const profile=page.locator('.recent-winner a.recent-profile-link').first(),href=await profile.getAttribute('href');
      await profile.click();await page.waitForURL(url=>url.pathname===`/v2/${language}/driver/`);
      assert.equal(new URL(page.url()).search,new URL(href,base).search,'Winner click opens the pilot profile, not race details');
    }
    assert.deepEqual(errors,[]);
    reports.push({screen,language,width,status:'passed'});
    await page.close();
  }
  for(const language of ['ru','en']) {
    const page=await browser.newPage({viewport:{width:1920,height:936},reducedMotion:'reduce'}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>fixture(route,[]));
    await page.goto(`${base}/v2/${language}/`,{waitUntil:'networkidle'});
    await page.locator('.asg-legal-banner-btn-secondary').click();
    await page.locator('[data-modal="event"]').click();
    assert.equal(await page.locator('#v2-modal').getAttribute('data-kind'),'event');
    await page.locator('#v2-modal .modal-close').click();
    await page.locator('#v2-day-ratings [data-rating="elo"]').click();
    await page.locator('.elo-chart').waitFor();
    assert.deepEqual(errors,[]);
    reports.push({screen:'home-shared-modals',language,width:1920,status:'passed'});
    await page.close();
  }
} catch(error){console.log(diagnostics.at(-1));for(const page of browser.contexts().flatMap(c=>c.pages())){console.log({url:page.url(),title:await page.title(),pageView:await page.locator('#page-view').innerText().catch(()=>''),languageControls:await page.locator('.v2-language').count()});await page.screenshot({path:path.join(root,'../tmp/v2-pages-failure.png')});}throw error;} finally {await browser.close();}
console.log(JSON.stringify(reports));

// Exercise real rendering and read-state persistence with intercepted public data.
import assert from 'node:assert/strict';
import {browser,base,fixture,signedDriver} from './v2-browser-fixtures.mjs';
const invite={id:'invite-test',action_type:'invitation',target_type:'club',target_public_id:'club_test',target_slug:'test',target_display_name:'Fixture club',subject_public_id:signedDriver,initiated_by_public_id:'drv_fixture',created_at:'2026-01-01T00:00:00Z',expires_at:'2027-01-01T00:00:00Z',resolution_role:'subject'};
const news=Array.from({length:12},(_,i)=>({id:`read-all-${i}`,slug:`read-all-${i}`,title:{ru:`Новость ${i}`,en:`News ${i}`},published_at:'2026-01-01T00:00:00Z'}));
try {
  for(const language of ['ru','en'])for(const width of [1920,768,390,320]){
    const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>sessionStorage.setItem('asgV2IntroSeen','1'));
    let extra=false;
    await page.route('**/*',async route=>{
      let url=new URL(route.request().url());
      if(url.origin===base&&url.pathname.startsWith('/__asg_public__/'))url=new URL('https://data.asgracing.ru'+url.pathname.slice('/__asg_public__'.length)+url.search);
      if(url.hostname==='auth.asgracing.ru'&&!url.pathname.includes('/drivers/')){
        assert.equal(route.request().method(),'GET','Read-all must not accept an invitation or send commands');
        return route.fulfill({json:{authenticated:true,linked:true,driver:{public_id:signedDriver,display_name:'Fixture driver'},steam:{persona_name:'Fixture driver'},clubs_teams:{enabled:true,applied_state:{public_id:signedDriver,club:null,team:null,membership_actions:[invite]}}}});
      }
      if(url.origin===base&&url.pathname==='/news-content/news.json')return route.fulfill({json:{items:[...news,...(extra?[{id:'later',slug:'later',title:'Later',published_at:'2026-01-01T00:00:00Z'}]:[])]}});
      if(url.hostname==='data.asgracing.ru'&&url.pathname==='/top-data/server_status.json')return route.fulfill({json:{updated_at:new Date().toISOString(),servers:{
        main:{name:'ASG Racing Main',status:'online',session_type:'Race',session_remaining_minutes:17,players_online:0,track:'monza'},
        hourly:{name:'ASG Racing Hourly',status:'offline',session_type:'Qualifying',session_remaining_minutes:40,players_online:0},
        sunset:{name:'ASG Racing Sunset',status:'online',session_type:'Practice',session_remaining_minutes:0,players_online:0,track:'monza'}
      }}});
      return fixture(route,[]);
    });
    await page.goto(base+(language==='en'?'/en/':'/'),{waitUntil:'networkidle'});
    if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
    const unit=language==='ru'?'мин':'min',phase=language==='ru'?'Гонка':'Race';
    await page.locator('[data-widget-dock="servers"]').evaluate(button=>{if(button.getAttribute('aria-expanded')==='false')button.click()});
    const card=page.locator('#v2-servers [data-server="main"]');
    await card.waitFor();assert.ok((await card.textContent()).includes(`${phase} (17 ${unit})`));
    assert.ok((await card.locator('.server-compact-live').textContent()).includes(`R (17 ${unit})`));
    assert.ok(!(await page.locator('#v2-servers [data-server="hourly"]').textContent()).includes('40'));
    assert.ok(await card.evaluate(n=>n.scrollWidth<=n.clientWidth+1));
    await card.click();assert.ok((await page.locator('.server-parameter-row').textContent()).includes(`${phase} (17 ${unit})`));
    await page.locator('#v2-modal .modal-close').click();
    await page.locator('[data-modal="servers"]').click();assert.ok((await page.locator('.server-summary-item[data-server="main"]').textContent()).includes(`${phase} (17 ${unit})`));
    await page.locator('#v2-modal .modal-close').click();
    const badge=page.locator('.v2-notification-count'),button=page.locator('.notification-read-all');
    assert.equal(await badge.textContent(),'13');
    await page.locator('#v2-notification-trigger').click();
    assert.equal(await page.locator('#v2-notification-popover .v2-notice').count(),7);
    assert.equal(await button.textContent(),language==='ru'?'Прочитано всё':'Mark all as read');
    assert.ok(await page.locator('#v2-notification-popover').evaluate(n=>n.scrollWidth<=n.clientWidth+1));
    if(language==='ru'&&[1920,320].includes(width))await page.screenshot({path:`../tmp/v2-notifications-${width}.png`});
    await button.click();await page.waitForFunction(()=>document.querySelector('.v2-notification-count').hidden);
    assert.equal(await button.isDisabled(),true);
    const read=await page.evaluate(()=>JSON.parse(localStorage.getItem('asgReadNewsIds.v2')));
    assert.ok(news.every(n=>read[n.id]),'All 12 items are saved, including items outside the preview');
    assert.ok(read[`membership:club:club_test:${signedDriver}:${invite.created_at}`],'Invitation is marked as seen, without accepting it');
    await page.reload({waitUntil:'networkidle'});assert.equal(await badge.isHidden(),true);
    extra=true;await page.reload({waitUntil:'networkidle'});assert.equal(await badge.textContent(),'1');
    await page.locator('#v2-notification-trigger').click();assert.equal(await button.isEnabled(),true);
    assert.deepEqual(errors,[]);await page.close();
  }
  console.log('Server timing and read-all: RU/EN, desktop/tablet/mobile, zero/offline time, complete feed, reload persistence and later notifications passed; no production writes.');
}finally{await browser.close()}

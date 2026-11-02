import assert from 'node:assert/strict';
import {browser,base,fixture,snapshot} from './v2-browser-fixtures.mjs';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const days=Array.from({length:235},(_,index)=>{
  const date=new Date(Date.UTC(2026,2,13+index)).toISOString().slice(0,10);
  const unique=index===234?48:20+index%40;
  return {date,unique_players:unique,races:3,avg_players_per_race:12.5,activity_score:60,tracks:['monza'],
    peak_hour:{label:'19:00'},hours:Array.from({length:24},(_,hour)=>({hour:String(hour).padStart(2,'0'),unique_players:hour===19?unique:0,races:hour===19?3:0}))};
}).filter(day=>day.date!=='2026-10-28');
snapshot.home.race_activity=days;
const reports=[];
try {
  for(const language of ['ru','en'])for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:1000},timezoneId:'America/Los_Angeles'}),requests=[];
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin!==base||!process.env.ASG_DIST_OUTPUT_DIR)return fixture(route,requests);
      // Serve the actual built HTML/JS/CSS without a separate background server.
      const root=resolve(process.env.ASG_DIST_OUTPUT_DIR),path=resolve(root,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));
      assert.ok(path.startsWith(root+sep));
      try{await route.fulfill({status:200,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream',body:await readFile(path)})}
      catch{await route.fulfill({status:404,body:''})}
    });
    await page.goto(base+(language==='ru'?'/':'/en/'),{waitUntil:'domcontentloaded'});
    await page.locator('.online').waitFor();
    await page.locator('#v2-chart .chart-column').first().waitFor();
    await page.locator('.asg-legal-banner-btn-secondary').click();
    const historyStart=requests.length;
    await page.locator('.online').click();
    const modal=page.locator('#v2-modal');
    assert.equal(await modal.getAttribute('data-kind'),'online');
    assert.equal(await page.locator('[data-activity-tab="overview"]').getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('[data-activity-scale]').count(),0,'Calendar exploration lives on its own tab');
    assert.equal(await page.locator('[data-activity-stat="daily"] b').textContent(),'48');
    assert.equal(await page.locator('.pilot-activity-hour-chart>div').count(),24);
    assert.equal(await page.locator('#v2-activity-comparison-window').inputValue(),'7');
    await page.locator('#v2-activity-comparison-window').selectOption('14');
    const baseline=days.filter(day=>day.date>='2026-10-19'&&day.date<'2026-11-02');
    assert.equal(await page.locator('[data-comparison="average"]>b').textContent(),new Intl.NumberFormat(language==='ru'?'ru-RU':'en-GB',{maximumFractionDigits:1}).format(baseline.reduce((sum,day)=>sum+day.unique_players,0)/baseline.length));
    await page.locator('#v2-activity-comparison-window').selectOption('7');
    assert.ok(await modal.evaluate(node=>node.scrollWidth<=node.clientWidth+1));
    await modal.screenshot({path:taskScratchPath(`online-activity/overview-${language}-${width}.png`)});
    await page.locator('[data-activity-tab="history"]').click();
    assert.equal(await page.locator('[data-activity-tab="history"]').getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('[data-activity-scale="weeks"]').count(),0);
    assert.equal(await page.locator('#v2-online-date').inputValue(),'2026-11-02','Visitor timezone must not change the selected Moscow date');
    assert.ok(await page.locator('.online-history-scroll').evaluate(node=>{const selected=node.querySelector('[aria-pressed="true"]').getBoundingClientRect(),box=node.getBoundingClientRect();return selected.right<=box.right+1&&selected.left>=box.left-1}),'The selected date is visible when the history opens');
    assert.equal(await page.locator('.pilot-activity-hour-chart>div').count(),24);
    await page.locator('[data-period-start="2026-10-28"]').click();
    assert.equal(await page.locator('[data-activity-stat="daily"] b').textContent(),'—');
    await page.locator('[data-period-start="2026-11-02"]').click();
    await page.locator('[data-activity-scale="months"]').click();
    assert.match(await page.locator('.online-history-note').textContent(),language==='ru'?/Неполный период/:/Incomplete period/);
    await page.locator('[data-period-start="2026-10-01"]').click();
    const october=days.filter(day=>day.date.startsWith('2026-10'));
    const average=october.reduce((sum,day)=>sum+day.unique_players,0)/october.length;
    assert.equal(await page.locator('[data-activity-stat="average"] b').textContent(),new Intl.NumberFormat(language==='ru'?'ru-RU':'en-GB',{maximumFractionDigits:1}).format(average));
    assert.equal(await page.locator('[data-activity-stat="maximum"] b').textContent(),String(Math.max(...october.map(day=>day.unique_players))));
    assert.ok(await modal.evaluate(node=>node.scrollWidth<=node.clientWidth+1),'The dialog does not overflow on mobile');
    await modal.screenshot({path:taskScratchPath(`online-activity/months-${language}-${width}.png`)});
    await page.locator('[data-activity-drill]').click();
    assert.equal(await page.locator('#v2-online-date').inputValue(),'2026-10-31');
    await page.locator('#v2-online-month').selectOption('2026-03');
    assert.match(await page.locator('#v2-online-date').inputValue(),/^2026-03/);
    assert.equal(await page.locator('[data-activity-page="older"]').isDisabled(),false);
    await page.locator('#v2-online-date').selectOption('2026-03-13');
    assert.equal(await page.locator('[data-activity-page="older"]').isDisabled(),true);
    assert.match(await page.locator('.online-history-details h3').first().textContent(),/2026/);
    await modal.screenshot({path:taskScratchPath(`online-activity/days-${language}-${width}.png`)});
    await page.locator('[data-activity-scale="months"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-activity-scale="months"]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-activity-scale')),'months');
    await page.locator('[data-activity-tab="history"]').focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('[data-activity-tab="overview"]').getAttribute('aria-selected'),'true');
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-activity-tab')),'overview');
    await page.locator('[data-activity-overview-date="2026-11-01"]').click();
    assert.equal(await page.locator('#v2-online-date').inputValue(),'2026-11-01');
    await page.locator('#v2-modal .modal-close').click();
    await page.locator('.online').click();
    assert.equal(await page.locator('[data-activity-tab="overview"]').getAttribute('aria-selected'),'true','Each opening starts with current daily information');
    assert.deepEqual(requests.slice(historyStart).filter(request=>request.method!=='GET').map(request=>({method:request.method,path:new URL(request.url).pathname})),[],'Opening and navigating history do not submit commands');
    reports.push({language,width,status:'OK'});
    await page.close();
  }
  console.log(JSON.stringify(reports,null,2));
}finally{await browser.close()}

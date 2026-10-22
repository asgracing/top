// Actual RU/EN bans pages over a built artifact; all external traffic intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root} from './v2-browser-fixtures.mjs';
const captured=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/fun-bans.json'),'utf8'));
const directory={schema_version:1,total_items:captured.drivers.length,
  items:captured.drivers.map(row=>({public_id:row.public_id,driver:row.driver,is_banned:row.is_banned===true}))};
const reports=[];
try {
  for(const language of ['ru','en'])for(const width of [390,1280])for(const mode of ['compact','legacy','failed']) {
    console.log(`Checking directory ${language} ${width} ${mode}`);
    const page=await browser.newPage({viewport:{width,height:940},reducedMotion:'reduce'});
    const errors=[],reads={compact:0,legacy:0};
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
      const req=route.request();let u=new URL(req.url());
      if(req.method()!=='GET')return route.fulfill({status:403,body:'{}'});
      if(u.origin===base&&u.pathname.startsWith('/__asg_public__/'))u=new URL('https://data.asgracing.ru'+u.pathname.slice('/__asg_public__'.length)+u.search);
      if(u.hostname==='data.asgracing.ru') {
        if(u.pathname==='/top-data/bans.json')return route.fulfill({contentType:'application/json',body:JSON.stringify(captured.bans)});
        if(u.pathname==='/top-data/v2/drivers/search.json'){
          reads.compact++;
          if(mode!=='compact')return route.fulfill({status:mode==='legacy'?404:503,body:'{}'});
          return route.fulfill({contentType:'application/json',body:JSON.stringify(directory)});
        }
        if(u.pathname==='/top-data/v2/drivers/drivers.json'){
          reads.legacy++;
          return route.fulfill({contentType:'application/json',body:JSON.stringify(captured.drivers)});
        }
      }
      return fixture(route,[]);
    });
    await page.goto(base+(language==='en'?'/en':'')+'/bans/',{waitUntil:'networkidle'});
    try { await page.locator('.bans-table tbody tr').first().waitFor({timeout:10000}); }
    catch(error){ console.log(JSON.stringify({url:page.url(),reads,errors,view:(await page.locator('body').innerText()).slice(0,500)}));throw error; }
    assert.equal(reads.compact,1);
    assert.equal(reads.legacy,mode==='legacy'?1:0);
    const links=await page.locator('.bans-table a').count();
    assert.ok(mode==='failed'?links===0:links>0,`${mode}: identity links`);
    assert.equal(await page.locator('html').getAttribute('lang'),language);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.deepEqual(errors,[]);
    reports.push({language,width,mode,reads});
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify({checks:reports.length,externalWritesDelivered:0,reports}));

// Start directly on the profile: visiting home first used to hide this defect.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,root,site} from './v2-browser-fixtures.mjs';
const data=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/v2-pages/public.json'),'utf8'));
const output=path.resolve(process.env.ASG_CHECK_OUTPUT_DIR||'../_archive/tmp/2026-10-10/profile-sr/browser');
await fs.mkdir(output,{recursive:true});
const driver=data.driver.public_id;
const memberships=Object.values(site.entity_details).filter(d=>d.roster?.some(r=>r.public_id===driver));
assert.deepEqual(memberships.map(d=>d.entity_type).sort(),['club','team']);
const reports=[];
try {
  for(const language of ['ru','en'])for(const width of [1440,390,320])for(const state of ['member','none','unavailable']) {
    const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[];
    const id=state==='none'?'drv_nomember':driver;
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>sessionStorage.setItem('asgV2IntroSeen','1'));
    await page.route('**/*',async route=>{
      const request=route.request();let url=new URL(request.url());
      if(url.origin===base&&url.pathname.startsWith('/__asg_public__/'))url=new URL('https://data.asgracing.ru'+url.pathname.slice('/__asg_public__'.length));
      if(!['GET','HEAD'].includes(request.method()))return route.fulfill({status:403,json:{}});
      if(url.hostname==='data.asgracing.ru'){
        if(url.pathname===`/top-data/v2/drivers/${id}.json`)return route.fulfill({json:{...data.driver,public_id:id}});
        if(state==='unavailable'&&url.pathname==='/public-cache-clubs-teams/current.json')return route.fulfill({status:503,json:{}});
      }
      return fixture(route,[]);
    });
    const prefix=language==='en'?'/en/':'/';
    await page.goto(`${base}${prefix}driver/?id=${id}`,{waitUntil:'networkidle'});
    await page.locator('.profile-heading h1').waitFor();
    if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
    const affiliations=page.locator('.profile-affiliations');
    if(state==='member'){
      for(const entity of memberships){
        const target=prefix+(entity.entity_type==='club'?'clubs/':'teams/detail/')+'?slug='+entity.slug;
        assert.equal(await affiliations.locator(`a[href="${target}"]`).textContent(),entity.display_name);
      }
      if(width===320)await page.screenshot({path:path.join(output,`profile-affiliations-${language}-${width}.png`)});
      const team=memberships.find(d=>d.entity_type==='team');
      await affiliations.locator(`a[href*="${team.slug}"]`).click();
      await page.locator('.site-entity-hero').waitFor();
      assert.ok(new URL(page.url()).pathname.endsWith('/teams/detail/'));
    }else{
      assert.equal(await affiliations.locator('a').count(),0);
      assert.equal((await affiliations.textContent()).match(/—/g)?.length,2);
    }
    assert.deepEqual(errors,[]);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    reports.push({language,width,state});
    await page.close();
  }
  await fs.writeFile(path.join(output,'profile-affiliations.json'),JSON.stringify(reports,null,2));
  console.log(JSON.stringify({cases:reports.length,reports}));
}finally{await browser.close();}

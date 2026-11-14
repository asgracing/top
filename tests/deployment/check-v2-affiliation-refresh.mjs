import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browser,base,fixture,snapshot,site} from './v2-browser-fixtures.mjs';
const reports=[];
try {
 for(const [language,width]of [['ru',1440],['en',390]])for(const mode of ['refresh','partial','unavailable']){
  const page=await browser.newPage({viewport:{width,height:936},reducedMotion:'reduce'}),errors=[],requests=[];
  const details=structuredClone(Object.values(site.entity_details));
  const club=details.find(row=>row.entity_type==='club'&&row.roster.length);
  assert.ok(club);const member=structuredClone(club.roster[0]),subject=member.public_id;
  const destination={...structuredClone(club),public_id:'club-refresh-destination',slug:'refresh-destination',display_name:'Refresh Club',asset:null,roster:[]};
  if(destination.rating)destination.rating.members_count=0;
  details.push(destination);let phase='initial';
  const pointer=()=>({...site.pointer,snapshot_id:phase==='initial'?(site.pointer.snapshot_id||site.pointer.rating_run_id):'fixture-refresh-'+phase,
    manifest:`snapshots/${phase==='initial'?(site.pointer.snapshot_id||site.pointer.rating_run_id):'fixture-refresh-'+phase}/manifest.json`,
    content_sha256:(phase==='initial'?'a':phase==='partial'?'c':'b').repeat(64)});
  const rows=structuredClone(snapshot.leaderboard.items);rows[0].public_id=subject;
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
   const request=route.request();let url=new URL(request.url());
   if(!['GET','HEAD'].includes(request.method()))return route.fulfill({status:403,json:{}});
   if(url.origin===base&&url.pathname.startsWith('/__asg_public__/'))url=new URL('https://data.asgracing.ru'+url.pathname.slice('/__asg_public__'.length));
   if(url.pathname.startsWith('/public-cache-clubs-teams/')){
    const pathname=url.pathname;requests.push(pathname);
    if(pathname.endsWith('/current.json'))return route.fulfill(phase==='unavailable'?{status:503,json:{}}:{json:pointer()});
    if(pathname.endsWith('/manifest.json'))return route.fulfill({json:{schema_version:1,kind:'clubs_teams_public_snapshot',rating_run_id:site.pointer.rating_run_id,
      completed_at:site.pointer.completed_at,content_sha256:pointer().content_sha256,
      files:details.map(row=>({path:`details/${row.entity_type}s/${row.slug}.json`,bytes:100,sha256:'d'.repeat(64)}))}});
    if(pathname.includes('/details/')){
     const detail=details.find(row=>pathname.endsWith('/'+row.slug+'.json'));
     assert.ok(detail);const value=structuredClone(detail);
     if(phase==='partial'&&value.entity_type==='team')value.status='rejected';
     return route.fulfill({json:value});
    }
   }
   if(url.pathname.includes('/top-data/v2/tables/leaderboard/'))return route.fulfill({json:{items:rows,page:1,page_size:10,storage_page_size:100,chunk:1,total_items:rows.length,total_pages:1}});
   return fixture(route,[]);
  });
  await page.goto(base+(language==='en'?'/en/':'/')+'#championship',{waitUntil:'networkidle'});
  const selector=`#v2-rating-table tr[data-row="${subject}"] td.col-club a`;
  await page.waitForFunction(({selector,name})=>document.querySelector(selector)?.textContent===name,{selector,name:club.display_name});
  const initial=await page.evaluate(async()=>{const b=await import('/v2/bridge.js?v=20261006v2k');b.subscribe(model=>{window.__affiliationFixtureModel=model;});return window.__affiliationFixtureModel.affiliationsSize;});
  if(mode==='refresh'){
   phase='changed';club.roster=club.roster.filter(row=>row.public_id!==subject);destination.roster.push({...member,role:'member'});
   if(club.rating)club.rating.members_count=club.roster.length;if(destination.rating)destination.rating.members_count=1;
   await page.evaluate(async()=>{const b=await import('/v2/bridge.js?v=20261006v2k');await b.getRuntime().prepareAffiliations();});
   await page.waitForFunction(({selector,name})=>document.querySelector(selector)?.textContent===name,{selector,name:destination.display_name},{timeout:2500});
   assert.equal(await page.evaluate(()=>window.__affiliationFixtureModel.affiliationsSize),initial);
   assert.ok(await page.evaluate(()=>window.__affiliationFixtureModel.affiliationsRevision>0));
  }else{
   phase=mode;const before=requests.length;
   await page.evaluate(async()=>{const b=await import('/v2/bridge.js?v=20261006v2k');for(let i=0;i<3;i++)await b.getRuntime().prepareAffiliations().catch(()=>{});});
   await page.waitForTimeout(100);const afterExplicit=requests.length;
   const expected=mode==='partial'?3*(details.length+2):6;
   assert.equal(afterExplicit-before,expected,'Exactly the explicit refresh work, including normal HTTP retry');
   await page.evaluate(async()=>{const b=await import('/v2/bridge.js?v=20261006v2k');for(let i=0;i<3;i++)b.publish({...window.__affiliationFixtureModel,viewer:'fixture-render-'+i});});
   await page.waitForTimeout(250);assert.equal(requests.length,afterExplicit,'Three renderer publications must not trigger a loader loop');
  }
  assert.deepEqual(errors,[]);reports.push({language,width,mode,initial_members:initial,requests:requests.length,same_count_refresh:mode==='refresh',renderer_fetch_loop:false});
  await page.close();
 }
 const output=process.env.ASG_CHECK_OUTPUT_DIR;await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'affiliation-refresh.json'),JSON.stringify(reports,null,2)+'\n');
 console.log(JSON.stringify({cases:reports.length,reports}));
}finally{await browser.close();}

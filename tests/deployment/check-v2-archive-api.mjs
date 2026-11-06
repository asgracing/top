import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {base,browser,fixture,root} from './v2-browser-fixtures.mjs';

const sample=JSON.parse(await readFile(path.join(root,'tests/fixtures/v2-pages/archive.json'),'utf8'));
const cards=sample.items.map((row,index)=>({...row,track_code:row.track_code||row.track,
  kind:({1:'monoclass',2:'endurance'})[index]||(row.source==='hourly'?'hourly':'public')}));
const card=cards[0],id=card.race_id;
const protocol={...sample.race,track_code:card.track_code,kind:card.kind,result_context_version:1,
  race_conditions:{ambient_temp_c:24,rain:0},qualifying:{status:'available',results:[sample.race.results[0]]}};
const detail={race_id:id,archive_revision:2,card,protocol};
const prefix='/race-archive-shadow/v1/direct/', proxy='/__asg_public__',reports=[];

async function setup(options={}) {
  const page=await browser.newPage({viewport:{width:options.width||1280,height:936},reducedMotion:'reduce'});
  const api=[],legacy=[],errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
    const request=route.request();
    let url=new URL(request.url());
    const proxied=url.origin===base&&url.pathname.startsWith(proxy+'/');
    if(proxied)url=new URL('https://data.asgracing.ru'+url.pathname.slice(proxy.length)+url.search);
    const name=url.pathname;
    const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(url.hostname==='data.asgracing.ru'&&name.startsWith(prefix)) {
      assert.equal(request.method(),'GET');
      api.push(url);
      if(options.live) {
        assert.ok(proxied,'Live verification must use the read-only local proxy');
        return route.continue();
      }
      if(name===prefix+'archive') {
        if(options.archiveError)return json({error:'archive_unavailable'},503);
        const q=url.searchParams;
        const rows=cards.filter(row=>(!q.get('track')||row.track_code===q.get('track'))
          &&(!q.get('kind')||row.kind===q.get('kind'))&&(!q.get('q')||String(row.winner).includes(q.get('q'))));
        if(q.get('order')==='asc')rows.reverse();
        const total_pages=Math.max(1,Math.ceil(rows.length/10)),n=Math.min(Number(q.get('page')),total_pages);
        return json({schema:1,revision:2,items:rows.slice((n-1)*10,n*10),page:n,total_items:rows.length,total_pages,
          archive_total:cards.length,generated_at:sample.manifest.generated_at});
      }
      if(options.protocolError)return json({error:options.protocolError===404?'not_found':'archive_unavailable'},options.protocolError);
      if(options.invalidProtocol)return json({...detail,race_id:cards[1].race_id});
      assert.equal(name,prefix+'races/'+id);
      return json(detail);
    }
    if(url.hostname==='data.asgracing.ru') {
      if(name==='/top-data/v2/manifest.json')return json(sample.manifest);
      const chunk=name.match(/^\/top-data\/v2\/races\/chunk-(\d+)\.json$/);
      if(chunk) {
        legacy.push(name);
        const start=(Number(chunk[1])-1)*20;
        return json({items:sample.items.slice(start,start+20),total_items:cards.length});
      }
      if(name.includes('/races/details/')||name===`/hourly-data/races/${id}.json`) {
        legacy.push(name);
        return json(sample.race);
      }
      if(name.includes('/races/context/')) {legacy.push(name);return json({},404);}
    }
    return fixture(route,[]);
  });
  return {page,api,legacy,errors};
}

const rows='.archive-table tbody tr';
const firstRace=page=>page.locator(rows).first();
const settleArchive=page=>page.waitForFunction(()=>document.querySelector('#site-archive-content')?.getAttribute('aria-busy')===null);
async function close({page,errors},result) {
  assert.deepEqual(errors,[]);
  reports.push(result);
  await page.close();
}

try {
  for(const [language,width] of [['ru',1280],['en',390]]) {
    const test=await setup({width}),{page,api,legacy}=test;
    await page.goto(base+(language==='en'?'/en':'')+'/races/?raceData=api');
    await firstRace(page).waitFor();
    assert.equal(await firstRace(page).getAttribute('data-page-race'),id);
    assert.equal(await page.locator(rows).count(),10);
    assert.equal(api.length,1);
    assert.equal(api[0].searchParams.get('limit'),'10');
    await page.locator('.asg-legal-banner-btn-secondary').click();
    await page.locator('[data-site-step="archive"][data-step="1"]').click();
    await page.waitForFunction(key=>document.querySelector('.archive-table tbody tr')?.dataset.pageRace===key,cards[10].race_id);
    assert.equal(api.at(-1).searchParams.get('page'),'2');
    await page.locator('[data-site-step="archive"][data-step="-1"]').click();
    await page.waitForFunction(key=>document.querySelector('.archive-table tbody tr')?.dataset.pageRace===key,id);
    const resultLink=await firstRace(page).locator('td:last-child a').getAttribute('href');
    await firstRace(page).click({position:{x:10,y:10}});
    await page.locator('#v2-modal .results-table').first().waitFor();
    await page.locator('#v2-modal [data-result-tab="qualifying"]').click();
    assert.equal(await page.locator('#v2-modal .qualifying-table tbody tr').count(),1);
    await page.locator('#v2-modal .modal-close').click();
    await page.locator('#site-archive-kind').selectOption('monoclass');await settleArchive(page);
    assert.equal(await page.locator('.archive-table .kind-monoclass').count(),1);
    await page.locator('#site-archive-kind').selectOption('endurance');await settleArchive(page);
    assert.equal(await page.locator('.archive-table .kind-endurance').count(),1);
    await page.locator('#site-archive-kind').selectOption('');await settleArchive(page);
    await page.locator('#site-archive-track').selectOption('monza');await settleArchive(page);
    assert.equal(api.at(-1).searchParams.get('track'),'monza');
    await page.locator('#site-archive-kind').selectOption('public');await settleArchive(page);
    assert.equal(api.at(-1).searchParams.get('kind'),'public');
    await page.locator('#site-archive-order').selectOption('asc');await settleArchive(page);
    assert.equal(api.at(-1).searchParams.get('order'),'asc');
    await page.locator('#site-archive-search').fill('No_such_result_76');
    await page.locator('#site-archive-content .site-empty').waitFor();
    assert.equal(api.at(-1).searchParams.get('q'),'No_such_result_76');
    await page.goto(new URL(resultLink,base).href+'&tab=qualifying');
    await page.locator('#page-view .qualifying-table').waitFor();
    assert.equal(await page.locator('#page-view [data-result-tab="qualifying"]').getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('#page-view [data-result-panel="race"] .results-table tbody tr').count(),protocol.results.length);
    assert.match(await page.locator('#page-view .race-conditions').last().innerText(),/24/);
    assert.equal(new URL(page.url()).searchParams.get('id'),id);
    assert.deepEqual(legacy,[]);
    await close(test,{language,width,archive:'api',modal:'api',protocol:'api',archiveAndDetailReads:api.length});
  }
  {
    const test=await setup({archiveError:true,protocolError:503}),{page,api,legacy}=test;
    await page.goto(base+'/races/?raceData=api');await firstRace(page).waitFor();
    assert.equal(api.length,1);assert.equal(legacy.filter(name=>name.includes('chunk-')).length,1);
    await page.goto(`${base}/race/?id=${id}&source=top&file=races/details/${id}.json`);
    await page.locator('#page-view .results-table').first().waitFor();
    assert.equal(api.length,2);assert.ok(legacy.some(name=>name.includes('/races/details/')));
    await page.goto(base+'/races/?raceData=json');await firstRace(page).waitFor();
    await page.goto(`${base}/race/?id=${id}`);await page.locator('#page-view .results-table').first().waitFor();
    assert.equal(api.length,2);
    await close(test,{states:'503 archive, 503 protocol, explicit JSON rollback'});
  }
  for(const options of [{protocolError:404},{invalidProtocol:true},{}]) {
    const test=await setup(options),{page,api,legacy}=test;
    const enabled=options.protocolError||options.invalidProtocol;
    await page.goto(`${base}/race/?id=${id}${enabled?'&raceData=api':''}`);
    if(options.protocolError===404) {
      await page.waitForFunction(()=>document.querySelector('#page-view h1')?.textContent==='Гонка не найдена');
      assert.deepEqual(legacy,[]);
    }else {
      await page.locator('#page-view .results-table').first().waitFor();
      assert.ok(legacy.some(name=>name.includes('/races/details/')));
    }
    assert.equal(api.length,enabled?1:0);
    await close(test,{state:options.protocolError?'deleted stays missing':options.invalidProtocol?'invalid protocol falls back':'JSON remains default'});
  }
  {
    const test=await setup(),{page,api,legacy}=test;
    await page.goto(`${base}/en/race/?id=${id}&source=hourly&raceData=api`);
    await page.locator('#page-view .results-table').first().waitFor();
    assert.deepEqual(api,[]);
    assert.ok(legacy.includes(`/hourly-data/races/${id}.json`));
    await close(test,{state:'saved Hourly namespace preserved'});
  }
  if(process.env.ASG_ARCHIVE_API_LIVE==='1') {
    for(const kind of ['recent','public','hourly','monoclass','endurance','championship']) {
      const test=await setup({live:true,width:kind==='hourly'?390:1280}),{page,legacy}=test;
      const wait=route=>page.waitForResponse(response=>new URL(response.url()).pathname===proxy+prefix+route);
      const archiveResponse=wait('archive');
      const params=kind==='recent'?'':`&kind=${kind}&order=asc`;
      await page.goto(`${base}/en/races/?raceData=api${params}`);
      const list=await archiveResponse;assert.equal(list.status(),200);
      const archive=await list.json();
      if(!archive.total_items) {
        assert.notEqual(kind,'recent');
        await page.locator('#site-archive-content .site-empty').waitFor();
        assert.deepEqual(legacy,[]);
        await close(test,{live:kind,archiveRevision:archive.revision,total:0});
        continue;
      }
      await firstRace(page).waitFor();
      const key=archive.items[0].race_id;
      assert.equal(await firstRace(page).getAttribute('data-page-race'),key);
      if(kind!=='recent')assert.ok(archive.items.every(row=>row.kind===kind));
      await page.locator('.asg-legal-banner-btn-secondary').click();
      const link=await firstRace(page).locator('td:last-child a').getAttribute('href');
      const modalResponse=wait('races/'+key);
      await firstRace(page).click({position:{x:10,y:10}});
      const received=await modalResponse;assert.equal(received.status(),200);
      const result=await received.json();
      for(const field of ['race_id','winner','winner_car_name','best_lap_public_id','finished_at'])
        assert.equal(archive.items[0][field],result.card[field]);
      await page.locator('#v2-modal [data-result-tab="race"]').waitFor();
      const directResponse=wait('races/'+key);
      await page.goto(new URL(link,base).href);
      assert.equal((await directResponse).status(),200);
      await page.locator('#page-view [data-result-tab="race"]').waitFor();
      if(result.protocol.participation_mode!=='team') {
        assert.equal(await page.locator('#page-view [data-result-panel="race"] tbody tr').count(),result.protocol.results.length);
      }
      assert.deepEqual(legacy,[]);
      await close(test,{live:kind,race:key,archiveRevision:archive.revision,archiveTotal:archive.archive_total,
        source:result.source,rows:result.protocol.results.length,qualifying:result.protocol.qualifying?.status,
        teams:result.protocol.team_results?.length||0});
    }
  }
}finally{await browser.close();}

console.log(JSON.stringify(reports));

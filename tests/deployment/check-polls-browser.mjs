import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';

const root = path.resolve(import.meta.dirname,'../..');
const compiled = path.resolve(process.env.ASG_V2_OUTPUT_DIR || taskScratchPath('compilation'));
const output = taskScratchPath('polls-browser'); await fs.mkdir(output,{recursive:true});
const server = http.createServer(async (req,res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url,'http://local').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const rel = pathname.replace(/^\//,'');
    if (rel.split('/').some(part => part.startsWith('.')) || !/\.(html|js|css|json|svg|webp|png|jpg|ico|woff2?)$/.test(rel)) throw Error('blocked');
    let body;
    for (const base of [compiled,root]) { const file=path.resolve(base,rel); if (!file.startsWith(base+path.sep)) throw Error('outside'); try {body=await fs.readFile(file);break;} catch {} }
    if (!body) throw Error('missing');
    res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[path.extname(rel)]||'application/octet-stream'});res.end(body);
  } catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base = `http://127.0.0.1:${server.address().port}`;process.env.ASG_V2_PREVIEW=base;
const entry = (language, route) => base + (process.env.ASG_POLL_BROWSER_ROOT === '1' ? (language === 'en' ? '/en/' : '/') : '/v2/' + language + '/') + route;
const {browser,fixture} = await import('./v2-browser-fixtures.mjs');
const now = Date.now();
const sample = {id:'poll-fixture',title:'Какую трассу выбираем для следующей гонки?',description:'Выбираем вместе. Результаты помогут организаторам подготовить следующую гонку.',mode:'multiple',max_choices:2,status:'active',revision:4,participants:100,starts_at:new Date(now-3600000).toISOString(),ends_at:new Date(now+72*3600000).toISOString(),options:[{id:'spa',label:'Circuit de Spa-Francorchamps — длинное название трассы для проверки переноса',count:60,color:'#69b8f7'},{id:'nurburgring',label:'Nürburgring',count:75,color:'#a992f5'},{id:'brands',label:'Brands Hatch',count:20,color:'#62d5ba'}]};
const results=[],errors=[];let writes=0;
async function setup({width=1440,language='ru',signed=true,admin=false,denied=false}={}) {
  const context = await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();
  await context.addCookies([{name:'asg_privacy_consent',value:encodeURIComponent(JSON.stringify({version:'2026-04-30',analytics:false,savedAt:new Date().toISOString()})),url:base}]);
  await context.addInitScript(()=>sessionStorage.setItem('asgHomeIntroSeenR10','1'));
  const state={poll:structuredClone(sample),choices:[],revision:0,fail:false,admin,deny:denied,writes:[],counts:0,legacy:false,widgetReads:0};
  if (admin) state.poll.delivery = [
    {kind:'opened',destination:'discord',status:'sent'},
    {kind:'pin_opened',destination:'telegram',status:'retry'},
    {kind:'closed',destination:'discord',status:'pending'},
    {kind:'pin_closed',destination:'telegram',status:'ambiguous'}
  ];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),p=url.pathname;
    const send=(payload,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(payload)});
    if (url.hostname==='auth.asgracing.ru' && (p.startsWith('/v1/polls')||p.startsWith('/v1/admin/polls'))) {
      if (state.fail) return send({detail:'unavailable'},503);
      const method=req.method();
      if (p.startsWith('/v1/admin/polls')&&!admin) return send({detail:'forbidden'},signed?403:401);
      if (state.deny) return send({detail:'forbidden'},403);
      if (method!=='GET') {
        writes++;const data=req.postDataJSON();state.writes.push({p,method,data});
        assert.equal(req.headers()['x-csrf-token'],'test-poll-csrf');
        if (p.endsWith('/ballot')) {
          if (state.conflict) {state.conflict=false;state.choices=['brands'];state.revision++;return send({detail:'ballot_changed'},409);}
          assert.ok(signed);state.choices=method==='DELETE'?[]:data.choices;state.revision++;return send({ok:true});
        }
        if (p.endsWith('/close')) state.poll.status='closed';
        else if (p.endsWith('/publish')) {state.poll.status='active';state.poll.starts_at ||= new Date().toISOString();state.poll.ends_at=new Date(Date.parse(state.poll.starts_at)+state.poll.duration_hours*3600000).toISOString();}
        else if (p.endsWith('/cancel')) state.poll.status='cancelled';
        else {state.poll={...state.poll,...data,status:'draft',options:data.options.map((label,i)=>({id:'new'+i,label,count:0})),participants:0};}
        state.poll.revision++;return send({poll:state.poll});
      }
      if (p.endsWith('/ballot')) return send({authenticated:signed,choices:state.choices,revision:state.revision,csrf_token:signed?'test-poll-csrf':''});
      if (p==='/v1/polls'||p==='/v1/admin/polls') {
        if(p==='/v1/polls'&&url.searchParams.get('limit')==='1')state.widgetReads++;
        const selected=url.searchParams.get('filter');
        const items=selected==='archive'?[{...state.poll,status:'closed'}]:selected==='draft'?[{...state.poll,status:'draft'}]:[state.poll,{...state.poll,id:'second',title:'В какое время вам удобно участвовать в гонках?'}];
        return send({polls:items,total:items.length,...(admin?{csrf_token:'test-poll-csrf',...(state.legacy?{}:{capabilities:{social_notifications:true}})}:{})});
      }
      state.counts++;return send({poll:state.poll,...(admin?{csrf_token:'test-poll-csrf',...(state.legacy?{}:{capabilities:{social_notifications:true}})}:{})});
    }
    return fixture(route,[],{signed,admin});
  });
  return {page,context,state,language};
}
async function fits(page) {
  const width=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(width.scroll<=width.inner+1,JSON.stringify(width));
}
try {
  {
    const {page,context,state}=await setup();
    await page.clock.install({time:new Date(now)});
    await page.goto(entry('ru','polls/'));await page.waitForSelector('.server-poll-callout:not([hidden])');
    assert.equal(state.widgetReads,1);
    await page.setViewportSize({width:390,height:1000});await page.locator('.servers-panel').scrollIntoViewIfNeeded();
    await page.setViewportSize({width:1440,height:1000});await page.locator('.server-poll-callout').waitFor();
    assert.equal(state.widgetReads,1,'Scrolling/resizing must not bypass the one-minute fetch bound');
    const refreshed=page.waitForResponse(r=>new URL(r.url()).searchParams.get('limit')==='1'&&r.url().includes('/v1/polls?'));
    await page.clock.fastForward(61000);await refreshed;
    assert.equal(state.widgetReads,2);
    state.poll.ends_at=new Date(now+62000).toISOString();
    await page.clock.fastForward(61000);await page.waitForSelector('.server-poll-callout[hidden]',{state:'attached'});
    assert.equal(await page.locator('.server-poll-callout').isVisible(),false);
    assert.equal(state.writes.length,0);
    results.push({screen:'server-poll-fetch-bound-and-expiry',passed:true});await context.close();
  }
  for (const language of ['ru','en']) for (const width of [1440,390]) {
    const {page,context,state}=await setup({language,width});
    await page.goto(entry(language,'polls/'));
    await page.waitForSelector('.poll-card'); await fits(page);
    assert.equal(await page.locator('.poll-card').count(),2);
    if (language==='ru' && width===1440) await page.screenshot({path:path.join(output,'directory-ru-1440.png'),fullPage:true,animations:'disabled'});
    await page.locator('[data-filter="archive"]').click();await page.waitForFunction(()=>document.querySelectorAll('.poll-card').length===1);
    await page.goto(entry(language,'polls/view/?id=poll-fixture'));await page.waitForSelector('[data-vote]');await fits(page);
    assert.equal(await page.locator('[data-option-percent="nurburgring"]').textContent(),'75.0%');
    await page.locator('[name=choice]').nth(0).check();await page.locator('[name=choice]').nth(1).check();
    assert.equal(await page.locator('[name=choice]').nth(2).isDisabled(),true);
    await page.locator('[data-vote]').click();await page.waitForFunction(()=>document.querySelector('[data-notice]')?.textContent.includes('учтён')||document.querySelector('[data-notice]')?.textContent.includes('counted'));
    assert.deepEqual(state.choices,['spa','nurburgring']);
    await page.locator('[data-poll-action="withdraw"]').click();await page.waitForFunction(()=>document.querySelectorAll('[name=choice]:checked').length===0);
    assert.deepEqual(state.choices,[]);
    await page.waitForFunction(()=>document.querySelector('[data-poll-content]')?.getAttribute('aria-busy')!=='true');
    await page.screenshot({path:path.join(output,`public-${language}-${width}.png`),fullPage:true,animations:'disabled'});
    results.push({language,width,screen:'public',passed:true});await context.close();
  }
  {
    const {page,context}=await setup({signed:false,width:390});
    await page.goto(entry('ru','polls/view/?id=poll-fixture'));await page.waitForSelector('.poll-signin');
    assert.equal(await page.locator('[data-vote]').count(),0);assert.ok((await page.locator('.poll-signin a').getAttribute('href')).includes('return_path='));await fits(page);
    await page.goto(entry('ru','moderation/polls/'));await page.waitForSelector('.poll-empty h2');
    assert.equal(await page.locator('[data-editor]').count(),0);results.push({screen:'guest-gates',passed:true});await context.close();
  }
  for (const language of ['ru','en']) for (const width of [1440,390]) {
    const {page,context,state}=await setup({admin:true,language,width});
    await page.goto(entry(language,'moderation/polls/?new=1'));await page.waitForSelector('[data-editor]');await fits(page);
    const social = page.getByRole('switch');
    assert.equal(await social.isChecked(),false);
    await social.focus(); await page.keyboard.press('Space');
    assert.equal(await social.isChecked(),true);
    await page.locator('.poll-social-copy strong').click();
    assert.equal(await social.isChecked(),false);
    const notify = !(language === 'en' && width === 1440);
    if (notify) await page.locator('.poll-social-copy strong').click();
    await page.locator('[name=title]').fill(language==='ru'?'Какая трасса следующая?':'Which track is next?');
    await page.locator('[name=option]').nth(0).fill('Spa-Francorchamps');await page.locator('[name=option]').nth(1).fill('Nürburgring');
    await page.locator('[data-poll-action=add]').click();await page.locator('[name=option]').nth(2).fill('Brands Hatch');
    await page.locator('[name=mode]').selectOption('multiple');await page.locator('[name=max_choices]').fill('2');
    await page.locator('[name=duration]').selectOption('custom');await page.locator('[name=duration_hours]').fill('36');
    assert.ok((await page.locator('[data-deadline-preview]').textContent()).includes('МСК')||(await page.locator('[data-deadline-preview]').textContent()).includes('MSK'));
    await page.locator('[data-poll-action=preview]').click();await page.waitForSelector('dialog[open] .poll-confirm-preview');
    assert.equal(state.writes.length,0);assert.ok((await page.locator('.poll-confirm-preview').textContent()).includes('Brands Hatch'));
    assert.ok((await page.locator('[data-social-preview]').textContent()).includes(notify ? '@everyone' : 'without a mass mention'));
    await page.locator('dialog button[value=confirm]').click();
    await page.screenshot({path:path.join(output,`admin-${language}-${width}.png`),fullPage:true,animations:'disabled'});
    await page.locator('button[name=publish]').click();await page.waitForSelector('dialog[open]');await page.locator('dialog button[value=confirm]').click();
    await page.waitForURL(/id=poll-fixture/);await page.waitForSelector('[data-poll-action=close]');
    assert.equal(state.writes[0].data.duration_hours,36);assert.ok(state.writes[0].data.idempotency_key);assert.equal(state.writes[0].data.max_choices,2);
    assert.equal(state.writes[0].data.notify_socials,notify);
    assert.equal(await page.getByRole('switch').isChecked(),notify);
    assert.equal(await page.getByRole('switch').isDisabled(),true);
    assert.equal(await page.locator('.poll-delivery').count(),4);
    assert.ok((await page.locator('.poll-delivery').nth(1).textContent()).includes(language === 'en' ? 'Opening pin' : 'Закрепление анонса'));
    assert.equal(await page.locator('[name=title]').isDisabled(),true);
    await page.locator('[data-poll-action=close]').click();await page.waitForSelector('dialog[open]');await page.locator('dialog button[value=confirm]').click();
    await page.waitForFunction(()=>document.querySelector('.poll-badge')?.dataset.status==='closed');
    assert.ok(state.writes.some(row=>row.p.endsWith('/close')));await fits(page);
    results.push({language,width,screen:'admin-create-publish-close',passed:true});await context.close();
  }
  {
    const {page,context,state}=await setup({admin:true});state.legacy=true;
    await page.goto(entry('ru','moderation/polls/?new=1'));await page.waitForSelector('[data-editor]');
    assert.equal(await page.getByRole('switch').isDisabled(),true);
    await page.locator('[name=title]').fill('Опрос без массового уведомления');
    await page.locator('[name=option]').nth(0).fill('Spa');await page.locator('[name=option]').nth(1).fill('Monza');
    await page.locator('[data-save]').click();await page.waitForURL(/id=poll-fixture/);
    assert.equal('notify_socials' in state.writes[0].data,false);
    results.push({screen:'legacy-api-compatible-save',passed:true});await context.close();
  }
  {
    const {page,context}=await setup({signed:true,admin:false});await page.goto(entry('ru','moderation/polls/?new=1'));await page.waitForSelector('.poll-empty h2');assert.equal(await page.locator('[data-editor]').count(),0);results.push({screen:'non-admin-direct-entry',passed:true});await context.close();
  }
  {
    const {page,context}=await setup({admin:true});
    await page.goto(entry('ru','moderation/'));await page.waitForSelector('.control-navigation a[href$="moderation/polls/"]');
    assert.equal(await page.locator('.control-navigation a[href$="reports/"]').count(),1);
    await page.locator('.control-navigation a[href$="moderation/polls/"]').click();await page.waitForSelector('.poll-card');
    results.push({screen:'moderation-entry-next-to-reports',passed:true});await context.close();
  }
  {
    const {page,context,state}=await setup();state.fail=true;
    await page.goto(entry('ru','polls/view/?id=poll-fixture'));await page.waitForSelector('.poll-empty h2');
    state.fail=false;await page.locator('[data-poll-action=retry]').click();await page.waitForSelector('[data-vote]');
    state.conflict=true;await page.locator('[name=choice]').nth(0).check();await page.locator('[data-vote]').click();
    await page.waitForFunction(()=>document.querySelector('[data-notice]')?.textContent.includes('изменился'));
    assert.equal(await page.locator('[name=choice]:checked').inputValue(),'brands');
    results.push({screen:'network-retry-and-stale-ballot',passed:true});await context.close();
  }
  {
    const {page,context,state}=await setup();await page.clock.install({time:new Date(now)});
    state.poll.ends_at=new Date(now+20000).toISOString();
    await page.goto(entry('ru','polls/view/?id=poll-fixture'));await page.waitForSelector('[data-vote]');
    await page.locator('[name=choice]').nth(0).check();await page.clock.fastForward(31000);
    await page.waitForSelector('.poll-ended');assert.equal(await page.locator('[data-vote]').count(),0);
    assert.equal(state.writes.length,0);results.push({screen:'deadline-during-selection',passed:true});await context.close();
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(output,process.env.ASG_POLL_BROWSER_ROOT === '1' ? 'acceptance-root.json' : 'acceptance.json'),JSON.stringify({results,errors,interceptedWrites:writes,productionRequests:0},null,2)+'\n');
  console.log(`Polls browser: ${results.length} scenarios passed, ${writes} fixture writes, no production requests.`);
} finally {await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}

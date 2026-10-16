import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';
const candidate=path.resolve(process.env.ASG_DIST_OUTPUT_DIR||fileURLToPath(new URL('../../dist',import.meta.url)));
const output=taskScratchPath('rules-browser');await fs.mkdir(output,{recursive:true});
const server=http.createServer(async(req,res)=>{
  try{
    let p=decodeURIComponent(new URL(req.url,'http://local').pathname);if(p.endsWith('/'))p+='index.html';
    const file=path.resolve(candidate,'.'+p),relative=path.relative(candidate,file);
    if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('outside root');
    const body=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'}[path.extname(file)]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;process.env.ASG_V2_PREVIEW=base;
const {browser,fixture}=await import('../deployment/v2-browser-fixtures.mjs');
const reports=[];
try{
  for(const variant of ['v2','classic'])for(const language of ['ru','en'])for(const width of [320,390,1280]){
    const page=await browser.newPage({viewport:{width,height:960},reducedMotion:'reduce'}),errors=[],requests=[],mutations=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
      window.ruleCopies=[];
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.ruleCopies.push(text);}}});
    });
    await page.route('**/*',async route=>{
      requests.push(route.request().url());
      if(route.request().method()!=='GET'){
        mutations.push(route.request().url());
        return route.fulfill({status:403,body:'{}'});
      }
      return fixture(route,[]);
    });
    const url=base+(variant==='classic'?'/old':'')+(language==='en'?'/en':'')+'/';
    await page.goto(url,{waitUntil:'networkidle'});
    if(await page.locator('.asg-legal-banner-btn-secondary').isVisible())await page.locator('.asg-legal-banner-btn-secondary').click();
    assert.equal(requests.some(url=>/rules-view|rules-content|racing-rules\.css/.test(url)),false,'full rules must load on demand');
    if(variant==='v2')await page.locator('[data-modal="rules"]:visible').first().click();
    else await page.goto(url+'#rules',{waitUntil:'networkidle'});
    await page.locator('.asg-rules').waitFor({state:'visible'});
    await page.waitForFunction(()=>document.querySelector('link[data-asg-rules-style]')?.sheet);
    const book=page.locator('.asg-rules');
    assert.match(await book.locator('#asg-rules-track-main').textContent(),language==='ru'?/одного круга.*5 секунд/s:/one lap.*5 seconds/s);
    assert.equal(await book.locator('[role=tab]').count(),4);
    const checkWidth=async()=>assert.equal(await book.evaluate(node=>node.scrollWidth<=node.clientWidth+1),true,'reader must fit viewport');
    await checkWidth();
    await book.locator('[data-rules-tab="racing"]').focus();await page.keyboard.press('ArrowRight');
    assert.equal(await book.locator('[data-rules-tab="penalties"]').getAttribute('aria-selected'),'true');
    assert.equal(await book.locator('table:visible').count(),3);
    assert.equal(await book.locator('table').evaluateAll(tables=>tables.every(table=>table.scrollWidth<=table.clientWidth+1)),true,'penalty columns must not clip or overlap');
    assert.match(await book.locator('#asg-rules-penalties-general').textContent(),language==='ru'?/10 секунд/:/10 seconds/);
    await checkWidth();
    if(language==='ru'&&[390,1280].includes(width))await page.screenshot({path:path.join(output,`${variant}-${language}-${width}-penalties.png`)});
    const oldHash=new URL(page.url()).hash;
    await book.locator('[data-rules-jump="penalties-contact"]').first().click();
    assert.equal(new URL(page.url()).hash,oldHash,'section navigation must not change global routing');
    await book.locator('[data-rules-tab="community"]').click();
    assert.equal(await book.locator('#asg-rules-panel-community .asg-rule-list>li').count(),23);
    await checkWidth();
    if(language==='ru'&&[390,1280].includes(width)){
      await book.locator('[data-rules-tab="community"]').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(output,`${variant}-${language}-${width}-community.png`)});
    }
    await book.locator('[data-rules-tab="appeals"]').click();
    await book.locator('[data-rules-copy="report"]').click();
    await page.waitForFunction(()=>window.ruleCopies.length===1);
    assert.equal((await page.evaluate(()=>window.ruleCopies[0])).split('\n').length,9);
    await book.locator('[data-rules-copy="protest"]').click();
    await page.waitForFunction(()=>window.ruleCopies.length===2);
    assert.equal((await page.evaluate(()=>window.ruleCopies[1])).split('\n').length,8);
    assert.equal(await book.locator(`a[href="https://discord.com/channels/1000721957978910740/1491160572601831575"]`).count(),1);
    await checkWidth();
    {
      await page.keyboard.press('Escape');await page.locator(variant==='v2'?'#v2-modal':'.asg-rules-legacy-dialog').waitFor({state:'hidden'});
      await page.locator(variant==='v2'?'[data-modal="rules"]:visible':'[data-rules-open]').first().click();await book.waitFor({state:'visible'});
      await book.locator('[data-rules-tab="appeals"]').click();await book.locator('[data-rules-copy="report"]').click();
      await page.waitForFunction(()=>window.ruleCopies.length===3);
      await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>window.ruleCopies.length),3,'reopening must not duplicate listeners');
    }
    assert.deepEqual(errors,[]);
    assert.equal(mutations.some(url=>url.includes('auth.asgracing.ru')||url.includes('discord.com')),false,'reading and copying rules must not submit a report');
    reports.push({variant,language,width,errors,lazy:true,tabs:true,copy:true,overflow:false});
    await page.close();console.log(`${variant} ${language} ${width}px: lazy load, rules, tables, keyboard, templates and layout passed`);
  }
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(reports,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}

// Exercise the real classic and V2 controllers; all external requests are fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {taskScratchPath} from '../../scripts/workspace-scratch.mjs';

const candidate = path.resolve(process.env.ASG_DIST_OUTPUT_DIR || fileURLToPath(new URL('../../dist', import.meta.url)));
const output = taskScratchPath('number-rejection-browser');
await fs.mkdir(output, {recursive:true});
const server = http.createServer(async (request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const filename = path.resolve(candidate, '.' + pathname);
    const relative = path.relative(candidate, filename);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw Error('outside candidate');
    const body = await fs.readFile(filename);
    response.writeHead(200, {'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'}[path.extname(filename)] || 'application/octet-stream'});
    response.end(body);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
process.env.ASG_V2_PREVIEW = origin;
const {browser, fixture} = await import('../deployment/v2-browser-fixtures.mjs');
const reports = [];
try {
  for (const variant of ['classic','v2']) for (const language of ['ru','en']) for (const width of [390,1280]) {
    const page = await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
    const errors = [], writes = [];
    let allowed = false, listCalls = 0, rejectFailure = true;
    let requests = [
      {request_id:'fixture_approved',public_id:'drv_fixture1',display_name:'<b>Long driver name</b> '.repeat(5),requested_number:44,current_race_number:9,eligible:true},
      {request_id:'fixture_rejected',public_id:'drv_fixture2',display_name:'Blocked driver',requested_number:55,current_race_number:null,eligible:false}
    ];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.hostname !== 'auth.asgracing.ru') return fixture(route, [], {signed:true,admin:allowed});
      const headers = {'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-headers':'X-CSRF-Token,Content-Type,Accept','access-control-allow-methods':'GET,POST,OPTIONS'};
      if (request.method() === 'OPTIONS') return route.fulfill({status:204,headers});
      let payload, status = 200;
      if (url.pathname === '/v1/me') payload = {authenticated:true,linked:true,driver:{public_id:'drv_admin',display_name:'Fixture Admin',profile_url:'/driver/?id=drv_admin'},steam:{},csrf_token:'fixture-csrf',permissions:{moderation_issue:allowed}};
      else if (url.pathname === '/v1/moderation/race-number-requests') { listCalls++; payload = {requests}; }
      else if (/\/race-number-requests\/[^/]+\/(approve|reject)$/.test(url.pathname)) {
        assert.equal(request.method(), 'POST');
        assert.equal(request.headers()['x-csrf-token'], 'fixture-csrf');
        writes.push({path:url.pathname,body:request.postDataJSON()});
        if (url.pathname.endsWith('/reject')) {
          assert.deepEqual(writes.at(-1).body,{reason:'Reserved for another event'});
          if (rejectFailure) { rejectFailure = false; status = 503; payload = {detail:'temporarily_unavailable'}; }
        }
        if (!payload) { requests = requests.filter(item => !url.pathname.includes('/' + item.request_id + '/')); payload = {status:'ok'}; }
      } else if (url.pathname === '/v1/me/notifications') payload = {items:[],unread:0};
      else return fixture(route, [], {signed:true,admin:allowed});
      return route.fulfill({status,headers,json:payload});
    });
    const url = origin + (variant === 'classic' ? '/old' : '') + (language === 'en' ? '/en' : '') + '/moderation/';
    await page.goto(url);
    await page.locator('#moderation-gate').waitFor({state:'visible'});
    assert.equal(await page.locator('#moderation-workspace').isVisible(), false);
    assert.equal(listCalls, 0, 'non-admin must not fetch requests');
    allowed = true;
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.moderation-number-request').length === 2);
    if (variant === 'v2') await page.locator('[data-mod-view="numbers"]').click();
    const rows = page.locator('.moderation-number-request');
    assert.equal(await rows.locator('b').count(), 0, 'driver names are plain text');
    assert.equal(await rows.nth(1).locator('button').first().isDisabled(), true);
    assert.equal(await rows.nth(1).locator('.moderation-number-actions > .moderation-number-reject').first().isEnabled(), true, 'blocked pilot can still be rejected');
    assert.equal(await page.locator('#race-number-review-title').textContent(), language === 'ru' ? 'Заявки на гоночные номера' : 'Race number requests');
    const blocked = rows.nth(1);
    await blocked.locator('.moderation-number-actions > .moderation-number-reject').first().click();
    const form = blocked.locator('form');
    await form.locator('input').fill(' ab ');
    await form.locator('[type=submit]').click();
    assert.equal(writes.length, 0);
    await form.locator('.moderation-number-cancel').click();
    assert.equal(await form.isVisible(), false);
    await blocked.locator('.moderation-number-actions > .moderation-number-reject').first().click();
    await form.locator('input').fill('Reserved for another event');
    async function confirm(button, accept) {
      if (variant === 'classic') page.once('dialog', dialog => accept ? dialog.accept() : dialog.dismiss());
      await button.click();
      if (variant === 'v2') await page.locator(accept ? '[data-control-confirm]' : '[data-control-cancel]').click();
      await page.waitForFunction(() => !document.getElementById('race-number-review-refresh').disabled);
    }
    await confirm(form.locator('[type=submit]'), false);
    assert.equal(writes.length, 0);
    await page.screenshot({path:path.join(output,`${variant}-${language}-${width}-form.png`),fullPage:true});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal overflow');
    await confirm(form.locator('[type=submit]'), true);
    await page.waitForFunction(() => document.getElementById('race-number-review-message').dataset.kind === 'error');
    assert.equal(writes.length, 1);
    assert.equal(await rows.count(), 2, 'failed decision preserves the row');
    assert.equal(await form.locator('input').inputValue(), 'Reserved for another event');
    await confirm(form.locator('[type=submit]'), true);
    await page.waitForFunction(() => document.querySelectorAll('.moderation-number-request').length === 1);
    assert.equal(writes.length, 2);
    assert.equal(await rows.first().locator('button').first().isEnabled(), true);
    await confirm(rows.first().locator('button').first(), false);
    assert.equal(writes.length, 2);
    await confirm(rows.first().locator('button').first(), true);
    await page.waitForFunction(() => document.querySelectorAll('.moderation-number-request').length === 0);
    assert.equal(writes.length, 3);
    assert.ok(writes.at(-1).path.endsWith('/approve'));
    await page.locator('#race-number-review-refresh').click();
    await page.waitForFunction(() => !document.getElementById('race-number-review-refresh').disabled);
    assert.equal(listCalls, 2);
    if (variant === 'v2' && language === 'en' && width === 390) {
      requests = [{request_id:'fixture_logout',public_id:'drv_logout',display_name:'Logout check',requested_number:66,current_race_number:null,eligible:false}];
      await page.locator('#race-number-review-refresh').click();
      await page.waitForFunction(() => document.querySelectorAll('.moderation-number-request').length === 1);
      await rows.first().locator('.moderation-number-actions > .moderation-number-reject').first().click();
      await rows.first().locator('input').fill('Reserved for another event');
      await rows.first().locator('[type=submit]').click();
      await page.locator('[data-control-confirm]').waitFor({state:'visible'});
      await page.evaluate(async () => {
        const bridge = await import('/v2/bridge.js?v=20261006v2k');
        let model;
        bridge.subscribe(value => { model = value; })();
        bridge.publish({...model,auth:{authenticated:false,permissions:{}}});
      });
      await page.locator('#v2-modal').waitFor({state:'hidden'});
      assert.equal(await page.locator('#moderation-workspace').isVisible(), false);
      assert.equal(writes.length, 3, 'logout while confirming must not submit a decision');
    }
    const report = {variant,language,width,requests:writes.length,listCalls,errors};
    reports.push(report);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`${variant} ${language} ${width}px: rejection, reason, cancellation, retry, approval and access gate passed`);
  }
  await fs.writeFile(path.join(output,'report.json'), JSON.stringify(reports,null,2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

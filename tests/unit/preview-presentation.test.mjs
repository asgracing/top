import test from 'node:test';
import assert from 'node:assert/strict';
import {pageSnapshot,runtimeSnapshot,styleSnapshot,PRESENTATION_VERSION} from '../../scripts/preview-presentation-policy.mjs';
import {compactServerLabel,orderServerRows} from '../../preview/components/server-display.js';

test('preview presentation refresh is repeatable and keeps command endpoints and classic exit links',()=>{
  const original='<meta name="hourly-votes-api" content="https://data.asgracing.ru/hourly-votes-api"><link rel="stylesheet" href="/preview/runtime/hourly/styles.css?v=old"><link rel="stylesheet" href="/preview/design.css?v=old"><script type="module" src="/preview/runtime/hourly/app.js?v=old"></script><a data-preview-classic href="/ru/hourly/">Back</a>';
  const result=pageSnapshot(original);
  assert.equal(pageSnapshot(result),result);
  assert.ok(result.includes('layer(asgLegacy)'));
  assert.ok(result.includes('https://data.asgracing.ru/hourly-votes-api'));
  assert.ok(result.includes('href="/ru/hourly/"'));
  assert.ok(result.includes(`/preview/design.css?v=${PRESENTATION_VERSION}`));
});

test('preview refresh rejects a changed runtime hook instead of producing a disconnected component',()=>{
  assert.throws(()=>runtimeSnapshot('app.js','const api = "https://auth.asgracing.ru";'),/hook missing/);
  const auth='fetch("https://auth.asgracing.ru/v1/me/race-number",{method:"POST",headers:{"X-CSRF-Token":csrf}})';
  assert.equal(runtimeSnapshot('src/pages/account/account.js',auth),auth);
  assert.equal(styleSnapshot('a{color:red!important}[hidden]{display:none !important}'),'a{color:red}[hidden]{display:none}');
});

test('public server labels omit the technical advertisement while keeping separate admission fields',()=>{
  assert.equal(compactServerLabel({key:'hourly',label:"ASG Racing Race, password is public"}),'Hourly');
  assert.equal(compactServerLabel({key:'second',label:'ASG Racing Monza - Live Leaderboard - www.asgracing.ru'}),'Live Leaderboard');
  const rows=[{key:'quiet',players:0,sa:50,sr:2.5},{key:'busy',players:14,sa:30,sr:null},{key:'hourly',players:0},{key:'main',players:2}];
  assert.deepEqual(orderServerRows(rows).map(r=>r.key),['main','hourly','busy','quiet']);
  assert.equal(rows[0].sa,50);assert.equal(rows[0].sr,2.5);assert.equal(rows[0].key,'quiet');
});

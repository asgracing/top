import test from 'node:test';
import assert from 'node:assert/strict';
import {homeVersion,watchHomeVersion} from '../../v2/site-config.js';
import {createHttpClient,state} from '../../v2/membership/demo-state.js';

test('profile demo saves in memory and refuses every other endpoint',async t=>{
  const previous=globalThis.fetch;
  globalThis.fetch=()=>{throw Error('The demo must not call the real API');};
  t.after(()=>{globalThis.fetch=previous;});
  const client=createHttpClient(),url='https://auth.asgracing.ru/v1/me/profile-appearance';
  const before=await client.requestJson(url);
  const saved=await client.requestJson(url,{method:'POST',body:JSON.stringify({expected_revision:before.revision,effect:{energy:130}})});
  assert.equal(saved.effect.energy,130);assert.equal(saved.revision,before.revision+1);
  await assert.rejects(client.requestJson(url,{method:'POST',body:JSON.stringify({expected_revision:before.revision,effect:{energy:90}})}),error=>error.status===409);
  await assert.rejects(client.requestJson('https://auth.asgracing.ru/v1/me/support/trial',{method:'POST'}),/Unexpected demo request/);
  Object.assign(state,before);
});

test('homepage config accepts only bundled layouts',()=>{
  assert.equal(homeVersion({home_version:'membership'}),'membership');
  for(const value of [null,{}, {home_version:'https://outside.invalid/script.js'},{home_version:1}])assert.equal(homeVersion(value),'current');
});
test('live config ignores stale responses, keeps confirmed layout on failure and stops cleanly',async t=>{
  const old={document:globalThis.document,window:globalThis.window,setInterval,clearInterval};
  const doc=new EventTarget(),win=new EventTarget();doc.hidden=false;
  globalThis.document=doc;globalThis.window=win;
  let timer,cleared=false;
  globalThis.setInterval=callback=>{timer=callback;return 42;};
  globalThis.clearInterval=id=>{assert.equal(id,42);cleared=true;};
  t.after(()=>Object.assign(globalThis,old));
  const pending=[],seen=[];
  const fetcher=(_url,options)=>{assert.equal(options.credentials,'omit');return new Promise((resolve,reject)=>pending.push({resolve,reject}));};
  const response=home_version=>({ok:true,json:async()=>({home_version})});
  const flush=()=>new Promise(setImmediate);
  const stop=watchHomeVersion(value=>seen.push(value),{fetcher});
  win.dispatchEvent(new Event('asg-appearance-refresh'));
  pending[1].resolve(response('membership'));await flush();
  pending[0].resolve(response('current'));await flush();
  assert.deepEqual(seen,['membership']);
  timer();pending[2].reject(Error('offline'));await flush();assert.deepEqual(seen,['membership']);
  doc.hidden=true;timer();assert.equal(pending.length,3);
  doc.hidden=false;win.dispatchEvent(Object.assign(new Event('pageshow'),{persisted:true}));
  pending[3].resolve(response('current'));await flush();assert.deepEqual(seen,['membership','current']);
  timer();stop();pending[4].resolve(response('membership'));await flush();
  win.dispatchEvent(new Event('asg-appearance-refresh'));assert.equal(pending.length,5);assert.ok(cleared);assert.deepEqual(seen,['membership','current']);
});

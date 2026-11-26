import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSupportTrial} from '../../v2/support-trial.js';

function fixture({authenticated=true,used=false,eligible=['supporter','vip','pro'],csrf='test-csrf',postError,usedAfterError=used}={}){
  const calls=[];let submitted=false;
  return {calls,client:{async requestJson(url,options){
    calls.push({url,...options});
    if(url.endsWith('/trial')){submitted=true;if(postError)throw postError;return {ok:true};}
    if(url.endsWith('/v1/me'))return {authenticated,csrf_token:csrf};
    return {trial:{used:submitted?usedAfterError:used,eligible_tiers:eligible}};
  }}};
}
const posts=f=>f.calls.filter(call=>call.method==='POST');
test('trial requires login, eligibility, CSRF and explicit activation confirmation',async()=>{
  for(const [options,kind] of [[{authenticated:false},'login'],[{used:true},'used'],[{eligible:['supporter']},'ineligible'],[{csrf:''},'unavailable']]){
    const f=fixture(options);let confirms=0;
    const result=await activateSupportTrial({tier:'pro',client:f.client,confirm:()=>{confirms++;return true;}});
    assert.equal(result.kind,kind);assert.equal(confirms,0);assert.equal(posts(f).length,0);
  }
  const f=fixture();assert.equal((await activateSupportTrial({tier:'pro',client:f.client,confirm:()=>false})).kind,'cancelled');assert.equal(posts(f).length,0);
});
test('confirmed trial sends selected tier once through the existing authenticated API',async()=>{
  const f=fixture();let confirmed;
  const result=await activateSupportTrial({tier:'vip',client:f.client,confirm:name=>{confirmed=name;return true;}});
  assert.deepEqual(result,{kind:'active',name:'VIP'});assert.equal(confirmed,'VIP');
  assert.equal(posts(f).length,1);const post=posts(f)[0];
  assert.equal(post.url,'https://auth.asgracing.ru/v1/me/support/trial');
  assert.equal(post.credentials,'include');assert.equal(post.headers['X-CSRF-Token'],'test-csrf');assert.deepEqual(JSON.parse(post.body),{tier:'vip'});
});
test('unknown POST outcome is read back, never retried',async()=>{
  for(const [usedAfterError,kind] of [[true,'used'],[false,'unknown']]){
    const f=fixture({postError:{kind:'timeout'},usedAfterError});
    const result=await activateSupportTrial({tier:'pro',client:f.client,confirm:()=>true});
    assert.equal(result.kind,kind);assert.equal(posts(f).length,1);assert.ok(f.calls.at(-1).url.endsWith('/v1/me/support'));
  }
});
test('conflict and invalid tiers do not replay or create a second trial',async()=>{
  const f=fixture({postError:{status:409}});
  assert.equal((await activateSupportTrial({tier:'pro',client:f.client,confirm:()=>true})).kind,'conflict');assert.equal(posts(f).length,1);
  const invalid=fixture();assert.equal((await activateSupportTrial({tier:'admin',client:invalid.client,confirm:()=>true})).kind,'unavailable');assert.equal(invalid.calls.length,0);
});

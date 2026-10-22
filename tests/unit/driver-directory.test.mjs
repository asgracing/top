import test from 'node:test';
import assert from 'node:assert/strict';
import {loadDriverDirectory} from '../../src/shared/driver-directory.js';
import {resolveBanProfiles} from '../../v2/pages/bans-model.js';

test('compact directory contains exact identity/name without private or rating data', async () => {
  const paths=[];
  const result=await loadDriverDirectory(async path=>{
    paths.push(path);
    return {schema_version:1,total_items:1,items:[{public_id:'drv_01',driver:'Пилот',is_banned:true,player_id:'PRIVATE',elo_history:[1]}]};
  });
  assert.deepEqual(paths,['drivers/search.json']);
  assert.deepEqual(result,[{public_id:'drv_01',driver:'Пилот',is_banned:true}]);
});

test('old publisher fallback is limited to a missing compact file', async () => {
  const paths=[];
  const result=await loadDriverDirectory(async path=>{
    paths.push(path);
    if(path.endsWith('search.json'))throw Object.assign(new Error('missing'),{status:404});
    return [{public_id:'drv_01',driver:'Pilot'}];
  });
  assert.deepEqual(paths,['drivers/search.json','drivers/drivers.json']);
  assert.equal(result[0].driver,'Pilot');
  for(const status of [403,500,undefined]){
    let calls=0;
    await assert.rejects(loadDriverDirectory(async()=>{calls++;throw Object.assign(new Error('failed'),{status});}));
    assert.equal(calls,1);
  }
});

test('malformed directory never falls back to a large inconsistent table', async () => {
  for(const payload of [{schema_version:2,items:[]},{schema_version:1,total_items:1,items:[]},
    {schema_version:1,total_items:2,items:[{public_id:'drv_01',driver:'A',is_banned:false},{public_id:'drv_01',driver:'B',is_banned:true}]}]){
    let calls=0;
    await assert.rejects(loadDriverDirectory(async()=>{calls++;return payload;}));
    assert.equal(calls,1);
  }
});

test('compact directory preserves the banned-only name resolution rule', async()=>{
  const rows=[{public_id:'drv_01',driver:'Same name',is_banned:true},
    {public_id:'drv_02',driver:'Same name',is_banned:false}];
  const compact=await loadDriverDirectory(async()=>({schema_version:1,total_items:rows.length,items:rows}));
  const bans=[{name:'Same name'}];
  assert.deepEqual(resolveBanProfiles(bans,compact),resolveBanProfiles(bans,rows));
  assert.equal(resolveBanProfiles(bans,compact)[0].public_id,'drv_01');
  const ambiguous=[...compact,{public_id:'drv_03',driver:'Same name',is_banned:true}];
  assert.equal(resolveBanProfiles(bans,ambiguous)[0].public_id,null);
});

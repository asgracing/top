import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveBanProfiles,sortBans} from '../../v2/pages/bans-model.js';

test('ban identity uses an explicit public ID or a unique currently banned match',()=>{
 const bans=[{name:' Same Name ',public_id:'drv_explicit'},{name:'Unique'},{name:'Ambiguous'},{name:'Not banned'},{name:'Missing'},{name:'Invalid',public_id:'preview-ban-1'}];
 const drivers=[{driver:'same name',public_id:'drv_other',is_banned:true},{driver:'UNIQUE',public_id:'drv_unique',is_banned:true},{driver:'Unique',public_id:'drv_unique',is_banned:true},{driver:'Ambiguous',public_id:'drv_first',is_banned:true},{driver:'Ambiguous',public_id:'drv_second',is_banned:true},{driver:'Not banned',public_id:'drv_active',is_banned:false}];
 assert.deepEqual(resolveBanProfiles(bans,drivers).map(b=>b.public_id),['drv_explicit','drv_unique',null,null,null,null]);
 assert.equal(bans[1].public_id,undefined,'Resolution does not mutate the published source');
});

test('legacy ban dates are Moscow time and missing dates sort last',()=>{
 const rows=[{name:'invalid',banned_at:'bad'},{name:'UTC',banned_at:'2026-10-06T21:01:00Z'},{name:'legacy',banned_at:'2026-10-07T00:00:00'},{name:'date-only',banned_at:'2026-10-06'}];
 assert.deepEqual(sortBans(rows).map(b=>b.name),['UTC','legacy','date-only','invalid']);
 assert.equal(rows[0].name,'invalid');
});

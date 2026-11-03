import test from 'node:test';
import assert from 'node:assert/strict';
import { managementCommand, filterManagedEntities } from '../../src/pages/portal-ops/portal-clubs-model.js';

const club={entity_type:'club',public_id:'clb_fixture',status:'approved',row_version:3,members:[{public_id:'drv_head',role:'head'},{public_id:'drv_member',role:'member'}]};
test('admin creation chooses a leader and never supplies actor rights',()=>{
  const result=managementCommand({action:'portal.entity.create',entityType:'club',fields:{displayName:'Fixture Club'},leaderId:'drv_head',reason:'Create a community'});
  assert.equal(result.ok,true);assert.equal(result.expectedEntityVersion,0);assert.equal(result.payload.leader_public_id,'drv_head');assert.equal(result.payload.actor,undefined);
  assert.equal(managementCommand({action:'portal.entity.create',entityType:'club',fields:{displayName:'Fixture Club'},reason:'Create a community'}).code,'invalid_member');
});
test('leadership, status and archive preserve management constraints',()=>{
  const base={entity:club,reason:'Audited change'};
  assert.equal(managementCommand({...base,action:'portal.leadership.transfer',memberId:'drv_member'}).ok,true);
  assert.equal(managementCommand({...base,action:'portal.leadership.transfer',memberId:'drv_outsider'}).code,'not_member');
  assert.equal(managementCommand({...base,action:'portal.entity.set_status:suspended'}).payload.status,'suspended');
  assert.equal(managementCommand({...base,action:'portal.entity.set_status:approved'}).code,'invalid_transition');
  assert.equal(managementCommand({...base,entity:{...club,status:'archived'},action:'portal.entity.logo_clear'}).code,'entity_archived');
});
test('management search combines type, state and name',()=>{
  const entries=[{...club,display_name:'Alpha Racing',slug:'alpha',pending_logo:true},{...club,entity_type:'team',public_id:'tm_test',display_name:'Beta Racing',slug:'beta',pending_logo:false}];
  assert.equal(filterManagedEntities(entries,{query:'ALPHA',type:'club',status:'review'}).length,1);
  assert.equal(filterManagedEntities(entries,{type:'team',status:'review'}).length,0);
});

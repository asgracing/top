import test from 'node:test';
import assert from 'node:assert/strict';
import {actionsFor,reportButton} from '../../v2/reports/model.js';
import {normalizeNotifications,notificationTarget} from '../../src/features/auth/personal-notifications.js';
test('report notifications link only to validated case IDs',()=>{
 const id='rpt_'+'a'.repeat(24);
 const n=normalizeNotifications({items:[{id:1,event_type:'report.submitted',details:{report_id:id,url:'javascript:alert(1)',steam_id:'private'}}]}).items[0];
 assert.equal(notificationTarget(n,'drv_target','en'),'/en/reports/?id='+id);
 assert(!JSON.stringify(n).includes('javascript:'));assert(!JSON.stringify(n).includes('private'));
 const invalid=normalizeNotifications({items:[{id:2,event_type:'report.decide',details:{report_id:'../../private'}}]}).items[0];
 assert.equal(notificationTarget(invalid,'drv_target'),'/account/');
});
test('participants cannot judge or review their own case',()=>{
 const c={access:'private',author_id:'drv_author',participants:['drv_author','drv_target'],accused:['drv_target'],status:'submitted'};
 assert(!actionsFor(c,{public_id:'drv_author',judge:true}).includes('claim'));
 assert(actionsFor(c,{public_id:'drv_judge',judge:true}).includes('claim'));
 assert.deepEqual(actionsFor({...c,access:'public'},{public_id:'drv_judge',judge:true}),[]);
 const appealed={...c,status:'appealed',first_judge_id:'drv_judge',assigned_id:null};
 assert(!actionsFor(appealed,{public_id:'drv_judge',judge:true,chief:true}).includes('claim'));
 assert(actionsFor(appealed,{public_id:'drv_chief',judge:true,chief:true}).includes('claim'));
});
test('race report trigger escapes untrusted display attributes',()=>{
 assert(!reportButton({race_id:'"><script>'},{public_id:'drv_target'}).includes('<script>'));
 assert.equal(reportButton({race_id:'race1'},{public_id:'invalid'}),'');
 assert(reportButton({race_id:'race1',source:'hourly'},{public_id:'drv_target'}).includes('data-report-namespace="top"'));
 assert(reportButton({race_id:'race1',_data_namespace:'hourly'},{public_id:'drv_target'}).includes('data-report-namespace="hourly"'));
});

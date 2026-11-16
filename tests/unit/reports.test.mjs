import test from 'node:test';
import assert from 'node:assert/strict';
import {actionsFor,reportButton} from '../../v2/reports/model.js';
import {normalizeNotifications,notificationTarget} from '../../src/features/auth/personal-notifications.js';
import {parseRaceLink,profileId,raceLink,resolveRace,driverLabel} from '../../v2/reports/ux.js';
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
  assert(reportButton({race_id:'race1'},{public_id:'drv_target'}).includes('Подать репорт'));
  assert(!reportButton({race_id:'race1'},{public_id:'drv_target'}).includes('>!</span>'));
});

test('race links preserve archive and published team-race identity',()=>{
 assert.deepEqual(parseRaceLink('https://asgracing.ru/en/race/?id=source&source=season&published=actual'),{race_id:'actual',namespace:'hourly'});
 assert.deepEqual(parseRaceLink(raceLink({race_id:'old',_data_namespace:'season',_published_race:{race_id:'actual'}})),{race_id:'actual',namespace:'hourly'});
 for(const value of ['https://evil.example/race/?id=aa','https://asgracing.ru/races/','https://asgracing.ru@evil.example/race/?id=aa','../private'])assert.throws(()=>parseRaceLink(value));
 assert.equal(profileId('https://asgracing.ru/en/driver/?id=drv_judge'),'drv_judge');
 assert.throws(()=>profileId('https://evil.example/driver/?id=drv_judge'));
});

test('bare-ID resolution refuses ambiguity and service errors',async()=>{
 await assert.rejects(resolveRace('race1',null,async()=>({race_id:'race1'})),/ambiguous_race/);
 await assert.rejects(resolveRace('race1',null,async()=>{throw Error('race_catalog_unavailable');}),/race_catalog_unavailable/);
});

test('pilot choices use numbers from the selected race and preserve duplicate-name identities',()=>{
 const race={drivers:{drv_a:'Same Name',drv_b:'Same Name',drv_c:'No number'},driver_numbers:{drv_a:[72],drv_b:[73,74]}};
 assert.equal(driverLabel(race,'drv_a'),'#72 · Same Name');
 assert.equal(driverLabel(race,'drv_b'),'#73 / #74 · Same Name');
 assert.equal(driverLabel(race,'drv_c'),'#— · No number');
 assert.equal(driverLabel({...race,driver_numbers:{drv_a:[true,-1,1000,'<script>']}},'drv_a'),'#— · Same Name');
});

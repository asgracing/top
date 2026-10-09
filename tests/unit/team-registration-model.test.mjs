import test from 'node:test';
import assert from 'node:assert/strict';
import {entryDraft, validateEntry, entryChanged, activeRegistrations} from '../../hourly/team/model.js';
const team = {team_id:'a',members:[{public_id:'a',eligible:true,race_number:11},{public_id:'b',eligible:true,race_number:22},{public_id:'c',eligible:false,race_number:33}]};
const event = {max_drivers:2,allowed_car_models:[30,32],max_cars:2,max_connections:4,registrations:[]};
const draft = {roster:['a','b'],captain_public_id:'b',car_model:30};
test('new entry requires creator in crew and captain is selected from crew', () => {
  assert.equal(validateEntry(event,team,draft,'a'),null);
  assert.equal(validateEntry(event,team,{...draft,roster:['b']},'a'),'creator_not_in_roster');
  assert.equal(validateEntry(event,team,{...draft,captain_public_id:'c'},'a'),'captain_not_in_roster');
  assert.equal(validateEntry(event,team,{...draft,roster:['b']},'a',{version:1}),null,'creator may leave an existing crew');
});
test('crew, eligibility, allowed car and actual captain number are checked', () => {
  for (const [changes,error] of [[{roster:[]},'invalid_roster'],[{roster:['a','a']},'invalid_roster'],[{roster:['a','b','c']},'invalid_roster'],[{roster:['a','x'],captain_public_id:'a'},'not_team_member'],[{roster:['a','c'],captain_public_id:'a'},'driver_not_eligible'],[{car_model:null},'car_not_allowed'],[{car_model:36},'car_not_allowed']]) assert.equal(validateEntry(event,team,{...draft,...changes},'a'),error);
  for (const race_number of [null,0,999,'22']) assert.equal(validateEntry(event,{...team,members:team.members.map(p=>p.public_id==='b'?{...p,race_number}:p)},draft,'a'),'captain_number_unavailable');
});
test('cross-team duplicate pilot, number, grid and connection limits are explained', () => {
  const other={team_id:'other',race_number:44,roster:[{public_id:'x'},{public_id:'y'}]};
  assert.equal(validateEntry({...event,registrations:[{...other,roster:[{public_id:'b'}]}]},team,draft,'a'),'pilot_already_registered');
  assert.equal(validateEntry({...event,registrations:[{...other,race_number:22}]},team,draft,'a'),'race_number_conflict');
  assert.equal(validateEntry({...event,max_cars:1,registrations:[other]},team,draft,'a'),'grid_full');
  assert.equal(validateEntry({...event,max_connections:3,registrations:[other]},team,draft,'a'),'team_connection_capacity_exceeded');
  assert.equal(validateEntry({...event,max_cars:1,registrations:[{...other,team_id:'a'}]},team,draft,'a',{version:1}),null,'own slot is excluded when editing');
  assert.equal(activeRegistrations({registrations:[{...other,status:'withdrawn'}]}).length,0);
});
test('drafts preserve authoritative version, captain and roster; unchanged save is prevented', () => {
  const reg={car_model:32,captain_public_id:'b',version:3,roster:[{public_id:'b'},{public_id:'a'}]};
  const saved=entryDraft(team,reg,'a'); assert.equal(saved.version,3); assert.equal(saved.captain_public_id,'b');
  assert.equal(entryChanged(saved,reg),false); assert.equal(entryChanged({...saved,car_model:30},reg),true);
  assert.deepEqual(entryDraft(team,null,'a').roster,['a']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {driverSafetyRaces,driverSafetyBreakdown,safetyPeriodRaces,safetyListRaces,srNumber} from '../../v2/driver-safety-model.js';

function record(ledger={},race={}) {
  return driverSafetyRaces({safety_history:[{race_id:'r1',finished_at:'2026-10-19T20:00:00Z',old_sr:9.91,new_sr:9.99,delta_sr:.08,incident_penalty_delta:.1,...ledger}],race_history:[{race_id:'r1',safety_rating_before:9.91,safety_rating_after:9.99,safety_delta:.08,safety_base_delta:.05,safety_incident_penalty_delta:.1,safety_penalty_delta:0,safety_final_delta:.15,...race}]})[0];
}
test('published components remain visible when the ledger caps the gain at 9.99',()=>{
  const r=record(),b=driverSafetyBreakdown(r);
  assert.equal(r.delta,.08);assert.equal(b.clean,.05);assert.equal(b.incidentDelta,.1);assert.equal(b.penaltyDelta,0);
  assert.equal(b.raw,.15);assert.equal(b.computed,.15);assert.equal(b.cap,true);assert.equal(b.stale,false);
});
test('insufficient distance is distinguished from rating caps and neutral races',()=>{
  const b=driverSafetyBreakdown(record({old_sr:9.99,new_sr:9.99,delta_sr:0,incident_penalty_delta:-.05},{safety_delta:0,safety_base_delta:.05,safety_incident_penalty_delta:-.05,safety_final_delta:0,safety_completed_laps:3,safety_leader_laps:12,safety_enough_distance:false}));
  assert.equal(b.enough,false);assert.equal(b.completed,3);assert.equal(b.leader,12);assert.equal(b.cap,false);
});
test('stale protocols cannot replace ledger components or supply explanations',()=>{
  const b=driverSafetyBreakdown(record({old_sr:4,new_sr:3.9,delta_sr:-.1,incident_penalty_delta:-.1},{safety_rating_after:4.2,safety_delta:.2,safety_base_delta:.1,safety_incident_penalty_delta:.1,safety_penalty_delta:0}));
  assert.equal(b.stale,true);assert.equal(b.clean,null);assert.equal(b.incidentDelta,-.1);assert.equal(b.penaltyDelta,null);assert.deepEqual(b.context,{});
});
test('matching fallback can expose pre-cap components only when before/after proves the boundary',()=>{
  const r=record({}, {safety_base_delta:null,safety_penalty_delta:null});
  const b=driverSafetyBreakdown(r,{rating:9.99,delta:.15,clean:.05,incidents:.1,penalties:0});
  assert.equal(b.clean,.05);assert.equal(b.penaltyDelta,0);assert.equal(b.stale,false);
  const bad=driverSafetyBreakdown(r,{rating:9.99,delta:-.5,clean:-.5,incidents:0,penalties:0});
  assert.equal(bad.clean,null);assert.equal(bad.stale,true);
});
test('missing data is not converted to a zero gain',()=>{
  for(const value of [null,undefined,'','  ','bad'])assert.equal(srNumber(value),null);
  assert.equal(srNumber(0),0);
  const b=driverSafetyBreakdown(record({}, {safety_base_delta:null,safety_penalty_delta:null}));
  assert.equal(b.clean,null);assert.equal(b.penaltyDelta,null);assert.equal(b.missing,true);assert.equal(b.raw,null);
});
test('periods use actual dates; filters preserve the source and newest-first ordering',()=>{
  const rows=[{key:'old',finishedAt:'2026-08-01',delta:1},{key:'gain',finishedAt:'2026-10-28',delta:.1},{key:'loss',finishedAt:'2026-10-29',delta:-.1},{key:'zero',finishedAt:'2026-10-30',delta:0}];
  const copy=structuredClone(rows),now=Date.parse('2026-10-31T12:00:00Z');
  const recent=safetyPeriodRaces(rows,'7',now);
  assert.deepEqual(recent.map(r=>r.key),['gain','loss','zero']);
  assert.deepEqual(safetyListRaces(recent,'all').map(r=>r.key),['zero','loss','gain']);
  assert.deepEqual(safetyListRaces(recent,'loss').map(r=>r.key),['loss']);
  assert.deepEqual(safetyListRaces(recent,'zero').map(r=>r.key),['zero']);
  assert.deepEqual(rows,copy);
});
test('empty or missing history stays empty, without inventing SR races',()=>{
  assert.deepEqual(driverSafetyRaces({race_history:[{race_id:'r1',safety_delta:.1}]}),[]);
  assert.deepEqual(driverSafetyRaces(null),[]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {eventKind,normalizeTablePage,normalizeSafetyRow,paginationPages} from '../../v2/models.js';
test('Hourly championship metadata does not turn a standalone race into a championship',()=>{
  const event={event_type:'hourly',race_format:'hourly',competition_mode:'standalone',championship_slug:'october-2026'};
  assert.equal(eventKind(event),'hourly');assert.equal(eventKind(event,true),'mono');
  assert.equal(eventKind({...event,competition_mode:'championship'},true),'championship');
  assert.equal(eventKind({...event,race_format:'endurance'},true),'endurance');
});
test('Pagination keeps canonical camel-case totals and accepts API snake-case totals',()=>{
  assert.equal(normalizeTablePage({items:Array(10).fill({}),totalItems:33314}).total_items,33314);
  assert.equal(normalizeTablePage({items:[],total_items:0}).total_items,0);
  assert.equal(normalizeTablePage({items:[{}],total_items:21,totalItems:30}).total_items,21);
});
test('Safety counters survive both published row schemas, including actual zeroes',()=>{
  const full=normalizeSafetyRow({public_id:'driver',safety_races:17,safety_total_laps:220,safety_total_invalid_laps:31,safety_total_counted_penalties:4,safety_total_incident_points:12,active_strikes:2});
  assert.equal(full.public_id,'driver');
  assert.deepEqual([full.active_strikes,full.races_count,full.total_laps,full.total_invalid_laps,full.total_counted_penalties,full.total_incident_points],[2,17,220,31,4,12]);
  const preview=normalizeSafetyRow({...full,strikes:{active:0},races_count:0,total_laps:0,total_invalid_laps:0,total_counted_penalties:0,total_incident_points:0});
  assert.deepEqual([preview.active_strikes,preview.races_count,preview.total_laps,preview.total_invalid_laps,preview.total_counted_penalties,preview.total_incident_points],[0,0,0,0,0,0]);
  assert.equal(normalizeSafetyRow({}).total_laps,null,'Missing data is not an invented zero');
});
test('Rating page navigation keeps current and boundary pages available in long lists',()=>{
  assert.deepEqual(paginationPages(1,0),[1]);assert.deepEqual(paginationPages(3,5),[1,2,3,4,5]);
  for(const current of [1,2,1500,3332]){
    const pages=paginationPages(current,3332),numbers=pages.filter(p=>p!==null);
    assert.equal(numbers[0],1);assert.equal(numbers.at(-1),3332);assert.ok(numbers.includes(current));assert.ok(pages.length<=7);
    assert.equal(new Set(numbers).size,numbers.length);
  }
});

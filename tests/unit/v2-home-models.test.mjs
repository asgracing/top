import test from 'node:test';
import assert from 'node:assert/strict';
import {eventKind,normalizeTablePage} from '../../v2/models.js';
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

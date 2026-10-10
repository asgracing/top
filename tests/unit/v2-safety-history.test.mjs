import test from 'node:test';
import assert from 'node:assert/strict';
import {safetyHistoryComponents} from '../../v2/safety-history.js';

test('ledger incident delta wins over a stale race report', () => {
  assert.deepEqual(safetyHistoryComponents({new_sr:2.12,delta_sr:.08,incident_penalty_delta:.1},
    {rating:2.02,delta:-.02,clean:-.02,incidents:0,penalties:0}),
  {clean:null,incidents:.1,penalties:null,stale:true});
});

test('matching protocol supplies the missing components before the SR cap', () => {
  assert.deepEqual(safetyHistoryComponents({new_sr:9.99,delta_sr:0,incident_penalty_delta:.1},
    {rating:9.99,delta:0,clean:.05,incidents:.1,penalties:-.02}),
  {clean:.05,incidents:.1,penalties:-.02,stale:false});
});

test('a conflicting component rejects the protocol even when totals match', () => {
  assert.deepEqual(safetyHistoryComponents({new_sr:5,delta_sr:0,incident_penalty_delta:-.1},
    {rating:5,delta:0,clean:0,incidents:0,penalties:0}),
  {clean:null,incidents:-.1,penalties:null,stale:true});
});

test('zero is a ledger value and missing values stay unavailable', () => {
  assert.deepEqual(safetyHistoryComponents({incident_penalty_delta:0}),
    {clean:null,incidents:0,penalties:null,stale:false});
  assert.deepEqual(safetyHistoryComponents({incident_penalty_delta:'',base_delta:null,penalty_delta:'bad'}),
    {clean:null,incidents:null,penalties:null,stale:false});
});

test('older history without components can use published race details', () => {
  assert.deepEqual(safetyHistoryComponents({new_sr:5,delta_sr:-.25},
    {rating:5,delta:-.25,clean:.05,incidents:-.1,penalties:-.2}),
  {clean:.05,incidents:-.1,penalties:-.2,stale:false});
});

test('cleanliness and automatic penalties also identify a stale protocol', () => {
  assert.deepEqual(safetyHistoryComponents({new_sr:9.99,delta_sr:0,base_delta:.05},
    {rating:9.99,delta:0,clean:.1,incidents:.1,penalties:0}),
  {clean:.05,incidents:null,penalties:null,stale:true});
  assert.deepEqual(safetyHistoryComponents({new_sr:5,delta_sr:0,penalty_delta:-.2},
    {rating:5,delta:0,clean:0,incidents:0,penalties:0}),
  {clean:null,incidents:null,penalties:-.2,stale:true});
});

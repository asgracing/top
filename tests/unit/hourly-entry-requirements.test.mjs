import test from 'node:test';
import assert from 'node:assert/strict';
import {hourlySrRequirement} from '../../src/features/hourly/entry-requirements.js';

test('Hourly advertises at least ASG SR 3.3, including old and incomplete data',()=>{
  for(const value of [undefined,null,'',false,true,-1,0,2.5,'2.50','invalid',Infinity,NaN,11]) {
    assert.equal(hourlySrRequirement({server:{sr_requirement:value}}),3.3,String(value));
  }
  assert.equal(hourlySrRequirement(null),3.3);
  assert.equal(hourlySrRequirement({admission_ready:false}),3.3,'Offline readiness does not erase scheduled admission rules');
});

test('Explicit ASG SR fields work for event and live server payloads',()=>{
  for(const key of ['sr_requirement','internal_sr_requirement','safety_rating_asg_requirement','asg_sr_requirement']) {
    assert.equal(hourlySrRequirement({[key]:'3.3'}),3.3);
    assert.equal(hourlySrRequirement({server:{[key]:4.1}}),4.1,'A stricter event remains stricter');
  }
});

test('ACC SA and Racecraft never substitute for ASG SR',()=>{
  assert.equal(hourlySrRequirement({server:{safety_rating_requirement:50,racecraft_rating_requirement:2.5}}),3.3);
  assert.equal(hourlySrRequirement({server:{safety_rating_requirement:70,racecraft_rating_requirement:80}}),3.3);
});

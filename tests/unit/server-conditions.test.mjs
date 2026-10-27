import {test} from 'node:test';
import assert from 'node:assert/strict';
import {serverConditions} from '../../src/features/server-status/conditions.js';

const now=Date.parse('2026-10-27T12:00:00Z');
const server={server_online:true,status:'online',telemetry_state:'live',source:'acc-local-telemetry',roster_complete:true,
  observed_at:'2026-10-27T12:00:00Z',conditions_observed_at:'2026-10-27T12:00:00Z',game_time_observed_at:'2026-10-27T12:00:00Z',
  air_temperature_c:27.3,track_temperature_c:30,rain_intensity:.1,game_time_seconds:50400};

test('fresh conditions and game clock',()=>{
  assert.deepEqual(serverConditions(server,now),{air:'27°',track:'30°',rain:'10%',time:'14:00'});
  assert.equal(serverConditions({...server,rain_intensity:0},now).rain,'0%');
  assert.equal(serverConditions({...server,rain_intensity:.001},now).rain,'<1%');
  assert.equal(serverConditions({...server,game_time_seconds:86399},now).time,'23:59');
});
test('unknown and stale values are never rendered as zero',()=>{
  assert.deepEqual(serverConditions(server,now+16000),{air:'—',track:'—',rain:'—',time:'—'});
  assert.equal(serverConditions({...server,rain_intensity:null},now).rain,'—');
  assert.equal(serverConditions({...server,server_online:false},now).time,'—');
  assert.equal(serverConditions({...server,conditions_observed_at:null},now).air,'—');
  assert.equal(serverConditions({...server,air_temperature_c:-4},now).air,'-4°');
});

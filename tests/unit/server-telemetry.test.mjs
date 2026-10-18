import test from 'node:test';
import assert from 'node:assert/strict';
import {telemetrySessionLabel, formatTelemetryLap, loadPreferredServerStatus, sessionBestLapMs, lapHighlight} from '../../src/features/server-status/telemetry.js';
import {isInstanceStatusStale, isServerStatusStale} from '../../src/features/server-status/freshness.js';
import {serverSessionLabel} from '../../v2/server-session.js';

const now = Date.parse('2026-10-18T12:00:00Z');
const row = () => ({source:'acc-local-telemetry', telemetry_state:'live', status:'online', roster_complete:true,
  observed_at:new Date(now-60000).toISOString(), source_age_ms:0,
  session:{type:'Race', phase:'session', remaining_ms:120000, timer_meaning:'session_countdown'}});

test('telemetry countdown advances from source time, clamps at zero and never predicts a new session', () => {
  assert.equal(telemetrySessionLabel(row(), {now}), 'R 1:00');
  assert.equal(telemetrySessionLabel(row(), {now:now+61000,lang:'en',compact:false}), 'Race 0:00');
  assert.equal(telemetrySessionLabel({...row(),session:{type:'Race',phase:'formation',remaining_ms:120000}}, {now}), 'R · Формирование');
  assert.equal(telemetrySessionLabel({...row(),session:{type:'Qualifying',phase:'overtime'}}, {now,lang:'en'}), 'Q · Finishing');
  assert.equal(telemetrySessionLabel({...row(),session:{type:'Practice',phase:'session',remaining_unlimited:true}}, {now}), 'P ∞');
});

test('telemetry freshness does not require a spectator and does not refresh old source timestamps', () => {
  assert.equal(isInstanceStatusStale({...row(),bot_connected:false},now), false);
  assert.equal(isInstanceStatusStale({...row(),source_age_ms:6000},now), true);
  assert.equal(isInstanceStatusStale(row(),now+121000), true);
  assert.equal(telemetrySessionLabel(row(), {now:now+121000}), '—');
  assert.equal(isServerStatusStale({source:'asg-live-telemetry-status',updated_at:new Date(now-181000).toISOString()},now), true);
  assert.equal(isInstanceStatusStale({...row(),observed_at:new Date(now+31000).toISOString()},now), true);
  assert.equal(isInstanceStatusStale({...row(),status:'offline',telemetry_state:'offline',roster_complete:false},now), false);
});

test('lap times are nullable and precise to milliseconds', () => {
  assert.equal(formatTelemetryLap(115132), '1:55.132');
  for(const value of [null,0,-1,Infinity,2147483647,4294967295,'115132'])assert.equal(formatTelemetryLap(value), '—');
});

test('lap colors distinguish session records, personal bests, ties and missing times', () => {
  const source='acc-local-telemetry';
  const best=sessionBestLapMs({source,drivers:[{best_lap_ms:110123},{best_lap_ms:111000},{best_lap_ms:null},{best_lap_ms:0}]});
  assert.equal(best,110123);
  assert.deepEqual(lapHighlight({best_lap_ms:110123,last_lap_ms:110123},best),{best:'session-best',last:'session-best'});
  assert.deepEqual(lapHighlight({best_lap_ms:111000,last_lap_ms:111000},best),{best:'personal-best',last:'personal-best'});
  assert.deepEqual(lapHighlight({best_lap_ms:111000,last_lap_ms:112000},best),{best:'personal-best',last:'normal'});
  assert.deepEqual(lapHighlight({best_lap_ms:110123,last_lap_ms:112000},best),{best:'session-best',last:'normal'});
  assert.deepEqual(lapHighlight({best_lap_ms:null,last_lap_ms:null},null),{best:'missing',last:'missing'});
  assert.equal(sessionBestLapMs({source,drivers:[{best_lap_ms:110123}],classification:[{connected:false,best_lap_ms:109999}]}),109999);
  assert.equal(sessionBestLapMs({source,drivers:[{best_lap_ms:Infinity},{best_lap_ms:2147483647}]}),null);
  assert.equal(sessionBestLapMs({source:'legacy-online-status',drivers:[{best_lap_ms:110123}]}),null);
});

test('new source wins even when stale; missing new file falls back before rollout', async () => {
  const live={schema_version:3,source:'asg-live-telemetry-status',servers:{},updated_at:'2020-01-01T00:00:00Z'};
  const legacy={schema_version:2};
  const calls=[];
  assert.equal(await loadPreferredServerStatus('live','legacy',async url=>{calls.push(url);return url==='live'?live:legacy}), live);
  assert.deepEqual(calls,['live']);
  assert.equal(await loadPreferredServerStatus('live','legacy',async url=>{if(url==='live')throw Error('404');return legacy}), legacy);
});

test('V2 labels consume the same telemetry clock and retain legacy minute semantics', () => {
  const en=key=>({race:'Race',qualifying:'Qualifying',practice:'Practice',waiting:'Waiting',minute:'min'}[key]);
  const current={...row(),observed_at:new Date().toISOString()};
  assert.match(serverSessionLabel({online:true,server:current},en), /^Race 1:5\d|^Race 2:00/);
  assert.equal(serverSessionLabel({online:true,server:{session_type:'Qualifying',session_remaining_minutes:10}},en), 'Qualifying (10 min)');
});

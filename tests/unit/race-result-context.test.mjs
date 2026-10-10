import assert from 'node:assert/strict';
import test from 'node:test';
import {mergeResultContext, renderRaceConditions, renderResultTabs} from '../../src/shared/race-result-context.js';
const label = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const api = {tx:(ru,en)=>en,label,pageDriver:r=>`<a href="/driver/?id=${label(r.public_id)}">${label(r.driver)}</a>`,raceRating:(r,k)=>`${k}:${r[k==='elo'?'elo':'safety_rating']??'—'}`};
test('qualifying uses historical race ratings, including zero SR, and retains Q-only participants',()=>{
  const race={results:[{public_id:'drv_one',elo:1234,safety_rating:0}],qualifying:{status:'available',results:[{public_id:'drv_one'},{public_id:'drv_qonly'}]}};
  const q=mergeResultContext(race).qualifying.results;
  assert.equal(q[0].elo,1234);assert.equal(q[0].safety_rating,0);assert.equal(q[1].elo,undefined);
});
test('tabs keep the race protocol, escape Q names and expose the required five columns',()=>{
  const html=renderResultTabs({qualifying:{status:'available',results:[{position:1,driver:'<script>',public_id:'drv_one',best_lap:'1:30.123',race_number:25}]}},'<b>Original race</b>',api);
  assert.match(html,/Original race/);assert.match(html,/Qualifying lap/);assert.match(html,/1:30.123/);assert.match(html,/&lt;script>/);assert.match(html,/role="tabpanel"[^>]*data-result-panel="qualifying" hidden/);
});
test('old and ambiguous payloads keep accessible unavailable states',()=>{
  assert.match(renderResultTabs({},'race',api),/Qualifying data is unavailable/);
  assert.match(renderResultTabs({qualifying:{status:'ambiguous'}},'race',api),/could not be verified/);
});
test('conditions keep zero values, game time, temperatures and their origin',()=>{
  const html=renderRaceConditions({race_conditions:{game_time:{hour_of_day:16,time_multiplier:0},ambient_temp_c:0,track_temp_c:31,rain:0,cloud_level:0,weather_randomness:2,evidence:{rain:{basis:'configured'}}}},api);
  for(const value of ['16:00','Air 0 °C','Track 31 °C','Rain 0%','Cloud cover 0%','Saved launch settings','×0 time'])assert.ok(html.includes(value));
  assert.match(renderRaceConditions({},api),/Conditions unavailable/);
});

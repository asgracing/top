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
test('tabs keep the race protocol, escape Q names and expose seven columns with Q car and gap',()=>{
  const html=renderResultTabs({qualifying:{status:'available',results:[{position:1,driver:'<script>',public_id:'drv_one',best_lap:'1:30.123',race_number:25,car_name:'Ferrari <296>',gap_ms:1377}]}},'<b>Original race</b>',api);
  assert.match(html,/Original race/);assert.match(html,/Qualifying lap/);assert.match(html,/1:30.123/);assert.match(html,/&lt;script>/);assert.match(html,/role="tabpanel"[^>]*data-result-panel="qualifying" hidden/);
  assert.equal((html.match(/<th>/g)||[]).length,7);assert.match(html,/Ferrari &lt;296>/);assert.match(html,/\+1\.377/);
});
test('qualifying renders historical badges without either delta, leaving Q-only ratings absent',()=>{
  const seen=[];
  const renderer={...api,raceRating:(row,kind)=>{seen.push([kind,row]);return kind;}};
  const html=renderResultTabs({results:[{public_id:'drv_one',elo:1234,safety_rating_after:0,safety_delta:.25}],qualifying:{status:'available',results:[
    {public_id:'drv_one',elo_rating_delta:20,safety_delta:.25,gap_ms:0},
    {public_id:'drv_qonly',gap_ms:null}
  ]}},'race',renderer);
  assert.equal(seen.length,2);assert.equal(seen[0][1].elo,1234);assert.equal(seen[1][1].safety_rating_after,0);
  for(const [,row] of seen){assert.equal(row.elo_rating_delta,null);assert.equal(row.safety_delta,null);}
  assert.match(html,/\+0\.000/);assert.doesNotMatch(html,/\+0\.25/);
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

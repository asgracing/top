import test from 'node:test';
import assert from 'node:assert/strict';
import {createTeamRacingClient,teamRegistrationOpen,teamRaceUrl} from '../../src/shared/team-racing-client.js';
import {renderTeamResults,teamSeasonStandings} from '../../src/shared/team-racing-results-view.js';

test('all changes close at the exact hour-before-opening boundary',()=>{
 const event={participation_mode:'team',occurrence_id:'a&b',closes_at:'2099-10-10T15:00:00Z'};
 const time=Date.parse(event.closes_at);
 assert.equal(teamRegistrationOpen(event,time-1),true);assert.equal(teamRegistrationOpen(event,time),false);
 assert.equal(teamRegistrationOpen({...event,registration_closed:true},time-1),false);
 assert.equal(teamRaceUrl(event,'en'),'/hourly/team/?event=a%26b&lang=en');
});
test('mutations carry CSRF and version, without caller-controlled identity',async()=>{
 let captured;
 const client=createTeamRacingClient({base:'https://auth.example',fetchImpl:async(url,options)=>{captured={url,options};return {ok:true,json:async()=>({command:{command_id:'id'}})}}});
 await client.mutate('register',{team_id:'tm_a'},null,'csrf','idempotency');
 assert.equal(captured.options.credentials,'include');assert.equal(captured.options.headers['X-CSRF-Token'],'csrf');
 assert.deepEqual(JSON.parse(captured.options.body),{action:'register',payload:{team_id:'tm_a'},expected_version:null,idempotency_key:'idempotency'});
});
test('team classification escapes names and displays personal awards within crew',()=>{
 const html=renderTeamResults({team_results:[{position:1,team_name:'<img src=x>',points:25,drivers:[{public_id:'drv_a',personal_result:{driver:'A<script>',points:25,elo_rating_delta:10,safety_rating:4.1}}]}]},'ru');
 assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('Очки команды'));assert.ok(html.includes('ΔElo 10'));
});
test('season standings use one car award and replace an earlier occurrence',()=>{
 const race=points=>({participation_mode:'team',occurrence_id:'one',event_id:'race1',team_results:[{team_id:'tm_a',team_name:'A',points,position:1,status:'classified',drivers:[{public_id:'a'},{public_id:'b'}]}]});
 const standings=teamSeasonStandings([race(25),race(20)]);
 assert.equal(standings.length,1);assert.equal(standings[0].points,20);assert.equal(standings[0].races,1);
});

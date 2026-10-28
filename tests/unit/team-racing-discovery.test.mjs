import test from 'node:test';
import assert from 'node:assert/strict';
import {upcomingTeamRace, renderTeamRaceSpotlight, teamEntryLabel} from '../../src/shared/team-racing-discovery.js';
import {eventKind} from '../../v2/models.js';

const now = Date.parse('2099-10-28T15:00:00Z');
const team = {occurrence_id:'team&one',participation_mode:'team',track_name:'Spa <script>',date:'2099-10-28',start_time_local:'20:00',timezone:'UTC+3',launch_at:'2099-10-28T16:50:00Z',registration_closes_at:'2099-10-28T16:40:00Z'};
test('team race is discoverable beyond the first three ordinary events and sorted by start',()=>{
  const rows=[...Array.from({length:4},(_,i)=>({...team,participation_mode:'individual',occurrence_id:String(i)})),{...team,date:'2099-10-29'},team];
  assert.equal(upcomingTeamRace(rows,now),team);
  assert.equal(upcomingTeamRace([null,{...team,status:'cancelled'},{...team,date:'2099-10-27'}],now),null);
  assert.equal(upcomingTeamRace(null,now),null);
});
test('team presentation takes precedence while retaining other formats for ordinary races',()=>{
  for(const format of ['hourly','endurance'])for(const competition of ['standalone','championship']){
    assert.equal(eventKind({...team,race_format:format,competition_mode:competition},true),'team');
  }
  assert.equal(eventKind({race_format:'endurance'}),'endurance');
  assert.equal(eventKind({},true),'mono');
});
test('spotlight escapes published text and links directly to this event in both languages',()=>{
  for(const language of ['ru','en']){
    const html=renderTeamRaceSpotlight([team],language,now);
    assert.match(html,/Spa &lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
    assert.match(html,new RegExp('event=team%26one&amp;lang='+language));
    assert.match(html,/10/);assert.match(html,/16:40|19:40/);
    assert.match(html,language==='ru'?/Зарегистрировать команду/:/Register a team/);
  }
});
test('at the cutoff links lead to crews and never promise an open registration',()=>{
  const boundary=Date.parse(team.registration_closes_at);
  assert.equal(teamEntryLabel(team,'en',boundary-1),'Register a team');
  assert.equal(teamEntryLabel(team,'en',boundary),'View crews');
  assert.match(renderTeamRaceSpotlight([team],'ru',boundary),/Регистрация закрыта/);
  assert.equal(teamEntryLabel({...team,registration_closed:true},'en',now),'View crews');
});

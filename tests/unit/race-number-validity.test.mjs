import test from 'node:test';
import assert from 'node:assert/strict';
import {renderRaceNumberValidity} from '../../src/shared/race-number-validity.js';

const now=Date.parse('2026-10-31T00:00:00+03:00'),day=86400000;
const prefs=expires=>({raceNumber:77,expiresAt:new Date(expires).toISOString()});

test('reservation uses Moscow time and counts sixty days from the supplied deadline',()=>{
  const html=renderRaceNumberValidity(prefs(now+60*day),'ru',now);
  assert.match(html,/data-number-validity="active"/);assert.match(html,/30\.12\.2026, 00:00 МСК/);
  assert.match(html,/60 дней/);assert.match(html,/#77/);
  assert.match(renderRaceNumberValidity(prefs(now+day),'en',now),/Time remaining: 1 day/);
});
test('the last three full days are highlighted and partial days round upwards',()=>{
  assert.match(renderRaceNumberValidity(prefs(now+3*day),'ru',now),/data-number-validity="warning"/);
  assert.match(renderRaceNumberValidity(prefs(now+3*day),'ru',now),/3 дня/);
  const outside=renderRaceNumberValidity(prefs(now+3*day+1),'ru',now);
  assert.match(outside,/data-number-validity="active"/);assert.match(outside,/4 дня/);
});
test('an overdue reservation awaits the server check instead of claiming release',()=>{
  const html=renderRaceNumberValidity(prefs(now),'en',now);
  assert.match(html,/data-number-validity="pending"/);assert.match(html,/Awaiting the expiry check/);
  assert.doesNotMatch(html,/Time remaining:/);
});
test('missing or malformed activity dates are not replaced with an invented countdown',()=>{
  for(const expiresAt of [null,undefined,'invalid','<img src=x onerror=alert(1)>']){
    const html=renderRaceNumberValidity({raceNumber:77,expiresAt},'ru',now);
    assert.match(html,/Срок закрепления уточняется/);assert.doesNotMatch(html,/<time|<img|До освобождения/);
  }
});
test('no assigned number means no reservation information',()=>{
  for(const raceNumber of [null,undefined,0,1000,'77',true])
    assert.equal(renderRaceNumberValidity({raceNumber,expiresAt:prefs(now+day).expiresAt},'ru',now),'');
});
test('administrators see an indefinite private reservation without a countdown',()=>{
  for(const lang of ['ru','en']){
    const html=renderRaceNumberValidity({raceNumber:77,permanent:true,expiresAt:prefs(now).expiresAt},lang,now);
    assert.match(html,/data-number-validity="permanent"/);
    assert.match(html,lang==='ru'?/Закреплён бессрочно/:/Reserved indefinitely/);
    assert.match(html,lang==='ru'?/Пока вы в списке администраторов/:/While on the ASG administrator list/);
    assert.doesNotMatch(html,/<time|До освобождения|Time remaining|уточняется/);
  }
});

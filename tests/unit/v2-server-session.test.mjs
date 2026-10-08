import assert from 'node:assert/strict';
import {test} from 'node:test';
import {serverSessionLabel} from '../../v2/server-session.js';
const ru=key=>({practice:'Практика',qualifying:'Квалификация',race:'Гонка',waiting:'Ожидание',minute:'мин'}[key]);
const en=key=>({practice:'Practice',qualifying:'Qualifying',race:'Race',waiting:'Waiting',minute:'min'}[key]);
test('Published session minutes are shared by full and compact RU/EN labels',()=>{
  const s={online:true,server:{session_type:'Qualifying',session_remaining_minutes:10}};
  assert.equal(serverSessionLabel(s,ru),'Квалификация (10 мин)');
  assert.equal(serverSessionLabel(s,en,{compact:true}),'Q (10 min)');
  assert.equal(serverSessionLabel({online:true,server:{session_type:'Race',remaining_minutes:0}},ru),'Гонка (0 мин)');
  assert.equal(serverSessionLabel({online:true,session:'P 17',server:{}},en),'Practice (17 min)');
});
test('Missing or invalid times never become a fabricated zero; offline ignores saved times',()=>{
  for(const time of [undefined,null,'',-1,'NaN'])assert.equal(serverSessionLabel({online:true,server:{session_type:'Race',session_remaining_minutes:time}},ru),'Гонка');
  assert.equal(serverSessionLabel({online:false,server:{session_type:'Race',session_remaining_minutes:20}},ru),'Ожидание');
});

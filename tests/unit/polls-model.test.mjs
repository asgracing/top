import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pollStatus,pollPercent,pollColor,normalizePoll,validatePollDraft,moscowInputToISO,POLL_COLORS} from '../../v2/pages/polls-model.js';
import {createPollsAPI} from '../../v2/pages/polls-api.js';
const poll = {id:'p1',title:'Next track?',description:'',mode:'multiple',max_choices:2,status:'active',revision:3,participants:100,starts_at:'2026-01-01T00:00:00Z',ends_at:'2026-01-04T00:00:00Z',options:[{id:'a',label:'Spa',count:60},{id:'b',label:'Monza',count:75}]};
test('percentages use participants, including approval sums greater than 100%',()=>{
  assert.equal(pollPercent(60,100),60);assert.equal(pollPercent(75,100),75);assert.equal(pollPercent(0,0),0);
  assert.equal(pollPercent(60,100)+pollPercent(75,100),135);
});
test('deadline and start are enforced in presentation; final states do not reopen',()=>{
  assert.equal(pollStatus(poll,Date.parse(poll.ends_at)),'closed');
  assert.equal(pollStatus({...poll,status:'scheduled'},Date.parse(poll.starts_at)),'active');
  assert.equal(pollStatus(poll,Date.parse(poll.starts_at)-1),'scheduled');
  assert.equal(pollStatus({...poll,status:'cancelled'},Date.parse(poll.starts_at)),'cancelled');
});
test('API results reject inconsistent totals, repeated options and invalid limits',()=>{
  assert.equal(normalizePoll(poll).options.length,2);
  assert.throws(()=>normalizePoll({...poll,participants:0}));
  assert.throws(()=>normalizePoll({...poll,options:[poll.options[0],poll.options[0]]}));
  assert.throws(()=>normalizePoll({...poll,max_choices:3}));
  assert.throws(()=>normalizePoll({...poll,mode:'single'}));
  assert.throws(()=>normalizePoll({...poll,ends_at:'invalid'}));
});
test('only bounded palette values can become CSS colors',()=>{
  assert.equal(pollColor({color:'url(https://invalid)'},0),POLL_COLORS[0]);
  assert.equal(pollColor({color:POLL_COLORS[3]},0),POLL_COLORS[3]);
});
test('draft checks cover duplicate answers and max selection; dates use Moscow regardless of browser zone',()=>{
  const draft={title:'Track?',description:'',options:['Spa','Monza'],mode:'single',max_choices:1,duration_hours:72};
  assert.equal(validatePollDraft(draft),null);
  assert.equal(validatePollDraft({...draft,options:[' Spa','spa ']}),'options');
  assert.equal(validatePollDraft({...draft,max_choices:2}),'choices');
  assert.equal(validatePollDraft({...draft,duration_hours:0}),'duration');
  assert.equal(moscowInputToISO('2026-11-27T20:00'),'2026-11-27T17:00:00.000Z');
  assert.equal(moscowInputToISO(''),null);
});
test('vote requests use credentials, CSRF and whole ballot replacement; no voter ID is supplied',async()=>{
  const requests=[];
  const api=createPollsAPI({fetchRef:async(url,options)=>{requests.push({url,options});return new Response(JSON.stringify({ok:true}));}});
  await api.vote('p/1',['a','b'],7,'csrf-test');
  const {url,options}=requests[0];assert.ok(url.endsWith('/v1/polls/p%2F1/ballot'));
  assert.equal(options.method,'PUT');assert.equal(options.credentials,'include');assert.equal(options.cache,'no-store');
  assert.equal(options.headers['X-CSRF-Token'],'csrf-test');assert.deepEqual(JSON.parse(options.body),{choices:['a','b'],revision:7});
});
test('mutations do not automatically retry an uncertain request',async()=>{
  let calls=0;const api=createPollsAPI({fetchRef:async()=>{calls++;throw new TypeError('lost response');}});
  await assert.rejects(api.action('p1','close',3,'csrf'));assert.equal(calls,1);
});

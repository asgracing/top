import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareNews,editorialHref,editorialImage} from '../../v2/pages/editorial-model.js';
import {communityVoterId,createCommunityClient} from '../../v2/pages/community-client.js';
const now=Date.parse('2026-10-07T12:00:00+03:00');
const route=(name,id)=>`/v2/en/${name==='article'?'news/article/':name==='home'?'':name+'/'}${id?'?slug='+id:''}`;

test('published news preserve priority, dates, language blocks and safe assets',()=>{
 const rows=[null,{id:'future',title:'Future',published_at:'2026-10-08'}, {id:'expired',title:'Expired',expires_at:'2026-10-06'},
 {id:'legacy',title:'Русский / English',published_at:'2026-10-07T11:00:00',summary_en:'Explicit summary',body:['РУССКИЙ','Русский','ENGLISH','English',{type:'list',items:['RU: ru','EN: en']},{type:'link',label:{en:'Join',ru:'Старт'},href:'/hourly/'}],thumbnail_url:'images/sr2/sr2.png'},
 {id:'priority',title:{en:'Priority'},priority:10,published_at:'2026-10-01'}, {id:'pinned',title:'Pinned',is_pinned:true,published_at:'2026-09-01'}];
 const result=prepareNews({items:rows},'en',now);assert.deepEqual(result.map(n=>n.id),['pinned','priority','legacy']);
 assert.equal(result[2].title,'English');assert.equal(result[2].summary,'Explicit summary');assert.deepEqual(result[2].body,['English',{type:'list',items:['en']},{type:'link',label:'Join',href:'/hourly/'}]);
 assert.equal(result[2].thumbnail_url,'/news-content/images/sr2/sr2.png');
 assert.equal(prepareNews({items:[{id:'localized',title_en:'Title',body:{en:['English'],ru:['Русский']}}]},'en',now)[0].body[0],'English');
});
test('editorial links preserve queries and map articles without accepting script URLs',()=>{
 assert.equal(editorialHref('/ru/news/?slug=hello#body','en',route),'/v2/en/news/article/?slug=hello#body');
 assert.equal(editorialHref('/#rules','en',route),'/v2/en/#rules');
 assert.equal(editorialHref('/hourly/championship/?slug=june-2026','en',route),'/v2/en/hourly/championship/?slug=june-2026');
 assert.equal(editorialHref('javascript:alert(1)','en',route),null);assert.equal(editorialImage('https://untrusted.invalid/a.png'),'');
});
function memory(initial={}){const values=new Map(Object.entries(initial));return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};}
test('community identity preserves V1 TTL and migrates legacy IDs',()=>{
 const legacy=memory({communityLikeVoterId:'legacy-id'});assert.equal(communityVoterId(legacy,now),'legacy-id');assert.equal(JSON.parse(legacy.getItem('communityLikeVoterId')).expiresAt,now+365*86400000);
 const expired=memory({communityLikeVoterId:JSON.stringify({value:'expired',expiresAt:now-1})});assert.notEqual(communityVoterId(expired,now,()=>.5),'expired');
 assert.equal(communityVoterId(expired,now+1),JSON.parse(expired.getItem('communityLikeVoterId')).value);
 assert.match(communityVoterId(null,now),/^browser-/);
});
test('community likes use the existing one-way API and do not invent success on failure',async()=>{
 const calls=[];let failed=false;
 const client=createCommunityClient({base:'https://community-likes.asgracing.workers.dev',storage:memory({communityLikeVoterId:'known-v1'}),fetchImpl:async(url,options)=>{
  calls.push({url:String(url),options});return {ok:!failed,json:async()=>options.method==='POST'?{likes:8,already_liked:true}:{items:{post:{likes:7,already_liked:false}}}};
 }});
 await client.load(['post']);assert.equal(client.states.post.likes,7);assert.match(calls[0].url,/voter_id=known-v1/);
 const pending=client.like('post');assert.equal(client.states.post.loading,true);await client.like('post');await pending;
 assert.equal(client.states.post.already_liked,true);assert.equal(calls.length,2);assert.deepEqual(JSON.parse(calls[1].options.body),{post_id:'post',voter_id:'known-v1'});
 await client.like('post');assert.equal(calls.length,2);
 failed=true;await client.load(['other']);assert.equal(client.states.other.failed,true);assert.equal(client.states.other.likes,undefined);
 await client.like('other');assert.equal(client.states.other.failed,true);assert.notEqual(client.states.other.already_liked,true);
});
test('local read-only preview never submits a community reaction',async()=>{
 const methods=[];
 const client=createCommunityClient({base:'https://community-likes.asgracing.workers.dev',readonly:true,storage:memory(),fetchImpl:async(url,options)=>{methods.push(options.method||'GET');return {ok:true,json:async()=>({items:{post:{likes:3}}})};}});
 await client.load(['post']);await client.like('post');assert.deepEqual(methods,['GET']);assert.equal(client.states.post.likes,3);
});

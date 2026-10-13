import test from 'node:test';
import assert from 'node:assert/strict';
import {loadLeaderboardRank,profileWithLeaderboardRank} from '../../src/shared/leaderboard-rank.js';
import {rankingPosition} from '../../v2/models.js';
const id='drv_b466bb6eedd8',revision='a'.repeat(64),next='b'.repeat(64);
const descriptor=rev=>({rankings:{leaderboard:{schema_version:1,prefix_length:2,shard_path:'rankings/leaderboard/{prefix}.json',revision:rev}}});
const shard=(rev,rank=4)=>({schema_version:1,prefix:'b4',revision:rev,ranks:{[id]:rank}});
const fetchSequence=values=>{const calls=[];return {calls,fetchImpl:async(url,opts)=>{calls.push({url,opts});const value=values.shift();return {ok:value!==undefined,json:async()=>value};}};};
test('profile uses only one current compact shard instead of stale rank',async()=>{
 const f=fetchSequence([descriptor(revision),shard(revision)]);
 const result=await loadLeaderboardRank(id,f),p=profileWithLeaderboardRank({championship_rank:3,summary:{championship_rank:3,points:6982}},result);
 assert.equal(p.championship_rank,4);assert.equal(p.summary.championship_rank,4);assert.equal(p.summary.points,6982);
 assert.equal(f.calls.length,2);assert.ok(f.calls[1].url.endsWith('/rankings/leaderboard/b4.json'));assert.equal(f.calls[0].opts.cache,'no-store');
});
test('cross-publication shard mismatch retries with a fresh manifest',async()=>{
 const f=fetchSequence([descriptor(revision),shard(next),descriptor(next),shard(next,5)]);
 assert.equal((await loadLeaderboardRank(id,f)).rank,5);assert.equal(f.calls.length,4);
});
test('persistent mismatch, invalid and unavailable ranks never fall back to stale values',async()=>{
 for(const values of [[descriptor(revision),shard(next),descriptor(revision),shard(next)],[descriptor(revision),shard(revision,-1)],[descriptor(revision)]]) {
  const result=await loadLeaderboardRank(id,fetchSequence(values));assert.equal(result.status,'unavailable');
  assert.equal(profileWithLeaderboardRank({summary:{championship_rank:3}},result).summary.championship_rank,null);
 }
 const result=await loadLeaderboardRank(id,fetchSequence([descriptor(revision),{...shard(revision),ranks:{}}]));assert.equal(result.rank,null);
});
test('old manifests preserve legacy behavior',async()=>{
 const p={summary:{championship_rank:3}},result=await loadLeaderboardRank(id,fetchSequence([{}]));
 assert.equal(result.status,'legacy');assert.equal(profileWithLeaderboardRank(p,result),p);
});
test('search and sort preserve global places and medal eligibility',()=>{
 const rows=[{rank:21},{rank:4},{rank:1}];
 assert.deepEqual(rows.map((r,i)=>rankingPosition(r,'leaderboard',i)),[21,4,1]);
 assert.equal(rankingPosition({},'leaderboard',0),null);assert.equal(rankingPosition({position:12},'clubs',0),12);assert.equal(rankingPosition({},'bestlaps',10),11);
});

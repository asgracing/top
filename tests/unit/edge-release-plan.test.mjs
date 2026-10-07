import {test} from 'node:test';
import assert from 'node:assert/strict';
import {redirects} from '../../scripts/root-redirects.mjs';
import {edgeDecision,edgePlan,bulkRows} from '../../scripts/edge-release-plan.mjs';
test('all exact migration sources reach final targets without a redirect loop',()=>{
 for(const row of redirects)for(const host of ['asgracing.ru','www.asgracing.ru'])for(const scheme of ['http','https']){
  const next=edgeDecision(`${scheme}://${host}${row.source}?utm_source=asg&utm_campaign=x%26y#result`);
  assert.equal(next.status,301);
  assert.equal(next.location,'https://asgracing.ru'+row.target+'?utm_source=asg&utm_campaign=x%26y#result');
  assert.equal(edgeDecision(next.location),null);
 }
});
test('query redirects keep argument order, encoded values, repeated UTM and real key boundaries',()=>{
 for(const [path,key,target]of [['/ru/races/','race_id','/race/'],['/v2/en/races','race_id','/en/race/'],['/preview/ru/news/','slug','/news/article/'],['/en/news/','slug','/en/news/article/']]){
  for(const query of [`${key}=abc%2Fdef&utm_source=partner&utm_source=asg`,`utm_campaign=x%26${key}%3Dfoo&${key}=abc%2Fdef&utm_term=a+b`]){
   const next=edgeDecision('https://www.asgracing.ru'+path+'?'+query);
   assert.equal(next.location,'https://asgracing.ru'+target+'?'+query.replace(new RegExp('(^|&)'+key+'='),'$1id='));
   assert.equal(edgeDecision(next.location),null);
  }
 }
});
test('assets, old interface, APIs, foreign hosts and writes are not redirected',()=>{
 for(const path of ['/old/news/?slug=a','/v2/runtime/home.js','/v2/assets/logo.svg','/hourly-votes-api/vote','/top-data/v2/home.json','/asg-lab/','/hourly/team/','/unknown/'])assert.equal(edgeDecision('https://asgracing.ru'+path),null);
 assert.equal(edgeDecision('https://data.asgracing.ru/ru/'),null);
 assert.equal(edgeDecision('https://evil.example/ru/'),null);
 for(const method of ['POST','PUT','DELETE'])assert.equal(edgeDecision('https://asgracing.ru/ru/',{method}),null);
});
test('edge configuration stays disabled, exact and query safe; no unsupported free-plan regex',()=>{
 const plan=edgePlan();assert.deepEqual(plan.counts,{single:8,lists:1,bulk:1,urls:574});
 assert.ok(plan.single.rules.every(r=>!r.enabled));
 assert.ok(plan.bulk.rules.every(r=>!r.enabled));
 assert.ok(!JSON.stringify(plan).includes('regex_replace'));
 for(const row of bulkRows())assert.equal(row.include_subdomains||row.subpath_matching||row.preserve_path_suffix,false);
 assert.equal(edgeDecision('https://asgracing.ru/ru/',{status:302}).status,302);
 assert.throws(()=>edgePlan(307));
});
test('id conflicts and encoded legacy key names stay on documented client fallback',()=>{
 assert.equal(edgeDecision('https://asgracing.ru/races/?race_id=a&id=b'),null);
 assert.equal(edgeDecision('https://asgracing.ru/races/?race%5fid=a'),null);
 assert.equal(edgeDecision('https://asgracing.ru/races/?%69d=b&race_id=a'),null);
 assert.equal(edgeDecision('https://asgracing.ru/news/?source=slug=a'),null);
 const repeated=edgeDecision('https://asgracing.ru/races/?race_id=a&race_id=b');
 assert.equal(repeated.location,'https://asgracing.ru/race/?id=a&race_id=b');
});

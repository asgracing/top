// A local HTTP rehearsal of the proposed rules, not a Cloudflare deployment test.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {edgeDecision,bulkRows} from '../../scripts/edge-release-plan.mjs';
import {nodes} from '../../scripts/seo/html-source.mjs';
import {excludedRoute} from '../../v2/site-routing.js';
const root=resolve(import.meta.dirname,'../..'),artifact=resolve(root,'../tmp/v2-root-release-candidate');
const server=createServer(async(req,res)=>{
 const virtual=new URL(req.url,'http://'+req.headers['x-test-host']),status=Number(req.headers['x-test-status'])||301;
 const decision=edgeDecision(virtual.href,{method:req.method,status});
 if(decision){res.writeHead(decision.status,{location:decision.location}).end();return;}
 try{const file=resolve(artifact,'.'+virtual.pathname+(virtual.pathname.endsWith('/')?'index.html':''));const body=await readFile(file);res.writeHead(200,{'content-type':'text/html; charset=utf-8'}).end(body);}catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const local='http://127.0.0.1:'+server.address().port;let checks=0;
async function check(source,expected,status){
 const u=new URL(source,'https://asgracing.ru');
 const response=await fetch(local+u.pathname+u.search,{headers:{'x-test-host':u.hostname,'x-test-status':String(status)},redirect:'manual'});
 assert.equal(response.status,status,source);assert.equal(response.headers.get('location'),expected,source);
 const target=new URL(expected),final=await fetch(local+target.pathname+target.search,{headers:{'x-test-host':target.hostname},redirect:'manual'});
 assert.equal(final.status,200,'final target '+expected);
 const parsed=nodes(await final.text());
 if(!excludedRoute(target.pathname.slice(1))){
  assert.equal(parsed.find(n=>n.name==='html').attrs.lang,target.pathname.startsWith('/en/')?'en':'ru',expected);
  assert.ok(parsed.some(n=>n.attrs.rel==='canonical'),'final canonical exists: '+expected);
 }
 checks++;
}
try{
 for(const row of bulkRows())await check('https://'+row.source+'?utm_source=asg',row.target+'?utm_source=asg',301);
 for(const status of [302,301])for(const host of ['asgracing.ru','www.asgracing.ru'])for(const prefix of ['/ru/','/v2/en/'])for(const [route,key,target]of [['races/','race_id','race/'],['news/','slug','news/article/']]){
  const lang=prefix.includes('/en/')?'/en/':'/';
  for(const query of [key+'=example%2Fid&utm_campaign=release','utm_campaign=release&'+key+'=example%2Fid'])await check('https://'+host+prefix+route+'?'+query,'https://asgracing.ru'+lang+target+'?'+query.replace(key+'=','id='),status);
 }
}finally{await new Promise(done=>server.close(done));}
await writeFile(resolve(root,'../tmp/v2-step5-edge-http.json'),JSON.stringify({checks,status:'passed-local-simulation',cloudflareValidation:false,productionChanged:false},null,2)+'\n');
console.log(`Local edge HTTP rehearsal passed: ${checks} redirects with query preservation, final 200 RU/EN, canonical and no HTTP chains.`);

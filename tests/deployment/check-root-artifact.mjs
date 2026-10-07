import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {dist} from '../../scripts/dist-paths.mjs';
import {pageRegistry} from '../../v2/page-registry.js';
import {nodes} from '../../scripts/seo/html-source.mjs';
import {screenPath,migratedRoutes,legacyRoutes,excludedRoute} from '../../v2/site-routing.js';
const map=JSON.parse(await readFile(resolve(dist,'route-map.json')));
assert.equal(map.layout,'root');
let anchors=0;
for(const page of map.pages){
 const html=await readFile(resolve(dist,page.path.slice(1),'index.html'),'utf8');
 assert.match(html,new RegExp(`data-site-version="${page.version}"`));
 assert.match(html,new RegExp(`lang="${page.language}"`));
 assert.match(html,/name="robots" content="noindex,follow"/);
 for(const node of nodes(html).filter(n=>n.name==='a'&&n.attrs.href)){
  const href=node.attrs.href.replaceAll('&amp;','&'),url=new URL(href,'https://asgracing.ru'+page.path);
  if(href.startsWith('#')||url.origin!=='https://asgracing.ru')continue;
  const path=screenPath(url.pathname);
  const versionSwitch=/\sdata-v[12]-home(?:\s|=|>)/.test(html.slice(node.start,node.openEnd));
  if(versionSwitch)assert.ok(url.pathname.startsWith(page.version==='v2'?'/old/':page.language==='en'?'/en/':'/'));
  else if(excludedRoute(path))assert.equal(url.pathname,'/'+path,'excluded flows retain native gates');
  else if(migratedRoutes.has(path)||legacyRoutes.has(path)){
   if(page.version==='old')assert.ok(url.pathname.startsWith('/old/'),'old navigation escaped: '+page.path+' -> '+href);
   else assert.ok(!/^\/(?:old|v2|ru)\//.test(url.pathname),'new navigation escaped: '+page.path+' -> '+href);
  }
  if(!url.pathname.endsWith('/'))continue;
  await stat(resolve(dist,url.pathname.slice(1),'index.html'));anchors++;
 }
}
assert.equal(map.pages.filter(p=>p.version==='v2').length,pageRegistry.length*2);
assert.equal(map.pages.filter(p=>p.version==='old').length,legacyRoutes.size*2);
console.log(`Root artifact: ${map.pages.length} language/version screens; ${anchors} navigation targets verified. Excluded flows retain native paths.`);

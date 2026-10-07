import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pageRegistry} from '../../v2/page-registry.js';
import {readV1Html} from '../../scripts/v1-source.mjs';
import {nodes} from '../../scripts/seo/html-source.mjs';

test('every legacy sitemap page remains indexable and listed at its new localized URL',async()=>{
 const xml=await readFile(new URL('../../v1-source/sitemap.xml',import.meta.url),'utf8');
 for(const [,href]of xml.matchAll(/<loc>([^<]+)<\/loc>/g)){
  const path=new URL(href).pathname;
  const page=pageRegistry.find(p=>Object.values(p.legacy).includes(path));
  assert.ok(page,'Missing legacy sitemap page '+path);
  assert.equal(page.indexable,true,'Indexing regression '+path);
  assert.notEqual(page.sitemap,false,'Sitemap regression '+path);
 }
});

test('legacy public profiles and entities retain indexing without empty entity sitemap entries',async()=>{
 for(const [screen,path]of [['driver','driver/index.html'],['club','clubs/index.html'],['team','teams/detail/index.html'],['championship','hourly/championship/index.html']]){
  const parsed=nodes(await readV1Html(path));
  const robots=parsed.find(n=>n.attrs.name==='robots')?.attrs.content||'';
  assert.ok(!robots.includes('noindex'),'Legacy baseline changed '+path);
  const page=pageRegistry.find(p=>p.screen===screen);
  assert.equal(page.indexable,true,screen);
  if(screen!=='championship')assert.equal(page.sitemap,false,screen);
 }
});

test('old query-based news and race results retain indexing on their new detail routes',async()=>{
 for(const [screen,path]of [['article','news/index.html'],['race','races/index.html']]){
  assert.ok(!nodes(await readV1Html(path)).find(n=>n.attrs.name==='robots')?.attrs.content?.includes('noindex'));
  const page=pageRegistry.find(p=>p.screen===screen);
  assert.equal(page.indexable,true,screen);
  assert.equal(page.sitemap,false,'Do not add an empty '+screen+' URL');
 }
 for(const page of pageRegistry.filter(p=>p.access!=='public'||p.route==='documents/read/'||p.screen==='notfound'))assert.equal(page.indexable,false,page.route);
});

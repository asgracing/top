import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readV1Html} from '../../scripts/v1-source.mjs';
import {renderLocalizedPages} from '../../scripts/generate-localized-pages.mjs';
import {compileInformation,extractDocument,extractGuide} from '../../scripts/v2-information-content.mjs';
import {nodes} from '../../scripts/seo/html-source.mjs';
import {v2Route} from '../../v2/routes.js';
const {outputs:localized}=await renderLocalizedPages();
const read=p=>localized.get(p)??readV1Html(p);
const text=s=>s.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
test('legal readers preserve all original source text, headings, update date and English note',async()=>{
 for(const [id,count] of [['privacy',12],['cookies',9]]){
  const html=await read(id+'/index.html'),d=extractDocument(html,id+'/index.html');
  const sections=nodes(html).filter(n=>n.name==='section'&&(n.attrs.class||'').split(' ').includes('legal-card'));
  assert.equal(d.sections.length,count);assert.equal(sections.length,count);
  sections.forEach((s,i)=>assert.equal(text((d.sections[i].title==='Введение'?'':d.sections[i].title+' ')+d.sections[i].html),text(html.slice(s.openEnd,s.close))));
  assert.match(d.intro_html,/30\.04\.2026/);assert.equal(d.sections.at(-1).title,'English Note');
  assert.ok(d.sections.at(-1).html.includes('Russian')||d.sections.at(-1).html.includes('Analytics'));
 }
});
test('guides compile current RU/EN source with every section and no script/navigation duplication',async()=>{
 const content=await compileInformation(read);
 for(const id of ['about','join'])for(const lang of ['ru','en']){
  const d=content.guides[id][lang];assert.equal(d.sections.length,4);assert.ok(d.title);assert.ok(d.intro);
  assert.ok(d.sections.every(s=>s.title&&s.html.includes('<p>')));
  assert.equal(/<script|<nav/.test(JSON.stringify(d)),false);
 }
 const generated=(await import('../../v2/pages/information-content.js')).default;
 assert.deepEqual(generated,content);
});
test('missing/malformed owner markup stops compilation instead of emitting an empty policy',()=>{
 assert.throws(()=>extractDocument('<html></html>','privacy/index.html'),/Legal header/);
 assert.throws(()=>extractGuide('<main><h1>Title</h1></main>','join/index.html'),/Incomplete guide/);
});
test('information and migrated control routes remain inside V2 with explicit RU/EN',()=>{
 for(const lang of ['ru','en'])for(const p of ['about/','join/','instructions/','documents/','documents/read/','privacy/','cookies/','404/'])assert.equal(v2Route(p,lang),`/v2/${lang}/${p}`);
 for(const lang of ['ru','en'])for(const p of ['account/settings/','moderation/','portal-ops/'])assert.equal(v2Route(p,lang),`/v2/${lang}/${p}`);
});

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const read=path=>readFile(resolve(root,path),'utf8');
const source=await read('app.js'),build=JSON.parse(await read('v2/runtime-source.json'));
assert.equal(build.sha256,createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex'),'Rebuild V2 after changing canonical controllers');
for(const language of ['ru','en']){
  const classic=await read(language==='ru'?'ru/index.html':'index.html');
  const html=await read(`v2/${language}/index.html`);
  for(const name of ['yandex-verification','google-site-verification','yandex-metrika-id']){
    const matcher=new RegExp(`<meta name="${name}"[^>]*>`,'g');
    assert.deepEqual(html.match(matcher),classic.match(matcher),name);
  }
  assert.match(html,/<meta name="robots" content="noindex,follow">/);
  assert.doesNotMatch(html,/<link[^>]*rel="canonical"/);
  assert.match(html,new RegExp(`<html lang="${language}"`));
  assert.match(html,/data-v1-home/);
  assert.match(html,/v2-seo-intro-title/);
  assert.doesNotMatch(html,/<video\b|public-snapshot|preview-avatar/);
  assert.equal((html.match(/src="\/legal.js[^\"]*"/g)||[]).length,1);
}
assert.match(await read('v2/index.html'),/let language='ru'/);
assert.doesNotMatch(await read('v2/home.js'),/localStorage\.setItem\([^\n]*(?:vote|participation)/i);
console.log('V2 home contracts passed: canonical runtime, RU/EN, analytics, verification, SEO isolation.');

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {readClassicQuality} from '../../scripts/classic-quality-source.mjs';
const root=resolve(import.meta.dirname,'../..');
const read=async path=>{if(path.startsWith('v2/')&&process.env.ASG_V2_OUTPUT_DIR){try{return await readFile(resolve(process.env.ASG_V2_OUTPUT_DIR,path),'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}}return readFile(resolve(root,path),'utf8');};
const source=await read('app.js'),build=JSON.parse(await read('v2/runtime-source.json'));
assert.equal(build.sha256,createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex'),'Rebuild V2 after changing canonical controllers');
const hash=value=>createHash('sha256').update(value.replace(/\r\n/g,'\n')).digest('hex');
const runtime=await read('v2/runtime/home.js');
assert.equal(build.outputSha256,hash(runtime),'Generated runtime integrity');
assert.equal(build.facadeSha256,hash(await read('scripts/v2-runtime-facade.txt')),'Facade integrity');
assert.ok((await read('v2/home.js')).includes(`runtime/home.js?v=${build.version}`),'Visible home uses this runtime version');
assert.doesNotMatch(runtime,/const v2Votes|hourlyVotesApiEndpoint/, 'No second Hourly transport in the adapter');
for(const action of ['load','vote','unvote']) assert.ok(runtime.includes(`getHomeHourlyVotesClient().${action}(`),'Shared Hourly transport: '+action);
const inputs=JSON.parse(await read('v2/build-inputs.json'));
assert.equal(inputs.runtimeVersion,build.version);
assert.equal(new Set(inputs.inputs.map(input=>input.path)).size,inputs.inputs.length,'Unique input inventory');
for(const input of inputs.inputs){
  assert.equal(input.sha256,hash(await read(input.path)),`Stale V2 input: ${input.path}`);
  if(input.path.endsWith('.html')) assert.ok(input.path.startsWith('v1-source/html/')||input.path.startsWith('v2-source/'),'Public HTML cannot be a build input: '+input.path);
}
for(const language of ['ru','en']){
  const classic=await readClassicQuality(language==='ru'?'ru/index.html':'index.html');
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

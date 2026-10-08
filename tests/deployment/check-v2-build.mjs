// Prove a source-only build works even when the public HTML is absent/overwritten.
import assert from 'node:assert/strict';
import {cp,mkdir,mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {resolve,dirname,join,sep} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {pageRegistry} from '../../v2/page-registry.js';
import {migratedPaths} from '../../v2/routes.js';
const exec=promisify(execFile),root=resolve(import.meta.dirname,'../..');
assert.equal(pageRegistry.length,migratedPaths.size,'No duplicated routes');
assert.deepEqual([...migratedPaths],[...pageRegistry.map(page=>page.route)]);
assert.ok(!migratedPaths.has('asg-lab/')&&!migratedPaths.has('hourly/team/'),'Excluded flows are not migrated');
for(const page of pageRegistry){
  assert.equal(page.target.ru,'/'+page.route);
  assert.equal(page.target.en,'/en/'+page.route);
  for(const language of ['ru','en'])if(page.route){assert.ok(page.title[language]);assert.ok(page.description[language]);}
}
const parent=resolve(root,'../tmp/v2-source-build-check');await mkdir(parent,{recursive:true});
const work=await mkdtemp(join(parent,'candidate-'));
assert.ok(work.startsWith(parent+sep),'Cleanup stays within the test directory');
async function tree(directory,prefix=''){
  const files=[];
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const path=prefix+entry.name;
    if(entry.isDirectory()) files.push(...await tree(join(directory,entry.name),path+'/'));
    else files.push([path,createHash('sha256').update(await readFile(join(directory,entry.name))).digest('hex')]);
  }
  return files.sort(([a],[b])=>a.localeCompare(b));
}
try{
  const workspace=join(work,'source'),first=join(work,'first'),second=join(work,'second');
  await mkdir(workspace,{recursive:true});
  // Copy maintained inputs only. No public index/ru/legal/controller HTML.
  for(const path of ['package.json','scripts','v1-source','v2-source','styles','styles.css','legal.css','app.js','hourly/app.js','hourly/championship/app.js','hourly/championship/history/app.js','src/pages/clubs-teams/catalog-page.js','v2/page-registry.js']){
    const destination=join(workspace,path);await mkdir(dirname(destination),{recursive:true});await cp(join(root,path),destination,{recursive:true});
  }
  const run=out=>exec(process.execPath,['scripts/build-v2.mjs'],{cwd:workspace,env:{...process.env,ASG_V2_OUTPUT_DIR:out,ASG_V2_PRESENTATION_ONLY:'0'},maxBuffer:1024*1024});
  await run(first);
  const manifest=JSON.parse(await readFile(join(workspace,'v1-source/manifest.json'),'utf8'));
  for(const path of manifest.templates){await mkdir(dirname(join(workspace,path)),{recursive:true});await writeFile(join(workspace,path),'<html>POISONED_PUBLIC_OUTPUT</html>');}
  await run(second);
  assert.deepEqual(await tree(first),await tree(second),'Public HTML cannot change the generated site');
  for(const language of ['ru','en'])for(const page of pageRegistry){
    const html=await readFile(join(second,`v2/${language}/${page.route}index.html`),'utf8');
    assert.ok(html.includes(`lang="${language}"`));assert.ok(!html.includes('POISONED_PUBLIC_OUTPUT'));
  }
  const generation=await exec(process.execPath,['scripts/generate-localized-pages.mjs','--output-dir',join(work,'localized')],{cwd:workspace,maxBuffer:1024*1024});
  assert.match(generation.stdout,/Localized HTML generated/);
  await assert.rejects(exec(process.execPath,['scripts/build-v2.mjs'],{cwd:workspace,env:{...process.env,ASG_V2_PRESENTATION_ONLY:'1'},maxBuffer:1024*1024}),/Presentation-only builds are retired/);
  console.log('V2 build regression passed: source-only build, 58 RU/EN pages, poisoned public HTML, deterministic output, full runtime required.');
}finally{await rm(work,{recursive:true,force:true});}

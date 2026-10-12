import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {taskScratchPath,workspaceRoot} from '../../scripts/workspace-scratch.mjs';
import {planFiles,tree,digest} from '../../scripts/site-release-files.mjs';

test('prepared archive bundle materializes and rolls back only an explicitly selected fixture',async()=>{
 const work=await mkdtemp(resolve(taskScratchPath(),'materialize-'));
 try{
  const bundle=resolve(work,'bundle'),target=resolve(work,'target');
  await mkdir(target);await writeFile(resolve(target,'index.html'),'previous');
  for(const [kind,text] of [['candidate','candidate'],['fallback','previous']]){
   const payload=resolve(bundle,kind);await mkdir(payload,{recursive:true});await writeFile(resolve(payload,'index.html'),text);
  }
  for(const kind of ['candidate','fallback']){
   const baseline=kind==='candidate'?target:resolve(bundle,'candidate');
   const entries=await planFiles(resolve(bundle,kind),baseline);
   await writeFile(resolve(bundle,kind+'-plan.json'),JSON.stringify({schemaVersion:1,component:'site',version:'fixture',entries}));
  }
  const files=[];for(const path of await tree(bundle))files.push({path,sha256:digest(await readFile(resolve(bundle,path)))});
  await writeFile(resolve(bundle,'bundle-inventory.json'),JSON.stringify({files}));
  const script=new URL('../../scripts/materialize-site-release.mjs',import.meta.url);
  const run=(...args)=>spawnSync(process.execPath,[fileURLToPath(script),'--bundle',bundle,...args],{encoding:'utf8'});
  assert.notEqual(run('--directory',resolve(workspaceRoot,'tmp/legacy-target'),'--apply').status,0);
  assert.notEqual(run('--apply').status,0,'The source checkout is never an implicit target');
  assert.equal(await readFile(resolve(target,'index.html'),'utf8'),'previous');
  const preview=run('--directory',target);assert.equal(preview.status,0,preview.stderr);
  assert.equal(await readFile(resolve(target,'index.html'),'utf8'),'previous');
  const applied=run('--directory',target,'--apply');assert.equal(applied.status,0,applied.stderr);
  assert.equal(await readFile(resolve(target,'index.html'),'utf8'),'candidate');
  const fallback=run('--directory',target,'--fallback','--apply');assert.equal(fallback.status,0,fallback.stderr);
  assert.equal(await readFile(resolve(target,'index.html'),'utf8'),'previous');
  await writeFile(resolve(bundle,'candidate/index.html'),'tampered');
  assert.notEqual(run('--directory',target,'--apply').status,0,'A changed sealed bundle is rejected');
  assert.equal(await readFile(resolve(target,'index.html'),'utf8'),'previous');
 }finally{await rm(work,{recursive:true,force:true});}
});

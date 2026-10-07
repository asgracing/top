import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {safeTarget,planFiles,validatePlan} from '../../scripts/site-release-files.mjs';
test('release paths cannot escape or target protected files',()=>{
 for(const path of ['../app.js','assets/../../app.js','C:/app.js','.git/config','.GIT/config','portal-secrets/private.json','assets/.env'])assert.throws(()=>safeTarget('/site',path));
 assert.equal(safeTarget('/site','old/en/index.html'),resolve('/site','old/en/index.html'));
});
test('release plan refuses changed source, altered payload and unrelated deletion',async()=>{
 const work=await mkdtemp(resolve(tmpdir(),'asg-release-')),target=resolve(work,'target'),payload=resolve(work,'payload');
 try{
  await mkdir(target);await mkdir(payload);await writeFile(resolve(target,'index.html'),'before');await writeFile(resolve(payload,'index.html'),'after');
  const plan=await planFiles(payload,target);await validatePlan(plan,payload,target);
  await writeFile(resolve(target,'index.html'),'other work');await assert.rejects(validatePlan(plan,payload,target),/Target changed/);
  await writeFile(resolve(target,'index.html'),'before');await writeFile(resolve(payload,'index.html'),'corrupt');await assert.rejects(validatePlan(plan,payload,target),/Payload changed/);
  await assert.rejects(validatePlan([{path:'index.html',action:'delete',before:plan[0].before,after:null}],payload,target),/restricted/);
 }finally{await rm(work,{recursive:true,force:true});}
});

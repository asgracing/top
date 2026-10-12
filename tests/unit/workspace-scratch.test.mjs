import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,symlink,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {archiveScratchRoot,workspaceRoot,findWorkspaceRoot,assertChildPath,assertArchiveScratchPath,taskScratchPath} from '../../scripts/workspace-scratch.mjs';

test('copied CI fixtures retain the shared scratch root without a WORKSPACE.md marker',()=>{
 const copied=resolve(workspaceRoot,'_archive/tmp/2026-10-12/source-check/candidate/source');
 assert.equal(findWorkspaceRoot(copied,()=>false),workspaceRoot);
 const standalone=resolve(workspaceRoot,'ci-checkout/site');
 assert.equal(findWorkspaceRoot(standalone,()=>false),resolve(workspaceRoot,'ci-checkout'));
});

test('scratch outputs reject the archive root, former tmp, traversal and missing paths',()=>{
 assert.throws(()=>assertArchiveScratchPath(archiveScratchRoot),/inside/);
 assert.throws(()=>assertArchiveScratchPath(resolve(workspaceRoot,'tmp/legacy-output')),/inside/);
 assert.throws(()=>assertArchiveScratchPath(resolve(archiveScratchRoot,'../payload/output')),/inside/);
 assert.throws(()=>assertArchiveScratchPath(''),/required/);
 assert.equal(assertArchiveScratchPath(resolve(archiveScratchRoot,'2026-10-12/test')),resolve(archiveScratchRoot,'2026-10-12/test'));
});
test('task output contract creates parents and rejects an escaping suffix',async()=>{
 const directory=taskScratchPath('guard-test');
 assert.equal(assertChildPath(archiveScratchRoot,directory),directory);
 assert.throws(()=>taskScratchPath('../../../../escaping'),/inside/);
 assert.throws(()=>assertChildPath(directory,directory),/inside/);
});
test('existing junctions cannot redirect scratch writes outside their allowed parent',async()=>{
 const parent=taskScratchPath();
 const work=await mkdtemp(resolve(parent,'junction-'));
 try{
  const allowed=resolve(work,'allowed'),outside=resolve(work,'outside');
  await mkdir(allowed);await mkdir(outside);
  await symlink(outside,resolve(allowed,'redirect'),'junction');
  assert.throws(()=>assertChildPath(allowed,resolve(allowed,'redirect/new/report.json')),/redirects outside/);
  assert.equal(assertChildPath(allowed,resolve(allowed,'normal/report.json')),resolve(allowed,'normal/report.json'));
 }finally{await rm(work,{recursive:true,force:true});}
});

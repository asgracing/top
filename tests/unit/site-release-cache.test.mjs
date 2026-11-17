import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {taskScratchPath,assertChildPath} from '../../scripts/workspace-scratch.mjs';
import {atomicJson,releaseInput,cachedRelease,ownedWork,finishOwnedWork,verifiedBundle,preparationBudget} from '../../scripts/site-release-cache.mjs';
import {digest} from '../../scripts/site-release-files.mjs';

async function fixture(fn){
 const parent=taskScratchPath('release-cache-tests');await mkdir(parent,{recursive:true});
 const directory=await mkdtemp(resolve(parent,'case-'));
 try{await fn(directory);}finally{await rm(assertChildPath(parent,directory),{recursive:true,force:true});}
}

test('release input changes on source, revision-independent fixture files and options',()=>fixture(async directory=>{
 const root=resolve(directory,'source');await mkdir(root);await writeFile(resolve(root,'page.html'),'first');
 const a=await releaseInput(root,{previous:null});
 assert.equal((await releaseInput(root,{previous:null})).sha256,a.sha256);
 await writeFile(resolve(root,'page.html'),'other');
 assert.notEqual((await releaseInput(root,{previous:null})).sha256,a.sha256);
 assert.notEqual((await releaseInput(root,{previous:'a'.repeat(40)})).sha256,(await releaseInput(root,{previous:null})).sha256);
}));

test('only a complete byte-verified sealed bundle can be reused',()=>fixture(async task=>{
 const bundle=resolve(task,'site-releases/version');await mkdir(bundle,{recursive:true});
 const receipt=JSON.stringify({sha256:'input'});await writeFile(resolve(bundle,'preparation-input.json'),receipt);
 await writeFile(resolve(bundle,'page.html'),'payload');
 await atomicJson(resolve(bundle,'bundle-inventory.json'),{version:'version',files:[{path:'page.html',sha256:digest('payload')},{path:'preparation-input.json',sha256:digest(receipt)}]});
 await atomicJson(resolve(task,'site-preparation-cache.json'),{key:'input',version:'version',bundle});
 assert.equal((await cachedRelease(task,'input')).bundle,bundle);
 assert.equal(await cachedRelease(task,'other'),null);
 await writeFile(resolve(bundle,'page.html'),'changed');
 await assert.rejects(cachedRelease(task,'input'),/bytes changed/);
}));

test('unexpected files and malformed cache paths refuse reuse',()=>fixture(async task=>{
 const bundle=resolve(task,'site-releases/version');await mkdir(bundle,{recursive:true});
 await atomicJson(resolve(bundle,'bundle-inventory.json'),{version:'version',files:[]});
 await writeFile(resolve(bundle,'unknown'),'newer result');
 await assert.rejects(verifiedBundle(task,bundle),/file set changed/);
 await assert.rejects(verifiedBundle(task,resolve(task,'outside')),/inside/);
}));

test('successful preparation removes only its own work; explicit investigation retains it',()=>fixture(async task=>{
 const first=await ownedWork(task);await writeFile(resolve(first.directory,'work.txt'),'scratch');
 await finishOwnedWork(task,first);
 await assert.rejects(readFile(resolve(first.directory,'work-owner.json')),e=>e.code==='ENOENT');
 const second=await ownedWork(task);await finishOwnedWork(task,second,{keep:true});
 assert.equal(JSON.parse(await readFile(resolve(second.directory,'work-owner.json'),'utf8')).status,'retained');
 await assert.rejects(finishOwnedWork(task,{...second,token:'unknown'}),/ownership changed/);
 assert.equal(JSON.parse(await readFile(resolve(second.directory,'work-owner.json'),'utf8')).status,'retained');
}));

test('missing cached package causes a rebuild without changing existing files',()=>fixture(async task=>{
 await writeFile(resolve(task,'untouched'),'keep');
 await atomicJson(resolve(task,'site-preparation-cache.json'),{key:'input',version:'gone',bundle:resolve(task,'site-releases/gone')});
 assert.equal(await cachedRelease(task,'input'),null);
 assert.equal(await readFile(resolve(task,'untouched'),'utf8'),'keep');
}));

test('preparation checks peak disk space before allocating build work',()=>fixture(async task=>{
 const budget=await preparationBudget(task,1024);
 assert.equal(budget.estimatedPeakBytes,6144);
 await assert.rejects(preparationBudget(task,Number.MAX_SAFE_INTEGER),/Insufficient free space/);
 await assert.rejects(readFile(resolve(task,'work/work-owner.json')),e=>e.code==='ENOENT');
}));

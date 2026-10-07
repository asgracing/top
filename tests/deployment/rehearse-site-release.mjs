// A plain source/test directory, never a Git checkout or production target.
import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {siteRoot as root} from '../../scripts/site-release.mjs';
import {safeTarget,fileHash,tree} from '../../scripts/site-release-files.mjs';
const latest=JSON.parse(await readFile(resolve(root,'../tmp/site-release-latest.json'),'utf8'));
const plan=JSON.parse(await readFile(resolve(latest.bundle,'candidate-plan.json'),'utf8'));
const target=resolve(root,'../tmp/site-release-rehearsal',String(Date.now()),'source');await mkdir(target,{recursive:true});
if((await tree(target)).length)throw Error('Use a new empty rehearsal directory; previous results are preserved');
const payload=resolve(latest.bundle,'candidate');
for(const path of await tree(payload))if(await fileHash(root,path)!==null){const to=safeTarget(target,path);await mkdir(resolve(to,'..'),{recursive:true});await cp(safeTarget(root,path),to);}
for(const entry of plan.entries.filter(e=>e.action==='delete')){const to=safeTarget(target,entry.path);await mkdir(resolve(to,'..'),{recursive:true});await cp(safeTarget(root,entry.path),to);}
for(const path of ['scripts','tests','v1-source','v2-source','package.json','performance-budgets.json'])await cp(resolve(root,path),resolve(target,path),{recursive:true});
execFileSync(process.execPath,['scripts/materialize-site-release.mjs','--bundle',latest.bundle,'--directory',target,'--apply'],{cwd:root,stdio:'inherit'});
const env={...process.env,ASG_SOURCE_REVISION:plan.sourceRevision};
execFileSync(process.platform==='win32'?'npm.cmd':'npm',['run','ci'],{cwd:target,env,stdio:'inherit',shell:process.platform==='win32'});
// The protected generator must fail before changing any new root HTML.
const before=await fileHash(target,'index.html');
let blocked=false;try{execFileSync(process.execPath,['scripts/generate-localized-pages.mjs'],{cwd:target,env,stdio:'pipe'});}catch(e){blocked=/cannot overwrite/.test(e.stderr?.toString()||'');}
if(!blocked||await fileHash(target,'index.html')!==before)throw Error('Legacy generator overwrote the root release');
execFileSync(process.execPath,['scripts/materialize-site-release.mjs','--bundle',latest.bundle,'--fallback','--directory',target,'--apply'],{cwd:root,stdio:'inherit'});
execFileSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{cwd:target,env,stdio:'inherit',shell:process.platform==='win32'});
await writeFile(resolve(root,'../tmp/v2-step4-rehearsal.json'),JSON.stringify({version:plan.version,target,rootCI:'passed',legacyGeneratorBlocked:true,fallbackBuild:'passed',productionChanged:false},null,2)+'\n');
console.log('Rehearsal passed: root CI, guarded SEO generation, explicit-file activation and URL-compatible fallback.');

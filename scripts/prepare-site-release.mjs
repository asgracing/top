import {taskScratchPath} from './workspace-scratch.mjs';
// Local/CI preparation only: no Git staging, push, hosting settings or edge writes.
import {execFileSync} from 'node:child_process';
import {cp,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {siteRoot as root,readSiteRelease} from './site-release.mjs';
import {tree,digest,planFiles,fileHash} from './site-release-files.mjs';
import {atomicJson,releaseInput,cachedRelease,ownedWork,finishOwnedWork,verifiedBundle,preparationBudget} from './site-release-cache.mjs';
const tmp=taskScratchPath();
const config=await readSiteRelease();
const previous=process.argv.includes('--previous-revision')?process.argv[process.argv.indexOf('--previous-revision')+1]:null;
if(previous&&!/^[a-f0-9]{40}$/.test(previous))throw Error('Previous revision must be a full verified Git commit');
const inputOptions={config,previous,sourceRevision:process.env.ASG_SOURCE_REVISION||null,presentationOnly:process.env.ASG_V2_PRESENTATION_ONLY||null,keepWork:process.argv.includes('--keep-work')};
const input=await releaseInput(root,inputOptions);
const cached=process.argv.includes('--no-cache')?null:await cachedRelease(tmp,input.sha256);
if(cached){
 await atomicJson(resolve(tmp,'site-release-latest.json'),{version:cached.version,bundle:cached.bundle,status:'prepared-only',reused:true});
 console.log('Reused verified publication and fallback bundle: '+cached.bundle);
 process.exit(0);
}
await preparationBudget(tmp,input.sourceBytes);
const owner=await ownedWork(tmp),work=owner.directory;
const candidate=resolve(work,'v2-root-release-candidate'),fallback=resolve(work,'v2-root-fallback');
for(const [directory,isFallback]of [[candidate,false],[fallback,true]]){
 const env={...process.env,ASG_TASK_OUTPUT_DIR:work,ASG_DIST_OUTPUT_DIR:directory,ASG_SITE_LAYOUT:'root',ASG_ROOT_RELEASE:'1',ASG_ROOT_FALLBACK:isFallback?'1':'0',ASG_V2_OUTPUT_DIR:resolve(work,'site-v2-compilation')};
 for(const script of ['scripts/build-v2.mjs','scripts/build-dist.mjs','tests/deployment/verify-dist.mjs','tests/deployment/verify-references.mjs','tests/deployment/check-root-seo.mjs','tests/deployment/smoke-dist.mjs'])execFileSync(process.execPath,[script],{cwd:root,env,stdio:'inherit'});
}
const meta=JSON.parse(await readFile(resolve(candidate,'build-meta.json'),'utf8'));
const version=new Date().toISOString().replace(/[:.]/g,'-')+'-'+meta.sourceSnapshotSha256.slice(0,12);
const bundle=resolve(tmp,'site-releases',version);await mkdir(bundle,{recursive:true});
const publicRoots=new Set((await tree(candidate)).map(p=>p.split('/')[0]));
const excluded=new Set(['preview','v1-source','v2-source','scripts','tests','design-research',...(config.legacyEnabled===false?['old']:[])]);
for(const first of await readdir(root))if(!publicRoots.has(first))excluded.add(first);
excluded.delete('_config.yml');
const pagesConfig='plugins: []\nexclude:\n'+[...excluded].sort().map(p=>'  - '+JSON.stringify(p)).join('\n')+'\n';
const deletions=[];
for(const directory of config.legacyEnabled===false?['preview','old']:['preview']){
 try{deletions.push(...(await tree(resolve(root,directory))).map(p=>directory+'/'+p));}catch(e){if(e.code!=='ENOENT')throw e;}
}
for(const [name,artifact,layout]of [['candidate',candidate,'root'],['fallback',fallback,'root-fallback']]){
 const payload=resolve(bundle,name);await cp(artifact,payload,{recursive:true});
 await writeFile(resolve(payload,'site-release.json'),JSON.stringify({schemaVersion:1,component:'site',layout,delivery:'main-branch-pages',legacyEnabled:name==='fallback'?true:config.legacyEnabled!==false,version},null,2)+'\n');
 await writeFile(resolve(payload,'_config.yml'),name==='fallback'?pagesConfig.replace('  - "old"\n',''):pagesConfig);
 const target=name==='candidate'?root:resolve(bundle,'candidate');
 const entries=await planFiles(payload,target,name==='candidate'?deletions:[]);
 const baseline=[];for(const path of await tree(payload))baseline.push({path,sha256:await fileHash(target,path)});
 await writeFile(resolve(bundle,name+'-plan.json'),JSON.stringify({schemaVersion:1,component:'site',version,sourceRevision:meta.revision,sourceSnapshotSha256:meta.sourceSnapshotSha256,baseline,entries},null,2)+'\n');
}
if(previous){
 execFileSync('git',['cat-file','-e',previous+'^{commit}'],{cwd:root});
 const zip=resolve(bundle,'previous-production-source.zip');
 execFileSync('git',['archive','--format=zip','--output='+zip,previous],{cwd:root});
 await writeFile(resolve(bundle,'previous-production.json'),JSON.stringify({revision:previous,archiveSha256:digest(await readFile(zip)),kind:'git-source-backup',edgeBackupIncluded:false},null,2)+'\n');
}
await cp(resolve(work,'root-redirects.json'),resolve(bundle,'root-redirects.json'));
await cp(resolve(work,'root-redirects-cloudflare.csv'),resolve(bundle,'root-redirects-cloudflare.csv'));
if((await releaseInput(root,inputOptions)).sha256!==input.sha256)throw Error('Source changed during preparation; work and incomplete bundle retained');
await atomicJson(resolve(bundle,'preparation-input.json'),input);
const inventory=[];
for(const path of await tree(bundle))inventory.push({path,sha256:digest(await readFile(resolve(bundle,path)))});
await writeFile(resolve(bundle,'bundle-inventory.json'),JSON.stringify({schemaVersion:1,version,files:inventory},null,2)+'\n');
await verifiedBundle(tmp,bundle);
for(const name of ['root-redirects.json','root-redirects-cloudflare.csv'])await cp(resolve(work,name),resolve(tmp,name));
await finishOwnedWork(tmp,owner,{keep:process.argv.includes('--keep-work')});
await atomicJson(resolve(tmp,'site-preparation-cache.json'),{key:input.sha256,version,bundle});
await atomicJson(resolve(tmp,'site-release-latest.json'),{version,bundle,status:'prepared-only',reused:false});
console.log('Prepared publication and fallback bundle: '+bundle+'\nNo source activation, commit, push or production change performed.');

// Local/CI preparation only: no Git staging, push, hosting settings or edge writes.
import {execFileSync} from 'node:child_process';
import {cp,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {siteRoot as root,readSiteRelease} from './site-release.mjs';
import {tree,digest,planFiles,fileHash} from './site-release-files.mjs';
const tmp=resolve(root,'../tmp');
const candidate=resolve(tmp,'v2-root-release-candidate'),fallback=resolve(tmp,'v2-root-fallback');
const config=await readSiteRelease();
for(const [directory,isFallback]of [[candidate,false],[fallback,true]]){
 const env={...process.env,ASG_DIST_OUTPUT_DIR:directory,ASG_SITE_LAYOUT:'root',ASG_ROOT_RELEASE:'1',ASG_ROOT_FALLBACK:isFallback?'1':'0',...(config.layout==='parallel'?{}:{ASG_V2_OUTPUT_DIR:resolve(tmp,'site-v2-compilation')})};
 for(const script of ['scripts/build-v2.mjs','scripts/build-dist.mjs','tests/deployment/verify-dist.mjs','tests/deployment/verify-references.mjs','tests/deployment/check-root-seo.mjs','tests/deployment/smoke-dist.mjs'])execFileSync(process.execPath,[script],{cwd:root,env,stdio:'inherit'});
}
const meta=JSON.parse(await readFile(resolve(candidate,'build-meta.json'),'utf8'));
const version=new Date().toISOString().replace(/[:.]/g,'-')+'-'+meta.sourceSnapshotSha256.slice(0,12);
const bundle=resolve(tmp,'site-releases',version);await mkdir(bundle,{recursive:true});
const publicRoots=new Set((await tree(candidate)).map(p=>p.split('/')[0]));
const excluded=new Set(['preview','v1-source','v2-source','scripts','tests','design-research']);
for(const first of await readdir(root))if(!publicRoots.has(first))excluded.add(first);
excluded.delete('_config.yml');
const pagesConfig='plugins: []\nexclude:\n'+[...excluded].sort().map(p=>'  - '+JSON.stringify(p)).join('\n')+'\n';
let deletions=[];try{deletions=(await tree(resolve(root,'preview'))).map(p=>'preview/'+p);}catch(e){if(e.code!=='ENOENT')throw e;}
for(const [name,artifact,layout]of [['candidate',candidate,'root'],['fallback',fallback,'root-fallback']]){
 const payload=resolve(bundle,name);await cp(artifact,payload,{recursive:true});
 await writeFile(resolve(payload,'site-release.json'),JSON.stringify({schemaVersion:1,component:'site',layout,delivery:'main-branch-pages',version},null,2)+'\n');
 await writeFile(resolve(payload,'_config.yml'),pagesConfig);
 const target=name==='candidate'?root:resolve(bundle,'candidate');
 const entries=await planFiles(payload,target,name==='candidate'?deletions:[]);
 const baseline=[];for(const path of await tree(payload))baseline.push({path,sha256:await fileHash(target,path)});
 await writeFile(resolve(bundle,name+'-plan.json'),JSON.stringify({schemaVersion:1,component:'site',version,sourceRevision:meta.revision,sourceSnapshotSha256:meta.sourceSnapshotSha256,baseline,entries},null,2)+'\n');
}
const previous=process.argv.includes('--previous-revision')?process.argv[process.argv.indexOf('--previous-revision')+1]:null;
if(previous){
 if(!/^[a-f0-9]{40}$/.test(previous))throw Error('Previous revision must be a full verified Git commit');
 execFileSync('git',['cat-file','-e',previous+'^{commit}'],{cwd:root});
 const zip=resolve(bundle,'previous-production-source.zip');
 execFileSync('git',['archive','--format=zip','--output='+zip,previous],{cwd:root});
 await writeFile(resolve(bundle,'previous-production.json'),JSON.stringify({revision:previous,archiveSha256:digest(await readFile(zip)),kind:'git-source-backup',edgeBackupIncluded:false},null,2)+'\n');
}
await cp(resolve(tmp,'root-redirects.json'),resolve(bundle,'root-redirects.json'));
await cp(resolve(tmp,'root-redirects-cloudflare.csv'),resolve(bundle,'root-redirects-cloudflare.csv'));
const inventory=[];
for(const path of await tree(bundle))inventory.push({path,sha256:digest(await readFile(resolve(bundle,path)))});
await writeFile(resolve(bundle,'bundle-inventory.json'),JSON.stringify({schemaVersion:1,version,files:inventory},null,2)+'\n');
await writeFile(resolve(tmp,'site-release-latest.json'),JSON.stringify({version,bundle,status:'prepared-only'},null,2)+'\n');
console.log('Prepared publication and fallback bundle: '+bundle+'\nNo source activation, commit, push or production change performed.');

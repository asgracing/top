import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lstat,mkdir,mkdtemp,readFile,readdir,rename,rm,statfs,writeFile} from 'node:fs/promises';
import {basename,resolve} from 'node:path';
import {assertChildPath} from './workspace-scratch.mjs';
import {digest,tree} from './site-release-files.mjs';

export async function atomicJson(path,value){
 const temporary=path+'.writing-'+randomUUID();
 try{await writeFile(temporary,JSON.stringify(value,null,2)+'\n',{flag:'wx'});await rename(temporary,path);}
 finally{await rm(temporary,{force:true});}
}

async function sourceFiles(root,prefix=''){
 const result=[];
 for(const item of await readdir(resolve(root,prefix),{withFileTypes:true})){
  if(['.git','node_modules','dist','dist.previous','.source-backups'].includes(item.name))continue;
  const path=prefix?prefix+'/'+item.name:item.name;
  if(item.isSymbolicLink())throw Error('Linked source is not cacheable: '+path);
  if(item.isDirectory())result.push(...await sourceFiles(root,path));else result.push(path);
 }
 return result.sort();
}

export async function releaseInput(root,options={}){
 let files,revision='unversioned';
 try{
  const git=args=>execFileSync('git',['-c','safe.directory='+root,...args],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore'],maxBuffer:16*1024*1024});
  if(resolve(git(['rev-parse','--show-toplevel']).trim())!==resolve(root))throw Error('Source is not this Git root');
  files=git(['ls-files','--cached','--others','--exclude-standard','-z']).split('\0').filter(Boolean).sort();
  revision=git(['rev-parse','HEAD']).trim();
 }catch{files=await sourceFiles(root);}
 const hash=createHash('sha256');let sourceBytes=0;
 hash.update(JSON.stringify({version:1,node:process.version,platform:process.platform,arch:process.arch,revision,...options}));
 for(const path of files){
  const target=assertChildPath(root,resolve(root,path));
  try{
   const info=await lstat(target);sourceBytes+=info.size;
   if(info.isSymbolicLink())throw Error('Linked source is not cacheable: '+path);
   hash.update(JSON.stringify([path,digest(await readFile(target))]));
  }catch(error){if(error.code!=='ENOENT')throw error;hash.update(JSON.stringify([path,null]));}
 }
 return {sha256:hash.digest('hex'),revision,sourceBytes};
}

export async function preparationBudget(task,sourceBytes){
 const info=await statfs(task),free=info.bavail*info.bsize;
 // Two compiled layouts, sealed copies, and a margin; cache hits allocate none.
 const peak=6*sourceBytes,reserve=2*1024**3;
 const record={schemaVersion:1,kind:'site-preparation',estimatedPeakBytes:peak,freeBytes:free,reserveBytes:reserve,checkedAt:new Date().toISOString()};
 await atomicJson(resolve(task,'site-preparation-budget.json'),record);
 if(free<peak+reserve)throw Error('Insufficient free space for site preparation peak and reserve');
 return record;
}

export async function verifiedBundle(task,bundle){
 const releases=assertChildPath(task,resolve(task,'site-releases'));
 assertChildPath(releases,bundle);
 const manifest=JSON.parse(await readFile(resolve(bundle,'bundle-inventory.json'),'utf8'));
 const actual=(await tree(bundle)).filter(path=>path!=='bundle-inventory.json');
 if(!Array.isArray(manifest.files)||JSON.stringify(actual)!==JSON.stringify(manifest.files.map(row=>row.path).sort()))throw Error('Cached release file set changed');
 for(const row of manifest.files){
  const target=assertChildPath(bundle,resolve(bundle,row.path));
  if(digest(await readFile(target))!==row.sha256)throw Error('Cached release bytes changed: '+row.path);
 }
 return manifest;
}

export async function cachedRelease(task,key){
 try{
  const cached=JSON.parse(await readFile(resolve(task,'site-preparation-cache.json'),'utf8'));
  if(cached.key!==key)return null;
  const manifest=await verifiedBundle(task,cached.bundle);
  if(manifest.version!==cached.version)throw Error('Cached release version changed');
  const receipt=JSON.parse(await readFile(resolve(cached.bundle,'preparation-input.json'),'utf8'));
  if(receipt.sha256!==key)throw Error('Cached input receipt changed');
  return cached;
 }catch(error){if(error.code==='ENOENT')return null;throw error;}
}

export async function ownedWork(task){
 const parent=assertChildPath(task,resolve(task,'work'));await mkdir(parent,{recursive:true});
 const directory=await mkdtemp(resolve(parent,'site-preparation-'));
 const owner={directory,token:randomUUID(),status:'working',createdAt:new Date().toISOString()};
 await atomicJson(resolve(directory,'work-owner.json'),owner);
 return owner;
}

export async function finishOwnedWork(task,owner,{keep=false}={}){
 const parent=assertChildPath(task,resolve(task,'work')),directory=assertChildPath(parent,owner.directory);
 if(!basename(directory).startsWith('site-preparation-'))throw Error('Unknown preparation output');
 const actual=JSON.parse(await readFile(resolve(directory,'work-owner.json'),'utf8'));
 if(actual.token!==owner.token||actual.directory!==directory)throw Error('Working directory ownership changed');
 if(keep){await atomicJson(resolve(directory,'work-owner.json'),{...actual,status:'retained',reason:'explicit --keep-work'});return;}
 await tree(directory); // Refuse a nested symlink/junction before recursive removal.
 await rm(directory,{recursive:true});
}

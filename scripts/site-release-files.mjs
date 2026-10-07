import {lstat,readFile,readdir} from 'node:fs/promises';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {createHash} from 'node:crypto';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export function safeTarget(base,path){
 if(!/^[\w.-]+(?:\/[\w.-]+)*$/.test(path)||path.split('/').some(p=>p==='.'||p==='..')||/(^|\/)(?:\.git|portal-secrets|private-cache|\.env)(\/|$)/i.test(path))throw Error('Unsafe release path '+path);
 const target=resolve(base,path),rel=relative(base,target);
 if(!rel||isAbsolute(rel)||rel.startsWith('..'+sep))throw Error('Release path escapes its target');
 return target;
}
export async function fileHash(base,path){
 const target=safeTarget(base,path);
 // Reject directory/file symlinks, including parent junctions.
 for(let current=target;current!==resolve(base);current=resolve(current,'..')){
  try{const info=await lstat(current);if(info.isSymbolicLink())throw Error('Symlink in release path '+path);}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 try{return digest(await readFile(target));}catch(e){if(e.code==='ENOENT')return null;throw e;}
}
export async function tree(base,prefix=''){
 const result=[];
 for(const item of await readdir(resolve(base,prefix),{withFileTypes:true})){
  const path=prefix?prefix+'/'+item.name:item.name;
  if(item.isSymbolicLink())throw Error('Symlink in release tree '+path);
  if(item.isDirectory())result.push(...await tree(base,path));else result.push(path);
 }
 return result.sort();
}
export async function planFiles(payload,target,deletions=[]){
 const entries=[];
 for(const path of await tree(payload)){
  const after=await fileHash(payload,path),before=await fileHash(target,path);
  if(before!==after)entries.push({path,action:'write',before,after});
 }
 for(const path of deletions)if(!entries.some(e=>e.path===path)){
  const before=await fileHash(target,path);if(before!==null)entries.push({path,action:'delete',before,after:null});
 }
 return entries;
}
export async function validatePlan(plan,payload,target){
 if(!Array.isArray(plan)||new Set(plan.map(e=>e.path)).size!==plan.length)throw Error('Invalid release plan');
 for(const item of plan){
  if(!['write','delete'].includes(item.action)||!/^(?:[a-f0-9]{64})?$/.test(item.before||'')||!/^(?:[a-f0-9]{64})?$/.test(item.after||''))throw Error('Invalid plan item');
  if(await fileHash(target,item.path)!==item.before)throw Error('Target changed since preparation: '+item.path);
  if(item.action==='write'&&await fileHash(payload,item.path)!==item.after)throw Error('Payload changed since preparation: '+item.path);
  if(item.action==='delete'&&(!item.path.startsWith('preview/')||item.after!==null))throw Error('Deletion is restricted to retired public Preview');
 }
}

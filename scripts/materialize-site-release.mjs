import {cp,mkdir,readFile,writeFile,unlink} from 'node:fs/promises';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {siteRoot} from './site-release.mjs';
import {safeTarget,digest,validatePlan,fileHash} from './site-release-files.mjs';
const argument=name=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:null;
const temporaryRoot=resolve(siteRoot,'../tmp');
function temporaryChild(value){
 if(!value)throw Error('A prepared bundle directory is required');
 const path=resolve(value),rel=relative(temporaryRoot,path);
 if(!rel||isAbsolute(rel)||rel==='..'||rel.startsWith('..'+sep))throw Error('Directory must remain inside workspace tmp');
 return path;
}
const bundle=temporaryChild(argument('--bundle'));
const kind=process.argv.includes('--fallback')?'fallback':'candidate';
const payload=resolve(bundle,kind);
const plan=JSON.parse(await readFile(resolve(bundle,kind+'-plan.json'),'utf8'));
const inventory=JSON.parse(await readFile(resolve(bundle,'bundle-inventory.json'),'utf8'));
for(const file of inventory.files)if(digest(await readFile(safeTarget(bundle,file.path)))!==file.sha256)throw Error('Sealed bundle changed: '+file.path);
if(plan.schemaVersion!==1||plan.component!=='site')throw Error('Invalid release component');
const activate=process.argv.includes('--activate-source');
const target=activate?siteRoot:temporaryChild(argument('--directory'));
for(const item of plan.baseline||[])if(await fileHash(target,item.path)!==item.sha256)throw Error('Release baseline changed: '+item.path);
await validatePlan(plan.entries,payload,target);
if(!process.argv.includes('--apply')){console.log(`Validated ${kind}: ${plan.entries.length} changes; no files changed.`);process.exit(0);}
const backup=resolve(temporaryRoot,'site-activation-backups',new Date().toISOString().replace(/[:.]/g,'-'));
await mkdir(backup,{recursive:true});
// Copy the entire before inventory before changing any target file.
for(const item of plan.entries)if(item.before!==null){const destination=safeTarget(backup,item.path);await mkdir(resolve(destination,'..'),{recursive:true});await cp(safeTarget(target,item.path),destination);}
const applied=[];
try{
 for(const item of plan.entries){
  const file=safeTarget(target,item.path);
  if(await fileHash(target,item.path)!==item.before)throw Error('Target changed during activation: '+item.path);
  applied.push(item);
  if(item.action==='delete')await unlink(file);
  else{await mkdir(resolve(file,'..'),{recursive:true});await writeFile(file,await readFile(safeTarget(payload,item.path)));}
 }
 for(const item of plan.entries)if(await fileHash(target,item.path)!==item.after)throw Error('Applied file differs: '+item.path);
}catch(error){
 const rollbackErrors=[];
 for(const item of applied.reverse())try{
  const file=safeTarget(target,item.path);
  if(item.before===null){try{await unlink(file);}catch(e){if(e.code!=='ENOENT')throw e;}}else await writeFile(file,await readFile(safeTarget(backup,item.path)));
 }catch(rollbackError){rollbackErrors.push(rollbackError);}
 if(rollbackErrors.length)throw new AggregateError([error,...rollbackErrors],'Activation failed; some rollback writes also failed. Restore from '+backup);
 throw error;
}
// Empty retired directories do not enter Git; CI checks files rather than their names.
await writeFile(resolve(backup,'activation.json'),JSON.stringify({component:'site',kind,version:plan.version,target,applied:plan.entries,utc:new Date().toISOString(),gitStaged:false,published:false},null,2)+'\n');
console.log(`Applied ${kind} locally: ${plan.entries.length} explicit files. Backup: ${backup}. No Git staging or push.`);

import {existsSync,mkdirSync,realpathSync} from 'node:fs';
import {basename,dirname,isAbsolute,relative,resolve,sep} from 'node:path';

const siteRoot=resolve(import.meta.dirname,'..');
export function findWorkspaceRoot(sourceRoot=siteRoot,markerExists=existsSync){
 for(let directory=dirname(sourceRoot);;directory=dirname(directory)){
  if(markerExists(resolve(directory,'WORKSPACE.md')))return directory;
  // Standalone CI has no workspace map. Copied build fixtures still live in
  // its known _archive/tmp hierarchy and must share the original scratch root.
  if(basename(directory)==='_archive'&&relative(directory,sourceRoot).startsWith('tmp'+sep))return dirname(directory);
  if(dirname(directory)===directory)return dirname(sourceRoot);
 }
}
export const workspaceRoot=findWorkspaceRoot();
export const archiveScratchRoot=resolve(workspaceRoot,'_archive/tmp');

function childOf(parent,child){
 const part=relative(parent,child);
 return Boolean(part)&&!isAbsolute(part)&&part!=='..'&&!part.startsWith('..'+sep);
}
// Check existing ancestors as well: a junction must not redirect output outside
// the selected scratch directory. The archive itself is never a cleanup target.
export function assertChildPath(parent,value){
 parent=resolve(parent);const child=resolve(value);
 if(!childOf(parent,child))throw Error('Output must remain inside '+parent);
 let existing=child;
 while(!existsSync(existing)&&dirname(existing)!==existing)existing=dirname(existing);
 let parentExisting=parent;
 while(!existsSync(parentExisting)&&dirname(parentExisting)!==parentExisting)parentExisting=dirname(parentExisting);
 const physicalParent=resolve(realpathSync(parentExisting),relative(parentExisting,parent));
 const physicalChild=resolve(realpathSync(existing),relative(existing,child));
 if(!childOf(physicalParent,physicalChild))throw Error('Output ancestor redirects outside '+parent);
 return child;
}
export function assertArchiveScratchPath(value){
 if(!value)throw Error('A scratch output directory is required');
 return assertChildPath(archiveScratchRoot,value);
}
export function taskScratchPath(...parts){
 const task=assertArchiveScratchPath(process.env.ASG_TASK_OUTPUT_DIR||resolve(archiveScratchRoot,new Date().toISOString().slice(0,10),'site-local'));
 const output=parts.length?assertChildPath(task,resolve(task,...parts)):task;
 mkdirSync(parts.length?dirname(output):task,{recursive:true});
 return output;
}

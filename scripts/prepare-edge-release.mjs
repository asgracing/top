import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {edgePlan,bulkCsv} from './edge-release-plan.mjs';
const directory=resolve(import.meta.dirname,'../../tmp/v2-edge-preparation');
await mkdir(directory,{recursive:true});
const files=[];
for(const status of [302,301]){
 for(const [file,data]of [[`edge-plan-${status}.json`,JSON.stringify(edgePlan(status),null,2)+'\n'],[`bulk-redirects-${status}.csv`,bulkCsv(status)]]){
  await writeFile(resolve(directory,file),data);
  files.push({file,sha256:createHash('sha256').update(data).digest('hex')});
 }
}
await writeFile(resolve(directory,'inventory.json'),JSON.stringify({schemaVersion:1,component:'site-edge',status:'prepared-not-applied',CloudflareValidation:false,productionChanged:false,files},null,2)+'\n');
console.log('Prepared disabled edge rule specifications: 8 entity Single Redirects; 1 list / 574 exact HTTP+HTTPS root/www mappings. No external configuration changed.');

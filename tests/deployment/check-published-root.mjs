import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {root,dist} from '../../scripts/dist-paths.mjs';
const manifest=JSON.parse(await readFile(resolve(dist,'asset-manifest.json'),'utf8'));
const digest=b=>createHash('sha256').update(b).digest('hex');
const failures=[];
for(const asset of manifest.assets){
 try{if(digest(await readFile(resolve(root,asset.path)))!==asset.sha256)failures.push('Stale published output: '+asset.path);}catch{failures.push('Missing published output: '+asset.path);}
}
async function hasFiles(path){for(const item of await readdir(path,{withFileTypes:true})){if(item.isDirectory()){if(await hasFiles(resolve(path,item.name)))return true;}else return true;}return false;}
try{if(await hasFiles(resolve(root,'preview')))failures.push('Retired public Preview files are still present');}catch(e){if(e.code!=='ENOENT')throw e;}
const config=await readFile(resolve(root,'_config.yml'),'utf8');
for(const path of ['v1-source','v2-source','scripts','tests','design-research','preview'])if(!config.includes(`  - "${path}"`))failures.push('Pages must exclude '+path);
if(failures.length)throw Error(failures.join('\n'));
console.log(`Published root matches the source build: ${manifest.assets.length} assets; Preview absent; source/test directories excluded from Pages.`);

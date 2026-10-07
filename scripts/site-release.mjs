import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
export const siteRoot=resolve(import.meta.dirname,'..');
export async function readSiteRelease(root=siteRoot){
 let config;try{config=JSON.parse(await readFile(resolve(root,'site-release.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return {layout:'parallel'};throw e;}
 if(config.schemaVersion!==1||config.component!=='site'||!['parallel','root','root-fallback'].includes(config.layout)||config.delivery!=='main-branch-pages')throw Error('Invalid site-release configuration');
 return config;
}

// Legacy DOM checks still test the maintained legacy interface after root migration.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readSiteRelease,siteRoot} from './site-release.mjs';
import {readV1Html} from './v1-source.mjs';
import {renderLocalizedPages} from './generate-localized-pages.mjs';
const config=await readSiteRelease();
let localized;
export async function readClassicQuality(path){
 if(config.layout==='parallel')return readFile(resolve(siteRoot,path),'utf8');
 if(path==='sitemap.xml')return readFile(resolve(siteRoot,'v1-source/sitemap.xml'),'utf8');
 localized??=(await renderLocalizedPages()).outputs;
 return localized.get(path)??readV1Html(path);
}

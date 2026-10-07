import {pageRegistry} from '../v2/page-registry.js';
import {readFileSync} from 'node:fs';
import {v1SourceManifest} from './v1-source.mjs';
import {screenPath,excludedRoute,routeHref} from '../v2/site-routing.js';
// Exact page paths only: no prefix rule can intercept V2 scripts, images or API.
const aliases={'events/':'hourly/championship/','hourly/privacy/':'privacy/','hourly/cookies/':'cookies/'};
const previewRoutes=JSON.parse(readFileSync(new URL('../v1-source/retired-preview-routes.json',import.meta.url),'utf8'));
const map=new Map();
function add(source,target,kind){
 if(source===target)return;
 if(map.has(source)&&map.get(source).target!==target)throw Error('Conflicting redirect '+source);
 map.set(source,{source,target,status:301,preserveQuery:true,kind});
 if(source.endsWith('/')&&source!=='/')map.set(source.slice(0,-1),{source:source.slice(0,-1),target,status:301,preserveQuery:true,kind});
}
for(const page of pageRegistry){
 add('/ru/'+page.route,page.target.ru,'language');
 for(const lang of ['ru','en'])add('/v2/'+lang+'/'+page.route,page.target[lang],'v2');
}
add('/v2/','/','v2');
for(const path of previewRoutes){
 const lang=path.startsWith('/ru/')?'ru':'en';
 let route=screenPath(path);if(path==='/404.html')route='404/';
 route=aliases[route]||route;
 const target=path==='/'?'/':excludedRoute(route)?'/'+route:routeHref(route,lang,{layout:'root',version:'v2'});
 add('/preview'+path,target,'preview');
}
add('/preview','/','preview');
for(const path of v1SourceManifest.templates.filter(p=>p.endsWith('index.ru.html'))){
 const route=screenPath(path);add('/'+path,routeHref(aliases[route]||route,'ru',{layout:'root',version:'v2'}),'language');
}
for(const [source,target]of Object.entries(aliases))for(const lang of ['ru','en']){
 add((lang==='en'?'/en/':'/')+source,routeHref(target,lang,{layout:'root',version:'v2'}),'alias');
 add('/ru/'+source,routeHref(target,'ru',{layout:'root',version:'v2'}),'alias');
}
export const redirects=[...map.values()].sort((a,b)=>a.source.localeCompare(b.source));
export function redirectFor(value){
 const url=new URL(value,'https://asgracing.ru'),item=map.get(url.pathname);
 return item?item.target+url.search+url.hash:null;
}
export const cloudflareCsv=()=>redirects.map(r=>`https://asgracing.ru${r.source},https://asgracing.ru${r.target},301,true,false,false,false`).join('\n')+'\n';

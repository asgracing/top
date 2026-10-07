// Writes the root/en/old layout ONLY inside an explicitly selected local artifact.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {dist,root} from './dist-paths.mjs';
import {readV1Html,v1SourceManifest} from './v1-source.mjs';
import {renderLocalizedPages} from './generate-localized-pages.mjs';
import {nodes,edit,setAttribute} from './seo/html-source.mjs';
import {pageRegistry} from '../v2/page-registry.js';
import {scopeSiteHref,routeHref,legacyRoutes,versionHref,excludedRoute} from '../v2/site-routing.js';
if(process.env.ASG_SITE_RELEASE_BUILD!=='1'&&(!process.env.ASG_DIST_OUTPUT_DIR||dist===resolve(root,'dist')))throw Error('Root layout requires an isolated artifact or an explicit site-release build');
const origin='https://asgracing.ru',context={layout:'root',version:'v2'};
const {outputs:localized}=await renderLocalizedPages();
const readClassic=path=>localized.get(path)??readV1Html(path);
async function emit(path,html){await mkdir(resolve(dist,path,'..'),{recursive:true});await writeFile(resolve(dist,path),html.replace(/[\t ]+$/gm,''));}
export function links(html,language,owner,version,sourcePath=owner){
  const changes=[],location={href:origin+owner,origin,pathname:owner};
  for(const node of nodes(html)){
    let tag=html.slice(node.start,node.openEnd);
    if(node.name==='html'){tag=setAttribute(tag,'data-site-layout','root');tag=setAttribute(tag,'data-site-version',version);tag=setAttribute(tag,'lang',language);tag=setAttribute(tag,'data-page-language',language);}
    for(const attribute of ['href','src','poster']){
      const value=node.attrs[attribute];if(!value||/^(?:#|mailto:|tel:|javascript:|data:|blob:)/i.test(value))continue;
      const url=new URL(value.replaceAll('&amp;','&'),origin+sourcePath);if(url.origin!==origin)continue;
      let mapped=url.pathname+url.search+url.hash;
      if(node.name==='a'){
        const lang=node.attrs['data-lang']||node.attrs['data-language']||language;
        if(/\sdata-v1-home(?:\s|=|>)/.test(tag))mapped=versionHref('old',location,language,context);
        else if(/\sdata-v2-home(?:\s|=|>)/.test(tag))mapped=versionHref('v2',location,language,{layout:'root',version:'old'});
        else mapped=scopeSiteHref(mapped,lang,location,{layout:'root',version});
      }
      tag=setAttribute(tag,attribute,mapped);
    }
    if(node.name==='meta'&&node.attrs.name==='robots')tag=setAttribute(tag,'content','noindex,follow');
    if(node.name==='meta'&&node.attrs.name==='legal-base-path')tag=setAttribute(tag,'content',version==='old'?`/old/${language==='en'?'en/':''}`:language==='en'?'/en/':'/');
    if(node.attrs['data-bg-options'])tag=setAttribute(tag,'data-bg-options',node.attrs['data-bg-options'].split('|').map(value=>new URL(value,origin+sourcePath).pathname).join('|'));
    if(tag!==html.slice(node.start,node.openEnd))changes.push({start:node.start,end:node.openEnd,value:tag});
  }
  return edit(html,changes);
}
const written=[];
for(const language of ['ru','en'])for(const page of pageRegistry){
  const path=page.target[language],source=await readFile(resolve(dist,`v2/${language}/${page.route}index.html`),'utf8');
  let html=links(source,language,path,'v2');
  html=html.replace(/(<a\b[^>]*\bdata-v1-home\b[^>]*>)[\s\S]*?(<\/a>)/g,`$1${language==='ru'?'Старый сайт':'Old site'}$2`);
  const counterpart=versionHref('old',{href:origin+path,pathname:path,origin},language,context);
  html=html.replace(/(<a\b[^>]*data-v1-home[^>]*href=")[^"]+/,`$1${counterpart}`);
  // Explicit current-language title; the body and actions remain the V2 render.
  html=html.replace(/content="https:\/\/asgracing\.ru\/v2\/(?:ru|en)\/[^\"]*"/g,`content="${origin+path}"`);
  await emit(path.slice(1)+'index.html',html);written.push({path,version:'v2',language,screen:page.screen});
}
for(const language of ['ru','en'])for(const path of legacyRoutes){
  const original=(language==='ru'&&localized.has('ru/'+path+'index.html')?'ru/':'')+path+'index.html';
  if(!localized.has(original)&&!v1SourceManifest.templates.includes(original))throw Error('Missing legacy owner: '+original);
  const target=`/old/${language==='en'?'en/':''}${path}`;
  let html=links(await readClassic(original),language,target,'old','/'+original);
  const alias={'events/':'hourly/championship/','hourly/privacy/':'privacy/','hourly/cookies/':'cookies/'}[path];
  if(alias){
    const destination=routeHref(alias,language,{layout:'root',version:'old'});
    html=`<!doctype html><html lang="${language}" data-site-layout="root" data-site-version="old"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><title>ASG Racing</title></head><body><a href="${destination}">ASG Racing</a><script>const u=new URL(location.href);u.searchParams.delete('lang');location.replace(${JSON.stringify(destination)}+u.search+u.hash)</script></body></html>`;
  }
  html=html.replace(/<link\b[^>]*rel="(?:canonical|alternate)"[^>]*>/g,'').replace(/<meta\b[^>]*name="robots"[^>]*>/g,'');
  const current=routeHref(path==='events/'?'hourly/championship/':path,language,context);
  const canonical=pageRegistry.some(page=>page.target[language]===current)?`<link rel="canonical" href="${origin+current}">`:'';
  html=html.replace('</head>',`<meta name="robots" content="noindex,follow">${canonical}</head>`)
    .replace('</body>','<script type="module" src="/v2/legacy-navigation.js?v=20261007root2"></script></body>');
  await emit(target.slice(1)+'index.html',html);written.push({path:target,version:'old',language});
}
// The excluded flows stay at their real native locations with original auth gates.
for(const path of v1SourceManifest.templates.filter(path=>excludedRoute(path)))await emit(path,await readV1Html(path));
// Keep the HTTP 404 response; the browser may open the full localized error view.
await emit('404.html',`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><title>Страница не найдена · ASG Racing</title></head><body><h1>Страница не найдена / Page not found</h1><a href="/">ASG Racing</a><script>const l=/^\\/en(?:\\/|$)/.test(location.pathname)?'/en':'';if(!location.pathname.endsWith('/404.html'))location.replace(l+'/404/?path='+encodeURIComponent(location.pathname)+location.hash)</script></body></html>`);
await emit('route-map.json',JSON.stringify({schemaVersion:1,layout:'root',status:'local-review-noindex',pages:written},null,2)+'\n');
console.log(`Prepared root/en/old layout: ${written.length} pages. SEO/indexing and edge redirects remain separate release steps.`);

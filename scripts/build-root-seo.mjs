import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {dist,root} from './dist-paths.mjs';
import {pageRegistry} from '../v2/page-registry.js';
import {redirects,cloudflareCsv} from './root-redirects.mjs';
import {nodes,edit,setAttribute,escape} from './seo/html-source.mjs';
const origin='https://asgracing.ru';
if(process.env.ASG_ROOT_RELEASE!=='1')throw Error('Release SEO is opt-in; review pages stay noindex');
const verification=nodes(await readFile(resolve(process.env.ASG_V2_OUTPUT_DIR||root,'v2/ru/index.html'),'utf8')).filter(n=>['google-site-verification','yandex-verification'].includes(n.attrs.name));
async function emit(path,source){await mkdir(dirname(resolve(dist,path)),{recursive:true});await writeFile(resolve(dist,path),source);}
for(const page of pageRegistry)for(const lang of ['ru','en']){
 const target=page.target[lang],file=target.slice(1)+'index.html';let html=await readFile(resolve(dist,file),'utf8');
 const parsed=nodes(html),decode=s=>String(s||'').replaceAll('&amp;','&').replaceAll('&quot;','"');
 const titleNode=parsed.find(n=>n.name==='title');
 const title=page.title?.[lang]?page.title[lang]+' · ASG Racing':decode(html.slice(titleNode.openEnd,titleNode.close));
 const description=page.description?.[lang]||decode(parsed.find(n=>n.attrs.name==='description')?.attrs.content);
 const changes=[];
 for(const node of parsed.filter(n=>n.name==='meta')){
  const key=node.attrs.name||node.attrs.property;
  const value=['description','og:description','twitter:description'].includes(key)?description:['og:title','twitter:title'].includes(key)?title:null;
  if(value!==null)changes.push({start:node.start,end:node.openEnd,value:setAttribute(html.slice(node.start,node.openEnd),'content',value)});
 }
 html=edit(html,changes).replace(/<title>[\s\S]*?<\/title>/,`<title>${escape(title)}</title>`);
 for(const node of verification)if(!parsed.some(n=>n.attrs.name===node.attrs.name&&n.attrs.content===node.attrs.content))html=html.replace('</head>',`<meta name="${node.attrs.name}" content="${node.attrs.content}"></head>`);
 for(const [attribute,key,value]of [['name','description',description],['property','og:title',title],['property','og:description',description],['name','twitter:title',title],['name','twitter:description',description]])if(!parsed.some(n=>n.attrs[attribute]===key))html=html.replace('</head>',`<meta ${attribute}="${key}" content="${escape(value)}"></head>`);
 html=html.replace(/<link\b[^>]*rel="(?:canonical|alternate)"[^>]*>/g,'').replace(/<meta\b[^>]*(?:name="robots"|property="og:(?:url|locale|locale:alternate)")[^>]*>/g,'');
 const head=`<meta name="robots" content="${page.indexable?'index,follow':'noindex,follow'}"><link rel="canonical" href="${origin+target}"><link rel="alternate" hreflang="ru-RU" href="${origin+page.target.ru}"><link rel="alternate" hreflang="en" href="${origin+page.target.en}"><link rel="alternate" hreflang="x-default" href="${origin+page.target.ru}"><meta property="og:url" content="${origin+target}"><meta property="og:locale" content="${lang==='ru'?'ru_RU':'en_GB'}"><meta property="og:locale:alternate" content="${lang==='ru'?'en_GB':'ru_RU'}">`;
 await emit(file,html.replace('</head>',head+'</head>'));
}
// Public query-based details keep the legacy indexing permission without adding
// empty detail URLs or a generated inventory of entities to the sitemap.
const sitemap=pageRegistry.filter(p=>p.indexable&&p.sitemap!==false).flatMap(p=>['ru','en'].map(lang=>`  <url><loc>${origin+p.target[lang]}</loc><xhtml:link rel="alternate" hreflang="ru-RU" href="${origin+p.target.ru}"/><xhtml:link rel="alternate" hreflang="en" href="${origin+p.target.en}"/><xhtml:link rel="alternate" hreflang="x-default" href="${origin+p.target.ru}"/></url>`));
await emit('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sitemap.join('\n')}\n</urlset>\n`);
await emit('robots.txt','User-agent: *\nAllow: /\n\nSitemap: https://asgracing.ru/sitemap.xml\n');
// Client-side fallbacks are useful locally, but do not replace real edge 301s.
for(const item of redirects.filter(r=>r.kind!=='preview'&&(r.source.endsWith('/')||r.source.endsWith('.html')))){
 const file=item.source.slice(1)+(item.source.endsWith('/')?'index.html':'');
 await emit(file,`<!doctype html><html lang="${item.target.startsWith('/en/')?'en':'ru'}"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><link rel="canonical" href="${origin+item.target}"><title>ASG Racing</title></head><body><a href="${item.target}">ASG Racing</a><script>location.replace(${JSON.stringify(item.target)}+location.search+location.hash)</script></body></html>`);
}
const map=JSON.parse(await readFile(resolve(dist,'route-map.json'),'utf8'));map.status='release-candidate-awaiting-approval';map.previewIncluded=false;await emit('route-map.json',JSON.stringify(map,null,2)+'\n');
// Operational artifacts remain beside the build, outside the public payload.
await writeFile(resolve(dist,'../root-redirects.json'),JSON.stringify({schemaVersion:1,status:'not-applied',redirects},null,2)+'\n');
await writeFile(resolve(dist,'../root-redirects-cloudflare.csv'),cloudflareCsv());
console.log(`Root SEO: ${sitemap.length} sitemap URLs; ${redirects.length} exact redirect mappings prepared, none applied externally. Preview omitted.`);

// Legacy interface at the NEW addresses: cached /ru/ -> / must stay valid.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {dist} from './dist-paths.mjs';
import {pageRegistry} from '../v2/page-registry.js';
import {versionHref} from '../v2/site-routing.js';
import {nodes,edit} from './seo/html-source.mjs';
import {links} from './build-root-layout.mjs';
const origin='https://asgracing.ru';
const verification=nodes(await readFile(resolve(dist,'v2/ru/index.html'),'utf8')).filter(n=>['google-site-verification','yandex-verification','yandex-metrika-id'].includes(n.attrs.name));
const verificationSource=await readFile(resolve(dist,'v2/ru/index.html'),'utf8');
for(const page of pageRegistry)for(const lang of ['ru','en']){
 if(page.route==='404/')continue;
 const target=page.target[lang];
 const classic=new URL(versionHref('old',{href:origin+target,origin,pathname:target},lang,{layout:'root',version:'v2'}),origin);
 let html=await readFile(resolve(dist,classic.pathname.slice(1),'index.html'),'utf8');
 html=links(html,lang,target,'v2',classic.pathname+'index.html');
 html=html.replace('<head>','<head><script>document.documentElement.dataset.siteFallback="1";const u=new URL(location.href);if(/\\/race\\/$/.test(u.pathname)&&u.searchParams.has("id")){u.searchParams.set("race_id",u.searchParams.get("id"));u.searchParams.delete("id")}if(/\\/news\\/article\\/$/.test(u.pathname)&&u.searchParams.has("id")){u.searchParams.set("slug",u.searchParams.get("id"));u.searchParams.delete("id")}history.replaceState(null,"",u.pathname+u.search+u.hash)</script>');
 if(page.route==='documents/read/'){
  const cookie=await readFile(resolve(dist,`old/${lang==='en'?'en/':''}cookies/index.html`),'utf8');
  const main=nodes(cookie).find(n=>n.name==='main');
  if(!main)throw Error('Missing legacy cookie policy');
  const content=links(cookie.slice(main.start,main.end),lang,target,'v2',classic.pathname+'index.html');
  const code=`if(new URL(location.href).searchParams.get('id')==='cookies'){document.querySelector('main').outerHTML=${JSON.stringify(content).replaceAll('</script','<\\/script')};}`;
  html=html.replace('</body>',`<script>${code}</script></body>`);
 }
 if(!/src="\/legal\.js/.test(html)){
  html=html.replace('</body>','<script src="/legal.js?v=20261007root1" defer></script></body>');
 }
 for(const node of verification)if(!html.includes(`name="${node.attrs.name}"`))html=html.replace('</head>',verificationSource.slice(node.start,node.openEnd)+'</head>');
 const changes=nodes(html).filter(n=>n.attrs['data-v2-home']!==undefined||n.attrs['data-site-version-link']!==undefined).map(n=>({start:n.start,end:n.end,value:''}));
 html=edit(html,changes);
 await writeFile(resolve(dist,target.slice(1),'index.html'),html);
}
await import('./build-root-seo.mjs');
const file=resolve(dist,'route-map.json'),map=JSON.parse(await readFile(file,'utf8'));
map.status='root-fallback-ready';map.fallback=true;
await writeFile(file,JSON.stringify(map,null,2)+'\n');
console.log('Prepared legacy fallback at all 58 new RU/EN addresses.');

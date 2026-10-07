// Compile the maintained V1 editorial/legal HTML, never research snapshots.
import {nodes,edit} from './seo/html-source.mjs';
const inner=(html,node)=>html.slice(node.openEnd,node.close);
const plain=html=>html.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
const has=(node,css)=>(node.attrs.class||'').split(' ').includes(css);
function absoluteLinks(html,path){
 return html.replace(/\b(href|src)="([^"]+)"/g,(m,attr,value)=>{
  if(/^(?:[a-z]+:|#)/i.test(value))return m;
  const u=new URL(value,'https://asgracing.ru/'+path);
  return `${attr}="${u.pathname}${u.search}${u.hash}"`;
 });
}
export function extractGuide(html,path){
 const all=nodes(html),main=all.find(n=>n.name==='main');
 if(!main)throw Error('Guide main missing: '+path);
 const inside=all.filter(n=>n.start>main.start&&n.end<main.end),h1=inside.find(n=>n.name==='h1'),intro=inside.find(n=>n.name==='p');
 const sections=inside.filter(n=>n.name==='section').map(n=>{
  const heading=inside.find(h=>h.name==='h2'&&h.start>n.start&&h.end<n.end);
  if(!heading)throw Error('Guide heading missing: '+path);
  return {title:plain(inner(html,heading)),html:absoluteLinks(edit(inner(html,n),[{start:heading.start-n.openEnd,end:heading.end-n.openEnd,value:''}]).trim(),path)};
 });
 if(!h1||!intro||!sections.length)throw Error('Incomplete guide: '+path);
 return {title:plain(inner(html,h1)),intro:plain(inner(html,intro)),sections,source:'/'+path.replace(/index.html$/,'')};
}
export function extractDocument(html,path){
 const all=nodes(html),header=all.find(n=>n.name==='header'&&has(n,'legal-hero'));
 if(!header)throw Error('Legal header missing: '+path);
 const sections=all.filter(n=>n.name==='section'&&has(n,'legal-card')).map((n,i)=>{
  const heading=all.find(h=>h.name==='h2'&&h.start>n.start&&h.end<n.end);
  const source=inner(html,n);
  return {id:'section-'+(i+1),title:heading?plain(inner(html,heading)):'Введение',html:absoluteLinks(heading?edit(source,[{start:heading.start-n.openEnd,end:heading.end-n.openEnd,value:''}]):source,path).trim()};
 });
 const h1=all.find(n=>n.name==='h1'&&n.start>header.start&&n.end<header.end);
 if(!h1||!sections.length)throw Error('Incomplete legal document: '+path);
 return {title:plain(inner(html,h1)),intro_html:absoluteLinks(html.slice(header.start,header.end).replace('legal-hero','legal-header').replace(/<(\/?)h1\b/g,'<$1h2'),path),sections,source:'/'+path.replace(/index.html$/,''),official_language:'ru'};
}
export async function compileInformation(read){
 const guides={};
 for(const id of ['join','about']){
  guides[id]={};
  for(const lang of ['ru','en']){
   const path=(lang==='ru'?'ru/':'')+id+'/index.html';
   guides[id][lang]=extractGuide(await read(path),path);
  }
 }
 const documents={};
 for(const id of ['privacy','cookies']){
  const path=id+'/index.html';documents[id]=extractDocument(await read(path),path);
 }
 return {guides,documents};
}

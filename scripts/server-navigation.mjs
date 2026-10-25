import {nodes} from './seo/html-source.mjs';

// Preserved classic pages share neither V2's template nor its navigation runtime.
export function addServerNavigation(html, language, href) {
  if (html.includes('data-server-nav')) return html;
  const tree=nodes(html),hasClass=(node,value)=>(node.attrs.class||'').split(/\s+/).includes(value);
  const racing=tree.find(node=>node.attrs.id==='top-nav-racing-group');
  const menu=tree.find(node=>hasClass(node,'top-nav-group-menu')&&(!racing||node.start>racing.start&&node.end<racing.end))
    ||tree.find(node=>hasClass(node,'top-nav-menu'))
    ||tree.find(node=>node.name==='nav');
  if (!menu) return html;
  const label=language==='ru'?'Серверы':'Servers';
  const link=`<a class="top-nav-group-link" data-server-nav href="${href}">${label}</a>`;
  return html.slice(0,menu.close)+link+html.slice(menu.close);
}

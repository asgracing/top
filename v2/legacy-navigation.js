// Scope only newly rendered anchors; never observe style/class updates or poll.
import {scopeSiteHref,siteContext,versionHref,languageHref} from './site-routing.js?v=20261007root1';
import {ensureHomeVersionSwitch} from '../src/features/home-version-switch.js?v=20261007root1';
const language=document.documentElement.dataset.pageLanguage==='en'?'en':'ru';
const context=siteContext();
function scope(root){
  const links=root.matches?.('a[href]')?[root]:[...root.querySelectorAll?.('a[href]')||[]];
  for(const link of links){
    if(link.hasAttribute('data-v2-home')||link.hasAttribute('data-site-version-link')){link.href=versionHref('v2',location,language);continue;}
    if(link.classList.contains('lang-btn'))continue;
    const current=link.getAttribute('href'),next=scopeSiteHref(current,language,location,context);
    if(current!==next)link.setAttribute('href',next);
  }
}
if(context.layout==='root'&&(context.version==='old'||document.documentElement.dataset.siteFallback==='1')){
  // Native private pages use buttons and reload-based language handlers.
  // In the preserved layout the URL, rather than saved state, owns language.
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('.lang-btn[data-lang]');
    if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    location.assign(languageHref(button.dataset.lang,location,context));
  },true);
  scope(document.body);
  new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)scope(node);ensureHomeVersionSwitch();}).observe(document.body,{childList:true,subtree:true});
}

// Only the home pages have a V2 equivalent in this release.
const nav=document.querySelector('.top-nav-actions');
if(nav&&!nav.querySelector('[data-v2-home]')){
  const language=document.documentElement.dataset.pageLanguage==='ru'?'ru':'en';
  const anchor=document.createElement('a');anchor.dataset.v2Home='';anchor.href='/v2/'+language+'/'+location.search+location.hash;anchor.textContent=language==='ru'?'Новая версия · V2':'New version · V2';
  Object.assign(anchor.style,{border:'1px solid #43566a',borderRadius:'4px',padding:'7px 10px',fontSize:'12px',color:'#dbe7f5',whiteSpace:'nowrap'});
  nav.prepend(anchor);
}

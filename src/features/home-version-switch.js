// Only the home pages have a V2 equivalent in this release.
const nav=document.querySelector('.top-nav-menu');
if(nav&&!nav.querySelector('[data-v2-home]')){
  const language=document.documentElement.dataset.pageLanguage==='ru'?'ru':'en';
  const anchor=document.createElement('a');anchor.dataset.v2Home='';anchor.dataset.navItem='true';anchor.className='top-nav-link top-nav-link-secondary';anchor.href='/v2/'+language+'/'+location.search+location.hash;anchor.textContent=language==='ru'?'Сайт v2':'Site v2';
  Object.assign(anchor.style,{border:'1px solid #43566a',borderRadius:'4px',padding:'7px 10px',fontSize:'12px',color:'#dbe7f5',whiteSpace:'nowrap'});
  nav.prepend(anchor);
}

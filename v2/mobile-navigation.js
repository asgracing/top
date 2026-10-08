// Move the existing links rather than maintain a separate mobile menu.
export function createMobileNavigation({header,host,text}) {
  const nav=header.querySelector('.navigation'),media=matchMedia('(max-width:600px)');
  const button=document.createElement('button');button.type='button';button.id='v2-menu-trigger';
  button.className='mobile-menu-trigger';button.setAttribute('aria-controls','v2-mobile-menu');
  button.setAttribute('aria-expanded','false');button.setAttribute('aria-label',text('Открыть меню','Open menu'));
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  const panel=document.createElement('div');panel.id='v2-mobile-menu';panel.className='mobile-menu';
  panel.setAttribute('popover','auto');panel.setAttribute('aria-label',text('Меню сайта','Site menu'));
  const head=document.createElement('div');head.className='mobile-menu-head';
  const title=document.createElement('b');title.textContent=text('Меню','Menu');
  const exit=document.createElement('button');exit.type='button';exit.textContent='×';
  exit.setAttribute('aria-label',text('Закрыть меню','Close menu'));head.append(title,exit);
  const body=document.createElement('div'),settings=document.createElement('div');settings.className='mobile-menu-settings';
  panel.append(head,body,settings);header.append(panel);host.append(button);
  const items=[nav,...host.querySelectorAll('.version-switch,.v2-language')].map(node=>{
    const placeholder=document.createComment('desktop navigation position');node.before(placeholder);return {node,placeholder};
  });
  function close(focus=false) {
    if(panel.matches(':popover-open'))panel.hidePopover();
    button.setAttribute('aria-expanded','false');
    nav.querySelectorAll('details[open]').forEach(group=>group.open=false);
    if(focus)button.focus({preventScroll:true});
  }
  function place() {
    const top=Math.min(header.getBoundingClientRect().bottom+6,innerHeight-100);
    panel.style.top=Math.max(8,top)+'px';panel.style.maxHeight=`calc(100dvh - ${Math.max(8,top)+8}px)`;
  }
  function layout() {
    close();
    for(const {node,placeholder} of items)media.matches?(node===nav?body:settings).append(node):placeholder.after(node);
    header.classList.toggle('has-mobile-navigation',media.matches);
  }
  button.addEventListener('click',()=>{
    if(panel.matches(':popover-open')){close(true);return;}
    panel.showPopover();place();button.setAttribute('aria-expanded','true');exit.focus({preventScroll:true});
  });
  panel.addEventListener('toggle',()=>button.setAttribute('aria-expanded',String(panel.matches(':popover-open'))));
  exit.addEventListener('click',()=>close(true));
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close(true);}});
  let openedReference=false;
  panel.addEventListener('click',event=>{
    if(event.target.closest('a,.navigation button')){
      openedReference=Boolean(event.target.closest('[data-modal]'));close();
    }
  });
  document.getElementById('v2-modal')?.addEventListener('close',()=>{
    if(openedReference&&media.matches)button.focus({preventScroll:true});openedReference=false;
  });
  window.addEventListener('resize',()=>{if(panel.matches(':popover-open'))place();});
  media.addEventListener('change',layout);layout();
  return {close};
}

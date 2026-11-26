import {watchHomeVersion} from '../site-config.js';

// Reuse the selected homepage's statistics surface without its center offer.
export function mountPollStats({view,home,language='ru'}){
  const stats=home.querySelector('.stats-panel'),panel=document.querySelector('.support-panel');
  if(!stats||!panel)return;
  const funding=panel.querySelector('.support-body'),heading=panel.querySelector('.panel-head');
  const title=document.getElementById('v2-support-title'),icon=heading.querySelector('.head-icon');
  const original={title:title.textContent,icon:icon.innerHTML,inert:funding.inert};
  const dock=panel.closest('.left-column').querySelector('[data-widget-dock]');
  const t=(ru,en)=>language==='en'?en:ru;
  let current='current',wanted='current',generation=0,dead=false,stopStats=null,removeStyle=null,resize=null,dockObserver=null;
  view.append(stats);
  function label(statistics){
    if(!dock)return;
    const value=statistics?t('Статистика','Statistics'):t('Поддержка','Support');
    const node=dock.querySelector('.dock-label');if(node&&node.textContent!==value)node.textContent=value;
    dock.setAttribute('aria-label',(dock.getAttribute('aria-expanded')==='true'?t('Скрыть ','Hide '):t('Показать ','Show '))+value);
  }
  function restore(){
    dockObserver?.disconnect();resize?.disconnect();stopStats?.();removeStyle?.();
    dockObserver=resize=stopStats=removeStyle=null;
    panel.classList.remove('poll-stats-sidebar');funding.inert=original.inert;
    title.textContent=original.title;icon.innerHTML=original.icon;label(false);
    view.append(stats);current='current';
  }
  async function apply(version){
    wanted=version;const ticket=++generation;
    if(version==='current'){if(current!=='current')restore();return;}
    if(current==='membership')return;
    let style;
    try{
      const [{mountProjectStats},{useStyles}]=await Promise.all([import('../membership/project-stats.js'),import('../membership/styles.js')]);
      if(dead||ticket!==generation||wanted!=='membership')return;
      style=useStyles('project-stats.css');
      if(!await style.ready)throw Error('stats_styles_unavailable');
      if(dead||ticket!==generation||wanted!=='membership'){style();return;}
      removeStyle=style;style=null;
      title.textContent=t('Статистика проекта','Project statistics');
      icon.innerHTML=stats.querySelector('.head-icon').innerHTML;
      panel.classList.add('poll-stats-sidebar');funding.inert=true;
      resize=new ResizeObserver(()=>panel.style.setProperty('--poll-stats-head',heading.offsetHeight+'px'));resize.observe(heading);
      home.append(stats);
      stopStats=mountProjectStats(panel,stats.querySelector('.stats-body'),funding,{language});
      current='membership';label(true);
      if(dock){dockObserver=new MutationObserver(()=>label(true));dockObserver.observe(dock,{childList:true,subtree:true});}
    }catch{style?.();restore();}
  }
  const stop=watchHomeVersion(version=>void apply(version));
  function pageHide(event){if(event.persisted)return;dead=true;++generation;stop();restore();window.removeEventListener('pagehide',pageHide);}
  window.addEventListener('pagehide',pageHide);
}

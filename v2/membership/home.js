import {localizeTree} from './locale.js';
import {markup} from './home-template.js';
import {renderDemoCard} from './demo-card.js';
import {mountOffer} from './offer.js';
import {mountProjectStats} from './project-stats.js';
import {useStyles} from './styles.js';

export function prepareMembershipStyles(){return ['home.css','native-pass.css'].map(useStyles);}

export function mountMembershipHome({language='ru',styles}={}) {
  const demoCard=renderDemoCard(language);
  const stats=document.querySelector('.stats-panel'),support=document.querySelector('.support-panel');
  const statsBody=stats.querySelector('.stats-body'),supportBody=support.querySelector('.support-body');
  const links=styles||prepareMembershipStyles();
  const templates=document.createElement('div');templates.className='membership-dialogs';templates.innerHTML=markup;document.body.append(templates);
  const statsTitle=stats.querySelector('[data-copy="projectStats"]')||document.getElementById('v2-stats-title');
  const supportTitle=document.getElementById('v2-support-title');
  const titles=[statsTitle.textContent,supportTitle.textContent];
  const icons=[stats.querySelector(".head-icon"),support.querySelector(".head-icon")];
  const art=icons.map(node=>node?.firstElementChild);if(art.every(Boolean)){icons[0].append(art[1]);icons[1].append(art[0]);}
  const headNote=stats.querySelector('.head-note'),headHidden=headNote.hidden;
  statsTitle.textContent=language==='en'?'Support ASG Racing':'Поддержка проекта';
  supportTitle.textContent=language==='en'?'Project statistics':'Статистика проекта';
  statsBody.classList.add('membership-source');supportBody.classList.add('membership-source');
  const oldInert=[statsBody.inert,supportBody.inert];statsBody.inert=true;supportBody.inert=true;
  stats.classList.add('membership-center');support.classList.add('membership-sidebar');
  const resize=new ResizeObserver(()=>{for(const panel of [stats,support])panel.style.setProperty('--preview-head',panel.querySelector('.panel-head').offsetHeight+'px');});
  resize.observe(stats.querySelector('.panel-head'));resize.observe(support.querySelector('.panel-head'));
  const stopOffer=mountOffer(stats,demoCard,{language});
  localizeTree(templates,language);localizeTree(stats.querySelector(".membership-offer"),language);
  const stopStats=mountProjectStats(support,statsBody,supportBody,{language});
  const dock=support.closest('.left-column').querySelector('[data-widget-dock]');
  const label=()=>{if(!dock)return;const node=dock.querySelector('.dock-label');const value=language==='en'?'Statistics':'Статистика';if(node&&node.textContent!==value)node.textContent=value;dock.setAttribute('aria-label',(dock.getAttribute('aria-expanded')==='true'?(language==='en'?'Hide ':'Скрыть '):(language==='en'?'Show ':'Показать '))+value);};
  const dockObserver=new MutationObserver(label);if(dock){label();dockObserver.observe(dock,{childList:true,subtree:true});}
  return ()=>{
    for(const dialog of templates.querySelectorAll('dialog[open]'))dialog.close();
    stopStats();stopOffer?.();resize.disconnect();dockObserver.disconnect();
    stats.querySelector('.membership-offer')?.remove();stats.querySelector('[data-membership-details]')?.remove();
    if(art.every(Boolean)){icons[0].append(art[0]);icons[1].append(art[1]);}
    statsTitle.textContent=titles[0];supportTitle.textContent=titles[1];headNote.hidden=headHidden;
    statsBody.classList.remove('membership-source');supportBody.classList.remove('membership-source');
    statsBody.inert=oldInert[0];supportBody.inert=oldInert[1];stats.classList.remove('membership-center');support.classList.remove('membership-sidebar');
    if(dock){dock.querySelector('.dock-label').textContent=language==='en'?'Support':'Поддержка';dock.setAttribute('aria-label',(dock.getAttribute('aria-expanded')==='true'?(language==='en'?'Hide ':'Скрыть '):(language==='en'?'Show ':'Показать '))+(language==='en'?'Support':'Поддержка'));}
    templates.remove();links.forEach(remove=>remove());
  };
}

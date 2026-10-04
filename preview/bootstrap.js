import {previewHref,classicPath} from "./routes.js";
import {copy,el,observeContent} from "./components/dom.js?v=20261004p2";
import {installServers} from "./components/servers.js?v=20261004p2";
import {installSupport} from "./components/support.js?v=20261004p2";
import {installDataLists} from "./components/data-list.js?v=20261004p2";
import {installProfile} from "./components/profile.js?v=20261004p2";
import {installEvent} from "./components/event.js?v=20261004p2";
import {subscribePreviewView} from "./components/runtime-events.js?v=20261004p2";
import {resolveTrackBackgroundFile} from "./runtime/src/features/server-status/track-background.js";

const href=path=>previewHref((document.documentElement.lang==='ru'&&!path.startsWith('/asg-lab/')?'/ru':'')+path,location.href);
function heading(label,target,className="preview-text-link") {const a=el("a",className,label);a.href=target;return a;}

function homeView(){
  if(!['/','/ru/'].includes(document.body.dataset.previewRoute))return;
  const card=document.querySelector(".hero-card");if(!card)return;
  const hero=el("section","preview-hero");const lead=el("div","preview-hero-copy");
  lead.append(el("p","preview-eyebrow",copy("СООБЩЕСТВО ACC","ACC RACING COMMUNITY")),el("h1","preview-headline",copy("Твоя следующая гонка начинается здесь.","Your next race starts here.")),el("p","preview-hero-description",copy("Ежедневные заезды и чемпионаты. Выбери гонку, проверь допуск и следи за своим прогрессом.","Daily races and championships. Choose a race, check entry requirements and follow your progress.")));
  const actions=el("div","preview-hero-actions");actions.append(heading(copy("Выбрать гонку →","Find a race →"),href('/hourly/'),'preview-button preview-button-primary'),heading(copy("Как участвовать","How to join"),href('/join/'),'preview-button'));
  lead.append(actions);hero.append(lead);const event=document.querySelector("#hero-hourly-stack");if(event)hero.append(event);
  const metrics=document.querySelector(".hero-side");metrics?.classList.add("preview-metrics");
  const tools=el("div","preview-home-tools");for(const selector of ['.hero-primary-actions','#driver-of-day-btn']){const node=card.querySelector(selector);if(node)tools.append(node);}
  const bestLaps=metrics?.querySelector('#best-lap-highlight');if(bestLaps){bestLaps.classList.add('preview-best-laps-action');tools.append(bestLaps);}
  if(metrics)observeContent(metrics,()=>{for(const value of metrics.querySelectorAll('.mini-value'))if(/^(?:Loading|Загрузка)[.…]*$/i.test(value.textContent.trim()))value.textContent='—';});
  const more=el("details","preview-home-insights");more.append(el("summary","",copy("Статистика активности и лидеры","Activity and leading drivers")));const insights=el("div","preview-home-insights-body");for(const selector of ['#hero-online-card','.hero-top3-panel']){const node=card.querySelector(selector);if(node)insights.append(node);}more.append(insights);
  // Retain donation data sources for the support component before replacing.
  const support=card.querySelector('.support-inline-widget');if(support)card.parentElement.after(support);
  card.replaceChildren(hero);if(metrics)card.append(metrics);card.append(tools,more);
  const onlineLabel=metrics?.querySelector('.hero-server-total-stat .mini-label');if(onlineLabel){onlineLabel.removeAttribute('data-i18n');onlineLabel.textContent=copy('Пилотов онлайн','Drivers online');}
  const weekly=el("section","preview-weekly");weekly.id="preview-weekly";
  const top=el("div","preview-section-heading");top.append(el("h2","",copy("Ближайшие заезды","Upcoming races")),heading(copy("Всё расписание →","Full schedule →"),href('/hourly/')));const events=el('div','preview-weekly-grid');weekly.append(top,events);document.querySelector('.hero')?.after(weekly);
  subscribePreviewView('schedule',({schedule,announcement})=>{
    if(announcement){const root=document.querySelector('#hero-hourly-card');if(root){let admission=root.querySelector('.preview-home-admission');if(!admission){admission=el('p','preview-home-admission');root.querySelector('.hero-hourly-voting')?.before(admission);if(!admission.isConnected)root.append(admission);}const restriction=announcement.car_restriction||announcement.rules?.car_model;const car=restriction?.mode==='single_model'?restriction.car_model_name||`Car #${restriction.car_model_id}`:copy('Все GT3','All GT3');const server=announcement.server||{};admission.textContent=`${car} · ACC SA ${server.safety_rating_requirement??'—'} · ${announcement.session?.race_duration_minutes??announcement.race_duration_minutes??'—'} ${copy('мин','min')}`;}}
    const candidates=Array.isArray(schedule)?schedule:schedule?.items||schedule?.events||schedule?.schedule||[];
    const entries=Array.isArray(candidates)?candidates.filter(item=>item?.track_name||item?.track_code):[];
    const unique=new Map();for(const item of [announcement,...entries].filter(Boolean)){const key=item.event_id||`${item.date}-${item.start_time_local}`;if(!unique.has(key))unique.set(key,item);}
    const today=new Date().toISOString().slice(0,10);
    const upcoming=[...unique.values()].filter(item=>!item.date||item.date>=today).sort((a,b)=>`${a.date||''} ${a.start_time_local||''}`.localeCompare(`${b.date||''} ${b.start_time_local||''}`)).slice(0,3);
    events.replaceChildren(...upcoming.map(item=>{
      const tile=el('a','preview-event-card');const eventId=item.event_id;tile.href=href('/hourly/')+(eventId?'?event='+encodeURIComponent(eventId):'');
      const image=el('div','preview-event-card-image');const filename=resolveTrackBackgroundFile(item.track_code);if(filename)image.style.backgroundImage=`url("/assets/${filename}")`;
      const content=el('div','preview-event-card-copy');content.append(el('p','preview-label',`${item.date||'—'} · ${item.start_time_local||'—'} ${item.timezone||''}`),el('h3','',item.track_name||item.track_code||'—'));
      const restriction=item.car_restriction||item.rules?.car_model;const car=restriction?.mode==='single_model'?restriction.car_model_name||`Car #${restriction.car_model_id}`:copy('Все GT3','All GT3');content.append(el('p','preview-muted',car),el('span','preview-text-link',eventId?copy('Открыть гонку →','Open race →'):copy('Открыть расписание →','Open schedule →')));tile.append(image,content);return tile;
    }));if(!upcoming.length)events.append(el('p','preview-empty',copy('Расписание обновляется. Откройте полный календарь.','The schedule is being updated. Open the full calendar.')));
  });
}

function createShell(){
  const route=classicPath(location.pathname);const article=/\/(about|join|privacy|cookies|account|portal-ops|moderation|asg-lab)(\/|$)|404\.html/.test(route);
  const roots=[...document.body.children].filter(node=>node.matches('.container,main,.page,.seo-guide,.legal-main,.legal-shell,.legal-content'));
  if(!roots.length)return null;
  const shell=el('div',article?'preview-shell is-article':'preview-shell');const context=el('aside','preview-context');context.setAttribute('aria-label',copy('Разделы страницы','On this page'));const main=el('div','preview-main');const rail=el('aside','preview-rail');rail.setAttribute('aria-label',copy('Серверы и сообщество','Servers and community'));
  roots[0].before(shell);shell.append(context,main);roots.forEach(node=>main.append(node));
  const sections=[...main.querySelectorAll('section[id],.section[id]')].filter(node=>node.id&&!node.closest('.hero-card')&&!node.parentElement.closest('section[id],.section[id]')).slice(0,8);
  context.append(el('p','preview-label',copy('НА ЭТОЙ СТРАНИЦЕ','ON THIS PAGE')));
  if(sections.length)for(const node of sections){const sourceHeading=node.querySelector('h2,h3');const title=node.id==='hourly-home-v2'?copy('Ближайшая гонка','Next race'):sourceHeading?.textContent.trim();if(title){const link=heading(title,'#'+node.id);context.append(link);if(sourceHeading&&node.id!=='hourly-home-v2')observeContent(sourceHeading,()=>{link.textContent=sourceHeading.textContent.trim();});}}
  else for(const node of main.querySelectorAll('h2')){node.id||=`preview-section-${context.children.length}`;context.append(heading(node.textContent,'#'+node.id));if(context.children.length>=8)break;}
  context.append(el('hr'),heading(copy('Главная','Home'),href('/')),heading(copy('Расписание гонок','Race schedule'),href('/hourly/')),heading(copy('Как участвовать','How to join'),href('/join/')));
  const footer=main.querySelector('.footer')||document.querySelector('body > .footer');if(footer){shell.append(footer);footer.classList.add('preview-footer');}
  if(!article){shell.append(rail);installServers(rail,main,href('/'));installSupport(rail);}
  const sources=el('div','preview-source-host');sources.hidden=true;document.body.append(sources);
  for(const selector of ['#server-sticky-widget','#donation-collapsible-widget','.support-inline-widget']){const node=document.querySelector(selector);if(node)sources.append(node);}
  return {shell,main,rail};
}

function completeContent(main){
  // Long reference sections remain reachable by their existing anchor URLs.
  if(['/','/ru/'].includes(document.body.dataset.previewRoute)){
    for(const id of ['rules','about-server','elo-about','safety-about']){
      const section=document.getElementById(id);if(!section||section.closest('details'))continue;
      const details=el('details','preview-reference');details.append(el('summary','',section.querySelector('h2,h3')?.textContent||id));section.before(details);details.append(section);
    }
  }
  const intro=main.querySelector('.seo-intro');if(intro){const container=main.querySelector('.hourly-page-content,main.page,.container')||main;if(['/','/ru/'].includes(document.body.dataset.previewRoute)){intro.classList.add('preview-home-community');container.append(intro);}else container.prepend(intro);const p=intro.querySelector('p');if(/hourly\/$/.test(location.pathname)&&p)p.textContent=copy('Выберите заезд и проверьте условия участия. Время старта указано для каждого события.','Choose a race and check entry requirements. Each event shows its start time.');}
  if(main.querySelector('.seo-guide')){const guide=main.querySelector('.seo-guide');const article=el('article','preview-guide-article');[...guide.children].forEach(node=>{if(node.tagName==='NAV')node.remove();else article.append(node);});guide.append(article);}
  installProfile();installEvent();installDataLists(main);
  for(const target of main.querySelectorAll('#news-feed,.community-feed,#schedule-v2-list,#calendar-v2-grid,.clubs-rating-embed,#driver-achievements-content'))observeContent(target,node=>adaptLinks(node));
  const reveal=()=>{const id=decodeURIComponent(location.hash.slice(1));if(!id)return;let node=document.getElementById(id);while(node){if(node.tagName==='DETAILS')node.open=true;node=node.parentElement;}};
  window.addEventListener('hashchange',reveal);reveal();
}

function adaptLinks(root){
  for(const anchor of root.querySelectorAll('a[href]:not([data-preview-classic])')){
    const raw=anchor.getAttribute('href');if(!raw||raw.startsWith('#')||/^(?:javascript:|mailto:|tel:|data:|blob:|steam:|acc-connect:)/i.test(raw))continue;
    try{const next=previewHref(raw,location.href);if(next!==anchor.href)anchor.href=next;}catch{}
  }
  for(const img of root.querySelectorAll('img[src]')){const raw=img.getAttribute('src');if(raw?.startsWith('news-content/'))img.src='/'+raw;}
}

export function bootstrapPreview(){
  homeView();const layout=createShell();if(layout)completeContent(layout.main);adaptLinks(document);
  document.addEventListener('click',event=>{const a=event.target.closest?.('a[href]:not([data-preview-classic])');if(a)adaptLinks(a.parentElement);},true);
  // Dynamic launchers stay outside the site's composition; broadcasts have an
  // explicit link in the rail. This watches added roots, not every table cell.
  const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&node.matches('#twitch-widget,.twitch-widget-launcher-wrap'))node.hidden=true;});observer.observe(document.body,{childList:true});
}

import {createInformationViews} from './views/information.js?v=20261007v2pages14';
import information from './information-content.js?v=20261007v2pages14';
import {createEditorialViews} from './views/editorial.js?v=20261007v2pages14';
import {createHistoryViews} from './views/history.js?v=20261007v2pages14';
import {markNewsRead} from '/news-read-state.js';
import {editorialImage} from './editorial-model.js?v=20261007v2pages14';
import {getCommunityPostKey} from '/src/pages/community/feed-model.js';
import {createPageViews} from './views/core.js?v=20261007v2pages14';
import {createArchiveViews} from './views/archive.js?v=20261007v2pages14';
import {createChampionshipViews} from './views/championships.js?v=20261007v2pages14';
import {createEntityViews} from './views/entities.js?v=20261007v2pages14';
import {createFunViews} from './views/fun.js?v=20261007v2pages14';
import {createBansViews} from './views/bans.js?v=20261007v2pages14';
import {formatMoscowDateTime} from '/src/shared/time.js';
import {createCarsViews} from './views/cars.js?v=20261007v2pages14';
import {createCarLapsLoader} from './cars-laps-model.js?v=20261007carlaps1';
import {paintRace} from './views/race-modal.js?v=20261007v2pages14';
import {createPageData} from './data.js?v=20261007v2pages14';
import {v2Route,v2EntityLinks,currentV2Path,migratedPaths} from '../routes.js?v=20261007v2pages14';
import {screenPath,scopeSiteHref,siteContext} from '../site-routing.js?v=20261007root1';
import {eventKind as resolveKind} from '../models.js?v=20261006v2k';

export async function startPage(api) {
  const {native,presentation,showDialog,esc,text,date,number,rating,car,language,subscribe}=api;
  const params=new URLSearchParams(location.search),screen=document.documentElement.dataset.v2Page==='news'&&params.has('slug')?'article':document.documentElement.dataset.v2Page;document.documentElement.dataset.v2Page=screen;
  const center=document.querySelector('.center-column'),home=document.createElement('div'),view=document.createElement('div');
  home.id='home-view';home.hidden=true;home.append(...center.childNodes);view.id='page-view';center.append(home,view);
  if(screen==='account'){const {startAccountPage}=await import('./account.js?v=20261007v2pages14');return startAccountPage({...api,view,center});}
  if(['settings','moderation','ops'].includes(screen)){const {startControlPage}=await import('./control.js?v=20261007v2pages14');return startControlPage({...api,view,center,screen});}
  const state={screen,id:params.get('id')||params.get('slug')||(screen==='document'?(location.pathname.endsWith('/privacy/')?'privacy':location.pathname.endsWith('/cookies/')?'cookies':null):null),month:'',racePage:1,query:'',track:'',paceTrack:'',raceSort:'date',recentPage:1,clubType:'teams',archivePage:Math.max(1,Number(params.get('page'))||1),archiveQuery:params.get('q')||'',archiveTrack:params.get('track')||'',archiveKind:params.get('kind')||'',archiveOrder:params.get('order')==='asc'?'asc':'desc',seasonQuery:'',seasonStatus:'',communityType:'clubs',standingPage:1,catalogType:(params.get('tab')||params.get('type'))==='teams'?'teams':'clubs',catalogContext:['hourly','championship'].includes(params.get('context'))?params.get('context'):'general',catalogQuery:params.get('q')||'',rosterQuery:'',entityRacePage:1};
  const data=createPageData(native),raw={profiles:{},car_models:{},schedule:{items:[]},club_rankings:{},seasons:{},entities:{},entity_details:{}},fixture={profiles:raw.profiles,achievements:{},results:{},recent:[],captured_at:null};
  Object.assign(state,{selectedCar:params.get('car'),carQuery:params.get('q')||'',brand:params.get('brand')||'',carPage:Math.max(1,Number(params.get('page'))||1),carSort:params.get('sort')||'races',carDirection:params.get('direction')==='asc'?'asc':'desc',compare:[]});
  Object.assign(state,{period:params.get('period')==='month'?'month':'week',bansQuery:params.get('q')||'',bansPage:Math.max(1,Number(params.get('page'))||1)});
  Object.assign(state,{newsQuery:params.get('q')||'',newsKind:params.get('kind')||'',newsPage:Math.max(1,Number(params.get('page'))||1),communityPage:Math.max(1,Number(params.get('page'))||1),historyQuery:params.get('q')||'',historyStatus:params.get('status')||''});
  let model=null,loadTicket=0,archiveTicket=0,catalogTicket=0,searchTimer,carLapsTicket=0;
  state.carTrack=params.get('track')||'';
  const carLapsLoader=createCarLapsLoader();
  const paths={home:'',account:'account/',article:'news/article/',instructions:'instructions/',guide:'join/',document:'documents/read/',notfound:'404/',archive:'races/',championship:'hourly/championship/',seasons:'hourly/championship/history/',fun:'fun-stats/',catalog:'teams/',club:'clubs/',team:'teams/detail/'};
  const route=(name='home',id=null)=>v2Route(paths[name]??name+'/',language)+(id?'?'+(['championship','club','team','article'].includes(name)?'slug':'id')+'='+encodeURIComponent(id):'');
  const eventStart=e=>Date.parse(e.starts_at || `${e.date}T${e.start_time_local || '20:00'}:00+03:00`);
  const eventKind=e=>{const k=resolveKind(e,e.car_restriction?.mode==='single_model');return k==='mono'?'monoclass':k;};
  const eventKindLabel=k=>({hourly:text('Часовая гонка','Hourly race'),monoclass:text('Монокласс','Single model'),championship:text('Гонка чемпионата','Championship race'),endurance:text('Эндюранс','Endurance')})[k];
  const countdownText=e=>{const seconds=Math.max(0,Math.ceil((eventStart(e)-Date.now())/1000)),days=Math.floor(seconds/86400);return (days?days+text('д ','d '):'')+[Math.floor(seconds%86400/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':');};
  const privacy=()=>`${text('Для голосования используется ID браузера. Участвуя, ты соглашаешься с','Voting uses a browser ID. By entering, you agree to the')} <a href="${route('document','privacy')}">${text('условиями обработки данных','data processing terms')}</a>`;
  const informationViews=createInformationViews({raw,tx:text,label:esc,route,language,section:(title,html)=>`<section class="panel page-panel"><div class="panel-head"><h2>${esc(title)}</h2></div>${html}</section>`});
  const extraPages={missing:informationViews.missing};
  const views=createPageViews({raw,fixture,state,view,center,lang:language,tracks:new Proxy({}, {get:(_,code)=>native().track(code)}),participation:data.participation,route,ruEn:text,escape:esc,number,time:date,
    eloCategory:p=>p.elo_category_id??(p.elo>=1350?1:p.elo>=1250?2:p.elo>=1150?3:p.elo>=1050?4:p.elo>=950?5:6),
    eloNumber:v=>v==null?'—':String(Math.round(Number(v))),entityLink:(entity,kind,profile)=>v2EntityLinks(native().affiliation(profile || {[kind]:entity},kind),language),
    eventKind,eventKindLabel,eventStart,countdownText,votingPrivacy:privacy,carMarkup:(name,id)=>car({car_name:name,car_model_id:id}),
    ratingDetail:p=>`<div class="driver-ratings">${rating(p,'elo',null,true)}${rating(p,'sr',null,true)}</div>`,extraPages});
  const modalApi={...views,fixture,missing:informationViews.missing,tx:text,time:date,eloNumber:v=>v==null?'—':String(Math.round(Number(v))),
    detail:(name,value)=>`<div><span>${esc(name)}</span><b>${esc(value)}</b></div>`,carMarkup:(name,id)=>car({car_name:name,car_model_id:id}),viewer:{}};
  const archiveViews=createArchiveViews({...modalApi,raw,state,route,trackName:views.trackName,eloCategory:p=>p.elo_category_id??(p.elo>=1350?1:p.elo>=1250?2:p.elo>=1150?3:p.elo>=1050?4:p.elo>=950?5:6),viewer:()=>({publicId:model?.auth?.driver?.publicId,authenticated:model?.auth?.authenticated})});
  const championshipViews=createChampionshipViews({...modalApi,raw,state,route,eloCategory:p=>p.elo_category_id??(p.elo>=1350?1:p.elo>=1250?2:p.elo>=1150?3:p.elo>=1050?4:p.elo>=950?5:6),viewer:()=>({publicId:model?.auth?.driver?.publicId,authenticated:model?.auth?.authenticated})});
  const entityViews=createEntityViews({...modalApi,raw,state,route,lang:language,eloCategory:p=>p.elo_category_id??(p.elo>=1350?1:p.elo>=1250?2:p.elo>=1150?3:p.elo>=1050?4:p.elo>=950?5:6),viewer:()=>({publicId:model?.auth?.driver?.publicId,authenticated:model?.auth?.authenticated})});
  const carsViews=createCarsViews({...modalApi,raw,state,route,language});
  const statsApi={...modalApi,raw,state,route,time:value=>formatMoscowDateTime(value,language==='ru'?'ru-RU':'en-GB')||'—'};
  const funViews=createFunViews(statsApi),bansViews=createBansViews(statsApi);
  const editorialViews=createEditorialViews({...statsApi,language}),historyViews=createHistoryViews(statsApi);
  function syncEditorialUrl(){const url=new URL(location.href);const values=screen==='seasons'?{q:state.historyQuery,status:state.historyStatus}:screen==='news'?{q:state.newsQuery,kind:state.newsKind,page:state.newsPage>1?state.newsPage:''}:{page:state.communityPage>1?state.communityPage:''};for(const [key,value] of Object.entries(values))value?url.searchParams.set(key,value):url.searchParams.delete(key);history.replaceState(null,'',url);document.querySelectorAll('.v2-language a').forEach(a=>a.href=currentV2Path(a.dataset.language));}
  function refreshEditorial(){const id=screen==='news'?'site-news-content':screen==='seasons'?'site-history-content':'site-community-content';document.getElementById(id).innerHTML=screen==='news'?editorialViews.newsContent():screen==='seasons'?historyViews.historyCards():editorialViews.communityContent();syncEditorialUrl();}
  function refreshReactions(){view.querySelectorAll('[data-reaction]').forEach(node=>{const t=document.createElement('template');t.innerHTML=editorialViews.reaction(node.dataset.reaction);node.replaceWith(t.content.firstElementChild);});}
  async function loadLikes(){const pending=raw.likes.load(raw.community.map(getCommunityPostKey).filter(Boolean));refreshReactions();await pending;refreshReactions();}
  function syncStatsUrl(){const url=new URL(location.href);const values=screen==='fun'?{period:state.period==='month'?'month':''}:{q:state.bansQuery,page:state.bansPage>1?state.bansPage:''};for(const [key,value] of Object.entries(values))value?url.searchParams.set(key,value):url.searchParams.delete(key);history.replaceState(null,'',url);document.querySelectorAll('.v2-language a').forEach(a=>a.href=currentV2Path(a.dataset.language));}
  function updateBans(){document.getElementById('site-bans-content').innerHTML=bansViews.bansContent();syncStatsUrl();}
  if(!carsViews.sortKeys.includes(state.carSort))state.carSort='races';
  function syncCarsUrl(){const url=new URL(location.href);for(const [key,value] of Object.entries({car:state.selectedCar,q:state.carQuery,brand:state.brand,track:state.carTrack,page:state.carPage>1?state.carPage:'',sort:state.carSort!=='races'?state.carSort:'',direction:state.carDirection==='asc'?'asc':''}))value?url.searchParams.set(key,value):url.searchParams.delete(key);history.replaceState(null,'',url);document.querySelectorAll('.v2-language a').forEach(a=>a.href=currentV2Path(a.dataset.language));}
  function updateCars(){const content=document.getElementById('r24-car-content');content.innerHTML=carsViews.carRows();content.setAttribute('aria-busy',String(Boolean(raw.carLapsLoading)));syncCarsUrl();}
  async function loadCarLaps(){
    const ticket=++carLapsTicket,track=state.carTrack;
    raw.carLaps=null;raw.carLapsError=false;raw.carLapsLoading=Boolean(track);updateCars();
    if(!track){carLapsLoader.cancel();return;}
    try{const result=await carLapsLoader.load(track);if(ticket!==carLapsTicket)return;raw.carLaps=result;}
    catch{if(ticket!==carLapsTicket)return;raw.carLapsError=true;}
    if(ticket===carLapsTicket){raw.carLapsLoading=false;updateCars();}
  }
  function highlightResults(){for(const row of document.querySelectorAll('.results-table tbody tr,#r24-season-standings tbody tr,#site-roster-content tbody tr')){const link=row.querySelector('.result-driver-identity a')||row.querySelector('a[href*="/driver/"]'),id=link?new URL(link.href).searchParams.get('id'):null,active=Boolean(id&&model?.auth?.authenticated&&model.auth.driver?.publicId===id);row.classList.toggle('current-user-row',active);active?row.setAttribute('aria-current','true'):row.removeAttribute('aria-current');}}
  function paint(){view.innerHTML=screen==='about'?informationViews.aboutView():screen==='instructions'?informationViews.instructionView():screen==='guide'?informationViews.guideView(state.id||'join'):screen==='documents'?informationViews.documentsView():screen==='document'?informationViews.documentView(state.id):screen==='notfound'?informationViews.missing('page',params.get('path')||''):screen==='seasons'?historyViews.seasonsView():screen==='news'?editorialViews.newsView():screen==='article'?editorialViews.articleView(state.id):screen==='community'?editorialViews.communityView():screen==='fun'?funViews.funView():screen==='bans'?bansViews.bansView():screen==='cars'?carsViews.carsView():screen==='hourly'?views.hourlyView():screen==='driver'?views.driverView():screen==='archive'?archiveViews.archiveView():screen==='championships'?championshipViews.championships():screen==='championship'?championshipViews.seasonView(state.id):screen==='catalog'?entityViews.catalogView():['club','team'].includes(screen)?entityViews.entityView(screen,state.id):archiveViews.raceView(fixture.results[state.id]);if(screen==='driver')views.layoutDriver();wireInformationLinks();highlightResults();view.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>img.hidden=true,{once:true}));}
  function installSeason(season){raw.seasons[season.slug]=season;for(const race of season.races)fixture.results[race.event_id]=race;const byId=new Map(raw.schedule.items.map(e=>[e.event_id,e]));for(const e of season.upcoming_races)byId.set(e.event_id,e);raw.schedule.items=[...byId.values()];raw.seasonsUpdated=season.updated_at||raw.seasonsUpdated;}
  async function loadArchive(initial=false) {
    const ticket=++archiveTicket,content=document.getElementById('site-archive-content'),status=document.getElementById('archive-status');
    if(content){content.inert=true;content.setAttribute('aria-busy','true');}if(status)status.textContent=text('Загрузка…','Loading…');
    try {
      const result=await data.archive.page({page:state.archivePage,query:state.archiveQuery,track:state.archiveTrack,kind:state.archiveKind,order:state.archiveOrder,trackName:views.trackName,time:date,language},()=>ticket===archiveTicket,(loaded,total)=>{if(status&&ticket===archiveTicket)status.textContent=text('Поиск в архиве','Searching archive')+` · ${number(loaded)} / ${number(total)}`;});
      if(ticket!==archiveTicket||!result)return;
      raw.archive=result;state.archivePage=result.page;
      for(const r of result.items)fixture.results[r.race_id] ||= {...r,_data_namespace:'top'};
      if(initial)paint();else content.innerHTML=archiveViews.archiveContent();
      const url=new URL(location.href);for(const [key,value] of Object.entries({page:result.page>1?result.page:'',q:state.archiveQuery,track:state.archiveTrack,kind:state.archiveKind,order:state.archiveOrder==='asc'?'asc':''}))value?url.searchParams.set(key,value):url.searchParams.delete(key);
      history.replaceState(null,'',url);document.querySelectorAll('.v2-language a').forEach(a=>a.href=currentV2Path(a.dataset.language));
      document.getElementById('archive-status').textContent='';
    }catch(error){if(ticket!==archiveTicket)return;if(initial)throw error;status.innerHTML=`${text('Не удалось загрузить архив.','Could not load the archive.')} <button class="button" data-archive-retry>${text('Повторить','Retry')}</button>`;}
    finally{if(content&&ticket===archiveTicket){content.inert=false;content.removeAttribute('aria-busy');}}
  }
  function wireInformationLinks(){
    view.querySelectorAll('a[href]').forEach(a=>{
      if(siteContext().layout==='root'){
        const u=new URL(a.getAttribute('href'),location.href);
        if([location.origin,'https://asgracing.ru'].includes(u.origin)&&!screenPath(u.pathname)&&u.hash==='#rules')a.dataset.modal='rules';
        else a.setAttribute('href',scopeSiteHref(a.getAttribute('href'),language));
        return;
      }
      const u=new URL(a.getAttribute('href'),location.href);
      if(![location.origin,'https://asgracing.ru'].includes(u.origin)||u.pathname.startsWith('/v2/'))return;
      const path=u.pathname.replace(/^\/(?:ru\/)?/,'');
      if(!path&&u.hash==='#rules'){a.dataset.modal='rules';return;}
      const migrated=v2Route(path,language);if(migrated.startsWith('/v2/')){u.searchParams.delete('lang');a.href=migrated+u.search+u.hash;}
    });
    if(location.hash){const target=document.getElementById(location.hash.slice(1));if(target&&view.contains(target))target.scrollIntoView({block:'start'});}
  }
  function currentEntity(){return raw.entity_details[(screen==='club'?'clubs/':'teams/')+state.id];}
  function syncCatalogUrl(){const url=new URL(location.href);url.searchParams.delete('type');for(const [key,value] of Object.entries({tab:state.catalogType==='teams'?'teams':'',context:state.catalogContext!=='general'?state.catalogContext:'',q:state.catalogQuery}))value?url.searchParams.set(key,value):url.searchParams.delete(key);history.replaceState(null,'',url);document.querySelectorAll('.v2-language a').forEach(a=>a.href=currentV2Path(a.dataset.language));}
  async function loadCatalog(initial=false){
    const ticket=++catalogTicket;raw.catalogLoading=true;raw.catalogError=false;
    const content=document.getElementById('site-catalog-content');if(content){content.style.minHeight=content.getBoundingClientRect().height+'px';content.inert=true;content.setAttribute('aria-busy','true');content.innerHTML=entityViews.catalogContent();}
    try {
      if(initial){const general=await data.catalog();raw.entities.clubs=general.clubs;raw.entities.teams=general.teams;raw.club_rankings.general=general;}
      const ranking=await data.catalog(state.catalogContext);if(ticket!==catalogTicket)return;
      raw.club_rankings[state.catalogContext]=ranking;raw.entitiesUpdated=ranking.pointer.completed_at;raw.catalogLoading=false;
      if(initial)paint();else document.getElementById('site-catalog-content').innerHTML=entityViews.catalogContent();syncCatalogUrl();
    }catch(error){if(ticket!==catalogTicket)return;raw.catalogLoading=false;raw.catalogError=true;if(initial)throw error;content.innerHTML=entityViews.catalogContent();}
    finally{if(ticket===catalogTicket&&content){content.inert=false;content.removeAttribute('aria-busy');content.style.minHeight='';}}
  }
  function applyVotes(){
    for(const button of document.querySelectorAll('[data-page-join]')){
      const id=button.dataset.pageJoin,e=views.eventData(id),v=data.participation[id]||{};
      button.disabled=Boolean(e?.voting_disabled||v.pending);button.classList.toggle('is-voted',Boolean(v.voted));button.setAttribute('aria-pressed',String(Boolean(v.voted)));
      button.textContent=v.pending?text('Сохраняем…','Saving…'):e?.voting_disabled?text('Запись недоступна','Entry unavailable'):v.voted?text('Ты в списке · отменить','You are in · cancel'):text('Я хочу поехать!','I want to race!');
    }
    for(const node of document.querySelectorAll('[data-page-participants]'))node.querySelector('b').textContent=number(data.participation[node.dataset.pageParticipants]?.count);
    presentation.refreshEntry();
  }
  async function toggle(e){const promise=data.toggle(e);applyVotes();try{await promise;}catch{showDialog(text('Участие не сохранено','Entry not saved'),`<p>${text('Не удалось сохранить участие. Попробуй ещё раз.','Could not save your entry. Try again.')}</p>`);}finally{applyVotes();}}
  async function openRace(id,trigger){
    const ticket=++loadTicket;showDialog(text('Результаты гонки','Race results'),`<p role="status">${text('Загрузка…','Loading…')}</p>`,trigger);
    try{const r=await data.race(id,fixture.results[id] || fixture.recent.find(r=>r.race_id===id));if(ticket!==loadTicket||!document.getElementById('v2-modal').open)return;fixture.results[id]=r;
      const modal=document.getElementById('v2-modal');modal.dataset.kind='page-race';modal.style.setProperty('--modal-track',`url('/assets/${views.safeTrack(r)}.jpg')`);
      document.getElementById('v2-modal-title').textContent=native().track(r.track_code||r.track)+' · '+text('Результаты гонки','Race results');modalApi.viewer={publicId:model?.auth?.driver?.publicId,authenticated:model?.auth?.authenticated};paintRace(r,modalApi);highlightResults();
    }catch{if(ticket===loadTicket)document.getElementById('v2-modal-body').innerHTML=`<p>${text('Результаты временно недоступны.','Results temporarily unavailable.')}</p><button class="button" data-page-race="${esc(id)}">${text('Повторить','Retry')}</button>`;}
  }
  function openEvent(e,trigger){presentation.openEvent(trigger,e,{html:()=>views.joinControls(e,{disclosure:false}),vote:()=>toggle(e)});}
  function openWeather(e,trigger){const w=e.weather||{};showDialog(text('Погода','Weather')+' · '+(e.track_name||native().track(e.track_code)),`<div class="detail-grid">${modalApi.detail(text('Температура воздуха','Ambient temperature'),w.ambient_temp_c==null?'—':w.ambient_temp_c+' °C')}${modalApi.detail(text('Облачность','Cloud cover'),w.cloud_level==null?'—':Math.round(w.cloud_level*100)+'%')}${modalApi.detail(text('Дождь','Rain'),w.rain_level==null?'—':Math.round(w.rain_level*100)+'%')}${modalApi.detail(text('Изменчивость погоды','Weather randomness'),w.weather_randomness??'—')}</div>`,trigger);}
  document.addEventListener('click',event=>{
    const target=event.target;if(target.closest('#v1-runtime-host'))return;
    if(target.closest('[data-page-retry]')){location.reload();return;}
    const scroll=target.closest('[data-site-scroll]');if(scroll){const id=new URL(scroll.href).hash.slice(1),node=document.getElementById(id);if(node){event.preventDefault();history.replaceState(null,'','#'+id);document.querySelectorAll('.v2-language a').forEach(a=>a.href=currentV2Path(a.dataset.language));node.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}return;}
    const contentPage=target.closest('[data-site-step="news"],[data-site-step="community"]');if(contentPage){const key=contentPage.dataset.siteStep+'Page';state[key]+=Number(contentPage.dataset.step);refreshEditorial();return;}
    const image=target.closest('[data-site-image]');if(image){const post=raw.community?.find(p=>getCommunityPostKey(p)===image.dataset.siteImage),images=(post?.images||[]).filter(img=>editorialImage(img.src,'https://asgracing.ru/community/')).slice(0,2),item=images[Number(image.dataset.imageIndex)];if(item)showDialog(post.title?.[language]||text('Изображение','Image'),`<img class="site-zoom-image" src="${esc(editorialImage(item.src,'https://asgracing.ru/community/'))}" alt="${esc(item.alt?.[language]||'')}">`,image);return;}
    const like=target.closest('[data-site-like]');if(like){const pending=raw.likes.like(like.dataset.siteLike);refreshReactions();pending.then(refreshReactions);return;}
    if(target.closest('[data-likes-retry]')){loadLikes();return;}
    const period=target.closest('[data-r24-period]');if(period&&['week','month'].includes(period.dataset.r24Period)){state.period=period.dataset.r24Period;view.querySelectorAll('[data-r24-period]').forEach(b=>b.setAttribute('aria-pressed',String(b===period)));document.getElementById('r24-fun-content').innerHTML=funViews.funContent();syncStatsUrl();return;}
    const bansPage=target.closest('[data-site-step="bans"]');if(bansPage){state.bansPage+=Number(bansPage.dataset.step);updateBans();return;}
    const carLink=target.closest('[data-r24-car]');if(carLink){if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;const selected=raw.cars?.find(c=>c.car_name===carLink.dataset.r24Car);if(selected){event.preventDefault();state.selectedCar=selected.car_name;document.getElementById('r24-car-summary').innerHTML=carsViews.carSummary(selected);syncCarsUrl();}return;}
    const carSort=target.closest('[data-r24-sort]');if(carSort&&carsViews.sortKeys.includes(carSort.dataset.r24Sort)){const key=carSort.dataset.r24Sort;state.carDirection=state.carSort===key?(state.carDirection==='asc'?'desc':'asc'):key==='car_name'||key==='best_lap'||key==='average_finish'?'asc':'desc';state.carSort=key;state.carPage=1;updateCars();return;}
    const carPage=target.closest('[data-r24-car-step]');if(carPage){state.carPage+=Number(carPage.dataset.r24CarStep);updateCars();return;}
    if(target.closest('[data-car-laps-retry]')){loadCarLaps();return;}
    const ratingButton=target.closest('[data-rating-kind]');if(ratingButton){presentation.openRating({public_id:ratingButton.dataset.ratingDriver},ratingButton.dataset.ratingKind,ratingButton);return;}
    const race=target.closest('[data-page-race]');if(race&&!target.closest('a,button[data-rating-kind]')){openRace(race.dataset.pageRace,race);return;}
    const detail=target.closest('[data-page-event]');if(detail){const e=views.eventData(detail.dataset.pageEvent);if(e)openEvent(e,detail);return;}
    const join=target.closest('[data-page-join]');if(join){const e=views.eventData(join.dataset.pageJoin);if(e)toggle(e);return;}
    const weather=target.closest('[data-page-weather]');if(weather){const e=views.eventData(weather.dataset.pageWeather);if(e)openWeather(e,weather);return;}
    const catalog=target.closest('[data-site-catalog]');if(catalog){state.catalogType=catalog.dataset.siteCatalog;view.querySelectorAll('[data-site-catalog]').forEach(b=>b.setAttribute('aria-pressed',String(b===catalog)));document.getElementById('site-catalog-content').innerHTML=entityViews.catalogContent();syncCatalogUrl();return;}
    if(target.closest('[data-catalog-retry]')){loadCatalog();return;}
    const entityPage=target.closest('[data-entity-races-step]');if(entityPage){state.entityRacePage+=Number(entityPage.dataset.entityRacesStep);document.getElementById('site-entity-races').innerHTML=entityViews.recentContent(currentEntity());return;}
    const standing=target.closest('[data-r24-standing-step]');if(standing){state.standingPage+=Number(standing.dataset.r24StandingStep);document.getElementById('r24-season-standings').innerHTML=championshipViews.standings(state.id);highlightResults();return;}
    const community=target.closest('[data-r24-community]');if(community){state.communityType=community.dataset.r24Community;view.querySelectorAll('[data-r24-community]').forEach(b=>b.setAttribute('aria-pressed',String(b===community)));document.getElementById('r24-championship-rankings').innerHTML=championshipViews.championshipRankings();return;}
    const prize=target.closest('[data-r24-prize]');if(prize){const item=raw.seasons[prize.dataset.r24Prize]?.local_prizes.find(p=>p.place===Number(prize.dataset.place));if(item)showDialog(text('Награда чемпионата','Championship prize')+' · P'+item.place,`<img class="site-zoom-image" src="${esc(item.src)}" alt="${esc(item.title||'P'+item.place)}">`,prize);return;}
    const archivePage=target.closest('[data-site-step="archive"]');if(archivePage){state.archivePage+=Number(archivePage.dataset.step);loadArchive();return;}
    if(target.closest('[data-archive-retry]')){loadArchive();return;}
    const month=target.closest('[data-month-step],[data-month-reset]');if(month){const d=new Date(state.month+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+Number(month.dataset.monthStep||0));state.month=month.hasAttribute('data-month-reset')?raw.event.date.slice(0,7):d.toISOString().slice(0,7);views.updateSection('.page-calendar',views.calendar(),['.calendar-controls','.calendar-grid']);return;}
    const recent=target.closest('[data-recent-page]');if(recent){state.recentPage+=Number(recent.dataset.recentPage);views.updateSection('.page-recent',views.recent(),['.page-recent-list','.page-pagination']);return;}
    const page=target.closest('[data-profile-page]');if(page){state.racePage+=Number(page.dataset.profilePage);document.getElementById('profile-history-content').innerHTML=views.profileRaceTable(raw.profiles[state.id]);return;}
    const club=target.closest('[data-club-type]');if(club){state.clubType=club.dataset.clubType;views.updateSection('.hourly-clubs',views.hourlyClubs(),['.club-switch','.page-rank-clubs']);}
  });
  document.addEventListener('keydown',event=>{const row=event.target.closest('[data-page-race]');if(row&&event.target===row&&['Enter',' '].includes(event.key)){event.preventDefault();openRace(row.dataset.pageRace,row);}});
  view.addEventListener('change',event=>{if(event.target.id==='site-news-kind'){state.newsKind=event.target.value;state.newsPage=1;refreshEditorial();return;}if(event.target.id==='site-history-status'){state.historyStatus=event.target.value;refreshEditorial();return;}
    if(event.target.id==='r24-car-brand'){state.brand=event.target.value;state.carPage=1;updateCars();return;}
    if(event.target.id==='r24-car-track'){state.carTrack=event.target.value;state.carPage=1;loadCarLaps();return;}
    if(event.target.hasAttribute('data-r24-compare')){const index=Number(event.target.dataset.r24Compare);if([0,1].includes(index)&&raw.cars?.some(c=>String(c.car_model_id)===event.target.value)){state.compare[index]=event.target.value;document.getElementById('r24-car-comparison').innerHTML=carsViews.comparison();}return;}
    if(event.target.id==='site-catalog-context'){state.catalogContext=event.target.value;loadCatalog();return;}
    if(event.target.id==='r24-season-status'){state.seasonStatus=event.target.value;document.getElementById('r24-season-content').innerHTML=championshipViews.seasonCards();return;}
    if(event.target.id==='site-season'){location.href=route('championship',event.target.value);return;}
    if(event.target.id.startsWith('site-archive-')){const field={ 'site-archive-track':'archiveTrack','site-archive-kind':'archiveKind','site-archive-order':'archiveOrder'}[event.target.id];if(field){clearTimeout(searchTimer);state[field]=event.target.value;state.archivePage=1;loadArchive();}return;}
    const p=raw.profiles[state.id];if(!p)return;
    if(event.target.matches('[data-profile-track]')){const kind=event.target.dataset.profileTrack;state[kind==='lap'?'track':'paceTrack']=event.target.value;const template=document.createElement('template');template.innerHTML=views.picker(p,kind);event.target.closest('.page-lap-card').replaceWith(template.content.firstElementChild);}
    if(event.target.id==='profile-race-sort'){state.raceSort=event.target.value;state.racePage=1;document.getElementById('profile-history-content').innerHTML=views.profileRaceTable(p);}
  });
  view.addEventListener('input',event=>{if(event.target.id==='site-news-search'){state.newsQuery=event.target.value;state.newsPage=1;refreshEditorial();return;}if(event.target.id==='site-history-search'){state.historyQuery=event.target.value;refreshEditorial();return;}if(event.target.id==='site-bans-search'){state.bansQuery=event.target.value;state.bansPage=1;updateBans();return;}if(event.target.id==='r24-car-search'){state.carQuery=event.target.value;state.carPage=1;updateCars();return;}if(event.target.id==='site-catalog-search'){state.catalogQuery=event.target.value;document.getElementById('site-catalog-content').innerHTML=entityViews.catalogContent();syncCatalogUrl();return;}if(event.target.id==='site-roster-search'){state.rosterQuery=event.target.value;document.getElementById('site-roster-content').innerHTML=entityViews.rosterContent(currentEntity());highlightResults();return;}if(event.target.id==='r24-season-search'){state.seasonQuery=event.target.value;document.getElementById('r24-season-content').innerHTML=championshipViews.seasonCards();return;}if(event.target.id==='site-archive-search'){state.archiveQuery=event.target.value;state.archivePage=1;++archiveTicket;clearTimeout(searchTimer);searchTimer=setTimeout(()=>loadArchive(),300);return;}if(event.target.id!=='profile-race-search')return;state.query=event.target.value;state.racePage=1;const template=document.createElement('template');template.innerHTML=views.profileRaceTable(raw.profiles[state.id]);for(const selector of ['.page-table-scroll','.page-pagination'])document.getElementById('profile-history-content').querySelector(selector).replaceWith(template.content.querySelector(selector));});
  subscribe(next=>{model=next;highlightResults();});
  const wide=['driver','archive','race','club','team','cars','fun','article','document','notfound'].includes(screen);document.querySelector('.dashboard').classList.toggle('page-wide',wide);for(const side of document.querySelectorAll('.dashboard>aside'))side.hidden=wide;
  document.body.dataset.prototypePage=screen;
  new ResizeObserver(()=>views.sizeProfileRail()).observe(center);
  view.innerHTML=`<section class="panel page-panel"><p role="status">${text('Загрузка…','Loading…')}</p></section>`;
  try {
    if(['about','instructions','guide','documents','document','notfound'].includes(screen)){raw.information=information;paint();
      const heading=view.querySelector('h1');if(heading)document.title=heading.textContent+' · ASG Racing';
    }else if(screen==='seasons'){const result=await data.history();raw.historySeasons=result.items;raw.editorialUpdated=result.updated_at;paint();syncEditorialUrl();
    }else if(['news','article'].includes(screen)){
      raw.news=await data.news();raw.editorialUpdated=editorialViews.news()[0]?.published_at;
      if(screen==='article'){const item=editorialViews.news().find(n=>n.id===state.id||n.slug===state.id);if(item){try{markNewsRead(localStorage,item);}catch{}native().markNews(item);document.title=item.title+' · ASG Racing';document.querySelector('meta[name="description"]').content=item.summary;}}
      paint();if(screen==='news')syncEditorialUrl();
    }else if(screen==='community'){const result=await data.community();raw.community=result.posts;raw.likes=result.likes;raw.editorialUpdated=raw.community[0]?.date;paint();syncEditorialUrl();void loadLikes();
    }else if(screen==='fun'){raw.fun=await data.fun();paint();syncStatsUrl();
    }else if(screen==='bans'){raw.bans=await data.bans();paint();syncStatsUrl();
      data.bannedProfiles(raw.bans.items).then(items=>{raw.bans.items=items;updateBans();}).catch(()=>{});
    }else if(screen==='cars'){
      const result=await data.cars();raw.cars=result.items;raw.carTracks=result.tracks;raw.carsUpdated=result.updated_at;
      if(!raw.carTracks.some(t=>t.code===state.carTrack))state.carTrack='';
      paint();if(raw.cars.length&&view.querySelector('#r24-car-content'))loadCarLaps();
    }else if(screen==='hourly'){
      const result=await data.hourly();Object.assign(raw,result);fixture.recent=result.recent.map(r=>({...r,_data_namespace:'hourly'}));fixture.captured_at=raw.schedule.updated_at;state.month=raw.event.date.slice(0,7);
      paint();
      const tasks=await Promise.allSettled([data.loadVotes([raw.event,...raw.schedule.items]),native().loadClubs('hourly')]);
      if(tasks[1].status==='fulfilled'){raw.club_rankings.hourly=tasks[1].value;views.updateSection('.hourly-clubs',views.hourlyClubs(),['.page-rank-clubs']);}applyVotes();
    }else if(['championships','championship'].includes(screen)) {
      const index=await data.championships();raw.seasonsUpdated=index.updated_at;for(const s of index.items)raw.seasons[s.slug]=s;
      if(screen==='championships') {
        for(let offset=0;offset<index.items.length;offset+=3){const seasons=await Promise.all(index.items.slice(offset,offset+3).map(s=>data.season(s.slug)));seasons.forEach(installSeason);}paint();
      }else {
        state.id ||= index.items.find(s=>s.status==='active')?.slug || index.items[0]?.slug;
        const s=await data.season(state.id);installSeason(s);raw.rankingsLoading=true;document.title=s.title+' · ASG Racing';paint();
        try{raw.club_rankings.championship=await native().loadClubs('championship');}catch{raw.rankingsError=true;}finally{raw.rankingsLoading=false;document.getElementById('r24-championship-rankings').innerHTML=championshipViews.championshipRankings();}
      }
      await data.loadVotes(raw.schedule.items).catch(()=>null);applyVotes();
    }else if(screen==='catalog'){
      await loadCatalog(true);
    }else if(['club','team'].includes(screen)){
      const result=await data.entity(screen,state.id),entity=result.detail;raw.entity_details[(screen==='club'?'clubs/':'teams/')+state.id]=entity;raw.entitiesUpdated=result.pointer.completed_at;
      for(const r of entity.recent_races)fixture.results[r.race_uid]={...r,race_id:r.race_uid,details_path:`races/details/${r.race_uid}.json`,_data_namespace:'entity'};
      document.title=entity.display_name+' · ASG Racing';paint();
    }else if(screen==='archive') {
      raw.archiveTracks=['barcelona','brands_hatch','donington','hungaroring','imola','kyalami','laguna_seca','misano','monza','mount_panorama','nurburgring','nurburgring_24h','oulton_park','paul_ricard','red_bull_ring','silverstone','snetterton','spa','suzuka','valencia','watkins_glen','zandvoort','zolder'];
      await loadArchive(true);
    }else if(screen==='race') {
      fixture.results[state.id]=await data.race(state.id);document.title=views.trackName(views.trackCode(fixture.results[state.id]))+' · '+text('Результаты гонки','Race results')+' · ASG Racing';paint();
    }else{
      const result=await data.driver(state.id);raw.profiles[state.id]=result.profile;fixture.achievements[state.id]=result.achievement;fixture.captured_at=result.profile.updated_at;
      for(const r of result.profile.race_history||[])if(r.car_model_id!=null)raw.car_models[r.car_model_id]=r.car_name;
      document.title=result.profile.driver+' · ASG Racing';paint();
    }
  } catch(error) {view.innerHTML=error.status===404?informationViews.missing(screen,state.id):informationViews.unavailable();if(error.status===404)document.title=view.querySelector('h1').textContent+' · ASG Racing';}
  // Failed or missing records must not become indexable error pages. Reviews
  // retain their unconditional noindex policy, regardless of loaded data.
  if(siteContext().layout==='root'&&view.querySelector('.r24-error'))document.querySelector('meta[name="robots"]').content='noindex,follow';
  const tick=()=>{if(document.hidden)return;for(const node of view.querySelectorAll('[data-page-countdown]')){const e=views.eventData(node.dataset.pageCountdown);if(e)node.textContent=countdownText(e);}};
  tick();setInterval(tick,1000);
}

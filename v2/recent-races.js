import {createPageData,readJson,hourlyUrl,normalizeEvent} from './pages/data.js?v=20261007v2pages11';
import {eventKind as resolveKind} from './models.js?v=20261006v2k';
import {createPageViews} from './pages/views/core.js?v=20261007v2pages11';
import {paintRace} from './pages/views/race-modal.js?v=20261007v2pages11';

// Use the same published list and protocol presentation as Hourly.
export function createRecentRaces({$,native,getModel,presentation,showDialog,pushDialog,esc,text,date,number,car,classic,language}) {
  const state={recentPage:1,month:''},fixture={recent:[]},raw={event:null,schedule:{items:[]}},data=createPageData(native);
  let ticket=0,raceBackLabel='';
  const eventKind=e=>{const kind=resolveKind(e,e.car_restriction?.mode==='single_model');return kind==='mono'?'monoclass':kind;};
  const eventKindLabel=kind=>({hourly:text('Часовая гонка','Hourly race'),monoclass:text('Монокласс','Single model'),championship:text('Гонка чемпионата','Championship race'),endurance:text('Эндюранс','Endurance')})[kind];
  const views=createPageViews({raw,fixture,state,lang:language,participation:data.participation,eventKind,eventKindLabel,
    tracks:new Proxy({}, {get:(_,code)=>native().track(code)}),
    route:(name,id)=>classic(name==='home'?'':name+'/')+(id?'?id='+encodeURIComponent(id):''),
    ruEn:text,escape:esc,number,time:date,
    eloCategory:d=>d.elo_category_id??(d.elo>=1350?1:d.elo>=1250?2:d.elo>=1150?3:d.elo>=1050?4:d.elo>=950?5:6),
    eloNumber:v=>v==null?'—':String(Math.round(Number(v)))});
  const modalApi={...views,fixture,tx:text,time:date,eloNumber:v=>v==null?'—':String(Math.round(Number(v))),
    detail:(name,value)=>`<div><span>${esc(name)}</span><b>${esc(value)}</b></div>`,
    carMarkup:(name,id)=>car({car_name:name,car_model_id:id}),viewer:{}};
  const archive=()=>`<p class="home-recent-archive"><a class="text-link" href="${classic('races/')}">${text('Весь архив гонок','Full race archive')} ↗</a></p>`;
  function listHtml(){return (fixture.recent.length?views.recent():`<p class="empty">${text('Результаты ещё не опубликованы.','Results have not been published yet.')}</p>`)+archive();}
  function calendarHtml(){return views.calendar()+`<p class="home-calendar-note">${text('Время старта — UTC+3. Нажми на событие, чтобы посмотреть условия и записаться.','Start times are UTC+3. Select an event to view its conditions and enter.')} <a class="text-link" href="${classic('hourly/')}">${text('Часовые гонки','Hourly races')} ↗</a></p>`;}
  function setKind(kind){$('modal').classList.add('home-races-mode');$('modal').dataset.kind=kind;$('modal-eyebrow').textContent='ASG RACING / HOURLY';}
  async function openCalendar(trigger){
    const current=++ticket;
    showDialog(text('Календарь гонок','Race calendar'),`<p role="status">${text('Загрузка…','Loading…')}</p>`,trigger);setKind('home-calendar');
    try{
      const result=await data.hourly();
      if(current!==ticket||!$('modal').open||$('modal').dataset.kind!=='home-calendar')return;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(result.event?.date)||!Array.isArray(result.schedule?.items)||!Array.isArray(result.recent))throw new Error('Invalid calendar');
      Object.assign(raw,result);fixture.recent=result.recent;state.month=raw.event.date.slice(0,7);
      $('modal-body').innerHTML=calendarHtml();
    }catch{
      if(current===ticket&&$('modal').open)$('modal-body').innerHTML=`<p>${text('Не удалось загрузить календарь.','Could not load the calendar.')}</p><button type="button" class="button" data-home-calendar-retry>${text('Повторить','Retry')}</button>`;
    }
  }
  const isHero=e=>getModel()?.announcement&&normalizeEvent(getModel().announcement).event_id===e.event_id;
  function entryHtml(e){
    const value=data.participation[e.event_id];
    if(e.participation_mode==='team')return views.joinControls(e,{disclosure:false});
    if(value?.unavailable)return `<p class="v2-error">${text('Не удалось загрузить запись на событие.','Could not load event participation.')}</p><button type="button" class="button" data-home-entry-retry="${esc(e.event_id)}">${text('Повторить','Retry')}</button>`;
    if(!value)return `<p role="status">${text('Загрузка участников…','Loading participants…')}</p>`;
    return views.joinControls(e,{disclosure:false})+(value.error?`<p class="v2-error" role="alert">${text('Не удалось сохранить участие. Попробуй ещё раз.','Could not save participation. Please try again.')}</p>`:'');
  }
  async function loadEntry(e){
    try{await data.loadVotes([e]);}catch{data.participation[e.event_id]={...data.participation[e.event_id],unavailable:true,pending:false};}
    if($('modal').open&&$('modal').dataset.kind==='event')presentation.refreshEntry();
  }
  async function toggle(e){
    const job=data.toggle(e);presentation.refreshEntry();
    try{await job;}catch{/* The same event keeps its button, count and retry message. */}
    if($('modal').open&&$('modal').dataset.kind==='event')presentation.refreshEntry();
  }
  function openEvent(e,trigger){
    ++ticket;pushDialog(trigger);
    const hero=isHero(e);
    if(!hero&&e.participation_mode!=='team')delete data.participation[e.event_id];
    presentation.openEvent(trigger,e,hero?null:{html:()=>entryHtml(e),vote:()=>toggle(e)});
    $('modal-body').insertAdjacentHTML('afterbegin',`<button type="button" class="text-link home-race-back" data-home-races-back>${text('← Календарь гонок','← Race calendar')}</button>`);
    if(!hero&&e.participation_mode!=='team')loadEntry(e);
  }
  async function open(trigger){
    const current=++ticket;state.recentPage=1;
    showDialog(text('Последние гонки','Recent races'),`<p role="status">${text('Загрузка…','Loading…')}</p>`,trigger);setKind('home-recent');
    try{
      const payload=await readJson(hourlyUrl('races/races.json'));
      if(current!==ticket||!$('modal').open||$('modal').dataset.kind!=='home-recent')return;
      const rows=payload.items??payload.races;
      if(!Array.isArray(rows))throw new Error('Invalid recent race list');
      fixture.recent=rows;$('modal-body').innerHTML=listHtml();
    }catch{
      if(current===ticket&&$('modal').open)$('modal-body').innerHTML=`<p>${text('Не удалось загрузить последние гонки.','Could not load recent races.')}</p><button type="button" class="button" data-home-recent-retry>${text('Повторить','Retry')}</button>`+archive();
    }
  }
  async function openRace(id,trigger,{retry=false}={}){
    if(!retry){raceBackLabel=$('modal').dataset.kind==='home-calendar'?text('← Календарь гонок','← Race calendar'):text('← Последние гонки','← Recent races');pushDialog(trigger);}
    const current=++ticket;
    showDialog(text('Результаты гонки','Race results'),`<p role="status">${text('Загрузка…','Loading…')}</p>`,trigger);setKind('home-race');
    try{
      const summary=fixture.recent.find(r=>r.race_id===id);
      const race=await data.race(id,{...summary,_data_namespace:'hourly'});
      if(current!==ticket||!$('modal').open||$('modal').dataset.kind!=='home-race')return;
      $('modal-title').textContent=views.trackName(views.trackCode(race))+' · '+text('Результаты гонки','Race results');
      $('modal').style.setProperty('--modal-track',`url('/assets/${views.safeTrack(race)}.jpg')`);
      modalApi.viewer={publicId:getModel()?.auth?.driver?.publicId,authenticated:getModel()?.auth?.authenticated};
      paintRace(race,modalApi);
      $('modal-body').insertAdjacentHTML('afterbegin',`<button type="button" class="text-link home-race-back" data-home-races-back>${raceBackLabel}</button>`);
    }catch{
      if(current===ticket&&$('modal').open)$('modal-body').innerHTML=`<button type="button" class="text-link home-race-back" data-home-races-back>${raceBackLabel}</button><p>${text('Результаты временно недоступны.','Results temporarily unavailable.')}</p><button type="button" class="button" data-home-race-retry="${esc(id)}">${text('Повторить','Retry')}</button>`;
    }
  }
  document.addEventListener('click',event=>{
    const target=event.target;if(!target.closest('#v2-modal.home-races-mode'))return;
    if(target.closest('[data-home-races-back]')){$('modal').querySelector('.modal-close').click();return;}
    if(target.closest('[data-home-recent-retry]')){open(target);return;}
    if(target.closest('[data-home-calendar-retry]')){openCalendar(target);return;}
    const month=target.closest('[data-month-step],[data-month-reset]');if(month){const date=new Date(state.month+'-01T00:00:00Z');date.setUTCMonth(date.getUTCMonth()+Number(month.dataset.monthStep||0));state.month=month.hasAttribute('data-month-reset')?raw.event.date.slice(0,7):date.toISOString().slice(0,7);$('modal-body').innerHTML=calendarHtml();const selector=month.hasAttribute('data-month-reset')?'[data-month-reset]':`[data-month-step="${month.dataset.monthStep}"]`;$('modal-body').querySelector(selector)?.focus({preventScroll:true});return;}
    const eventButton=target.closest('[data-page-event]');if(eventButton){const event=views.eventData(eventButton.dataset.pageEvent);if(event)openEvent(event,eventButton);return;}
    const entry=target.closest('[data-page-join]');if(entry){const event=views.eventData(entry.dataset.pageJoin);if(event)toggle(event);return;}
    const entryRetry=target.closest('[data-home-entry-retry]');if(entryRetry){const event=views.eventData(entryRetry.dataset.homeEntryRetry);if(event){delete data.participation[event.event_id];presentation.refreshEntry();loadEntry(event);}return;}
    const retry=target.closest('[data-home-race-retry]');if(retry){openRace(retry.dataset.homeRaceRetry,retry,{retry:true});return;}
    const page=target.closest('[data-recent-page]');if(page){state.recentPage=Math.max(1,Math.min(Math.ceil(fixture.recent.length/5),state.recentPage+Number(page.dataset.recentPage)));$('modal-body').innerHTML=listHtml();$('modal-body').scrollTop=0;$('modal-body').querySelector(`[data-recent-page="${page.dataset.recentPage}"]`)?.focus({preventScroll:true});return;}
    const row=target.closest('[data-page-race]');if(row&&!target.closest('a,[data-rating-kind]')&&(!target.closest('button')||row.matches('button'))){openRace(row.dataset.pageRace,row);return;}
    const rating=target.closest('[data-rating-kind]');if(rating){pushDialog(rating);presentation.openRating({public_id:rating.dataset.ratingDriver},rating.dataset.ratingKind,rating);}
  });
  $('modal-body').addEventListener('keydown',event=>{
    const row=event.target.closest('[data-page-race]');if(row&&!row.matches('button')&&event.target===row&&$('modal').classList.contains('home-races-mode')&&['Enter',' '].includes(event.key)){event.preventDefault();openRace(row.dataset.pageRace,row);}
  });
  $('modal').addEventListener('v2-dialog-restore',()=>{++ticket;});
  $('modal').addEventListener('close',()=>{++ticket;$('modal').classList.remove('home-races-mode');});
  return {open,openCalendar};
}

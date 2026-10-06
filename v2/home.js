import copy from './copy.js?v=20261006v2b';
import { subscribe, getRuntime } from './bridge.js?v=20261006v2b';
import {eventKind,normalizeTablePage} from './models.js?v=20261006v2b';
import {createPresentation} from './presentation.js?v=20261006v2b';
import {createHeader} from './header.js?v=20261006v2b';
import {createGuide} from './guide.js?v=20261006v2b';
import { resolveTrackBackgroundFile, selectRandomTrackBackgroundFile } from '/src/features/server-status/track-background.js';
const language=document.documentElement.dataset.pageLanguage==='en'?'en':'ru';
const ru=language==='ru', words=copy[language].labels, editorial=copy[language].editorial;
const $=id=>document.getElementById('v2-'+id), esc=value=>String(value??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(a,b)=>ru?a:b, label=key=>words[key]||key;
const number=value=>value==null?'—':new Intl.NumberFormat(ru?'ru-RU':'en-GB').format(value);
const elo=value=>value==null||!Number.isFinite(Number(value))?'—':String(Math.round(Number(value)));
const date=value=>{if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat(ru?'ru-RU':'en-GB',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(d)};
const native=()=>getRuntime();
const classic=path=>`${ru?'/ru':''}/${path}`;
const driverHref=id=>classic('driver/')+'?id='+encodeURIComponent(id);
let model=null,tab='leaderboard',page=1,track='monza',type='teams',context='general',tableRows=[],tableTotal=0,tableRequest=0,tableBusy=false,tableError=false,sortKey='',sortDirection=1;
let winnerExtra=null,winnerRequest='',dayProfile=null,dayRequest='',clubSnapshot=null,lastTrigger=null;
const seen=new Map();
function changed(key,value,render){const signature=JSON.stringify(value);if(seen.get(key)===signature)return;seen.set(key,signature);render()}
const icons={heart:'<path d="M20 5c-2-2-5-2-7 0l-1 1-1-1C5 0-2 8 4 14l8 7 8-7c3-3 3-7 0-9Z"/>',flag:'<path d="M4 22V3h15l-2 4 2 4H4M9 3v4h5v4M4 7h5v4M14 3v4h4"/>',chart:'<path d="M4 21V11h4v10M10 21V7h4v14M16 21V3h4v18M2 21h20"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M7 14h3m4 0h3M7 17h3"/>',trophy:'<path d="M7 3h10v6a5 5 0 0 1-10 0V3ZM7 5H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4M12 14v6m-5 1h10"/>',server:'<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01M12 6.5h5m-5 11h5"/>',compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5 5-3Z"/>',play:'<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/>',shield:'<path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5l8-3Z"/><path d="m9 12 2 2 4-5"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>'};
document.querySelectorAll('#v2-site-shell [data-icon]').forEach(node=>node.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[node.dataset.icon]||''}</svg>`);
Object.assign(words,{title:text('ASG Racing — сообщество ACC','ASG Racing — ACC community'),today:'',hourlyNav:text('Часовые гонки','Hourly races'),teams:text('Клубы и команды','Clubs & teams'),bestlaps:text('Лучшие круги','Best laps'),fullStats:text('Полная статистика ↗','Full statistics ↗'),announcements:text('Анонсы','Announcements'),announce1:text('Скоро Анонс №1','Announcement #1 soon'),announce2:text('Скоро Анонс №2','Announcement #2 soon'),bans:text('Баны','Bans'),noResults:text('Ничего не найдено','No results'),snapshot:'V2',noData:text('Нет данных','No data')});
document.querySelectorAll('#v2-site-shell [data-copy]').forEach(node=>node.textContent=label(node.dataset.copy));
$('intro-subtitle').textContent=editorial.subtitle;
$('intro-note').innerHTML=editorial.introNote;
$('intro-note').querySelectorAll('a[href="#safety-about"],a[href="#elo-about"]').forEach(a=>{a.dataset.modal=a.hash==='#elo-about'?'elo':'safety';a.href='#'+a.dataset.modal});
$('language').outerHTML=`<div id="v2-language" class="v2-language" aria-label="${text('Язык','Language')}"><a href="/v2/ru/" data-language="ru"${ru?' aria-current="page" class="active"':''}>RU</a><a href="/v2/en/" data-language="en"${!ru?' aria-current="page" class="active"':''}>EN</a></div>`;
try{localStorage.setItem('asgV2Language',language)}catch{}
const routeNames={championships:text('Чемпионат','Championship'),cars:text('Машины','Cars'),fun:text('Фан-статистика','Fun statistics'),about:text('О сообществе','About the community'),instructions:text('Как играть','How to join'),documents:text('Документы','Documents')};
document.querySelectorAll('#v2-site-shell [data-site-label]').forEach(a=>a.textContent=routeNames[a.dataset.siteLabel]);
document.querySelectorAll('#v2-site-shell a').forEach(a=>{
  if(a.dataset.route)a.href=classic(a.dataset.route);
  const url=new URL(a.href,location.href);
  if(url.hostname==='asgracing.ru'&&(!url.pathname.startsWith('/v2/'))){a.href=url.pathname+url.search+url.hash;if(ru&&/^\/(cars|fun-stats|about|join|news|races|hourly)(\/|$)/.test(url.pathname))a.href='/ru'+url.pathname+url.search+url.hash;}
  if(ru&&/^\/(clubs|teams\/detail|privacy|cookies|account|portal-ops|moderation)\//.test(new URL(a.href).pathname)){const u=new URL(a.href);u.searchParams.set('lang','ru');a.href=u.pathname+u.search+u.hash;}
});
document.querySelectorAll('.v2-language a').forEach(a=>{a.href+=location.search+location.hash});
document.querySelector('[data-v1-home]').addEventListener('click',event=>{const a=event.currentTarget;const hashes={leaderboard:'championship',bestlaps:'bestlaps',safety:'worst-safety',clubs:'clubs-teams-stats'};a.href=(ru?'/ru/':'/')+location.search+(location.hash||'#'+hashes[tab]);});
document.querySelectorAll('.thanks-list span').forEach(node=>{node.textContent=node.textContent.trim()});
const privacy=()=>`${text('Для голосования используется ID браузера. Участвуя, ты соглашаешься с','Voting uses a browser ID. By entering, you agree to the')} <a href="/privacy/${ru?'?lang=ru':''}">${text('условиями обработки данных','data processing terms')}</a>`;
const presentation=createPresentation({$,native,getModel:()=>model,esc,text,label,date,number,rating,car,driverHref,classic,privacy,showDialog});
const header=createHeader({$,native,esc,text,number,rating,driverHref,privacy});
const guide=createGuide({$,copy:editorial.guide});
$('participation-note').innerHTML=privacy();
$('search').placeholder=text('Поиск пилота','Search drivers');$('search').setAttribute('aria-label',$('search').placeholder);
function rating(row,kind,delta=null){
  row={...row?.summary,...row};
  const value=kind==='elo'?(row.elo??row.elo_rating_after??row.elo_after):(row.safety_rating_after??row.safety_rating);
  if(value==null)return '—';
  const cat=kind==='elo'?(row.elo_category_id??(value>=1350?1:value>=1250?2:value>=1150?3:value>=1050?4:value>=950?5:6)):(row.safety_category??(value>=5?'A':value>=2.5?'B':'C'));
  return `<button type="button" class="rating-badge ${kind==='elo'?'elo-'+cat:'sr sr-'+String(cat).toLowerCase()}" data-rating="${kind}" data-driver="${esc(row.public_id||'')}"${!row.public_id?' disabled':''}>${kind==='elo'?'C'+cat+' '+elo(value):cat+' '+Number(value).toFixed(2)}${delta==null?'':`<small class="race-rating-delta">${delta>0?'+':''}${Number(delta).toFixed(kind==='elo'?0:2)}</small>`}</button>`;
}
function car(row){const name=row.car_name||row.car_name_raw||row.favorite_car||row.favorite_car_name||'—',id=row.car_model_id??row.winner_car_model_id;return `<span class="car-cell">${id!=null?`<img src="/assets/car-icons/${Number(id)}.png" alt="" loading="lazy" onerror="this.hidden=true">`:''}<span>${esc(name)}</span></span>`}
function renderSupport(){
  const data=model.donations,goal=data?.goal;
  const money=(value,currency='RUB')=>{try{return new Intl.NumberFormat(ru?'ru-RU':'en-GB',{style:'currency',currency,maximumFractionDigits:0}).format(value)}catch{return number(value)}};
  if(goal&&Number(goal.goal_amount)>0){
    $('goal-name').textContent=goal.title||label('goal');$('fund-value').textContent=money(goal.raised_amount,goal.currency);
    const percent=Math.max(0,Math.min(100,Math.round(Number(goal.raised_amount)/Number(goal.goal_amount)*100)));
    $('fund-total').textContent=`${label('fundOf')} ${money(goal.goal_amount,goal.currency)}`;$('fund-percent').textContent=percent+'%';$('fund-progress').setAttribute('aria-valuenow',percent);$('fund-progress').setAttribute('aria-valuemin','0');$('fund-progress').setAttribute('aria-valuemax','100');$('fund-progress').firstElementChild.style.width=percent+'%';
  }else{$('goal-name').textContent=model.donationsError?text('Сбор временно недоступен','Fundraising data unavailable'):label('goal');$('fund-value').textContent='—';$('fund-total').textContent='';$('fund-percent').textContent='';$('fund-progress').firstElementChild.style.width='0%'}
  const items=data?.items||[];
  $('donations').innerHTML=items.slice(0,5).map(d=>{const value=String(d.created_at||'').replace(' ','T');return `<div class="donation-row"><b>${esc(d.username||d.name)}</b><strong>${esc(money(d.amount,d.currency))}</strong><time>${date(value+(/[Zz]|[+-]\d{2}:?\d{2}$/.test(value)?'':'+03:00'))}</time></div>`}).join('')||`<p class="empty">${model.donationsLoading?text('Загрузка…','Loading…'):model.donationsError?text('Донаты временно недоступны','Donations unavailable'):label('noData')}</p>`;
}
function renderStats(){
  const d=model.day,s=model.stats;$('day-driver').textContent=d?.driver||text('Нет пилота дня','No driver of the day');$('day-driver').dataset.driver=d?.public_id||'';
  const ratingSource=dayProfile||model.leaderboard.find(row=>row.public_id===d?.public_id)||d;
  $('day-ratings').innerHTML=d?rating(ratingSource,'elo')+rating(ratingSource,'sr'):'';
  if(d?.public_id&&dayRequest!==d.public_id){dayRequest=d.public_id;dayProfile=null;native().profile(d.public_id).then(profile=>{if(dayRequest===d.public_id){dayProfile=profile;renderStats()}}).catch(()=>{})}
  const metric=(value,title)=>`<div class="metric"><span>${title}</span><b>${number(value)}</b></div>`;
  $('metrics').innerHTML=metric(s?.drivers_total,label('pilots'))+metric(s?.races_total,label('racesCol'))+metric(model.serversStale?null:model.servers.reduce((n,s)=>n+s.players,0),text('Пилотов онлайн','Drivers online'));
  const online=model.online,max=Math.max(1,...online.map(d=>d.value));
  $('chart').innerHTML=online.length?online.map(d=>`<div class="chart-column"><b>${number(d.value)}</b><div class="bar-track"><span style="height:${Math.max(2,d.value/max*100)}%"></span></div><small>${esc(d.label)}</small></div>`).join(''):`<p class="empty">${label('noData')}</p>`;
  document.querySelector('.stats-panel .head-note').textContent=s?.updated_at?text('Данные: ','Updated: ')+date(s.updated_at):'';
}
function renderWinner(){
  const race=model.winner;if(!race){$('winner-name').textContent=model.loading.home?text('Загрузка…','Loading…'):text('Нет завершённой гонки','No completed race');$('winner-meta').textContent='';return}
  const result=winnerExtra?.details?.results?.find(r=>r.position===1)||native().winner(race)||{},profile=winnerExtra?.profile;
  const d={...result,public_id:race.winner_public_id||result.public_id,driver:race.winner||result.driver};
  $('winner-name').textContent=d.driver||'—';$('winner-name').dataset.driver=d.public_id||'';
  $('winner-meta').innerHTML=`${esc(native().track(race.track_code||race.track))} · ${date(race.finished_at)}<br>${esc(race.winner_car_name||result.car_name||'—')}`;
  const image=document.querySelector('.winner-car');const carId=race.winner_car_model_id??result.car_model_id;
  image.hidden=carId==null;if(carId!=null)image.src=`/assets/car-icons/${Number(carId)}.png`;image.alt=race.winner_car_name||'';
  $('winner-results').innerHTML=['wins','podiums','races'].map(key=>{const value=profile?.summary?.[key]??profile?.[key];return `<div class="result"><span>${label(key==='races'?'racesCol':key)}</span><b>${Array.isArray(value)?'—':number(value)}</b></div>`}).join('');
  const points=result.points,eloDelta=result.elo_rating_delta,srDelta=result.safety_delta;
  $('winner-race-results').innerHTML=`<div class="winner-race-heading">${text('За последнюю гонку','Last race results')}</div><div class="winner-race-grid"><div><span>${label('points')}</span><b class="race-points">${points==null?'—':(points>0?'+':'')+number(points)}</b></div><div><span>ELO</span>${rating(d,'elo',eloDelta)}</div><div><span>SR</span>${rating(d,'sr',srDelta)}</div></div>`;
  if(race.race_id&&winnerRequest!==race.race_id){winnerRequest=race.race_id;winnerExtra=null;native().hydrateWinner(race).then(extra=>{if(winnerRequest===race.race_id){winnerExtra=extra;renderWinner()}}).catch(()=>{})}
}
function renderEvent(){
  const a=model.announcement,button=$('race-vote');
  if(!a){$('event-track').textContent=model.loading.hourly?text('Загрузка…','Loading…'):text('Расписание обновляется','Schedule is being updated');button.disabled=true;return}
  const kind=eventKind(a,(a.car_restriction||a.rules?.car_model)?.mode==='single_model');
  document.querySelector('.upcoming-panel').dataset.eventKind=kind;
  $('event-kind').textContent=kind==='mono'?text('Монокласс','Single model'):kind==='championship'?text('Чемпионат','Championship'):kind==='endurance'?text('Эндюранс','Endurance'):text('Часовая гонка','Hourly race');
  $('event-track').textContent=a.track_name||native().track(a.track_code)||'—';
  $('multiplier').textContent=`×${a.points_multiplier??1} ${text('ОЧКОВ В РЕЙТИНГ','RANKING POINTS')}`;
  $('event-date').textContent=`${date(a.date&&a.start_time_local?`${a.date}T${a.start_time_local}:00+03:00`:null)} · ${a.timezone||'UTC+3'}`;
  const restriction=a.car_restriction||a.rules?.car_model,carName=restriction?.mode==='single_model'?restriction.car_model_name:text('Все машины класса GT3','All GT3 cars');
  $('event-car').textContent=carName||'—';$('event-car-image').hidden=restriction?.mode!=='single_model'||restriction?.car_model_id==null;if(!$('event-car-image').hidden)$('event-car-image').src=`/assets/car-icons/${Number(restriction.car_model_id)}.png`;
  const server=a.server||{},rules=a.rules||{};
  $('event-facts').textContent=`${a.session?.race_duration_minutes??a.race_duration_minutes??'—'} ${text('мин','min')} · SA ${server.safety_rating_requirement??'—'} · SR ${server.sr_requirement??server.safety_rating_asg_requirement??server.asg_sr_requirement??native().eventSr()??'—'} · ${rules.mandatory_pitstop_count??rules.mandatory_pit_stop_count??'—'} PIT`;
  $('participants').textContent=text('Участники: ','Participants: ')+number(model.votes.count);
  button.textContent=model.votes.pending?text('Сохраняем…','Saving…'):model.votes.voted?text('Ты в списке · отменить','You are registered · cancel'):text('Я хочу поехать!','I want to race!');
  button.disabled=Boolean(model.votes.pending||model.voteDisabled);button.classList.toggle('participation-active',model.votes.voted);
  $('participation-note').innerHTML=(model.votes.error?`<strong class="v2-error">${text('Не удалось обновить участие. Попробуй ещё раз.','Could not update participation. Try again.')}</strong> `:'')+privacy();
  const file=resolveTrackBackgroundFile(a.track_code);document.querySelector('.upcoming-panel').style.setProperty('--event-image',file?`url('/assets/${file}')`:'none');
  updateClock();
  presentation.refreshEntry();
}
function updateClock(){if(!model?.targetMs){$('race-countdown').textContent='';return}const seconds=Math.max(0,Math.floor((model.targetMs-Date.now())/1000)),days=Math.floor(seconds/86400);$('race-countdown').textContent=(days?days+text('д ','d '):'')+[Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60].map(v=>String(v).padStart(2,'0')).join(':')}
function renderServers(){
  const rows=model.servers;$('servers-up').textContent=`${model.serversStale?'—':rows.filter(s=>s.online).length} / ${rows.length}`;
  $('total-online').textContent=model.serversStale?text('Данные устарели','Stale data'):number(rows.reduce((n,s)=>n+s.players,0))+' '+label('players');
  $('servers').innerHTML=rows.map((s,i)=>`<button type="button" class="server-card${s.online?'':' offline'}" data-server="${esc(s.key)}"><span class="server-top"><span class="server-id">${String(i+1).padStart(2,'0')}</span><span class="server-name">${esc(s.label)}</span><span class="server-compact-live">${esc(s.session)} · ${number(s.players)}</span><span class="status-dot"></span></span><span class="server-facts"><span>${esc(s.track||'—')}</span><span>SA ${esc(s.sa)} · SR ${esc(s.sr)}</span><span>${number(s.players)} · ${esc(s.session)}</span></span></button>`).join('')||`<p class="empty">${text('Статусы недоступны','Server status unavailable')}</p>`;
}
const cols={leaderboard:[['rank','#'],['driver','driver'],['elo','ELO'],['safety_rating','SR'],['points','points'],['wins','wins'],['podiums','podiums'],['races','racesCol'],['average_finish','finish'],['club','club'],['team','team']],safety:[['rank','#'],['driver','driver'],['safety_rating','SR'],['elo','ELO'],['races_count','racesCol'],['favorite_car','car'],['club','club'],['team','team']],bestlaps:[['rank','#'],['driver','driver'],['best_lap','lap'],['car_name','car'],['updated_at','date'],['session_type','session'],['elo','ELO'],['safety_rating','SR'],['club','club'],['team','team']],clubs:[['rank','#'],['display_name','teams'],['total_points','points'],['average_elo','ELO'],['average_sr','SR'],['race_count','racesCol']]};
function tableCell(row,key,index){
  if(key==='rank')return `<span class="${index<3?'top-rank':''}">${index+1}</span>`;
  if(key==='driver')return row.public_id?`<a href="${driverHref(row.public_id)}">${esc(row.driver||row.name)}</a>`:esc(row.driver||row.name);
  if(key==='elo'||key==='safety_rating')return rating(row,key==='elo'?'elo':'sr');
  if(key==='club'||key==='team')return native().affiliation(row,key);
  if(key==='favorite_car'||key==='car_name'){if(row.is_banned)return `<span class="banned-badge">${text('ЗАБАНЕН','BANNED')}</span>`;return key==='favorite_car'?car({car_name:row.favorite_car_name||row.favorite_car,car_model_id:row.favorite_car_model_id}):car(row)}
  if(key==='updated_at')return date(row.updated_at||row.best_lap_updated_at);
  if(key==='average_elo')return elo(row.average_elo);
  if(key==='average_sr')return row.average_sr==null?'—':Number(row.average_sr).toFixed(2);
  if(key==='session_type')return esc(row.session_type||row.best_lap_session_type||'—');
  if(key==='display_name'){const url=type==='clubs'?'/clubs/':'/teams/detail/';return `<a href="${url}?slug=${encodeURIComponent(row.slug||'')}${ru?'&lang=ru':''}">${esc(row.display_name||row.name)}</a>`}
  return typeof row[key]==='number'?number(row[key]):esc(row[key]);
}
function renderTable(){
  const columns=cols[tab];let rows=tableRows;
  if(tab==='clubs'){rows=(clubSnapshot||model?.clubs)?.[type]||[];if(!Array.isArray(rows))rows=rows.items||[];rows=rows.filter(r=>String(r.display_name||r.name).toLocaleLowerCase().includes($('search').value.toLocaleLowerCase()));if(sortKey)rows=[...rows].sort((a,b)=>(typeof a[sortKey]==='number'?a[sortKey]-b[sortKey]:String(a[sortKey]??'').localeCompare(String(b[sortKey]??'')))*sortDirection);tableTotal=rows.length;rows=rows.slice((page-1)*10,page*10)}
  if(sortKey)rows=[...rows].sort((a,b)=>(typeof a[sortKey]==='number'?a[sortKey]-b[sortKey]:String(a[sortKey]??'').localeCompare(String(b[sortKey]??'')))*sortDirection);
  $('rating-table').dataset.view=tab;
  $('rating-table').innerHTML=`<thead><tr>${columns.map(([key,title])=>`<th scope="col"${sortKey===key?` aria-sort="${sortDirection>0?'ascending':'descending'}"`:''}><button type="button" data-sort="${key}">${esc(words[title]||title)}</button></th>`).join('')}</tr></thead><tbody>${tableBusy?`<tr><td colspan="${columns.length}" class="empty">${text('Загрузка…','Loading…')}</td></tr>`:tableError?`<tr><td colspan="${columns.length}" class="empty">${text('Не удалось загрузить рейтинг.','Could not load rankings.')} <button type="button" data-table-retry>${text('Повторить','Retry')}</button></td></tr>`:rows.length?rows.map((r,i)=>`<tr data-row="${esc(r.public_id||'')}" tabindex="${tab==='clubs'?'-1':'0'}"${r.public_id&&r.public_id===model?.viewer?' class="current-user-row" aria-current="true"':''}>${columns.map(([key])=>`<td>${tableCell(r,key,(page-1)*10+i)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${columns.length}" class="empty">${label('noResults')}</td></tr>`}</tbody>`;
  $('table-count').textContent=`${tableTotal?(page-1)*10+1:0}–${Math.min(page*10,tableTotal)} ${label('of')} ${number(tableTotal)}`;$('page-number').textContent=String(page).padStart(2,'0');$('prev').disabled=page===1||tableBusy;$('next').disabled=page*10>=tableTotal||tableBusy;
  $('ranking-filters').hidden=!['bestlaps','clubs'].includes(tab);$('track-filter-label').hidden=tab!=='bestlaps';$('club-type-label').hidden=tab!=='clubs';$('club-context-label').hidden=tab!=='clubs';
}
async function loadTable(){
  const request=++tableRequest;
  if(tab==='clubs'){tableBusy=false;tableError=Boolean(model?.clubsError);renderTable();return}
  tableBusy=true;tableError=false;renderTable();
  try{const result=normalizeTablePage(await native().loadTable(tab,page,track,$('search').value.trim(),sortKey));if(request!==tableRequest)return;let rows=result?.items||[];
    if(result?.full){const q=$('search').value.toLocaleLowerCase();rows=rows.filter(r=>String(r.driver||r.name||'').toLocaleLowerCase().includes(q));if(sortKey)rows.sort((a,b)=>(typeof a[sortKey]==='number'?a[sortKey]-b[sortKey]:String(a[sortKey]??'').localeCompare(String(b[sortKey]??'')))*sortDirection);tableTotal=rows.length;rows=rows.slice((page-1)*10,page*10)}else tableTotal=result?.total_items??rows.length;
    tableRows=rows;
  }catch{if(request===tableRequest){tableRows=[];tableTotal=0;tableError=true}}finally{if(request===tableRequest){tableBusy=false;renderTable()}}
}
function chooseTab(next){tab=next;page=1;sortKey='';$('search').value='';document.querySelectorAll('#v2-site-shell [data-tab]').forEach(button=>{button.classList.toggle('active',button.dataset.tab===tab);button.setAttribute('aria-selected',String(button.dataset.tab===tab))});loadTable()}
function showDialog(title,html,trigger){if(!$('modal').open)lastTrigger=trigger||document.activeElement;$('modal').dataset.kind='';$('modal').style.removeProperty('--modal-track');$('modal-title').textContent=title;$('modal-body').innerHTML=html;if(!$('modal').open)$('modal').showModal();$('site-shell').inert=true;$('modal').querySelector('button').focus()}
function closeDialog(){$('modal').close();$('site-shell').inert=false;lastTrigger?.focus?.({preventScroll:true})}
function rowById(id){return tableRows.find(r=>r.public_id===id)||[dayProfile,winnerExtra?.profile,model?.day,...(winnerExtra?.details?.results||[])].find(r=>r?.public_id===id)||{public_id:id,driver:id}}
function showReference(key,trigger){
  if(key==='rules')showDialog(label('rules'),native().rules()||editorial.rules,trigger);
  if(key==='elo')showDialog(label('elo'),editorial.elo,trigger);
  if(key==='safety')showDialog('Safety Rating',editorial.safety,trigger);
  $('modal').dataset.kind=key;
  $('modal-eyebrow').textContent='ASG RACING / '+key.toUpperCase();
}
function openServers(key,trigger){
  if(!key){showDialog(label('serverStatus'),`<div class="v2-server-summary">${model.servers.map(s=>`<button type="button" class="server-card" data-server="${esc(s.key)}"><b>${esc(s.label)}</b><span>${esc(s.track)} · ${number(s.players)} ${label('players')} · ${esc(s.session)}</span></button>`).join('')}</div>`,trigger);return}
  const server=model.servers.find(s=>s.key===key);if(!server)return;
  const drivers=server.drivers;showDialog(server.label,`<div class="v2-server-parameters"><span>${esc(server.track)}</span><span>SA ${esc(server.sa)}</span><span>SR ${esc(server.sr)}</span><span>${esc(server.session)}</span></div><div class="v2-server-pilots">${drivers.length?drivers.map((p,i)=>`<article class="v2-server-pilot"><div><b class="v2-race-number">#${esc(p.raceNumber??p.car_number??p.race_number??i+1)}</b> ${p.public_id?`<a href="${driverHref(p.public_id)}">${esc(p.name||p.driver)}</a>`:esc(p.name||p.driver)}</div><div>${rating(p,'elo')}${rating(p,'sr')}</div><div>${car(p)}</div></article>`).join(''):`<p class="empty">${model.serversStale?text('Онлайн устарел; актуальный список недоступен.','Online status is stale; current roster is unavailable.'):text('Нет пилотов онлайн','No drivers online')}</p>`}</div>`,trigger);
}
function startStream(trigger){
  const pop=$('stream-popover');if(pop.matches(':popover-open')){pop.hidePopover();return}
  if(!$('twitch-player').querySelector('iframe')){const url=new URL('https://player.twitch.tv/');url.search=new URLSearchParams({channel:'asgracing',parent:location.hostname,autoplay:'false',muted:'true'});$('twitch-player').innerHTML=`<iframe src="${esc(url.href)}" title="ASG Racing Twitch" allow="fullscreen" allowfullscreen></iframe>`}
  pop.showPopover();const rect=trigger.getBoundingClientRect(),width=Math.min(480,innerWidth-24);pop.style.width=width+'px';pop.style.left=Math.max(12,Math.min(innerWidth-width-12,rect.left-width+rect.width))+'px';pop.style.top=Math.max(12,rect.top-Math.min(340,innerHeight-24)-12)+'px';pop.style.right='auto';pop.style.bottom='auto';
}
document.addEventListener('click',event=>{
  if(event.target.closest('#v1-runtime-host'))return;
  const ratingButton=event.target.closest('button[data-rating]');if(ratingButton&&!ratingButton.disabled){const row=rowById(ratingButton.dataset.driver);presentation.openRating(row,ratingButton.dataset.rating,ratingButton);return}
  const server=event.target.closest('[data-server]');if(server){openServers(server.dataset.server,server);return}
  const pilot=event.target.closest('#v2-day-driver,#v2-winner-name');if(pilot?.dataset.driver){presentation.openDriver(rowById(pilot.dataset.driver),pilot);return}
  const row=event.target.closest('#v2-rating-table tbody tr[data-row]');if(row&&!event.target.closest('a,button,input')&&row.dataset.row){presentation.openDriver(rowById(row.dataset.row),row);return}
  const button=event.target.closest('[data-modal]');if(button&&button.closest('#v2-site-shell')){const key=button.dataset.modal;if(['rules','elo','safety'].includes(key))showReference(key,button);else if(key==='event')presentation.openEvent(button);else if(key==='online')presentation.openOnline(button);else if(key==='servers')openServers(null,button);else if(key.startsWith('announce'))showDialog(button.textContent,`<p>${text('Подробности будут опубликованы в новостях.','Details will be published in the news.')}</p><a href="${classic('news/')}">${label('news')}</a>`,button);return}
  const nextTab=event.target.closest('[data-tab],[data-ranking-nav]');if(nextTab){chooseTab(nextTab.dataset.tab||nextTab.dataset.rankingNav);$('ranking').scrollIntoView({block:'nearest'});return}
  if(event.target.closest('[data-table-retry]'))loadTable();
  const sort=event.target.closest('[data-sort]');if(sort){sortDirection=sortKey===sort.dataset.sort?-sortDirection:1;sortKey=sort.dataset.sort;page=1;if(tab==='clubs')renderTable();else loadTable()}
  if(event.target.closest('[data-cookie-settings]'))window.ASGLegal?.openSettings();
  if(event.target.closest('[data-about-nav]')){document.querySelector('.about-more').open=true;$('about-server').scrollIntoView({block:'start'})}
  if(event.target.closest('[data-tour-start]')){event.preventDefault();guide.open()}
  const stream=event.target.closest('#v2-stream-widget summary');if(stream){event.preventDefault();startStream(stream)}
  if(event.target.closest('[data-close-popover="stream-popover"]'))$('stream-popover').hidePopover();
});
$('rating-table').addEventListener('keydown',event=>{const row=event.target.closest('tr[data-row]');if(row&&event.target===row&&row.dataset.row&&['Enter',' '].includes(event.key)){event.preventDefault();presentation.openDriver(rowById(row.dataset.row),row)}});
$('race-vote').onclick=()=>native().vote();$('prev').onclick=()=>{page--;loadTable()};$('next').onclick=()=>{page++;loadTable()};
let searchTimer;$('search').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=1;loadTable()},250)};
$('ranking-track').onchange=event=>{track=event.target.value;page=1;loadTable()};$('ranking-club-type').onchange=event=>{type=event.target.value;page=1;loadTable()};
$('ranking-club-context').onchange=async event=>{context=event.target.value;const selected=context;tableBusy=true;renderTable();try{const data=await native().loadClubs(context);if(context===selected){clubSnapshot=data;tableError=false;page=1}}catch{if(context===selected)tableError=true}finally{if(context===selected){tableBusy=false;renderTable()}}};
$('modal').querySelector('.modal-close').onclick=closeDialog;$('modal').addEventListener('cancel',event=>{event.preventDefault();closeDialog()});$('modal').addEventListener('click',event=>{if(event.target===$('modal'))closeDialog()});
const onlineButton=document.querySelector('.online');onlineButton.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();presentation.openOnline(onlineButton)}});
subscribe(next=>{
  model=next;
  changed('header',[next.auth,next.news,next.invitations,next.unreadNews],()=>header.update(next));
  changed('support',[next.donations,next.donationsLoading,next.donationsError],renderSupport);
  changed('stats',[next.day,next.stats,next.online,next.serversStale,next.servers.map(s=>s.players)],renderStats);
  changed('winner',next.winner,renderWinner);
  changed('event',[next.announcement,next.votes,next.voteDisabled],renderEvent);
  changed('servers',[next.servers,next.serversStale],renderServers);
  if(!seen.has('tables-ready')&&!next.loading.home){seen.set('tables-ready','yes');if(next.tracks.length)$('ranking-track').innerHTML=next.tracks.map(t=>`<option value="${esc(t.track_code||t.track)}"${(t.track_code||t.track)===track?' selected':''}>${esc(native().track(t.track_code||t.track))}</option>`).join('');loadTable()}
  changed('viewer',next.viewer,renderTable);
  changed('affiliations',next.affiliationsSize,renderTable);
  if(tab==='clubs')changed('clubs',[next.clubs,next.clubsError],renderTable);
  $('about-lead').innerHTML=editorial.about[0]||'';
  if(!$('about-content').innerHTML)$('about-content').innerHTML=editorial.about.slice(1).join('').replace(/(<li[^>]*>[^<]*[\s\S]*?<\/li>)/g,'<ul>$1</ul>');
});
function initialiseDocks(){
  let saved={};try{saved=JSON.parse(localStorage.getItem('asgV2WidgetDocks'))||{}}catch{}
  const dashboard=document.querySelector('.dashboard');
  for(const [i,selector] of ['.left-column','.right-column'].entries()){
    const aside=document.querySelector(selector),content=document.createElement('div'),button=document.createElement('button'),key=i?'servers':'support';content.className='sidebar-content';content.id='v2-'+key+'-dock-content';content.append(...aside.childNodes);button.className='widget-dock-toggle';button.type='button';button.dataset.widgetDock=key;button.setAttribute('aria-controls',content.id);aside.append(button,content);
    function apply(open){aside.dataset.dockOpen=String(open);content.inert=!open;content.setAttribute('aria-hidden',String(!open));dashboard.classList.toggle(i?'right-closed':'left-closed',!open);button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',(open?text('Скрыть ','Hide '):text('Показать ','Show '))+(i?label('serverStatus'):label('support')));button.innerHTML=`<span class="dock-symbol">${i?'▤':'♡'}</span><span class="dock-label">${i?text('Серверы','Servers'):text('Поддержка','Support')}</span><span class="dock-arrow">${open?'‹':'›'}</span>`}
    apply(typeof saved[key]==='boolean'?saved[key]:true);button.onclick=()=>{saved[key]=aside.dataset.dockOpen!=='true';apply(saved[key]);try{localStorage.setItem('asgV2WidgetDocks',JSON.stringify(saved))}catch{}};
  }
  dashboard.classList.add('widgets-enhanced');
}
initialiseDocks();
function applyHash(){const aliases={championship:'leaderboard',bestlaps:'bestlaps','worst-safety':'safety','clubs-teams-stats':'clubs'};const id=decodeURIComponent(location.hash.slice(1));if(aliases[id]){chooseTab(aliases[id]);$('ranking').scrollIntoView({block:'start'})}else if(['rules','elo-about','safety-about'].includes(id)&&model){showReference(id==='elo-about'?'elo':id==='safety-about'?'safety':'rules')}else if(id==='about-server'){document.querySelector('.about-more').open=true;$('about-server').scrollIntoView({block:'start'})}}
window.addEventListener('hashchange',applyHash);
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),layers=document.querySelectorAll('.track-layer');let background=0,previousBackground='';
function nextBackground(){if(document.hidden||reduced.matches&&background>0)return;const file=selectRandomTrackBackgroundFile(Math.random,previousBackground),layer=layers[background%2];previousBackground=file;layer.style.backgroundImage=`url('/assets/${file}')`;layers.forEach(other=>other.classList.toggle('is-active',other===layer));background++}
nextBackground();setInterval(nextBackground,28000);setInterval(()=>{if(!document.hidden)updateClock()},1000);
const boot=$('site-shell'),loader=document.querySelector('.home-loader');
let seenIntro=false;try{seenIntro=Boolean(sessionStorage.getItem('asgV2IntroSeen'))}catch{}
if(reduced.matches||seenIntro){document.documentElement.classList.remove('home-booting');loader.hidden=true}else{document.documentElement.classList.add('home-booting');boot.inert=true;setTimeout(()=>{document.documentElement.classList.remove('home-booting');document.documentElement.classList.add('home-ready');boot.inert=false;loader.hidden=true;try{sessionStorage.setItem('asgV2IntroSeen','1')}catch{}},1050)}
renderTable();$('race-vote').disabled=true;
try{await import('./runtime/home.js?v=20261006v2b');setTimeout(applyHash,1500)}catch(error){console.error('V2 runtime unavailable',error);$('event-track').textContent=text('Не удалось загрузить данные','Could not load data');$('day-driver').textContent=text('Данные недоступны','Data unavailable');tableError=true;tableBusy=false;renderTable()}

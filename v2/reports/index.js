import {esc,STATUS,OUTCOME,SANCTION,REASON,actionsFor,reportHref} from './model.js?v=20261105reportbutton1';
import {subscribe} from '/v2/bridge.js?v=20261006v2k';
const BASE='https://auth.asgracing.ru',lang=()=>document.documentElement.lang==='en'?'en':'ru';
const tx=(ru,en)=>lang()==='en'?en:ru;
const word=(map,key)=>{
 const pair=map[key];
 if(!pair)return key;
 if(map===STATUS||map===OUTCOME||map===SANCTION)return pair.join(' / ');
 return tx(...pair);
};
const date=t=>new Date(t*1000).toLocaleString(lang()==='en'?'en-GB':'ru-RU');
const labels={claim:['Принять','Accept'],release:['Освободить назначение','Release assignment'],escalate:['Передать главному судье','Escalate'],decide:['Вынести решение','Issue decision'],appeal:['Подать апелляцию','Appeal'],comment:['Добавить пояснение','Add comment'],evidence:['Добавить доказательства','Add evidence'],internal_note:['Внутренняя заметка','Internal note'],request_evidence:['Запросить доказательства','Request evidence'],extend_evidence:['Продлить ожидание','Extend deadline'],exception:['Решить вопрос просрочки','Resolve deadline exception'],appoint_reviewer:['Назначить независимого судью','Appoint independent reviewer']};
labels.retry_execution=['Повторить исполнение','Retry execution'];
let auth=null,me=null,styles=false,sessionRevision=0;
function style(){if(styles)return;styles=true;const link=document.createElement('link');link.rel='stylesheet';link.href='/v2/reports/reports.css?v=20261105reportbutton1';document.head.append(link);}
async function identity(){const revision=sessionRevision,payload=await fetch(BASE+'/v1/me',{credentials:'include',cache:'no-store'}).then(r=>r.ok?r.json():{});if(revision!==sessionRevision)return null;auth=payload;me=await request('/v1/reports/me').catch(()=>null);return me;}
export async function request(path,body,key){
 const revision=sessionRevision;
 const options={credentials:'include',cache:'no-store',headers:{Accept:'application/json'}};
 if(body){options.method='POST';options.headers['Content-Type']='application/json';options.headers['X-CSRF-Token']=auth?.csrf_token||'';options.body=JSON.stringify({...body,idempotency_key:key||crypto.randomUUID()});}
 const response=await fetch(BASE+path,options);const data=await response.json().catch(()=>({}));if(revision!==sessionRevision&&path!=='/v1/reports/status')throw new Error('auth_changed');if(!response.ok)throw Object.assign(new Error(data.detail||'request_failed'),{status:response.status});return data;
}
function errorText(error){const copy={version_conflict:['Дело изменилось. Обновите его перед действием.','This report changed. Refresh before acting.'],judge_conflict_of_interest:['Участник инцидента не может судить это дело.','An involved participant cannot judge this case.'],driver_profile_required:['Свяжите Steam с профилем ASG.','Link Steam to an ASG profile.'],evidence_deadline_pending:['Срок ожидания доказательств ещё не истёк.','The evidence deadline has not passed.'],reports_unavailable:['Система репортов пока недоступна.','Reports are not available yet.']};return copy[error.message]?.[lang()==='en'?1:0]||tx('Не удалось сохранить действие. Проверьте поля, права и срок подачи.','Could not save the action. Check the fields, permissions and deadline.');}
const field=(title,name,type='text',extra='')=>`<label>${esc(title)}<input name="${name}" type="${type}" ${extra}></label>`;
const area=(title,name,extra='')=>`<label>${esc(title)}<textarea name="${name}" ${extra}></textarea></label>`;
const options=(map,selected)=>Object.entries(map).map(([key])=>`<option value="${key}"${key===selected?' selected':''}>${esc(word(map,key))}</option>`).join('');
const select=(title,name,map,selected)=>`<label>${esc(title)}<select name="${name}">${options(map,selected)}</select></label>`;
const driver=(id,names={})=>/^drv_[\w-]+$/.test(id||'')?`<a href="${lang()==='en'?'/en':''}/driver/?id=${encodeURIComponent(id)}">${esc(names?.[id]||id)}</a>`:id==='main'?'Main':id==='system'?tx('Система','System'):tx('Telegram · автор не подтверждён','Telegram · unverified author');
const login=()=>`<a class="button" href="${BASE}/v1/auth/steam/start?return_path=${encodeURIComponent(location.pathname+location.search)}">${tx('Войти через Steam','Sign in with Steam')}</a>`;
function dialog(title){style();const d=document.createElement('dialog'),trigger=document.activeElement;d.className='report-dialog';d.innerHTML=`<header><h2>${esc(title)}</h2><button type="button" data-close aria-label="${tx('Закрыть','Close')}">×</button></header><div class="report-body"></div>`;document.body.append(d);d.querySelector('[data-close]').onclick=()=>d.close();d.addEventListener('close',()=>{d.remove();trigger?.focus();},{once:true});d.showModal();return d;}

export async function startReport(context={}){
 const d=dialog(tx('Подать репорт','Submit report')),body=d.querySelector('.report-body');body.textContent=tx('Загрузка…','Loading…');
 try{
  await identity();if(!me){body.innerHTML=login();return;}
  let data=await request('/v1/reports/draft').catch(()=>({}));if(context.race_id&&data.race_id!==context.race_id)data={};data={...data,...context};
  const key=data.request_key||crypto.randomUUID();let race,step=0;
  const save=()=>request('/v1/reports/draft',{payload:{...data,request_key:key}});
  async function paint(){
   if(step===0){
    body.innerHTML=`<p>${tx('Шаг 1 из 3 · Гонка и участники','Step 1 of 3 · Race and participants')}</p><form>${field(tx('ID гонки или ссылка на гонку','Race ID or race link'),'race','text',`required value="${esc(data.race_id||'')}"`)}${select(tx('Архив','Archive'),'namespace',{top:['Общий архив','General archive'],hourly:['Hourly','Hourly']},data.namespace||'top')}<button>${tx('Загрузить участников','Load participants')}</button><p role="status"></p></form><div data-people></div>`;
    body.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);let id=f.get('race');try{if(id.includes('://'))id=new URL(id).searchParams.get('id')||id;race=await request('/v1/reports/race?'+new URLSearchParams({race_id:id,namespace:f.get('namespace')}));data.race_id=race.race_id;data.namespace=race.namespace;
      body.querySelector('[data-people]').innerHTML=`<form><fieldset><legend>${esc(race.title)} · ${date(race.finished_at)}</legend><p>${tx('Отметьте всех участников инцидента и отдельно обвиняемых.','Select all involved drivers and identify the accused separately.')}</p>${Object.entries(race.drivers).map(([id,name])=>`<div class="report-person"><span>${esc(name)}</span><label><input type="checkbox" name="participants" value="${esc(id)}"${(data.participants||[data.accused_id]).includes(id)?' checked':''}>${tx('Участник','Involved')}</label><label><input type="checkbox" name="accused" value="${esc(id)}"${(data.accused||[data.accused_id]).includes(id)?' checked':''}${id===me.public_id?' disabled':''}>${tx('Обвиняемый','Accused')}</label></div>`).join('')}</fieldset><button>${tx('Далее','Next')}</button><p role="status"></p></form>`;
      body.querySelector('[data-people] form').onsubmit=async ev=>{ev.preventDefault();const people=new FormData(ev.target);data.accused=people.getAll('accused');data.participants=[...new Set([...people.getAll('participants'),...data.accused])];if(!data.accused.length){ev.target.querySelector('[role=status]').textContent=tx('Выберите обвиняемого.','Select an accused driver.');return;}await save();step=1;paint();};
     }catch(error){e.target.querySelector('[role=status]').textContent=errorText(error);}};
    if(data.race_id)body.querySelector('form').requestSubmit();
   }else if(step===1){
    body.innerHTML=`<p>${tx('Шаг 2 из 3 · Обстоятельства','Step 2 of 3 · Incident details')}</p><form>${field(tx('Круг, время инцидента и таймкод','Lap, incident time and video timestamp'),'moment','text','required maxlength="240"')}${select(tx('Нарушение','Violation'),'reason_code',REASON,data.reason_code)}${area(tx('Обстоятельства и пункт правил','Description and rule'),'description','required minlength="20" maxlength="4000"')}${area(tx('Ссылки на доказательства — по одной в строке','Evidence links — one per line'),'evidence','required')}${area(tx('Причина просрочки, если прошло более 24 часов','Reason for late submission, if over 24 hours'),'late_reason','maxlength="1000"')}<button type="button" data-back>${tx('Назад','Back')}</button><button>${tx('Проверить репорт','Review report')}</button><p role="status"></p></form>`;
    for(const name of ['moment','description','evidence','late_reason'])body.querySelector(`[name=${name}]`).value=name==='evidence'?(data[name]||[]).join('\n'):data[name]||'';
    body.querySelector('[data-back]').onclick=()=>{step=0;paint();};body.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);Object.assign(data,Object.fromEntries(f));data.evidence=String(f.get('evidence')).split(/\n/).map(s=>s.trim()).filter(Boolean);try{if(data.evidence.some(u=>new URL(u).protocol!=='https:'))throw Error('evidence_required');await save();step=2;paint();}catch(error){e.target.querySelector('[role=status]').textContent=errorText(error);}};
   }else{
    body.innerHTML=`<h3>${tx('Шаг 3 из 3 · Проверка','Step 3 of 3 · Review')}</h3><p>${esc(race.title)} · ${date(race.finished_at)}</p><p>${data.accused.map(id=>esc(race.drivers[id]||id)).join(', ')}</p><p>${esc(data.moment)}</p><p>${esc(data.description)}</p>${data.evidence.map(u=>`<p><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a></p>`).join('')}<p>${tx('До решения материалы видны участникам и судьям.','Materials are visible to participants and judges until a decision.')}</p><button data-back>${tx('Назад','Back')}</button><button data-submit>${tx('Отправить репорт','Submit report')}</button><p role="status"></p>`;
    body.querySelector('[data-back]').onclick=()=>{step=1;paint();};body.querySelector('[data-submit]').onclick=async e=>{e.target.disabled=true;try{const payload=Object.fromEntries(['race_id','namespace','participants','accused','moment','description','reason_code','evidence','late_reason'].filter(k=>data[k]!=null).map(k=>[k,data[k]]));const c=await request('/v1/reports',{payload},key);body.innerHTML=`<p>${tx('Репорт зарегистрирован','Report registered')} #${c.number}</p><a class="button" href="${reportHref(c.report_id,lang())}">${tx('Открыть дело','Open report')}</a>`;await request('/v1/reports/draft',{payload:{}});}catch(error){body.querySelector('[role=status]').textContent=errorText(error);e.target.disabled=false;}};
   }
  }paint();
 }catch(error){body.textContent=errorText(error);}
}

function card(c){return `<article class="report-card"><a href="${reportHref(c.report_id,lang())}">#${c.number} · ${esc(c.race.title)}</a><span>${esc(word(STATUS,c.status))}</span><p>${c.accused.map(id=>driver(id,c.race.drivers)).join(', ')}</p>${c.decision?`<p>${esc(c.decision.summary)}</p>`:''}<small>${esc(word(STATUS,c.execution.status))}</small></article>`;}
export async function mountList(root,{driverId=null,direction=null,judicial=false}={}){
 if(driverId&&!direction)direction='filed';
 style();root.innerHTML=`<h2>${tx('Репорты','Reports')}</h2><div class="report-toolbar">${driverId?`<button data-direction="filed">${tx('Поданные','Filed')}</button><button data-direction="against">${tx('На пилота','Against driver')}</button>`:''}${judicial?`<select data-status><option value="">${tx('Все статусы','All statuses')}</option>${options(STATUS)}</select><input data-driver placeholder="${tx('Профиль пилота','Driver profile')}"><button data-mine>${tx('Мои дела','My cases')}</button>`:''}<button data-reload>${tx('Обновить','Refresh')}</button></div><div data-list></div><button data-more hidden>${tx('Ещё','More')}</button>`;
 if(judicial)root.querySelector('.report-toolbar').insertAdjacentHTML('afterbegin',field(tx('Гонка','Race'),'filter_race')+field(tx('Судья','Judge'),'filter_judge')+field(tx('С даты','From'),'filter_since','datetime-local')+field(tx('По дату','Until'),'filter_until','datetime-local'));
 let before=null,mine=false;const list=root.querySelector('[data-list]');
 async function load(append=false){try{const q=new URLSearchParams();if(driverId)q.set('driver',driverId);if(direction)q.set('direction',direction);if(before&&append)q.set('before',before);const status=root.querySelector('[data-status]')?.value;if(status)q.set('status',status);const pilot=root.querySelector('[data-driver]')?.value;if(pilot)q.set('driver',pilot);if(mine&&me)q.set('assigned',me.public_id);for(const [field,param] of [['race','race_id'],['judge','assigned'],['since','since'],['until','until']]){const value=root.querySelector('[name=filter_'+field+']')?.value;if(value)q.set(param,['since','until'].includes(field)?Math.floor(new Date(value).getTime()/1000):value);}const result=await request('/v1/reports?'+q);if(!append)list.replaceChildren();list.insertAdjacentHTML('beforeend',result.items.map(card).join('')||`<p>${tx('Нет доступных репортов.','No reports available.')}</p>`);before=result.next_before;root.querySelector('[data-more]').hidden=!before;}catch(error){list.textContent=errorText(error);}}
 root.querySelectorAll('[data-direction]').forEach(b=>b.onclick=()=>{direction=b.dataset.direction;load();});root.querySelector('[data-reload]').onclick=()=>load();root.querySelector('[data-more]').onclick=()=>load(true);root.querySelector('[data-status]')?.addEventListener('change',()=>load());root.querySelector('[data-mine]')?.addEventListener('click',()=>{mine=!mine;load();});await load();
}
export async function mountReportsPage(root){
 style();await identity();const id=new URLSearchParams(location.search).get('id');
 if(id)return mountCase(root,id);
 await mountList(root,{judicial:!!(me?.judge||me?.chief||me?.owner)});
 if(me?.global_unban===true){
  const button=document.createElement('button');
  button.type='button';button.textContent=tx('Полный разбан','Full unban');
  button.onclick=openGlobalUnban;root.prepend(button);
 }
}

function openGlobalUnban(){
 const modal=dialog(tx('Полный разбан','Full unban'));
 const body=modal.querySelector('.report-body');
 body.innerHTML=`<p>${tx('Действие снимет все основания блокировки и действующие страйки, восстановит SR и сохранит историю.','This clears all ban grounds and active strikes, restores SR and keeps the audit history.')}</p><form>${field(tx('Публичный ID пилота','Pilot public ID'),'target','text','required maxlength="160"')}${area(tx('Причина разбана','Reason for unban'),'reason','required minlength="20" maxlength="500"')}<label><input type="checkbox" required>${tx('Подтверждаю снятие всех оснований блокировки','I confirm removal of all ban grounds')}</label><button>${tx('Отправить на Main','Send to Main')}</button></form><p role="status" aria-live="polite"></p>`;
 const form=body.querySelector('form'),notice=body.querySelector('[role=status]');
 const key=crypto.randomUUID();
 let command;
 form.onsubmit=async event=>{
  event.preventDefault();
  const button=form.querySelector('button'),data=new FormData(form);button.disabled=true;
  try{
   if(!command){
    const payload={target_public_id:data.get('target').trim(),reason:data.get('reason').trim()};
    command=(await request('/v1/reports/global-unbans',{payload},key)).command_id;
    form.querySelectorAll('input,textarea').forEach(input=>input.disabled=true);
    button.textContent=tx('Проверить квитанцию','Check receipt');
   }
   const result=await request('/v1/reports/global-unbans/'+encodeURIComponent(command));
   notice.textContent=result.status==='applied'&&result.result?.global_banned
    ?tx('Команда применена. Действует более новое основание блокировки.','Applied. A newer ban ground is active.')
    :word(STATUS,result.status==='leased'?'pending':result.status);
   if(result.status==='applied'||result.status==='rejected')return;
  }catch(error){notice.textContent=errorText(error);}
  button.disabled=false;
 };
}
export async function mountCase(root,id){
 style();root.textContent=tx('Загрузка…','Loading…');
 try{await identity();const c=await request('/v1/reports/'+encodeURIComponent(id));
 root.innerHTML=`<h1>${tx('Репорт','Report')} #${c.number}</h1><p>${esc(word(STATUS,c.status))} · ${esc(word(STATUS,c.execution.status))}</p><p><a href="${lang()==='en'?'/en':''}/race/?${new URLSearchParams({id:c.race.race_id,source:c.race.namespace})}">${esc(c.race.title)}</a></p><p>${tx('Автор','Author')}: ${driver(c.author_id,c.race.drivers)} · ${tx('Обвиняемые','Accused')}: ${c.accused.map(id=>driver(id,c.race.drivers)).join(', ')}</p>${c.assigned_id?`<p>${tx('Судья','Judge')}: ${driver(c.assigned_id)}</p>`:''}${c.description?`<p>${esc(c.moment)}</p><p>${esc(c.description)}</p>${c.evidence.map(url=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`).join('<br>')}`:''}${c.decision?`<section><h2>${tx('Решение','Decision')}</h2><p>${esc(c.decision.summary)}</p>${c.decision.findings.map(f=>`<p>${driver(f.public_id,c.race.drivers)}: ${esc(word(OUTCOME,f.outcome))} · ${esc(word(SANCTION,f.sanction))}</p>`).join('')}<p>${tx('Срок апелляции','Appeal deadline')}: ${date(c.decision_at+86400)}</p></section>`:''}${c.evidence_deadline?`<p>${tx('Доказательства до','Evidence due')}: ${date(c.evidence_deadline)}</p>`:''}<div class="report-toolbar">${actionsFor(c,me).map(action=>`<button data-action="${action}">${esc(word(labels,action))}</button>`).join('')}</div><div data-action-form></div><section><h2>${tx('История','History')}</h2>${(c.history||[]).map(h=>{const p=JSON.parse(h.payload);return `<article class="report-card"><small>${date(h.occurred_at)} · ${driver(h.actor_id)}</small><b>${esc(word(labels,h.kind))}</b><p>${esc(p.text||p.reason||p.summary||'')}</p>${(p.evidence||[]).map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a>`).join('<br>')}</article>`;}).join('')}</section>`;
 root.insertAdjacentHTML('afterbegin',`<a href="${lang()==='en'?'/en':''}/reports/">${tx('← Реестр репортов','← Report registry')}</a>`);
 if(c.claimed_author_id)root.insertAdjacentHTML('afterbegin',`<p>${tx('Отправитель Telegram указал профиль (личность не подтверждена)','Telegram sender supplied this profile (identity unverified)')}: ${driver(c.claimed_author_id,c.race.drivers)}</p>`);
 root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>actionForm(root,c,b.dataset.action));
 }catch(error){root.innerHTML=`<p>${esc(errorText(error))}</p>${error.status===401?login():''}`;}
}
function actionForm(root,c,action){
 const host=root.querySelector('[data-action-form]');let fields='';
 if(action==='decide')fields=area(tx('Публичное решение и мотивировка','Public decision and reasoning'),'summary','required minlength="20" maxlength="1000"')+c.accused.map((id,i)=>`<fieldset><legend>${esc(id)}</legend>${select(tx('Результат','Finding'),'outcome_'+i,OUTCOME)}${select(tx('Наказание','Sanction'),'sanction_'+i,SANCTION)}${select(tx('Нарушение','Violation'),'reason_'+i,REASON,c.reason_code)}</fieldset>`).join('')+`<label><input type="checkbox" name="evidence_complete">${tx('Все запрошенные доказательства уже получены','All requested evidence has already been received')}</label>`;
 else if(action!=='claim')fields=area(tx('Причина / пояснение','Reason / comment'),['comment','evidence','internal_note'].includes(action)?'text':'reason','required minlength="5" maxlength="4000"');
 if(action==='appeal')fields+=area(tx('Причина просрочки — если истекли 24 часа','Reason for lateness — if over 24 hours'),'late_reason');
 if(action==='evidence')fields+=area(tx('HTTPS-ссылки, по одной в строке','HTTPS links, one per line'),'evidence','required');
 if(action==='exception')fields+=select(tx('Принять после срока?','Accept after deadline?'),'accept',{yes:['Да','Yes'],no:['Нет','No']});
 if(action==='appoint_reviewer')fields+=field(tx('ID профиля независимого судьи','Independent reviewer profile ID'),'reviewer_id','text','required');
 if(['request_evidence','extend_evidence'].includes(action))fields+=select(tx('Кому направить запрос','Recipient'),'recipient_id',Object.fromEntries([...new Set([c.author_id,...c.participants])].map(id=>[id,[id,id]])));
 host.innerHTML=`<form><h3>${esc(word(labels,action))}</h3>${fields}<p>${action==='decide'?tx('Решение будет опубликовано, наказание отправится на Main.','The decision will be published and sanctions sent to Main.'):''}</p><button>${tx('Подтвердить','Confirm')}</button><p role="status"></p></form>`;
 const key=crypto.randomUUID();host.querySelector('form').onsubmit=async e=>{e.preventDefault();const p=Object.fromEntries(new FormData(e.target));p.action=action;if(action==='decide'){p.findings=c.accused.map((id,i)=>({public_id:id,outcome:p['outcome_'+i],sanction:p['sanction_'+i],reason_code:p['reason_'+i]}));Object.keys(p).filter(k=>/^(outcome_|sanction_|reason_)/.test(k)).forEach(k=>delete p[k]);p.evidence_complete=p.evidence_complete==='on';}if(action==='exception')p.accept=p.accept==='yes';if(action==='evidence')p.evidence=p.evidence.split('\n').map(x=>x.trim()).filter(Boolean);const button=e.target.querySelector('button');button.disabled=true;try{await request('/v1/reports/'+c.report_id+'/actions',{payload:p,version:c.version},key);await mountCase(root,c.report_id);}catch(error){e.target.querySelector('[role=status]').textContent=errorText(error);button.disabled=false;}};
}
export function installReports(){
 let available=false;
 request('/v1/reports/status').then(result=>{available=result.enabled===true;if(available)scan();}).catch(()=>{});
 let previousUser;
 subscribe(model=>{if(!model.auth)return;const current=model.auth.authenticated?model.auth.driver?.publicId||'linked':'';if(previousUser!==undefined&&current!==previousUser){sessionRevision++;auth=null;me=null;document.querySelectorAll('.report-dialog').forEach(d=>d.close());document.getElementById('report-section')?.remove();if(document.documentElement.dataset.v2Page==='reports'){const root=document.getElementById('page-view');if(root){root.replaceChildren();mountReportsPage(root);}}}previousUser=current;});
 document.addEventListener('click',event=>{const b=event.target.closest?.('[data-report-race]');if(!b)return;event.preventDefault();event.stopPropagation();startReport({race_id:b.dataset.reportRace,namespace:b.dataset.reportNamespace,accused_id:b.dataset.reportDriver});},true);
 let queued=false;const scan=()=>{queued=false;const screen=document.documentElement.dataset.v2Page,root=document.getElementById('page-view');
  if(!available)return;
  const triggers=document.querySelectorAll('[data-report-race][hidden]');
  if(triggers.length)style();
  triggers.forEach(b=>b.hidden=false);
  if(!root)return;
  const profile=screen==='driver'?root.querySelector('.profile-main'):null,control=screen==='moderation'?root.querySelector('.control-workspace')||root:null;
  const nav=document.querySelector('.control-navigation');if(nav&&!nav.querySelector('[data-report-navigation]')){const a=document.createElement('a');a.className='button';a.dataset.reportNavigation='true';a.href=lang()==='en'?'/en/reports/':'/reports/';a.textContent=tx('Репорты','Reports');nav.append(a);}
  const parent=profile||control;if(parent&&!document.getElementById('report-section')){const section=document.createElement('section');section.id='report-section';section.className='panel report-section';parent.append(section);identity().then(()=>mountList(section,{driverId:profile?new URLSearchParams(location.search).get('id'):null,judicial:!!control}));}
 };
 new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(scan);}}).observe(document.body,{childList:true,subtree:true});scan();
}

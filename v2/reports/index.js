import {esc,STATUS,OUTCOME,SANCTION,REASON,actionsFor,reportHref} from './model.js?v=20261116reportmenu1';
import {ACTION_LABELS,EVENT_LABELS,nextStep} from './ux.js?v=20261116reportmenu1';
import {subscribe} from '/v2/bridge.js?v=20261006v2k';
const BASE='https://auth.asgracing.ru',lang=()=>document.documentElement.lang==='en'?'en':'ru';
const tx=(ru,en)=>lang()==='en'?en:ru;
const word=(map,key)=>{
 const pair=map[key];
 if(!pair)return key;
 return tx(...pair);
};
const date=t=>new Date(t*1000).toLocaleString(lang()==='en'?'en-GB':'ru-RU');
const labels=ACTION_LABELS;
let auth=null,me=null,styles=false,sessionRevision=0;
function style(){if(styles)return;styles=true;const link=document.createElement('link');link.rel='stylesheet';link.href='/v2/reports/reports.css?v=20261116reportmenu1';document.head.append(link);}
async function identity(){const revision=sessionRevision,payload=await fetch(BASE+'/v1/me',{credentials:'include',cache:'no-store'}).then(r=>r.ok?r.json():{});if(revision!==sessionRevision)return identity();auth=payload;const result=await request('/v1/reports/me').catch(()=>null);if(revision!==sessionRevision)return identity();me=result;return me;}
export async function request(path,body,key){
 const revision=sessionRevision;
 const options={credentials:'include',cache:'no-store',headers:{Accept:'application/json'}};
 if(body){options.method='POST';options.headers['Content-Type']='application/json';options.headers['X-CSRF-Token']=auth?.csrf_token||'';options.body=JSON.stringify({...body,idempotency_key:key||crypto.randomUUID()});}
 const response=await fetch(BASE+path,options);const data=await response.json().catch(()=>({}));if(revision!==sessionRevision&&path!=='/v1/reports/status')throw new Error('auth_changed');if(!response.ok)throw Object.assign(new Error(data.detail||'request_failed'),{status:response.status});return data;
}
function errorText(error){const copy={report_closed_read_only:['Дело закрыто. История доступна для чтения. Для обжалования используйте апелляцию.','This case is closed. Its history remains readable. Use an appeal to challenge the decision.'],draft_conflict:['Черновик изменён в другом окне. Откройте его заново, чтобы не перезаписать более новые данные.','The draft changed in another window. Reopen it to avoid overwriting newer data.'],invalid_profile:['Вставьте ссылку на профиль судьи на asgracing.ru.','Paste the judge’s profile link on asgracing.ru.'],invalid_evidence_url:['Добавьте HTTPS-ссылки на файлы или видео, каждую с новой строки.','Add HTTPS links to files or videos, one per line.'],race_not_available:['Гонка не найдена. Откройте результаты нужной гонки и скопируйте ссылку.','Race not found. Open its results and copy the race link.'],reviewer_not_judge:['У выбранного профиля нет прав судьи.','The selected profile does not have judge permissions.'],version_conflict:['Дело изменилось. Обновите его перед действием.','This report changed. Refresh before acting.'],judge_conflict_of_interest:['Участник инцидента не может судить это дело.','An involved participant cannot judge this case.'],driver_profile_required:['Свяжите Steam с профилем ASG.','Link Steam to an ASG profile.'],evidence_deadline_pending:['Срок ожидания доказательств ещё не истёк.','The evidence deadline has not passed.'],reports_unavailable:['Система репортов пока недоступна.','Reports are not available yet.']};return copy[error.message]?.[lang()==='en'?1:0]||tx('Не удалось сохранить действие. Проверьте поля, права и срок подачи.','Could not save the action. Check the fields, permissions and deadline.');}
const field=(title,name,type='text',extra='')=>`<label>${esc(title)}<input name="${name}" type="${type}" ${extra}></label>`;
const area=(title,name,extra='')=>`<label>${esc(title)}<textarea name="${name}" ${extra}></textarea></label>`;
const options=(map,selected)=>Object.entries(map).map(([key])=>`<option value="${key}"${key===selected?' selected':''}>${esc(word(map,key))}</option>`).join('');
const select=(title,name,map,selected)=>`<label>${esc(title)}<select name="${name}">${options(map,selected)}</select></label>`;
const driver=(id,names={})=>/^drv_[\w-]+$/.test(id||'')?`<a href="${lang()==='en'?'/en':''}/driver/?id=${encodeURIComponent(id)}">${esc(names?.[id]||tx('Профиль ASG','ASG profile'))}</a>`:id==='main'?'Main':id==='system'?tx('Система','System'):tx('Telegram · автор не подтверждён','Telegram · unverified author');
const login=()=>`<a class="button" href="${BASE}/v1/auth/steam/start?return_path=${encodeURIComponent(location.pathname+location.search)}">${tx('Войти через Steam','Sign in with Steam')}</a>`;
function dialog(title){style();const d=document.createElement('dialog'),trigger=document.activeElement;d.className='report-dialog';d.innerHTML=`<header><h2>${esc(title)}</h2><button type="button" data-close aria-label="${tx('Закрыть','Close')}">×</button></header><div class="report-body"></div>`;document.body.append(d);d.querySelector('[data-close]').onclick=()=>d.close();d.addEventListener('close',()=>{d.remove();trigger?.focus();},{once:true});d.showModal();return d;}

export async function startReport(context={}){const {openIntake}=await import('./intake.js?v=20261116reportmenu1');return openIntake(context,{identity,request,dialog,tx,date,language:lang});}

export async function mountList(root,options={}){const module=await import('./registry.js?v=20261116reportmenu1');return module.mountList(root,options,{style,tx,lang,request,me,errorText});}
export async function mountReportsPage(root){
 style();const query=new URLSearchParams(location.search);if(query.has('help')){const module=await import('./help.js?v=20261116reportmenu1');module.mountHelp(root,{tx,lang});return;}await identity();if(query.has('stats')){const module=await import('./statistics.js?v=20261116reportmenu1');await module.mountStatistics(root,{tx,lang,request,errorText});return;}const id=query.get('id');
 if(id)return mountCase(root,id);
 await mountList(root,{judicial:!!(me?.judge||me?.chief||me?.owner),heading:false});
 const entry=document.createElement('section');entry.className='report-intro';entry.innerHTML=`<div><h1>${tx('Репорты ASG','ASG incident reports')}</h1><p>${tx('Сообщите о гоночном инциденте. Подготовьте ссылку на гонку, доступные доказательства и момент эпизода.','Report a racing incident. Prepare the race link, accessible evidence and the incident timestamp.')}</p></div><nav class="report-entry-actions" aria-label="${tx('Подача и помощь','Submit and help')}"><button data-new-report>${tx('Подать репорт','Submit report')}</button><a class="report-help" href="?help=1"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 16v1"/></svg>${tx('Как подать репорт','How to submit a report')}</a>${me?.judge||me?.chief||me?.owner?`<a href="?stats=1">${tx('Статистика судей','Judge statistics')}</a>`:''}</nav>`;root.prepend(entry);entry.querySelector('button').onclick=()=>startReport();
 if(me?.global_unban===true){
  const button=document.createElement('button');
  button.type='button';button.textContent=tx('Полный разбан','Full unban');
  button.onclick=openGlobalUnban;entry.querySelector('.report-entry-actions').append(button);
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
export async function mountCase(root,id){const module=await import('./case.js?v=20261116reportmenu1');return module.mountCase(root,id,{identity,request,style,tx,lang,date,errorText,login,actionForm});}
async function actionForm(root,c,action){try{const module=await import('./judicial.js?v=20261116reportmenu1');module.actionForm(root,c,action,{tx,word,select,area,field,options,request,mountCase,errorText});}catch(error){root.querySelector('[data-action-form]').textContent=errorText(error);}}
export function installReports(){
 let available=false;
 request('/v1/reports/status').then(result=>{available=result.enabled===true;if(available)scan();}).catch(()=>{});
 let previousUser;
 subscribe(model=>{if(!model.auth)return;const current=model.auth.authenticated?model.auth.driver?.publicId||'linked':'';if(previousUser!==undefined&&current!==previousUser){sessionRevision++;auth=null;me=null;document.querySelectorAll('.report-dialog').forEach(d=>d.close());document.getElementById('report-section')?.remove();if(document.documentElement.dataset.v2Page==='reports'){const root=document.getElementById('page-view');if(root){root.replaceChildren();mountReportsPage(root);}}}previousUser=current;});
 document.addEventListener('click',async event=>{const copy=event.target.closest?.('[data-report-copy]');if(copy){event.preventDefault();event.stopPropagation();try{await navigator.clipboard.writeText(copy.dataset.reportCopy);copy.textContent=tx('Ссылка скопирована','Link copied');}catch{const text=document.createElement('input');text.value=copy.dataset.reportCopy;text.readOnly=true;copy.after(text);text.select();}return;}const b=event.target.closest?.('[data-report-race]');if(!b)return;event.preventDefault();event.stopPropagation();startReport({race_id:b.dataset.reportRace,namespace:b.dataset.reportNamespace,accused_id:b.dataset.reportDriver});},true);
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

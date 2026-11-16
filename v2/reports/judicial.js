import {esc,OUTCOME,SANCTION,REASON} from './model.js?v=20261116reportsux2';
import {ACTION_LABELS as labels,REQUEST_PRESETS,profileId} from './ux.js?v=20261116reportsux2';
export function actionForm(root,c,action,{tx,word,select,area,field,options,request,mountCase,errorText}){
 const host=root.querySelector('[data-action-form]');let fields='';
 const named=Object.fromEntries([...new Set([c.author_id,...(c.participants||[])])].map(id=>[id,[c.race.drivers[id]||tx('Автор репорта','Report author'),c.race.drivers[id]||'Report author']]));
 if(action==='decide')fields=area(tx('Решение и мотивировка','Decision and reasoning'),'summary','required minlength="20" maxlength="1000"')+c.accused.map((id,i)=>`<fieldset><legend>${esc(c.race.drivers[id]||id)}</legend><label>${tx('Вывод по пилоту','Finding for this driver')}<select name="outcome_${i}" required><option value="">${tx('Выберите вывод','Choose a finding')}</option>${options(OUTCOME)}</select></label><label>${tx('Наказание','Sanction')}<select name="sanction_${i}" required><option value="">${tx('Выберите наказание','Choose a sanction')}</option>${options(SANCTION)}</select></label>${select(tx('Тип нарушения','Type of incident'),'reason_'+i,REASON,c.reason_code)}</fieldset>`).join('')+(c.status==='awaiting_evidence'?`<label class="report-choice"><input type="checkbox" name="evidence_complete">${tx('Все запрошенные доказательства получены — ожидание можно завершить','All requested evidence has arrived — the wait can end')}</label>`:'');
 else if(action!=='claim')fields=area(tx(action==='internal_note'?'Заметка (видна только судьям)':'Причина / пояснение',action==='internal_note'?'Note (visible only to judges)':'Reason / explanation'),['comment','evidence','internal_note'].includes(action)?'text':'reason','required minlength="5" maxlength="2000"');
 if(action==='appeal'&&Date.now()/1000>c.decision_at+86400)fields+=area(tx('Почему апелляция подана позже 24 часов?','Why is this appeal over 24 hours late?'),'late_reason','required minlength="5" maxlength="1000"');
 if(action==='evidence')fields+=area(tx('Ссылки на доказательства (каждая с новой строки)','Evidence links (one per line)'),'evidence','required');
 if(action==='exception')fields+=select(tx('Принять после срока?','Accept after deadline?'),'accept',{'':['Выберите решение','Choose a decision'],yes:['Принять','Accept'],no:['Отклонить','Reject']},'');
 if(action==='appoint_reviewer')fields+=field(tx('Ссылка на профиль независимого судьи ASG','Independent judge’s ASG profile link'),'reviewer_id','url','required');
 if(['request_evidence','extend_evidence'].includes(action))fields=select(tx('Кому направить запрос','Send request to'),'recipient_id',named,c.author_id)+`<p>${tx('После отправки у адресата будет 24 часа на ответ.','The recipient will have 24 hours to respond after this request is sent.')}</p>`+(action==='request_evidence'?`<div class="report-toolbar">${REQUEST_PRESETS.map((pair,i)=>`<button type="button" data-preset="${i}">${[tx('Открыть доступ к видео','Video access'),tx('Указать момент видео','Video timestamp'),tx('Другой ракурс','Another view')][i]}</button>`).join('')}</div>`:'')+fields;
 const submitLabel=action==='decide'?tx('Проверить решение','Review decision'):action==='claim'?tx('Взять на рассмотрение','Take case'):action==='internal_note'?tx('Сохранить заметку','Save note'):action==='request_evidence'?tx('Отправить запрос','Send request'):word(labels,action);
 host.innerHTML=`<form><h3>${esc(word(labels,action))}</h3>${fields}<button>${esc(submitLabel)}</button><div data-preview></div><p role="status" aria-live="polite"></p></form>`;
 host.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>host.querySelector('[name=reason]').value=tx(...REQUEST_PRESETS[Number(b.dataset.preset)]));
 c.accused.forEach((id,i)=>{const outcome=host.querySelector(`[name=outcome_${i}]`),sanction=host.querySelector(`[name=sanction_${i}]`);if(outcome)outcome.onchange=()=>{if(outcome.value&&outcome.value!=='upheld'){sanction.value='none';sanction.disabled=true;}else{sanction.disabled=false;sanction.value='';}};});
 const key=crypto.randomUUID();let draftPayload;
 const send=async()=>{const button=host.querySelector('[data-publish]')||host.querySelector('form > button');button.disabled=true;try{await request('/v1/reports/'+c.report_id+'/actions',{payload:draftPayload,version:c.version},key);await mountCase(root,c.report_id);}catch(error){host.querySelector('[role=status]').textContent=errorText(error);button.disabled=false;}};
 host.querySelector('form').onsubmit=async e=>{e.preventDefault();const p=Object.fromEntries(new FormData(e.target));p.action=action;
  try{
   if(action==='decide'){p.findings=c.accused.map((id,i)=>({public_id:id,outcome:p['outcome_'+i],sanction:p['outcome_'+i]==='upheld'?p['sanction_'+i]:'none',reason_code:p['reason_'+i]}));Object.keys(p).filter(k=>/^(outcome_|sanction_|reason_)/.test(k)).forEach(k=>delete p[k]);p.evidence_complete=p.evidence_complete==='on';}
   if(action==='exception'){if(!p.accept)throw Error('invalid_exception');p.accept=p.accept==='yes';}
   if(action==='appoint_reviewer')p.reviewer_id=profileId(p.reviewer_id);
   if(action==='evidence')p.evidence=p.evidence.split('\n').map(x=>x.trim()).filter(Boolean);
   draftPayload=p;
   if(action!=='decide'){await send();return;}
   const preview=host.querySelector('[data-preview]');preview.innerHTML=`<h3>${tx('Проверьте решение перед публикацией','Review before publishing')}</h3><p class="report-pre">${esc(p.summary)}</p>${p.findings.map(f=>`<p>${esc(c.race.drivers[f.public_id]||f.public_id)}: ${esc(word(OUTCOME,f.outcome))} · ${esc(word(SANCTION,f.sanction))}</p>`).join('')}<p>${tx('После публикации решение будет сохранено, а его применение начнётся отдельно.','Publishing saves the decision. Its application is tracked separately.')}</p><button type="button" data-publish>${tx('Опубликовать решение','Publish decision')}</button>`;preview.querySelector('button').onclick=send;
  }catch(error){host.querySelector('[role=status]').textContent=errorText(error);}
 };
 host.querySelector('form').addEventListener('input',()=>host.querySelector('[data-preview]').replaceChildren());
 host.querySelector('form').addEventListener('change',()=>host.querySelector('[data-preview]').replaceChildren());
 host.scrollIntoView({block:'nearest'});
}

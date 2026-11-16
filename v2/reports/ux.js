import {esc} from './model.js?v=20261117reports1';

export const ACTION_LABELS={claim:['Взять на рассмотрение','Take case'],release:['Вернуть в очередь','Return to queue'],escalate:['Передать главному судье','Refer to chief judge'],decide:['Вынести решение','Issue decision'],appeal:['Подать апелляцию','Appeal decision'],comment:['Добавить пояснение','Add explanation'],evidence:['Добавить доказательства','Add evidence'],internal_note:['Заметка для судей','Judge-only note'],request_evidence:['Запросить доказательства','Request evidence'],extend_evidence:['Продлить срок ответа','Extend response deadline'],exception:['Рассмотреть просроченную подачу','Review late submission'],appoint_reviewer:['Назначить независимого судью','Appoint independent reviewer'],retry_execution:['Повторить применение решения','Retry decision application']};
export const EVENT_LABELS={submitted:['Репорт зарегистрирован','Report registered'],claim:['Взял на рассмотрение','Took the case'],release:['Репорт возвращён в очередь','Report returned to queue'],escalate:['Передано главному судье','Referred to chief judge'],decide:['Решение вынесено','Decision issued'],appeal:['Подана апелляция','Appeal filed'],comment:['Добавлено сообщение','Message added'],evidence:['Добавлены доказательства','Evidence added'],request_evidence:['Запрошены доказательства','Evidence requested'],extend_evidence:['Продлён срок ответа','Response deadline extended'],internal_note:['Заметка для судей','Judge-only note'],exception:['Рассмотрена просроченная подача','Late submission reviewed'],appoint_reviewer:['Назначен независимый судья','Independent reviewer appointed'],retry_execution:['Запрошен повтор применения решения','Decision application retry requested'],execution:['Обновлено применение решения','Decision application updated'],closed:['Репорт завершён','Report closed']};
export const REQUEST_PRESETS=[['Откройте доступ к видео: Google Диск → Поделиться → Все, у кого есть ссылка → Читатель. Проверьте ссылку в приватном окне.','Make the video accessible: Google Drive → Share → Anyone with the link → Viewer. Test the link in a private window.'],['Укажите момент эпизода от начала видео, например 02:14. Для нескольких роликов укажите время для каждого.','Provide the incident timestamp from the start of the video, for example 02:14. Give a timestamp for each clip.'],['Добавьте другой ракурс эпизода, если он у вас есть.','Add another view of the incident if you have one.']];
export function driverLabel(race,id){const numbers=(race.driver_numbers?.[id]||[]).filter(n=>Number.isInteger(n)&&n>0&&n<=999);return `${numbers.length?numbers.map(n=>'#'+n).join(' / '):'#—'} · ${race.drivers[id]||id}`;}
const validId=value=>/^[A-Za-z0-9][A-Za-z0-9_.-]{0,159}$/.test(value||'');
export function parseRaceLink(value,namespace=null){
 let id=String(value||'').trim(),source=namespace;
 if(id.includes('://')){
  let url;try{url=new URL(id);}catch{throw Error('invalid_race_link');}
  if(url.protocol!=='https:'||!['asgracing.ru','www.asgracing.ru'].includes(url.hostname)||url.username||url.password||url.port||!/^\/(?:en\/|ru\/|v2\/(?:en\/|ru\/)?)?race\/?$/.test(url.pathname))throw Error('invalid_race_link');
  id=url.searchParams.get('id');source=url.searchParams.get('source')||url.searchParams.get('namespace')||url.searchParams.get('ns')||namespace;
  if(source==='season'){id=url.searchParams.get('published');source='hourly';}
 }
 if(!validId(id)||source&&!['top','hourly'].includes(source))throw Error('invalid_race_link');
 return {race_id:id,namespace:source||null};
}
export function raceLink(r,language='ru'){
 const id=r._published_race?.race_id||r.race_id;
 const source=r._data_namespace==='hourly'||r._data_namespace==='season'||r.namespace==='hourly'?'hourly':'top';
 return `https://asgracing.ru/${language==='en'?'en/':''}race/?${new URLSearchParams({id,source})}`;
}
export function copyRaceButton(r,language='ru'){
 return `<button type="button" class="report-copy" data-report-copy="${esc(raceLink(r,language))}">${language==='en'?'Copy race link':'Скопировать ссылку на гонку'}</button>`;
}
export async function resolveRace(value,namespace,request){
 const parsed=parseRaceLink(value,namespace);
 if(parsed.namespace)return request('/v1/reports/race?'+new URLSearchParams(parsed));
 const results=await Promise.all(['top','hourly'].map(async source=>{
  try{return await request('/v1/reports/race?'+new URLSearchParams({race_id:parsed.race_id,namespace:source}));}
  catch(error){if(['race_not_available','invalid_identifier'].includes(error.message))return null;throw error;}
 }));
 const matches=results.filter(Boolean);if(matches.length!==1)throw Error(matches.length?'ambiguous_race':'race_not_available');return matches[0];
}
export function profileId(value){
 let id=String(value||'').trim();
 if(id.includes('://')){let u;try{u=new URL(id);}catch{throw Error('invalid_profile');}if(u.protocol!=='https:'||!['asgracing.ru','www.asgracing.ru'].includes(u.hostname)||!/^\/(?:en\/|ru\/)?driver\/?$/.test(u.pathname)||u.username||u.password)throw Error('invalid_profile');id=u.searchParams.get('id');}
 if(!/^drv_[\w-]+$/.test(id))throw Error('invalid_profile');return id;
}
export function nextStep(c,me,tx){
 if(['closed','late_rejected'].includes(c.status))return tx('Дело закрыто. Материалы и история доступны для чтения. Судьи могут продолжить служебную работу; доступные варианты обжалования — в действиях ниже.','This case is closed. Evidence and history remain readable. Judges can continue staff work; any available appeal options appear below.');
 if(['appealed','appeal_review'].includes(c.status))return tx(c.assigned_id?'Независимый судья рассматривает апелляцию.':'Апелляция ждёт независимого судью.',c.assigned_id?'An independent judge is reviewing the appeal.':'The appeal is waiting for an independent judge.');
 if(c.status==='awaiting_evidence')return c.evidence_recipient===me?.public_id?tx('Судья ждёт ваши материалы. Добавьте доказательства или пояснение.','The judge is waiting for your materials. Add evidence or an explanation.'):tx('Ждём ответ на запрос доказательств.','Waiting for a response to the evidence request.');
 if(['late_pending','appeal_late_pending'].includes(c.status))return tx('Главный судья рассмотрит причину просрочки.','The chief judge will review the reason for the late submission.');
 if(c.execution?.status==='rejected'||c.execution?.status==='retryable_error')return tx('Решение сохранено. Есть проблема с применением; требуется проверка главного судьи.','The decision is saved. Application needs attention from the chief judge.');
 if(c.decision&&c.execution?.status==='pending')return tx('Решение вынесено. Ожидаем подтверждение его применения.','The decision has been issued. Waiting for confirmation of its application.');
 if(c.decision)return tx('Ознакомьтесь с решением. Возможность апелляции указана в действиях по репорту.','Read the decision. Available appeal options appear in the report actions.');
 return c.assigned_id?tx('Судья изучает материалы. Можно добавить пояснение.','The judge is reviewing the evidence. You can add an explanation.'):tx('Репорт ждёт назначения судьи.','The report is waiting for a judge.');
}
export function momentValue(data){
 const base=String(data._ux?.location??data.moment??'').trim(),time=String(data._ux?.video_moment||'').trim();
 return time?`${base}\nВидео / Video: ${time}`:base;
}

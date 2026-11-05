export const REPORT_EVENTS=['submitted','claim','comment','evidence','request_evidence','extend_evidence','escalate','release','decide','appeal','exception','appoint_reviewer','execution'];
export const STATUS={submitted:['Подан','Submitted'],late_pending:['Ожидает исключения из срока','Deadline exception requested'],late_rejected:['Просроченная подача отклонена','Late submission rejected'],review:['На рассмотрении','Under review'],awaiting_evidence:['Ожидает доказательств','Awaiting evidence'],escalated:['Передан главному судье','Escalated'],decided:['Решение вынесено','Decision issued'],appealed:['Подана апелляция','Appeal filed'],appeal_late_pending:['Просроченная апелляция','Late appeal requested'],appeal_review:['Апелляция рассматривается','Appeal under review'],closed:['Завершён','Closed'],pending:['Ожидает исполнения','Awaiting execution'],applied:['Применено на Main','Applied on Main'],rejected:['Исполнение отклонено','Execution rejected'],retryable_error:['Исполнение повторяется','Execution retrying'],not_required:['Не требуется','Not required']};
export const OUTCOME={upheld:['Подтверждено','Upheld'],rejected:['Не подтверждено','Rejected'],insufficient:['Недостаточно доказательств','Insufficient evidence'],duplicate:['Дубликат','Duplicate'],withdrawn:['Отозвано','Withdrawn']};
export const SANCTION={none:['Без наказания','No sanction'],strike:['Страйк','Strike'],ban:['Бан','Ban']};
export const REASON={dangerous_driving:['Опасное вождение','Dangerous driving'],intentional_contact:['Намеренный контакт','Intentional contact'],unsporting_conduct:['Неспортивное поведение','Unsporting conduct'],abusive_behavior:['Оскорбления','Abusive behaviour'],cheating:['Читерство','Cheating'],rule_violation:['Нарушение правил','Rule violation'],other:['Другое','Other']};
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function reportButton(r,d){
 if(!/^drv_[\w-]+$/.test(d?.public_id||'')||!r?.race_id)return '';
 const lang=typeof document!=='undefined'&&document.documentElement.lang==='en'?'en':'ru';
 const race=r._published_race?.race_id||r.race_id;
 return `<button type="button" hidden class="text-link report-start" data-report-race="${esc(race)}" data-report-driver="${esc(d.public_id)}" data-report-namespace="${r._data_namespace==='hourly'||r._data_namespace==='season'?'hourly':'top'}">${lang==='en'?'Report':'Репорт'}</button>`;
}
export const reportHref=(id,lang='ru')=>`${lang==='en'?'/en':''}/reports/?id=${encodeURIComponent(id)}`;
export function actionsFor(c,me){
 if(!me||c.access!=='private')return [];
 if(Array.isArray(c.available_actions))return c.available_actions.filter(a=>['claim','comment','evidence','request_evidence','extend_evidence','escalate','release','decide','appeal','internal_note','exception','appoint_reviewer','retry_execution'].includes(a));
 const party=[c.author_id,...c.accused].includes(me.public_id),independent=![c.author_id,...c.participants].includes(me.public_id);
 const staff=me.judge||me.chief||me.owner,chief=me.chief||me.owner||c.reviewer_id===me.public_id;
 const result=['comment','evidence'];
 if(party&&c.decision&&!c.appeal)result.push('appeal');
 if(!staff||!independent)return result;
 result.push('internal_note');
 if(me.owner&&c.first_judge_id)result.push('appoint_reviewer');
 if((me.chief||me.owner)&&['late_pending','appeal_late_pending'].includes(c.status))result.push('exception');
 if(!c.assigned_id&&(c.status==='submitted'||(chief&&['escalated','appealed'].includes(c.status)&&c.first_judge_id!==me.public_id)))result.push('claim');
 if(c.assigned_id===me.public_id&&['review','appeal_review','awaiting_evidence'].includes(c.status)){
  result.push('decide','request_evidence','release');if(!c.decision)result.push('escalate');if(c.status==='awaiting_evidence')result.push('extend_evidence');
 }
 return result;
}

export const reportEvents=['submitted','against','claim','comment','evidence','request_evidence','extend_evidence','escalate','release','decide','appeal','exception','appoint_reviewer','execution','retry_execution'];
export function install(types,copy){
 for(const type of reportEvents)types.add('report.'+type);
 for(const [language,labels] of Object.entries(copy))for(const type of reportEvents)labels['report.'+type]=language==='en'?(type==='submitted'?'Incident report registered':type==='decide'?'Report decision issued':type==='appeal'?'Report appeal filed':'Report updated'):(type==='submitted'?'Зарегистрирован репорт':type==='decide'?'Принято решение по репорту':type==='appeal'?'Подана апелляция':'Репорт обновлён');
 copy.ru['report.against']='На вас подан репорт';copy.en['report.against']='A report was filed against you';
}
export const reportId=d=>/^rpt_[a-f0-9]{24}$/.test(d.report_id||'')?d.report_id:'';
export const reportLink=(item,lang)=>item.type.startsWith('report.')&&item.details.reportId?`${lang==='en'?'/en':''}/reports/?id=${encodeURIComponent(item.details.reportId)}`:null;

import {esc} from './model.js?v=20261117reports1';
import {person} from './presentation.js?v=20261117reports1';

export async function mountBanStatistics(root,{request,tx,lang,date}){
 root.innerHTML=`<a href="${lang()==='en'?'/en':''}/reports/">← ${tx('Репорты','Reports')}</a><h2>${tx('Статистика банов','Ban statistics')}</h2><label>${tx('Период','Period')}<select data-ban-days>${[0,7,30,90,365].map(n=>`<option value="${n}">${n?n+' '+tx('дней','days'):tx('За всё время','All time')}</option>`).join('')}</select></label><div data-ban-statistics aria-live="polite"></div>`;
 const output=root.querySelector('[data-ban-statistics]');let generation=0;
 async function load(){const epoch=++generation;output.textContent=tx('Загрузка…','Loading…');try{
  const result=await request('/v1/reports/moderation-statistics?days='+root.querySelector('[data-ban-days]').value);if(epoch!==generation)return;
  output.innerHTML=`<p>${tx('Всего банов','Total bans')}: <b>${Number(result.total)}</b></p><table class="report-statistics"><thead><tr><th>${tx('Кто выдал','Issued by')}</th><th>${tx('Баны','Bans')}</th></tr></thead><tbody>${result.items.map(i=>`<tr><td>${i.public_id?person(i.public_id,{[i.public_id]:i.display_name},tx,lang()):esc(i.kind==='system'?tx('Система','System'):i.display_name||tx('Автор не установлен','Unknown issuer'))}</td><td>${Number(i.bans)}</td></tr>`).join('')}</tbody></table><p class="report-caption">${tx('Все источники, по дате выдачи, без повторов. Ранние снятые баны могут отсутствовать. Неизвестные авторы/алиасы отдельно. С','All sources, once per issue date. Early revoked bans may be missing. Unknown issuers/aliases stay separate. Since')} ${result.available_since?date(result.available_since):'—'}.</p>`;
 }catch(error){if(epoch===generation)output.textContent=tx('Статистика недоступна.','Statistics unavailable.');}}
 root.querySelector('[data-ban-days]').onchange=load;await load();
}

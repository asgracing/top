import {person} from './presentation.js?v=20261117reports1';

export async function mountBanStatistics(root,{request,tx,lang,date}){
 root.innerHTML=`<a href="${lang()==='en'?'/en':''}/reports/">← ${tx('Репорты','Reports')}</a><h2>${tx('Баны администраторов','Administrator bans')}</h2><label>${tx('Период','Period')}<select data-ban-days>${[0,7,30,90,365].map(n=>`<option value="${n}">${n?n+' '+tx('дней','days'):tx('За всё время','All time')}</option>`).join('')}</select></label><div data-ban-statistics aria-live="polite"></div>`;
 const output=root.querySelector('[data-ban-statistics]');let generation=0;
 async function load(){const epoch=++generation;output.textContent=tx('Загрузка…','Loading…');try{
  const result=await request('/v1/reports/moderation-statistics?days='+root.querySelector('[data-ban-days]').value);if(epoch!==generation)return;
  output.innerHTML=`<p>${tx('Всего успешных банов','Total successful bans')}: <b>${Number(result.total)}</b></p><table class="report-statistics"><thead><tr><th>${tx('Администратор','Administrator')}</th><th>${tx('Баны','Bans')}</th></tr></thead><tbody>${result.items.map(i=>`<tr><td>${person(i.public_id,{[i.public_id]:i.display_name},tx,lang())}</td><td>${Number(i.bans)}</td></tr>`).join('')}</tbody></table><p class="report-caption">${tx('Подтверждённые баны через сайт без повторов; снятые позже тоже учитываются. Период — по получению квитанции. Журнал с','Confirmed website bans, counted once even if later revoked. Period uses receipt time. History since')} ${result.available_since?date(result.available_since):'—'}.</p>`;
 }catch(error){if(epoch===generation)output.textContent=tx('Статистика недоступна. Нужны права судьи.','Statistics unavailable. Judge access required.');}}
 root.querySelector('[data-ban-days]').onchange=load;await load();
}

// Donation history is a separate complete snapshot; recent items never determine all-time ranks.
export function createDonationSupport({$,esc,text,language,showDialog}){
 let snapshot=null,busy=null,currency='RUB',next=null,rows=[],error=false,retryTimer=null,retries=0;
 const money=(value,code=currency,digits=2)=>{try{return new Intl.NumberFormat(language==='ru'?'ru-RU':'en-GB',{style:'currency',currency:code,maximumFractionDigits:digits,minimumFractionDigits:digits===0?0:undefined}).format(value)}catch{return String(value)+' '+code}};
 const when=value=>{const raw=String(value||'').replace(' ','T'),date=new Date(raw+(/[Zz]|[+-]\d{2}:?\d{2}$/.test(raw)?'':'+03:00'));return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat(language==='ru'?'ru-RU':'en-GB',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Moscow'}).format(date)};
 const group=()=>snapshot?.currencies?.find(c=>c.currency===currency)||snapshot?.currencies?.[0];
 const choices=()=>'';
 const top=()=>`<ol class="donation-top">${(group()?.top||[]).map((d,i)=>`<li><span class="donation-place">${i+1}</span><span><b title="${esc(d.username)}">${esc(d.username)}</b><strong>${esc(money(d.amount,group().currency,0))}</strong></span></li>`).join('')}</ol>`;
 const unavailable=()=>`<p class="empty">${text('Полная история пока недоступна. Попробуйте позже.','Full history is not available yet. Please try again later.')}</p>`;
 function paintTop(){const node=$('donation-top');if(node)node.innerHTML=snapshot?.complete?choices()+top()+(group()?'':`<p class="empty">${text('Донатов пока нет','No donations yet')}</p>`):error?unavailable():`<p class="empty">${text('Загрузка…','Loading…')}</p>`;}
 const isOpen=()=>$('modal').open&&$('modal').dataset.kind==='donations';
 function row(d){return `<article class="donation-history-row"><div><b>${esc(d.username)}</b><strong>${esc(money(d.amount,d.currency))}${d.currency!=='RUB'?` <small>≈ ${esc(money(d.amount_rub,'RUB'))}</small>`:''}</strong><time>${esc(when(d.created_at))}</time></div>${d.currency!=='RUB'?`<small>${text('Курс ЦБ','CBR rate')}: ${esc(d.fx_rate)} · ${esc(d.fx_date)}</small>`:''}${d.message?`<p>${esc(d.message)}</p>`:''}</article>`;}
 function paint(){
  if(!isOpen())return;
  if(!snapshot?.complete){$('modal-body').innerHTML=unavailable()+`<button type="button" class="button" data-donations-retry>${text('Повторить','Retry')}</button>`;return;}
  const g=group(),metric=(name,value)=>`<div><span>${name}</span><b>${esc(value)}</b></div>`;
  $('modal-body').innerHTML=`${snapshot.stale?`<p role="status">${text('Показана последняя полная история; обновление продолжается.','Showing the last complete history while it refreshes.')}</p>`:''}<div class="detail-grid donation-statistics">${metric(text('Всего донатов','Total donations'),snapshot.total_items)}${g?metric(text('Общая сумма','Total amount'),money(g.total,g.currency))+metric(text('Средний донат','Average donation'),money(g.average,g.currency))+metric(text('Крупнейший донат','Largest donation'),money(g.largest,g.currency)):''}</div><h3>${text('Топ-3 донатеров за всё время','All-time top 3 donors')}</h3>${top()}<p class="data-note">${text('Единый топ в рублях: курс ЦБ на дату доната, до комиссий. Ники объединены без учёта регистра и лишних пробелов; анонимные вне топа.','Unified RUB ranking: CBR rate on each donation date, before fees. Names are grouped ignoring case and extra spaces; anonymous donations are excluded.')}</p><h3>${text('Все донаты','All donations')}</h3><div class="donation-history-scroll" tabindex="0" role="region" aria-label="${text('История донатов — прокрутка','Donation history — scroll')}">${rows.map(row).join('')||`<p>${text('Донатов пока нет','No donations yet')}</p>`}<button type="button" class="button" data-donations-more${next==null?' hidden':''}>${text('Загрузить ещё','Load more')}</button></div><p class="data-note">${text('Обновлено','Updated')}: ${esc(when(new Date(snapshot.updated_at*1000).toISOString()))}</p>`;
  $('modal-body').querySelector('.donation-history-scroll').addEventListener('scroll',event=>{const node=event.currentTarget;if(node.scrollHeight-node.scrollTop-node.clientHeight<160)void more();});
 }
 async function read(offset=0,revision){const query=new URLSearchParams({offset,limit:50});if(revision)query.set('revision',revision);const response=await fetch('https://data.asgracing.ru/donations-api/history?'+query,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(response.status===409?'revision':'history');const result=await response.json();if(!result.ok)throw new Error('history');return result;}
 async function load({retry=false}={}){
  if(busy)return busy;if(snapshot&&!retry)return;
  clearTimeout(retryTimer);
  busy=(async()=>{try{const result=await read();snapshot=result.complete?result:null;rows=result.items||[];next=result.next_offset;error=!result.complete;if(group())currency=group().currency;if(!result.complete&&retries++<10)retryTimer=setTimeout(()=>{void load({retry:true});},Math.max(5,Number(result.retry_after)||30)*1000);}catch{error=true;}finally{busy=null;paintTop();paint();}})();return busy;
 }
 async function more(){
  if(busy||next==null||!isOpen())return;
  const button=$('modal-body').querySelector('[data-donations-more]');button.disabled=true;
  busy=(async()=>{try{const result=await read(next,snapshot.revision);rows.push(...result.items);next=result.next_offset;const scroll=$('modal-body').querySelector('.donation-history-scroll'),position=scroll?.scrollTop;if(isOpen()){button.insertAdjacentHTML('beforebegin',result.items.map(row).join(''));button.hidden=next==null;if(scroll)scroll.scrollTop=position;}}catch(e){button.textContent=e.message==='revision'?text('История обновилась — открыть заново','History changed — reopen'):text('Повторить загрузку','Retry loading');if(e.message==='revision')button.dataset.donationsRetry='true';}finally{busy=null;button.disabled=false;}})();return busy;
 }
 $('donations-all')?.addEventListener('click',event=>{showDialog(text('Поддержка ASG Racing','ASG Racing supporters'),`<p role="status">${text('Загрузка…','Loading…')}</p>`,event.currentTarget);$('modal').dataset.kind='donations';$('modal-eyebrow').textContent='ASG RACING / '+text('ПОДДЕРЖКА','SUPPORT');$('modal-body').scrollTop=0;if(snapshot)paint();void load({retry:true});});
 document.addEventListener('click',event=>{if(!isOpen())return;if(event.target.closest('[data-donations-retry]')){void load({retry:true});return;}if(event.target.closest('[data-donations-more]'))void more();});
 return {load};
}

import {driverSafetyRaces,safetyPeriodRaces,safetyListRaces,driverSafetyBreakdown,srNumber} from '../driver-safety-model.js?v=20261031sr1';
import {renderPagination} from './pagination.js?v=20261015pagination1';

export function mountDriverSafety({root,profile,state,native,esc,text,date,trackName,cache=new Map(),onTabChange=()=>{}}) {
  const records=driverSafetyRaces(profile),content=root.querySelector('#profile-sr-content');
  const size=5;let alive=true,ticket=0,lastWidth=0,resizeTimer;
  state.srPeriod||='30';state.srFilter||='all';state.srPage||=1;
  const f=value=>srNumber(value)===null?'—':Number(value).toFixed(2);
  const change=value=>srNumber(value)===null?'—':(value>0?'+':value<0?'−':'')+Math.abs(value).toFixed(2);
  const color=value=>value>0?'positive':value<0?'negative':'';
  const category=value=>value>=5?'a':value>=2.5?'b':'c';
  const periodRows=()=>safetyPeriodRaces(records,state.srPeriod);
  const selected=()=>records.find(r=>r.key===state.srSelected);
  const current=srNumber(profile.safety_rating??profile.summary?.safety_rating);
  const count=value=>value===null?'—':esc(value);
  const racesWord=value=>text(value%10===1&&value%100!==11?'гонка':[2,3,4].includes(value%10)&&![12,13,14].includes(value%100)?'гонки':'гонок','races');
  const metric=(label,value)=>`<div><span>${label}</span><b>${value}</b></div>`;
  const deltaHtml=value=>`<span class="${color(value)}">${change(value)}</span>`;

  function setTab(tab,{focus=false,notify=true}={}) {
    state.driverProfileTab=tab==='sr'?'sr':'races';
    root.querySelectorAll('[data-profile-analysis-tab]').forEach(button=>{
      const active=button.dataset.profileAnalysisTab===state.driverProfileTab;
      button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
      if(active&&focus)button.focus();
    });
    root.querySelector('#profile-races-panel').hidden=state.driverProfileTab!=='races';
    root.querySelector('#profile-sr-panel').hidden=state.driverProfileTab!=='sr';
    if(state.driverProfileTab==='sr')render();
    if(notify)onTabChange(state.driverProfileTab);
  }

  function render() {
    const period=periodRows(),list=safetyListRaces(period,state.srFilter),last=records.at(-1);
    if(!period.some(r=>r.key===state.srSelected))state.srSelected=period.at(-1)?.key||null;
    const total=period.every(r=>r.delta!==null)?period.reduce((sum,r)=>sum+r.delta,0):null;
    const periodLabel=state.srPeriod==='all'?text('За всё время','All time'):text(`За ${state.srPeriod} дней`,`Last ${state.srPeriod} days`);
    content.innerHTML=`<div class="driver-sr-overview"><section class="panel driver-sr-score" aria-label="Safety Rating"><div class="driver-sr-heading"><h3>${text('Текущий SR','Current SR')}</h3>${current===null?'':`<span class="rating-badge sr sr-${category(current)}">${text('Класс','Class')} ${category(current).toUpperCase()}</span>`}</div><div class="driver-sr-value">${f(current)}<small>/ 9.99</small></div><p>${current===null?text('Рейтинг не опубликован','Rating is not published'):current>=5?text('A — чисто','A — clean'):current>=2.5?text('B — стабильно','B — stable'):text('C — риск','C — risk')}</p><div class="driver-sr-scale" aria-label="C: 1.00–2.49; B: 2.50–4.99; A: 5.00–9.99"><div><span></span><span></span><span></span>${current===null?'':`<i style="left:${Math.max(0,Math.min(100,(current-1)/8.99*100))}%"></i>`}</div><span>C · 1.00</span><span>B · 2.50</span><span>A · 5.00</span><span>9.99</span></div><div class="driver-sr-latest"><div><span>${text('Последняя запись SR','Latest SR record')}</span><b>${last?deltaHtml(last.delta):'—'}</b><small>${last?date(last.finishedAt):text('Нет истории','No history')}</small></div>${last?`<button class="button" data-sr-last>${text('Разбор','Details')} ↗</button>`:''}</div></section><section class="panel driver-sr-trend"><div class="driver-sr-heading"><div><h3>${text('Как менялся SR','SR over time')}</h3><div class="driver-sr-period-total">${deltaHtml(total)}<small>${periodLabel} · ${period.length} ${racesWord(period.length)}</small></div></div><div class="driver-sr-period" role="group" aria-label="${text('Период','Period')}">${['7','30','90','all'].map(p=>`<button class="button" data-sr-period="${p}" aria-pressed="${p===state.srPeriod}">${p==='all'?text('Всё время','All time'):text(p+' дн.',p+' days')}</button>`).join('')}</div></div><div class="driver-sr-chart" id="profile-sr-chart"></div><p class="driver-sr-chart-note">${text('Нажми на точку или выбери гонку ниже — увидишь причины изменения.','Select a point or a race below to see why SR changed.')}</p></section></div><div class="driver-sr-analysis"><section class="panel driver-sr-history"><div class="driver-sr-heading"><h3>${text('История изменений','Change history')}</h3><span class="driver-sr-count">${list.length}</span></div><div class="driver-sr-filters" role="group" aria-label="${text('Фильтр изменений','Filter changes')}">${[['all',text('Все','All')],['gain',text('Начислено','Gains')],['loss',text('Снято','Losses')],['zero',text('Без изменений','Unchanged')]].map(([key,title])=>`<button class="button" data-sr-filter="${key}" aria-pressed="${state.srFilter===key}">${title}</button>`).join('')}</div><div id="profile-sr-list"></div></section><section class="panel driver-sr-breakdown" id="profile-sr-breakdown" aria-live="polite"></section></div><p class="page-help driver-sr-footnote">${text('Показаны опубликованные данные расчёта. Инцидентные баллы не определяют виновника контакта. Позиция на финише и ELO не влияют на SR.','Published calculation data is shown. Incident points do not determine fault. Finishing position and ELO do not affect SR.')}</p>`;
    drawList();drawChart();drawBreakdown();
  }

  function drawList() {
    const list=safetyListRaces(periodRows(),state.srFilter);
    const max=Math.max(1,Math.ceil(list.length/size));state.srPage=Math.max(1,Math.min(max,state.srPage));
    const rows=list.slice((state.srPage-1)*size,state.srPage*size);
    content.querySelector('#profile-sr-list').innerHTML=`<div class="driver-sr-list-labels"><span>${text('Гонка','Race')}</span><span>${text('SR после','SR after')}</span><span>Δ SR</span></div>${rows.map(r=>`<button class="driver-sr-race" data-sr-race="${esc(r.key)}" aria-pressed="${r.key===state.srSelected}"><span><b>${esc(trackName(r.track))}</b><small>${date(r.finishedAt)}</small></span><span>${f(r.after)}</span><strong class="${color(r.delta)}">${change(r.delta)}</strong></button>`).join('')||`<p class="page-empty">${text('В этом периоде таких гонок нет.','No matching races in this period.')}</p>`}${renderPagination({name:'profile-sr',page:state.srPage,total:list.length,size,tx:text,previous:'data-sr-page="-1"',next:'data-sr-page="1"'})}`;
  }

  function drawChart() {
    const box=content.querySelector('#profile-sr-chart');if(!box)return;
    const rows=periodRows();
    if(!rows.length){box.innerHTML=`<p class="page-empty">${text('В этом периоде нет записей SR. Выбери другой период.','No SR records in this period. Choose another period.')}</p>`;return;}
    const width=Math.max(280,Math.round(box.clientWidth)||600),height=210,left=40,right=18,top=24,bottom=29;
    lastWidth=width;
    const values=rows.flatMap(r=>[r.before,r.after]).filter(v=>v!==null);
    let low=Math.max(1,Math.floor((Math.min(...values)-.1)*2)/2),high=Math.min(9.99,Math.ceil((Math.max(...values)+.1)*2)/2);
    if(high-low<.4)low=Math.max(1,high-.5);
    const x=i=>left+(i+1)/rows.length*(width-left-right),y=v=>top+(high-v)/(high-low)*(height-top-bottom);
    const start=rows[0].before??rows[0].after;
    const path=`M${left},${y(start)} `+rows.map((r,i)=>`L${x(i)},${y(r.after)}`).join(' ');
    const active=rows.find(r=>r.key===state.srSelected),ai=rows.indexOf(active),step=Math.max(1,Math.ceil(rows.length/120));
    const ticks=Array.from({length:4},(_,i)=>low+(high-low)*i/3);
    box.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="group" aria-label="${text('График SR: выбери гонку для разбора','SR chart: select a race for details')}"><defs><linearGradient id="driver-sr-area" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#21e6ad" stop-opacity=".15"/><stop offset="1" stop-color="#21e6ad" stop-opacity="0"/></linearGradient></defs>${ticks.map(v=>`<line x1="${left}" y1="${y(v)}" x2="${width-right}" y2="${y(v)}" stroke="#819db536"/><text x="${left-9}" y="${y(v)+3}" text-anchor="end" fill="#a3b6c6" font-size="10">${f(v)}</text>`).join('')}${low<=5&&high>=5?`<line x1="${left}" x2="${width-right}" y1="${y(5)}" y2="${y(5)}" stroke="#19c88777" stroke-dasharray="4 4"/><text x="${width-right}" y="${y(5)-6}" text-anchor="end" font-size="9" fill="#a2bfb0">${text('Класс A','Class A')} · 5.00</text>`:''}<path d="${path} L${width-right},${height-bottom} L${left},${height-bottom} Z" fill="url(#driver-sr-area)"/><path d="${path}" fill="none" stroke="#21e6ad" stroke-width="2"/>${active?`<line x1="${x(ai)}" x2="${x(ai)}" y1="${top}" y2="${height-bottom}" stroke="#f4ce5477" stroke-dasharray="3 4"/>`:''}${rows.map((r,i)=>i%step&&r!==active&&i!==rows.length-1?'':`<g data-sr-race="${esc(r.key)}" role="button" tabindex="0" aria-pressed="${r===active}" aria-label="${esc(trackName(r.track))}, ${date(r.finishedAt)}, SR ${f(r.after)}, ${change(r.delta)}"><title>${date(r.finishedAt)} · ${esc(trackName(r.track))} · ${change(r.delta)} SR</title><circle cx="${x(i)}" cy="${y(r.after)}" r="12" fill="transparent"/><circle cx="${x(i)}" cy="${y(r.after)}" r="${r===active?5:3}" fill="${r.delta<0?'#ff7586':r.delta===0?'#91a7bd':'#21e6ad'}" stroke="${r===active?'#f4ce54':'#0f1b27'}" stroke-width="${r===active?2:1}"/></g>`).join('')}${[0,...(rows.length>2?[Math.floor((rows.length-1)/2)]:[]),...(rows.length>1?[rows.length-1]:[])].map(i=>`<text x="${x(i)}" y="${height-5}" text-anchor="${i===rows.length-1?'end':'middle'}" fill="#a3b6c6" font-size="9">${date(rows[i].finishedAt).split(',')[0]}</text>`).join('')}</svg>`;
  }

  function drawBreakdown() {
    const r=selected(),box=content.querySelector('#profile-sr-breakdown');
    if(!r){box.innerHTML=`<p class="page-empty">${text('Выбери период с записями SR.','Choose a period with SR records.')}</p>`;return;}
    const b=driverSafetyBreakdown(r,cache.get(r.key));
    let verdict=r.delta>0?text('Рейтинг повышен','Rating increased'):r.delta<0?text('Рейтинг снижен','Rating decreased'):text('SR не изменился','SR unchanged');
    let reason=text('Ниже — опубликованные составляющие расчёта за эту гонку.','Published calculation components for this race are shown below.');
    if(b.enough===false){verdict=text('Недостаточно дистанции для изменения SR','Not enough distance to change SR');reason=text('Пройдено меньше 50% дистанции лидера. Компоненты расчёта не применены к рейтингу.','Less than 50% of the leader’s distance was completed. Calculation components were not applied to the rating.');}
    else if(b.cap){verdict=r.after===9.99?text('Начисление ограничено потолком 9.99','Gain limited by the 9.99 ceiling'):text('Списание ограничено нижней границей 1.00','Loss limited by the 1.00 floor');reason=text('Сумма компонентов отличается от фактического изменения: рейтинг ограничен границами шкалы.','Component totals differ from the actual change because the rating is limited by its scale.');}
    const items=b.context.safety_counted_penalty_items;
    const penaltyNames={Cutting:text('Срезка трассы','Track cutting'),PitSpeeding:text('Скорость в питлейне','Pit speeding'),Trolling:text('Опасное поведение','Trolling')};
    const penaltyEvidence=Array.isArray(items)&&items.length?items.map(item=>`${penaltyNames[item.reason]||item.reason||'—'} · ${item.penalty||'—'}${item.violationInLap!=null?' · '+text('круг ','lap ')+item.violationInLap:''}`).join('; '):b.penalties===null?text('Данные о штрафах не опубликованы','Penalty data is not published'):text('Учтённых автоштрафов: ','Counted auto penalties: ')+b.penalties;
    const components=[
      [text('Чистота кругов','Lap cleanliness'),b.clean,b.completed!==null&&b.invalid!==null?text(`${Math.max(0,b.completed-b.invalid)} из ${b.completed} кругов валидны; невалидных — ${b.invalid}.`,`${Math.max(0,b.completed-b.invalid)} of ${b.completed} laps valid; ${b.invalid} invalid.`):text('Данные о кругах не опубликованы','Lap data is not published'),'✓'],
      [text('Инциденты','Incidents'),b.incidentDelta,text('Зафиксировано баллов: ','Recorded points: ')+count(b.incidents),'◇'],
      [text('Автоматические штрафы','Automatic penalties'),b.penaltyDelta,esc(penaltyEvidence),'⚑']
    ];
    const missing=text('Не опубликовано','Not published');
    const adjustment=b.raw!==null&&r.delta!==null?Math.round((r.delta-b.raw)*100)/100:null;
    box.innerHTML=`<div class="driver-sr-heading"><span class="eyebrow">${text('Разбор одной гонки','Single-race breakdown')}</span><span class="driver-sr-selected">${text('Выбрана','Selected')}</span></div><div class="driver-sr-race-title"><div><h3>${esc(trackName(r.track))}</h3><p>${date(r.finishedAt)}</p></div><strong class="${color(r.delta)}">${change(r.delta)}<small>${text('изменение SR','SR change')}</small></strong></div><div class="driver-sr-before-after">${metric(text('До гонки','Before race'),f(r.before))}<span>→</span>${metric(text('После гонки','After race'),f(r.after))}</div><div class="driver-sr-verdict ${color(r.delta)}"><b>${verdict}</b><p>${reason}</p></div><div class="driver-sr-components">${components.map(([title,value,evidence,icon])=>`<div><span class="driver-sr-component-icon ${color(value)}">${icon}</span><div><h4>${title}</h4><p>${evidence}</p></div><strong class="${color(value)}">${value===null?`<span class="driver-sr-unavailable">${missing}</span>`:change(value)}</strong></div>`).join('')}</div>${adjustment?`<div class="driver-sr-adjustment"><span>${b.enough===false?text('Проверка дистанции','Distance check'):b.cap?text('Учёт границы SR','SR boundary adjustment'):text('Корректировка итогового расчёта','Final calculation adjustment')}</span><b>${deltaHtml(adjustment)}</b></div>`:''}<div class="driver-sr-total"><span>${text('Фактическое изменение','Actual change')}</span><strong>${deltaHtml(r.delta)} SR</strong></div>${b.stale?`<p class="page-help driver-sr-data-note">${text('Протокол расходится с историей SR. Приоритет у истории; неподтверждённые компоненты не подставлены.','The race report differs from the SR ledger. Ledger values take priority; unverified components are not substituted.')}</p>`:''}${b.missing?`<p class="page-help driver-sr-data-note">${text('Часть компонентов не опубликована. Пропуски не означают нулевое начисление.','Some components are not published. Missing data does not mean zero gain.')}</p>`:''}<details class="driver-sr-details"><summary>${text('Как получились эти числа','How these numbers were obtained')}</summary><div class="driver-sr-detail-grid">${metric(text('Дистанция пилота / лидера','Driver / leader distance'),count(b.completed)+' / '+count(b.leader))}${metric(text('Невалидных кругов','Invalid laps'),count(b.invalid))}${metric(text('Баллы инцидентов','Incident points'),count(b.incidents))}${metric(text('Автоштрафов учтено / пропущено','Auto penalties counted / ignored'),count(b.penalties)+' / '+count(b.ignored))}${metric(text('Сумма опубликованных компонентов','Published component total'),f(b.raw))}${metric(text('Результат расчёта до границ SR','Calculation before SR bounds'),f(b.computed))}</div><p class="page-help">${text('Компоненты приведены до применения дистанционных правил и границ рейтинга. Итог взят из истории SR; формула на сайте заново не рассчитывается.','Components precede distance rules and rating bounds. The final result comes from the SR ledger; the site does not recalculate the formula.')}</p></details><div class="driver-sr-actions"><button type="button" class="button" data-sr-full-history>${text('Полная история гонок','Full race history')}</button><button type="button" class="button" data-rating-kind="sr" data-rating-driver="${esc(profile.public_id)}">${text('История рейтинга','Rating history')} ↗</button></div>`;
    if(b.missing&&r.raceId&&!cache.has(r.key)) {
      const request=++ticket;cache.set(r.key,null);
      native().safetyBreakdown({source:r.ledger,publicId:profile.public_id,playerId:profile.player_id,raceId:r.raceId}).then(value=>{
        cache.set(r.key,value);if(alive&&request===ticket&&state.srSelected===r.key)drawBreakdown();
      }).catch(()=>{if(alive&&request===ticket&&state.srSelected===r.key)drawBreakdown();});
    }
  }

  function choose(key,{scroll=false}={}) {
    ++ticket;state.srSelected=key;
    const list=safetyListRaces(periodRows(),state.srFilter),index=list.findIndex(r=>r.key===key);
    if(index>=0)state.srPage=Math.floor(index/size)+1;
    drawList();drawChart();drawBreakdown();
    if(scroll)content.querySelector('#profile-sr-breakdown').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  function onClick(event) {
    const tab=event.target.closest('[data-profile-analysis-tab]');if(tab){setTab(tab.dataset.profileAnalysisTab);return;}
    const point=event.target.closest('[data-sr-race]');if(point){choose(point.dataset.srRace,{scroll:matchMedia('(max-width:760px)').matches});return;}
    const period=event.target.closest('[data-sr-period]');if(period){state.srPeriod=period.dataset.srPeriod;state.srPage=1;render();return;}
    const filter=event.target.closest('[data-sr-filter]');if(filter){state.srFilter=filter.dataset.srFilter;state.srPage=1;render();return;}
    const page=event.target.closest('[data-sr-page]');if(page){setPage(state.srPage+Number(page.dataset.srPage));return;}
    if(event.target.closest('[data-sr-last]')){state.srPeriod='all';state.srFilter='all';state.srSelected=records.at(-1)?.key;state.srPage=1;render();choose(state.srSelected);}
    if(event.target.closest('[data-sr-full-history]'))setTab('races',{focus:true});
  }
  function onKeydown(event) {
    const tab=event.target.closest('[data-profile-analysis-tab]');
    if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();setTab(event.key==='Home'?'races':event.key==='End'?'sr':tab.dataset.profileAnalysisTab==='sr'?'races':'sr',{focus:true});return;}
    const point=event.target.closest('g[data-sr-race]');
    if(point&&['Enter',' '].includes(event.key)){event.preventDefault();choose(point.dataset.srRace);content.querySelector(`g[data-sr-race="${CSS.escape(point.dataset.srRace)}"]`)?.focus();}
  }
  function setPage(page){state.srPage=page;drawList();}
  root.addEventListener('click',onClick);root.addEventListener('keydown',onKeydown);
  const observer=new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(alive&&state.driverProfileTab==='sr'){const box=content.querySelector('#profile-sr-chart');if(box&&Math.max(280,Math.round(box.clientWidth))!==lastWidth)drawChart();}},50);});observer.observe(content);
  setTab(state.driverProfileTab||'races',{notify:false});
  return {setPage,destroy(){alive=false;++ticket;clearTimeout(resizeTimer);observer.disconnect();root.removeEventListener('click',onClick);root.removeEventListener('keydown',onKeydown);}};
}

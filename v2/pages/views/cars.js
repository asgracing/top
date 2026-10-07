// Approved R24 car presentation. Published data and actions are injected.
import {processCars, CARS_COLUMNS} from '/src/pages/cars/model.js';
import {sortTableRows} from '/src/shared/table-model.js';
export function createCarsViews(api) {
 const {raw,state,tx,label,section,metric,num,decimal,route,pageDriver,trackName,time,language}=api;
 const snapshot={get cars(){return (raw.cars || []).map(c=>({...c,best_lap:null,best_lap_ms:null,best_lap_track:null,best_lap_public_id:null,best_lap_driver:null,...raw.carLaps?.get(c.car_model_id)}));}};
 const titles={cars:()=>tx('Машины','Cars')};
 function empty(message=tx('Данные по машинам пока не опубликованы.','Car statistics have not been published yet.')) {return `<p class="site-empty">${message}</p>`;}
 const missing=()=>api.missing('car',state.selectedCar);
  const table=(heads,rows,css='')=>`<div class="page-table-scroll"><table class="page-table ${css}"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  const toolbar=html=>`<div class="site-tools">${html}</div>`;
  const search=(id,value,text)=>`<label class="page-search"><span aria-hidden="true">⌕</span><input type="search" id="${id}" value="${label(value)}" placeholder="${text}" aria-label="${text}"></label>`;
  const intro=(title,description,actions='',image=null)=>`<section class="panel site-intro${image?' has-image':''}"${image?` style="--site-cover:url('assets/${label(image)}.jpg')"`:''}><div><span class="eyebrow">ASG RACING</span><h1>${label(title)}</h1><p>${description}</p></div><div class="site-intro-actions">${actions}</div></section>`;
  const crumb=screen=>`<div class="page-breadcrumb"><a href="${route()}">${tx('Главная','Home')}</a><span>/</span><b>${titles[screen]()}</b><span class="page-snapshot">${tx('Обновлено','Updated')} · ${time(raw.carsUpdated)}</span></div>`;
  const seo=(title,text)=>`<section class="panel page-seo"><h2>${title} · ASG Racing ACC</h2><p>${text}</p></section>`;
  const carRoute=c=>{const u=new URL(route('cars'),location.origin);u.searchParams.set('car',c.car_name || c.car || c);if(state.carTrack)u.searchParams.set('track',state.carTrack);return u;};
  const carLink=c=>`<a data-r24-car="${label(c.car_name || c.car || c)}" href="${carRoute(c).pathname+carRoute(c).search}">${label(c.car_name || c.car || c)}</a>`;
  const carImage=(c,css='')=>`<img class="r24-car-image ${css}" src="/assets/car-icons/${Number(c.car_model_id)}.png" alt="${label(c.car_name)}" loading="lazy" onerror="this.hidden=true">`;
  const percent=n=>n==null?'—':decimal(n)+'%';
  function carSummary(c){return `<div class="r24-car-hero"><div><span class="eyebrow">${tx('Статистика модели','Model statistics')}</span><h2>${label(c.car_name)}</h2><p>${tx('Результаты всех опубликованных гонок на этой машине.','Results from all published races with this car.')}</p><div class="r24-car-stats">${metric(tx('Старты','Starts'),num(c.races))}${metric(tx('Победы','Wins'),num(c.wins))}${metric(tx('Подиумы','Podiums'),num(c.podiums))}${metric(tx('Пилоты','Drivers'),num(c.unique_drivers))}</div></div>${carImage(c,'large')}</div>`;}
  function lapCell(c){
   if(!state.carTrack)return `<span class="r24-lap-placeholder">${tx('Выбери трассу','Choose a circuit')}</span>`;
   if(raw.carLapsLoading)return `<span class="r24-lap-placeholder">${tx('Загрузка…','Loading…')}</span>`;
   if(raw.carLapsError)return `<span class="r24-lap-placeholder">${tx('Недоступно','Unavailable')}</span>`;
   if(!c.best_lap_ms)return `<span class="r24-lap-placeholder">${tx('Нет данных','No data')}</span>`;
   return `<span class="best-lap-value">${label(c.best_lap)}</span><small class="r24-lap-note">${label(trackName(c.best_lap_track))}${c.best_lap_driver?' · '+(c.best_lap_public_id?pageDriver({public_id:c.best_lap_public_id,driver:c.best_lap_driver}):label(c.best_lap_driver)):''}</small>`;
  }
  function lapStatus(){
   const message=raw.carLapsLoading?tx('Загружаются рекорды выбранной трассы…','Loading the selected circuit records…'):raw.carLapsError?tx('Не удалось загрузить рекорды трассы.','Could not load circuit records.'):state.carTrack?tx('Лучшие круги на выбранной трассе — среди опубликованных личных рекордов пилотов.','Best laps on the selected circuit are taken from published drivers’ personal records.'):tx('Выбери трассу, чтобы посмотреть лучшие круги машин.','Choose a circuit to view the cars’ best laps.');
   return `<div class="r24-car-record-status" role="status">${message}${raw.carLapsError?` <button type="button" class="button" data-car-laps-retry>${tx('Повторить','Retry')}</button>`:''}</div>`;
  }
  function carRows(){
   const filtered=snapshot.cars.filter(c=>(!state.brand||c.car_name.split(' ')[0]===state.brand)&&c.car_name.toLowerCase().includes(state.carQuery.toLowerCase()));
   const sorted=processCars({rows:filtered,sortState:{key:state.carSort,direction:state.carDirection},sortRows:(rows,sort,columns)=>{
     const missing=c=>c[sort.key]==null||c[sort.key]===''||c[sort.key]==='—'||c[sort.key]==='-'||(sort.key==='best_lap'&&!(c.best_lap_ms>0));
     return [...sortTableRows(rows.filter(c=>!missing(c)),sort,columns,{locale:language}),...rows.filter(missing)];
   }});
   const max=Math.max(1,Math.ceil(filtered.length/10));state.carPage=Math.max(1,Math.min(state.carPage,max));
   const columns=[['car_name',tx('Машина','Car')],['races',tx('Старты','Starts')],['wins',tx('Победы','Wins')],['win_rate',tx('Доля побед','Win rate')],['podiums',tx('Подиумы','Podiums')],['unique_drivers',tx('Пилоты','Drivers')],['average_finish',tx('Средний финиш','Avg. finish')],['fastest_lap_awards',tx('Быстрые круги','Fastest laps')],['best_lap',tx('Лучший круг','Best lap')]];
   const html=lapStatus()+table(columns.map(([key,title])=>`<button type="button" class="r24-sort" aria-label="${title}" data-r24-sort="${key}">${title}${state.carSort===key?(state.carDirection==='asc'?' ↑':' ↓'):''}</button>`),sorted.slice((state.carPage-1)*10,state.carPage*10).map(c=>`<tr><td><div class="r24-car-cell">${carImage(c)}${carLink(c)}</div></td><td>${num(c.races)}</td><td>${num(c.wins)}</td><td>${percent(c.win_rate)}</td><td>${num(c.podiums)}</td><td>${num(c.unique_drivers)}</td><td>${decimal(c.average_finish)}</td><td>${num(c.fastest_lap_awards)}</td><td>${lapCell(c)}</td></tr>`).join('') || `<tr><td colspan="9" class="empty">${tx('Машины не найдены. Измени фильтр.','No cars found. Change the filter.')}</td></tr>`,'r24-cars-table')+`<div class="page-pagination"><span>${filtered.length?((state.carPage-1)*10+1):0}–${Math.min(state.carPage*10,filtered.length)} / ${filtered.length}</span><button type="button" data-r24-car-step="-1"${state.carPage===1?' disabled':''}>‹</button><b>${state.carPage} / ${max}</b><button type="button" data-r24-car-step="1"${state.carPage===max?' disabled':''}>›</button></div>`;
   const template=document.createElement('template');template.innerHTML=html;template.content.querySelectorAll('th').forEach((th,i)=>th.setAttribute('aria-sort',state.carSort===columns[i][0]?(state.carDirection==='asc'?'ascending':'descending'):'none'));return template.innerHTML;
  }
  function comparison(){
   const a=snapshot.cars.find(c=>String(c.car_model_id)===state.compare[0]),b=snapshot.cars.find(c=>String(c.car_model_id)===state.compare[1]);
   if(!a||!b)return '';
   return table([tx('Показатель','Metric'),carLink(a),carLink(b)],[['races',tx('Старты','Starts'),num],['wins',tx('Победы','Wins'),num],['win_rate',tx('Доля побед','Win rate'),percent],['podiums',tx('Подиумы','Podiums'),num],['unique_drivers',tx('Пилоты','Drivers'),num],['average_finish',tx('Средний финиш','Average finish'),decimal]].map(([key,title,f])=>`<tr><td>${title}</td><td>${f(a[key])}</td><td>${f(b[key])}</td></tr>`).join(''));
  }
  function carsView(){
   if(!snapshot.cars.length)return crumb('cars')+intro(titles.cars(),tx('Статистика моделей ACC','ACC model statistics'))+section(tx('Все модели','All models'),empty());
   const c=state.selectedCar?snapshot.cars.find(c=>c.car_name===state.selectedCar||String(c.car_model_id)===state.selectedCar):snapshot.cars.reduce((a,b)=>a.races>b.races?a:b);
   if(!c)return missing('car',state.selectedCar);
   if(!state.compare.length)state.compare=[snapshot.cars[0],snapshot.cars[1] || snapshot.cars[0]].map(c=>String(c.car_model_id));
   return crumb('cars')+intro(titles.cars(),tx('Какие машины выбирают пилоты и какие результаты они показывают.','The cars drivers choose and the results they achieve.'),`<a class="button" href="${route('fun')}">${tx('Фан-статистика','Fun stats')} ↗</a>`)+section(tx('Выбранная машина','Selected car'),`<div id="r24-car-summary">${carSummary(c)}</div>`)+section(tx('Все модели','All models'),toolbar(search('r24-car-search',state.carQuery,tx('Поиск машины','Search cars'))+`<label>${tx('Производитель','Manufacturer')}<select id="r24-car-brand"><option value="">${tx('Все','All')}</option>${[...new Set(snapshot.cars.map(c=>c.car_name.split(' ')[0]))].sort().map(v=>`<option${state.brand===v?' selected':''}>${label(v)}</option>`).join('')}</select></label><label>${tx('Трасса лучшего круга','Best lap circuit')}<select id="r24-car-track"><option value="">${tx('Выбери трассу','Choose a circuit')}</option>${(raw.carTracks||[]).map(t=>`<option value="${label(t.code)}"${state.carTrack===t.code?' selected':''}>${label(trackName(t.code))}</option>`).join('')}</select></label>`)+`<div id="r24-car-content" aria-busy="${Boolean(raw.carLapsLoading)}">${carRows()}</div>`)+section(tx('Сравнение машин','Compare cars'),toolbar(state.compare.map((value,i)=>`<label>${tx('Машина','Car')} ${i+1}<select data-r24-compare="${i}">${snapshot.cars.map(c=>`<option value="${c.car_model_id}"${String(c.car_model_id)===value?' selected':''}>${label(c.car_name)}</option>`).join('')}</select></label>`).join(''))+`<div id="r24-car-comparison">${comparison()}</div><p class="page-help">${tx('Показатели зависят от состава пилотов и трасс. Лучшие круги на разных трассах не сравниваются напрямую.','Statistics depend on drivers and circuits. Best laps from different circuits are not directly comparable.')}</p>`)+seo(titles.cars(),tx('Статистика автомобилей ACC на ASG Racing: старты, победы, подиумы, пилоты и лучшие круги.','ASG Racing ACC car statistics: starts, wins, podiums, drivers and best laps.'));
  }

 return {carsView,carRows,carSummary,comparison,sortKeys:CARS_COLUMNS.map(c=>c.key)};
}

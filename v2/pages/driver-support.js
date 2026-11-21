import {TRACKS,raceKey,lapTime,finite,selectRaces,progressReport,parseTarget,chartPoints,bundleFromProfile} from '../driver-support-model.js?v=20261121paddock1';

import {passMarkup,exportPass} from './profile-racing-pass.js?v=20261121paddock1';

let stylesPromise;
export function loadDriverSupportStyles(){
  if(stylesPromise)return stylesPromise;
  stylesPromise=new Promise((resolve,reject)=>{
    const existing=document.getElementById('driver-support-style');
    if(existing?.sheet)return resolve();
    const link=existing||document.createElement('link');
    link.id='driver-support-style';link.rel='stylesheet';link.href='/v2/driver-support.css?v=20261121paddock1';
    link.addEventListener('load',resolve,{once:true});link.addEventListener('error',()=>{stylesPromise=null;link.remove();reject(Error('Profile styles unavailable'));},{once:true});
    if(!existing)document.head.append(link);
  });return stylesPromise;
}

export function mountDriverSupport({root,profile,language='ru',now,owner=false,settings,onSave}) {
  if(!root || !profile) return null;
  const bundle=bundleFromProfile(profile,now);
  const text=(ru,en)=>language==='en'?en:ru;
  const escape=value=>String(value??'—').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  const number=value=>finite(value)?new Intl.NumberFormat(language==='en'?'en-GB':'ru-RU',{maximumFractionDigits:2}).format(value):'—';
  const date=value=>new Intl.DateTimeFormat(language==='en'?'en-GB':'ru-RU',{day:'2-digit',month:'short',year:'numeric',timeZone:'Europe/Moscow'}).format(new Date(value));
  const signed=value=>finite(value)?`${value>0?'+':''}${number(value)}`:'—';
  const trackName=value=>Object.hasOwn(TRACKS,value)?TRACKS[value]:value;
  const profileUrl=`https://asgracing.ru/driver/?id=${encodeURIComponent(profile.public_id)}`;
  const assetUrl=path=>window.__ASG_PROFILE_ASSETS__?.[path]||path;
  const covers={track:['Трассы ASG','ASG tracks'],carbon:['Carbon Red','Carbon Red'],night:['Night Grid','Night Grid'],gold:['Podium Gold','Podium Gold']};
  const raceIds = new Set(bundle.races.map(raceKey));
  let preferences = {
    cover:Object.hasOwn(covers,settings?.cover) ? settings.cover : 'track',
    pins:Array.isArray(settings?.pins) ? [...new Set(settings.pins.filter(id=>raceIds.has(id)))].slice(0,3) : [],
    target:parseTarget(settings?.target) ? settings.target : '',
    pass_style:['carbon','holographic','classic'].includes(settings?.pass_style) ? settings.pass_style : 'hidden',
  };
  let saving=false;
  let passSide='front';
  let section='showcase', selectedRace=bundle.races[0]?raceKey(bundle.races[0]):'', format='wide',noticeTimer,alive=true,notice='';
  const first=bundle.races.find(race=>race.track==='monza')||bundle.races[0];
  let filters={track:first?.track||'monza',car:first?.car||'',days:90};
  function notify(message){notice=message;const box=root.querySelector('[data-pro-notice]');if(box)box.textContent=message;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{notice='';const current=root.querySelector('[data-pro-notice]');if(alive&&current)current.textContent='';},5000);}
  async function save(changes) {
    saving=true;
    const controls=[...root.querySelectorAll('button, select, input')].filter(el=>!el.disabled);
    controls.forEach(el=>{el.disabled=true;});
    try {
      await onSave(changes);
      if(!alive)return;
      preferences={...preferences,...changes};
      render();
      notify(text('Настройки сохранены.','Settings saved.'));
    } catch(error) {
      if(!alive)return;
      notify(error.status===409
        ? text('Настройки изменились в другом окне. Обнови страницу.','Settings changed in another window. Reload the page.')
        : text('Сохранить настройки не удалось.','Could not save settings.'));
    } finally {
      saving=false;
      controls.forEach(el=>{el.disabled=false;});
    }
  }
  function applyCover(){root.dataset.cover=preferences.cover;}
  function metric(label,value,hint='',cls=''){return `<div class="metric ${cls}"><span>${label}</span><strong>${value}</strong>${hint?`<small>${hint}</small>`:''}</div>`;}
  function raceOptions(current){return bundle.races.map(race=>`<option value="${escape(raceKey(race))}"${raceKey(race)===current?' selected':''}>${escape(`${date(race.date)} · ${trackName(race.track)} · P${race.finish ?? '—'} · ${race.car}`)}</option>`).join('');}
  function render(){
    applyCover();
    if(!bundle.races.length && ['progress','card'].includes(section)){section='showcase';}
    if(!owner && !preferences.pins.length && preferences.pass_style==='hidden'){root.innerHTML=`<p class="page-empty">${text('Пока нет опубликованных зачтённых гонок для витрины.','There are no published counted races to showcase yet.')}</p>`;return;}
    const entries=[['showcase',text('Витрина гонок','Race showcase')]];
    if(owner&&bundle.races.length)entries.push(['progress',text('Мой прогресс','My progress')],['card',text('Карточка заезда','Race result card')]);
    if(owner)entries.push(['style',text('Обложка','Cover')]);
    if(owner || preferences.pass_style!=='hidden')entries.push(['pass','Racing Pass']);
    root.innerHTML=`<div class="profile-pro-toolbar"><div class="pro-tabs" role="tablist" aria-label="${text('Возможности Pro','Pro features')}">${entries.map(([id,label])=>`<button type="button" class="button" role="tab" id="section-${id}" data-section="${id}" aria-selected="${section===id}" aria-controls="section-panel" tabindex="${section===id?0:-1}">${label}</button>`).join('')}</div></div><div id="section-panel" role="tabpanel" aria-labelledby="section-${section}">${({showcase:showcaseMarkup,progress:progressMarkup,card:cardMarkup,style:styleMarkup,pass:()=>passMarkup({profile:bundle.profile,style:preferences.pass_style,side:passSide,owner,text,escape})})[section]()}</div><p data-pro-notice class="page-help" role="status" aria-live="polite">${escape(notice)}</p>`;
    if(section==='card')void drawCard();
  }
function showcaseMarkup() {
  const pins = preferences.pins.map(key => bundle.races.find(race => raceKey(race) === key)).filter(Boolean);
  const cards = pins.map((race, index) => `<article class="race-highlight" style="--race-image:url('${assetUrl('/assets/v2-light/tracks/' + (Object.hasOwn(TRACKS, race.track) ? race.track : 'monza') + '.webp')}')"><div class="highlight-top"><span class="highlight-label">${race.finish===1?text('Победа','Win'):race.finish<=3&&race.finish>0?text('Подиум','Podium'):race.positions>0?text('Прорыв','Positions gained'):text('Выбранный заезд','Featured race')}</span>${owner ? `<button class="icon-button" type="button" data-remove="${escape(raceKey(race))}" aria-label="${escape(text('Убрать из витрины', 'Remove from showcase') + ': ' + trackName(race.track))}">×</button>` : ''}</div><div class="track-heading"><small>${escape(date(race.date))} · MSK</small><h3>${escape(trackName(race.track))}</h3><span>${escape(race.car)}</span></div><div class="highlight-result"><strong>P${race.finish ?? '—'}</strong><div><span>${text('Старт', 'Grid')} P${race.start ?? '—'}</span><b class="${race.positions > 0 ? 'positive' : ''}">${signed(race.positions)} ${text('поз.', 'pos.')}</b></div></div><div class="highlight-facts"><div><span>${text('Лучший круг', 'Best lap')}</span><b>${lapTime(race.bestLapMs)}</b></div><div><span>ELO</span><b>${signed(race.eloDelta)}</b></div><div><span>${text('Очки', 'Points')}</span><b>${number(race.points)}</b></div></div>${owner ? `<button class="button secondary" type="button" data-card="${escape(raceKey(race))}">${text('Создать карточку', 'Create result card')} ↗</button>` : ''}</article>`).join('');
  if(!owner)return `<div class="showcase-grid">${cards}</div>`;
  return `<div class="showcase-heading"><div><h3>${text('Моя гоночная витрина', 'My race showcase')}</h3><p>${text('Три заезда, которые рассказывают твою историю.', 'Three races that tell your story.')}</p></div><span class="small-pill">${pins.length} / 3</span></div><div class="showcase-grid">${cards || `<div class="empty">${text('Витрина пока пуста. Выбери гонку ниже.', 'Your showcase is empty. Choose a race below.')}</div>`}</div><div class="showcase-editor"><div><h3>${text('Добавить памятный заезд', 'Add a memorable race')}</h3><p>${text('Победа, прорыв через пелотон или первый финиш — выбираешь ты.', 'A win, a recovery drive or your first finish — your choice.')}</p></div><label class="sr-only" for="pin-race">${text('Выбрать гонку', 'Choose a race')}</label><select id="pin-race">${raceOptions('')}</select><button class="button" type="button" data-add-pin>${text('В витрину', 'Pin race')} +</button></div><div class="muted-callout">${text('Порядок можно менять кнопками ниже. Сохранённую витрину увидят посетители профиля.', 'Use the buttons below to reorder. Your saved showcase is visible to profile visitors.')}</div><div class="reorder-list">${pins.map((race, index) => `<div><span>${index + 1}. ${escape(trackName(race.track))} · ${date(race.date)} · P${race.finish}</span><button type="button" class="text-button" data-up="${index}" ${index === 0 ? 'disabled' : ''}>↑ ${text('Выше', 'Move up')}</button></div>`).join('')}</div>`;
}
function progressMarkup() {
  const races = selectRaces(bundle, filters), report = progressReport(races);
  const cutoff=Date.parse(bundle.source.read_at)-filters.days*86400000;
  const form=progressReport(bundle.races.filter(race=>Date.parse(race.date)>=cutoff));
  const formSummary=`<section><h3>${text('Гоночная форма','Race form')} · ${filters.days} ${text('дней','days')}</h3><div class="progress-metrics">
    ${metric(text('Все зачтённые гонки','All counted races'),number(form.races))}
    ${metric(text('Победы / подиумы','Wins / podiums'),`${form.wins} / ${form.podiums}`)}
    ${metric(text('Валидные круги','Valid laps'),form.validShare===null?'—':number(form.validShare)+'%',`${form.srCoverage} / ${form.races} ${text('гонок с SR','races with SR data')}`)}
  </div></section>`;
  const circuitOptions = [...new Set(bundle.races.map(race=>race.track))];
  const options = [...new Set(bundle.races.filter(race => race.track === filters.track).map(race => race.car))];
  if (!options.includes(filters.car)) filters.car = options[0] || '';
  const points = chartPoints(report.timed);
  const line = points.map(point => `${point.x},${point.y}`).join(' ');
  const target = parseTarget(preferences.target), targetGap = target && report.best ? report.best - target : null;
  const graph = points.length ? `<svg viewBox="0 0 760 160" class="pace-chart" role="img" aria-label="${text('Лучшие круги по гонкам, раньше слева, позже справа. Выше означает быстрее.', 'Race best laps, oldest to newest. Higher is faster.')}"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ff4054" stop-opacity=".2"/><stop offset="1" stop-color="#ff4054" stop-opacity="0"/></linearGradient></defs>${[35,80,125].map(y => `<path d="M0 ${y}H760" class="grid-line"/>`).join('')}<polygon points="${points[0].x},160 ${line} ${points.at(-1).x},160" fill="url(#area)"/><polyline points="${line}" fill="none" stroke="#ff5366" stroke-width="2"/>${points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="3.5" fill="#ffb7bf"><title>${date(point.date)} · ${lapTime(point.bestLapMs)}</title></circle>`).join('')}</svg>` : `<div class="empty">${text('За этот период подходящих гонок нет.', 'No matching races in this period.')}</div>`;
  return `<div class="section-heading"><div><h3>${text('Мой прогресс', 'My progress')}</h3><p>${text('Одна трасса и одна машина. Только зачтённые гонки.', 'One track and one car. Counted races only.')}</p></div><button class="button secondary" type="button" data-report>${text('Скачать отчёт', 'Download report')} ↓</button></div>${formSummary}<div class="filters"><label>${text('Трасса', 'Track')}<select id="filter-track">${circuitOptions.map(id => `<option value="${escape(id)}"${id === filters.track ? ' selected' : ''}>${escape(trackName(id))}</option>`).join('')}</select></label><label>${text('Машина', 'Car')}<select id="filter-car">${options.map(car => `<option value="${escape(car)}"${car === filters.car ? ' selected' : ''}>${escape(car)}</option>`).join('')}</select></label><label>${text('Период', 'Period')}<select id="filter-days">${[30,90,180,365].map(days => `<option value="${days}"${days === filters.days ? ' selected' : ''}>${days} ${text('дней', 'days')}</option>`).join('')}</select></label><div class="sample-pill">${number(report.races)} ${text('гонок в выборке', 'races in sample')}</div></div><div class="progress-metrics">${metric(text('Лучший гоночный круг', 'Best race lap'), lapTime(report.best), text('В выбранном периоде', 'Within selected period'))}${metric(text('Медиана лучших кругов', 'Median race best lap'), lapTime(report.median), `${report.timed.length} ${text('гонок с временем', 'timed races')}`)}${metric(text('Прогресс лучших кругов', 'Race best-lap progress'), report.improvement === null ? '—' : `${report.improvement >= 0 ? '−' : '+'}${(Math.abs(report.improvement) / 1000).toFixed(3)} s`, text('Медианы первой и второй половин', 'First-half vs second-half medians'), report.improvement > 0 ? 'good' : '')}</div><div class="progress-layout"><section class="chart-panel"><div class="chart-head"><div><span class="eyebrow">${text('Лучший круг каждой гонки', 'Best lap in each race')}</span><h3>${escape(trackName(filters.track))} <span>/ ${escape(filters.car)}</span></h3></div><span class="tiny">${text('Выше — быстрее', 'Higher is faster')} ↑</span></div>${graph}<div class="chart-dates"><span>${races.length ? date(races[0].date) : '—'}</span><span>${races.length ? date(races.at(-1).date) : '—'}</span></div><p class="method-note">${text('Сравнение по порядку гонок; погода и состояние трассы могут различаться. Это лучшие круги между гонками, не анализ стабильности каждого круга.', 'Race-order comparison; weather and track conditions may differ. These are race best laps, not lap-by-lap consistency.')}</p></section><aside class="goal-panel"><span class="eyebrow">${text('Личная цель', 'Personal target')}</span><h3>${text('Следующий шаг', 'Next milestone')}</h3><label for="lap-target">${text('Целевой круг', 'Target lap')}</label><div class="goal-input"><input id="lap-target" value="${escape(preferences.target)}" placeholder="1:46.000" inputmode="decimal" maxlength="9"><button class="icon-button" type="button" data-save-goal aria-label="${text('Сохранить цель', 'Save target')}">✓</button></div><strong class="goal-gap">${targetGap === null ? '—' : targetGap <= 0 ? text('Цель достигнута', 'Target reached') : `${(targetGap / 1000).toFixed(3)} s`}</strong><p>${text('Цель видна только тебе. Время круга зависит от условий заезда.', 'Only you can see this target. Lap times depend on session conditions.')}</p></aside></div><div class="progress-secondary">${metric(text('Победы / подиумы', 'Wins / podiums'), `${report.wins} / ${report.podiums}`)}${metric(text('Сумма изменений ELO', 'Sum of ELO changes'), signed(report.eloDelta), `${report.eloCoverage} / ${report.races} ${text('гонок с данными', 'races covered')}`)}${metric(text('Доля валидных кругов', 'Valid lap share'), report.validShare === null ? '—' : `${report.validShare.toFixed(1)}%`, `${report.srCoverage} / ${report.races} ${text('гонок с данными SR', 'races with SR data')}`)}${metric(text('Разброс лучших кругов', 'Race best-lap spread'), report.spread === null ? '—' : `${(report.spread / 1000).toFixed(3)} s`, text('Межквартильный диапазон', 'Interquartile range'))}</div><details class="methodology"><summary>${text('Что именно посчитано', 'How these metrics are calculated')}</summary><p>${text('Полный опубликованный реестр прочитан с одной ревизией. Выбраны зачтённые гонки, трасса, машина и период относительно даты снимка. Прогресс — разница медиан лучших кругов хронологических половин; минимум 6 времён. Доля валидных кругов = (круги − невалидные) / круги по гонкам с данными SR. Валидность не означает отсутствие контактов. Неизвестные значения не заменяются нулём.', 'The complete published history was read at one revision. Counted races are filtered by track, car and period relative to the snapshot date. Progress compares medians of chronological halves, requiring at least 6 timed races. Valid lap share = (laps − invalid laps) / laps for races with SR data. Validity does not imply no contact. Unknown values are not replaced with zero.')}</p></details>`;
}
function cardMarkup() {
  return `<div class="section-heading"><div><h3>${text('Карточка результата', 'Your race result card')}</h3><p>${text('Один заезд. Главное о нём. Готово для публикации.', 'One race. The highlights. Ready to share.')}</p></div><span class="small-pill">PNG · ${format === 'wide' ? '1200 × 675' : '1080 × 1080'}</span></div><div class="card-layout"><div class="card-canvas-wrap"><canvas id="result-canvas" width="1200" height="675" role="img" aria-label="${text('Карточка выбранного результата. Те же показатели доступны в описании справа.', 'Selected race result card. The same data is listed alongside.')} "></canvas></div><aside class="card-controls"><label for="card-race">${text('Гонка', 'Race')}</label><select id="card-race">${raceOptions(selectedRace)}</select><label for="card-format">${text('Формат', 'Format')}</label><select id="card-format"><option value="wide"${format === 'wide' ? ' selected' : ''}>${text('Широкий', 'Landscape')} · 16:9</option><option value="square"${format === 'square' ? ' selected' : ''}>${text('Квадрат', 'Square')} · 1:1</option></select><div class="card-description">${cardDescription()}</div><button class="button" type="button" data-export-png>${text('Скачать PNG', 'Download PNG')} ↓</button><button class="button secondary" type="button" data-copy-link>${text('Скопировать ссылку профиля', 'Copy profile link')}</button><p class="method-note">${text('Данные из опубликованного результата. Поделиться изображением можно вручную; сообщения никуда не отправляются.', 'Based on a published result. Share the image yourself; no messages are sent automatically.')}</p></aside></div>`;
}
function cardDescription() {
  const race = bundle.races.find(row => raceKey(row) === selectedRace);
  return `<b>${escape(trackName(race.track))}</b><span>${date(race.date)} · MSK</span><span>${escape(race.car)}</span><span>${text('Старт', 'Grid')} P${race.start} → ${text('Финиш', 'Finish')} P${race.finish}</span><span>${text('Лучший круг', 'Best lap')} ${lapTime(race.bestLapMs)}</span><span>ELO ${signed(race.eloDelta)} · SR ${signed(race.srDelta)}</span>`;
}
function styleMarkup() {
  return `<div class="section-heading"><div><h3>${text('Твой фон вместо карусели трасс', 'Your cover instead of the track carousel')}</h3><p>${text('Выбери фон, который увидят посетители профиля.', 'Choose a cover that visitors to your profile will see.')}</p></div><span class="small-pill">ASG PRO</span></div><div class="cover-options">${Object.entries(covers).map(([id, names]) => `<button class="cover-option${preferences.cover === id ? ' selected' : ''}" type="button" data-cover="${id}" aria-pressed="${preferences.cover === id}"><span class="cover-swatch cover-${id}"></span><span><b>${language === 'en' ? names[1] : names[0]}</b><small>${preferences.cover === id ? text('Выбрано', 'Selected') + ' ✓' : id === 'track' ? text('Базовый фон', 'Base cover') : text('Эксклюзивная обложка', 'Exclusive cover')}</small></span></button>`).join('')}</div><div class="appearance-preview"><span class="eyebrow">${text('Предпросмотр обложки профиля', 'Profile cover preview')}</span><h3>${escape(bundle.profile.driver)}</h3><p>#${bundle.profile.race_number} <span> / </span> ASG Racing</p></div>`;
}
async function drawCard() {
  const canvas = root.querySelector('#result-canvas');
  if (!canvas) return;
  const race = bundle.races.find(row => raceKey(row) === selectedRace);
  const width = format === 'wide' ? 1200 : 1080, height = format === 'wide' ? 675 : 1080;
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#16202e'); gradient.addColorStop(1, '#100f16'); ctx.fillStyle = gradient; ctx.fillRect(0,0,width,height);
  try {
    const image = new Image();
    image.src = assetUrl(`/assets/v2-light/tracks/${Object.hasOwn(TRACKS,race.track) ? race.track : 'monza'}.webp`);
    await image.decode();
    if(!alive || !canvas.isConnected)return;
    const scale = Math.max(width / image.width, height / image.height);
    ctx.drawImage(image, (width - image.width * scale) / 2, (height - image.height * scale) / 2, image.width * scale, image.height * scale);
  } catch { /* A gradient remains a complete downloadable design. */ }
  ctx.fillStyle = '#080d16b8'; ctx.fillRect(0,0,width,height);
  const square = format === 'square', margin = 65;
  const write = (value, x, y, size, color = '#edf3fa', weight = 600, max = width - margin * 2) => { ctx.fillStyle=color;ctx.font=`${weight} ${size}px "Segoe UI",Arial,sans-serif`;while(ctx.measureText(String(value)).width>max && size>12){size--;ctx.font=`${weight} ${size}px "Segoe UI",Arial,sans-serif`;}ctx.fillText(String(value),x,y); };
  ctx.fillStyle = '#ff334d'; ctx.fillRect(margin, 46, 56, 4);
  write('ASG RACING', margin, 91, 28, '#f4f6fa', 800);
  write(text('ГОНОЧНЫЙ РЕЗУЛЬТАТ', 'RACE RESULT'), margin, 125, 14, '#b3bdcc', 500);
  write(trackName(race.track), margin, square ? 250 : 235, square ? 75 : 68, '#fff', 700);
  write(`${date(race.date)} · MSK`, margin, square ? 294 : 277, 20, '#c2cad6', 400);
  write(`P${race.finish}`, square ? margin : width - 310, square ? 520 : 282, square ? 160 : 155, race.finish <= 3 ? '#f2d18c' : '#fff', 800);
  write(`${text('СТАРТ', 'GRID')} P${race.start}   →   ${text('ФИНИШ', 'FINISH')} P${race.finish}`, margin, square ? 570 : 350, 19, '#bdc7d6', 500);
  write(bundle.profile.driver, margin, square ? 660 : 409, square ? 36 : 34, '#fff', 700);
  write(`#${bundle.profile.race_number}  /  ${race.car}`, margin, square ? 702 : 445, 21, '#bbc5d4', 400);
  const y = square ? 804 : 517, column = (width - margin * 2) / 3;
  const facts = [[text('ЛУЧШИЙ КРУГ', 'BEST LAP'),lapTime(race.bestLapMs)],['ELO',signed(race.eloDelta)],['SR',signed(race.srDelta)]];
  facts.forEach(([label,value], i) => {write(label,margin+i*column,y,14,'#b1bdcd',500,column-15);write(value,margin+i*column,y+48,38,'#fff',700,column-15);});
  ctx.strokeStyle='#ffffff30';ctx.beginPath();ctx.moveTo(margin,height-78);ctx.lineTo(width-margin,height-78);ctx.stroke();
  write('asgracing.ru',margin,height-38,20,'#cbd3df',600);
  write(`race / ${race.id}`,width-360,height-38,15,'#a9b4c3',400,300);
  canvas.dataset.ready = 'true';
}
function download(blob, filename) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function reportText() {
  const rows = selectRaces(bundle, filters), r = progressReport(rows);
  return [bundle.profile.driver, profileUrl, `${trackName(filters.track)} / ${filters.car}`, `${filters.days} ${text('дней до даты снимка', 'days ending at snapshot')} ${bundle.source.read_at}`,
    `${text('Зачтённых гонок', 'Counted races')}: ${r.races}`, `${text('Лучший круг', 'Best lap')}: ${lapTime(r.best)}`, `${text('Медиана лучших кругов', 'Median race best lap')}: ${lapTime(r.median)}`,
    `${text('Изменение ELO, сумма', 'ELO changes, sum')}: ${signed(r.eloDelta)} (${r.eloCoverage}/${r.races})`, `${text('Доля валидных кругов', 'Valid lap share')}: ${r.validShare === null ? '—' : r.validShare.toFixed(1)+'%'} (${r.srCoverage}/${r.races})`,
    text('Погода и условия гонок могут различаться. Лучшие круги не измеряют покруговую стабильность. Валидность не означает отсутствие контактов.', 'Weather and session conditions may differ. Race best laps do not measure lap-by-lap consistency. Validity does not imply no contact.'),
    `revision=${bundle.source.revision}; archive_revision=${bundle.source.archive_revision}`, '', ...rows.map(row => `${row.date} | ${row.source}:${row.id} | P${row.start}→P${row.finish} | ${lapTime(row.bestLapMs)}`)].join('\n');
}
async function onClick(event) {
  const button = event.target.closest('button'); if (!button || saving) return;
  if (button.dataset.section) { section=button.dataset.section; render();root.querySelector(`#section-${section}`).focus(); }
  else if (button.dataset.card) { selectedRace=button.dataset.card;section='card';render();root.querySelector('#section-card').focus(); }
  else if (button.dataset.passSide) {passSide=button.dataset.passSide;render();root.querySelector(`[data-pass-side="${passSide}"]`)?.focus();}
  else if (!owner) return;
  else if (button.dataset.remove) await save({pins:preferences.pins.filter(key=>key!==button.dataset.remove)});
  else if (Object.hasOwn(button.dataset,'addPin')) {
    const key=root.querySelector('#pin-race').value;
    if(!raceIds.has(key))return;
    if(preferences.pins.includes(key))return notify(text('Эта гонка уже в витрине','This race is already pinned'));
    if(preferences.pins.length>=3)return notify(text('В витрине три места. Сначала убери один заезд.','Your showcase has three slots. Remove a race first.'));
    await save({pins:[...preferences.pins,key]});
  }
  else if (button.dataset.up) {
    const index=Number(button.dataset.up), pins=[...preferences.pins];
    [pins[index-1],pins[index]]=[pins[index],pins[index-1]];
    await save({pins});
  }
  else if (button.dataset.cover) await save({cover:button.dataset.cover});
  else if (Object.hasOwn(button.dataset,'saveGoal')) {
    const input=root.querySelector('#lap-target');
    if(!parseTarget(input.value)){input.setAttribute('aria-invalid','true');return notify(text('Формат цели: 1:46.000','Use the format 1:46.000'));}
    await save({target:input.value.trim()});
  }
  else if (Object.hasOwn(button.dataset,'savePass')) await save({pass_style:root.querySelector('#pass-style').value});
  else if (Object.hasOwn(button.dataset,'exportPass')) {
    try {await exportPass({profile:bundle.profile,style:root.querySelector('#pass-style').value,side:passSide,text,download});}
    catch {notify(text('Не удалось создать PNG.','Could not create PNG.'));}
  }
  else if (Object.hasOwn(button.dataset,'exportPng')) { const canvas=root.querySelector('#result-canvas');if(canvas.dataset.ready!=='true')return notify(text('Подожди, карточка ещё рисуется.','Please wait for the card to finish rendering.'));try{canvas.toBlob(blob=>{if(blob){download(blob,`ASG-${bundle.profile.public_id}-${selectedRace.split(':').at(-1)}-${format}.png`);notify(text('Карточка сохранена в PNG','PNG card downloaded'));}else notify(text('Не удалось создать изображение','Could not create image'));},'image/png');}catch{notify(text('Браузер не разрешил экспорт изображения','Image export was blocked by the browser'));} }
  else if (Object.hasOwn(button.dataset,'copyLink')) { try{await navigator.clipboard.writeText(profileUrl);notify(text('Ссылка профиля скопирована','Profile link copied'));}catch{notify(profileUrl);} }
  else if (Object.hasOwn(button.dataset,'report')) { download(new Blob([reportText()],{type:'text/plain;charset=utf-8'}),`ASG-progress-${filters.track}-${filters.days}d.txt`); }
}
function onChange(event) {
  const {id,value}=event.target;
  if(id==='filter-track'){filters.track=value;filters.car=bundle.races.find(race=>race.track===value)?.car||'';}
  else if(id==='filter-car')filters.car=value;
  else if(id==='filter-days')filters.days=Number(value);
  else if(id==='card-race')selectedRace=value;
  else if(id==='card-format')format=value;
  else return;
  render();root.querySelector(`#${id}`)?.focus();
}
function onKeydown(event) {
  const button=event.target.closest('[role="tab"]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const group=[...button.parentElement.querySelectorAll('[role="tab"]')];const current=group.indexOf(button);
  const index=event.key==='Home'?0:event.key==='End'?group.length-1:(current+(event.key==='ArrowRight'?1:-1)+group.length)%group.length;
  event.preventDefault();group[index].click();
}

  root.addEventListener('click',onClick);root.addEventListener('change',onChange);root.addEventListener('keydown',onKeydown);
  render();
  return {root,destroy(){alive=false;clearTimeout(noticeTimer);root.removeEventListener('click',onClick);root.removeEventListener('change',onChange);root.removeEventListener('keydown',onKeydown);}};
}

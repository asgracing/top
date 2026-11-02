import { activityPage, activityPageForDate, buildActivityHistory, buildActivityComparison } from './online-activity-model.js?v=20261102activity2';

export function createOnlineActivity({ getDays, esc, text, number, track }) {
  let scale = 'days', selectedDate = '', page = 0, view = 'overview', previousDays = 7;
  const locale = text('ru-RU', 'en-GB');
  const dayLabel = value => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));
  const shortDate = value => new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));
  const monthLabel = value => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + '-01T00:00:00Z'));
  const decimal = value => value == null ? '—' : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  const rangeLabel = period => period.start === period.end ? dayLabel(period.start) : `${dayLabel(period.start)} — ${dayLabel(period.end)}`;
  const detail = (name, value, stat = '') => `<div${stat ? ` data-activity-stat="${stat}"` : ''}><span>${esc(name)}</span><b>${esc(value ?? '—')}</b></div>`;
  const today = () => new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Moscow'}).format(new Date());
  const heading = (index,title,note='') => `<div class="pilot-activity-section-head"><div><span class="pilot-activity-section-index">${index}</span><h3>${title}</h3></div>${note ? `<span class="pilot-activity-section-note">${note}</span>` : ''}</div>`;
  const trendClass = difference => !difference || difference.absolute === 0 ? 'is-neutral' : difference.absolute > 0 ? 'is-up' : 'is-down';
  const signed = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${decimal(Math.abs(value))}`;
  function trend(difference, suffix) {
    if (!difference) return `<span class="pilot-activity-trend is-neutral">${text('Нет данных для сравнения','Comparison unavailable')}</span>`;
    const arrow = difference.absolute > 0 ? '↗' : difference.absolute < 0 ? '↘' : '→';
    const value = difference.percent === null ? signed(difference.absolute) : `${signed(difference.percent)}%`;
    return `<span class="pilot-activity-trend ${trendClass(difference)}">${arrow} ${value} <small>${suffix}</small></span>`;
  }
  function hoursSection(day, index='03') {
    const hours = Array.from({length:24},(_,hour) => day?.hours?.find(item => Number(item.hour) === hour) || {hour:String(hour).padStart(2,'0'),unique_players:null,races:null});
    const maximum = Math.max(1,...hours.map(hour => Number(hour.unique_players) || 0));
    return `<section class="pilot-activity-panel pilot-activity-hours">${heading(index,text('Ритм дня','Daily rhythm'),text('Уникальные пилоты · МСК','Unique drivers · MSK'))}
      <div class="pilot-activity-hour-chart">${hours.map(hour => `<div class="${Number(hour.unique_players) === maximum ? 'is-peak' : ''}" title="${esc(`${hour.hour}:00 · ${text('уникальные пилоты','unique drivers')}: ${number(hour.unique_players)} · ${text('гонки','races')}: ${number(hour.races)}`)}"><b>${number(hour.unique_players)}</b><span class="pilot-activity-hour-track"><i style="height:${(hour.unique_players || 0)/maximum*100}%"></i></span><small>${esc(hour.hour)}</small></div>`).join('')}</div>
      <div class="pilot-activity-hours-footer"><span>${text('Часы по московскому времени','Hours in Moscow time')}</span><b>${text('Пик активности','Peak activity')}: ${esc(day?.peak_hour?.label || '—')}</b></div></section>`;
  }
  function overviewHtml() {
    const comparison=buildActivityComparison(getDays(),previousDays,today());
    if(!comparison)return `<p class="empty">${text('История активности пока недоступна.','Activity history is not available yet.')}</p>`;
    const {current,average,yesterday,maximum,measuredDays,averageDifference,yesterdayDifference}=comparison;
    const day=current.days[0],timeline=[...comparison.previous,current],max=Math.max(1,...timeline.map(period=>period.average||0));
    const pulse='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12h5l3-8 4 16 3-8h5"/></svg>';
    const rank=measuredDays && comparison.strongerThan!==null ? `${text('Активнее, чем в','Busier than')} <strong>${comparison.strongerThan} ${text('из','of')} ${measuredDays}</strong> ${text('предыдущих дней','previous days')}` : text('Набираем историю для сравнения','Building history for comparison');
    const metric=(title,value,subtitle,stat)=>`<div class="pilot-activity-comparison" data-comparison="${stat}"><span>${title}</span><b>${value}</b>${subtitle}</div>`;
    return `<section class="pilot-activity-hero">
      <div class="pilot-activity-hero-top"><span class="pilot-activity-kicker">${pulse}${comparison.isToday ? text('Сегодня на ASG','Today on ASG') : text('Последний день с данными','Latest published day')}</span><time datetime="${current.start}">${esc(dayLabel(current.start))}</time></div>
      <div class="pilot-activity-hero-main"><div><div class="pilot-activity-main-value" data-activity-stat="daily"><b>${number(current.average)}</b><span>${text('уникальных пилотов','unique drivers')}</span></div><p>${text('Активность по опубликованным данным гонок','Activity from published race data')}</p></div><div class="pilot-activity-hero-change">${trend(averageDifference,text('к среднему','vs daily average'))}<span>${rank}</span></div></div>
      <div class="pilot-activity-hero-foot"><span>${comparison.isToday ? text('День ещё идёт — итог продолжит меняться','The day is still in progress') : text('Показан последний опубликованный день','Showing the latest published day')}</span><span>${text('Сравнение за','Comparison over')} ${previousDays} ${text('дней','days')}</span></div>
    </section>
    <section class="pilot-activity-panel pilot-activity-comparison-panel">${heading('01',text('В контексте предыдущих дней','Compared with previous days'),`<label class="pilot-activity-window">${text('Период','Window')} <select id="v2-activity-comparison-window" aria-label="${text('Количество предыдущих дней','Number of previous days')}">${[7,14,30].map(value=>`<option value="${value}"${previousDays===value?' selected':''}>${value} ${text('дней','days')}</option>`).join('')}</select></label>`)}
      <div class="pilot-activity-comparisons">${metric(text('Вчера','Yesterday'),number(yesterday),trend(yesterdayDifference,text('ко вчера','vs yesterday')),'yesterday')}${metric(text('Среднее за день','Daily average'),decimal(average),`<small>${text('За предыдущие','Over the previous')} ${previousDays} ${text('дней','days')}</small>`,'average')}${metric(text('Максимум за день','Daily maximum'),number(maximum),`<small>${comparison.peakDate?esc(dayLabel(comparison.peakDate)):'—'}</small>`,'maximum')}</div>
      <div class="pilot-activity-timeline online-history-scroll" tabindex="0" aria-label="${text('Активность по датам; прокрутка по горизонтали','Activity by date; scroll horizontally')}"><div class="online-history-chart pilot-activity-timeline-chart">${timeline.map(period=>`<button type="button" class="online-history-period${period.average===null?' is-missing':''}" data-activity-overview-date="${period.start}" aria-pressed="${period.start===current.start}" aria-label="${esc(`${dayLabel(period.start)} · ${number(period.average)} ${text('уникальных пилотов','unique drivers')}`)}"><b>${number(period.average)}</b><span class="online-history-bar"><i class="online-history-average" style="height:${(period.average||0)/max*100}%"></i></span><span class="online-history-date">${esc(shortDate(period.start))}</span><small>${period.start===current.start ? comparison.isToday?text('сегодня','today'):text('последний','latest') : new Intl.DateTimeFormat(locale,{weekday:'short',timeZone:'UTC'}).format(new Date(period.start+'T00:00:00Z'))}</small></button>`).join('')}</div></div>
      <p class="pilot-activity-footnote">${comparison.isToday ? text('Текущий день сравнивается с полными итогами предыдущих дней.','The current day is compared with completed previous days.') : ''} ${text('Дней с данными','Days with data')}: ${measuredDays}/${previousDays}. ${text('Выберите столбец, чтобы открыть детали дня.','Select a column to explore that day.')}</p>
    </section>
    <section class="pilot-activity-panel">${heading('02',text('Что происходило на серверах','On-track activity'))}<div class="pilot-activity-facts">${detail(text('Гонки','Races'),day?.races==null?'—':number(day.races))}${detail(text('Среднее пилотов на гонку','Average drivers per race'),decimal(day?.avg_players_per_race))}${detail(text('Трассы','Tracks'),day?(day.tracks||[]).map(track).join(', ')||'—':'—')}</div></section>
    ${hoursSection(day)}`;
  }
  const size = () => scale === 'days' ? 14 : 12;
  const history = () => buildActivityHistory(getDays(), scale);
  function selectDate(date) {
    selectedDate = date;
    page = activityPageForDate(history(), date, size());
  }
  function renderHistory() {
    const periods = history();
    if (!periods.length) return `<p class="empty">${text('История активности пока недоступна.','Activity history is not available yet.')}</p>`;
    if (!selectedDate) selectedDate = periods.at(-1).latestDate;
    const window = activityPage(periods, page, size());
    page = window.page;
    let selected = window.periods.find(period => period.start <= selectedDate && period.end >= selectedDate);
    if (!selected) {
      selected = window.periods.at(-1);
      selectedDate = selected.latestDate;
    }
    const daily = scale === 'days', maximum = Math.max(1, ...window.periods.map(period => period.maximum || 0));
    const height = value => Math.max(0, Math.min(100, (value || 0) / maximum * 100)).toFixed(2);
    const selectedLabel = daily ? text('Уникальные пилоты за день','Unique drivers that day') : text('Уникальные пилоты в среднем за день','Average daily unique drivers');
    const chart = `<section class="online-history pilot-activity-panel" aria-label="${text('История уникальных пилотов','Unique driver history')}">
      ${heading('01',text('Архив активности','Activity archive'))}
      <div class="online-history-scales" role="group" aria-label="${text('Масштаб истории','History scale')}">${[['days',text('Дни','Days')],['months',text('Месяцы','Months')]].map(([value, title]) => `<button type="button" data-activity-scale="${value}" aria-pressed="${scale === value}">${title}</button>`).join('')}</div>
      <div class="online-history-navigation"><button type="button" data-activity-page="older" aria-label="${text('Более ранние даты','Earlier dates')}"${page === window.maxPage ? ' disabled' : ''}>←</button><p>${esc(rangeLabel({start:window.periods[0].start,end:window.periods.at(-1).end}))}</p><button type="button" data-activity-page="newer" aria-label="${text('Более поздние даты','Later dates')}"${page === 0 ? ' disabled' : ''}>→</button></div>
      <p class="online-history-caption">${daily ? text('Уникальные пилоты за каждый день','Unique drivers each day') : text('Уникальные пилоты за день: среднее и максимум','Daily unique drivers: average and maximum')}</p>
      ${daily ? '' : `<div class="online-history-legend"><span><i class="is-average"></i>${text('Среднее за день','Daily average')}</span><span><i class="is-maximum"></i>${text('Максимум за день','Daily maximum')}</span></div>`}
      <div class="online-history-scroll" tabindex="0" aria-label="${text('График по датам; прокрутка по горизонтали','Dated chart; scroll horizontally')}"><div class="online-history-chart">${window.periods.map(period => {
        const label = scale === 'months' ? monthLabel(period.start.slice(0,7)) : daily ? shortDate(period.start) : `${shortDate(period.start)}–${shortDate(period.end)}`;
        const title = `${rangeLabel(period)} · ${selectedLabel}: ${decimal(period.average)}${daily ? '' : ` · ${text('максимум','maximum')}: ${number(period.maximum)} · ${text('дней с данными','days with data')}: ${period.observedDays}/${period.calendarDays}`}`;
        return `<button type="button" class="online-history-period${period.average == null ? ' is-missing' : ''}" data-activity-date="${esc(period.latestDate)}" data-period-start="${period.start}" aria-pressed="${period.key === selected.key}" aria-label="${esc(title)}" title="${esc(title)}"><b>${decimal(period.average)}</b><span class="online-history-bar" aria-hidden="true"><i class="online-history-maximum" style="height:${height(period.maximum)}%"></i><i class="online-history-average" style="height:${height(period.average)}%"></i></span><span class="online-history-date">${esc(label)}${!daily && period.partial ? ' *' : ''}</span>${daily ? '' : `<small>${text('макс.','max.')} ${number(period.maximum)}</small>`}</button>`;
      }).join('')}</div></div>
      <p class="online-history-scroll-note">${text('Листайте график в сторону и выбирайте дату для подробностей.','Scroll the chart sideways and select a date for details.')}</p>
      <p class="data-note online-history-note">${daily ? text('Все даты и часы — МСК. Дни без данных отмечены прочерком.','All dates and hours use Moscow time. Days without data show a dash.') : text('Показаны дневные значения, а не сумма уникальных пилотов за период. * Неполный период: среднее только по дням с данными.','These are daily figures, not the number of distinct drivers across the period. * Incomplete period: average uses only days with data.')}</p>
    </section>`;
    if (!daily) return `${chart}<section class="online-history-details pilot-activity-panel" aria-live="polite">${heading('02',esc(monthLabel(selected.start.slice(0,7))),esc(rangeLabel(selected)))}<div class="pilot-activity-facts">${detail(selectedLabel,decimal(selected.average),'average')}${detail(text('Дневной максимум','Daily maximum'),number(selected.maximum),'maximum')}${detail(text('Дата максимума','Peak date'),selected.peakDate ? dayLabel(selected.peakDate) : '—')}${detail(text('Дней с данными','Days with data'),`${selected.observedDays} / ${selected.calendarDays}`)}${detail(text('Гонки за период','Races in the period'),number(selected.races))}</div><button type="button" class="online-history-drill" data-activity-drill>${text('Посмотреть по дням →','Explore daily activity →')}</button></section>`;
    const days = buildActivityHistory(getDays());
    const months = [...new Set(days.map(period => period.start.slice(0,7)))].reverse();
    const month = selectedDate.slice(0,7), visible = days.filter(period => period.start.startsWith(month));
    const day = selected.days[0];
    return `${chart}<section class="online-history-details pilot-activity-panel" aria-live="polite">${heading('02',esc(dayLabel(selectedDate)))}<div class="online-controls"><label>${text('Месяц','Month')} <select id="v2-online-month">${months.map(value => `<option value="${value}"${value === month ? ' selected' : ''}>${esc(monthLabel(value))}</option>`).join('')}</select></label><label>${text('Дата','Date')} <select id="v2-online-date">${visible.map(period => `<option value="${period.start}"${period.start === selectedDate ? ' selected' : ''}>${esc(dayLabel(period.start))}${period.average == null ? ` · ${text('нет данных','no data')}` : ''}</option>`).join('')}</select></label></div>
      <div class="pilot-activity-facts">${detail(selectedLabel,number(selected.average),'daily')}${detail(text('Гонки','Races'),day?.races == null ? '—' : number(day.races))}${detail(text('Среднее пилотов на гонку','Average drivers per race'),decimal(day?.avg_players_per_race))}${detail(text('Индекс активности','Activity score'),day?.activity_score == null ? '—' : `${day.activity_score}/100`)}${detail(text('Пик активности · МСК','Peak activity · MSK'),day?.peak_hour?.label)}${detail(text('Трассы','Tracks'),day ? (day.tracks || []).map(track).join(', ') || '—' : '—')}</div></section>${hoursSection(day)}`;
  }
  function render() {
    return `<div class="pilot-activity"><div class="pilot-activity-tabs" role="tablist" aria-label="${text('Раздел активности','Activity view')}">${[['overview',text('Обзор дня','Daily overview')],['history',text('История','History')]].map(([value,title])=>`<button type="button" id="v2-activity-tab-${value}" role="tab" data-activity-tab="${value}" aria-selected="${view===value}" aria-controls="v2-activity-panel" tabindex="${view===value?0:-1}">${title}<span>${value==='overview'?text('Сейчас и в сравнении','Now & comparison'):text('Дни и месяцы','Days & months')}</span></button>`).join('')}</div><div id="v2-activity-panel" role="tabpanel" aria-labelledby="v2-activity-tab-${view}">${view==='overview'?overviewHtml():renderHistory()}</div></div>`;
  }
  function change(target) {
    if(target.id==='v2-activity-comparison-window')previousDays=Number(target.value);
    else if (target.id === 'v2-online-month') {
      const matching = buildActivityHistory(getDays()).filter(period => period.start.startsWith(target.value));
      selectDate(matching.at(-1)?.start || selectedDate);
    } else if (target.id === 'v2-online-date') selectDate(target.value);
    else return false;
    return true;
  }
  function click(target) {
    const tab=target.closest('[data-activity-tab]'),overviewDate=target.closest('[data-activity-overview-date]');
    if(tab){view=tab.dataset.activityTab;return true;}
    if(overviewDate){view='history';scale='days';selectDate(overviewDate.dataset.activityOverviewDate);return true;}
    const scaleButton = target.closest('[data-activity-scale]');
    const navigation = target.closest('[data-activity-page]');
    const period = target.closest('[data-activity-date]');
    if (scaleButton) { scale = scaleButton.dataset.activityScale; selectDate(selectedDate); }
    else if (navigation) { page += navigation.dataset.activityPage === 'older' ? 1 : -1; }
    else if (period) selectedDate = period.dataset.activityDate;
    else if (target.closest('[data-activity-drill]')) { scale = 'days'; selectDate(selectedDate); }
    else return false;
    return true;
  }
  function keydown(event){
    if(!event.target.closest('[data-activity-tab]')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return null;
    view=event.key==='Home'?'overview':event.key==='End'?'history':view==='overview'?'history':'overview';
    return `[data-activity-tab="${view}"]`;
  }
  return {render,change,click,keydown,open(){view='overview'}};
}

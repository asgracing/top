import { activityPage, activityPageForDate, buildActivityHistory } from './online-activity-model.js?v=20261102history1';

export function createOnlineActivity({ getDays, esc, text, number, track }) {
  let scale = 'days', selectedDate = '', page = 0;
  const locale = text('ru-RU', 'en-GB');
  const dayLabel = value => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));
  const shortDate = value => new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));
  const monthLabel = value => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + '-01T00:00:00Z'));
  const decimal = value => value == null ? '—' : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  const rangeLabel = period => period.start === period.end ? dayLabel(period.start) : `${dayLabel(period.start)} — ${dayLabel(period.end)}`;
  const detail = (name, value, stat = '') => `<div${stat ? ` data-activity-stat="${stat}"` : ''}><span>${esc(name)}</span><b>${esc(value ?? '—')}</b></div>`;
  const size = () => scale === 'days' ? 14 : 12;
  const history = () => buildActivityHistory(getDays(), scale);
  function selectDate(date) {
    selectedDate = date;
    page = activityPageForDate(history(), date, size());
  }
  function render() {
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
    const chart = `<section class="online-history" aria-label="${text('История уникальных пилотов','Unique driver history')}">
      <div class="online-history-scales" role="group" aria-label="${text('Масштаб истории','History scale')}">${[['days',text('Дни','Days')],['weeks',text('Недели','Weeks')],['months',text('Месяцы','Months')]].map(([value, title]) => `<button type="button" data-activity-scale="${value}" aria-pressed="${scale === value}">${title}</button>`).join('')}</div>
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
    if (!daily) return `${chart}<section class="online-history-details" aria-live="polite"><h3>${esc(rangeLabel(selected))}</h3><div class="detail-grid">${detail(selectedLabel,decimal(selected.average),'average')}${detail(text('Дневной максимум','Daily maximum'),number(selected.maximum),'maximum')}${detail(text('Дата максимума','Peak date'),selected.peakDate ? dayLabel(selected.peakDate) : '—')}${detail(text('Дней с данными','Days with data'),`${selected.observedDays} / ${selected.calendarDays}`)}${detail(text('Гонки за период','Races in the period'),number(selected.races))}</div><button type="button" class="online-history-drill" data-activity-drill>${text('Посмотреть по дням →','Explore daily activity →')}</button></section>`;
    const days = buildActivityHistory(getDays());
    const months = [...new Set(days.map(period => period.start.slice(0,7)))].reverse();
    const month = selectedDate.slice(0,7), visible = days.filter(period => period.start.startsWith(month));
    const day = selected.days[0];
    const hours = Array.from({length:24},(_,index) => day?.hours?.find(hour => Number(hour.hour) === index) || {hour:String(index).padStart(2,'0'),unique_players:null,races:null});
    const hourMax = Math.max(1,...hours.map(hour => Number(hour.unique_players) || 0));
    return `${chart}<section class="online-history-details" aria-live="polite"><div class="online-controls"><label>${text('Месяц','Month')} <select id="v2-online-month">${months.map(value => `<option value="${value}"${value === month ? ' selected' : ''}>${esc(monthLabel(value))}</option>`).join('')}</select></label><label>${text('Дата','Date')} <select id="v2-online-date">${visible.map(period => `<option value="${period.start}"${period.start === selectedDate ? ' selected' : ''}>${esc(dayLabel(period.start))}${period.average == null ? ` · ${text('нет данных','no data')}` : ''}</option>`).join('')}</select></label></div>
      <h3>${esc(dayLabel(selectedDate))}</h3><div class="detail-grid">${detail(selectedLabel,number(selected.average),'daily')}${detail(text('Гонки','Races'),day?.races == null ? '—' : number(day.races))}${detail(text('Среднее пилотов на гонку','Average drivers per race'),decimal(day?.avg_players_per_race))}${detail(text('Индекс активности','Activity score'),day?.activity_score == null ? '—' : `${day.activity_score}/100`)}${detail(text('Пик активности · МСК','Peak activity · MSK'),day?.peak_hour?.label)}${detail(text('Трассы','Tracks'),day ? (day.tracks || []).map(track).join(', ') || '—' : '—')}</div>
      <h3>${text('По часам · уникальные пилоты · МСК','Hourly unique drivers · Moscow time')}</h3><div class="hour-chart">${hours.map(hour => `<div title="${esc(`${hour.hour}:00 · ${text('уникальные пилоты','unique drivers')}: ${number(hour.unique_players)} · ${text('гонки','races')}: ${number(hour.races)}`)}"><b>${number(hour.unique_players)}</b><span style="--hour-height:${Math.max(0,(hour.unique_players || 0)/hourMax*100)}px"></span><small>${esc(hour.hour)}:00</small></div>`).join('')}</div></section>`;
  }
  function change(target) {
    if (target.id === 'v2-online-month') {
      const matching = buildActivityHistory(getDays()).filter(period => period.start.startsWith(target.value));
      selectDate(matching.at(-1)?.start || selectedDate);
    } else if (target.id === 'v2-online-date') selectDate(target.value);
    else return false;
    return true;
  }
  function click(target) {
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
  return {render,change,click};
}

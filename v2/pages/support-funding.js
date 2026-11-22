const STAGES = [
  {key:'operating', ru:'Функционирование проекта', en:'Project operations'},
  {key:'development', ru:'Развитие проекта', en:'Project development'},
];

export function ensureProjectSupportStyle() {
  if (document.querySelector('[data-project-support-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/styles/components/project-support.css?v=20261122supportlaunch';
  link.dataset.projectSupportStyle = '';
  document.head.append(link);
}

export function renderSupportFunding(text) {
  return `<div class="project-funding"><div class="project-funding-stages">${STAGES.map(({key,ru,en})=>
    `<div class="project-funding-stage" data-funding-stage="${key}">
      <h3>${text(ru,en)} <span data-funding-value aria-hidden="true"></span></h3>
      <div class="project-funding-track" role="progressbar" aria-label="${text(ru,en)}" aria-hidden="true"><span></span></div>
    </div>`).join('')}</div><p class="page-help" role="status">${text('Загружаем отчёт…','Loading the funding report…')}</p></div>`;
}

export function showSupportFunding(root, projection, text, statusLabel) {
  const valid = n => Number.isInteger(n) && n >= 0 && n <= 100;
  const operating = projection?.operating_percent;
  const development = projection?.development_percent;
  const published = valid(operating) && valid(development) && (operating === 100 || development === 0);
  root.querySelector('[role="status"]').textContent = statusLabel || (published
    ? text('Подтверждённые поступления за текущий месяц','Confirmed funding for the current month')
    : text('Отчёт за текущий месяц пока не опубликован','This month’s report has not been published yet'));
  for (const [index,{key}] of STAGES.entries()) {
    const stage = root.querySelector(`[data-funding-stage="${key}"]`);
    const track = stage.querySelector('.project-funding-track');
    const value = published ? [operating,development][index] : 0;
    stage.querySelector('[data-funding-value]').textContent = published ? value + '%' : '—';
    track.firstElementChild.style.setProperty('--funding-filled', value + '%');
    track.setAttribute('aria-hidden',String(!published));
    track.setAttribute('aria-valuenow',String(value));
  }
}

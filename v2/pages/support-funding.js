const STAGES = [
  {key:'operating', ru:'Функционирование проекта', en:'Project operations'},
  {key:'development', ru:'Развитие проекта', en:'Project development'},
];

export function ensureProjectSupportStyle() {
  if (document.querySelector('[data-project-support-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/styles/components/project-support.css?v=20261120members1';
  link.dataset.projectSupportStyle = '';
  document.head.append(link);
}

export function renderSupportFunding(text) {
  return `<div class="project-funding"><div class="project-funding-stages">${STAGES.map(({key,ru,en})=>
    `<div class="project-funding-stage" data-funding-stage="${key}">
      <h3>${text(ru,en)}</h3>
      <div class="project-funding-track" aria-hidden="true"><span></span></div>
    </div>`).join('')}</div><p class="page-help" role="status"></p></div>`;
}

export function showSupportFunding(root, projection, text, statusLabel = '') {
  const valid = n => Number.isInteger(n) && n >= 0 && n <= 100;
  const operating = projection?.operating_percent;
  const development = projection?.development_percent;
  const published = valid(operating) && valid(development) && (operating === 100 || development === 0);
  const status = root.querySelector('[role="status"]');
  status.textContent = statusLabel || (published
    ? text('Подтверждённые поступления за текущий месяц','Confirmed funding for the current month')
    : text('Отчёт за текущий месяц пока не опубликован','This month’s report has not been published yet'));
  for (const [index,{key}] of STAGES.entries()) {
    const stage = root.querySelector(`[data-funding-stage="${key}"]`);
    const track = stage.querySelector('.project-funding-track');
    const value = published ? [operating,development][index] : 0;
    track.firstElementChild.style.setProperty('--funding-filled', value + '%');
    if (published) {
      track.removeAttribute('aria-hidden');
      track.setAttribute('role','progressbar');
      track.setAttribute('aria-label',stage.querySelector('h3').textContent);
      track.setAttribute('aria-valuenow',String(value));
    } else {
      track.setAttribute('aria-hidden','true');
      for (const attribute of ['role','aria-label','aria-valuenow']) track.removeAttribute(attribute);
    }
  }
}

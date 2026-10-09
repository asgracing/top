// Load canonical markup so the prototype cannot drift from the working page.
fetch('/hourly/team/index.html').then(response => {
  if (!response.ok) throw new Error('markup unavailable');
  return response.text();
}).then(html => {
  const fixture = '<script src="/design-research/team-registration-20261009/fixture.js"><' + '/script>';
  document.open();
  document.write(html.replace('<head>', '<head><base href="/hourly/team/">' + fixture));
  document.close();
}).catch(() => { document.body.textContent = 'Откройте макет через локальный HTTP-сервер из папки top.'; });

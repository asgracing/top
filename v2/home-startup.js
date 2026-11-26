// Inlined only into homepage <head>, before its body can be painted.
(() => {
  const root = document.documentElement;
  let resolveConfig, requestTimer, safetyTimer, settled = false, expired = false;
  const config = new Promise(resolve => { resolveConfig = resolve; });
  const settle = value => {
    if (settled) return;
    settled = true;
    clearTimeout(requestTimer);
    if (value?.home_version === 'membership') {
      for (const name of ['home.css','native-pass.css','badges.css']) {
        const preload = document.createElement('link');
        preload.rel = 'preload';
        preload.as = 'style';
        preload.href = '/v2/membership/' + name + '?v=20261127palette';
        document.head.append(preload);
      }
    }
    resolveConfig(value);
  };
  const finish = () => {
    clearTimeout(safetyTimer);
    root.classList.remove('asg-home-layout-pending', 'home-booting');
    root.dataset.homeLayoutState = expired && root.dataset.homeVersion !== 'membership' ? 'fallback' : 'ready';
    const loader = document.querySelector('.home-loader');
    if (loader) loader.hidden = true;
    const shell = document.getElementById('v2-site-shell');
    if (shell && !document.querySelector('dialog[open]')) shell.inert = false;
  };
  root.classList.add('asg-home-layout-pending');
  root.dataset.homeLayoutState = 'pending';
  window.asgHomeStartup = {config, finish, get expired() { return expired; }};
  safetyTimer = setTimeout(() => {
    expired = true;
    settle(null);
    root.dataset.homeVersion = 'current';
    finish();
  }, 20000);
  const frame = window.frameElement;
  if (frame?.hasAttribute('data-asg-home-preview')) {
    settle({home_version: frame.getAttribute('data-asg-home-preview')});
    return;
  }
  const controller = new AbortController();
  requestTimer = setTimeout(() => { controller.abort(); settle(null); }, 8000);
  try {
    Promise.resolve(fetch('https://auth.asgracing.ru/v1/public/site-appearance', {
      credentials: 'omit', cache: 'no-store', signal: controller.signal
    })).then(response => {
      if (!response.ok) throw Error('site_config_unavailable');
      return response.json();
    }).then(settle, () => settle(null));
  } catch { settle(null); }
})();

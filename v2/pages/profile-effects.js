import {createHttpClient} from '/src/shared/http-client.js';

export const APPEARANCE_URL = 'https://auth.asgracing.ru/v1/me/profile-appearance';
export const PRESETS = Object.freeze({
  original:null, apex:'Nitro Apex', night:'Night Runner', victory:'Gold Rush',
  telemetry:'Telemetry X', finish:'Finish Attack', heat:'Redline Heat',
  pink:'Pink Velocity', violet:'Violet Eclipse',
});
export const LAYERS = Object.freeze(['avatar','banner','cards','entry']);
const BADGES = {
  supporter:['♥','Supporter'], vip:['ϟ','VIP'], pro:['»','PRO'], admin:['◆','ADMIN'],
};
const REQUEST = {cache:'no-store',headers:{Accept:'application/json'}};
const client = createHttpClient({defaultTimeoutMs:6000});
const stylesheet = '/v2/pages/profile-effects-art.css?v=20261120profile1';
let styles;

export function normalizeEffect(raw) {
  return {
    preset:raw && Object.hasOwn(PRESETS,raw.preset) ? raw.preset : 'original',
    energy:Number.isInteger(raw?.energy) && raw.energy >= 80 && raw.energy <= 140 ? raw.energy : 115,
    paused:raw?.paused === true,
    layers:Object.fromEntries(LAYERS.map(layer => [layer,raw?.layers?.[layer] !== false])),
  };
}

function loadStyles() {
  styles ??= new Promise((resolve,reject)=>{
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = stylesheet;
    link.onload = resolve;
    link.onerror = ()=>{link.remove();styles = null;reject(new Error('profile_styles_unavailable'));};
    document.head.append(link);
  });
  return styles;
}

export function appendBadge(element,tier) {
  const values = Object.hasOwn(BADGES,tier) ? BADGES[tier] : null;
  if (!element || !values) return null;
  const [symbol,label] = values;
  const badge = element.ownerDocument.createElement('span');
  badge.className = 'project-support-badge';
  badge.dataset.tier = tier;
  const icon = element.ownerDocument.createElement('span');
  icon.textContent = symbol;
  icon.setAttribute('aria-hidden','true');
  badge.append(icon,' '+label);
  element.append(badge);
  return badge;
}

export function createProfileEffect(root) {
  const doc = root.ownerDocument;
  const window = doc.defaultView;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let epoch = 0;
  let mountedPreset = null;
  let controller;
  let observer;
  let offscreen = false;
  let viewerPaused = false;
  let entryTimer;
  let settings = normalizeEffect(null);

  function stopEntry() {
    window.clearTimeout(entryTimer);
    root.classList.remove('vip-entering');
  }

  function cleanup() {
    stopEntry();
    controller?.abort();
    observer?.disconnect();
    observer = null;
    mountedPreset = null;
    offscreen = false;
    root.querySelectorAll('.vip-fx').forEach(layer=>layer.remove());
    root.querySelectorAll('.vip-panel-target').forEach(panel=>panel.classList.remove('vip-panel-target'));
    root.classList.remove('asg-profile-effects','vip-paused',...LAYERS.map(layer=>'vip-no-'+layer));
    root.style.removeProperty('--vip-energy');
    delete root.dataset.vipTheme;
  }

  const paused = ()=>settings.paused || viewerPaused || reduced.matches || doc.hidden || offscreen;

  function sync() {
    if (!mountedPreset) return;
    root.classList.toggle('vip-paused',paused());
    if (paused()) stopEntry();
    root.style.setProperty('--vip-energy',settings.energy / 100);
    for (const layer of LAYERS) root.classList.toggle('vip-no-'+layer,!settings.layers[layer]);
    if (!settings.layers.entry) stopEntry();
  }

  function replay() {
    stopEntry();
    if (!mountedPreset || paused() || !settings.layers.entry) return;
    const layer = root.querySelector('.vip-entry');
    if (!layer) return;
    void layer.offsetWidth;
    root.classList.add('vip-entering');
    entryTimer = window.setTimeout(stopEntry,2050);
  }

  async function update(value,{enter = false} = {}) {
    const ticket = ++epoch;
    settings = normalizeEffect(value);
    if (mountedPreset && mountedPreset === settings.preset) {
      sync();
      if (enter) replay();
      return;
    }
    cleanup();
    if (settings.preset === 'original') return;
    try {
      const [{installDecoration}] = await Promise.all([
        import('./profile-effects-art.js?v=20261120profile1'),loadStyles(),
      ]);
      if (ticket !== epoch || !root.isConnected) return;
      const hero = installDecoration(root,settings.preset);
      if (!hero) return;
      mountedPreset = settings.preset;
      controller = new AbortController();
      const {signal} = controller;
      root.classList.add('asg-profile-effects');
      root.dataset.vipTheme = settings.preset;
      doc.addEventListener('visibilitychange',sync,{signal});
      reduced.addEventListener('change',sync,{signal});
      if (window.IntersectionObserver) {
        observer = new window.IntersectionObserver(([record])=>{
          offscreen = !record.isIntersecting;
          sync();
        });
        observer.observe(hero);
      }
      sync();
      if (enter) replay();
    } catch {
      if (ticket === epoch) cleanup();
    }
  }

  return {update,replay,setPaused(value){viewerPaused=value;sync();},
    destroy(){epoch++;cleanup();}};
}

export function mountPublicAppearance({root,text}) {
  let hero;
  let driverId;
  let result;
  let loadedId;
  let pending;
  let request;
  let animation;
  let pause;
  let guestPaused = false;
  let introduced = false;
  let lastCheck = 0;
  const plain = new URLSearchParams(root.ownerDocument.defaultView.location.search).get('style') === 'original';

  function render() {
    if (!hero) return;
    hero.querySelector('.project-support-badge')?.remove();
    appendBadge(hero.querySelector('.profile-heading h1'),result?.tier);
    const allowed = ['vip','pro','admin'].includes(result?.tier);
    const settings = normalizeEffect(allowed && !plain ? result.effect : null);
    const enabled = settings.preset !== 'original';
    if (enabled && !settings.paused && !pause) {
      pause = root.ownerDocument.createElement('button');
      pause.type = 'button';
      pause.className = 'button profile-motion-toggle';
      pause.addEventListener('click',()=>{
        guestPaused = !guestPaused;
        animation.setPaused(guestPaused);
        syncPause();
      });
      hero.querySelector('.profile-heading')?.append(pause);
    } else if ((!enabled || settings.paused) && pause) {
      pause.remove();
      pause = null;
    }
    syncPause();
    animation.setPaused(guestPaused);
    const enter = enabled && !introduced;
    introduced ||= enabled;
    void animation.update(settings,{enter});
  }

  function syncPause() {
    if (!pause) return;
    pause.setAttribute('aria-pressed',String(guestPaused));
    pause.textContent = guestPaused ? text('Включить движение','Resume animation')
      : text('Остановить движение','Pause animation');
  }

  async function fetchAppearance(force = false) {
    const id = driverId;
    if ((!force && pending === id) || !/^drv_[a-z0-9]{1,64}$/.test(id || '')) return;
    pending = id;
    lastCheck = Date.now();
    request?.abort();
    request = new AbortController();
    const {signal} = request;
    try {
      const value=await client.requestJson(
        'https://auth.asgracing.ru/v1/drivers/'+id+'/appearance',
        {...REQUEST,credentials:'omit',signal},
      );
      if (signal.aborted) return;
      result = value;
    } catch {
      if (signal.aborted) return;
      result = null;
    } finally {
      if (!signal.aborted) {
        pending = null;
        loadedId = id;
        render();
      }
    }
  }

  return {
    update(id){
      const current=root.querySelector('.profile-hero');
      if (driverId !== id) {
        request?.abort();
        driverId = id;
        pending = null;
        result = null;
        loadedId = null;
        introduced = false;
        guestPaused = false;
      }
      if (hero !== current || loadedId !== id) {
        animation?.destroy();
        pause?.remove();
        pause = null;
        hero = current;
        animation = current ? createProfileEffect(root) : null;
        if (hero) render();
      }
      if (current && loadedId !== id) void fetchAppearance();
    },
    refresh(force = false){if (hero?.isConnected && (force || Date.now() - lastCheck >= 60000)) void fetchAppearance(force);},
  };
}

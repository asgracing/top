export const SITE_CONFIG_URL = 'https://auth.asgracing.ru/v1/public/site-appearance';
export const homeVersions = new Set(['current','membership']);
export function homeVersion(config) { return homeVersions.has(config?.home_version) ? config.home_version : 'current'; }

export function watchHomeVersion(update, {fetcher=globalThis.fetch, interval=60_000}={}) {
  let stopped=false, request=0;
  const refresh=async()=>{
    if(document.hidden||stopped)return;
    const ticket=++request;
    try {
      const response=await fetcher(SITE_CONFIG_URL,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(5000)});
      if(!response.ok)throw Error('site_config_unavailable');
      const config=await response.json();
      if(!stopped&&ticket===request)update(homeVersion(config));
    } catch { /* Keep the last confirmed layout during a temporary outage. */ }
  };
  const timer=setInterval(refresh,interval);
  document.addEventListener('visibilitychange',refresh);
  window.addEventListener('asg-appearance-refresh',refresh);
  window.addEventListener('pageshow',refresh);
  void refresh();
  return ()=>{stopped=true;++request;clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('asg-appearance-refresh',refresh);window.removeEventListener('pageshow',refresh);};
}

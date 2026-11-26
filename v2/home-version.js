import {watchHomeVersion,homeVersions} from './site-config.js?v=20261126home1';

export function mountHomeVersion({language}) {
  let wanted='current', mounted, generation=0, disposed=false;
  async function apply(version) {
    wanted=homeVersions.has(version)?version:'current';
    const ticket=++generation;
    if(wanted==='current'){mounted?.();mounted=null;document.documentElement.dataset.homeVersion='current';return;}
    if(mounted)return;
    try {
      const {mountMembershipHome}=await import('./membership/home.js?v=20261126home1');
      if(disposed||ticket!==generation||wanted!=='membership')return;
      mounted=mountMembershipHome({language});
      document.documentElement.dataset.homeVersion='membership';
    } catch(error) { console.error('Homepage layout unavailable',error); }
  }
  document.documentElement.dataset.homeVersion='current';
  const frame=window.frameElement;
  let stop;
  if(frame?.hasAttribute('data-asg-home-preview')) {
    const update=()=>void apply(frame.getAttribute('data-asg-home-preview'));
    const observer=new MutationObserver(update);
    observer.observe(frame,{attributeFilter:['data-asg-home-preview']});
    update();stop=()=>observer.disconnect();
  } else stop=watchHomeVersion(version=>void apply(version));
  const destroy=()=>{disposed=true;++generation;stop();mounted?.();};
  window.addEventListener('pagehide',event=>{if(!event.persisted)destroy();});
  return destroy;
}

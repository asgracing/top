import {watchHomeVersion,homeVersions} from './site-config.js?v=20261127palette';

export function mountHomeVersion({language}) {
  const startup=window.asgHomeStartup;
  let wanted='current', mounted, generation=0, disposed=false, first=true, pending=[];
  let resolveReady;
  const ready=new Promise(resolve=>{resolveReady=resolve;});
  const clearPending=()=>{pending.forEach(remove=>remove());pending=[];};
  const reveal=()=>{if(first){first=false;startup?.finish();resolveReady();}};
  async function apply(version) {
    wanted=homeVersions.has(version)?version:'current';
    const ticket=++generation;
    clearPending();
    if(wanted==='current'){mounted?.();mounted=null;document.documentElement.dataset.homeVersion='current';reveal();return;}
    if(mounted)return;
    try {
      const {mountMembershipHome,prepareMembershipStyles}=await import('./membership/home.js?v=20261127palette');
      if(disposed||ticket!==generation||wanted!=='membership')return;
      const styles=prepareMembershipStyles();pending=styles;
      const loaded=await Promise.all(styles.map(remove=>remove.ready));
      if(disposed||ticket!==generation)return;
      if(loaded.some(value=>!value))throw Error('Homepage styles unavailable');
      mounted=mountMembershipHome({language,styles});pending=[];
      document.documentElement.dataset.homeVersion='membership';
      reveal();
    } catch(error) {if(!disposed&&ticket===generation){clearPending();console.error('Homepage layout unavailable',error);reveal();}}
  }
  document.documentElement.dataset.homeVersion='current';
  const frame=window.frameElement;
  let stop;
  if(frame?.hasAttribute('data-asg-home-preview')) {
    const update=()=>void apply(frame.getAttribute('data-asg-home-preview'));
    const observer=new MutationObserver(update);
    observer.observe(frame,{attributeFilter:['data-asg-home-preview']});
    update();stop=()=>observer.disconnect();
  } else stop=watchHomeVersion(version=>void apply(version),{initial:startup?.config});
  const destroy=()=>{disposed=true;++generation;stop();clearPending();mounted?.();};
  window.addEventListener('pagehide',event=>{if(!event.persisted)destroy();});
  destroy.ready=ready;
  return destroy;
}

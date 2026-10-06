// Brief data-change accents; an idle homepage has no decorative frame loop.
export function createHomeMotion({documentRef=document,windowRef=window}={}) {
  const reduced=windowRef.matchMedia('(prefers-reduced-motion: reduce)'),records=new Map();
  const observer=new windowRef.IntersectionObserver(entries=>{
    for(const entry of entries){const record=[...records.values()].find(r=>r.target===entry.target);if(record){record.visible=entry.isIntersecting;sync(record)}}
  });
  function allowed(record){return !documentRef.hidden&&!reduced.matches&&record.visible&&record.target.closest('[data-dock-open="false"]')===null}
  function sync(record){
    if(!allowed(record)){record.animation?.pause();return}
    if(record.pending){
      record.pending=false;
      const animation=record.target.animate(record.frames,record.options);record.animation=animation;
      animation.onfinish=()=>{if(record.animation===animation){record.animation=null;animation.cancel()}};
    }else if(record.animation?.playState==='paused')record.animation.play();
  }
  function add(key,target,frames,options){if(!target)return;records.set(key,{target,frames,options,visible:false,pending:false,signature:null,animation:null});observer.observe(target)}
  add('points',documentRef.getElementById('v2-multiplier'),[{opacity:1},{opacity:.7},{opacity:1}],{duration:1800,iterations:2,easing:'ease-in-out'});
  add('fund',documentRef.querySelector('#v2-fund-progress>span'),[
    {transform:'translateX(-120%)',opacity:0,offset:0},
    {opacity:.7,offset:.35},
    {transform:'translateX(120%)',opacity:0,offset:.85},
    {transform:'translateX(120%)',opacity:0,offset:1}
  ],{duration:1600,iterations:1,easing:'ease-in-out',pseudoElement:'::after'});
  function run(key,value){
    const record=records.get(key),signature=JSON.stringify(value);
    if(!record||record.signature===signature)return;
    record.signature=signature;record.animation?.cancel();record.animation=null;
    record.pending=!reduced.matches;sync(record);
  }
  function refresh(){
    documentRef.body.classList.toggle('v2-motion-paused',documentRef.hidden);
    for(const record of records.values()){
      if(reduced.matches){record.animation?.cancel();record.animation=null;record.pending=false}
      else sync(record);
    }
  }
  function dispose(){observer.disconnect();for(const record of records.values())record.animation?.cancel();documentRef.removeEventListener('visibilitychange',refresh);reduced.removeEventListener('change',refresh)}
  documentRef.addEventListener('visibilitychange',refresh);reduced.addEventListener('change',refresh);
  windowRef.addEventListener('pagehide',event=>{if(!event.persisted)dispose()},{once:true});refresh();
  return {run,refresh,dispose};
}

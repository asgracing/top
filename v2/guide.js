import {createTopGuideController} from '/src/pages/home/top-guide.js';
export function createGuide({$,copy}){
  const cleanups=[],lifecycle={listen(target,event,handler,options){target.addEventListener(event,handler,options);cleanups.push(()=>target.removeEventListener(event,handler,options))},add(fn){cleanups.push(fn)},timer(id,clear){cleanups.push(()=>clear(id))}};
  let lastTarget=null;
  const selectors=['.page-intro','#v2-ranking','#v2-search','#v2-rating-table','.nav-group','.upcoming-panel','#v2-profile-trigger'],kinds=['Welcome','Championship','Search','Profile','Races','Hourly','Auth'];
  // The shared controller calls onHide without a target argument.
  let openedMenu=null,menuWasOpen=false;
  const steps=selectors.map((targetSelector,i)=>({targetSelector,titleKey:'topGuideStep'+kinds[i]+'Title',textKey:'topGuideStep'+kinds[i]+'Text',scrollBlock:'nearest',onShow(target){if(lastTarget!==target){lastTarget=target;target.scrollIntoView({block:i===0?'nearest':'center',behavior:'instant'})}if(i===4&&openedMenu!==target){openedMenu=target;menuWasOpen=target.open;target.open=true}},onHide(){if(i===4&&openedMenu){openedMenu.open=menuWasOpen;openedMenu=null}}}));
  const guide=createTopGuideController({documentRef:document,windowRef:window,lifecycle,storage:{get(key,fallback){if(key==='topGuideSeen')return true;return fallback},set(key,value){try{localStorage.setItem('asgV2Guide:'+key,JSON.stringify(value))}catch{}}},translate:key=>copy[key]||key,replaceTokens:(value,tokens)=>value.replace(/\{(\w+)\}/g,(_,key)=>tokens[key]??''),steps,mediaQuery:'(min-width: 0px)'});
  guide.mount();document.querySelector('.center-column').addEventListener('scroll',()=>guide.render(),{passive:true});
  let active=false;new MutationObserver(()=>{const next=guide.active;$('welcome-widget').querySelector('summary').setAttribute('aria-expanded',String(next));if(active&&!next){lastTarget=null;$('welcome-widget').querySelector('summary').focus({preventScroll:true})}active=next}).observe(document.getElementById('top-guide'),{attributes:true,attributeFilter:['hidden']});
  return {open(){lastTarget=null;guide.open(0,{force:true})}};
}

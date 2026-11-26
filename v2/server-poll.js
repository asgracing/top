import {createPollsAPI} from './pages/polls-api.js';
import {normalizePoll,pollStatus,pollRemaining} from './pages/polls-model.js';
import {routeHref} from './site-routing.js';

export function mountServerPoll({panel,language='ru',api=createPollsAPI()}={}){
  if(!panel)return null;
  const t=(ru,en)=>language==='en'?en:ru;
  const card=document.createElement('section');
  card.className='server-poll-callout';card.hidden=true;
  card.setAttribute('aria-labelledby','server-poll-question');
  card.innerHTML=`<div class="server-poll-top"><span class="server-poll-live"><i aria-hidden="true"></i>${t('Идёт опрос','Poll is open')}</span><span class="server-poll-time"></span><button type="button" class="server-poll-motion" aria-pressed="false" aria-label="${t('Остановить мигание','Stop blinking')}" title="${t('Остановить мигание','Stop blinking')}">Ⅱ</button></div><p class="server-poll-kicker">${t('Решаем вместе','Decide together')}</p><h3 id="server-poll-question"></h3><p class="server-poll-invite">${t('Ваш голос поможет выбрать, какой будет следующая гонка.','Help shape the next race. Make your voice count.')}</p><div class="server-poll-bottom"><span class="server-poll-count"></span><a class="server-poll-cta"><span>${t('Зайти и проголосовать','Open poll & vote')}</span><span aria-hidden="true">↗</span></a></div>`;
  panel.querySelector('.server-summary').after(card);
  let dead=false,busy=false,poll=null,abort=null,visible=true,lastAttempt=null,refreshTimer;
  const q=selector=>card.querySelector(selector);
  function hide(){card.hidden=true;panel.classList.remove('has-active-poll');poll=null;}
  function motion(){card.classList.toggle('is-motion-paused',document.hidden||!visible||Boolean(panel.closest('[data-dock-open="false"]')));}
  function clock(){
    if(poll&&pollStatus(poll)!=='active'){hide();return;}
    if(poll){const remaining=t('Ещё ','Left ')+pollRemaining(poll,language);if(q('.server-poll-time').textContent!==remaining)q('.server-poll-time').textContent=remaining;}
  }
  async function refresh(){
    if(dead||busy||document.hidden||panel.closest('[data-dock-open="false"]'))return;
    const now=performance.now();
    if(lastAttempt!==null&&now-lastAttempt<60000)return;
    lastAttempt=now;clearTimeout(refreshTimer);
    busy=true;abort=new AbortController();
    try{
      const value=await api.list({filter:'active',page:1,limit:1},abort.signal);
      if(dead)return;
      const latest=value.polls?.[0]?normalizePoll(value.polls[0]):null;
      if(!latest||pollStatus(latest)!=='active'){hide();return;}
      poll=latest;q('h3').textContent=poll.title;
      q('.server-poll-count').textContent=poll.participants+' '+t('участвуют','participants');
      q('a').href=routeHref('polls/view/',language)+'?id='+encodeURIComponent(poll.id);
      card.hidden=false;panel.classList.add('has-active-poll');clock();motion();
    }catch(error){if(!dead&&!abort.signal.aborted)hide();}
    finally{busy=false;if(!dead)scheduleRefresh();}
  }
  const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;motion();if(visible)void refresh();});observer.observe(panel);
  function scheduleRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{scheduleRefresh();clock();if(visible)void refresh();},60000);}
  scheduleRefresh();
  const expiry=setInterval(clock,1000);
  function visibility(){motion();clock();if(!document.hidden)void refresh();}
  document.addEventListener('visibilitychange',visibility);
  q('button').addEventListener('click',()=>{
    const stopped=card.classList.toggle('is-motion-stopped');
    q('button').setAttribute('aria-pressed',String(stopped));
    const label=stopped?t('Включить мигание','Enable blinking'):t('Остановить мигание','Stop blinking');
    q('button').setAttribute('aria-label',label);q('button').title=label;
    q('button').textContent=stopped?'▷':'Ⅱ';
  });
  function pageHide(event){if(!event.persisted)destroy();}
  function destroy(){dead=true;abort?.abort();clearTimeout(refreshTimer);clearInterval(expiry);observer.disconnect();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pageHide);card.remove();panel.classList.remove('has-active-poll');}
  window.addEventListener('pagehide',pageHide);
  void refresh();
  return {refresh,destroy};
}

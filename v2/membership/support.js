import {localizeTree} from './locale.js';
import {markup} from './support-template.js';
import {renderDemoCard} from './demo-card.js';
import {useStyles} from './styles.js';
import {subscriptionBadge} from './badges.js';

export function mountSupportMarketing(view,{language,text}) {
  const demoCard=renderDemoCard(language);
  useStyles('support.css');useStyles('native-pass.css');
  useStyles('badges.css');
  const crumb=view.querySelector('.page-breadcrumb');
  const listing=view.querySelector('[data-support-list-status]').closest('section.panel');
  const funding=view.querySelector('[data-support-funding]');
  const trials=[...view.querySelectorAll('[data-support-trial]')].map(button=>({button,status:button.parentElement.nextElementSibling}));
  const content=document.createElement('div');content.id='support-content';content.innerHTML=markup;localizeTree(content,language);
  const badges=document.createElement('aside');
  badges.className='hero-badges';
  const badgeTitle=document.createElement('h3');
  badgeTitle.textContent=text('Твой знак на трассе','Your mark on the grid');
  badges.append(badgeTitle);
  for(const tier of ['supporter','vip','pro']){
    const row=document.createElement('div');
    row.className='profile-heading';
    row.append(subscriptionBadge(tier));
    badges.append(row);
  }
  content.querySelector('.support-hero').append(badges);
  view.replaceChildren(crumb,content);
  const live=document.createElement('div');live.className='native-support-live section';live.append(listing,funding);
  content.querySelector('#questions').before(live);
  for(const {button,status} of trials){
    const plan=content.querySelector('.plan.'+button.dataset.supportTrial);
    plan.setAttribute('data-support-trial-card','');
    const preview=plan.querySelector('[data-demo]');preview.textContent=text('Посмотреть пример','View example');preview.className='plan-preview';plan.append(preview);
    button.textContent=text('Попробовать · 7 дней','Try it · 7 days');button.className='button secondary';
    const row=plan.querySelector('.plan-actions');row.prepend(button);row.after(status);
  }
  content.querySelector('.trial-link').remove();
  const pass=content.querySelector('.support-pass');pass.innerHTML=demoCard;
  pass.addEventListener('click',()=>{const flipped=pass.getAttribute('aria-pressed')!=='true';pass.setAttribute('aria-pressed',String(flipped));pass.querySelector('.pass-front').hidden=flipped;pass.querySelector('.pass-back').hidden=!flipped;});
  const host=content.querySelector('#native-profile-demo');
  let loading,instance;
  async function loadDemo(){
    if(instance)return instance;
    loading??=import('./profile-demo.js?v=20261126podium2').then(({mountProfileDemo})=>mountProfileDemo(host,{language})).then(value=>instance=value).catch(()=>{
      loading=null;host.replaceChildren();const message=document.createElement('p');message.className='native-demo-error';message.textContent=text('Не удалось загрузить пример. Нажми «Повторить».','Could not load the example. Choose Retry.');
      const retry=document.createElement('button');retry.className='button';retry.textContent=text('Повторить','Retry');retry.onclick=()=>{host.replaceChildren();void loadDemo();};host.append(message,retry);
    });return loading;
  }
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();void loadDemo();}},{rootMargin:'200px'});observer.observe(host);
  const reveal=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.add('reveal');reveal.unobserve(e.target);}},{threshold:.08});
  for(const section of content.querySelectorAll('.section'))reveal.observe(section);
  const dialog=content.querySelector('#support-demo');dialog.querySelector('.modal-close').onclick=()=>dialog.close();
  content.addEventListener('click',async event=>{
    const button=event.target.closest('[data-demo]');if(!button)return;
    if(button.dataset.demo==='supporter'){
      content.querySelector('#support-demo-content').innerHTML='<span class="demo-badge">Supporter</span><h2>Apex Driver · #27</h2><p>Demo Racing Team</p><p>'+text('Значок поддержки, защита номера и роль Discord. Вымышленный профиль.','Support badge, number protection and Discord role. Fictional profile.')+'</p>';dialog.showModal();return;
    }
    host.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    const demo=await loadDemo();demo?.open(button.dataset.demo);
  });
  window.addEventListener('pagehide',event=>{if(!event.persisted){observer.disconnect();reveal.disconnect();instance?.destroy();}});
}

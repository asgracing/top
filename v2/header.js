import {routeHref} from './site-routing.js?v=20261007root1';
export function createHeader({$,esc,text,number,rating,driverHref,privacy,native,newsHref}){
  const language=document.documentElement.lang==='en'?'en':'ru';
  const host=document.querySelector('.header-actions'),nativeAuth=()=>host.querySelector('.auth-header');
  const bell=document.createElement('button');bell.type='button';bell.id='v2-notification-trigger';bell.className='notification-trigger';bell.setAttribute('aria-label',text('Уведомления','Notifications'));bell.setAttribute('aria-haspopup','dialog');bell.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><span class="v2-notification-count" hidden></span>';
  const trigger=document.createElement('button');trigger.type='button';trigger.id='v2-profile-trigger';trigger.className='profile-trigger';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-label',text('Открыть панель профиля','Open profile panel'));
  host.prepend(bell);host.append(trigger);
  for(const id of ['profile','notification'])$(id+'-popover-title').textContent=id==='profile'?text('Профиль пилота','Driver profile'):text('Уведомления','Notifications');
  let auth=null,currentModel=null;
  function place(panel,anchor){const rect=anchor.getBoundingClientRect(),width=Math.min(350,innerWidth-24);panel.style.width=width+'px';panel.style.left=Math.max(12,Math.min(innerWidth-width-12,rect.right-width))+'px';panel.style.top=Math.max(12,Math.min(innerHeight-panel.getBoundingClientRect().height-12,rect.bottom+9))+'px'}
  function close(id){const panel=$(id);if(panel.matches(':popover-open'))panel.hidePopover();$(id.replace('-popover','-trigger'))?.setAttribute('aria-expanded','false')}
  function open(id,anchor){const panel=$(id),wasOpen=panel.matches(':popover-open');for(const key of ['profile-popover','notification-popover'])close(key);if(wasOpen)return;panel.showPopover();anchor.setAttribute('aria-expanded','true');place(panel,anchor);panel.querySelector('button').focus({preventScroll:true})}
  trigger.onclick=()=>open('profile-popover',trigger);bell.onclick=()=>open('notification-popover',bell);
  function authContent(){
    const source=nativeAuth(),content=$('profile-popover-content');
    if(!auth?.authenticated){
      const login=source?.querySelector('.auth-header-login'),loading=source?.dataset.authState==='loading';
      trigger.innerHTML=`<span class="profile-trigger-copy"><b>${loading?text('Загрузка…','Loading…'):text('Войти через Steam','Sign in with Steam')}</b><small>${text('Профиль пилота','Driver profile')}</small></span><span class="profile-chevron">⌄</span>`;
      content.innerHTML=`<div class="notifications-empty"><b>${text('Твой профиль ASG Racing','Your ASG Racing profile')}</b><p>${text('Войди через Steam, чтобы открыть свой профиль и личный кабинет.','Sign in through Steam to access your profile and account.')}</p></div>${login?.tagName==='A'?`<a class="button primary" href="${esc(login.href)}">${text('Войти через Steam','Sign in with Steam')}</a>`:login?`<button class="button primary" data-auth-action="retry">${text('Повторить авторизацию','Retry authentication')}</button>`:`<span role="status">${text('Загрузка авторизации…','Loading authentication…')}</span>`}`;return;
    }
    const d=auth.driver||{},name=d.displayName||auth.steam?.personaName||text('Пилот','Driver'),avatar=auth.steam?.avatarUrl||source?.querySelector('img')?.src;
    const data={public_id:d.publicId,driver:name,elo:d.elo,safety_rating:d.sr,safety_category:d.srCategory},badges=rating(data,'elo')+rating(data,'sr');
    const headerBadges=badges.replace(/<button\b/g,'<span').replace(/<\/button>/g,'</span>').replace(/>C\d+ (\d+)/g,'>ELO $1').replace(/>[ABC] (\d+\.\d+)/g,'>SR $1');
    trigger.innerHTML=`${avatar?`<img src="${esc(avatar)}" alt="">`:''}<span class="profile-trigger-copy"><b>${esc(name)}</b><span id="v2-header-profile-ratings">${auth.preferences?.raceNumber?`<span class="profile-number">#${esc(auth.preferences.raceNumber)}</span>`:''}${headerBadges}</span></span><span class="profile-chevron">⌄</span>`;
    content.innerHTML=`<div class="profile-preview-heading">${avatar?`<img src="${esc(avatar)}" alt="">`:''}<div><b>${esc(name)}</b><small>${text('Steam · профиль ASG Racing','Steam · ASG Racing profile')}</small></div></div><div class="driver-ratings">${badges}</div><div class="profile-preview-facts"><div><span>${text('Гоночный номер','Race number')}</span><b>${auth.preferences?.raceNumber?'#'+esc(auth.preferences.raceNumber):'—'}</b></div><div><span>${text('Место в рейтинге','Ranking position')}</span><b>${number(d.rank)}</b></div></div>${d.publicId?`<a class="button primary" href="${driverHref(d.publicId)}">${text('Профиль пилота','Driver profile')} ↗</a>`:`<p>${text('Профиль ещё не привязан.','Profile is not linked yet.')}</p>`}<a class="button" href="${routeHref('account/',language)}">${text('Личный кабинет','My account')} ↗</a><a class="button" href="${routeHref('account/',language)}settings/">${text('Настройки профиля','Profile settings')} ↗</a>${auth.permissions?.moderationIssue||auth.permissions?.portalManage?`<div class="admin-preview"><span class="eyebrow">${text('Администрация','Administration')}</span>${auth.permissions?.moderationIssue?`<a href="${routeHref('moderation/',language)}">${text('Баны, страйки и гоночные номера','Bans, strikes & race numbers')} ↗</a>`:''}${auth.permissions?.portalManage?`<a href="${routeHref('portal-ops/',language)}">Portal Operations ↗</a>`:''}</div>`:''}<div class="v2-auth-actions">${auth.linked?`<small>Discord · ${auth.discord?.linked?esc(auth.discord.syncStatus||text('Привязан','Linked')):text('Не привязан','Not linked')}</small>`:''}${['link','sync','unlink'].filter(key=>source?.querySelector('.auth-header-discord-'+key)).map(key=>`<button class="button" data-auth-action="discord-${key}">${esc(source.querySelector('.auth-header-discord-'+key).textContent)}</button>`).join('')}<button class="button" data-auth-action="logout">${text('Выйти','Sign out')}</button></div>`;
  }
  function update(model){currentModel=model;auth=model.auth;authContent();
    const badge=bell.querySelector('.v2-notification-count');badge.textContent=model.unreadNews>99?'99+':String(model.unreadNews||0);badge.hidden=!model.unreadNews;
    const news=model.news||[],invites=model.invitations||[],language=document.documentElement.lang;
    const title=value=>typeof value==='string'?value:value?.[language]||value?.ru||value?.en||'';
    $('notification-popover-content').innerHTML=[...invites.map((a,i)=>`<a class="v2-notice is-invitation" href="${routeHref('account/',language)}" data-invitation="${i}"><small>${text('Приглашение','Invitation')}</small><b>${esc(a.targetDisplayName||text('Приглашение в клуб или команду','Club or team invitation'))}</b></a>`),...news.map((n,i)=>`<a class="v2-notice" href="${esc(newsHref(n))}" data-news-read="${i}"><small>${esc(n.published_at||n.date||'')}</small><b>${esc(title(n.title))}</b>${n.summary?`<span>${esc(title(n.summary))}</span>`:''}</a>`)].join('')||`<div class="notifications-empty"><span>✓</span><b>${text('Центр уведомлений','Notification centre')}</b><p>${text('Новых уведомлений пока нет.','No notifications yet.')}</p></div>`;
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-auth-action]');if(button){const key=button.dataset.authAction;nativeAuth()?.querySelector(key==='retry'?'.auth-header-retry':'.auth-header-'+key)?.click();close('profile-popover')}
    const news=e.target.closest('[data-news-read]');if(news){native().markNews(currentModel.news[Number(news.dataset.newsRead)]);close('notification-popover')}
    const invitation=e.target.closest('[data-invitation]');if(invitation){native().markInvitation(currentModel.invitations[Number(invitation.dataset.invitation)]);close('notification-popover')}
    const exit=e.target.closest('[data-close-popover]');if(exit&&['profile-popover','notification-popover'].includes(exit.dataset.closePopover)){close(exit.dataset.closePopover);$(exit.dataset.closePopover.replace('-popover','-trigger')).focus({preventScroll:true})}
    for(const [id,anchor] of [['profile-popover',trigger],['notification-popover',bell]])if($(id).matches(':popover-open')&&!$(id).contains(e.target)&&!anchor.contains(e.target))close(id);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const id of ['profile-popover','notification-popover'])close(id)});
  window.addEventListener('resize',()=>{for(const [id,anchor] of [['profile-popover',trigger],['notification-popover',bell]])if($(id).matches(':popover-open'))place($(id),anchor)});
  // The legacy auth controller owns loading/error/retry states and CSRF actions.
  new MutationObserver(records=>{if(currentModel&&records.some(r=>r.target.closest?.('.auth-header')||[...r.addedNodes].some(n=>n.nodeType===1&&n.matches('.auth-header'))))authContent()}).observe(host,{childList:true,subtree:true});
  // Observe only the native controller roots after they appear; avoid watching
  // our own view updates and recursively rendering the projection.
  return {update};
}

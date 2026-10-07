import {mountAccountWorkspace,loadApprovedEntityProfile} from '/src/pages/account/account.js?v=20261007controlv2';
import {normalizeAuthPayload} from '/src/features/auth/header-auth.js?v=20261003names1';
import {createHttpClient} from '/src/shared/http-client.js';
import {v2Route} from '../routes.js?v=20261007v2pages14';

// Presentation only: normalized Steam identity and the existing account commands.
export function startAccountPage({view,text,esc,rating,language,subscribe,showDialog}) {
  document.body.dataset.accountPage='overview';
  document.body.dataset.prototypePage='account';
  document.querySelector('.dashboard').classList.add('page-wide');
  document.querySelectorAll('.dashboard>aside').forEach(n=>n.hidden=true);
  view.innerHTML=`<div class="page-breadcrumb"><a href="${v2Route('',language)}">${text('Главная','Home')}</a><span>/</span><b>${text('Личный кабинет','My account')}</b></div><div id="account-content" class="v2-account"><section class="panel page-panel"><p role="status">${text('Загрузка аккаунта…','Loading account…')}</p></section></div>`;
  const root=document.getElementById('account-content'),client=createHttpClient({fetchImpl:globalThis.fetch,defaultTimeoutMs:8000});
  let authKey='',currentAuth=null,confirmation=false,refreshPending=null;
  const profiles=new Map();
  const panel=(title,content)=>`<section class="panel"><div class="panel-head"><h2>${esc(title)}</h2></div><div class="control-panel-body">${content}</div></section>`;
  const empty=message=>`<p class="page-help">${esc(message)}</p>`;
  const status=message=>`<p class="control-alert" role="status">${esc(message)}</p>`;
  const discordStatus=value=>({pending:text('Ожидается синхронизация','Synchronization pending'),synced:text('Связь обновлена','Account synchronized'),error:text('Не удалось обновить связь','Synchronization failed'),unlink_pending:text('Ожидается отключение','Unlink pending')})[value]||text('Для клубов и команд','Required for clubs & teams');
  const action=(label,key)=>`<button class="button" type="button" data-account-native="${key}">${esc(label)}</button>`;
  function wireLinks(){
    root.querySelectorAll('a[href]').forEach(a=>{
      if(siteContext().layout==='root'){a.setAttribute('href',scopeSiteHref(a.getAttribute('href'),language));return;}
      const u=new URL(a.getAttribute('href'),location.href);
      if(![location.origin,'https://asgracing.ru'].includes(u.origin)||u.pathname.startsWith('/v2/'))return;
      const path=u.pathname.replace(/^\/(?:ru\/)?/,'');
      const next=v2Route(path,language);
      if(next.startsWith('/v2/')){u.searchParams.delete('lang');a.setAttribute('href',next+u.search+u.hash);}
      else if(['account/settings/','account/asg-lab/','moderation/','portal-ops/'].includes(path)){
        u.searchParams.set('lang',language);a.setAttribute('href','/'+path+u.search+u.hash);
      }
    });
  }
  function decorate(nativeRoot,auth){
    currentAuth=auth;
    if(!auth?.authenticated){
      const failed=document.querySelector('.auth-header')?.dataset.authState==='error';
      nativeRoot.querySelector('.account-card-body')?.classList.add('panel','page-panel','account-entry');
      nativeRoot.insertAdjacentHTML('afterbegin',`<section class="panel control-heading"><div><span class="eyebrow">ASG RACING</span><h1>${text('Личный кабинет','Driver account')}</h1><p>${text('Профиль, сообщества и настройки пилота.','Your profile, communities and driver preferences.')}</p></div></section>`);
      if(failed)nativeRoot.querySelector('.account-card-body').outerHTML=panel(text('Аккаунт недоступен','Account unavailable'),status(text('Не удалось проверить сессию. Попробуйте ещё раз.','Could not verify your session. Please retry.'))+action(text('Повторить','Retry'),'retry'));
      wireLinks();return;
    }
    const hero=nativeRoot.querySelector('.account-card-header'),body=nativeRoot.querySelector('.account-card-body');
    hero.classList.add('panel','control-account-hero');hero.querySelector('img').classList.add('control-avatar');
    const heading=hero.querySelector('.account-heading'),d=auth.driver||{},profile={public_id:d.publicId,driver:d.displayName,elo:d.elo,safety_rating:d.sr};
    const badges=document.createElement('div');badges.className='control-actions';
    badges.innerHTML=auth.linked?rating(profile,'elo',null,true)+rating(profile,'sr',null,true):'';
    const number=hero.querySelector('.account-number');number.classList.add('control-number');badges.append(number);heading.append(badges);
    const links=body.querySelector(':scope>.account-actions');
    const heroLinks=document.createElement('div');heroLinks.className='control-actions';hero.append(heroLinks);
    if(links)for(const a of links.querySelectorAll('a')){a.classList.add('button');if(a.href.includes('/account/settings/'))a.classList.add('primary');heroLinks.append(a);}
    const selected=auth.titles?.active;
    const pending=auth.preferences?.pendingRequest;
    const summary=document.createElement('div');summary.className='control-summary';
    summary.innerHTML=`<article class="panel"><small>${text('Гоночный номер','Race number')}</small><b>${auth.preferences?.raceNumber?'#'+esc(auth.preferences.raceNumber):'—'}</b><span>${pending?text('Заявка','Request')+' #'+esc(pending.raceNumber):auth.preferences?.raceNumber?text('Закреплён','Assigned'):text('Номер не выбран','No number selected')}</span><a class="text-link" href="/account/settings/">${text('Настроить','Manage')} ↗</a></article><article class="panel"><small>Steam</small><b>${auth.linked?text('Профиль связан','Profile linked'):text('Пилот ещё не найден','Driver not found yet')}</b><span>${esc(auth.steam?.personaName||'—')}</span></article><article class="panel"><small>Discord</small><b class="${auth.discord?.linked?'positive':'negative'}">${auth.discord?.linked?text('Связан','Linked'):text('Не связан','Not linked')}</b><span>${esc(discordStatus(auth.discord?.syncStatus))}</span>${action(auth.discord?.linked?text('Обновить связь','Sync account'):text('Связать Discord','Link Discord'),auth.discord?.linked?'discord-sync':'discord-link')}${auth.discord?.linked?action(text('Отвязать','Unlink'),'discord-unlink'):''}</article><article class="panel"><small>${text('Титул пилота','Driver title')}</small><b class="control-gold">${selected?esc([selected.icon,selected.title].filter(Boolean).join(' ')):text('Без титула','No title')}</b><a class="text-link" href="/account/settings/">${text('Выбрать титул','Choose title')} ↗</a></article>`;
    const discordActions=document.createElement('div');discordActions.className='control-actions';summary.children[2].querySelectorAll('button').forEach(b=>discordActions.append(b));summary.children[2].append(discordActions);
    const columns=document.createElement('div');columns.className='control-columns';
    const left=document.createElement('div'),right=document.createElement('aside');columns.append(left,right);
    const clubs=body.querySelector('.account-clubs-teams');
    if(clubs){
      clubs.classList.add('panel');
      let memberships=clubs.querySelector('.account-memberships');
      if(auth.clubsTeams?.enabled){
      if(!memberships){memberships=document.createElement('div');memberships.className='account-memberships';clubs.querySelector('.account-muted')?.replaceWith(memberships);}
      for(const kind of ['club','team'])if(!auth.clubsTeams?.[kind]){
        const placeholder=document.createElement('div');placeholder.className='account-membership';
        placeholder.innerHTML=`<b>${kind==='club'?text('Мой клуб','My club'):text('Моя команда','My team')}</b>${empty(kind==='club'?text('Вы пока не состоите в клубе.','You have not joined a club.'):text('Вы пока не состоите в команде.','You have not joined a team.'))}`;
        const create=clubs.querySelector(`[data-ct-mode="create"][data-ct-type="${kind}"]`);if(create)placeholder.append(create);memberships.append(placeholder);
      }
      }
      const title=clubs.querySelector('h2');title.textContent=text('Мой клуб и команда','My club & team');
      const requests=document.createElement('div');requests.innerHTML=panel(text('Заявки и приглашения','Requests & invitations'),'');
      const requestBody=requests.querySelector('.control-panel-body');
      clubs.querySelectorAll(':scope>.account-membership-actions,:scope>.account-membership-request').forEach(n=>requestBody.append(n));
      if(!requestBody.children.length)requestBody.innerHTML=empty(auth.clubsTeams?.enabled?text('Нет ожидающих заявок и приглашений.','No pending requests or invitations.'):text('Данные заявок пока недоступны.','Request data is currently unavailable.'));
      const ledger=clubs.querySelector('.account-operation-list');
      const operationCard=document.createElement('div');operationCard.innerHTML=panel(text('Последние операции','Recent operations'),'');
      const operationBody=operationCard.querySelector('.control-panel-body');
      if(ledger){ledger.querySelector('h3')?.remove();operationBody.append(ledger);}else operationBody.innerHTML=empty(auth.clubsTeams?.enabled?text('Операций пока нет.','No operations yet.'):text('Данные операций пока недоступны.','Operation data is currently unavailable.'));
      left.append(clubs,requests.firstElementChild);right.append(operationCard.firstElementChild);
    }else left.innerHTML=panel(text('Мой клуб и команда','My club & team'),empty(text('Связанный профиль пилота появится после импорта результатов гонок.','Your linked driver profile will appear after race results are imported.')));
    const widget=document.createElement('div');widget.innerHTML=panel(text('Виджет пилота','Driver widget'),empty(text('Настройте отображение пилота для трансляции.','Configure the driver display for your stream.')));
    const widgetBody=widget.querySelector('.control-panel-body');
    const toggle=body.querySelector('#driver-overlay-toggle'),manager=body.querySelector('#driver-overlay-manager');
    if(toggle){toggle.classList.add('button');widgetBody.append(toggle,manager);}else widgetBody.insertAdjacentHTML('beforeend',empty(text('Для виджета нужен связанный профиль.','A linked driver profile is required for the widget.')));
    right.append(widget.firstElementChild);
    if(auth.permissions?.moderationIssue||auth.permissions?.portalManage)right.insertAdjacentHTML('beforeend',panel(text('Управление','Management'),`<div class="control-links">${auth.permissions.moderationIssue?'<a href="/moderation/">'+text('Модерация','Moderation')+' ↗</a>':''}${auth.permissions.portalManage?'<a href="/portal-ops/">Portal Operations ↗</a>':''}</div>`));
    const message=document.createElement('p');message.id='account-message';message.setAttribute('role','status');message.setAttribute('aria-live','polite');message.className='account-command-summary';
    // Moves preserve the native listeners for forms, memberships and overlay.
    nativeRoot.replaceChildren(hero,summary,columns,message);
    wireLinks();
    for(const entity of [auth.clubsTeams?.club,auth.clubsTeams?.team].filter(Boolean)){
      if(entity.status!=='approved')continue;
      const key=[entity.type,entity.slug,entity.publicId].join('/');
      const link=[...nativeRoot.querySelectorAll('.account-membership-link')].find(a=>new URL(a.href).searchParams.get('slug')===entity.slug);
      if(!link)continue;
      if(!profiles.has(key))profiles.set(key,loadApprovedEntityProfile(entity));
      profiles.get(key).then(({detail,assetUrl})=>{
        if(!nativeRoot.contains(link)||currentAuth?.driver?.publicId!==auth.driver?.publicId)return;
        if(assetUrl){const image=new Image();image.src=assetUrl;image.alt='';image.width=46;image.height=46;image.className='account-membership-logo';image.addEventListener('error',()=>image.hidden=true,{once:true});link.prepend(image);}
        const description=document.createElement('p');description.className='page-help';description.textContent=detail['description_'+language]||'';link.after(description);
        const count=document.createElement('small');count.textContent=text('Пилотов: ','Drivers: ')+detail.roster.length;description.after(count);
      }).catch(()=>{profiles.delete(key);});
    }
  }
  async function confirmAction(message){
    if(confirmation)return false;
    confirmation=true;
    showDialog(text('Подтверждение действия','Confirm action'),`<p>${esc(message)}</p><div class="control-actions"><button class="button primary" data-account-confirm>${text('Подтвердить','Confirm')}</button><button class="button" data-account-cancel>${text('Отмена','Cancel')}</button></div>`,document.activeElement);
    const modal=document.getElementById('v2-modal');
    return new Promise(resolve=>{
      const events=new AbortController();let settled=false;
      const done=value=>{if(settled)return;settled=true;events.abort();confirmation=false;if(modal.open)modal.close();resolve(value);};
      modal.addEventListener('close',()=>done(false),{signal:events.signal});
      modal.querySelector('[data-account-confirm]').addEventListener('click',()=>done(true),{signal:events.signal});
      modal.querySelector('[data-account-cancel]').addEventListener('click',()=>done(false),{signal:events.signal});
    });
  }
  const workspace=mountAccountWorkspace({onRender:decorate,confirmAction,refreshAuth:()=>{
    if(refreshPending)return refreshPending;
    refreshPending=client.requestJson('https://auth.asgracing.ru/v1/me',{credentials:'include',cache:'no-store',headers:{Accept:'application/json'}}).then(payload=>{
      const auth=normalizeAuthPayload(payload);authKey=JSON.stringify(auth);workspace.update(auth);return auth;
    }).finally(()=>refreshPending=null);return refreshPending;
  }});
  subscribe(model=>{
    const auth=model.auth;if(!auth)return;
    const key=JSON.stringify(auth);if(key===authKey)return;authKey=key;
    if(!auth.authenticated&&confirmation)document.getElementById('v2-modal').close();
    workspace.update(auth);
  });
  root.addEventListener('click',e=>{const b=e.target.closest('[data-account-native]');if(b)document.querySelector('.auth-header-'+b.dataset.accountNative)?.click();});
  // Native async workspaces produce their own links without rebuilding the page.
  new MutationObserver(wireLinks).observe(root,{childList:true,subtree:true});
}
import {scopeSiteHref,siteContext} from '../site-routing.js?v=20261007root1';

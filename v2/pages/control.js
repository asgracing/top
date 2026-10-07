import markup from './control-content.js?v=20261007v2pages14';
import {normalizeAuthPayload} from '/src/features/auth/header-auth.js?v=20261003names1';
import {v2Route} from '../routes.js?v=20261007v2pages14';

// Approved control-page composition over the existing authenticated controllers.
// There are no preview identities, sample queues, or alternative API contracts.
export async function startControlPage({view,screen,text,esc,language,subscribe,showDialog}) {
  document.body.dataset.prototypePage=screen;
  document.querySelector('.dashboard').classList.add('page-wide');
  document.querySelectorAll('.dashboard>aside').forEach(node=>node.hidden=true);
  const names={account:text('Личный кабинет','My account'),settings:text('Настройки профиля','Profile settings'),moderation:text('Модерация','Moderation'),ops:'Portal Operations'};
  const paths={account:'account/',settings:'account/settings/',moderation:'moderation/',ops:'portal-ops/'};
  const panel=(title,body='')=>`<section class="panel"><div class="panel-head"><h2>${esc(title)}</h2></div><div class="control-panel-body">${body}</div></section>`;
  const help=value=>`<p class="page-help">${esc(value)}</p>`;
  const heading=description=>`<section class="panel control-heading"><div><span class="eyebrow">ASG RACING</span><h1>${names[screen]}</h1><p>${esc(description)}</p></div><a class="button" href="${v2Route('account/',language)}">← ${names.account}</a></section>`;
  view.innerHTML=`<div class="page-breadcrumb"><a href="${v2Route('',language)}">${text('Главная','Home')}</a><span>/</span><b>${names[screen]}</b></div><nav class="control-navigation" aria-label="${text('Кабинет и управление','Account & management')}"></nav><div id="v2-control-root" class="v2-control"></div>`;
  const root=document.getElementById('v2-control-root'),navigation=view.querySelector('.control-navigation');
  let currentAuth=null,authKey='',workspace,confirming=false,refreshPending=null;
  function navigate(auth){
    navigation.innerHTML=['account','settings',...(auth?.permissions?.moderationIssue?['moderation']:[]),...(auth?.permissions?.portalManage?['ops']:[])].map(key=>`<a class="button${key===screen?' active':''}" href="${v2Route(paths[key],language)}"${key===screen?' aria-current="page"':''}>${names[key]}</a>`).join('');
  }
  function wireLinks(){
    root.querySelectorAll('a[href]').forEach(a=>{
      const u=new URL(a.getAttribute('href'),location.href);
      if(siteContext().layout==='root'){a.setAttribute('href',scopeSiteHref(a.getAttribute('href'),language));return;}
      if(![location.origin,'https://asgracing.ru'].includes(u.origin)||u.pathname.startsWith('/v2/'))return;
      const next=v2Route(u.pathname.replace(/^\/(?:ru\/)?/,''),language);
      if(next.startsWith('/v2/')){u.searchParams.delete('lang');a.setAttribute('href',next+u.search+u.hash);}
    });
  }
  async function confirmAction(message){
    if(confirming)return false;
    confirming=true;
    let details='';
    if(screen==='moderation'&&root.querySelector('#moderation-target:not([hidden])')){
      const reason=root.querySelector('#moderation-reason'),comment=root.querySelector('#moderation-comment'),evidence=root.querySelector('#moderation-evidence');
      details=`<dl>${[[text('Пилот','Pilot'),root.querySelector('#moderation-search').value],[text('Причина','Reason'),reason.selectedOptions[0].textContent],[text('Комментарий','Comment'),comment.value],[text('Доказательство','Evidence'),evidence.value||'—']].map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
    }
    showDialog(text('Подтверждение действия','Confirm action'),`<div class="control-confirm"><h3>${esc(message)}</h3>${details}<div class="control-actions"><button class="button primary" data-control-confirm>${text('Подтвердить','Confirm')}</button><button class="button" data-control-cancel>${text('Отмена','Cancel')}</button></div></div>`,document.activeElement);
    const modal=document.getElementById('v2-modal');
    return new Promise(resolve=>{
      const events=new AbortController();let settled=false;
      const done=value=>{
        if(settled)return;settled=true;events.abort();
        const complete=()=>{confirming=false;resolve(value);};
        // Native close is queued. Finish it before opening the next confirmation
        // (the third strike), so its event cannot dismiss the new dialog.
        if(modal.open){modal.addEventListener('close',complete,{once:true});modal.close();}else complete();
      };
      modal.querySelector('[data-control-confirm]').addEventListener('click',()=>done(true),{signal:events.signal});
      modal.querySelector('[data-control-cancel]').addEventListener('click',()=>done(false),{signal:events.signal});
      modal.addEventListener('close',()=>done(false),{signal:events.signal});
      modal.addEventListener('cancel',()=>done(false),{signal:events.signal});
    });
  }
  function makePanel(title){const wrap=document.createElement('div');wrap.innerHTML=panel(title);return wrap.firstElementChild;}
  const desc=screen==='settings'?text('Титул пилота, уникальный гоночный номер и отображение виджета.','Driver title, unique race number and widget appearance.'):screen==='moderation'?text('Баны, страйки и рассмотрение заявок на гоночные номера.','Bans, strikes and race-number requests.'):text('Клубы, команды и будущие часовые события.','Clubs, teams and upcoming hourly events.');

  if(screen==='settings'){
    const {mountAccountWorkspace}=await import('/src/pages/account/account.js?v=20261007controlv2');
    document.body.dataset.accountPage='settings';
    root.innerHTML='<div id="account-content" class="v2-account"></div>';
    function decorate(nativeRoot,auth){
      const hero=document.createElement('div');hero.innerHTML=heading(desc);
      if(!auth?.authenticated||!auth.linked){
        const content=nativeRoot.querySelector('.account-card-body');
        const gate=makePanel(text('Профиль пилота','Driver profile'));
        if(content)gate.querySelector('.control-panel-body').append(content);
        nativeRoot.replaceChildren(hero.firstElementChild,gate);wireLinks();return;
      }
      const columns=document.createElement('div');columns.className='control-columns';
      const left=document.createElement('div'),right=document.createElement('aside');columns.append(left,right);
      for(const [selector,title] of [['.account-title-settings',text('Титул пилота','Driver title')],['.account-number-settings',text('Гоночный номер','Race number')]]){
        const section=nativeRoot.querySelector(selector),card=makePanel(title),body=card.querySelector('.control-panel-body');
        if(section){section.querySelector('h2')?.remove();body.append(section);}
        if(selector==='.account-number-settings'){
          const number=document.createElement('div');number.className='control-number-display';
          number.innerHTML=`<b>#${esc(auth.preferences?.raceNumber??'—')}</b><span>${text('Уникальный номер от 1 до 999. Новый номер требует одобрения.','Unique number from 1 to 999. New assignments require approval.')}</span>`;body.prepend(number);
          section?.querySelector('a[href="/account/"]')?.remove();
          body.insertAdjacentHTML('beforeend',`<a class="text-link" href="${v2Route('privacy/',language)}">${text('Условия обработки данных','Data processing terms')} ↗</a>`);
        } else {
          const title=section?.querySelector('.account-active-title');
          if(title){const preview=document.createElement('div');preview.className='control-title-preview';preview.append(title);body.prepend(preview);}
        }
        left.append(card);
      }
      const widget=makePanel(text('Отображение виджета','Widget appearance'));
      widget.querySelector('.control-panel-body').innerHTML=`${help(text('Настройки вашего виджета пилота для трансляции.','Settings for your personal driver widget.'))}<button class="button" id="driver-overlay-toggle" aria-expanded="false" aria-controls="driver-overlay-manager">${text('Настроить виджет','Configure widget')}</button><section id="driver-overlay-manager" class="account-overlay-manager" hidden></section>`;
      right.append(widget);
      const linked=makePanel(text('Связанные аккаунты','Linked accounts'));
      linked.querySelector('.control-panel-body').innerHTML=`<div class="control-linked"><span>Steam</span><b>${esc(auth.steam?.personaName||auth.driver?.displayName||text('Связан','Linked'))}</b></div><div class="control-linked"><span>Discord</span><b>${auth.discord?.linked?text('Связан','Linked'):text('Не связан','Not linked')}</b></div><div class="control-actions" data-discord-actions></div>${help(text('Имена и аватар берутся из Steam.','Name and avatar come from Steam.'))}`;
      ['link','sync','unlink'].forEach(key=>{
        const original=document.querySelector('.auth-header-discord-'+key);if(!original)return;
        const button=document.createElement('button');button.type='button';button.className='button';button.textContent=original.textContent;
        button.onclick=()=>document.querySelector('.auth-header-discord-'+key)?.click();linked.querySelector('[data-discord-actions]').append(button);
      });
      right.append(linked);
      const operations=makePanel(text('Последние операции','Recent operations'));
      const notifications=auth.clubsTeams?.notifications||[];
      operations.querySelector('.control-panel-body').innerHTML=notifications.length?`<div class="control-ledger">${notifications.slice(0,5).map(item=>`<article><div><b>${esc(item.status)}</b><small>${esc(item.createdAt||'')}</small></div></article>`).join('')}</div>`:help(text('Нет опубликованных операций.','No published operations.'));
      right.append(operations);
      const message=nativeRoot.querySelector('#account-message');
      nativeRoot.replaceChildren(hero.firstElementChild,columns,...(message?[message]:[]));
      workspace.mountOverlay(auth);wireLinks();
    }
    workspace=mountAccountWorkspace({onRender:decorate,confirmAction,refreshAuth:()=>{
      if(refreshPending)return refreshPending;
      refreshPending=fetch('https://auth.asgracing.ru/v1/me',{credentials:'include',cache:'no-store',headers:{Accept:'application/json'}}).then(async response=>{
        if(!response.ok)throw new Error('auth_unavailable');
        const auth=normalizeAuthPayload(await response.json());authKey=JSON.stringify(auth);currentAuth=auth;workspace.update(auth);navigate(auth);return auth;
      }).finally(()=>refreshPending=null);return refreshPending;
    }});
  } else {
    root.innerHTML=heading(desc)+markup[screen];
    const oldHeading=root.querySelector(screen==='ops'?'.portal-ops-heading':'.moderation-heading');oldHeading?.remove();
    root.querySelector('.control-heading h1').id=screen==='ops'?'portal-ops-title':'moderation-title';
    root.querySelector(screen==='ops'?'.portal-ops-card':'.moderation-card')?.classList.add('control-native-host');
    const gate=root.querySelector(screen==='ops'?'#portal-ops-gate':'#moderation-gate');gate.classList.add('panel','control-gate');
    if(screen==='moderation'){
      const workspaceNode=root.querySelector('#moderation-workspace'),numbers=root.querySelector('.moderation-number-review'),form=root.querySelector('#moderation-form'),tabs=root.querySelector('.moderation-tabs');
      const tabRow=document.createElement('div');tabRow.className='control-tabs';tabRow.innerHTML=`<button class="button" data-mod-view="sanctions" aria-pressed="true">${text('Баны и страйки','Bans & strikes')}</button><button class="button" data-mod-view="numbers" aria-pressed="false">${text('Гоночные номера','Race numbers')}</button>`;
      const columns=document.createElement('div');columns.className='control-columns';
      const left=document.createElement('div'),right=document.createElement('aside');columns.append(left,right);
      const sanctionCard=makePanel(text('Новая санкция','New sanction')),numberCard=makePanel(text('Заявки на номера','Number requests'));
      sanctionCard.querySelector('.control-panel-body').append(tabs,form);numberCard.querySelector('.control-panel-body').append(numbers);numberCard.hidden=true;
      // The same native fields, ordered as in the prototype's two-column form.
      const fields=['moderation-reason','moderation-event','moderation-comment','moderation-evidence'].map(id=>form.querySelector('#'+id).closest('label'));
      const warning=form.querySelector('.moderation-warning');fields.forEach(field=>form.insertBefore(field,warning));form.querySelector('.moderation-grid').remove();
      left.append(sanctionCard,numberCard);
      right.innerHTML=panel(text('Состояние операции','Operation state'),'<div id="v2-moderation-status" class="control-status-flow"></div>')+panel(text('Проверка доступа','Access check'),help(text('Действия доступны только модераторам. Защищённые аккаунты нельзя выбрать для санкции.','Actions are available to moderators only. Protected accounts cannot be sanctioned.'))+`<a class="button" href="${v2Route('bans/',language)}">${text('Публичный список банов','Public ban list')} ↗</a>`);
      const log=makePanel(text('Журнал модерации','Moderation log'));
      log.querySelector('.control-panel-body').innerHTML=help(text('Операции текущего сеанса.','Operations in the current session.'))+'<div class="control-ledger" id="v2-moderation-log"></div>';right.insertBefore(log,right.lastElementChild);
      workspaceNode.replaceChildren(tabRow,columns);
      tabRow.querySelectorAll('button').forEach(button=>button.onclick=()=>{
        const numbersOpen=button.dataset.modView==='numbers';sanctionCard.hidden=numbersOpen;numberCard.hidden=!numbersOpen;
        tabRow.querySelectorAll('button').forEach(node=>node.setAttribute('aria-pressed',String(node===button)));
      });
      const {mountModerationWorkspace}=await import('/src/pages/moderation/moderation-page.js?v=20261007root1');
      workspace=mountModerationWorkspace({confirmAction});
      const status=root.querySelector('#v2-moderation-status');
      const journal=root.querySelector('#v2-moderation-log');let lastMessage='';
      new MutationObserver(()=>{
        const current=root.querySelector(sanctionCard.hidden?'#race-number-review-message':'#moderation-message');
        status.textContent=current?.textContent||text('Нет ожидающих действий.','No pending actions.');status.dataset.kind=current?.dataset.kind||'';
        if(current?.textContent&&current.dataset.kind&&current.textContent!==lastMessage){lastMessage=current.textContent;const entry=document.createElement('article');entry.textContent=lastMessage;entry.dataset.kind=current.dataset.kind;journal.prepend(entry);}
      }).observe(left,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','data-kind']});
    } else {
      const workspaceNode=root.querySelector('#portal-ops-workspace'),tabs=root.querySelector('.portal-ops-tabs');tabs.classList.add('panel','control-ops-toolbar');
      const hourlyTab=tabs.querySelector('[data-panel="hourly"]');tabs.prepend(hourlyTab);
      workspaceNode.prepend(tabs);
      for(const [kind,listSelector,formSelector] of [['hourly','#portal-hourly-events','#portal-hourly-form'],['clubs','#portal-clubs-list','#portal-clubs-form']]){
        const section=root.querySelector('#portal-panel-'+kind),list=root.querySelector(listSelector),form=root.querySelector(formSelector),layout=document.createElement('div');layout.className='control-ops-layout';
        const selector=document.createElement('aside');selector.className='panel control-selector';
        selector.innerHTML=`<h2>${kind==='hourly'?text('Будущие события','Upcoming events'):text('Сущности','Entities')}</h2><label class="control-field">${text('Поиск','Search')}<input type="search" data-ops-filter="${kind}"></label>`;
        if(kind==='clubs')selector.insertAdjacentHTML('beforeend',`<div class="control-tabs"><button class="button" data-entity-type="all" aria-pressed="true">${text('Все','All')}</button><button class="button" data-entity-type="club">${text('Клубы','Clubs')}</button><button class="button" data-entity-type="team">${text('Команды','Teams')}</button></div>`);
        selector.append(list);
        if(kind==='hourly'){
          const grid=form.querySelector('.portal-ops-grid');grid.classList.add('control-form-grid');
          const order=['hourly-race-format','hourly-track','hourly-participation-mode','hourly-team-max-drivers','hourly-points-multiplier','hourly-game-hour','hourly-race-start','hourly-server-open'];
          order.forEach(id=>grid.append(root.querySelector('#'+id).closest('label')));
          for(const [label,ids,open] of [[text('Сессии и окно сервера','Sessions & server window'),['hourly-practice','hourly-qualifying','hourly-race','hourly-window','hourly-wait','hourly-overtime'],true],[text('Погода','Weather'),['hourly-temp','hourly-cloud','hourly-rain','hourly-randomness'],false]]){
            const details=document.createElement('details');details.className='control-form-details';details.open=open;details.innerHTML=`<summary>${esc(label)}</summary><div class="control-form-grid${open?' three':''}"></div>`;
            ids.forEach(id=>details.lastElementChild.append(root.querySelector('#'+id).closest('label')));grid.after(details);
          }
          // Sessions stay above weather, as in the approved editor.
          grid.after(form.querySelector('.control-form-details[open]'));
          const title=form.querySelector('.portal-hourly-form-title');title.classList.add('control-editor-head');
          const label=form.querySelector('#hourly-selected-title'),pretty=document.createElement('div');title.prepend(pretty);label.classList.add('control-source-title');
          new MutationObserver(()=>{const [date,name]=label.textContent.split(' · ');pretty.innerHTML=`<span class="eyebrow">${esc(date)} · UTC+3</span><h2>${esc(name||'')}</h2>`;}).observe(label,{childList:true,characterData:true,subtree:true});
        }
        const editor=document.createElement('section');editor.className='panel control-editor';
        const placeholder=document.createElement('p');placeholder.className='control-empty-selection page-help';placeholder.textContent=text('Выберите запись слева.','Select an item on the left.');
        editor.append(placeholder,form);layout.append(selector,editor);
        root.querySelector('.portal-hourly-layout')?.remove();section.append(layout);
        let type='all';
        const filter=()=>{const q=selector.querySelector('input').value.trim().toLowerCase();list.querySelectorAll(':scope>button,:scope>article').forEach(node=>node.hidden=!node.textContent.toLowerCase().includes(q)||(type!=='all'&&node.dataset.entityType!==type));};
        selector.querySelector('input').oninput=filter;
        selector.querySelectorAll('[data-entity-type]').forEach(button=>button.onclick=()=>{type=button.dataset.entityType;selector.querySelectorAll('[data-entity-type]').forEach(n=>n.setAttribute('aria-pressed',String(n===button)));filter();});
        new MutationObserver(()=>{
          if(placeholder.hidden===form.hidden)placeholder.hidden=!form.hidden;
          list.querySelectorAll('.portal-ops-entity').forEach(node=>{if(!node.dataset.entityType)node.dataset.entityType=/\bclub\b/.test(node.textContent)?'club':'team';});
          filter();
          if(form.hidden&&list.firstElementChild?.matches('button,article'))list.firstElementChild.click();
        }).observe(editor,{subtree:true,attributes:true,attributeFilter:['hidden']});
        new MutationObserver(()=>{
          filter();if(form.hidden&&list.firstElementChild?.matches('button,article'))list.firstElementChild.click();
        }).observe(list,{childList:true});
      }
      localizeOps();
      const {mountPortalOpsWorkspace}=await import('/src/pages/portal-ops/portal-ops-page.js?v=20261007root1');
      workspace=mountPortalOpsWorkspace({confirmAction});
      root.querySelector('[data-panel="hourly"]').click();
      const journal=makePanel(text('Журнал операций','Operation log'));journal.hidden=true;
      journal.querySelector('.control-panel-body').innerHTML=`<h3>${text('История выбранного клуба или команды','Selected club or team history')}</h3><div data-ops-audit></div><h3>${text('Операции текущего сеанса','Current session operations')}</h3><div class="control-ledger" data-ops-session></div>`;
      workspaceNode.append(journal);
      const journalTab=document.createElement('button');journalTab.type='button';journalTab.textContent=text('Журнал операций','Operation log');journalTab.setAttribute('aria-selected','false');tabs.append(journalTab);
      journalTab.onclick=()=>{tabs.querySelectorAll('button').forEach(button=>button.setAttribute('aria-selected',String(button===journalTab)));root.querySelectorAll('.portal-ops-panel').forEach(node=>node.hidden=true);journal.hidden=false;};
      tabs.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',()=>{journal.hidden=true;journalTab.setAttribute('aria-selected','false');}));
      const audit=root.querySelector('#portal-clubs-audit');
      const mirrorAudit=()=>journal.querySelector('[data-ops-audit]').replaceChildren(...[...audit.children].map(node=>node.cloneNode(true)));
      mirrorAudit();new MutationObserver(mirrorAudit).observe(audit,{subtree:true,childList:true,characterData:true});
      for(const message of root.querySelectorAll('.portal-ops-message')){
        let previous='';
        new MutationObserver(()=>{if(!message.textContent||message.textContent===previous)return;previous=message.textContent;const entry=document.createElement('article');entry.textContent=previous;entry.dataset.kind=message.dataset.kind;journal.querySelector('[data-ops-session]').prepend(entry);}).observe(message,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-kind']});
      }
      const preview=root.querySelector('#hourly-preview-details'),previewView=document.createElement('dl');previewView.className='control-preview-diff';preview.before(previewView);preview.classList.add('control-source-title');
      new MutationObserver(()=>{
        let data;try{data=JSON.parse(preview.textContent);}catch{return;}
        previewView.innerHTML=(data.changes||[]).map(change=>`<div><dt>${esc(change.field||change.key||'')}</dt><dd><del>${esc(change.before??'—')}</del> → <b>${esc(change.after??'—')}</b></dd></div>`).join('')||help(text('Нет изменений.','No changes.'));
      }).observe(preview,{childList:true,characterData:true,subtree:true});
      const lab=root.querySelector('a[href="/portal-ops/asg-lab/"]');
      if(lab){lab.closest('section').classList.add('panel','control-lab-link');lab.closest('section').querySelector('p').classList.add('page-help');}
    }
  }
  function localizeOps(){
    const copy={'Изменения':'Changes','Логотип':'Logo','Состав':'Roster','Заявки':'Requests','Последние действия':'Recent actions','Действие':'Action','Public ID пилота':'Public driver ID','Причина / комментарий':'Reason / comment','Отправить команду':'Submit command','Одобрить описание':'Approve description','Отклонить описание':'Reject description','Одобрить логотип':'Approve logo','Отклонить логотип':'Reject logo','Добавить участника':'Add member','Удалить участника':'Remove member'};
    if(language==='en')root.querySelectorAll('h4,label>span,button[type="submit"],option').forEach(node=>{if(copy[node.textContent.trim()])node.textContent=copy[node.textContent.trim()];});
  }
  subscribe(model=>{
    const auth=model.auth;if(!auth)return;
    const key=JSON.stringify(auth);if(key===authKey)return;authKey=key;currentAuth=auth;
    if(confirming&&(!auth.authenticated||(screen==='moderation'&&!auth.permissions?.moderationIssue)||(screen==='ops'&&!auth.permissions?.portalManage)))document.getElementById('v2-modal').close();
    navigate(auth);workspace.update(auth);wireLinks();
    if(screen!=='settings'&&!auth.authenticated){
      const gate=root.querySelector(screen==='ops'?'#portal-ops-gate':'#moderation-gate');
      const failed=document.querySelector('.auth-header')?.dataset.authState==='error';
      if(failed)gate.textContent=text('Авторизация временно недоступна. Повторите вход через меню профиля.','Sign-in is temporarily unavailable. Retry using the profile menu.');
      else {const login=document.createElement('a');login.className='button primary';login.textContent=text('Войти через Steam','Sign in with Steam');login.href='https://auth.asgracing.ru/v1/auth/steam/start?return_path='+encodeURIComponent(location.pathname+location.search);gate.append(login);}
    }
  });
  new MutationObserver(wireLinks).observe(root,{childList:true,subtree:true});
  navigate(currentAuth);
}

import {scopeSiteHref,siteContext} from '../site-routing.js?v=20261007root1';

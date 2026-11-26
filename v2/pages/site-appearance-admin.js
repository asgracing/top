import {routeHref} from '../site-routing.js?v=20261007root1';
const origin='https://auth.asgracing.ru',endpoint=origin+'/v1/site-admin/appearance',versions=['current','membership'];
async function request(options={}){
  const response=await fetch(endpoint,{credentials:'include',cache:'no-store',signal:AbortSignal.timeout(8000),...options});
  if(!response.ok)throw Object.assign(Error('Configuration unavailable'),{status:response.status});
  const state=await response.json();
  if(typeof state.new_year_enabled!=='boolean'||!Number.isSafeInteger(state.revision))throw Error('Invalid state');
  return state;
}
export function mountAppearanceAdmin({view,language,subscribe}){
  const t=(ru,en)=>language==='ru'?ru:en;
  view.className='asg-appearance-admin';
  view.innerHTML=`<header class="asg-appearance-heading"><h1>${t('Управление сайтом','Site management')}</h1></header>
  <section class="panel asg-appearance-gate"><p role="status"></p><a class="button primary" hidden>${t('Войти через Steam','Sign in with Steam')}</a><button class="button" hidden>${t('Повторить','Retry')}</button></section>
  <div class="asg-appearance-workspace" hidden>
    <section class="panel asg-home-admin"><h2>${t('Главная страница','Homepage')}</h2><p>${t('Выбор применяется для всех.','Save for all visitors.')}</p>
      <fieldset class="asg-home-options"><legend>${t('Выбор версии','Choose a version')}</legend>${versions.map((id,i)=>`<label><input type="radio" name="home-version" value="${id}"><strong>${i?t('Новая','New'):t('Текущая','Current')}</strong><span>${i?t('Статистика и подписки.','Statistics and subscriptions.'):t('Привычная главная.','The familiar homepage.')}</span></label>`).join('')}</fieldset>
      <div class="asg-home-actions"><button class="button" data-home-preview>${t('Предпросмотр','Preview')}</button><button class="button primary" data-home-save>${t('Сохранить версию','Save version')}</button><span data-home-active></span></div><p role="status" data-home-message></p>
    </section>
    <section class="panel asg-appearance-controls"><h2>${t('Оформление','Appearance')}</h2><div class="asg-appearance-card"><div class="asg-appearance-swatch" aria-hidden="true"></div><h3>${t('Новый год','New Year')}</h3><p>${t('Сезонное оформление.','Seasonal styling.')}</p><span class="asg-appearance-state"></span><button class="button primary" data-appearance-save></button></div><p class="asg-appearance-message" role="status"></p></section>
    <section class="panel asg-appearance-preview"><div class="asg-appearance-preview-top"><div><h2>${t('Предпросмотр','Preview')}</h2><p>${t('Просмотр без сохранения.','Preview without saving.')}</p></div><div class="asg-appearance-preview-actions"><select aria-label="${t('Страница для предпросмотра','Page to preview')}"><option value="">${t('Главная','Home')}</option><option value="hourly/">${t('Часовые гонки','Hourly races')}</option><option value="about/">${t('О сообществе','About')}</option></select><button class="button" aria-pressed="true" data-appearance-preview>${t('Новогодний стиль','New Year style')}</button></div></div><div class="asg-appearance-frame"></div></section>
  </div>`;
  const q=selector=>view.querySelector(selector),gate=q('.asg-appearance-gate'),workspace=q('.asg-appearance-workspace');
  const login=gate.querySelector('a'),retry=gate.querySelector('button'),seasonSave=q('[data-appearance-save]'),homeSave=q('[data-home-save]');
  const message=q('.asg-appearance-message'),homeMessage=q('[data-home-message]'),select=q('select'),frameHost=q('.asg-appearance-frame'),previewToggle=q('[data-appearance-preview]');
  const radios=[...view.querySelectorAll('[name="home-version"]')];
  const url=new URL('/v1/auth/steam/start',origin);url.searchParams.set('return_path',routeHref('site-admin/',language));login.href=url.href;
  let current,csrf,frame,busy=false,preview=true,pending='current',ticket=0,hadAccess=false;
  function denied(status){
    current=undefined;csrf=undefined;workspace.hidden=true;frame?.remove();frame=undefined;gate.hidden=false;
    login.hidden=status!==401;retry.hidden=status===401||status===403;
    gate.querySelector('p').textContent=status===401?t('Войди через Steam.','Sign in with Steam.'):status===403?t('Нет доступа к управлению сайтом.','Site management access denied.'):t('Не удалось проверить доступ.','Could not check access.');
  }
  function update(){
    const enabled=current.new_year_enabled,ready=versions.includes(current.home_version),label=q('.asg-appearance-state');
    label.dataset.enabled=String(enabled);label.textContent=enabled?t('Включено на сайте','Active on site'):t('Выключено на сайте','Off on site');
    seasonSave.disabled=busy;seasonSave.textContent=enabled?t('Выключить на сайте','Turn off on site'):t('Включить на сайте','Turn on for the site');
    for(const radio of radios){radio.checked=radio.value===pending;radio.disabled=busy||!ready;}
    homeSave.disabled=busy||!ready||pending===current.home_version;
    q('[data-home-active]').textContent=t('На сайте: ','On site: ')+(current.home_version==='membership'?t('новая','new'):t('текущая','current'));
    if(!ready)homeMessage.textContent=t('Выбор версии недоступен.','Homepage selection unavailable.');
  }
  function showPreview(home=false){
    if(!frame){frame=document.createElement('iframe');frame.title=t('Предпросмотр','Preview');frame.tabIndex=-1;frame.setAttribute('sandbox','allow-same-origin allow-scripts');frameHost.append(frame);}
    frame.setAttribute('data-asg-new-year-preview',preview?'on':'off');frame.setAttribute('data-asg-home-preview',pending);
    if(home)select.value='';frame.src=routeHref(select.value,language);
  }
  async function load(){
    const id=++ticket;retry.hidden=true;gate.querySelector('p').textContent=t('Проверяем доступ…','Checking access…');
    try{const result=await request();if(id!==ticket)return;if(typeof result.csrf_token!=='string'||!result.csrf_token)throw Error('Missing CSRF');
      current=result;csrf=result.csrf_token;pending=result.home_version==='membership'?'membership':'current';gate.hidden=true;workspace.hidden=false;update();if(!frame)showPreview();
    }catch(error){if(id===ticket)denied(error.status);}
  }
  async function save(changes,notice){
    if(!current||busy)return;const id=ticket;busy=true;update();notice.textContent=t('Сохраняем…','Saving…');
    try{const result=await request({method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({...changes,revision:current.revision})});
      if(id!==ticket)return;if(Object.entries(changes).some(([key,value])=>result[key]!==value))throw Error('Unconfirmed setting');
      current=result;notice.textContent=t('Сохранено. Обновление для всех — до минуты.','Saved. Updates for everyone within a minute.');window.dispatchEvent(new Event('asg-appearance-refresh'));
    }catch(error){if(id!==ticket)return;await load();notice.textContent=error.status===409?t('Конфликт. Состояние перечитано.','Conflict. Current state reloaded.'):t('Запись не подтверждена. Состояние перечитано.','Save not confirmed. State reloaded.');}
    finally{busy=false;if(current)update();}
  }
  retry.onclick=()=>void load();select.onchange=()=>showPreview();
  previewToggle.onclick=()=>{preview=!preview;previewToggle.setAttribute('aria-pressed',String(preview));frame?.setAttribute('data-asg-new-year-preview',preview?'on':'off');};
  for(const radio of radios)radio.onchange=()=>{pending=radio.value;update();homeMessage.textContent=t('Не сохранено.','Not saved.');};
  q('[data-home-preview]').onclick=()=>{showPreview(true);frameHost.scrollIntoView({block:'nearest'});};
  homeSave.onclick=()=>{if(!homeSave.disabled)void save({home_version:pending},homeMessage);};
  seasonSave.onclick=()=>void save({new_year_enabled:!current.new_year_enabled},message);
  subscribe(({auth})=>{if(auth?.permissions?.siteAppearanceManage){if(!hadAccess&&!current)void load();hadAccess=true;}else if(hadAccess){hadAccess=false;++ticket;denied(auth?.authenticated?403:401);}});
  if(!ticket)void load();
}

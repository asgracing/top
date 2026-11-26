import {createHttpClient} from '../src/shared/http-client.js';

const AUTH='https://auth.asgracing.ru',STATUS=AUTH+'/v1/me/support';
const tiers={supporter:'Supporter',vip:'VIP',pro:'PRO'};
const options={cache:'no-store',credentials:'include',headers:{Accept:'application/json'}};

export async function activateSupportTrial({tier,client,confirm}){
  if(!Object.hasOwn(tiers,tier))return {kind:'unavailable'};
  let submitted=false;
  try{
    const auth=await client.requestJson(AUTH+'/v1/me',options);
    if(!auth?.authenticated)return {kind:'login'};
    const {trial}=await client.requestJson(STATUS,options);
    if(typeof auth.csrf_token!=='string'||!auth.csrf_token||!Array.isArray(trial?.eligible_tiers))return {kind:'unavailable'};
    if(trial.used)return {kind:'used'};
    if(!trial.eligible_tiers.includes(tier))return {kind:'ineligible'};
    if(!await confirm(tiers[tier]))return {kind:'cancelled'};
    submitted=true;
    await client.requestJson(STATUS+'/trial',{
      ...options,method:'POST',headers:{...options.headers,'Content-Type':'application/json','X-CSRF-Token':auth.csrf_token},
      body:JSON.stringify({tier})
    });
    return {kind:'active',name:tiers[tier]};
  }catch(error){
    if(error.status===401)return {kind:'login'};
    if(error.status===409)return {kind:'conflict'};
    if(submitted&&(!error.status||error.status>=500||error.kind==='parse')){
      // The POST may have been accepted. Read once; never repeat it automatically.
      try{const {trial}=await client.requestJson(STATUS,options);if(trial?.used)return {kind:'used'};}catch{}
      return {kind:'unknown'};
    }
    return {kind:'unavailable'};
  }
}

export function wireSupportTrials(roots,{text,returnPath,client=createHttpClient({defaultTimeoutMs:8000})}){
  const buttons=(Array.isArray(roots)?roots:[roots]).flatMap(root=>[...root.querySelectorAll('[data-support-trial]')]);
  const noticeFor=button=>button.closest('[data-support-trial-card]')?.querySelector('[data-trial-status]')||button.parentElement.nextElementSibling;
  let busy=false,disposed=false,blocked=false;
  async function click(event){
    if(busy||blocked)return;
    const button=event.currentTarget,notice=noticeFor(button);
    if(!notice)return;
    busy=true;
    for(const other of buttons){other.disabled=true;noticeFor(other)?.replaceChildren();}
    button.setAttribute('aria-busy','true');
    notice.textContent=text('Проверяем доступ…','Checking eligibility…');
    const result=await activateSupportTrial({tier:button.dataset.supportTrial,client,confirm:name=>window.confirm(text(
      `Активировать ${name} на 7 дней? Пробный период начнётся сейчас. Списаний не будет.`,
      `Start a 7-day ${name} trial now? You won't be charged.`))});
    if(disposed)return;
    blocked=['active','used','unknown'].includes(result.kind);
    const messages={
      unavailable:text('Пробный доступ сейчас недоступен.','Trial access is currently unavailable.'),
      used:text('Пробный период для этого Steam-аккаунта уже использован.','This Steam account has already used its trial.'),
      ineligible:text('Этот уровень недоступен для пробного периода.','This tier is not eligible for a trial.'),
      conflict:text('Доступ изменился. Нажмите ещё раз, чтобы проверить статус.','Eligibility changed. Try again to refresh your status.'),
      unknown:text('Результат активации пока не подтверждён. Проверьте доступ в личном кабинете; повторно не отправляем.','Activation is not confirmed yet. Check your account; the request will not be repeated.'),
      active:text(`${result.name} активирован на 7 дней.`,`${result.name} is active for 7 days.`),cancelled:''
    };
    notice.textContent=messages[result.kind]||'';
    if(result.kind==='login'){
      const link=document.createElement('a');link.className='text-link';
      link.href=AUTH+'/v1/auth/steam/start?return_path='+encodeURIComponent(returnPath);
      link.textContent=text('Войдите через Steam, чтобы попробовать 7 дней','Sign in through Steam to try it for 7 days');notice.replaceChildren(link);
    }
    if(['active','used','unknown'].includes(result.kind)){
      const account=document.createElement('a');account.className='text-link';
      account.href=returnPath.startsWith('/en/')?'/en/account/':'/account/';
      account.textContent=text(' Открыть личный кабинет ↗',' Open account ↗');notice.append(account);
    }
    busy=false;button.removeAttribute('aria-busy');
    for(const other of buttons)other.disabled=blocked;
  }
  for(const button of buttons)button.addEventListener('click',click);
  return ()=>{disposed=true;for(const button of buttons)button.removeEventListener('click',click);};
}

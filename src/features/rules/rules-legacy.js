const host=document.getElementById('rules');
if(host){
  let pending=false, dialog, body, mountRules, cleanup;
  const language=()=>document.documentElement.lang==='ru'?'ru':'en';
  function render(){
    cleanup?.();cleanup=mountRules(body,language());
    dialog.querySelector('button').textContent=language()==='ru'?'Закрыть':'Close';
  }
  async function open(){
    if(pending)return;
    pending=true;
    const button=host.querySelector('[data-rules-open]');
    if(button)button.disabled=true;
    try{
      ({mountRules}=await import('./rules-view.js?v=20261016rules1'));
      if(!dialog){
        dialog=document.createElement('dialog');dialog.className='asg-rules-legacy-dialog';
        dialog.setAttribute('aria-label',language()==='ru'?'Правила ASG Racing':'ASG Racing rules');
        const close=document.createElement('button');close.type='button';close.className='asg-rules-legacy-close';
        close.addEventListener('click',()=>dialog.close());
        body=document.createElement('div');body.className='asg-rules-legacy-body';
        dialog.append(close,body);document.body.append(dialog);
      }
      render();if(!dialog.open)dialog.showModal();
    }catch{
      const status=host.querySelector('[data-rules-load-status]');
      if(status)status.textContent=language()==='ru'?'Не удалось загрузить правила. Попробуйте ещё раз.':'Rules could not be loaded. Please try again.';
    }finally{pending=false;if(button)button.disabled=false;}
  }
  host.addEventListener('click',event=>{if(event.target.closest('[data-rules-open]'))void open();});
  new MutationObserver(()=>{if(dialog?.open)render();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  window.addEventListener('hashchange',()=>{if(location.hash==='#rules')void open();});
  document.addEventListener('click',event=>{if(event.target.closest('a[href="#rules"]'))void open();});
  if(location.hash==='#rules')void open();
}

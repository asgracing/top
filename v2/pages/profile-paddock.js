import {createHttpClient} from '/src/shared/http-client.js';
import {APPEARANCE_URL,normalizeEffect} from './profile-effects.js?v=20261121studiopolish';
import {loadDriverSupportStyles,mountDriverSupport} from './driver-support.js?v=20261121publicpaddock';
import {passProfile} from './profile-racing-pass.js?v=20261121publicpaddock';

const client = createHttpClient({defaultTimeoutMs:8000});
const allowed = value => ['pro','admin'].includes(value?.tier);

export async function openPaddock({root,profile,language,text,signal,publicAppearance,auth,onSave}) {
  function message(value) {
    const notice=root.ownerDocument.createElement('p');
    notice.className='page-help';
    notice.setAttribute('role','status');
    notice.textContent=value;
    root.replaceChildren(notice);
  }

  message(text('Загружаем паддок…','Loading paddock…'));
  try {
    if(!profile)return;
    const headers={Accept:'application/json'};
    const request={credentials:'include',cache:'no-store',signal,headers};
    let current=auth?await client.requestJson(APPEARANCE_URL,request):publicAppearance;
    if(signal.aborted)return;
    if(!allowed(current)){
      message(text('Витрина гонок, личный прогресс и карточки доступны в PRO.','Race showcases, personal progress and cards are available with PRO.'));
      return;
    }
    if(current.paddock_version!==1){
      message(text('Паддок временно недоступен.','Paddock is temporarily unavailable.'));
      return;
    }
    const owner=Boolean(auth?.csrfToken && current.can_edit===true && Number.isInteger(current.revision));
    await loadDriverSupportStyles();
    if(signal.aborted)return;
    const controller=mountDriverSupport({root,profile:passProfile(profile,root.closest('#page-view')),language,owner,settings:current.effect,advanced:current.pass_editor_version===2,
      async onSave(changes){
        const result=await client.requestJson(APPEARANCE_URL,{
          ...request,method:'POST',headers:{...headers,'Content-Type':'application/json','X-CSRF-Token':auth.csrfToken},
          body:JSON.stringify({expected_revision:current.revision,effect:{...normalizeEffect(current.effect),...changes}}),
        });
        if(!Number.isInteger(result.revision) || result.revision<=current.revision)throw new Error('appearance_revision');
        current={...current,revision:result.revision,effect:{...current.effect,...changes}};
        onSave?.();
      },
    });
    signal.addEventListener('abort',()=>controller?.destroy(),{once:true});
  } catch {
    if(!signal.aborted)message(text('Паддок временно недоступен.','Paddock is temporarily unavailable.'));
  }
}

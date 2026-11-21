import {createHttpClient} from '/src/shared/http-client.js';
import {
  APPEARANCE_URL, LAYERS, PRESETS, appendBadge, createProfileEffect, normalizeEffect,
} from './profile-effects.js?v=20261121studio06';

export function openAppearanceEditor({view,auth,text,signal,onClose,onSave}) {
  const root = view.ownerDocument.createElement('section');
  root.className = 'panel profile-appearance-editor';
  root.setAttribute('aria-labelledby','profile-appearance-title');
  view.before(root);
  signal.addEventListener('abort',()=>root.remove(),{once:true});
  const client = createHttpClient({defaultTimeoutMs:8000});
  mountAppearanceEditor(root,{auth,client,text,signal,onClose,onSave});
}

function mountAppearanceEditor(root,{auth,client,text,signal,onClose,onSave}) {
  const heading = document.createElement('h2');
  heading.textContent = text('Оформление профиля','Profile appearance');
  const notice = document.createElement('p');
  notice.className = 'page-help';
  notice.setAttribute('role','status');
  const content = document.createElement('div');
  heading.id = 'profile-appearance-title';
  heading.tabIndex = -1;
  const bar = document.createElement('header');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'button';
  close.textContent = text('Закрыть панель','Close editor');
  close.addEventListener('click',onClose,{once:true});
  bar.append(heading,close);
  root.replaceChildren(bar,notice,content);
  heading.focus({preventScroll:true});

  let preview;
  let ownRequest;
  let revision;
  const headers = {Accept:'application/json'};
  const request = {credentials:'include',cache:'no-store',signal,headers};
  const layerNames = {
    avatar:text('Рамка аватара','Avatar frame'),banner:text('Эффект шапки','Header effect'),
    cards:text('Контуры плашек','Panel outlines'),entry:text('Появление','Entrance'),
  };

  function clear() {
    ownRequest?.abort();
    preview?.destroy();
    content.replaceChildren();
  }

  signal.addEventListener('abort',clear,{once:true});

  const button = (label, action)=>{
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'button';
    control.textContent = label;
    control.addEventListener('click',action,{once:true});
    return control;
  };
  const originalLabel = text('Без эффекта','No effect');

  async function load(message) {
    clear();
    notice.textContent = message || text('Загружаем оформление…','Loading appearance…');
    try {
      const current = await client.requestJson(APPEARANCE_URL,request);
      if (signal.aborted) return;
      if (!Number.isInteger(current.revision) || current.revision < 0) throw Error('appearance_revision');
      revision = current.revision;
      render(current,message);
    } catch (error) {
      if (signal.aborted) return;
      notice.textContent = error.status === 401 ? text('Войдите через Steam снова','Sign in with Steam again')
        : text('Настройки оформления недоступны','Appearance settings unavailable');
      if (error.status !== 401) content.append(button(text('Повторить','Retry'),()=>void load()));
    }
  }

  function render(current,message) {
    const doc = root.ownerDocument;
    const sample = doc.createElement('div');
    sample.className = 'profile-appearance-preview';
    sample.innerHTML = `<div class="panel profile-hero">
      <div class="profile-identity"><div class="profile-portrait"><span>ASG</span><b></b></div>
      <div class="profile-heading"><h3></h3></div></div></div>
      <div class="panel profile-appearance-example"><div class="profile-stat-grid"><span></span></div></div>`;
    sample.querySelector('h3').textContent = auth.driver.displayName;
    const number = auth.preferences?.raceNumber;
    const numberBadge = sample.querySelector('.profile-portrait b');
    if (Number.isInteger(number)) numberBadge.textContent = '#'+number;
    else numberBadge.remove();
    sample.querySelector('.profile-stat-grid span').textContent = text('Статистика пилота','Driver statistics');
    if (auth.steam?.avatarUrl) {
      const image = doc.createElement('img');
      image.alt = '';
      image.addEventListener('error',()=>image.remove(),{once:true});
      image.src = auth.steam.avatarUrl;
      sample.querySelector('.profile-portrait span').replaceWith(image);
    }

    appendBadge(sample.querySelector('h3'),current.tier);
    content.append(sample);
    const editable = current.can_edit === true && ['vip','pro','admin'].includes(current.tier) && auth.csrfToken;
    if (!editable) {
      notice.textContent = message || (current.tier === 'supporter'
        ? text('Значок Supporter отображается в профиле.','The Supporter badge appears on your profile.')
        : text('Эффекты доступны с VIP, PRO или статусом ADMIN.','Effects are available with VIP, PRO or ADMIN.'));
      return;
    }

    notice.textContent = message || '';
    preview = createProfileEffect(sample);
    const form = doc.createElement('form');
    form.className = 'profile-appearance-form';
    form.innerHTML = `<label class="control-field" data-header-label><select name="header"></select></label><label class="control-field" data-effect-label><select name="preset"></select></label>
      <label class="control-field"><span data-energy-label></span><input type="range" name="energy" min="80" max="140"><output></output></label>
      <fieldset><legend></legend><div data-effect-layers></div></fieldset>
      <label class="project-support-consent"><input name="paused" type="checkbox"><span data-static-label></span></label>
      <div class="control-actions"><button type="button" class="button" data-replay></button>
      <button type="submit" class="button primary" data-save></button></div>`;
    const {header,preset,energy,paused} = form.elements;
    form.querySelector('[data-header-label]').prepend(text('Шапка профиля','Profile header'));
    header.add(new Option(text('Старая шапка','Classic header'),'classic'));
    header.add(new Option(text('Новая шапка','New header'),'modern'));
    header.value = current.effect?.header === 'modern' ? 'modern' : 'classic';
    const editableHeader=current.paddock_version===1;
    if(!editableHeader){
      header.disabled=true;
      header.closest('label').hidden=true;
    }
    const output = form.querySelector('output');
    const save = form.querySelector('[data-save]');
    const replay = form.querySelector('[data-replay]');
    form.querySelector('[data-effect-label]').prepend(text('Эффект','Effect'));
    form.querySelector('[data-energy-label]').textContent = text('Насыщенность','Intensity');
    form.querySelector('legend').textContent = text('Слои оформления','Effect layers');
    form.querySelector('[data-static-label]').textContent = text('Статичный режим','Static appearance');
    save.textContent = text('Сохранить оформление','Save appearance');
    replay.textContent = text('Повторить появление','Replay entrance');
    for (const [id,label] of Object.entries(PRESETS)) preset.add(new Option(label ?? originalLabel,id));
    const settings = normalizeEffect(current.effect);
    const layers = {};
    for (const name of LAYERS) {
      const label = doc.createElement('label');
      const toggle = doc.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = settings.layers[name];
      label.className = 'project-support-consent';
      label.append(toggle,layerNames[name]);
      form.querySelector('[data-effect-layers]').append(label);
      layers[name] = toggle;
    }

    preset.value = settings.preset;
    energy.value = settings.energy;
    paused.checked = settings.paused;
    content.prepend(form);

    function read() {
      return normalizeEffect({preset:preset.value,energy:Number(energy.value),paused:paused.checked,
        layers:Object.fromEntries(LAYERS.map(name=>[name,layers[name].checked]))});
    }

    function refreshPreview(event) {
      const value = read();
      sample.querySelector('.profile-hero').dataset.profileHeader = header.value;
      output.value = value.energy+'%';
      replay.disabled = value.preset === 'original' || value.paused || !value.layers.entry;
      void preview.update(value,{enter:event?.target === preset});
    }

    form.addEventListener('input',refreshPreview);
    replay.addEventListener('click',()=>preview.replay());
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if (save.disabled) return;
      save.disabled = true;
      ownRequest = new AbortController();
      const writeSignal = AbortSignal.any([signal,ownRequest.signal]);
      try {
        const response = await client.requestJson(APPEARANCE_URL,{
          ...request,signal:writeSignal,method:'POST',
          headers:{...headers,'Content-Type':'application/json','X-CSRF-Token':auth.csrfToken},
          body:JSON.stringify({expected_revision:revision,effect:{...read(),...(editableHeader?{header:header.value}:{})}}),
        });
        if (writeSignal.aborted) return;
        if (!Number.isInteger(response.revision) || response.revision <= revision) throw Error('appearance_revision');
        revision = response.revision;
        onSave?.();
        notice.textContent = text('Оформление сохранено.','Appearance saved.');
      } catch (error) {
        if (writeSignal.aborted) return;
        if (error.status === 403 || error.status === 409) {
          const message = error.status === 403
            ? text('Доступ изменился. Настройки обновлены.','Access changed. Settings were refreshed.')
            : text('Настройки изменились в другом окне. Загружена последняя версия.','Settings changed in another window. The latest version was loaded.');
          await load(message);
          return;
        }
        notice.textContent = text('Не удалось сохранить оформление.','Could not save appearance.');
      } finally {
        save.disabled = false;
      }
    });
    refreshPreview();
  }

  void load();
}

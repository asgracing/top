const page = document.querySelector('[data-faq-page]');
const dock = document.querySelector('[data-faq-dock]');

function openHashQuestion() {
  const target = document.getElementById(location.hash.slice(1));
  if (target?.matches('details.faq-question')) target.open = true;
}

if (page || dock) {
  let open;
  let loading = false;
  for (const trigger of document.querySelectorAll('[data-faq-open]')) {
    const inDock = dock?.contains(trigger);
    const error = (inDock ? dock : page).querySelector('[data-faq-launch-error]');
    if (!inDock) trigger.hidden = false;
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.addEventListener('click', async () => {
      if (loading) return;
      loading = true;
      error.hidden = true;
      trigger.setAttribute('aria-busy', 'true');
      try {
        if (!open) {
          const {createChat} = await import('./assistant.js?v=20261119faq1');
          open = createChat();
        }
        open(trigger);
      } catch {
        if (!inDock) trigger.after(error);
        error.hidden = false;
      } finally {
        trigger.removeAttribute('aria-busy');
        loading = false;
      }
    });
  }
}

if (dock) {
  const trigger = dock.querySelector('[data-faq-open]');
  const hide = dock.querySelector('[data-faq-hide]');
  const restore = dock.querySelector('[data-faq-restore]');
  const key = 'asgFaqDockHidden';
  const show = hidden => {
    trigger.hidden = hide.hidden = hidden;
    restore.hidden = !hidden;
  };
  let hidden = false;
  try { hidden = localStorage.getItem(key) === '1'; } catch {}
  show(hidden);
  dock.hidden = false;
  for (const button of [hide, restore]) {
    button.addEventListener('click', () => {
      const hideIcon = button === hide;
      show(hideIcon);
      dock.querySelector('[data-faq-launch-error]').hidden = true;
      try { localStorage.setItem(key, hideIcon ? '1' : '0'); } catch {}
      (hideIcon ? restore : trigger).focus({preventScroll: true});
    });
  }
}

if (page) {
  openHashQuestion();
  window.addEventListener('hashchange', openHashQuestion);
}

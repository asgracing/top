const page = document.querySelector('[data-faq-page]');

function openHashQuestion() {
  const target = document.getElementById(location.hash.slice(1));
  if (target?.matches('details.faq-question')) target.open = true;
}

if (page) {
  const error = page.querySelector('[data-faq-launch-error]');
  let open;
  let loading = false;
  for (const trigger of page.querySelectorAll('[data-faq-open]')) {
    trigger.hidden = false;
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
        trigger.after(error);
        error.hidden = false;
      } finally {
        trigger.removeAttribute('aria-busy');
        loading = false;
      }
    });
  }
  openHashQuestion();
  window.addEventListener('hashchange', openHashQuestion);
}

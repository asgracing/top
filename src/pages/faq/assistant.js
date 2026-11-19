const labels = {
  ru: {
    title: 'Помощник ASG Racing', close: 'Закрыть чат', switch: 'Язык помощника',
    intro: 'Спросите про серверы, допуск или ближайшую гонку.',
    input: 'Ваш вопрос', send: 'Отправить', waiting: 'Ищу ответ…',
    error: 'Ответ временно недоступен. Попробуйте ещё раз или напишите в сообщество.',
    suggestions: ['Как найти серверы ASG Racing?', 'Почему игра просит Alpine GT4?', 'Как повысить ASG SR?'],
    telegram: 'Сообщество Telegram', discord: 'Сообщество Discord', bot: 'Бот в Telegram', discordBot: 'Бот в Discord',
  },
  en: {
    title: 'ASG Racing assistant', close: 'Close chat', switch: 'Assistant language',
    intro: 'Ask about servers, entry requirements or the next race.',
    input: 'Your question', send: 'Send', waiting: 'Looking for an answer…',
    error: 'Could not get an answer. Please try again or ask the community.',
    suggestions: ['How do I find the ASG Racing servers?', 'Why does the game ask for an Alpine GT4?', 'How do I improve my ASG SR?'],
    telegram: 'Telegram community', discord: 'Discord community', bot: 'Telegram bot', discordBot: 'Discord bot',
  },
};

const siteLanguage = document.documentElement.lang === 'en' ? 'en' : 'ru';
const community = {
  telegram: 'https://t.me/+JUymrENgddcyMTdi',
  discord: 'https://discord.gg/cEPFHXXtTC',
  bot: 'https://t.me/asg_racing_assistant_bot',
  discordBot: 'https://discord.com/channels/1000721957978910740/1000721958595465287',
};

export function createChat() {
  const dialog = document.createElement('dialog');
  dialog.className = 'faq-chat';
  dialog.setAttribute('aria-labelledby', 'faq-assistant-title');
  dialog.innerHTML = `
    <header class="faq-chat-head">
      <img src="/src/pages/faq/assistant-avatar.jpg" width="35" height="35" alt="">
      <h2 id="faq-assistant-title"></h2>
      <div class="faq-chat-locale" role="group">
        <button type="button" data-language="ru" lang="ru" aria-label="Русский">RU</button>
        <button type="button" data-language="en" lang="en" aria-label="English">EN</button>
      </div>
      <button type="button" class="faq-chat-close">×</button>
    </header>
    <div class="faq-chat-body">
      <p class="faq-chat-intro"></p>
      <div class="faq-chat-suggestions"></div>
      <div class="faq-chat-messages" role="log" aria-live="polite" aria-relevant="additions"></div>
      <p class="faq-chat-status" role="status"></p>
    </div>
    <div class="faq-chat-compose">
      <form class="faq-chat-form">
        <input name="question" type="text" maxlength="350" required autocomplete="off" autofocus>
        <button class="faq-primary" type="submit"></button>
      </form>
      <div class="faq-chat-links">${Object.entries(community).map(([key, href]) =>
        `<a href="${href}" data-community="${key}" target="_blank" rel="noopener"></a>`).join('')}</div>
    </div>`;
  document.body.append(dialog);

  const find = selector => dialog.querySelector(selector);
  const close = find('.faq-chat-close');
  const body = find('.faq-chat-body');
  const log = find('.faq-chat-messages');
  const status = find('.faq-chat-status');
  const suggestions = find('.faq-chat-suggestions');
  const input = find('[name="question"]');
  const send = find('[type="submit"]');
  const localeButtons = dialog.querySelectorAll('[data-language]');
  const visualViewport = window.visualViewport;
  let language = siteLanguage;
  let launcher;
  let pending;

  function setLanguage(next) {
    if (next !== language && pending) {
      input.value = pending.question;
      pending.bubble.remove();
      pending.controller.abort();
      pending = undefined;
      setBusy(false);
    }
    language = next;
    dialog.lang = next;
    const copy = labels[next];
    find('h2').textContent = copy.title;
    find('.faq-chat-intro').textContent = copy.intro;
    find('.faq-chat-locale').setAttribute('aria-label', copy.switch);
    close.setAttribute('aria-label', copy.close);
    input.setAttribute('aria-label', copy.input);
    input.placeholder = copy.input;
    send.textContent = copy.send;
    for (const button of localeButtons) button.setAttribute('aria-pressed', String(button.dataset.language === next));
    for (const link of dialog.querySelectorAll('[data-community]')) link.textContent = copy[link.dataset.community] + ' ↗';
    suggestions.replaceChildren(...copy.suggestions.map(question => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = question;
      button.disabled = Boolean(pending);
      button.addEventListener('click', () => ask(question));
      return button;
    }));
  }

  function setBusy(busy) {
    send.disabled = busy;
    input.readOnly = busy;
    for (const button of suggestions.children) button.disabled = busy;
    status.textContent = busy ? labels[language].waiting : '';
  }

  function appendMessage(text, isUser, actions = []) {
    const message = document.createElement('div');
    message.className = 'faq-chat-message' + (isUser ? ' is-user' : '');
    message.lang = language;
    message.textContent = text;
    for (const action of actions) {
      if (typeof action?.label !== 'string' || typeof action.href !== 'string') continue;
      const internal = /^\/(?:en\/)?(?:servers\/|hourly\/|reports\/|#worst-safety)$/.test(action.href);
      if (!internal && !Object.values(community).includes(action.href)) continue;
      const link = document.createElement('a');
      link.href = action.href;
      link.textContent = action.label + ' ↗';
      if (!internal) {
        link.target = '_blank';
        link.rel = 'noopener';
      }
      message.append(link);
    }
    log.append(message);
    return message;
  }

  async function ask(value) {
    const question = value.trim();
    if (pending || !question || question.length > 350) return;
    input.value = '';
    const bubble = appendMessage(question, true);
    const controller = new AbortController();
    pending = {question, bubble, controller};
    setBusy(true);
    body.scrollTop = body.scrollHeight;
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('/api/assistant/ask', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({question, lang: language}), signal: controller.signal,
      });
      if (!response.ok) throw new Error('Assistant response unavailable');
      const reply = await response.json();
      if (pending?.controller !== controller) return;
      if (typeof reply.text !== 'string' || !reply.text || !Array.isArray(reply.actions)) throw new Error('Invalid assistant response');
      appendMessage(reply.text, false, reply.actions);
    } catch {
      if (pending?.controller !== controller) return;
      bubble.remove();
      input.value = question;
      appendMessage(labels[language].error, false);
    } finally {
      clearTimeout(timer);
      if (pending?.controller === controller) {
        pending = undefined;
        setBusy(false);
        body.scrollTop = body.scrollHeight;
      }
    }
  }

  function fitViewport() {
    if (!visualViewport) return;
    dialog.style.setProperty('--faq-chat-viewport', visualViewport.height + 'px');
    dialog.style.setProperty('--faq-chat-bottom', Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop) + 'px');
  }

  for (const button of localeButtons) button.addEventListener('click', () => setLanguage(button.dataset.language));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    visualViewport?.removeEventListener('resize', fitViewport);
    visualViewport?.removeEventListener('scroll', fitViewport);
    launcher?.focus({preventScroll: true});
  });
  find('form').addEventListener('submit', event => {
    event.preventDefault();
    void ask(input.value);
  });
  setLanguage(siteLanguage);
  return trigger => {
    launcher = trigger;
    fitViewport();
    dialog.showModal();
    visualViewport?.addEventListener('resize', fitViewport);
    visualViewport?.addEventListener('scroll', fitViewport);
  };
}

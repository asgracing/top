import {escape, nodes, setAttribute} from './seo/html-source.mjs';
import {pageHasSidebarWidgets} from '../v2/page-layout.js';

const communities = {
  telegram: 'https://t.me/+JUymrENgddcyMTdi',
  discord: 'https://discord.gg/cEPFHXXtTC',
};

const labels = {
  ru: {
    title: 'Частые вопросы', intro: 'Как подключиться к серверу, разобраться с допуском и найти помощь в ASG Racing.',
    ask: 'Спросить помощника', askTitle: 'Остались вопросы?', askIntro: 'Задайте вопрос помощнику ASG или напишите в сообщество.',
    telegram: 'Вступить в Telegram', discord: 'Перейти в Discord', telegramHint: 'Анонсы, напоминания и голосования',
    discordHint: 'Общение, помощь и предложения', bannerTitle: 'Есть вопросы о серверах ASG?',
    bannerText: 'Подключение, Alpine GT4, SR и SA — короткие ответы в одном месте.', open: 'Открыть FAQ',
    serverHint: 'Не пускает на сервер? Проверьте допуск в FAQ',
    launchError: 'Не удалось открыть чат. Попробуйте ещё раз или напишите в сообщество.',
    hide: 'Скрыть иконку помощника', restore: 'Показать иконку помощника',
  },
  en: {
    title: 'Frequently asked questions', intro: 'Find out how to join a server, check entry requirements and get help from ASG Racing.',
    ask: 'Ask the assistant', askTitle: 'Still have a question?', askIntro: 'Ask the ASG assistant or reach out to the community.',
    telegram: 'Join Telegram', discord: 'Join Discord', telegramHint: 'Announcements, reminders and voting',
    discordHint: 'Chat, get help and suggest ideas', bannerTitle: 'Questions about ASG servers?',
    bannerText: 'Quick answers on joining, Alpine GT4, SR and SA.', open: 'Open the FAQ',
    serverHint: 'Can’t join a server? Check entry requirements in the FAQ',
    launchError: 'Could not open the chat. Please try again or ask the community.',
    hide: 'Hide assistant icon', restore: 'Show assistant icon',
  },
};

function communityLinks(copy) {
  return Object.entries(communities).map(([id, href]) => `<a class="faq-community-link" href="${href}" target="_blank" rel="noopener">
    <img src="/v2/assets/${id}.svg" width="21" height="21" alt=""><span><strong>${copy[id]}</strong><small>${copy[id+'Hint']}</small></span>
    <span aria-hidden="true">↗</span>
  </a>`).join('');
}

export function faqPromo(language) {
  const copy = labels[language];
  return `<a class="faq-promo" href="/faq/">
    <span class="faq-promo-mark" aria-hidden="true">FAQ</span>
    <span class="faq-promo-copy"><strong>${copy.bannerTitle}</strong><span>${copy.bannerText}</span></span>
    <span class="faq-promo-action">${copy.open} <span aria-hidden="true">↗</span></span>
  </a>`;
}

function faqMarkup(language, {groups, questions}) {
  const copy = labels[language];
  return `<article class="faq-page" data-faq-page>
    <header class="panel faq-hero">
      <span class="faq-kicker">ASG Racing / FAQ</span>
      <h1>${copy.title}</h1><p>${copy.intro}</p>
      <button class="faq-primary" type="button" data-faq-open hidden>${copy.ask} <span aria-hidden="true">↗</span></button>
      <p data-faq-launch-error role="status" hidden>${copy.launchError}</p>
      <div class="faq-community-links">${communityLinks(copy)}</div>
    </header>
    <nav class="faq-topics" aria-label="${copy.title}">
      ${groups.map(group => `<a href="#${group.id}">${escape(group.title[language])}</a>`).join('')}
    </nav>
    ${groups.map(group => `<section class="faq-group" id="${group.id}" aria-labelledby="${group.id}-title">
      <h2 id="${group.id}-title">${escape(group.title[language])}</h2>
      ${questions.filter(item => item.group === group.id).map(item => {
        const answer = item[language];
        const href = communities[item.link] || (item.link ? '/' + item.link : '');
        return `<details class="faq-question" id="${item.id}">
          <summary>${escape(answer.question)}</summary><div class="faq-answer"><p>${escape(answer.answer)}</p>
          ${href ? `<a href="${escape(href)}"${communities[item.link] ? ' target="_blank" rel="noopener"' : ''}>${escape(answer.action)} <span aria-hidden="true">↗</span></a>` : ''}</div>
        </details>`;
      }).join('')}
    </section>`).join('')}
    <section class="panel faq-next">
      <h2>${copy.askTitle}</h2><p>${copy.askIntro}</p>
      <button class="faq-primary" type="button" data-faq-open hidden>${copy.ask} <span aria-hidden="true">↗</span></button>
      <div class="faq-community-links">${communityLinks(copy)}</div>
    </section>
  </article>`;
}

export function addFaqToShell(html, language, screen, content) {
  const copy = labels[language];
  const nav = '<a href="/faq/" data-faq-nav'+(screen === 'faq' ? ' aria-current="page"' : '')+'>FAQ</a>';
  const dock = `<div class="faq-dock" data-faq-dock hidden>
    <button class="faq-dock-open" type="button" data-faq-open title="${copy.ask}" aria-label="${copy.ask}" hidden>
      <img src="/src/pages/faq/assistant-avatar.jpg" width="36" height="36" alt="">
    </button>
    <button class="faq-dock-toggle" type="button" data-faq-hide title="${copy.hide}" aria-label="${copy.hide}">×</button>
    <button class="faq-dock-toggle" type="button" data-faq-restore title="${copy.restore}" aria-label="${copy.restore}" hidden>‹</button>
    <p class="faq-dock-error" data-faq-launch-error role="status" hidden>${copy.launchError}</p>
  </div>`;
  html = html.replace('<!-- faq-nav -->', nav).replace('<!-- faq-dock -->', pageHasSidebarWidgets(screen) ? dock : '');
  if (screen === 'home') return html
    .replace('<!-- faq-about -->', faqPromo(language))
    .replace('<!-- faq-welcome -->', `<a class="faq-welcome-link" href="/faq/">${copy.title} <span aria-hidden="true">↗</span></a>`);
  if (['about', 'instructions', 'servers'].includes(screen)) {
    const context = screen === 'about' ? faqPromo(language) : `<a class="faq-context-link" href="/faq/#connection">${copy.serverHint} <span aria-hidden="true">↗</span></a>`;
    return html.replace('<!-- faq-context -->', `<div data-faq-context>${context}</div>`);
  }
  if (screen !== 'faq') return html;
  const center = nodes(html).find(node => node.attrs.class === 'center-column');
  if (!center) throw new Error('Missing FAQ main column');
  const main = setAttribute(setAttribute(html.slice(center.start, center.openEnd), 'role', 'main'), 'aria-label', copy.title);
  return html.slice(0, center.start) + main + '<div id="page-view">' + faqMarkup(language, content) + '</div>' +
    '<div id="home-view" hidden inert>' + html.slice(center.openEnd, center.close) + '</div>' + html.slice(center.close);
}

export function addClassicFaqNavigation(html, href) {
  const tree = nodes(html);
  const label = tree.find(node => node.attrs['data-i18n'] === 'navGroupCommunity');
  if (!label) return html;
  const menu = tree.find(node => node.start < label.start && node.end > label.end &&
    node.attrs.class?.split(/\s+/).includes('top-nav-group'));
  if (!menu) return html;
  const target = tree.find(node => node.start > menu.start && node.end < menu.end &&
    node.attrs.class?.split(/\s+/).includes('top-nav-group-menu'));
  if (!target) return html;
  const link = `<a class="top-nav-group-link" href="${href}">FAQ</a>`;
  return html.slice(0, target.openEnd) + link + html.slice(target.openEnd);
}

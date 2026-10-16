import {COMMUNITY_SECTIONS,RACING_SECTIONS,PENALTY_SECTIONS,PENALTY_NOTES,COPYRIGHT,SUBMISSION_FIELDS,RULE_LINKS,RULES_VERSION} from './rules-content.js?v=20261016rules1';

const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const mounted = new WeakMap();
const COPY = {
  ru:{title:'Правила сообщества и гонок',intro:'Уважение к участникам. Предсказуемость на трассе. Чистая борьба.',
    racing:'На трассе',penalties:'Штрафы',community:'Сообщество',appeals:'Репорты и протесты',
    racingLead:'Регламент закрытых гонок · 03.10.2026',communityLead:'Общение и участие в сообществе ASG Racing',
    penaltiesLead:'Нарушение, последствия и соответствующее наказание — в одном месте.',
    code:'Пункт',violation:'Нарушение',sanction:'Наказание',reference:'Подробнее в Discord',notes:'Дополнения к штрафной сетке',
    report:'Подать репорт',protest:'Подать протест',reportIntro:'Укажите участников, точный момент и доказательства. Используйте шаблон при подаче репорта в Discord.',
    protestIntro:'Если вы не согласны с наказанием, изложите обстоятельства и приложите доказательства по этому шаблону.',
    template:'Шаблон обращения',copy:'Скопировать шаблон',copied:'Шаблон скопирован.',copyFailed:'Не удалось скопировать автоматически. Выделите текст шаблона и скопируйте его вручную.',
    reportChannel:'Канал репортов',strikeChannel:'Канал страйков',bans:'Баны и страйки на сайте',
    templateHint:'Это шаблон для копирования. Обращение подаётся в Discord, сайт его не отправляет.',
    penaltiesKey:'Обозначения',dt:'Проезд через питлейн',sg:'Остановка в боксах на 30 секунд',dsq:'Дисквалификация',strike:'Страйк',ban:'Блокировка',
    overlapTitle:'Где начинается база соперника',overlapCaption:'База начинается от оси заднего колеса. До поворота передний бампер атакующего должен войти в эту зону; при перекрытии обоим пилотам необходимо оставлять место.',
    ahead:'Впереди идущий',attacking:'Атакующий',axle:'Ось заднего колеса',zone:'База соперника',
    copyright:'© 2026 ASG Racing. Все права защищены.',original:'Официальный текст — на русском языке.',
  },
  en:{title:'Community and racing rules',intro:'Respect for participants. Predictable driving. Clean racing.',
    racing:'On track',penalties:'Penalties',community:'Community',appeals:'Reports & appeals',
    racingLead:'Closed-race regulations · 03 Oct 2026',communityLead:'Communication and participation in the ASG Racing community',
    penaltiesLead:'Violations, consequences and the applicable penalties in one place.',
    code:'Rule',violation:'Violation',sanction:'Penalty',reference:'Read more on Discord',notes:'Additional penalty provisions',
    report:'Submit a report',protest:'Submit an appeal',reportIntro:'Identify the participants, exact moment and evidence. Use the template when reporting an incident on Discord.',
    protestIntro:'If you disagree with a penalty, explain the circumstances and provide evidence using this template.',
    template:'Submission template',copy:'Copy template',copied:'Template copied.',copyFailed:'Automatic copying failed. Select the template text and copy it manually.',
    reportChannel:'Report channel',strikeChannel:'Strike channel',bans:'Bans and strikes on the website',
    templateHint:'This is a copyable template. Submit it on Discord; the website does not send it.',
    penaltiesKey:'Abbreviations',dt:'Drive through the pit lane',sg:'30-second stop-and-go',dsq:'Disqualification',strike:'Strike',ban:'Ban',
    overlapTitle:'Where overlap begins',overlapCaption:'The overlap zone begins at the rear axle. Before turn-in, the attacker’s front bumper must enter this zone; with overlap, both drivers must leave space.',
    ahead:'Car ahead',attacking:'Attacker',axle:'Rear axle',zone:'Overlap zone',
    copyright:'© 2026 ASG Racing. All rights reserved.',original:'The Russian text is the official version. English is a translation.',
  },
};
export function submissionTemplate(kind, language='ru') {
  const lang = language === 'en' ? 'en' : 'ru';
  if (!Object.hasOwn(SUBMISSION_FIELDS,kind)) throw new Error('Unknown submission template');
  return SUBMISSION_FIELDS[kind].map((field,index) => `${index+1}. ${field[lang]}`).join('\n');
}
function external(url, text) { return `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(text)} <span aria-hidden="true">↗</span></a>`; }
function sectionHtml(section,lang,copy,table=false) {
  const targets={'2.1':'penalties-contact','2.2':'penalties-rejoin','2.4':'penalties-contact'};
  const rows = section.items.map(row => table
    ? `<tr><td class="asg-rule-code">${escape(row.code)}</td><td>${escape(row.text[lang])}</td><td>${targets[row.code]?`<a data-rules-jump="${targets[row.code]}" href="#asg-rules-${targets[row.code]}">${escape(row.penalty[lang])} ↓</a>`:`<span class="asg-rule-penalty">${escape(row.penalty[lang])}</span>`}</td></tr>`
    : `<li><span class="asg-rule-code">${escape(row.code)}</span><div>${escape(row.text[lang])}${row.reference?`<small>${external(RULE_LINKS[row.reference],copy.reference)}</small>`:''}</div></li>`).join('');
  return `<section class="asg-rule-section" id="asg-rules-${escape(section.id)}"><header><h3>${escape(section.title[lang])}</h3>${section.reference?external(RULE_LINKS[section.reference],copy.reference):''}</header>${table
    ? `<table><caption class="asg-rules-sr">${escape(section.title[lang])}</caption><thead><tr><th scope="col">${copy.code}</th><th scope="col">${copy.violation}</th><th scope="col">${copy.sanction}</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<ol class="asg-rule-list">${rows}</ol>`}</section>`;
}
function overlapFigure(c) {
  return `<figure class="asg-rules-diagram"><h3>${c.overlapTitle}</h3><svg viewBox="0 0 720 260" role="img" aria-label="${escape(c.overlapCaption)}"><rect x="8" y="8" width="704" height="244" rx="12" fill="#101f2c"/><path d="M24 30H696M24 230H696" stroke="#e4edf5" stroke-width="4"/><path d="M24 130H696" stroke="#638096" stroke-dasharray="14 14"/><path d="M330 30H578V128H330Z" fill="#44d6b1" fill-opacity=".12"/><path d="M330 35V220" stroke="#44d6b1" stroke-width="2" stroke-dasharray="7 5"/><g fill="#243f54" stroke="#a9c3d8" stroke-width="2"><rect x="284" y="56" width="294" height="64" rx="19"/><rect x="372" y="64" width="88" height="48" rx="8"/><path d="M330 49V127M525 49V127"/></g><g fill="#573040" stroke="#ff6c89" stroke-width="2"><rect x="72" y="145" width="300" height="64" rx="19"/><rect x="165" y="153" width="88" height="48" rx="8"/></g><path d="M620 89H668M654 76L668 89L654 102" fill="none" stroke="#e4edf5" stroke-width="3"/><text x="290" y="49" fill="#dce8f2" font-size="14">${escape(c.ahead)}</text><text x="80" y="140" fill="#ff9eb0" font-size="14">${escape(c.attacking)}</text><text x="345" y="245" fill="#7ce8cc" font-size="13">${escape(c.axle)}</text><text x="395" y="29" fill="#7ce8cc" font-size="13">${escape(c.zone)}</text></svg><figcaption>${escape(c.overlapCaption)}</figcaption></figure>`;
}
function submissionCard(kind,lang,c) {
  const title = c[kind];
  return `<section class="asg-rule-section asg-rule-submission"><header><h3>${title}</h3><span class="asg-rules-type">${kind==='report'?'REPORT':'APPEAL'}</span></header><p>${c[kind+'Intro']}</p><label><span class="asg-rules-sr">${c.template}: ${title}</span><textarea readonly rows="${SUBMISSION_FIELDS[kind].length+1}" spellcheck="false" data-rules-template="${kind}">${escape(submissionTemplate(kind,lang))}</textarea></label><div class="asg-rules-actions"><button type="button" data-rules-copy="${kind}">${c.copy}</button>${kind==='report'?external(RULE_LINKS.report,c.reportChannel):external(RULE_LINKS.strikes,c.strikeChannel)}</div><p class="asg-rules-copy-status" data-rules-copy-status="${kind}" role="status" aria-live="polite"></p></section>`;
}
export function renderRules(language='ru') {
  const lang = language === 'en' ? 'en' : 'ru', c = COPY[lang];
  const titles = ['racing','penalties','community','appeals'];
  const panel = (id,html) => `<section id="asg-rules-panel-${id}" role="tabpanel" aria-labelledby="asg-rules-tab-${id}" tabindex="0"${id==='racing'?'':' hidden'}>${html}</section>`;
  return `<article class="asg-rules" lang="${lang}"><header class="asg-rules-hero"><p class="asg-rules-eyebrow">ASG RACING / RULEBOOK</p><h2>${c.title}</h2><p>${c.intro}</p><div class="asg-rules-edition"><span>16.10.2026</span><span>${c.original}</span></div></header><nav class="asg-rules-tabs" role="tablist" aria-label="${c.title}">${titles.map((id,i)=>`<button type="button" id="asg-rules-tab-${id}" role="tab" data-rules-tab="${id}" aria-controls="asg-rules-panel-${id}" aria-selected="${i===0}" tabindex="${i===0?'0':'-1'}"><span aria-hidden="true">0${i+1}</span>${c[id]}</button>`).join('')}</nav>
  ${panel('racing',`<p class="asg-rules-lead">${c.racingLead}</p><nav class="asg-rules-index" aria-label="${c.racing}">${RACING_SECTIONS.map(s=>`<a href="#asg-rules-${s.id}" data-rules-jump="${s.id}">${escape(s.title[lang])} ↓</a>`).join('')}</nav>${RACING_SECTIONS.map(s=>sectionHtml(s,lang,c)).join('')}${overlapFigure(c)}`)}
  ${panel('penalties',`<p class="asg-rules-lead">${c.penaltiesLead}</p><dl class="asg-rules-key">${[['DT',c.dt],['SG30',c.sg],['DSQ',c.dsq],['STRIKE',c.strike],['BAN',c.ban]].map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl>${PENALTY_SECTIONS.map(s=>sectionHtml(s,lang,c,true)).join('')}<aside class="asg-rules-note"><h3>${c.notes}</h3><ul>${PENALTY_NOTES.map(note=>`<li>${escape(note[lang])}</li>`).join('')}</ul></aside>`)}
  ${panel('community',`<p class="asg-rules-lead">${c.communityLead}</p>${COMMUNITY_SECTIONS.map(s=>sectionHtml(s,lang,c)).join('')}`)}
  ${panel('appeals',`<p class="asg-rules-note">${c.templateHint}</p>${submissionCard('report',lang,c)}${submissionCard('protest',lang,c)}<p class="asg-rules-related"><a href="${lang==='en'?'/en/bans/':'/bans/'}">${c.bans} ↗</a></p>`)}
  <footer class="asg-rules-copyright"><strong>${c.copyright}</strong><p>${escape(COPYRIGHT[lang])}</p></footer></article>`;
}
export function mountRules(host, language='ru') {
  mounted.get(host)?.();
  const lang = language === 'en' ? 'en' : 'ru', c = COPY[lang];
  if (!document.querySelector('link[data-asg-rules-style]')) {
    const style = document.createElement('link');
    style.rel='stylesheet'; style.href=`/styles/components/racing-rules.css?v=${RULES_VERSION}`;
    style.dataset.asgRulesStyle='true'; document.head.append(style);
  }
  host.innerHTML = renderRules(lang);
  const controller = new AbortController(), options={signal:controller.signal};
  const tabs=[...host.querySelectorAll('[data-rules-tab]')];
  function select(tab,focus=false) {
    for (const button of tabs) {
      const active=button===tab;
      button.setAttribute('aria-selected',String(active)); button.tabIndex=active?0:-1;
      host.querySelector('#'+button.getAttribute('aria-controls')).hidden=!active;
    }
    if(focus)tab.focus();
  }
  for (const tab of tabs) {
    tab.addEventListener('click',()=>select(tab),options);
    tab.addEventListener('keydown',event=>{
      const index=tabs.indexOf(tab);
      const target={ArrowRight:(index+1)%tabs.length,ArrowLeft:(index+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[event.key];
      if(target!==undefined){event.preventDefault();select(tabs[target],true);}
    },options);
  }
  host.addEventListener('click',async event=>{
    const jump=event.target.closest('[data-rules-jump]');
    if(jump&&host.contains(jump)){
      event.preventDefault();
      host.querySelector('#asg-rules-'+jump.dataset.rulesJump)?.scrollIntoView({block:'start'});
      return;
    }
    const button=event.target.closest('[data-rules-copy]');
    if(!button||!host.contains(button)||button.disabled)return;
    const kind=button.dataset.rulesCopy, status=host.querySelector(`[data-rules-copy-status="${kind}"]`);
    button.disabled=true;
    try { await navigator.clipboard.writeText(submissionTemplate(kind,lang)); if(!controller.signal.aborted)status.textContent=c.copied; }
    catch { if(!controller.signal.aborted){status.textContent=c.copyFailed;host.querySelector(`[data-rules-template="${kind}"]`).select();} }
    finally { if(!controller.signal.aborted)button.disabled=false; }
  },options);
  const cleanup=()=>controller.abort();
  mounted.set(host,cleanup);
  return cleanup;
}

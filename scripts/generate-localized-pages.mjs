import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import vm from "node:vm";
import { pages } from "./seo/pages.mjs";
import { nodes, edit, escape, setAttribute } from "./seo/html-source.mjs";

const root = resolve(import.meta.dirname, "..");
const check = process.argv.includes("--check");
const outputRoot = process.argv.includes("--output-dir") ? resolve(process.argv[process.argv.indexOf("--output-dir") + 1]) : root;
const origin = "https://asgracing.ru";
const cleanPath = path => path.replace(/index\.html$/, "");
const localizedPath = (path, lang) => `/${lang === "ru" ? `ru/${cleanPath(path)}` : cleanPath(path)}`;
const urlFor = (path, lang) => `${origin}${localizedPath(path, lang)}`;
const outputPath = (path, lang) => lang === "ru" ? `ru/${path}` : path;
const legacyRuPath = path => path.replace(/index\.html$/, "index.ru.html");
const allPaths = [...pages.map(p => p.path), "join/index.html", "about/index.html"];
const runtimeCompatibilityPaths = [
  "driver/index.html",
  "cars/index.html",
  "races/index.html",
  "fun-stats/index.html",
  "news/index.html",
  "bans/index.html"
];
const translations = new Map();
async function dictionary(path) {
  if (translations.has(path)) return translations.get(path);
  const source = await readFile(resolve(root, path), "utf8");
  const name = path.includes("catalog-page") ? "COPY" : "translations";
  const start = source.indexOf(`const ${name} = {`);
  const end = source.indexOf("\n};", start) + 3;
  if (start < 0 || end < 3) throw new Error(`Dictionary missing: ${path}`);
  const additions = [...source.matchAll(new RegExp(`Object\\.assign\\(${name}\\.(?:ru|en), \\{[\\s\\S]*?\\n\\}\\);`, "g"))].map(m => m[0]);
  const context = Object.create(null);
  vm.runInNewContext(`${source.slice(start, end)}\n${additions.join("\n")}\nresult = ${name};`, context, { timeout: 1000 });
  translations.set(path, context.result);
  return context.result;
}
function localLink(href, path, lang) {
  if (lang !== "ru") return href;
  if (href.startsWith("#") || !href || /^(?:mailto:|tel:|javascript:)/i.test(href)) return href;
  const url = new URL(href.replaceAll("&amp;", "&"), urlFor(path, "en"));
  if (url.origin !== origin) return href;
  const match = allPaths.find(p => new URL(urlFor(p, "en")).pathname === url.pathname || `/${p}` === url.pathname);
  if (match) return localizedPath(match, lang) + url.search + url.hash;
  // RU documents live one directory deeper. Root-absolute local links keep
  // non-localized pages and assets at their real production locations.
  return url.pathname + url.search + url.hash;
}
function localResource(value, path) {
  if (!value || /^(?:data:|blob:|mailto:|tel:|javascript:|#)/i.test(value)) return value;
  const url = new URL(value.replaceAll("&amp;", "&"), urlFor(path, "en"));
  return url.origin === origin ? url.pathname + url.search + url.hash : value;
}
function translate(html, page, lang, copy) {
  const changes = [], covered = [];
  for (const node of nodes(html)) {
    if (covered.some(([a, b]) => node.start >= a && node.start < b)) continue;
    let tag = html.slice(node.start, node.openEnd);
    const a = node.attrs;
    if (node.name === "html") { tag = setAttribute(tag, "lang", lang); tag = setAttribute(tag, "data-page-language", lang); }
    if (node.name === "a" && a.href) {
      const href = localLink(a.href, page.path, lang);
      if (href !== a.href) tag = setAttribute(tag, "href", href);
    }
    if (lang === "ru") {
      if (["img", "script", "source", "video", "audio"].includes(node.name) && a.src) tag = setAttribute(tag, "src", localResource(a.src, page.path));
      if (node.name === "link" && a.href) tag = setAttribute(tag, "href", localResource(a.href, page.path));
      if (node.name === "form" && a.action) tag = setAttribute(tag, "action", localResource(a.action, page.path));
      if (node.name === "meta" && a.name === "legal-base-path" && a.content) tag = setAttribute(tag, "content", localResource(a.content, page.path));
      if (a["data-bg-options"]) tag = setAttribute(tag, "data-bg-options", a["data-bg-options"].split("|").map(value => localResource(value, page.path)).join("|"));
    }
    for (const [marker, attribute] of [["data-i18n-aria-label", "aria-label"], ["data-i18n-placeholder", "placeholder"], ["data-clubs-copy-placeholder", "placeholder"]]) {
      if (a[marker] && typeof copy[a[marker]] === "string") tag = setAttribute(tag, attribute, copy[a[marker]]);
    }
    if ((a.class || "").split(/\s+/).includes("lang-btn") && a["data-lang"]) {
      tag = tag.replace(/^<button/, "<a").replace(/\s(?:type|aria-pressed|aria-current)="[^"]*"/g, "");
      const selected = a["data-lang"];
      tag = setAttribute(tag, "href", localizedPath(page.path, selected));
      tag = setAttribute(tag, "hreflang", selected);
      tag = setAttribute(tag, "class", `lang-btn${selected === lang ? " active" : ""}`);
      if (selected === lang) tag = setAttribute(tag, "aria-current", "page");
      let inner = html.slice(node.openEnd, node.close);
      if (lang === "ru") inner = inner.replace(/\bsrc="([^"]+)"/g, (_match, value) => `src="${localResource(value, page.path)}"`);
      changes.push({ start: node.start, end: node.end, value: tag + inner + "</a>" });
      covered.push([node.start, node.end]); continue;
    }
    if (tag !== html.slice(node.start, node.openEnd)) changes.push({ start: node.start, end: node.openEnd, value: tag });
    const key = a["data-i18n"] || a["data-clubs-copy"];
    if (key && typeof copy[key] === "string" && node.close > node.openEnd) {
      const value = page.dictionary === "app.js" ? copy[key] : escape(copy[key]);
      changes.push({ start: node.openEnd, end: node.close, value });
      covered.push([node.openEnd, node.close]);
    }
  }
  return edit(html, changes);
}
function metadata(html, page, lang) {
  const content = page[lang], url = urlFor(page.path, lang);
  html = html.replace(/\s*<!-- seo-head:start -->[\s\S]*?<!-- seo-head:end -->/g, "");
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(content.title)}</title>`);
  const values = { description: content.description, "og:title": content.title, "og:description": content.description, "og:url": url, "og:locale": lang === "ru" ? "ru_RU" : "en_US", "og:site_name": "ASG Racing", "twitter:title": content.title, "twitter:description": content.description };
  const changes = [], found = new Set();
  for (const node of nodes(html)) {
    const key = node.attrs.name || node.attrs.property;
    if (node.name === "meta" && key in values) { found.add(key); changes.push({ start: node.start, end: node.openEnd, value: setAttribute(html.slice(node.start, node.openEnd), "content", values[key]) }); }
    if (node.name === "link" && node.attrs.rel === "canonical") { found.add("canonical"); changes.push({ start: node.start, end: node.openEnd, value: setAttribute(html.slice(node.start, node.openEnd), "href", url) }); }
  }
  html = edit(html, changes);
  const extra = Object.entries(values).filter(([k]) => !found.has(k)).map(([k, v]) => `<meta ${k.startsWith("og:") ? "property" : "name"}="${k}" content="${escape(v)}">`);
  extra.push('<link rel="stylesheet" href="/styles/components/seo-content.css?v=20260919seo3">');
  if (!found.has("canonical")) extra.push(`<link rel="canonical" href="${url}">`);
  for (const alternate of ["en", "ru-RU", "x-default"]) extra.push(`<link rel="alternate" hreflang="${alternate}" href="${urlFor(page.path, alternate === "ru-RU" ? "ru" : "en")}">`);
  if (page.key === "home") extra.push(`<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": [{ "@type": "WebSite", "@id": `${origin}/#website`, name: "ASG Racing", url: `${origin}/`, inLanguage: ["en", "ru"] }, { "@type": "Organization", "@id": `${origin}/#organization`, name: "ASG Racing", url: `${origin}/` }] })}</script>`);
  return html.replace("</head>", `  <!-- seo-head:start -->\n  ${extra.join("\n  ")}\n  <!-- seo-head:end -->\n</head>`);
}
function intro(page, lang) {
  const c = page[lang], ru = lang === "ru";
  const heading = ["hourly", "championship"].includes(page.key) ? "h1" : "h2";
  return `\n<!-- seo-intro:start -->\n<section class="seo-intro" aria-labelledby="seo-intro-title">\n  <${heading} id="seo-intro-title">${escape(c.heading)}</${heading}>\n  <p>${escape(c.text)}</p>\n  <nav aria-label="${ru ? "Участие в ASG Racing" : "Take part in ASG Racing"}"><a href="${new URL(urlFor("join/index.html", lang)).pathname}">${ru ? "Как участвовать" : "How to join"}</a> · <a href="${new URL(urlFor("about/index.html", lang)).pathname}">${ru ? "О сообществе" : "About the community"}</a></nav>\n</section>\n<!-- seo-intro:end -->\n`;
}
async function output(path, content) {
  content = content.replace(/[\t ]+$/gm, "");
  const file = resolve(outputRoot, path);
  let existing; try { existing = (await readFile(file, "utf8")).replaceAll("\r\n", "\n"); } catch {}
  if (existing === content) return;
  if (check) throw new Error(`Localized HTML is stale: ${path}. Run npm run generate:seo`);
  await mkdir(dirname(file), { recursive: true }); await writeFile(file, content);
  console.log(`Generated ${path}`);
}
for (const page of pages) {
  let source = (await readFile(resolve(root, page.path), "utf8")).replaceAll("\r\n", "\n");
  source = source.replace(/\s*<!-- seo-intro:start -->[\s\S]*?<!-- seo-intro:end -->\s*/g, "\n");
  source = source.replace(/(<main\b[^>]*>)\s*/, "$1\n");
  if (page.key === "home") source = source.replace(/(<div class="container">)\s*/, "$1\n");
  if (page.key === "home") source = source.replace(/\s*(<section class="section combined-stats-shell")/, "\n$1");
  // The event title remains live; the page heading must also exist before data loads.
  if (page.key === "hourly") source = source.replace(/<h1([^>]*id="hourly-upcoming-v2-title"[^>]*)>(.*?)<\/h1>/s, "<h2$1>$2</h2>");
  if (page.key === "championship") source = source.replace(/<h1([^>]*id="championship-title"[^>]*)>(.*?)<\/h1>/s, "<h2$1>$2</h2>");
  const dict = await dictionary(page.dictionary);
  for (const lang of ["en", "ru"]) {
    let html = translate(source, page, lang, dict[lang]);
    if (page.key === "championship") {
      const values = { "championship-title": lang === "ru" ? "Чемпионат" : "Championship", "championship-status": lang === "ru" ? "Чемпионат" : "Championship", "championship-description": lang === "ru" ? "Загружаем текущий чемпионат…" : "Loading the current championship…" };
      html = edit(html, nodes(html).filter(n => n.attrs.id in values).map(n => ({ start: n.openEnd, end: n.close, value: values[n.attrs.id] })));
    }
    html = metadata(html, page, lang);
    const afterId = { home: "combined-stats-shell", hourly: "recent-races", championship: "championship-race-results-section" }[page.key];
    if (afterId) {
      const anchor = nodes(html).find(node => node.attrs.id === afterId);
      if (!anchor) throw new Error(`SEO placement target missing: ${afterId}`);
      html = html.slice(0, anchor.end) + intro(page, lang) + html.slice(anchor.end).replace(/^\s*/, "\n");
    } else {
      html = html.replace(/<main\b[^>]*>/, match => match + intro(page, lang));
    }
    await output(outputPath(page.path, lang), html);
  }
}

const guideCopy = {
  join: {
    en: { title: "How to Join ACC Races | ASG Racing", heading: "Your first race with ASG Racing", description: "Learn how to join ASG Racing in Assetto Corsa Competizione: find a server, check event requirements and get ready for your first race.", text: "Start with a public server or choose a scheduled event. Check the requirements for your chosen race before joining.", sections: [["Choose your race", "Open the schedule and check the track, eligible cars, start time with its time zone and race format. Make sure you have the required game content for that track and car."], ["Find the server in ACC", "Open the Assetto Corsa Competizione multiplayer server browser and search for ASG Racing. For an organised event, follow the server and participation instructions shown in its details."], ["Read the rules and prepare", "Review the racing rules before starting. Check any entry requirements for the selected event, practise safely and respect other drivers. ASG Racing's own Safety Rating is distinct from the game's SA."], ["Stay involved", "Follow your results and explore clubs and teams. The community channels linked from the main page offer announcements and opportunities to talk with other drivers."]] },
    ru: { title: "Как участвовать в гонках ACC | ASG Racing", heading: "Ваша первая гонка с ASG Racing", description: "Как начать гонять с ASG Racing в Assetto Corsa Competizione: найти сервер, проверить условия события и подготовиться к первому старту.", text: "Начните с публичного сервера или выберите событие по расписанию. Перед стартом проверьте условия именно вашей гонки.", sections: [["Выберите гонку", "Откройте расписание и проверьте трассу, допустимые машины, время старта с часовым поясом и формат. Убедитесь, что у вас есть необходимый игровой контент для выбранных трассы и машины."], ["Найдите сервер в ACC", "Откройте список сетевых серверов Assetto Corsa Competizione и найдите ASG Racing. Для организованного события следуйте указаниям о сервере и участии в его карточке."], ["Изучите правила и подготовьтесь", "Перед стартом ознакомьтесь с гоночными правилами и требованиями допуска выбранного события. Тренируйтесь безопасно и уважайте других пилотов. Собственный Safety Rating ASG Racing отличается от внутриигрового SA."], ["Оставайтесь в сообществе", "Следите за результатами, знакомьтесь с клубами и командами. В каналах сообщества, ссылки на которые есть на главной, можно следить за анонсами и общаться с другими пилотами."]] }
  },
  about: {
    en: { title: "About the ACC Community | ASG Racing", heading: "ASG Racing: an ACC racing community", description: "Discover ASG Racing: an Assetto Corsa Competizione community with public servers, organised races, championships, clubs, teams and driver statistics.", text: "ASG Racing connects drivers through racing and shared progress in Assetto Corsa Competizione.", sections: [["Races and championships", "Public servers offer a place to drive with others. Scheduled events and championships bring drivers together around specific race formats. The event pages provide the current conditions for participation."], ["Clubs and teams", "The portal brings together different clubs and teams with their own profiles, rosters and results. ASG Racing is the wider community; each team has its own identity and membership arrangements."], ["Results and progress", "Driver results and standings help participants follow their progress. Race history, best laps and safety information provide context beyond a single finish."], ["Communication", "Visit the main page for the community's Telegram, Discord and media links. Share race experiences, follow announcements and meet other drivers."]] },
    ru: { title: "О сообществе ACC | ASG Racing", heading: "ASG Racing — гоночное сообщество ACC", description: "ASG Racing — сообщество Assetto Corsa Competizione: публичные серверы, организованные гонки, чемпионаты, клубы, команды и статистика пилотов.", text: "ASG Racing объединяет пилотов вокруг гонок и совместного развития в Assetto Corsa Competizione.", sections: [["Гонки и чемпионаты", "Публичные серверы позволяют гонять вместе с другими участниками. События по расписанию и чемпионаты объединяют пилотов вокруг определённых гоночных форматов. Актуальные условия участия указаны на страницах событий."], ["Клубы и команды", "Портал объединяет разные клубы и команды с собственными профилями, составами и результатами. ASG Racing — общее сообщество, а у каждой команды свои участники и условия вступления."], ["Результаты и развитие", "Результаты пилотов и рейтинги помогают следить за прогрессом. История гонок, лучшие круги и показатели безопасности дополняют итог отдельного финиша."], ["Общение", "На главной собраны ссылки на Telegram, Discord и медиаканалы сообщества. Делитесь впечатлениями от гонок, следите за анонсами и знакомьтесь с другими пилотами."]] }
  }
};
for (const [key, versions] of Object.entries(guideCopy)) {
  const page = { path: `${key}/index.html`, key, ...versions };
  for (const lang of ["en", "ru"]) {
    const c = page[lang], ru = lang === "ru";
    const links = [["index.html", "ASG Racing"], ["hourly/index.html", ru ? "Расписание" : "Race schedule"], ["teams/index.html", ru ? "Клубы и команды" : "Clubs & teams"], ["join/index.html", ru ? "Как участвовать" : "How to join"], ["about/index.html", ru ? "О сообществе" : "About"]];
    let html = `<!DOCTYPE html>\n<html lang="${lang}" data-page-language="${lang}">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escape(c.title)}</title>\n<link rel="icon" href="/favicon.ico">\n<link rel="stylesheet" href="/styles/tokens.css">\n<link rel="stylesheet" href="/styles/base.css?v=20260917seo1">\n</head>\n<body>\n<main class="seo-guide">\n<nav aria-label="${ru ? "Навигация" : "Navigation"}">${links.map(([p, text]) => `<a href="${new URL(urlFor(p, lang)).pathname}">${text}</a>`).join(" · ")}</nav>\n<nav aria-label="Language">${["en", "ru"].map(l => `<a class="lang-btn" data-lang="${l}" href="${new URL(urlFor(page.path, l)).pathname}" hreflang="${l}"${lang === l ? ' aria-current="page"' : ""}>${l === "ru" ? "Русский" : "English"}</a>`).join(" · ")}</nav>\n<h1>${escape(c.heading)}</h1>\n<p>${escape(c.text)}</p>\n${c.sections.map(([h, p]) => `<section><h2>${escape(h)}</h2><p>${escape(p)}</p></section>`).join("\n")}\n<p><a href="${new URL(urlFor("hourly/index.html", lang)).pathname}">${ru ? "Выбрать гонку" : "Find your next race"}</a> · <a href="${new URL(urlFor("index.html", lang)).pathname}#rules">${ru ? "Гоночные правила" : "Racing rules"}</a></p>\n</main>\n<script type="module">import { initializeLocalizedPage } from "/src/shared/localized-page.js?v=20260919seo3"; initializeLocalizedPage();</script>\n</body>\n</html>\n`;
    html = metadata(html, page, lang);
    await output(outputPath(page.path, lang), html);
  }
}
for (const path of allPaths) {
  const target = urlFor(path, "ru");
  const targetPath = new URL(target).pathname;
  const legacy = `<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Страница перемещена | ASG Racing</title>\n<meta name="robots" content="noindex, follow">\n<link rel="canonical" href="${target}">\n<meta http-equiv="refresh" content="0; url=${targetPath}">\n<script>location.replace(${JSON.stringify(targetPath)} + location.search + location.hash);</script>\n</head>\n<body><p><a href="${targetPath}">Страница перемещена</a></p></body>\n</html>\n`;
  await output(legacyRuPath(path), legacy);
}
for (const path of runtimeCompatibilityPaths) {
  const targetPath = `/${cleanPath(path)}`;
  const redirect = `<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Переход на страницу | ASG Racing</title>\n<meta name="robots" content="noindex, follow">\n<link rel="canonical" href="${origin}${targetPath}">\n<meta http-equiv="refresh" content="0; url=${targetPath}?lang=ru">\n<script>const target=new URL(${JSON.stringify(targetPath)},location.origin);const params=new URLSearchParams(location.search);params.set("lang","ru");target.search=params;target.hash=location.hash;location.replace(target);</script>\n</head>\n<body><p><a href="${targetPath}?lang=ru">Перейти на страницу</a></p></body>\n</html>\n`;
  await output(`ru/${path}`, redirect);
}
const generatedPageCount = pages.length + 2;
const summary = `${generatedPageCount} pages + ${allPaths.length} compatibility redirects + ${runtimeCompatibilityPaths.length} runtime redirects`;
console.log(check ? `Localized HTML is current (${summary})` : `Localized HTML generated (${summary})`);

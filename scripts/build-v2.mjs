// Reproducible V2 presentation over the canonical site's existing controllers.
// Generated HTML/runtime files are not independent copies of business logic.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { nodes, edit } from './seo/html-source.mjs';
const root = resolve(import.meta.dirname, '..');
const version = '20261006v2i';
const read = path => readFile(resolve(root, path), 'utf8');
async function emit(path, value) { await mkdir(resolve(root, path, '..'), {recursive:true}); await writeFile(resolve(root, path), path.endsWith('.html')?value.replace(/[ \t]+(?=\r?$)/gm,''):value); }
const prototype = await read('v2-source/home.html');
const prototypeBody = prototype.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const ids = [...prototypeBody.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const prefix = source => source.replace(/\b(id|aria-labelledby|aria-controls)="([^"]+)"/g, (_, attr, id) => `${attr}="${id.split(' ').map(v=>ids.includes(v)?`v2-${v}`:v).join(' ')}"`).replace(/href="#([^"]+)"/g,(_,id)=>`href="#v2-${id}"`);
const absoluteSourceLinks = source => source.replace(/\b(href|src)="([^"]+)"/g, (match, attr, value) => {
  if (/^(?:[a-z]+:|\/|#)/i.test(value)) return match;
  return `${attr}="${new URL(value,'https://asgracing.ru/').pathname}${new URL(value,'https://asgracing.ru/').search}"`;
});
let body = prefix(prototypeBody);
body = body.replace(/<button\b[^>]*id="v2-profile-trigger"[\s\S]*?<\/button>/, '')
  .replace(/<button\b[^>]*id="v2-notification-trigger"[\s\S]*?<\/button>/, '')
  .replace('class="header-actions"', 'class="header-actions top-nav-actions"')
  .replace('class="header"', 'class="header" id="top-nav"')
  .replace(/<span class="snapshot-label">[\s\S]*?<\/span><\/span>/, '<span class="snapshot-label">ASG Racing · V2</span>')
  .replace('data-modal="cookies"', 'data-cookie-settings');
body = body.replace(/(src|href)="assets\/([^"]+)"/g,(_,attr,path)=>`${attr}="/v2/assets/${path}"`);
body=body.replace('<span id="v2-page-number">01</span>','<span class="pagination-pages" id="v2-page-links"></span>')
  .replace(/<span class="scroll-hint" data-copy="scrollHint">[^<]*<\/span>/,'<form id="v2-page-jump" class="page-jump"><label><span data-copy="page">Страница</span><input id="v2-page-input" type="number" min="1" step="1" inputmode="numeric" required><span id="v2-page-total"></span></label><button type="submit" data-copy="go">Перейти</button></form>');
// There is no fixture winner before the first successful live read.
body = body.replace('src="/v2/assets/21.png"', 'hidden');
body = body.replace('href="championships/"','href="/hourly/championship/"')
  .replace('href="cars/"','href="/cars/"').replace('href="fun-stats/"','href="/fun-stats/"')
  .replace('href="about/"','href="/about/"').replace('href="instructions/"','href="/join/"').replace('href="documents/"','href="/privacy/"');
body = body.replace('data-route="championships/"','data-route="hourly/championship/"');
// Frozen R24 presentation inputs, independent of research fixtures.
const copy = JSON.parse(await read('v2-source/copy.json'));
await emit('v2/copy.js',`export default ${JSON.stringify(copy)};\n`);
{
  let css = await read('v2-source/design.css');
  for (const id of [...ids].sort((a,b)=>b.length-a.length)) css = css.replace(new RegExp(`#${id}(?![\\w-])`, 'g'),`#v2-${id}`);
  css = css.replace(/url\((['"]?)assets\//g,'url($1/assets/');
  await emit('v2/styles/design.css',css);
}
let runtime = await read('app.js');
const originalHash = createHash('sha256').update(runtime.replace(/\r\n/g,'\n')).digest('hex');
function required(from,to) { if(!runtime.includes(from)) throw Error(`V2 runtime hook missing: ${from.slice(0,90)}`); runtime=runtime.replace(from,to); }
runtime = runtime.replace(/(["'])\.\/(src\/|news-read-state\.js)/g,'$1/$2');
required('initializeLocalizedPage();','// V2 has explicit static RU/EN entrypoints; do not reroute them through V1.');
required('const SITE_BASE_PATH = PAGE_CONTEXT.siteBasePath;', 'const SITE_BASE_PATH = "/";');
required('new URL(`./assets/${fileName}`, import.meta.url)', 'new URL(`/assets/${fileName}`, location.origin)');
required('function setupTopHomeDeferredSections() {','function setupTopHomeDeferredSections() { Object.keys(topHomeDeferredSections).forEach(key=>topHomeDeferredSections[key]=true);');
required('function ensureTopGuide() {','function ensureTopGuide() { return; // The V2 guide owns its visible targets.');
required('function ensureTwitchWidget() {','function ensureTwitchWidget() { return; // V2 owns the stream launcher.');
required('function optimizeBackgroundMedia() {','function optimizeBackgroundMedia() { return; // V2 owns its static track carousel.');
const hooks=['renderHourlyHeroCard','renderHourlyWinnerCard','renderDonationAlertsWidget','renderOnlineWidget','renderLeaderboardTablePage','renderSafetyTablePage','renderBestLapsTablePage','renderClubsTeamsHomeTable','renderServerStickyWidget','updateAuthenticatedDriver','handleHomePageInitializationError'];
hooks.push('renderNewsBell','renderNewsNotificationsModal');
for (const name of hooks) {
  const re = new RegExp(`function ${name}\\([^\\n]*\\) \\{`);
  if(!re.test(runtime)) throw Error(`Missing V2 notification hook ${name}`);
  runtime = runtime.replace(re,match=>`${match}\n  v2SchedulePublish();`);
}
runtime=runtime.replace('function updateAuthenticatedDriver(auth) {','function updateAuthenticatedDriver(auth) { v2Auth=auth;');
// V2 owns table rendering and pagination. Hidden legacy tables must not start
// deferred full-table downloads or duplicate visible controls.
for(const name of ['renderLeaderboardTablePage','renderBestLapsTablePage','renderSafetyTablePage','renderClubsTeamsHomeTable']) {
  runtime=runtime.replace(new RegExp(`(function ${name}\\([^\\n]*\\) \\{\\n  v2SchedulePublish\\(\\);)`),'$1\n  return; // V2 renders this read model.');
}
// Retain the existing actions, with the shared Hourly token client used by the
// current Hourly page. Legacy browser identity is migrated by that client.
required('const requestJson = async (url, options = {}) => {', `const requestJson = async (url, options = {}) => {
  const parsed = new URL(url, location.href);
  if (parsed.origin === 'https://data.asgracing.ru' && parsed.pathname.startsWith('/hourly-votes-api/')) {
    const action = parsed.pathname.split('/').pop();
    const response = action === 'votes' ? await v2Votes.load((parsed.searchParams.get('event_ids') || '').split(','))
      : action === 'vote' ? await v2Votes.vote(JSON.parse(options.body).event_id)
      : action === 'unvote' ? await v2Votes.unvote(JSON.parse(options.body).event_id) : null;
    if(response) { if(!response.ok) throw Error('HTTP '+response.status); return response.json(); }
  }`);
const votesImport=runtime.includes('import { createHourlyVotesClient }')?'':"import { createHourlyVotesClient } from '/src/shared/hourly-votes-client.js';\n";
runtime = `import { publish, installRuntime } from '/v2/bridge.js?v=${version}';\n${votesImport}${runtime}`;
const facade = await read('scripts/v2-runtime-facade.txt');
runtime += '\n'+facade.replaceAll('__VERSION__',version);
await emit('v2/runtime/home.js',runtime);
for (const language of ['ru','en']) {
  const classic = await read(language==='ru'?'ru/index.html':'index.html');
  let head = classic.match(/<head>([\s\S]*?)<\/head>/i)[1];
  head=absoluteSourceLinks(head);
  head=head.replace(/<meta name="robots"[^>]*>/,'<meta name="robots" content="noindex,follow">')
    .replace(/<link\b[^>]*rel="(?:canonical|alternate)"[^>]*>/g,'')
    .replace(/(<meta property="og:url" content=")[^"]+/,`$1https://asgracing.ru/v2/${language}/`)
    .replace(/(<link\b[^>]*rel="stylesheet"[^>]*href=")([^"?]+)([^"<>]*")([^>]*>)/g,(_,before,path,query)=>`<style>@import url("${new URL(path,'https://asgracing.ru/').pathname}${query.slice(0,-1)}") layer(v1Runtime);</style>`);
  head += `\n<link rel="stylesheet" href="/v2/styles/design.css?v=${version}">\n<link rel="stylesheet" href="/v2/home.css?v=${version}">\n<script>(()=>{try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!sessionStorage.getItem('asgV2IntroSeen'))document.documentElement.classList.add('home-booting')}catch{}setTimeout(()=>{document.documentElement.classList.remove('home-booting');const s=document.getElementById('v2-site-shell');if(s&&!document.querySelector('.is-open,dialog[open]'))s.inert=false},4500)})()</script>\n<script src="/legal.js?v=20260920locale1" defer></script>\n<script type="module" src="/v2/home.js?v=${version}"></script>\n`;
  // Preserve required legacy modal/controller nodes, outside the hidden source
  // host so real dialogs remain visible and accessible. No duplicate IDs.
  let oldBody = classic.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
  oldBody=oldBody.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  oldBody=absoluteSourceLinks(oldBody).replace(/<video\b[\s\S]*?<\/video>/gi,'');
  const modalNodes=nodes(oldBody).filter(n=>/(?:^|\s)modal-overlay(?:\s|$)/.test(n.attrs.class||''));
  const topModals=modalNodes.filter(n=>!modalNodes.some(parent=>parent!==n&&parent.start<n.start&&parent.end>n.end));
  const modals=topModals.map(n=>oldBody.slice(n.start,n.end)).join('\n');
  oldBody=edit(oldBody,topModals.map(n=>({start:n.start,end:n.end,value:''})));
  oldBody=oldBody.replace(/id="top-nav"/,'id="v1-source-nav"').replace(/class="top-nav-actions"/,'class="v1-source-actions"');
  // Searchable SEO content is static and visible before JavaScript/data loads.
  const seoNodes=nodes(classic).filter(n=>n.attrs.class?.split(' ').includes('seo-intro'));
  const seo=seoNodes.map(n=>classic.slice(n.start,n.end).replaceAll('seo-intro-title','v2-seo-intro-title')).join('');
  let pageBody=body.replace('<div class="panel seo-panel" id="v2-seo-content"></div>',`<section class="panel seo-panel" id="v2-seo-content">${seo}</section>`);
  const text=language==='ru'?'Текущая версия':'Classic version';
  pageBody=pageBody.replace('<div class="header-actions top-nav-actions">',`<div class="header-actions top-nav-actions"><a class="version-switch" data-v1-home href="${language==='ru'?'/ru/':'/'}">${text}</a>`);
  await emit(`v2/${language}/index.html`,`<!doctype html>\n<html lang="${language}" data-page="home" data-page-language="${language}" data-v2="home"><head>${head}</head><body data-v2="home">${pageBody}<div id="v1-runtime-host" hidden inert aria-hidden="true">${oldBody}</div>${modals}</body></html>\n`);
}
await emit('v2/index.html',`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><title>ASG Racing V2</title><script>let language='ru';try{if(localStorage.getItem('asgV2Language')==='en')language='en'}catch{}location.replace('/v2/'+language+'/'+location.search+location.hash)</script></head><body><a href="/v2/ru/">ASG Racing — русский</a> · <a href="/v2/en/">English</a></body></html>`);
await emit('v2/runtime-source.json',JSON.stringify({schemaVersion:1,version,source:'app.js',sha256:originalHash},null,2)+'\n');
console.log('Built V2 home RU/EN over canonical runtime; fixture datasets excluded.');

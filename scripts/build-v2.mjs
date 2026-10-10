// Reproducible V2 presentation over the canonical site's existing controllers.
// Generated HTML/runtime files are not independent copies of business logic.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import {compileInformation} from './v2-information-content.mjs';
import { nodes, edit } from './seo/html-source.mjs';
import {renderLocalizedPages} from './generate-localized-pages.mjs';
import {readV1Html} from './v1-source.mjs';
import {pageRegistry} from '../v2/page-registry.js';
import {readSiteRelease} from './site-release.mjs';
import {buildV2Boot} from './build-v2-boot.mjs';
const root = resolve(import.meta.dirname, '..');
const outputRoot = resolve(process.env.ASG_V2_OUTPUT_DIR || ((await readSiteRelease()).layout==='parallel'?root:resolve(root,'../tmp/site-v2-compilation')));
if (process.env.ASG_V2_PRESENTATION_ONLY === '1') throw Error('Presentation-only builds are retired: rebuild V2 with its canonical runtime.');
const version = '20261006v2k';
const runtimeVersion = '20261010profile1';
const presentationVersion = '20261010profile1';
const bootVersion = '20261010profile1';
const legalVersion = '20261008metrika2';
const buildInputs = new Map();
const hash = value => createHash('sha256').update(value.replace(/\r\n/g,'\n')).digest('hex');
const record = (path, value) => { buildInputs.set(path, hash(value)); return value; };
const read = async path => record(path, (await readFile(resolve(root, path), 'utf8')).replace(/\r\n/g,'\n'));
const readTemplate = async path => record('v1-source/html/'+path, await readV1Html(path));
const {outputs:classicPages} = await renderLocalizedPages({readHtml:readTemplate, readSource:read});
const readClassic = async path => classicPages.get(path) ?? readTemplate(path);
// A normal, immutable stylesheet is easier for replay tools to fetch than
// dozens of inline @import rules. Keep the original cascade layers and URLs.
async function replayCss(path, ancestors = []) {
  if (ancestors.includes(path)) throw Error('CSS import cycle: '+path);
  let css = await read(path);
  for (const match of [...css.matchAll(/@import\s+url\(["']([^"']+)["']\)\s*;/g)]) {
    const imported = new URL(match[1], 'https://asgracing.ru/'+path);
    if (imported.origin !== 'https://asgracing.ru') throw Error('External CSS import: '+path);
    css = css.replace(match[0], await replayCss(imported.pathname.slice(1), [...ancestors,path]));
  }
  return css.replace(/@charset\s+["'][^"']+["'];/gi,'').replace(/url\((["']?)([^)"']+)\1\)/g,(match,quote,value)=>{
    if (/^(?:data:|blob:|#)/i.test(value)) return match;
    return `url("${new URL(value,'https://asgracing.ru/'+path).href}")`;
  });
}
async function emit(path, value) {
  const target=resolve(outputRoot,path);
  const content=path.endsWith('.html')?value.replace(/[ \t]+(?=\r?$)/gm,''):value;
  try {if(await readFile(target,'utf8')===content)return;}catch(error){if(error.code!=='ENOENT')throw error;}
  await mkdir(resolve(target,'..'),{recursive:true});
  const temporary=target+'.asg-build-tmp';
  await writeFile(temporary,content);await rename(temporary,target);
}
for (const file of ['core.js','archive.js','championships.js','entities.js','cars.js','fun.js','bans.js','history.js','editorial.js','information.js','race-modal.js','pages.css','site-pages.css','r24-pages.css','control-pages.css']) await emit(`v2/pages/views/${file}`, await read(`v2-source/pages/${file}`));
await emit('v2/pages/information-content.js',`// Generated from maintained V1 HTML by scripts/build-v2.mjs.
export default ${JSON.stringify(await compileInformation(readClassic))};
`);
const prototype = await read('v2-source/home.html');
const prototypeBody = prototype.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const ids = [...prototypeBody.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const prefix = source => source.replace(/\b(id|aria-labelledby|aria-controls)="([^"]+)"/g, (_, attr, id) => `${attr}="${id.split(' ').map(v=>ids.includes(v)?`v2-${v}`:v).join(' ')}"`).replace(/href="#([^"]+)"/g,(_,id)=>`href="#v2-${id}"`);
const absoluteSourceLinks = source => source.replace(/\b(href|src)="([^"]+)"/g, (match, attr, value) => {
  if (/^(?:[a-z]+:|\/|#)/i.test(value)) return match;
  return `${attr}="${new URL(value,'https://asgracing.ru/').pathname}${new URL(value,'https://asgracing.ru/').search}"`;
});
const localizedV2Links = (source, language) => source.replace(/\bhref="([^"]+)"/g, (match, value) => {
  if (value.startsWith('#')) return match;
  const url = new URL(value.replaceAll('&amp;','&'), 'https://asgracing.ru/');
  if (url.origin !== 'https://asgracing.ru') return match;
  const route = url.pathname.replace(/^\/(?:ru\/)?/,'').replace(/index\.html$/,'');
  if (!pageRegistry.some(page=>page.route===route)) return match;
  return `href="/v2/${language}/${route}${url.search.replaceAll('&','&amp;')}${url.hash}"`;
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
body = body.replace('href="championships/"','href="/championships/"')
  .replace('href="cars/"','href="/cars/"').replace('href="fun-stats/"','href="/fun-stats/"')
  .replace('href="about/"','href="/about/"').replace('href="instructions/"','href="/join/"').replace('href="documents/"','href="/privacy/"');
// Frozen R24 presentation inputs, independent of research fixtures.
const copy = JSON.parse(await read('v2-source/copy.json'));
await emit('v2/copy.js',`export default ${JSON.stringify(copy)};\n`);
{
  let css = await read('v2-source/design.css');
  for (const id of [...ids].sort((a,b)=>b.length-a.length)) css = css.replace(new RegExp(`#${id}(?![\\w-])`, 'g'),`#v2-${id}`);
  css = css.replace(/url\((['"]?)assets\//g,'url($1/assets/');
  css = css.replaceAll('/assets/crown.png','/assets/v2-light/crown.webp').replaceAll('/assets/silverstone.jpg','/assets/v2-light/tracks/silverstone.webp').replaceAll('/assets/spa.jpg','/assets/v2-light/tracks/spa.webp');
  await emit('v2/styles/design.css',css);
}
{
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
for(const name of ['renderLeaderboardTablePage','renderBestLapsTablePage','renderSafetyTablePage','renderClubsTeamsHomeTable','renderHourlyWinnerCard','renderOnlineWidget','renderDonationAlertsWidget']) {
  runtime=runtime.replace(new RegExp(`(function ${name}\\([^\\n]*\\) \\{\\n  v2SchedulePublish\\(\\);)`),'$1\n  return; // V2 renders this read model.');
}
// Transport belongs to app.js/the shared client, not to the presentation facade.
for (const call of ['getHomeHourlyVotesClient().load(', 'getHomeHourlyVotesClient().vote(', 'getHomeHourlyVotesClient().unvote(']) {
  if (!runtime.includes(call)) throw Error('Canonical Hourly token transport missing: '+call);
}
runtime = `import { publish, installRuntime } from '/v2/bridge.js?v=${version}';\n${runtime}`;
const facade = await read('scripts/v2-runtime-facade.txt');
runtime += '\n'+facade.replaceAll('__VERSION__',version);
await emit('v2/runtime/home.js',runtime);
await emit('v2/runtime-source.json',JSON.stringify({schemaVersion:1,version:runtimeVersion,source:'app.js',sha256:originalHash,outputSha256:hash(runtime),facadeSha256:hash(facade)},null,2)+'\n');
}
for (const language of ['ru','en']) {
  const classic = await readClassic(language==='ru'?'ru/index.html':'index.html');
  let head = classic.match(/<head>([\s\S]*?)<\/head>/i)[1];
  head=absoluteSourceLinks(head);
  const runtimeStyles=[...head.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"?]+)[^"<>]*"[^>]*>/g)];
  const runtimeCss=(await Promise.all(runtimeStyles.map(async match=>`@layer v1Runtime {\n${await replayCss(match[1].replace(/^\//,''))}\n}`))).join('\n');
  const runtimeStylePath=`v2/styles/runtime-${hash(runtimeCss).slice(0,16)}.css`;
  await emit(runtimeStylePath,runtimeCss);
  for(const match of runtimeStyles)head=head.replace(match[0],'');
  head+=`\n<link rel="stylesheet" href="/${runtimeStylePath}">\n`;
  // Consent links must resolve from every V2 depth and language.
  head=head.replace(/(<meta name="legal-base-path" content=")[^"]+/,`$1/v2/${language}/`);
  // V1's banner fitting must not observe the hidden legacy markup in V2.
  head=head.replace(/<script\b[^>]*src="[^\"]*\/src\/features\/home-(?:ad|partner)-banner\.js[^\"]*"[^>]*><\/script>/g,'');
  head=head.replace(/<meta name="robots"[^>]*>/,'<meta name="robots" content="noindex,follow">')
    .replace(/<link\b[^>]*rel="(?:canonical|alternate)"[^>]*>/g,'')
    .replace(/(<meta property="og:url" content=")[^"]+/,`$1https://asgracing.ru/v2/${language}/`)
    ;
  head += `\n<link rel="stylesheet" href="/v2/styles/design.css?v=${presentationVersion}">\n<link rel="stylesheet" href="/v2/home.css?v=${presentationVersion}">\n<script src="/legal.js?v=${legalVersion}" defer></script>\n<script type="module" src="/v2/boot/home.js?v=${bootVersion}"></script>\n`;
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
  // Hidden legacy controllers need these nodes, not their eager image requests.
  oldBody=oldBody.replace(/<img\b[^>]*>/gi,tag=>tag.replace(/\b(src|srcset)=/gi,'data-runtime-$1=').replace(/\bfetchpriority="high"/gi,''));
  // Searchable SEO content is static and visible before JavaScript/data loads.
  const seoNodes=nodes(classic).filter(n=>n.attrs.class?.split(' ').includes('seo-intro'));
  const seo=seoNodes.map(n=>classic.slice(n.start,n.end).replaceAll('seo-intro-title','v2-seo-intro-title')).join('');
  let pageBody=localizedV2Links(body.replace('<div class="panel seo-panel" id="v2-seo-content"></div>',`<section class="panel seo-panel" id="v2-seo-content">${seo}</section>`),language);
  const text=language==='ru'?'Текущая версия':'Classic version';
  pageBody=pageBody.replace('<div class="header-actions top-nav-actions">',`<div class="header-actions top-nav-actions"><a class="version-switch" data-v1-home href="${language==='ru'?'/ru/':'/'}">${text}</a>`);
  await emit(`v2/${language}/index.html`,`<!doctype html>\n<html lang="${language}" data-page="home" data-page-language="${language}" data-v2="home"><head>${head}</head><body data-v2="home">${pageBody}<div id="v1-runtime-host" hidden inert aria-hidden="true">${oldBody}</div>${modals}</body></html>\n`);
  for (const config of pageRegistry.filter(page => page.route)) {
    const page=config.route.slice(0,-1), screen=config.screen;
    const title=config.title[language], description=config.description[language];
    const pageHead=head.replace(/<title>[\s\S]*?<\/title>/,`<title>${title} · ASG Racing</title>`).replace(/(<meta name="description" content=")[^"]+/,`$1${description}`).replace(/(<meta property="og:url" content=")[^"]+/,`$1https://asgracing.ru/v2/${language}/${page}/`) + `\n<link rel="stylesheet" href="/v2/pages/views/pages.css?v=${presentationVersion}">`+(['races','race','championships','hourly/championship','teams','clubs','teams/detail','cars','fun-stats','bans','hourly/championship/history','news','news/article','community','about','instructions','join','documents','documents/read','privacy','cookies','404'].includes(page)?`\n<link rel="stylesheet" href="/v2/pages/views/site-pages.css?v=${presentationVersion}">`:'')+`\n<link rel="stylesheet" href="/v2/pages/views/r24-pages.css?v=${presentationVersion}">`;
    const accountHead=['account','account/settings','moderation','portal-ops'].includes(page)?pageHead+`<link rel="stylesheet" href="/v2/pages/views/control-pages.css?v=${presentationVersion}"><link rel="stylesheet" href="/v2/pages/account.css?v=${presentationVersion}"><link rel="stylesheet" href="/v2/pages/control.css?v=${presentationVersion}">`:pageHead;
    const owningHead=page==='community'?pageHead+`<meta name="community-likes-api" content="${(await readClassic('community/index.html')).match(/<meta name="community-likes-api" content="([^"]+)"/)[1]}">`:accountHead;
    await emit(`v2/${language}/${page}/index.html`,`<!doctype html>\n<html lang="${language}" data-page="home" data-page-language="${language}" data-v2="home" data-v2-page="${screen}"><head>${owningHead}</head><body data-v2="page">${pageBody}<div id="v1-runtime-host" hidden inert aria-hidden="true">${oldBody}</div>${modals}</body></html>\n`);
  }
}
await emit('v2/index.html',`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><title>ASG Racing V2</title><script>let language='ru';try{if(localStorage.getItem('asgV2Language')==='en')language='en'}catch{}location.replace('/v2/'+language+'/'+location.search+location.hash)</script></head><body><a href="/v2/ru/">ASG Racing — русский</a> · <a href="/v2/en/">English</a></body></html>`);
// Canonical form structure, without V1 navigation/scripts or authentication bootstrap.
const controlMarkup = {};
for (const [screen,path] of [['moderation','moderation/index.html'],['ops','portal-ops/index.html']]) {
  const html=await readClassic(path);
  controlMarkup[screen]=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)[1];
}
await emit('v2/pages/control-content.js',`export default ${JSON.stringify(controlMarkup)};\n`);
await buildV2Boot({root,outputRoot,read,emit});
for (const path of ['scripts/build-v2.mjs','scripts/build-v2-boot.mjs','package.json','package-lock.json','scripts/generate-localized-pages.mjs','scripts/v1-source.mjs','scripts/seo/pages.mjs','scripts/seo/html-source.mjs','scripts/v2-information-content.mjs','v1-source/manifest.json','v2/page-registry.js']) await read(path);
await emit('v2/build-inputs.json',JSON.stringify({schemaVersion:1,runtimeVersion,inputs:[...buildInputs].sort(([a],[b])=>a.localeCompare(b)).map(([path,sha256])=>({path,sha256}))},null,2)+'\n');
console.log('Built complete V2 RU/EN over canonical runtime and maintained V1 inputs; fixture datasets excluded.');

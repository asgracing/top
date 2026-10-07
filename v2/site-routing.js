// Shared by the release V2 and its preserved V1 interface. No API/data URLs.
import {pageRegistry} from './page-registry.js?v=20261007release1';
export const migratedRoutes = new Set(pageRegistry.map(page=>page.route));
export const legacyRoutes = new Set(['','about/','join/','account/','account/settings/','bans/','cars/','clubs/','community/','cookies/','driver/','events/','fun-stats/','hourly/','hourly/championship/','hourly/championship/history/','hourly/privacy/','hourly/cookies/','moderation/','news/','portal-ops/','privacy/','races/','teams/','teams/detail/']);
export const excludedRoute = path=>/^(?:asg-lab\/|account\/asg-lab\/|portal-ops\/asg-lab\/|hourly\/team\/)/.test(path);
export function screenPath(value='') {
  return String(value).split(/[?#]/)[0].replace(/^\/+/, '').replace(/^(?:v2\/(?:ru|en)(?:\/|$)|old(?:\/en)?(?:\/|$)|(?:ru|en)(?:\/|$))/,'').replace(/index(?:\.ru)?\.html$/,'').replace(/([^/])$/,'$1/');
}
export function siteContext(locationRef=globalThis.location,documentRef=globalThis.document) {
  return {layout:documentRef?.documentElement?.dataset?.siteLayout==='root'||/^\/old(?:\/|$)/.test(locationRef?.pathname||'')?'root':'parallel',version:/^\/old(?:\/|$)/.test(locationRef?.pathname||'')?'old':'v2'};
}
export function routeHref(path='',language='ru',context=siteContext()) {
  const clean=screenPath(path),lang=language==='en'?'en':'ru';
  if(excludedRoute(clean))return '/'+clean;
  if(context.layout!=='root')return migratedRoutes.has(clean)?`/v2/${lang}/${clean}`:`${lang==='ru'?'/ru':''}/${clean}`;
  if(context.version==='old'&&legacyRoutes.has(clean))return `/old/${lang==='en'?'en/':''}${clean}`;
  if(migratedRoutes.has(clean))return `${lang==='en'?'/en':''}/${clean}`;
  return '/'+clean;
}
export function languageHref(language,locationRef=globalThis.location,context=siteContext(locationRef)) {
  const url=new URL(locationRef.href),path=screenPath(url.pathname);
  const mapped=routeHref(path,language,context);
  url.searchParams.delete('lang');
  return mapped+url.search+url.hash;
}
export function versionHref(version,locationRef=globalThis.location,language,context=siteContext(locationRef)) {
  const url=new URL(locationRef.href),path=screenPath(url.pathname);
  const lang=language||(/^(?:\/en\/|\/old\/en\/|\/v2\/en\/)/.test(url.pathname)?'en':'ru');
  if(context.layout!=='root')return (version==='old'?(lang==='ru'?'/ru/':'/'):`/v2/${lang}/`)+url.search+url.hash;
  if(version!=='old'){
    let current=path==='events/'?'hourly/championship/':path;
    if(path==='races/'&&url.searchParams.has('race_id')){current='race/';url.searchParams.set('id',url.searchParams.get('race_id'));url.searchParams.delete('race_id');}
    if(path==='news/'&&url.searchParams.has('slug')){current='news/article/';url.searchParams.set('id',url.searchParams.get('slug'));url.searchParams.delete('slug');}
    url.searchParams.delete('lang');
    return routeHref(current,lang,{layout:'root',version:'v2'})+url.search+url.hash;
  }
  let classic=path;
  if(!legacyRoutes.has(classic)){
    classic=({'instructions/':'join/','documents/':'privacy/','championships/':'hourly/championship/history/','race/':'races/','news/article/':'news/','404/':''})[path]??'';
    if(path==='documents/read/')classic=url.searchParams.get('id')==='cookies'?'cookies/':'privacy/';
    if(path==='race/'&&url.searchParams.has('id')){url.searchParams.set('race_id',url.searchParams.get('id'));url.searchParams.delete('id');}
    if(path==='news/article/'&&url.searchParams.has('id')){url.searchParams.set('slug',url.searchParams.get('id'));url.searchParams.delete('id');}
  }
  url.searchParams.delete('lang');
  return routeHref(classic,lang,{layout:'root',version:'old'})+url.search+url.hash;
}
export function canonicalEntityHref(locationRef=globalThis.location,language='ru',context=siteContext(locationRef)){
  if(context.layout!=='root'||context.version==='old')return null;
  const url=new URL(locationRef.href),path=screenPath(url.pathname);
  const key=path==='news/'?'slug':path==='races/'?'race_id':null;
  if(!key||!url.searchParams.get(key))return null;
  const target=path==='news/'?'news/article/':'race/';
  url.searchParams.set('id',url.searchParams.get(key));url.searchParams.delete(key);url.searchParams.delete('lang');
  return routeHref(target,language,context)+url.search+url.hash;
}
export function scopeSiteHref(href,language,locationRef=globalThis.location,context=siteContext(locationRef)) {
  if(!href||/^(?:#|mailto:|tel:|javascript:|data:|blob:)/i.test(href))return href;
  const url=new URL(href,locationRef.href);
  if(![locationRef.origin,'https://asgracing.ru'].includes(url.origin))return href;
  const path=screenPath(url.pathname);
  if(excludedRoute(path)){url.pathname='/'+path;url.searchParams.set('lang',language);return url.pathname+url.search+url.hash;}
  if(!migratedRoutes.has(path)&&!legacyRoutes.has(path))return href;
  if(context.layout!=='root')return href;
  url.searchParams.delete('lang');
  return routeHref(path,language,context)+url.search+url.hash;
}

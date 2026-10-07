// Migrated routes stay in V2; the remaining routes keep their working V1 entry.
import {migratedRoutes,routeHref,languageHref,screenPath} from './site-routing.js?v=20261007root1';
export const migratedPaths = migratedRoutes;
export function v2Route(path = '', language = 'ru') {
  return routeHref(path,language);
}
export function currentV2Path(language) {
  return languageHref(language);
}

// Keep existing affiliation resolution; migrate only its public entity links.
export function v2EntityLinks(markup,language) {
  return markup.replace(/href="([^"]+)"/g,(match,href)=>{
    const url=new URL(href.replaceAll('&amp;','&'),location.origin);
    if(![location.origin,'https://asgracing.ru'].includes(url.origin))return match;
    const path=screenPath(url.pathname);
    if(!['clubs/','teams/','teams/detail/'].includes(path))return match;
    url.searchParams.delete('lang');
    return `href="${v2Route(path,language)}${url.search.replaceAll('&','&amp;')}${url.hash}"`;
  });
}

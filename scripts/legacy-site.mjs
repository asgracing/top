import {versionHref} from '../v2/site-routing.js';
import {escape} from './seo/html-source.mjs';
export function disabledLegacyPage(path,language) {
 const origin='https://asgracing.ru',url=new URL(path,origin);
 const target=versionHref('v2',url,language,{layout:'root',version:'old'});
 const title=language==='ru'?'Открываем сайт ASG Racing':'Opening ASG Racing';
 return `<!doctype html><html lang="${language}" data-site-layout="root" data-site-version="old" data-legacy-disabled="true"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>${title}</title><script type="module" src="/v2/legacy-disabled.js?v=20261025raceinfo1"></script><noscript><meta http-equiv="refresh" content="0;url=${escape(target)}"></noscript></head><body><p><a data-v2-home href="${escape(target)}">${title}</a></p></body></html>`;
}

import {parseAsgTimestamp} from '../../src/shared/time.js';
import {sortPublishedNews} from '../../src/shared/news-feed-model.js';
import {safeImageUrl,safeLinkUrl} from '../../src/shared/safe-dom.js';

export function localizedEditorial(value, language, fallback='') {
  if(value&&typeof value==='object'&&!Array.isArray(value))return value[language]??value.en??value.ru??fallback;
  if(typeof value!=='string')return value??fallback;
  const parts=value.split(/\s+\/\s+/);
  return parts.length>1?(language==='ru'?parts[0]:parts.slice(1).join(' / ')):value;
}
function localizedField(item,key,language){return item?.[`${key}_${language}`]??localizedEditorial(item?.[key],language);}
export function editorialImage(value,base='https://asgracing.ru/news-content/news.json') {
  if(!safeImageUrl(value,base))return '';
  const url=new URL(value,base);
  return ['https://asgracing.ru','https://www.asgracing.ru'].includes(url.origin)?url.pathname+url.search+url.hash:url.href;
}
export function editorialHref(value,language,route) {
  if(!safeLinkUrl(value,'https://asgracing.ru/'))return null;
  const url=new URL(value,'https://asgracing.ru/');
  if(!['https://asgracing.ru','https://www.asgracing.ru'].includes(url.origin))return url.href;
  const path=url.pathname.replace(/^\/(?:ru\/)?/,'');
  url.searchParams.delete('lang');
  if(path==='news/'&&url.searchParams.has('slug'))return route('article',url.searchParams.get('slug'))+url.hash;
  return route(path?path.replace(/\/$/,''):'home')+url.search+url.hash;
}
export function prepareNews(payload,language,now=Date.now()) {
  const items=(Array.isArray(payload)?payload:payload?.items)||[];
  return sortPublishedNews(items.map(item=>{
    if(!item||typeof item!=='object')return null;
    const slug=String(item.slug||item.id||'').trim(),title=String(localizedField(item,'title',language)||'').trim();
    if(!slug||!title)return null;
    const bodySource=item[`body_${language}`]??(item.body&&!Array.isArray(item.body)&&typeof item.body==='object'?localizedEditorial(item.body,language):item.body);
    let locale=null;
    const body=[];
    const pick=value=>{const match=String(value).match(/^(RU|EN):\s*(.*)$/s);return match?(match[1].toLowerCase()===language?match[2]:''):value;};
    for(const block of Array.isArray(bodySource)?bodySource:typeof bodySource==='string'?[bodySource]:[]){
      if(typeof block==='string'&&/^(РУССКИЙ|ENGLISH)$/.test(block.trim())){locale=block.trim()==='РУССКИЙ'?'ru':'en';continue;}
      if(locale&&locale!==language)continue;
      if(typeof block==='string'){const value=pick(block);if(value&&!/^[─\-]+$/.test(value.trim()))body.push(value);}
      else if(block?.type==='list'&&Array.isArray(block.items))body.push({...block,items:block.items.map(pick).filter(Boolean)});
      else if(block?.type==='link')body.push({...block,label:localizedEditorial(block.label,language)});
    }
    return {...item,id:String(item.id||slug),slug,title,body,summary:String(localizedField(item,'summary',language)||body.find(b=>typeof b==='string')||''),
      published_at:item.published_at||item.date,kind:item.kind||'update',
      thumbnail_url:editorialImage(item.thumbnail_url||item.image?.thumbnail||item.cover_image_url||item.image?.cover),
      cover_image_url:editorialImage(item.cover_image_url||item.image?.cover||item.thumbnail_url||item.image?.thumbnail),
      image_alt:localizedField(item,'image_alt',language)||localizedEditorial(item.image?.alt,language)||title};
  }),{isPublished:item=>!parseAsgTimestamp(item.published_at)||parseAsgTimestamp(item.published_at).getTime()<=now,
      isExpired:item=>Boolean(parseAsgTimestamp(item.expires_at)&&parseAsgTimestamp(item.expires_at).getTime()<now)});
}

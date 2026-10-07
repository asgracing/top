import {createHourlyVotesClient} from '/src/shared/hourly-votes-client.js';
import {filterRaces} from '/src/pages/races/model.js';
import {normalizeChampionshipStatus} from '/src/pages/hourly/championship-status.js';
import {loadPublicRatingSnapshot} from '/src/pages/clubs-teams/rating-model.js';
import {loadEntityDetail} from '/src/pages/clubs-teams/detail-model.js';
import {resolveCatalogAssetUrl} from '/src/pages/clubs-teams/catalog-model.js';
import {normalizeNewsPayload} from '/src/shared/data-schema.js';
import {createCommunityClient} from './community-client.js?v=20261007v2pages11';
import {resolveBanProfiles,sortBans} from './bans-model.js?v=20261007v2pages11';
const DATA = 'https://data.asgracing.ru/';
const reads = new Map();
export async function readJson(url) {
  if (!reads.has(url)) reads.set(url, fetch(url, {cache:'no-store', signal:AbortSignal.timeout(20000)}).then(async response => {
    if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), {status:response.status});
    return response.json();
  }).catch(error => { reads.delete(url); throw error; }));
  return reads.get(url);
}
export const publicUrl = path => new URL(path, DATA).href;
export const hourlyUrl = path => publicUrl('hourly-data/' + path);
export const normalizeEvent = e => ({...e,voting_disabled:Boolean(e.voting_disabled)&&e.competition_mode!=='championship',event_id:String(e.event_id || `hourly_${e.date}_${String(e.start_time_local||'').replace(/[^0-9]/g,'')}`).replace(/^(hourly_\d{4}-\d{2}-\d{2}_\d{4})(?:_.+)?$/,'$1')});
function seasonPath(slug,path='index.json') {
  if(!/^[a-z0-9_-]+$/i.test(slug||'')||!/^[a-z0-9_/.\-]+$/i.test(path)||path.split('/').includes('..'))throw Object.assign(new Error('Missing championship'),{status:404});
  return hourlyUrl(`events/${slug}/${path}`);
}
function prizeItems(prizes,slug) {
  const list=Array.isArray(prizes)?prizes:Object.entries(prizes||{}).map(([key,value])=>value?{...(typeof value==='string'?{src:value}:value),place:Number(key.match(/\d+/)?.[0])}:null).filter(Boolean);
  return list.flatMap((p,i)=>{
    const path=p.src||p.url||p.path;if(!path)return [];
    const base=/^(events|assets)\//.test(path)?hourlyUrl(''):seasonPath(slug);
    const url=new URL(path,base);
    if(url.origin!=='https://data.asgracing.ru'||!url.pathname.startsWith('/hourly-data/'))return [];
    return [{...p,src:url.href,place:p.place||i+1}];
  });
}
export function archiveKind(row) {
  const slot=row.slot || {},type=String(row.event_type || slot.event_type || '').toLowerCase();
  const competition=row.competition_mode || slot.competition_mode,format=row.race_format || slot.race_format;
  if(competition==='championship'||type==='championship')return 'championship';
  if(format==='endurance'||type==='endurance')return 'endurance';
  const restriction=row.car_restriction || row.rules?.car_model || slot.car_restriction;
  if(restriction?.mode==='single_model'||['mono','monoclass'].includes(type)||['mono','monoclass'].includes(format))return 'monoclass';
  return row.source==='hourly'||format==='hourly'||type==='hourly'?'hourly':'public';
}
async function enrichRaceType(row) {
  // Archive summaries omit historic car restrictions. Hourly's published
  // result retains its original slot; never infer restrictions from cars driven.
  if(archiveKind(row)!=='hourly'||row.slot||row.car_restriction||row.rules?.car_model||!/^[a-z0-9_-]+$/i.test(row.race_id||''))return row;
  try {
    const detail=await readJson(hourlyUrl(`races/${row.race_id}.json`));
    return detail.slot?{...row,slot:detail.slot}:row;
  }catch{return row;}
}
async function enrichRaceTypes(rows,isCurrent) {
  // Bound public reads and stop obsolete filter requests between batches.
  for(let offset=0;offset<rows.length;offset+=3){if(!isCurrent())return null;const batch=await Promise.all(rows.slice(offset,offset+3).map(enrichRaceType));rows.splice(offset,batch.length,...batch);}
  return rows;
}
function topUrl(path) {
  // Published paths are relative to this public namespace, never arbitrary URLs.
  if(!/^[a-z0-9_/{.}-]+$/i.test(path)||path.split('/').includes('..'))throw new Error('Invalid public data path');
  return publicUrl('top-data/v2/'+path);
}
export function createArchiveData() {
  let manifest;
  const metadata=async()=>manifest ||= await readJson(publicUrl('top-data/v2/manifest.json'));
  async function page(request={},isCurrent=()=>true,onProgress=()=>{}) {
    const meta=(await metadata()).races || {},size=10,total=Number(meta.total_items)||0;
    const storage=Math.max(1,Number(meta.storage_page_size)||Number(meta.page_size)||10);
    const chunked=Boolean(meta.chunk_path&&meta.storage_page_size),blockSize=chunked?storage:Number(meta.page_size)||10;
    const block=async index=>readJson(topUrl(chunked?meta.chunk_path.replace('{chunk}',index):String(meta.page_path||'races/page-{page}.json').replace('{page}',index)));
    const query=String(request.query||'').trim().toLocaleLowerCase(),filtered=Boolean(query||request.track||request.kind);
    let rows=[],count=total,current=Math.max(1,Math.min(Math.ceil(total/size)||1,Math.floor(Number(request.page))||1));
    if(filtered) {
      // Existing publication has no search API. Read summaries only when a
      // filter is requested; obsolete searches stop before the next block.
      for(let index=1;index<=Math.ceil(total/blockSize);index++) {
        if(!isCurrent())return null;
        const payload=await block(index);rows.push(...(payload.items||[]));onProgress(Math.min(index*blockSize,total),total);
      }
      rows=filterRaces(rows.filter(r=>!request.track||(r.track_code||r.track)===request.track),query,{humanizeTrack:request.trackName,formatDateTime:request.time,locale:request.language});
      if(['hourly','monoclass'].includes(request.kind)){rows=await enrichRaceTypes(rows.filter(r=>['hourly','monoclass'].includes(archiveKind(r))),isCurrent);if(!rows)return null;}
      rows=rows.filter(r=>!request.kind||archiveKind(r)===request.kind);
      rows.sort((a,b)=>String(b.finished_at).localeCompare(String(a.finished_at)));
      if(request.order==='asc')rows.reverse();
      count=rows.length;current=Math.min(current,Math.ceil(count/size)||1);rows=rows.slice((current-1)*size,current*size);
    }else if(total) {
      const start=request.order==='asc'?Math.max(0,total-current*size):(current-1)*size;
      const end=request.order==='asc'?total-(current-1)*size:Math.min(total,start+size);
      for(let index=Math.floor(start/blockSize)+1;index<=Math.ceil(end/blockSize);index++) {
        if(!isCurrent())return null;
        const payload=await block(index),offset=(index-1)*blockSize;
        rows.push(...(payload.items||[]).slice(Math.max(0,start-offset),Math.min(blockSize,end-offset)));
      }
      if(request.order==='asc')rows.reverse();
    }
    rows=await enrichRaceTypes(rows,isCurrent);if(!rows)return null;
    return {items:rows,page:current,total_items:count,total_pages:Math.ceil(count/size)||1,archive_total:total,generated_at:(await metadata()).generated_at};
  }
  return {page};
}
export function createPageData(native) {
  const archive=createArchiveData();
  async function cars() {
    const [rows,manifest]=await Promise.all([readJson(topUrl('cars/cars.json')),readJson(topUrl('manifest.json')).catch(()=>null)]);
    if(!Array.isArray(rows)||rows.some(c=>!c||typeof c.car_name!=='string'||!c.car_name.trim()||!Number.isInteger(c.car_model_id)||c.car_model_id<0))throw new Error('Invalid car catalog');
    const tracks=await readJson(topUrl(manifest?.tables?.bestlaps?.tracks||'tracks/bestlaps.json'));
    if(!Array.isArray(tracks?.items))throw new Error('Invalid track catalog');
    return {items:rows,tracks:tracks.items.map(t=>({code:t.track_code||t.track})).filter(t=>/^[a-z0-9_-]+$/.test(t.code||'')),updated_at:manifest?.generated_at||manifest?.updated_at||null};
  }
  const entityBase=publicUrl('public-cache-clubs-teams/'),client={requestJson:url=>readJson(String(url))};
  async function catalog(context='general') {
    const snapshot=await loadPublicRatingSnapshot({client,dataBaseUrl:entityBase,context});
    const decorate=e=>({...e,local_asset:resolveCatalogAssetUrl(entityBase,snapshot.pointer.snapshot_id,e.asset)});
    return {...snapshot,clubs:snapshot.clubs.map(decorate),teams:snapshot.teams.map(decorate)};
  }
  async function entity(type,slug) {
    if(!/^[a-z0-9][a-z0-9-]{0,127}$/.test(slug||''))throw Object.assign(new Error('Missing entity'),{status:404});
    const result=await loadEntityDetail({client,dataBaseUrl:entityBase,entityType:type,slug});
    return {...result,detail:{...result.detail,local_asset:result.assetUrl,recent_races:result.detail.recent_races.map(r=>({...r,race_uid:String(r.race_uid).trim().toLowerCase().replace(/\.json$/i,'').replace(/[^a-z0-9._-]+/g,'_').replace(/^[._-]+|[._-]+$/g,'')}))}};
  }
  const votes = createHourlyVotesClient({apiBase:publicUrl('hourly-votes-api'), request:fetch,
    getLegacyVoterId:()=>{try {const value=JSON.parse(localStorage.getItem('hourlyVoteVoterId')||'null');return value?.value || '';}catch{return '';}}});
  const participation = Object.create(null);
  async function loadVotes(events) {
    const ids=events.map(e=>e.event_id).filter(Boolean);
    if (!ids.length) return;
    const response=await votes.load(ids);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload=await response.json();
    for (const id of ids) {
      const item=payload.items?.[id] || payload.events?.[id] || payload.votes?.[id] || payload[id];
      participation[id]={...participation[id], count:item?.votes ?? item?.count ?? item?.votes_count ?? 0, voted:Boolean(item?.voted ?? item?.already_voted), pending:false};
    }
  }
  async function toggle(event) {
    const id=event.event_id;
    if(event.voting_disabled || participation[id]?.pending) return;
    const previous={...participation[id]};participation[id]={...previous,pending:true,error:false};
    try {
      const response=await (previous.voted?votes.unvote(id):votes.vote(id));
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      await loadVotes([event]);
    } catch(error) {participation[id]={...previous,pending:false,error:true};throw error;}
  }
  async function hourly() {
    const [event,schedule,recent]=await Promise.all([
      readJson(hourlyUrl('announcement.json')),readJson(hourlyUrl('schedule.json')),readJson(hourlyUrl('races/races.json'))
    ]);
    // Match the existing Hourly page: championship entries remain open.
    return {event:normalizeEvent(event),schedule:{...schedule,items:(schedule.items||[]).map(normalizeEvent)},recent:recent.items || recent.races || []};
  }
  async function championships() {
    const index=await readJson(hourlyUrl('championships.json'));
    if(!Array.isArray(index.items))throw new Error('Invalid championship index');
    return {items:index.items.map(s=>({...s,status:normalizeChampionshipStatus(s.status)})),updated_at:index.updated_at};
  }
  async function season(slug) {
    const [s,schedule,index]=await Promise.all([readJson(seasonPath(slug)),readJson(hourlyUrl('schedule.json')).catch(()=>null),readJson(hourlyUrl('races/races.json')).catch(()=>null)]);
    if(s.slug!==slug||!Array.isArray(s.standings)||!Array.isArray(s.races))throw new Error('Invalid championship');
    const starts=['finished','archived'].includes(normalizeChampionshipStatus(s.status))?[]:Array.isArray(s.upcoming_races)&&s.upcoming_races.length?s.upcoming_races:schedule?.items||[];
    const upcoming=starts.filter(e=>(e.competition_mode==='championship'||e.event_type==='championship')&&(!e.championship_slug||e.championship_slug===slug)).map(e=>normalizeEvent({...e,...schedule?.items?.find(item=>item.event_id===e.event_id)}));
    const recent=index?.items||[];
    return {...s,status:normalizeChampionshipStatus(s.status),upcoming_races:upcoming,
      standings:[...s.standings].sort((a,b)=>(a.rank??Infinity)-(b.rank??Infinity)||Number(b.points)-Number(a.points)||String(a.driver||'').localeCompare(String(b.driver||''))),
      races:s.races.map(r=>({...r,race_id:r.event_id,_data_namespace:'season',_season_slug:slug,competition_mode:'championship',
        _published_race:recent.find(item=>item.source_file===String(r.results_repo_path||r.source_file||'').split(/[\\/]/).pop()||item.race_id===r.race_id)})),
      local_prizes:prizeItems(s.prizes,slug)};
  }
  async function driver(id) {
    if(!/^drv_[a-z0-9]+$/i.test(id||''))throw Object.assign(new Error('Missing driver'),{status:404});
    const [profile,achievement]=await Promise.all([
      native().profile(id),readJson(publicUrl(`achievements/v1/drivers/${encodeURIComponent(id)}.json`)).catch(()=>null)
    ]);
    const eloByRace=new Map(),eloByFile=new Map();
    const filename=value=>String(value||'').split(/[\\/]/).pop().toLowerCase();
    for(const entry of [...(profile.summary?.elo_history||[]),...(profile.elo_history||[])]){
      if(entry.race_id)eloByRace.set(entry.race_id,entry);
      if(entry.race_file||entry.source_file)eloByFile.set(filename(entry.race_file||entry.source_file),entry);
    }
    const history=(profile.race_history || (Array.isArray(profile.races)?profile.races:[])).map(r=>{
      const entry=eloByRace.get(r.race_id)||eloByFile.get(filename(r.source_file||r.race_file));
      const value=r.elo_rating_after??r.elo_after??r.elo??r.elo_internal_rating??entry?.new_rating??entry?.rating??entry?.elo;
      return {...r,elo:value!=null&&Number.isFinite(Number(value))?Number(value):null,elo_rating_delta:r.elo_rating_delta??entry?.rating_delta};
    });
    const favorite=native().favorite({...profile,race_history:history}) || profile.favorite_car;
    return {profile:{...profile.summary,...profile,public_id:id,
      races:typeof profile.races==='number'?profile.races:profile.summary?.races,
      race_history:history,favorite_car:favorite,driver:profile.driver || profile.summary?.driver || id},achievement};
  }
  async function race(id,summary) {
    if(!/^[a-z0-9_.-]+$/i.test(id||''))throw Object.assign(new Error('Missing race'),{status:404});
    const path=summary?.details_path;
    let result;
    if(summary?._data_namespace==='season') {
      const seasonal=await readJson(seasonPath(summary._season_slug,path||`races/${id}.json`));
      const published=summary._published_race;
      const official=published?.details_path?await readJson(hourlyUrl(published.details_path)).catch(()=>null):null;
      const ratings=new Map((official?.results||[]).map(r=>[r.public_id,r]));
      const fields=['elo','elo_internal_rating','elo_category_id','elo_rating_delta','safety_rating_after','safety_rating','safety_delta','safety_category','race_number'];
      result={...seasonal,race_id:id,average_elo:official?.average_elo??seasonal.average_elo,results:(seasonal.results||[]).map(r=>({...r,...Object.fromEntries(fields.filter(key=>ratings.get(r.public_id)?.[key]!=null).map(key=>[key,ratings.get(r.public_id)[key]]))}))};
    }else if(summary?._data_namespace==='entity') {
      result=await readJson(topUrl(path));
    }else {
      const manifest=await readJson(publicUrl('top-data/v2/manifest.json'));
      const url=path&&summary?._data_namespace==='hourly'?hourlyUrl(path):topUrl(path || (manifest.races?.details_path || 'races/details/{race_id}.json').replace('{race_id}',encodeURIComponent(id)));
      result=await readJson(url);
    }
    if(!result||!Array.isArray(result.results))throw new Error('Invalid race result');
    // Match V1's displayed ELO fallback; old published races can have elo:null.
    return {...await enrichRaceType({...summary,...result}),results:result.results.map(row=>({...row,elo:row.elo??row.summary?.elo??row.elo_internal_rating??row.summary?.elo_internal_rating}))};
  }
  async function news(){return normalizeNewsPayload(await readJson('/news-content/news.json'));}
  async function community(){
    await import('/community/posts.js?v=20260628champ1');
    if(!Array.isArray(window.ASG_COMMUNITY_POSTS))throw new Error('Invalid community posts');
    let storage;try{storage=localStorage;}catch{storage=null;}
    const base=document.querySelector('meta[name="community-likes-api"]')?.content||'';
    return {posts:window.ASG_COMMUNITY_POSTS,likes:createCommunityClient({base,storage,readonly:Boolean(window.ASG_V2_READ_ONLY_PREVIEW)})};
  }
  async function history(){
    const [index,event]=await Promise.all([championships(),readJson(hourlyUrl('announcement.json')).catch(()=>null)]);
    const activeSlug=event?.championship_slug||event?.championship?.slug;
    const items=index.items.filter(s=>activeSlug?s.slug!==activeSlug:s.status!=='active').sort((a,b)=>String(b.period||b.title).localeCompare(String(a.period||a.title)));
    const result=[];
    for(let offset=0;offset<items.length;offset+=3)result.push(...await Promise.all(items.slice(offset,offset+3).map(s=>season(s.slug).catch(()=>{throw new Error('Season history unavailable');}))));
    return {items:result,updated_at:index.updated_at};
  }
  async function fun() {
    const payload=await readJson(publicUrl('top-data/v2/fun-stats.json'));
    if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Invalid fun statistics');
    for(const period of ['week','month'])if(payload[period]!=null&&(!payload[period].summary||typeof payload[period].summary!=='object'))throw new Error('Invalid period summary');
    return payload;
  }
  async function bans() {
    const payload=await readJson(publicUrl('top-data/bans.json'));
    if(!Array.isArray(payload?.items))throw new Error('Invalid ban list');
    return {...payload,items:sortBans(payload.items.filter(b=>typeof b?.name==='string').map(b=>({...b,public_id:/^drv_[a-z0-9]+$/i.test(b.public_id||'')?b.public_id:null})))};
  }
  async function bannedProfiles(items) {
    if(!items.some(b=>!b.public_id))return items;
    // Load once on this page, after the list is visible. Retain only the resolved
    // ban records, not the large index's unrelated profiles/rating histories.
    const response=await fetch(publicUrl('top-data/v2/drivers/drivers.json'),{cache:'no-store',signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error('Driver index unavailable');
    const index=await response.json();
    if(!Array.isArray(index))throw new Error('Invalid driver index');
    return resolveBanProfiles(items,index);
  }
  return {hourly,driver,race,archive,championships,season,catalog,entity,cars,fun,bans,bannedProfiles,news,community,history,loadVotes,toggle,participation};
}

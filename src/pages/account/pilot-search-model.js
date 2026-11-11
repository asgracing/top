import {loadDriverDirectory} from '../../shared/driver-directory.js?v=20261107compact2';
import {liveDirectoryPage} from '../../../v2/live-stats.js?v=20261111readers1';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const MAX_PILOT_INDEX_SIZE = 50_000;

function text(value, maximum) {
  const result = typeof value === "string" ? value.normalize("NFKC").trim() : "";
  return result && result.length <= maximum && !/\p{C}/u.test(result) ? result : "";
}

export function normalizePilotIndex(value) {
  if (!Array.isArray(value) || value.length > MAX_PILOT_INDEX_SIZE) throw new TypeError("invalid_pilot_index");
  const seen = new Set();
  const pilots = [];
  for (const row of value) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const publicId = text(row.public_id, 160);
    const displayName = text(row.driver, 160);
    if (!ID_PATTERN.test(publicId) || !displayName || seen.has(publicId)) continue;
    seen.add(publicId);
    pilots.push(Object.freeze({ publicId, displayName }));
  }
  return Object.freeze(pilots);
}

export function searchPilots(pilots, query, { excludedPublicIds = [], deferredPublicIds = [] } = {}) {
  const needle = text(query, 80).toLocaleLowerCase();
  if (needle.length < 2) return [];
  const excluded = new Set(excludedPublicIds);
  const deferred = new Set(deferredPublicIds);
  const matches = pilots.filter(pilot => !excluded.has(pilot.publicId) && (
    pilot.displayName.toLocaleLowerCase().includes(needle)
    || pilot.publicId.toLocaleLowerCase().includes(needle)
  ));
  if (!deferred.size) return matches;
  return [
    ...matches.filter(pilot => !deferred.has(pilot.publicId)),
    ...matches.filter(pilot => deferred.has(pilot.publicId))
  ];
}

export function filterPilots(pilots, query, options = {}) {
  const limit = Math.max(1, Math.min(200, Number(options.limit) || 50));
  return searchPilots(pilots, query, options).slice(0, limit);
}

export async function loadPilotIndex({ client, dataBaseUrl }) {
  const base = `${String(dataBaseUrl || "").replace(/\/+$/, "")}/`;
  const value = await loadDriverDirectory(path => client.requestJson(new URL(`v2/${path}`, base), {
    retries: 1,
    cache: "no-store",
    timeoutMs: 60_000
  }));
  return normalizePilotIndex(value);
}

// Fetch only enough matching pages for the visible picker. A revision pins Show more.
export function createPilotSearch({client,dataBaseUrl,request=globalThis.fetch}={}) {
  const cache=new Map();let active,legacy;
  function cancel(){active?.abort();}
  async function search(query,{limit=50,excludedPublicIds=[],retry=true}={}) {
    cancel();const controller=new AbortController();active=controller;
    const q=text(query,100);if(!q||q.length<2)return {items:[],more:false};
    limit=Math.max(1,Math.min(50_000,limit));
    const excluded=new Set(excludedPublicIds);
    let entry=cache.get(q);
    if(!entry){entry={rows:[],next:1,done:false,revision:null};cache.set(q,entry);if(cache.size>4)cache.delete(cache.keys().next().value);}
    try {
      let rows=entry.rows.filter(p=>!excluded.has(p.publicId));
      while(!entry.done&&rows.length<=limit){
        const page=await liveDirectoryPage(q,{page:entry.next,revision:entry.revision,request,signal:controller.signal});
        controller.signal.throwIfAborted();
        if(page===null){
          legacy ||= loadPilotIndex({client,dataBaseUrl}).catch(error=>{legacy=null;throw error;});
          const matches=searchPilots(await legacy,q,{excludedPublicIds});
          return {items:matches.slice(0,limit),more:matches.length>limit};
        }
        const pilots=normalizePilotIndex(page.items),seen=new Set(entry.rows.map(p=>p.publicId));
        if(pilots.some(p=>seen.has(p.publicId)))throw new Error('Repeated driver directory page');
        entry.rows.push(...pilots);entry.revision=page.revision;entry.next=page.page+1;entry.done=page.page===page.total_pages;
        rows=entry.rows.filter(p=>!excluded.has(p.publicId));
      }
      return {items:rows.slice(0,limit),more:rows.length>limit||!entry.done};
    }catch(error){
      cache.delete(q);
      if(error.status===409&&retry&&!controller.signal.aborted)return search(q,{limit,excludedPublicIds,retry:false});
      throw error;
    }
  }
  return {search,cancel};
}

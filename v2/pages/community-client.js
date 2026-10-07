import {normalizeCommunityLikesPayload} from '../../src/shared/data-schema.js';

// Existing community service contract and V1 browser identity (one-way likes).
export function communityVoterId(storage,now=Date.now(),random=Math.random) {
  const key='communityLikeVoterId',ttl=365*24*60*60*1000;
  const generated=()=>`browser-${now.toString(36)}-${random().toString(36).slice(2,10)}`;
  try{
    const raw=storage.getItem(key);
    if(raw){try{const record=JSON.parse(raw);if(typeof record?.value==='string'&&(!record.expiresAt||Number(record.expiresAt)>now))return record.value;}catch{if(raw.trim()){storage.setItem(key,JSON.stringify({value:raw.trim(),createdAt:now,expiresAt:now+ttl}));return raw.trim();}}}
    const value=generated();storage.setItem(key,JSON.stringify({value,createdAt:now,expiresAt:now+ttl}));return value;
  }catch{return generated();}
}
export function createCommunityClient({base,fetchImpl=fetch,storage,now=Date.now,random=Math.random,readonly=false}) {
  const states={},pending=new Set();let voter;
  const voterId=()=>voter||=communityVoterId(storage,now(),random);
  const request=async(path,options={})=>{
    const url=new URL(path,base);if(url.protocol!=='https:')throw new Error('Invalid community API');
    const response=await fetchImpl(url,{cache:'no-store',signal:AbortSignal.timeout(20000),...options});
    if(!response.ok)throw new Error('Community reactions unavailable');return response.json();
  };
  async function load(ids){
    for(const id of ids)states[id]={...states[id],loading:true,failed:false};
    if(!base){for(const id of ids)states[id]={failed:true};return;}
    if(!ids.length)return;
    try{const payload=normalizeCommunityLikesPayload(await request('/likes?'+new URLSearchParams({post_ids:ids.join(','),voter_id:voterId()})));
      for(const id of ids){const item=payload.items[id]||{};states[id]={likes:typeof item.likes==='number'?item.likes:0,already_liked:Boolean(item.already_liked),loading:false,failed:false};}
    }catch{for(const id of ids)states[id]={...states[id],loading:false,failed:true};}
  }
  async function like(id){
    if(readonly||!base||pending.has(id)||states[id]?.already_liked)return;
    pending.add(id);const previous=states[id]||{};states[id]={...previous,loading:true,failed:false};
    try{const payload=await request('/like',{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({post_id:id,voter_id:voterId()})});
      states[id]={likes:typeof payload.likes==='number'?payload.likes:(previous.likes??0),already_liked:Boolean(payload.already_liked),loading:false,failed:false};
    }catch{states[id]={...previous,loading:false,failed:true};}
    finally{pending.delete(id);}
  }
  return {states,load,like,readonly};
}

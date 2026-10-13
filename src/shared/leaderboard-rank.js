// A profile loads one compact prefix shard, never the full driver table.
export async function loadLeaderboardRank(publicId, {fetchImpl=globalThis.fetch,base='https://data.asgracing.ru/top-data/v2/'}={}) {
  if(!/^drv_[0-9a-f]{2,64}$/.test(publicId || ''))return {status:'legacy'};
  const read=async path=>{const res=await fetchImpl(base+path,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!res.ok)throw Error('Rank unavailable');return res.json();};
  try {
    for(let attempt=0;attempt<2;attempt++) {
      const manifest=await read('manifest.json'),contract=manifest.rankings?.leaderboard;
      if(!contract)return {status:'legacy'};
      if(contract.schema_version!==1||contract.prefix_length!==2||contract.shard_path!=='rankings/leaderboard/{prefix}.json'||!/^[a-f0-9]{64}$/.test(contract.revision))throw Error('Invalid rank contract');
      const prefix=publicId.slice(4,6),shard=await read(contract.shard_path.replace('{prefix}',prefix));
      if(shard.revision!==contract.revision)continue;
      if(shard.schema_version!==1||shard.prefix!==prefix||!shard.ranks||typeof shard.ranks!=='object'||Array.isArray(shard.ranks))throw Error('Invalid rank shard');
      const rank=shard.ranks[publicId]??null;
      if(rank!==null&&(!Number.isInteger(rank)||rank<1))throw Error('Invalid rank');
      return {status:'current',rank,revision:contract.revision,generated_at:manifest.generated_at};
    }
  }catch{/* Keep profile data usable while the compact index is unavailable. */}
  return {status:'unavailable'};
}

export function profileWithLeaderboardRank(profile, result) {
  if(result.status==='legacy')return profile;
  const rank=result.status==='current'?result.rank:null;
  return {...profile,championship_rank:rank,summary:{...profile.summary,championship_rank:rank},leaderboard_rank:result};
}

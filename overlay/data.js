const ROOT='https://data.asgracing.ru/race-archive-shadow/v1/site/stats/';

// Preserve the overlay's top 100 and default-circuit record, on one revision.
export async function loadOverlayApi({request=globalThis.fetch,track='monza'}={}) {
  if(!/^[a-z0-9_-]+$/.test(track))throw new Error('Invalid overlay track');
  async function page(route,params){
    const response=await request(ROOT+route+'?'+new URLSearchParams(params),{cache:'no-cache',credentials:'omit',signal:AbortSignal.timeout(12000)});
    const payload=await response.json();
    if(response.status===503&&payload?.error==='stats_legacy')return null;
    if(!response.ok)throw new Error('Overlay statistics HTTP '+response.status);
    if(!Number.isSafeInteger(payload?.revision)||payload.revision<1||payload.page!==1
      ||!Array.isArray(payload.items)||!Number.isSafeInteger(payload.total_items)||payload.total_items<0
      ||payload.items.length!==Math.min(Number(params.limit),payload.total_items)
      ||payload.items.some(row=>!/^drv_[0-9a-f]{12}$/.test(row?.public_id)))throw new Error('Invalid overlay statistics');
    return payload;
  }
  for(let attempt=0;attempt<2;attempt++){
    const [leaderboard,bestlaps]=await Promise.all([page('rankings',{kind:'leaderboard',limit:100}),page('bestlaps',{track,limit:1})]);
    if(!leaderboard||!bestlaps)return null;
    if(leaderboard.revision!==bestlaps.revision)continue;
    return {leaderboard:leaderboard.items,bestlaps:bestlaps.items,updatedAt:leaderboard.generated_at};
  }
  throw new Error('Overlay statistics revision changed');
}

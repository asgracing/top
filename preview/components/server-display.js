export function compactServerLabel(item) {
  if(item.key==='main')return 'Main';
  if(item.key==='hourly')return 'Hourly';
  if(item.key==='sunset')return 'Practice';
  const raw=String(item.label||item.key||'ASG');
  const clean=raw.replace(/^ASG\s*Racing\s*/i,'').split(/[,|]/)[0].replace(/\s*-?\s*(www\.|https?:|пароль|password).*$/i,'').trim();
  const parts=clean.split(/\s+-\s+/);
  return (parts.length>1?parts.slice(1).join(' · '):clean)||item.key||'ASG';
}
export function orderServerRows(items) {
  const priority=item=>item.key==='main'?0:item.key==='hourly'?1:2;
  return [...items].sort((a,b)=>priority(a)-priority(b)||(Number(b.players)||0)-(Number(a.players)||0));
}

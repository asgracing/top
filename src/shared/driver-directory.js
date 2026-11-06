const invalid=()=>new TypeError('Invalid driver directory');
export async function loadDriverDirectory(request) {
  const payload=await request('drivers/search.json');
  if(payload?.schema_version!==1||!Array.isArray(payload.items)||payload.total_items!==payload.items.length)throw invalid();
  const seen=new Set();
  return payload.items.map(row=>{
    if(!row||typeof row.public_id!=='string'||!row.public_id||typeof row.driver!=='string'
      ||typeof row.is_banned!=='boolean'||seen.has(row.public_id))throw invalid();
    seen.add(row.public_id);
    return {public_id:row.public_id,driver:row.driver,is_banned:row.is_banned};
  });
}

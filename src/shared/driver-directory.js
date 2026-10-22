export async function loadDriverDirectory(request) {
  let payload;
  try {
    payload = await request('drivers/search.json');
  } catch (error) {
    // Only a 404 permits the legacy fallback.
    if (Number(error?.status) !== 404) throw error;
    const legacy = await request('drivers/drivers.json');
    if (!Array.isArray(legacy)) throw new TypeError('Invalid driver directory');
    return legacy;
  }
  if (payload?.schema_version !== 1 || !Array.isArray(payload.items)
      || payload.total_items !== payload.items.length) throw new TypeError('Invalid driver directory');
  const seen = new Set();
  return payload.items.map(row => {
    if (!row || typeof row.public_id !== 'string' || !row.public_id
        || typeof row.driver !== 'string' || typeof row.is_banned !== 'boolean'
        || seen.has(row.public_id)) throw new TypeError('Invalid driver directory row');
    seen.add(row.public_id);
    return {public_id: row.public_id, driver: row.driver, is_banned: row.is_banned};
  });
}

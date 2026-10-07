import {parseAsgTimestamp} from '../../src/shared/time.js';
const publicId = value => /^drv_[a-z0-9]+$/i.test(value || '') ? value : null;
const nameKey = value => String(value || '').trim().toLocaleLowerCase();

// The public bans feed has no identity key. Never pick an arbitrary duplicate.
export function resolveBanProfiles(items, drivers = []) {
  const wanted = new Set(items.map(b => nameKey(b.name))), byName = new Map();
  for (const driver of drivers) {
    const key = nameKey(driver.driver), id = publicId(driver.public_id);
    if (!wanted.has(key) || driver.is_banned !== true || !id) continue;
    if (!byName.has(key)) byName.set(key, new Set());
    byName.get(key).add(id);
  }
  return items.map(b => {
    const candidates = byName.get(nameKey(b.name));
    return {...b, public_id: publicId(b.public_id) || (candidates?.size === 1 ? [...candidates][0] : null)};
  });
}

export function sortBans(items) {
  return [...items].sort((a,b) => (parseAsgTimestamp(b.banned_at)?.getTime() ?? -Infinity) - (parseAsgTimestamp(a.banned_at)?.getTime() ?? -Infinity));
}

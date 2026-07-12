export function createQueryCache({ now = () => Date.now(), maxEntries = 100 } = {}) {
  const entries = new Map();
  const touch = (key, entry) => { entries.delete(key); entries.set(key, entry); };
  const trim = () => { while (entries.size > maxEntries) entries.delete(entries.keys().next().value); };

  async function query(key, loader, { ttlMs = 0, staleWhileRevalidate = false, force = false } = {}) {
    const existing = entries.get(key);
    if (!force && existing?.promise) return existing.promise;
    const fresh = existing?.hasValue && (!ttlMs || existing.updatedAt + ttlMs > now());
    if (!force && fresh) { touch(key, existing); return existing.value; }
    if (!force && staleWhileRevalidate && existing?.hasValue) {
      void run(key, loader, existing).catch(() => {});
      return existing.value;
    }
    return run(key, loader, existing);
  }

  function run(key, loader, previous = null) {
    const entry = previous || { hasValue: false, value: undefined, updatedAt: 0, promise: null };
    if (entry.promise) return entry.promise;
    entry.promise = Promise.resolve().then(loader).then(value => {
      entry.value = value; entry.hasValue = true; entry.updatedAt = now(); return value;
    }).finally(() => { entry.promise = null; touch(key, entry); trim(); });
    touch(key, entry);
    return entry.promise;
  }

  return {
    query,
    invalidate(key) { if (key === undefined) entries.clear(); else entries.delete(key); },
    invalidatePrefix(prefix) { for (const key of entries.keys()) if (String(key).startsWith(prefix)) entries.delete(key); },
    peek(key) { return entries.get(key)?.value; },
    get size() { return entries.size; }
  };
}

export function createLatestRequestGuard() {
  const versions = new Map();
  return {
    next(key) { const version = (versions.get(key) || 0) + 1; versions.set(key, version); return { key, version }; },
    isCurrent(token) { return Boolean(token) && versions.get(token.key) === token.version; },
    invalidate(key) { versions.set(key, (versions.get(key) || 0) + 1); }
  };
}

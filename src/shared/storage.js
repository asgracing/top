export function createStorage(namespace, backend, now = () => Date.now()) {
  const keyFor = key => `${namespace}:${key}`;
  return {
    get(key, fallback = null) {
      try {
        const raw = backend.getItem(keyFor(key));
        if (!raw) return fallback;
        const record = JSON.parse(raw);
        if (!record || record.version !== 1) return fallback;
        if (record.expiresAt && record.expiresAt <= now()) {
          backend.removeItem(keyFor(key));
          return fallback;
        }
        return record.value;
      } catch {
        return fallback;
      }
    },
    set(key, value, { ttlMs = 0 } = {}) {
      try {
        backend.setItem(keyFor(key), JSON.stringify({ version: 1, value, expiresAt: ttlMs > 0 ? now() + ttlMs : 0 }));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try { backend.removeItem(keyFor(key)); return true; } catch { return false; }
    }
  };
}

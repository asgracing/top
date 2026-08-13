export const NEWS_READ_LEGACY_STORAGE_KEY = "asgReadNewsIds.v2";
export const NEWS_READ_STORAGE_KEY = "asg.top.v1:newsReadState";

function normalizeReadState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([key, readAt]) => String(key).trim() && Boolean(readAt))
  );
}

function parseStoredValue(rawValue, { namespaced = false } = {}) {
  if (!rawValue) return {};
  try {
    const parsed = JSON.parse(rawValue);
    if (namespaced) {
      if (!parsed || parsed.version !== 1) return {};
      return normalizeReadState(parsed.value);
    }
    return normalizeReadState(parsed);
  } catch {
    return {};
  }
}

export function mergeNewsReadStates(...states) {
  const merged = {};
  states.forEach(state => {
    Object.entries(normalizeReadState(state)).forEach(([key, readAt]) => {
      const current = Number(merged[key]) || 0;
      const candidate = Number(readAt) || (readAt ? 1 : 0);
      if (!merged[key] || candidate > current) merged[key] = readAt;
    });
  });
  return merged;
}

export function saveNewsReadState(storage, state) {
  const normalized = normalizeReadState(state);
  try {
    storage.setItem(NEWS_READ_LEGACY_STORAGE_KEY, JSON.stringify(normalized));
    storage.setItem(NEWS_READ_STORAGE_KEY, JSON.stringify({ version: 1, value: normalized, expiresAt: 0 }));
    return true;
  } catch {
    return false;
  }
}

export function loadNewsReadState(storage, { synchronize = true } = {}) {
  try {
    const legacy = parseStoredValue(storage.getItem(NEWS_READ_LEGACY_STORAGE_KEY));
    const namespaced = parseStoredValue(storage.getItem(NEWS_READ_STORAGE_KEY), { namespaced: true });
    const merged = mergeNewsReadStates(legacy, namespaced);
    const serialized = JSON.stringify(merged);
    if (synchronize && (JSON.stringify(legacy) !== serialized || JSON.stringify(namespaced) !== serialized)) {
      saveNewsReadState(storage, merged);
    }
    return merged;
  } catch {
    return {};
  }
}

export function markNewsRead(storage, item, readAt = Date.now()) {
  const key = String(item?.id || item?.slug || "").trim();
  if (!key) return false;
  const state = loadNewsReadState(storage);
  if (state[key]) return false;
  state[key] = readAt;
  return saveNewsReadState(storage, state);
}

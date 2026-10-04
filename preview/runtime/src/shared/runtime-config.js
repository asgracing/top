const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalDevHost(hostname) {
  return LOCAL_HOSTS.has(String(hostname || "").toLowerCase());
}

export function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

export function resolveRuntimeOverride({ hostname, searchParams, key, fallback }) {
  const normalizedFallback = normalizeBaseUrl(fallback);
  if (!isLocalDevHost(hostname)) return normalizedFallback;
  return normalizeBaseUrl(searchParams?.get?.(key)) || normalizedFallback;
}

export function isAllowedHttpUrl(value, { allowedOrigins = [] } = {}) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && (!allowedOrigins.length || allowedOrigins.includes(url.origin));
  } catch {
    return false;
  }
}

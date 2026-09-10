const TOKEN_STORAGE_KEY = "hourlyVoteVoterTokenV2";

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function readStoredToken(storage, now) {
  try {
    const raw = storage?.getItem?.(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const expiresAt = Date.parse(String(parsed?.expiresAt || ""));
    if (!parsed?.token || !Number.isFinite(expiresAt) || expiresAt <= now + 60_000) {
      storage?.removeItem?.(TOKEN_STORAGE_KEY);
      return null;
    }
    return { token: String(parsed.token), expiresAt };
  } catch {
    return null;
  }
}

function saveToken(storage, token, expiresAt) {
  try {
    storage?.setItem?.(TOKEN_STORAGE_KEY, JSON.stringify({ token, expiresAt }));
  } catch {
    // Persistence is optional; the in-memory token remains usable.
  }
}

export function createHourlyVotesClient({ apiBase, request, storage = globalThis.localStorage, getLegacyVoterId = () => "", now = () => Date.now() } = {}) {
  const base = normalizeBaseUrl(apiBase);
  if (!base || typeof request !== "function") throw new TypeError("Hourly votes client requires apiBase and request");
  let currentToken = readStoredToken(storage, now());
  let tokenPromise = null;
  const endpoint = path => `${base}/${String(path || "").replace(/^\/+/, "")}`;

  function clearToken() {
    currentToken = null;
    try { storage?.removeItem?.(TOKEN_STORAGE_KEY); } catch { /* ignore storage failures */ }
  }

  async function ensureToken(force = false) {
    if (!force && currentToken && currentToken.expiresAt > now() + 60_000) return currentToken.token;
    if (tokenPromise) return tokenPromise;
    tokenPromise = (async () => {
      const response = await request(endpoint("voter-token"), {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ legacy_voter_id: String(getLegacyVoterId() || "").trim() })
      }, 0);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const token = String(payload?.voter_token || "");
      const expiresAt = Date.parse(String(payload?.expires_at || ""));
      if (!token || !Number.isFinite(expiresAt)) throw new Error("Invalid voter token response");
      currentToken = { token, expiresAt };
      saveToken(storage, token, payload.expires_at);
      return token;
    })();
    try {
      return await tokenPromise;
    } finally {
      tokenPromise = null;
    }
  }

  async function authorizedRequest(path, options = {}, retries = 0, retryToken = true) {
    const token = await ensureToken();
    const response = await request(endpoint(path), {
      ...options,
      headers: { ...(options.headers || {}), authorization: `Bearer ${token}` }
    }, retries);
    if (response.status !== 401 || !retryToken) return response;
    clearToken();
    const replacement = await ensureToken(true);
    return request(endpoint(path), {
      ...options,
      headers: { ...(options.headers || {}), authorization: `Bearer ${replacement}` }
    }, 0);
  }

  return Object.freeze({
    async load(eventIds, retries = 1) {
      const uniqueIds = [...new Set((eventIds || []).map(String).filter(Boolean))];
      const params = new URLSearchParams({ event_ids: uniqueIds.join(",") });
      return authorizedRequest(`votes?${params}`, { cache: "no-store" }, retries);
    },
    async vote(eventId) {
      return authorizedRequest("vote", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ event_id: String(eventId || "") })
      });
    },
    async unvote(eventId) {
      return authorizedRequest("unvote", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ event_id: String(eventId || "") })
      });
    },
    clearToken
  });
}

export { TOKEN_STORAGE_KEY };

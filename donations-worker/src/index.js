const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8"
};

const TOKEN_KV_KEY = "donationalerts:oauth-tokens";
const RECENT_CACHE_KV_KEY = "donationalerts:recent-cache";
const DONATIONALERTS_TOKEN_URL = "https://www.donationalerts.com/oauth/token";
const DONATIONALERTS_AUTHORIZE_URL = "https://www.donationalerts.com/oauth/authorize";
const DONATIONALERTS_DONATIONS_URL = "https://www.donationalerts.com/api/v1/alerts/donations";
const DONATIONALERTS_GOAL_URL = "https://www.donationalerts.com/api/v1/donationgoal";

function getAllowedOrigin(request, env) {
  const requestOrigin = request.headers.get("origin") || "";
  const configuredOrigins = String(env.ALLOWED_ORIGIN || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  const fallbackOrigins = [
    "https://asgracing.ru",
    "https://www.asgracing.ru",
    "https://asgracing.github.io",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:3000",
    "http://localhost:3000"
  ];
  const allowList = new Set([...configuredOrigins, ...fallbackOrigins]);
  if (requestOrigin && allowList.has(requestOrigin)) return requestOrigin;
  return configuredOrigins[0] || fallbackOrigins[0];
}

function withCors(headers, origin) {
  headers["access-control-allow-origin"] = origin || "*";
  headers["access-control-allow-methods"] = "GET,OPTIONS";
  headers["access-control-allow-headers"] = "content-type";
  headers.vary = "origin";
  return headers;
}

function jsonResponse(payload, status = 200, origin = "*", extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: withCors({ ...JSON_HEADERS, ...extraHeaders }, origin)
  });
}

function htmlResponse(markup, status = 200) {
  return new Response(markup, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}

function requireEnv(env, key) {
  const value = String(env[key] || "").trim();
  if (!value || value === "REPLACE_WITH_KV_NAMESPACE_ID") {
    throw new Error(`${key} is not configured`);
  }
  return value;
}

function getLimit(env) {
  const value = Number(env.DONATIONS_LIMIT || 50);
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(1, Math.round(value)));
}

function getCacheTtlMs(env) {
  const value = Number(env.DONATIONS_CACHE_TTL_SECONDS || 120);
  if (!Number.isFinite(value)) return 120000;
  return Math.min(600, Math.max(15, Math.round(value))) * 1000;
}

function getMinDonationTimestamp(env) {
  const rawDate = String(env.DONATIONS_MIN_DATE || "").trim();
  if (!rawDate) return null;
  const timestamp = Date.parse(`${rawDate}T00:00:00Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function safeString(value, maxLength = 240) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return amount;
}

function sanitizeDonation(item) {
  return {
    id: safeString(item?.id, 64),
    username: safeString(item?.username || "Anonymous", 80) || "Anonymous",
    message: safeString(item?.message, 600),
    amount: safeAmount(item?.amount),
    currency: safeString(item?.currency, 8).toUpperCase(),
    created_at: safeString(item?.created_at, 32)
  };
}

function isDonationAtOrAfterMinDate(item, env) {
  const minTimestamp = getMinDonationTimestamp(env);
  if (!minTimestamp) return true;
  const donationTimestamp = Date.parse(item?.created_at || "");
  return Number.isFinite(donationTimestamp) && donationTimestamp >= minTimestamp;
}

function normalizeGoalPayload(data) {
  const rawGoal = Array.isArray(data?.data)
    ? data.data.find(item => Number(item?.is_active) === 1) || data.data[0]
    : data?.data || data?.goal || data;
  if (!rawGoal || typeof rawGoal !== "object") return null;
  return rawGoal;
}

function sanitizeDonationGoal(goal) {
  const raisedAmount = safeAmount(goal?.raised_amount);
  const goalAmount = safeAmount(goal?.goal_amount);
  if (raisedAmount === null || goalAmount === null || goalAmount <= 0) return null;
  return {
    id: safeString(goal?.id, 64),
    is_active: Number(goal?.is_active) === 1,
    title: safeString(goal?.title, 120),
    currency: safeString(goal?.currency, 8).toUpperCase(),
    start_amount: safeAmount(goal?.start_amount),
    raised_amount: raisedAmount,
    goal_amount: goalAmount,
    started_at: safeString(goal?.started_at, 32),
    expires_at: goal?.expires_at ? safeString(goal.expires_at, 32) : null
  };
}

async function readTokens(env) {
  const raw = await env.DONATION_ALERTS_KV.get(TOKEN_KV_KEY, "json");
  if (!raw?.access_token || !raw?.refresh_token) return null;
  return raw;
}

async function writeTokens(env, tokens) {
  const expiresIn = Number(tokens.expires_in || 0);
  const payload = {
    token_type: tokens.token_type || "Bearer",
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: expiresIn,
    updated_at: new Date().toISOString(),
    expires_at: expiresIn > 0 ? Date.now() + Math.max(0, expiresIn - 60) * 1000 : null
  };
  await env.DONATION_ALERTS_KV.put(TOKEN_KV_KEY, JSON.stringify(payload));
  await env.DONATION_ALERTS_KV.delete(RECENT_CACHE_KV_KEY);
  return payload;
}

async function tokenRequest(env, params) {
  const body = new URLSearchParams({
    client_id: requireEnv(env, "DONATIONALERTS_CLIENT_ID"),
    client_secret: requireEnv(env, "DONATIONALERTS_CLIENT_SECRET"),
    ...params
  });
  const response = await fetch(DONATIONALERTS_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`DonationAlerts token request failed: ${response.status}`);
  }
  if (!data?.access_token) {
    throw new Error("DonationAlerts token response has no access_token");
  }
  return data;
}

async function exchangeCodeForTokens(env, code) {
  const data = await tokenRequest(env, {
    grant_type: "authorization_code",
    redirect_uri: requireEnv(env, "DONATIONALERTS_REDIRECT_URI"),
    code
  });
  return writeTokens(env, data);
}

async function refreshTokens(env, tokens) {
  const data = await tokenRequest(env, {
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    scope: requireEnv(env, "DONATIONALERTS_SCOPE")
  });
  return writeTokens(env, {
    ...data,
    refresh_token: data.refresh_token || tokens.refresh_token
  });
}

async function getUsableTokens(env) {
  const tokens = await readTokens(env);
  if (!tokens) return null;
  if (tokens.expires_at && Number(tokens.expires_at) <= Date.now()) {
    return refreshTokens(env, tokens);
  }
  return tokens;
}

async function fetchDonationsPage(env, tokens, page) {
  const url = new URL(DONATIONALERTS_DONATIONS_URL);
  url.searchParams.set("page", String(page));
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${tokens.access_token}`,
      accept: "application/json"
    }
  });
  if (response.status === 401) {
    const refreshedTokens = await refreshTokens(env, tokens);
    return fetchDonationsPage(env, refreshedTokens, page);
  }
  if (!response.ok) {
    throw new Error(`DonationAlerts donations request failed: ${response.status}`);
  }
  return response.json();
}

async function fetchDonations(env, tokens) {
  const limit = getLimit(env);
  const donations = [];

  for (let page = 1; page <= 10 && donations.length < limit; page += 1) {
    const data = await fetchDonationsPage(env, tokens, page);
    const pageItems = Array.isArray(data?.data) ? data.data : [];
    const filteredItems = pageItems.filter(item => isDonationAtOrAfterMinDate(item, env));
    donations.push(...filteredItems);
    const nextPageUrl = data?.links?.next;
    const lastPageIsOlderThanMinDate = pageItems.length > 0 && filteredItems.length === 0;
    if (lastPageIsOlderThanMinDate) break;
    if (!nextPageUrl || pageItems.length === 0) break;
  }

  return donations.slice(0, limit);
}

async function fetchDonationGoal(env, tokens) {
  const url = new URL(DONATIONALERTS_GOAL_URL);
  url.searchParams.set("is_active", "1");
  url.searchParams.set("include_timestamps", "1");
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${tokens.access_token}`,
      accept: "application/json"
    }
  });
  if (response.status === 401) {
    const refreshedTokens = await refreshTokens(env, tokens);
    return fetchDonationGoal(env, refreshedTokens);
  }
  if (!response.ok) return null;
  const data = await response.json();
  return sanitizeDonationGoal(normalizeGoalPayload(data));
}

async function readRecentCache(env) {
  const cache = await env.DONATION_ALERTS_KV.get(RECENT_CACHE_KV_KEY, "json");
  if (!cache?.items || !cache?.cached_at) return null;
  return cache;
}

async function writeRecentCache(env, payload) {
  await env.DONATION_ALERTS_KV.put(RECENT_CACHE_KV_KEY, JSON.stringify(payload));
}

async function handleOauthStart(env) {
  const url = new URL(DONATIONALERTS_AUTHORIZE_URL);
  url.searchParams.set("client_id", requireEnv(env, "DONATIONALERTS_CLIENT_ID"));
  url.searchParams.set("redirect_uri", requireEnv(env, "DONATIONALERTS_REDIRECT_URI"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", requireEnv(env, "DONATIONALERTS_SCOPE"));
  url.searchParams.set("state", requireEnv(env, "OAUTH_STATE"));
  return Response.redirect(url.toString(), 302);
}

async function handleOauthCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  if (error) {
    return htmlResponse(`<h1>DonationAlerts authorization failed</h1><p>${safeString(error, 160)}</p>`, 400);
  }
  if (!code) {
    return htmlResponse("<h1>DonationAlerts authorization failed</h1><p>Missing code.</p>", 400);
  }
  if (state !== requireEnv(env, "OAUTH_STATE")) {
    return htmlResponse("<h1>DonationAlerts authorization failed</h1><p>Invalid state.</p>", 400);
  }
  await exchangeCodeForTokens(env, code);
  return htmlResponse("<h1>DonationAlerts connected</h1><p>You can close this tab and open /recent.</p>");
}

async function handleRecent(env, origin) {
  const cache = await readRecentCache(env);
  const cacheTtlMs = getCacheTtlMs(env);
  if (cache && Date.now() - Date.parse(cache.cached_at) < cacheTtlMs) {
    return jsonResponse({ ok: true, ...cache }, 200, origin, { "cache-control": "public, max-age=60" });
  }

  const tokens = await getUsableTokens(env);
  if (!tokens) {
    return jsonResponse({ ok: false, error: "DonationAlerts OAuth is not connected yet." }, 503, origin);
  }

  const [donations, goal] = await Promise.all([
    fetchDonations(env, tokens),
    fetchDonationGoal(env, tokens).catch(() => null)
  ]);
  const payload = {
    items: donations.slice(0, getLimit(env)).map(sanitizeDonation),
    goal,
    cached_at: new Date().toISOString()
  };
  await writeRecentCache(env, payload);
  return jsonResponse({ ok: true, ...payload }, 200, origin, { "cache-control": "public, max-age=60" });
}

export default {
  async fetch(request, env) {
    const origin = getAllowedOrigin(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: withCors({}, origin) });
    }

    try {
      const url = new URL(request.url);
      if (url.pathname === "/health" && request.method === "GET") {
        return jsonResponse({ ok: true }, 200, origin);
      }
      if (url.pathname === "/oauth/start" && request.method === "GET") {
        return handleOauthStart(env);
      }
      if (url.pathname === "/oauth/callback" && request.method === "GET") {
        return handleOauthCallback(request, env);
      }
      if (url.pathname === "/recent" && request.method === "GET") {
        return handleRecent(env, origin);
      }
      return jsonResponse({ ok: false, error: "Not found" }, 404, origin);
    } catch (error) {
      return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 500, origin);
    }
  }
};

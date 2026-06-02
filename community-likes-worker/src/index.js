const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8"
};

function getAllowedOrigin(request, env) {
  const requestOrigin = request.headers.get("origin") || "";
  const configuredOrigins = String(env.ALLOWED_ORIGIN || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  const fallbackOrigins = [
    "https://asgracing.ru",
    "https://www.asgracing.ru",
    "https://asgracing.github.io"
  ];
  const allowList = new Set([...configuredOrigins, ...fallbackOrigins]);
  if (requestOrigin && allowList.has(requestOrigin)) return requestOrigin;
  return configuredOrigins[0] || fallbackOrigins[0];
}

function withCors(headers, origin) {
  headers["access-control-allow-origin"] = origin || "*";
  headers["access-control-allow-methods"] = "GET,POST,OPTIONS";
  headers["access-control-allow-headers"] = "content-type";
  headers.vary = "origin";
  return headers;
}

function jsonResponse(payload, status = 200, origin = "*") {
  return new Response(JSON.stringify(payload), {
    status,
    headers: withCors({ ...JSON_HEADERS }, origin)
  });
}

function safePostId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function safeVoterId(value) {
  return String(value || "")
    .trim()
    .slice(0, 180);
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function countKey(postId) {
  return `community-like-count:${postId}`;
}

function voterKey(postId, voterHash) {
  return `community-like-voter:${postId}:${voterHash}`;
}

async function getLikeCount(env, postId) {
  const raw = await env.COMMUNITY_LIKES_KV.get(countKey(postId));
  const count = Number(raw || 0);
  return Number.isFinite(count) && count > 0 ? Math.round(count) : 0;
}

async function hasVoterLiked(env, postId, voterId) {
  if (!voterId) return false;
  const voterHash = await sha256Hex(voterId);
  return Boolean(await env.COMMUNITY_LIKES_KV.get(voterKey(postId, voterHash)));
}

async function handleLikes(request, env, origin) {
  const url = new URL(request.url);
  const postIds = String(url.searchParams.get("post_ids") || "")
    .split(",")
    .map(safePostId)
    .filter(Boolean)
    .slice(0, 50);
  const voterId = safeVoterId(url.searchParams.get("voter_id"));
  const items = {};

  await Promise.all(postIds.map(async postId => {
    const [likes, alreadyLiked] = await Promise.all([
      getLikeCount(env, postId),
      hasVoterLiked(env, postId, voterId)
    ]);
    items[postId] = {
      likes,
      already_liked: alreadyLiked
    };
  }));

  return jsonResponse({ ok: true, items }, 200, origin);
}

async function handleLike(request, env, origin) {
  const body = await request.json().catch(() => null);
  const postId = safePostId(body?.post_id);
  const voterId = safeVoterId(body?.voter_id);
  if (!postId || !voterId) {
    return jsonResponse({ ok: false, error: "post_id and voter_id are required" }, 400, origin);
  }

  const voterHash = await sha256Hex(voterId);
  const existing = await env.COMMUNITY_LIKES_KV.get(voterKey(postId, voterHash));
  if (existing) {
    return jsonResponse({
      ok: true,
      post_id: postId,
      likes: await getLikeCount(env, postId),
      already_liked: true
    }, 200, origin);
  }

  const nextCount = await getLikeCount(env, postId) + 1;
  await env.COMMUNITY_LIKES_KV.put(voterKey(postId, voterHash), "1");
  await env.COMMUNITY_LIKES_KV.put(countKey(postId), String(nextCount));

  return jsonResponse({
    ok: true,
    post_id: postId,
    likes: nextCount,
    already_liked: true
  }, 200, origin);
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
      if (url.pathname === "/likes" && request.method === "GET") {
        return await handleLikes(request, env, origin);
      }
      if (url.pathname === "/like" && request.method === "POST") {
        return await handleLike(request, env, origin);
      }
      return jsonResponse({ ok: false, error: "Not found" }, 404, origin);
    } catch (error) {
      return jsonResponse(
        { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
        500,
        origin
      );
    }
  }
};

import test from "node:test";
import assert from "node:assert/strict";

import { createHourlyVotesClient, TOKEN_STORAGE_KEY } from "../../src/shared/hourly-votes-client.js";

function response(status, payload) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
}

test("issues one token and never sends voter id in the votes URL", async () => {
  const calls = [];
  const request = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/voter-token")) return response(200, { voter_token: "signed-token", expires_at: "2099-01-01T00:00:00Z" });
    return response(200, { ok: true, items: {} });
  };
  const client = createHourlyVotesClient({ apiBase: "https://data.asgracing.ru/hourly-votes-api", request, storage: memoryStorage(), getLegacyVoterId: () => "browser-legacy" });
  await client.load(["hourly_2026-09-10_2100"]);
  await client.load(["hourly_2026-09-10_2100"]);
  assert.equal(calls.filter(call => call.url.endsWith("/voter-token")).length, 1);
  assert.equal(calls.some(call => call.url.includes("voter_id=")), false);
  assert.equal(calls[1].options.headers.authorization, "Bearer signed-token");
  assert.match(calls[0].options.body, /browser-legacy/);
});

test("vote mutation contains only event id and bearer token", async () => {
  const calls = [];
  const request = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/voter-token")) return response(200, { voter_token: "signed-token", expires_at: "2099-01-01T00:00:00Z" });
    return response(200, { ok: true, votes: 1, already_voted: true });
  };
  const client = createHourlyVotesClient({ apiBase: "https://data.asgracing.ru/hourly-votes-api/", request, storage: memoryStorage(), getLegacyVoterId: () => "legacy" });
  await client.vote("hourly_2026-09-10_2100");
  const mutation = calls.at(-1);
  assert.deepEqual(JSON.parse(mutation.options.body), { event_id: "hourly_2026-09-10_2100" });
  assert.equal(mutation.options.headers.authorization, "Bearer signed-token");
});

test("expired stored token is replaced", async () => {
  const storage = memoryStorage();
  storage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ token: "expired", expiresAt: "2000-01-01T00:00:00Z" }));
  let tokenCalls = 0;
  const request = async url => {
    if (String(url).endsWith("/voter-token")) {
      tokenCalls += 1;
      return response(200, { voter_token: "fresh", expires_at: "2099-01-01T00:00:00Z" });
    }
    return response(200, { ok: true, items: {} });
  };
  const client = createHourlyVotesClient({ apiBase: "https://data.asgracing.ru/hourly-votes-api", request, storage, getLegacyVoterId: () => "legacy" });
  await client.load(["hourly_2026-09-10_2100"]);
  assert.equal(tokenCalls, 1);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createHttpClient, HttpClientError } from "../../src/shared/http-client.js";

const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test("returns parsed JSON", async () => {
  const client = createHttpClient({ fetchImpl: async () => response({ ok: true }) });
  assert.deepEqual(await client.requestJson("https://api.example/data"), { ok: true });
});
test("classifies HTTP errors", async () => {
  const client = createHttpClient({ fetchImpl: async () => response({}, 503) });
  await assert.rejects(client.requestJson("https://api.example/data"), error => error instanceof HttpClientError && error.kind === "http" && error.status === 503 && error.retryable);
});
test("classifies parse errors", async () => {
  const client = createHttpClient({ fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("bad"); } }) });
  await assert.rejects(client.requestJson("https://api.example/data"), error => error.kind === "parse" && error.status === 200);
});
test("retries retryable GET failures", async () => {
  let calls = 0;
  const client = createHttpClient({ fetchImpl: async () => (++calls < 3 ? response({}, 503) : response({ ok: true })), retryDelayMs: 0 });
  assert.deepEqual(await client.requestJson("https://api.example/data", { retries: 2 }), { ok: true });
  assert.equal(calls, 3);
});
test("does not retry mutations", async () => {
  let calls = 0;
  const client = createHttpClient({ fetchImpl: async () => { calls += 1; return response({}, 503); }, retryDelayMs: 0 });
  await assert.rejects(client.requestJson("https://api.example/vote", { method: "POST", retries: 3 }));
  assert.equal(calls, 1);
});
test("classifies external cancellation", async () => {
  const controller = new AbortController();
  const client = createHttpClient({ fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))) });
  const pending = client.requestJson("https://api.example/data", { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, error => error.kind === "aborted" && !error.retryable);
});
test("classifies timeout", async () => {
  const client = createHttpClient({ defaultTimeoutMs: 5, fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))) });
  await assert.rejects(client.requestJson("https://api.example/data"), error => error.kind === "timeout" && error.retryable);
});

import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedHttpUrl, isLocalDevHost, normalizeBaseUrl, resolveRuntimeOverride } from "../../src/shared/runtime-config.js";

test("normalizes base URLs", () => assert.equal(normalizeBaseUrl(" https://api.example.test/// "), "https://api.example.test"));
test("recognizes only explicit local hosts", () => {
  assert.equal(isLocalDevHost("localhost"), true);
  assert.equal(isLocalDevHost("127.0.0.1"), true);
  assert.equal(isLocalDevHost("localhost.example.com"), false);
});
test("ignores query API overrides on production", () => {
  const searchParams = new URLSearchParams("topApiBase=https://evil.example");
  assert.equal(resolveRuntimeOverride({ hostname: "asgracing.ru", searchParams, key: "topApiBase", fallback: "https://api.asgracing.ru/" }), "https://api.asgracing.ru");
});
test("allows query API overrides during local development", () => {
  const searchParams = new URLSearchParams("topApiBase=http://127.0.0.1:8787/");
  assert.equal(resolveRuntimeOverride({ hostname: "localhost", searchParams, key: "topApiBase", fallback: "https://api.asgracing.ru" }), "http://127.0.0.1:8787");
});
test("validates URL protocol and optional origin allowlist", () => {
  assert.equal(isAllowedHttpUrl("javascript:alert(1)"), false);
  assert.equal(isAllowedHttpUrl("https://api.asgracing.ru/v2", { allowedOrigins: ["https://api.asgracing.ru"] }), true);
  assert.equal(isAllowedHttpUrl("https://other.example/v2", { allowedOrigins: ["https://api.asgracing.ru"] }), false);
});

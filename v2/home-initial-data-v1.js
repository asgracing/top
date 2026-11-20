import { createHttpClient } from "/src/shared/http-client.js";
import { normalizeManifest } from "/src/shared/data-schema.js";

const reads = new Map();

export function takeHomeRead(url) {
  const promise = reads.get(url);
  reads.delete(url);
  return promise;
}

function remember(url, promise) {
  reads.set(url, promise);
  // The application consumes the original rejection when it is ready.
  void promise.catch(() => {});
}

const local = /^(localhost|127\.0\.0\.1|::1)$/i.test(location.hostname);
const publicSite = /(^|\.)asgracing\.ru$/i.test(location.hostname);
const overrides = new URLSearchParams(location.search);
const customSource = local && ["topDataBase", "topApiBase", "hourlyApiBase"]
  .some(key => Boolean(overrides.get(key)));

if ((publicSite || local) && !customSource) {
  const origin = "https://data.asgracing.ru";
  const client = createHttpClient({ defaultTimeoutMs: 12000 });
  const options = { cache: "no-store", retries: 1 };
  const top = origin + "/top-data/v2/";
  const manifestUrl = top + "manifest.json";
  const manifest = client.requestJson(manifestUrl + "?t=" + Date.now(), options);
  remember(manifestUrl, manifest);

  void manifest.then(payload => {
    const { home, version } = normalizeManifest(payload) || {};
    const path = String(home || "home.json").replace(/^\/+/, "");
    const url = top + path + (version ? (path.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(version) : "");
    remember(url, client.requestJson(url, { cache: "default", retries: 1 }));
  }).catch(() => {});

  for (const path of ["announcement.json", "schedule.json"]) {
    const url = origin + "/hourly-data/" + path;
    remember(url, client.requestJson(url, options));
  }
}

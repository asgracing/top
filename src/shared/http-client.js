export class HttpClientError extends Error {
  constructor(message, { kind, url, status = 0, cause = null, retryable = false } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "HttpClientError";
    this.kind = kind || "unknown";
    this.url = String(url || "");
    this.status = Number(status) || 0;
    this.retryable = Boolean(retryable);
  }
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function combineSignals(externalSignal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) abort();
  else externalSignal?.addEventListener("abort", abort, { once: true });
  const timer = timeoutMs > 0 ? setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs) : null;
  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    dispose() {
      if (timer) clearTimeout(timer);
      externalSignal?.removeEventListener("abort", abort);
    }
  };
}

export function createHttpClient({ fetchImpl = globalThis.fetch, defaultTimeoutMs = 10000, retryDelayMs = 150 } = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");

  async function requestJson(url, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const retries = method === "GET" ? Math.max(0, Number(options.retries) || 0) : 0;
    const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
    let attempt = 0;

    while (true) {
      const signals = combineSignals(options.signal, timeoutMs);
      try {
        const response = await fetchImpl(url, { ...options, method, signal: signals.signal, retries: undefined, timeoutMs: undefined });
        if (!response.ok) {
          const retryable = RETRYABLE_STATUS.has(response.status);
          if (retryable && attempt < retries) { attempt += 1; await wait(retryDelayMs * attempt); continue; }
          throw new HttpClientError(`HTTP ${response.status}`, { kind: "http", url, status: response.status, retryable });
        }
        try { return await response.json(); }
        catch (cause) { throw new HttpClientError("Invalid JSON response", { kind: "parse", url, status: response.status, cause }); }
      } catch (cause) {
        if (cause instanceof HttpClientError) throw cause;
        const kind = signals.didTimeout() ? "timeout" : options.signal?.aborted ? "aborted" : "network";
        const retryable = kind === "network" || kind === "timeout";
        if (retryable && attempt < retries) { attempt += 1; await wait(retryDelayMs * attempt); continue; }
        throw new HttpClientError(kind === "timeout" ? "Request timed out" : kind === "aborted" ? "Request aborted" : "Network request failed", { kind, url, cause, retryable });
      } finally {
        signals.dispose();
      }
    }
  }

  return { requestJson };
}

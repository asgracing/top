const TRUSTED_HTML = Symbol("trusted-html");
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const DEFAULT_IMAGE_ORIGINS = new Set([
  "https://asgracing.ru",
  "https://www.asgracing.ru",
  "https://data.asgracing.ru",
  "https://asgracing.github.io"
]);

export function trustedHtml(value) {
  return Object.freeze({ [TRUSTED_HTML]: true, value: String(value ?? "") });
}

export function setTrustedHtml(element, value) {
  if (!value?.[TRUSTED_HTML]) throw new TypeError("HTML must be explicitly marked as trusted");
  element.innerHTML = value.value;
  return element;
}

function parseSafeUrl(value, baseUrl) {
  const candidate = String(value ?? "").trim();
  if (!candidate || CONTROL_CHARACTERS.test(candidate) || candidate.startsWith("//")) return null;
  try {
    return { candidate, base: new URL(baseUrl), url: new URL(candidate, baseUrl) };
  } catch { return null; }
}

export function safeLinkUrl(value, baseUrl = "http://localhost/", { allowMailto = false, allowTel = false } = {}) {
  const parsed = parseSafeUrl(value, baseUrl);
  if (!parsed) return null;
  const { candidate, base, url } = parsed;
  if (url.protocol === "https:") return candidate;
  if (url.origin === base.origin && ["http:", "https:"].includes(url.protocol)) return candidate;
  if (allowMailto && url.protocol === "mailto:") return candidate;
  if (allowTel && url.protocol === "tel:") return candidate;
  return null;
}

export function safeImageUrl(value, baseUrl = "http://localhost/", { allowedOrigins = [] } = {}) {
  const parsed = parseSafeUrl(value, baseUrl);
  if (!parsed) return null;
  const { candidate, base, url } = parsed;
  if (!["http:", "https:"].includes(url.protocol)) return null;
  const origins = new Set([...DEFAULT_IMAGE_ORIGINS, base.origin]);
  for (const allowed of allowedOrigins) {
    try { origins.add(new URL(allowed, base).origin); } catch { /* ignore invalid policy entries */ }
  }
  return origins.has(url.origin) ? candidate : null;
}

export function safeUrl(value, baseUrl = "http://localhost/", options = {}) {
  return safeLinkUrl(value, baseUrl, options);
}

export function element(documentRef, tagName, { className = "", text = null, attrs = {} } = {}, children = []) {
  const node = documentRef.createElement(tagName);
  if (className) node.className = className;
  if (text !== null) node.textContent = String(text);
  for (const [name, value] of Object.entries(attrs)) {
    if (value == null || name.startsWith("on")) continue;
    if (name === "href" && !safeUrl(value, documentRef.baseURI || "http://localhost/")) continue;
    if (name === "src" && !safeImageUrl(value, documentRef.baseURI || "http://localhost/")) continue;
    node.setAttribute(name, String(value));
  }
  node.append(...children.filter(Boolean));
  return node;
}

export function tableStateElement(documentRef, { kind, message }) {
  const normalized = ["loading", "empty", "error"].includes(kind) ? kind : "empty";
  const attrs = { "data-table-state": normalized };
  if (normalized === "loading") { attrs.role = "status"; attrs["aria-live"] = "polite"; }
  if (normalized === "error") attrs.role = "alert";
  return element(documentRef, "div", { className: normalized === "loading" ? "loading" : "empty-box", text: message, attrs });
}

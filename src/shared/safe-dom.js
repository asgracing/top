const TRUSTED_HTML = Symbol("trusted-html");
const SAFE_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

export function trustedHtml(value) {
  return Object.freeze({ [TRUSTED_HTML]: true, value: String(value ?? "") });
}

export function setTrustedHtml(element, value) {
  if (!value?.[TRUSTED_HTML]) throw new TypeError("HTML must be explicitly marked as trusted");
  element.innerHTML = value.value;
  return element;
}

export function safeUrl(value, baseUrl = "http://localhost/") {
  try {
    const url = new URL(value, baseUrl);
    if (!SAFE_URL_PROTOCOLS.has(url.protocol) && url.origin !== new URL(baseUrl).origin) return null;
    return value;
  } catch { return null; }
}

export function element(documentRef, tagName, { className = "", text = null, attrs = {} } = {}, children = []) {
  const node = documentRef.createElement(tagName);
  if (className) node.className = className;
  if (text !== null) node.textContent = String(text);
  for (const [name, value] of Object.entries(attrs)) {
    if (value == null || name.startsWith("on")) continue;
    if (["href", "src"].includes(name) && !safeUrl(value, documentRef.baseURI || "http://localhost/")) continue;
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

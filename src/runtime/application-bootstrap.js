export function runWhenDocumentReady(documentRef, initialize) {
  if (!documentRef?.addEventListener || typeof initialize !== "function") {
    throw new TypeError("Application bootstrap requires a document and initialize callback");
  }
  let started = false;
  const start = () => {
    if (started) return false;
    started = true;
    initialize();
    return true;
  };
  if (documentRef.readyState === "loading") documentRef.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
  return Object.freeze({ start, get started() { return started; } });
}

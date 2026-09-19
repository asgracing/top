export const PAGE_IDS = Object.freeze(["home", "races", "driver", "cars", "fun-stats", "community", "news", "bans"]);

export function createPageContext(page) {
  const normalizedPage = String(page || "").trim().toLowerCase();
  if (!PAGE_IDS.includes(normalizedPage)) throw new Error(`Unknown page context: ${page || "(empty)"}`);
  return Object.freeze({
    page: normalizedPage,
    isHome: normalizedPage === "home",
    siteBasePath: normalizedPage === "home" ? "./" : "../"
  });
}

export function applyPageContext(documentRef, page) {
  const context = createPageContext(page);
  if (!documentRef?.documentElement) throw new Error("Page context requires a document element");
  documentRef.documentElement.dataset.page = context.page;
  return context;
}

export function readPageContext(documentRef) {
  const context = createPageContext(documentRef?.documentElement?.dataset?.page);
  if (documentRef?.documentElement?.dataset?.pageLanguage !== "ru") return context;

  let pathname = "";
  try { pathname = new URL(documentRef.baseURI || documentRef.location?.href).pathname; } catch {}
  const markerIndex = pathname.indexOf("/ru/");
  if (markerIndex < 0) return context;

  return Object.freeze({
    ...context,
    siteBasePath: pathname.slice(0, markerIndex + 1) || "/"
  });
}

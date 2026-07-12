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
  return createPageContext(documentRef?.documentElement?.dataset?.page);
}

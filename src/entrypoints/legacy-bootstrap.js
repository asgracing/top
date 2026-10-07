import{applyPageContext}from"../runtime/page-context.js?v=20261007root1";

export async function bootstrapLegacyPage(page) {
  applyPageContext(document, page);
  await import("../../app.js?v=20261007root1");
}

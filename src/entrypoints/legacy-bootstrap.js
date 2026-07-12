import { applyPageContext } from "../runtime/page-context.js";

export async function bootstrapLegacyPage(page) {
  applyPageContext(document, page);
  await import("../../app.js?v=20260712r10pagedata9");
}

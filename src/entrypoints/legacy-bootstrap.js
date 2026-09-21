import { applyPageContext } from "../runtime/page-context.js?v=20260920route1";

export async function bootstrapLegacyPage(page) {
  applyPageContext(document, page);
  await import("../../app.js?v=20260921l2");
}

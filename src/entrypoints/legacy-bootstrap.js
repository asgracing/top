export async function bootstrapLegacyPage(page) {
  document.documentElement.dataset.page = page;
  await import("../../app.js?v=20260712r10entry1");
}

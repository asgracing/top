export function createPageOrchestrator({ page, initializers, errorHandlers = {}, logger = console }) {
  const initializePage = initializers?.[page];
  if (typeof initializePage !== "function") throw new Error(`Missing data initializer for ${page}`);
  const handleError = errorHandlers?.[page];

  return Object.freeze({
    async initialize() {
      try {
        await initializePage();
        return { ok: true, error: null };
      } catch (error) {
        logger?.error?.(error);
        if (typeof handleError === "function") handleError(error);
        return { ok: false, error };
      }
    }
  });
}

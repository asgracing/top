export function createHomePage({ initializeData, initializeControllers, setupDeferred, handleError }) {
  const dependencies = { initializeData, initializeControllers, setupDeferred, handleError };
  for (const [name, dependency] of Object.entries(dependencies)) {
    if (typeof dependency !== "function") throw new TypeError(`Home page requires ${name}`);
  }
  return Object.freeze({
    initialize: () => initializeData(),
    mountControllers: () => initializeControllers(),
    setupDeferred: () => setupDeferred(),
    handleError: error => handleError(error)
  });
}

export function createFunStatsPage({ initializeData, handleError }) {
  if (typeof initializeData !== "function" || typeof handleError !== "function") {
    throw new TypeError("Fun Stats page requires data and error lifecycle dependencies");
  }
  return Object.freeze({
    initialize: () => initializeData(),
    handleError: error => handleError(error),
  });
}

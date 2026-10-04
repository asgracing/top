export function createFunStatsPeriodController({ documentRef, getPeriod, setPeriod, renderPage, applyReveal }) {
  if (!documentRef?.querySelectorAll || [getPeriod, setPeriod, renderPage, applyReveal].some(value => typeof value !== "function")) {
    throw new TypeError("Fun Stats period controller requires complete dependencies");
  }

  function bind(lifecycle) {
    if (!lifecycle?.listen) throw new TypeError("Fun Stats period controller requires a lifecycle");
    documentRef.querySelectorAll("[data-fun-period]").forEach(button => {
      lifecycle.listen(button, "click", () => {
        const nextPeriod = button.dataset.funPeriod;
        if (!nextPeriod || nextPeriod === getPeriod()) return;
        setPeriod(nextPeriod);
        renderPage();
        applyReveal();
      });
    });
  }

  return Object.freeze({ bind });
}

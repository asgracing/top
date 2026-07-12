export const HOME_DEFERRED_SECTION_MAP = Object.freeze({ championship: "leaderboard", bestlaps: "bestlaps", "worst-safety": "safety" });

export function createHomeDeferredSectionsController({ initialState, onReveal = () => {} }) {
  const state = initialState;
  let observer = null;
  const revealAll = () => Object.keys(state).forEach(key => { state[key] = true; });

  return Object.freeze({
    state,
    setup({ isHome, tabsEnabled, windowRef, documentRef }) {
      if (!isHome || observer) return;
      if (tabsEnabled || !("IntersectionObserver" in windowRef)) {
        revealAll();
        return;
      }
      observer = new windowRef.IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const key = HOME_DEFERRED_SECTION_MAP[entry.target.id];
          if (!key || state[key]) return;
          state[key] = true;
          observer?.unobserve(entry.target);
          onReveal(key);
        });
      }, { rootMargin: "240px 0px" });
      Object.keys(HOME_DEFERRED_SECTION_MAP).forEach(sectionId => {
        const element = documentRef.getElementById(sectionId);
        if (element) observer.observe(element);
      });
    },
    destroy() {
      observer?.disconnect();
      observer = null;
    }
  });
}

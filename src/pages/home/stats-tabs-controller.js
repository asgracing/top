export function resolveHomeStatsTabFromHref(href) {
  if (href === "#bestlaps") return "bestlaps";
  if (href === "#worst-safety") return "safety";
  return "leaderboard";
}

export function createHomeStatsTabsController({ documentRef, tabs, initialTab = "leaderboard", isEnabled, translate, scrollToTabs }) {
  let activeTab = tabs[initialTab] ? initialTab : "leaderboard";
  let hostedTab = null;
  let bound = false;

  const update = () => {
    const enabled = Boolean(isEnabled());
    documentRef.body.classList.toggle("experiment-combined-stats", enabled);
    const subtitle = documentRef.getElementById("combined-stats-subtitle");
    if (subtitle && enabled) subtitle.textContent = translate(tabs[activeTab]?.subtitleKey || "championshipSubtitle");

    Object.entries(tabs).forEach(([key, config]) => {
      const button = documentRef.querySelector(`[data-stats-tab="${key}"]`);
      const panel = documentRef.getElementById(config.panelId);
      const selected = enabled ? key === activeTab : true;
      button?.classList.toggle("is-active", selected);
      button?.setAttribute("aria-selected", selected ? "true" : "false");
      if (button) button.tabIndex = selected ? 0 : -1;
      panel?.classList.toggle("is-active", selected);
      if (panel) panel.hidden = enabled ? !selected : false;
    });

    const toolsHost = documentRef.getElementById("combined-stats-active-tools");
    if (!toolsHost) return;
    const hostedPanelId = hostedTab ? tabs[hostedTab]?.panelId : null;
    toolsHost.querySelectorAll(".table-tools").forEach(tools => {
      const panelId = tools.dataset.originPanelId || hostedPanelId;
      if (panelId && !tools.dataset.originPanelId) tools.dataset.originPanelId = panelId;
      const header = panelId ? documentRef.getElementById(panelId)?.querySelector(".section-header") : null;
      if (header) header.appendChild(tools);
    });
    hostedTab = null;
    const activePanel = documentRef.getElementById(tabs[activeTab]?.panelId || "championship");
    const activeTools = activePanel?.querySelector(".table-tools");
    if (enabled && activeTools) {
      toolsHost.appendChild(activeTools);
      hostedTab = activeTab;
    }
  };

  const setActive = key => {
    if (!tabs[key]) return false;
    activeTab = key;
    update();
    return true;
  };

  const bind = lifecycle => {
    if (bound) return;
    bound = true;
    documentRef.querySelectorAll("[data-stats-tab]").forEach(button => {
      lifecycle.listen(button, "click", () => setActive(button.dataset.statsTab || "leaderboard"));
    });
    Object.values(tabs).forEach(({ panelId }) => {
      const tools = documentRef.getElementById(panelId)?.querySelector(".table-tools");
      if (tools && !tools.dataset.originPanelId) tools.dataset.originPanelId = panelId;
    });
    lifecycle.listen(documentRef, "click", event => {
      if (!isEnabled()) return;
      const link = event.target?.closest?.('a[href="#championship"], a[href="#bestlaps"], a[href="#worst-safety"]');
      if (!link) return;
      event.preventDefault();
      setActive(resolveHomeStatsTabFromHref(String(link.getAttribute("href") || "")));
      scrollToTabs();
    });
  };

  return Object.freeze({ update, setActive, bind, get activeTab() { return activeTab; } });
}

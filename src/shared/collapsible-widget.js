export function createCollapsibleWidget({
  root,
  toggle,
  content,
  storage = null,
  storageKey,
  initialCollapsed = false,
  forceInitialCollapsed = false,
  getLabels = () => ({ name: "Widget", collapse: "Collapse", expand: "Expand" })
}) {
  if (!root?.classList || !toggle?.addEventListener || !content || !storageKey) {
    throw new TypeError("A collapsible widget requires root, toggle, content and storageKey");
  }
  const saved = storage?.get?.(storageKey, null);
  let collapsed = forceInitialCollapsed
    ? true
    : (typeof saved === "boolean" ? saved : Boolean(initialCollapsed));

  const render = () => {
    const labels = getLabels();
    root.classList.toggle("is-collapsed", collapsed);
    content.hidden = collapsed;
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", `${collapsed ? labels.expand : labels.collapse}: ${labels.name}`);
    toggle.title = collapsed ? labels.expand : labels.collapse;
  };
  const setCollapsed = value => {
    collapsed = Boolean(value);
    storage?.set?.(storageKey, collapsed);
    render();
  };
  const onToggle = () => setCollapsed(!collapsed);
  toggle.addEventListener("click", onToggle);
  render();

  return {
    get collapsed() { return collapsed; },
    setCollapsed,
    syncCopy: render,
    destroy() { toggle.removeEventListener("click", onToggle); }
  };
}

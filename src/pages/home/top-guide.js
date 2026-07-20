const DEFAULT_MEDIA_QUERY = "(min-width: 1280px)";

export function resolveTopGuideSteps(documentRef, steps) {
  return steps
    .map(step => ({ ...step, target: documentRef.querySelector(step.targetSelector) }))
    .filter(step => step.target);
}

export function createTopGuideController({
  documentRef,
  windowRef,
  lifecycle,
  storage,
  translate,
  replaceTokens,
  steps,
  mediaQuery = DEFAULT_MEDIA_QUERY,
  autoOpenDelay = 500
}) {
  const dependencies = { documentRef, windowRef, lifecycle, translate, replaceTokens };
  for (const [name, dependency] of Object.entries(dependencies)) {
    if (!dependency) throw new TypeError(`Top guide requires ${name}`);
  }
  if (!Array.isArray(steps) || !steps.length) throw new TypeError("Top guide requires steps");

  const state = {
    mounted: false,
    active: false,
    stepIndex: 0,
    media: null,
    returnFocus: null,
    elements: null
  };

  const isDesktop = () => Boolean(state.media?.matches);
  const hasSeen = () => Boolean(storage?.get("topGuideSeen", false));
  const markSeen = () => storage?.set("topGuideSeen", true);
  const availableSteps = () => resolveTopGuideSteps(documentRef, steps);

  function createElement(tag, { className = "", id = "", text = "" } = {}) {
    const element = documentRef.createElement(tag);
    element.className = className;
    element.id = id;
    if (text) element.textContent = text;
    return element;
  }

  function buildUi() {
    const highlight = createElement("div", { className: "top-guide-highlight", id: "top-guide-highlight" });
    highlight.hidden = true;
    highlight.setAttribute("aria-hidden", "true");

    const root = createElement("aside", { className: "top-guide", id: "top-guide" });
    root.hidden = true;
    root.tabIndex = -1;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "false");
    root.setAttribute("aria-labelledby", "top-guide-title");
    root.setAttribute("aria-describedby", "top-guide-body");

    const progress = createElement("div", { className: "top-guide-progress", id: "top-guide-progress" });
    const title = createElement("h3", { className: "top-guide-title", id: "top-guide-title" });
    const body = createElement("p", { className: "top-guide-body", id: "top-guide-body" });
    const actions = createElement("div", { className: "top-guide-actions" });
    const skip = createElement("button", { className: "top-guide-btn top-guide-btn-ghost", id: "top-guide-skip" });
    const back = createElement("button", { className: "top-guide-btn top-guide-btn-secondary", id: "top-guide-back" });
    const next = createElement("button", { className: "top-guide-btn top-guide-btn-primary", id: "top-guide-next" });
    for (const button of [skip, back, next]) button.type = "button";
    actions.append(skip, back, next);
    root.append(progress, title, body, actions);

    const launcher = createElement("button", { className: "top-guide-launcher", id: "top-guide-launcher" });
    launcher.type = "button";
    documentRef.body.append(highlight, root, launcher);
    return { highlight, root, progress, title, body, skip, back, next, launcher };
  }

  function hideHighlight() {
    if (state.elements) state.elements.highlight.hidden = true;
  }

  function positionHighlight(target) {
    if (!state.elements || !target?.getBoundingClientRect) return;
    const rect = target.getBoundingClientRect();
    const padding = 8;
    const highlight = state.elements.highlight;
    highlight.style.top = `${Math.max(4, rect.top - padding)}px`;
    highlight.style.left = `${Math.max(4, rect.left - padding)}px`;
    highlight.style.width = `${Math.max(0, Math.min(windowRef.innerWidth - 8, rect.right + padding) - Math.max(4, rect.left - padding))}px`;
    highlight.style.height = `${Math.max(0, Math.min(windowRef.innerHeight - 8, rect.bottom + padding) - Math.max(4, rect.top - padding))}px`;
    highlight.style.borderRadius = target.matches?.(".btn-last-races") ? "999px" : "24px";
    highlight.hidden = rect.width <= 0 || rect.height <= 0;
  }

  function scrollTargetIntoView(target, block = "center") {
    if (!target?.getBoundingClientRect) return;
    const rect = target.getBoundingClientRect();
    const targetTop = rect.top + windowRef.scrollY;
    const viewportHeight = windowRef.innerHeight || documentRef.documentElement.clientHeight || 0;
    const navOffset = 96;
    const top = block === "center"
      ? targetTop - Math.max(120, (viewportHeight - rect.height) / 2)
      : targetTop - navOffset;
    windowRef.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  function render() {
    if (!state.mounted) return;
    const elements = state.elements;
    elements.launcher.textContent = translate("topGuideLauncher");
    elements.launcher.setAttribute("aria-label", translate("topGuideLauncher"));
    elements.skip.textContent = translate("topGuideDismiss");
    elements.back.textContent = translate("topGuideBack");

    if (!isDesktop()) {
      state.active = false;
      elements.root.hidden = true;
      elements.launcher.hidden = true;
      hideHighlight();
      return;
    }

    const activeSteps = availableSteps();
    if (!activeSteps.length) {
      state.active = false;
      elements.root.hidden = true;
      elements.launcher.hidden = true;
      hideHighlight();
      return;
    }

    state.stepIndex = Math.min(state.stepIndex, activeSteps.length - 1);
    elements.launcher.hidden = state.active;
    elements.root.hidden = !state.active;
    if (!state.active) {
      hideHighlight();
      return;
    }

    const step = activeSteps[state.stepIndex];
    elements.title.textContent = translate(step.titleKey);
    elements.body.textContent = translate(step.textKey);
    elements.progress.textContent = replaceTokens(translate("topGuideProgress"), {
      current: state.stepIndex + 1,
      total: activeSteps.length
    });
    elements.back.disabled = state.stepIndex === 0;
    elements.next.textContent = state.stepIndex === activeSteps.length - 1
      ? translate("topGuideDone")
      : translate("topGuideNext");
    positionHighlight(step.target);
  }

  function close({ seen = false, restoreFocus = true } = {}) {
    if (seen) markSeen();
    state.active = false;
    render();
    if (restoreFocus) state.elements?.launcher.focus?.();
    state.returnFocus = null;
  }

  function open(stepIndex = 0, { force = false } = {}) {
    if (!state.mounted || !isDesktop() || (!force && hasSeen())) return false;
    const activeSteps = availableSteps();
    if (!activeSteps.length) return false;
    state.returnFocus = documentRef.activeElement;
    state.stepIndex = Math.max(0, Math.min(stepIndex, activeSteps.length - 1));
    state.active = true;
    render();
    const step = activeSteps[state.stepIndex];
    scrollTargetIntoView(step.target, step.scrollBlock);
    state.elements.root.focus?.({ preventScroll: true });
    return true;
  }

  function setStep(nextIndex) {
    const activeSteps = availableSteps();
    if (!activeSteps.length) return close();
    if (nextIndex >= activeSteps.length) return close({ seen: true });
    state.stepIndex = Math.max(0, nextIndex);
    render();
    const step = activeSteps[state.stepIndex];
    scrollTargetIntoView(step.target, step.scrollBlock);
  }

  function mount() {
    if (state.mounted) return;
    state.elements = buildUi();
    state.media = windowRef.matchMedia(mediaQuery);
    state.mounted = true;

    lifecycle.listen(state.elements.skip, "click", () => close({ seen: true }));
    lifecycle.listen(state.elements.back, "click", () => setStep(state.stepIndex - 1));
    lifecycle.listen(state.elements.next, "click", () => setStep(state.stepIndex + 1));
    lifecycle.listen(state.elements.launcher, "click", () => open(0, { force: true }));
    lifecycle.listen(documentRef, "keydown", event => {
      if (state.active && event.key === "Escape") close();
    });
    lifecycle.listen(windowRef, "resize", render);
    lifecycle.listen(windowRef, "scroll", render, { passive: true });
    if (state.media?.addEventListener) lifecycle.listen(state.media, "change", render);
    lifecycle.add(() => {
      state.active = false;
      state.mounted = false;
      state.elements?.highlight.remove();
      state.elements?.root.remove();
      state.elements?.launcher.remove();
      state.elements = null;
    });

    render();
    if (!hasSeen()) {
      const timer = windowRef.setTimeout(() => open(), autoOpenDelay);
      lifecycle.timer(timer, id => windowRef.clearTimeout(id));
    }
  }

  return Object.freeze({ mount, open, close, render, get active() { return state.active; } });
}

export function getFocusableElements(container) {
  if (!container) return [];
  return [...container.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(element => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
}

export function collectActiveModalBranches(body, openModals) {
  const branches = new Set([body]);
  openModals.forEach(modal => {
    let element = modal;
    while (element && element !== body) {
      branches.add(element);
      element = element.parentElement;
    }
  });
  return branches;
}

export function createModalControllerFactory({ documentRef, windowRef }) {
  const syncBackground = () => {
    const openModals = new Set(documentRef.querySelectorAll(".modal-overlay.is-open"));
    documentRef.querySelectorAll("[data-modal-inert-owned='true']").forEach(element => {
      element.inert = false;
      delete element.dataset.modalInertOwned;
    });
    if (!openModals.size || !documentRef.body) return;
    const activeBranches = collectActiveModalBranches(documentRef.body, openModals);
    const isolate = parent => {
      [...parent.children].forEach(element => {
        if (openModals.has(element)) return;
        if (activeBranches.has(element)) { isolate(element); return; }
        if (element.inert) return;
        element.inert = true;
        element.dataset.modalInertOwned = "true";
      });
    };
    isolate(documentRef.body);
  };

  return function createModalController({ modalId, closeButtonId, openButtonId, onOpen, onClose }) {
    const modal = documentRef.getElementById(modalId);
    const closeButton = documentRef.getElementById(closeButtonId);
    const openButton = openButtonId ? documentRef.getElementById(openButtonId) : null;
    if (!modal || !closeButton) return null;
    let lastFocusedElement = null;

    const close = () => {
      if (!modal.classList.contains("is-open")) return;
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      syncBackground();
      documentRef.body.classList.toggle("modal-open", Boolean(documentRef.querySelector(".modal-overlay.is-open")));
      onClose?.();
      if (lastFocusedElement?.isConnected && typeof lastFocusedElement.focus === "function") lastFocusedElement.focus();
      lastFocusedElement = null;
    };

    const open = (trigger = null) => {
      if (modal.classList.contains("is-open")) return;
      lastFocusedElement = trigger || documentRef.activeElement;
      onOpen?.();
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      documentRef.body.classList.add("modal-open");
      syncBackground();
      windowRef.requestAnimationFrame(() => {
        const [firstFocusable] = getFocusableElements(modal);
        const dialog = modal.querySelector("[role='dialog']");
        if (dialog && !dialog.hasAttribute("tabindex")) dialog.tabIndex = -1;
        (firstFocusable || dialog || closeButton).focus();
      });
    };

    closeButton.addEventListener("click", close);
    modal.addEventListener("click", event => { if (event.target === modal) close(); });
    modal.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab") return;
      const focusable = getFocusableElements(modal);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && documentRef.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && documentRef.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    if (openButton) openButton.addEventListener("click", () => open(openButton));
    return { modal, open, close };
  };
}

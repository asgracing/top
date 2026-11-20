// Shared presentation helpers; no server registry or rating policy lives here.
export function orderedServers(servers = []) {
  const priority = new Map([['hourly', 0], ['main', 1]]);
  // Stable sort retains the runtime's track and name order when player counts tie.
  return [...servers].sort((a, b) =>
    (priority.get(a.key) ?? 2) - (priority.get(b.key) ?? 2) ||
    (b.players ?? 0) - (a.players ?? 0));
}

export function replaceServerCards(container, html, scrollContainers = []) {
  const active = container.ownerDocument.activeElement?.closest('[data-server]');
  const focusedKey = active && container.contains(active) ? active.dataset.server : null;
  const positions = [container, ...scrollContainers].map(element =>
    ({element, top: element.scrollTop, left: element.scrollLeft}));
  container.innerHTML = html;
  for (const {element, top, left} of positions) {
    element.scrollTop = top;
    element.scrollLeft = left;
  }
  if (focusedKey) {
    const next = [...container.querySelectorAll('[data-server]')].find(node => node.dataset.server === focusedKey);
    (next || container).focus({preventScroll: true});
  }
}

export function serverDialogTrigger(trigger) {
  if (trigger?.isConnected || !trigger?.dataset?.server) return trigger;
  return [...document.querySelectorAll('#v2-site-shell [data-server]')]
    .find(node => node.dataset.server === trigger.dataset.server && node.getClientRects().length) || null;
}

// Shared presentation helpers; no server registry or rating policy lives here.
export function orderedServers(servers = []) {
  const pinned = ['hourly', 'main', 'sunset'];
  return [...servers].sort((a, b) =>
    (pinned.includes(a.key) ? pinned.indexOf(a.key) : 3) -
    (pinned.includes(b.key) ? pinned.indexOf(b.key) : 3));
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

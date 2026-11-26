export function subscriptionBadge(tier) {
  const badge = document.createElement('span');
  badge.className = 'project-support-badge';
  badge.dataset.tier = tier;
  const emblem = document.createElement('span');
  emblem.setAttribute('aria-hidden', 'true');
  const label = tier === 'supporter' ? 'Supporter' : tier.toUpperCase();
  badge.append(emblem, ' ' + label);
  return badge;
}

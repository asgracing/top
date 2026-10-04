// Only these pages participate in the alternative interface. API and asset URLs
// are deliberately outside this route map.
export const PREFIX = "/preview";
export const ROUTES = Object.freeze([
  "/", "/about/", "/join/", "/races/", "/cars/", "/fun-stats/",
  "/community/", "/news/", "/bans/", "/clubs/", "/teams/", "/teams/detail/",
  "/driver/", "/hourly/", "/hourly/championship/", "/hourly/championship/history/",
  "/events/", "/account/", "/account/settings/", "/moderation/", "/portal-ops/",
  "/asg-lab/", "/account/asg-lab/", "/portal-ops/asg-lab/", "/privacy/", "/cookies/",
  "/hourly/privacy/", "/hourly/cookies/", "/404.html",
  "/ru/", "/ru/about/", "/ru/join/", "/ru/races/", "/ru/cars/", "/ru/fun-stats/",
  "/ru/community/", "/ru/news/", "/ru/bans/", "/ru/teams/", "/ru/driver/",
  "/ru/hourly/", "/ru/hourly/championship/", "/ru/hourly/championship/history/",
]);
const pages = new Set(ROUTES);
export function classicPath(pathname) {
  return pathname === PREFIX ? "/" : pathname.startsWith(`${PREFIX}/`) ? pathname.slice(PREFIX.length) : pathname;
}
export function previewHref(href, base) {
  const url = new URL(href, base);
  if (url.origin !== new URL(base).origin || !pages.has(classicPath(url.pathname))) return url.href;
  url.pathname = `${PREFIX}${classicPath(url.pathname)}`;
  return url.href;
}
export function classicHref(href) {
  const url = new URL(href);
  url.pathname = classicPath(url.pathname);
  return url.href;
}

// Presentation only: this module does not read or alter API configuration.
export function pageLanguage(documentRef = document) {
  const language = documentRef.documentElement?.dataset?.pageLanguage;
  return language === "ru" || language === "en" ? language : null;
}

export function languageHref(href, locationRef) {
  const target = new URL(href, locationRef.href);
  target.search = locationRef.search;
  target.searchParams.delete("lang");
  target.hash = locationRef.hash;
  return target.href;
}

export function initializeLocalizedPage(documentRef = document, windowRef = window) {
  const language = pageLanguage(documentRef);
  if (!language) return;
  const links = [...documentRef.querySelectorAll("a.lang-btn[data-lang]")];
  for (const link of links) {
    link.href = languageHref(link.href, windowRef.location);
    link.classList.toggle("active", link.dataset.lang === language);
    if (link.dataset.lang === language) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
    link.addEventListener("click", () => {
      try { windowRef.localStorage.setItem("asgLang", link.dataset.lang); } catch { /* Storage is optional. */ }
    });
  }
  const requested = new URLSearchParams(windowRef.location.search).get("lang");
  const alternate = links.find(link => link.dataset.lang === requested);
  if (alternate && requested !== language) windowRef.location.replace(alternate.href);
}

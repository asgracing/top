(function () {
  const CONSENT_STORAGE_KEY = "asgPrivacyConsent";
  const CONSENT_COOKIE_NAME = "asg_privacy_consent";
  const CONSENT_VERSION = "2026-04-30";
  const CONSENT_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
  const METRIKA_ID = Number.parseInt(
    document.querySelector('meta[name="yandex-metrika-id"]')?.getAttribute("content") || "",
    10
  );
  const LEGAL_BASE_PATH =
    document.querySelector('meta[name="legal-base-path"]')?.getAttribute("content")?.trim() || "./";
  const PRIVACY_URL = `${LEGAL_BASE_PATH}privacy/`;
  const COOKIES_URL = `${LEGAL_BASE_PATH}cookies/`;
  const METRIKA_SRC = "https://mc.yandex.ru/metrika/tag.js";
  const METRIKA_OPTIONS = {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true
  };
  const LEGAL_PAGE_TEXTS = {
    cookies: {
      ru: {
        title: "Cookies и аналитика | ASG Racing",
        description: "Информация о cookies, localStorage и аналитике на сайтах ASG Racing.",
        backLink: "← На сайт ASG Racing",
        heroTitle: "Уведомление об использовании cookies, localStorage и аналитики",
        updatedAt: "Дата обновления: 30.04.2026",
        languageNotice: ""
      },
      en: {
        title: "Cookies and Analytics | ASG Racing",
        description: "Information about cookies, localStorage, and analytics on ASG Racing websites.",
        backLink: "← Back to ASG Racing",
        heroTitle: "Cookies, localStorage, and analytics notice",
        updatedAt: "Last updated: April 30, 2026",
        languageNotice: "The full legal text of this notice is currently maintained in Russian. The English interface is applied automatically, but the Russian text prevails until a full approved translation is published."
      }
    },
    privacy: {
      ru: {
        title: "Политика обработки персональных данных | ASG Racing",
        description: "Политика в отношении обработки персональных данных проекта ASG Racing.",
        backLink: "← На сайт ASG Racing",
        heroTitle: "Политика в отношении обработки персональных данных",
        updatedAt: "Дата обновления: 30.04.2026",
        languageNotice: ""
      },
      en: {
        title: "Privacy Policy | ASG Racing",
        description: "Privacy policy for personal data processing on the ASG Racing project.",
        backLink: "← Back to ASG Racing",
        heroTitle: "Privacy policy for personal data processing",
        updatedAt: "Last updated: April 30, 2026",
        languageNotice: "The full legal text of this policy is currently maintained in Russian. The English interface is applied automatically, but the Russian text prevails until a full approved translation is published."
      }
    }
  };
  const METRIKA_COOKIE_NAMES = [
    "_ym_d",
    "_ym_debug",
    "_ym_fa",
    "_ym_hostIndex",
    "_ym_isad",
    "_ym_metrika_enabled",
    "_ym_uid",
    "_ym_visorc_*",
    "_ym_ucs",
    "gdpr",
    "i",
    "is_gdpr",
    "is_gdpr_b",
    "usst",
    "yabs-sid",
    "yandexuid",
    "ymex",
    "yuidss"
  ];
  const texts = {
    ru: {
      bannerTitle: "Настройки cookies и аналитики",
      bannerBody:
        "Сайт использует cookie и Яндекс Метрику для статистики. Подробнее — в Политике ПДн и Cookies.",
      accept: "Разрешить аналитику",
      necessary: "Только необходимые",
      privacy: "Политика ПДн",
      cookies: "Cookies",
      settings: "Настройки cookies",
      footerNote: "",
      miniFooterTitle: "",
      miniFooterNote: ""
    },
    en: {
      bannerTitle: "Cookie and analytics settings",
      bannerBody:
        "This site uses cookies and Yandex Metrica for statistics. See the Privacy Policy and Cookies notice for details.",
      accept: "Allow analytics",
      necessary: "Required only",
      privacy: "Privacy Policy",
      cookies: "Cookies",
      settings: "Cookie settings",
      footerNote: "",
      miniFooterTitle: "",
      miniFooterNote: ""
    }
  };

  let metrikaLoaded = false;

  function getStoredLanguage() {
    try {
      const stored = localStorage.getItem("asgLang");
      return stored === "ru" || stored === "en" ? stored : "";
    } catch (error) {
      return "";
    }
  }

  function getLanguage() {
    const stored = getStoredLanguage();
    if (stored === "ru" || stored === "en") return stored;

    const htmlLang = String(document.documentElement.lang || "").trim().toLowerCase();
    if (htmlLang.startsWith("ru")) return "ru";

    const browserLang = String(navigator.language || "").trim().toLowerCase();
    return browserLang.startsWith("ru") ? "ru" : "en";
  }

  function t(key) {
    const lang = getLanguage();
    return texts[lang]?.[key] || texts.en[key] || "";
  }

  function getLegalPageKey() {
    const pathname = window.location.pathname.toLowerCase();
    if (pathname.includes("/cookies/")) return "cookies";
    if (pathname.includes("/privacy/")) return "privacy";
    return "";
  }

  function getLegalPageCopy() {
    const pageKey = getLegalPageKey();
    if (!pageKey) return null;
    const lang = getLanguage();
    return LEGAL_PAGE_TEXTS[pageKey]?.[lang] || LEGAL_PAGE_TEXTS[pageKey]?.ru || null;
  }

  function setStoredLanguage(lang) {
    if (lang !== "ru" && lang !== "en") return;
    try {
      localStorage.setItem("asgLang", lang);
    } catch (error) {
      // Ignore storage write failures; the page can still switch language for the current session.
    }
    document.documentElement.lang = lang;
  }

  function ensureLegalPageToolbar() {
    const layout = document.querySelector(".legal-layout");
    const backLink = document.querySelector(".legal-back-link");
    if (!layout || !backLink) return;

    let toolbar = layout.querySelector(".legal-page-toolbar");
    if (!toolbar) {
      toolbar = document.createElement("div");
      toolbar.className = "legal-page-toolbar";
      layout.insertBefore(toolbar, backLink);
      toolbar.append(backLink);
    }

    let switcher = toolbar.querySelector(".legal-lang-switch");
    if (!switcher) {
      switcher = document.createElement("div");
      switcher.className = "legal-lang-switch";
      switcher.setAttribute("aria-label", "Language switcher");
      ["ru", "en"].forEach(lang => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "legal-lang-btn";
        button.dataset.lang = lang;
        button.textContent = lang.toUpperCase();
        button.addEventListener("click", () => {
          if (getLanguage() === lang) return;
          setStoredLanguage(lang);
          rerenderUi();
        });
        switcher.append(button);
      });
      toolbar.append(switcher);
    }
  }

  function renderLegalLanguageWarning(copy) {
    const hero = document.querySelector(".legal-hero");
    if (!hero) return;

    let warning = document.querySelector(".legal-language-warning");
    if (!warning) {
      warning = document.createElement("section");
      warning.className = "legal-warning legal-language-warning";
      hero.insertAdjacentElement("afterend", warning);
    }

    warning.textContent = copy?.languageNotice || "";
    warning.hidden = !copy?.languageNotice;
  }

  function renderLegalPageChrome() {
    if (!document.body.classList.contains("legal-page")) return;
    const copy = getLegalPageCopy();
    if (!copy) return;

    ensureLegalPageToolbar();

    const descriptionMeta = document.querySelector('meta[name="description"]');
    const backLink = document.querySelector(".legal-back-link");
    const heroTitle = document.querySelector(".legal-hero h1");
    const updatedLabel = document.querySelector(".legal-updated");

    document.documentElement.lang = getLanguage();
    document.title = copy.title;
    if (descriptionMeta) descriptionMeta.setAttribute("content", copy.description);
    if (backLink) backLink.textContent = copy.backLink;
    if (heroTitle) heroTitle.textContent = copy.heroTitle;
    if (updatedLabel) updatedLabel.textContent = copy.updatedAt;

    document.querySelectorAll(".legal-lang-btn").forEach(button => {
      const active = button.dataset.lang === getLanguage();
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    renderLegalLanguageWarning(copy);
  }

  function getCookieDomain() {
    const hostname = window.location.hostname;
    if (!hostname || hostname === "localhost" || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":")) {
      return "";
    }
    return `; domain=.${hostname.replace(/^\./, "")}`;
  }

  function readCookie(name) {
    const prefix = `${name}=`;
    return document.cookie
      .split(";")
      .map(item => item.trim())
      .find(item => item.startsWith(prefix))
      ?.slice(prefix.length) || "";
  }

  function writeConsentCookie(payload) {
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(payload)}; max-age=${CONSENT_COOKIE_MAX_AGE}; path=/; SameSite=Lax${getCookieDomain()}`;
  }

  function parseConsent(rawValue) {
    if (!rawValue) return null;
    try {
      const parsed = JSON.parse(rawValue);
      if (!parsed || parsed.version !== CONSENT_VERSION || typeof parsed.analytics !== "boolean") {
        return null;
      }
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function readConsent() {
    const storageConsent = (() => {
      try {
        return parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY) || "");
      } catch (error) {
        return null;
      }
    })();
    if (storageConsent) return storageConsent;
    const cookieConsent = parseConsent(decodeURIComponent(readCookie(CONSENT_COOKIE_NAME) || ""));
    if (!cookieConsent) return null;
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(cookieConsent));
    } catch (error) {
      // Ignore storage write failures and keep cookie as the fallback source of truth.
    }
    return cookieConsent;
  }

  function saveConsent(analytics) {
    const payload = JSON.stringify({
      version: CONSENT_VERSION,
      analytics: Boolean(analytics),
      savedAt: new Date().toISOString()
    });
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, payload);
    } catch (error) {
      // Ignore storage write failures and rely on the consent cookie instead.
    }
    writeConsentCookie(payload);
  }

  function createButton(label, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    return button;
  }

  function createAnchor(label, href, className = "asg-legal-link") {
    const anchor = document.createElement("a");
    anchor.className = className;
    anchor.href = href;
    anchor.textContent = label;
    return anchor;
  }

  function appendLinkRow(container) {
    const links = document.createElement("div");
    links.className = "asg-legal-link-row";
    links.append(
      createAnchor(t("privacy"), PRIVACY_URL),
      createAnchor(t("cookies"), COOKIES_URL)
    );
    return links;
  }

  function appendSettingsButton(container) {
    const button = createButton(t("settings"), "asg-legal-link asg-legal-link-button");
    button.addEventListener("click", () => showBanner(true));
    container.append(button);
  }

  function cookieNameMatches(name) {
    return METRIKA_COOKIE_NAMES.some(pattern => {
      if (pattern.endsWith("*")) return name.startsWith(pattern.slice(0, -1));
      return name === pattern;
    });
  }

  function expireCookie(name, domain, path) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}; SameSite=Lax`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; SameSite=Lax`;
  }

  function clearMetrikaStorage() {
    const hostname = window.location.hostname;
    const hostParts = hostname.split(".").filter(Boolean);
    const cookieDomains = new Set(["", hostname]);

    for (let index = 0; index < hostParts.length - 1; index += 1) {
      cookieDomains.add(`.${hostParts.slice(index).join(".")}`);
    }

    document.cookie
      .split(";")
      .map(item => item.split("=")[0]?.trim())
      .filter(Boolean)
      .forEach(name => {
        if (!cookieNameMatches(name)) return;
        cookieDomains.forEach(domain => {
          expireCookie(name, domain, "/");
        });
      });

    Object.keys(localStorage).forEach(key => {
      if (cookieNameMatches(key) || key.startsWith("_ym")) {
        localStorage.removeItem(key);
      }
    });

    Object.keys(sessionStorage).forEach(key => {
      if (cookieNameMatches(key) || key.startsWith("_ym")) {
        sessionStorage.removeItem(key);
      }
    });
  }

  function initMetrika() {
    if (metrikaLoaded || !METRIKA_ID) return;

    window.ym =
      window.ym ||
      function () {
        (window.ym.a = window.ym.a || []).push(arguments);
      };
    window.ym.l = Number(new Date());

    if (![...document.scripts].some(script => script.src === METRIKA_SRC)) {
      const metrikaScript = document.createElement("script");
      metrikaScript.async = true;
      metrikaScript.src = METRIKA_SRC;
      document.head.appendChild(metrikaScript);
    }

    window.ym(METRIKA_ID, "init", { ...METRIKA_OPTIONS });
    metrikaLoaded = true;
  }

  function getBanner() {
    let banner = document.querySelector(".asg-legal-banner");
    if (banner) return banner;

    banner = document.createElement("section");
    banner.className = "asg-legal-banner";
    banner.hidden = true;
    document.body.appendChild(banner);
    return banner;
  }

  function showBanner(forceOpen = false) {
    const banner = getBanner();
    const consent = readConsent();
    const shouldShow = forceOpen || !consent;

    banner.innerHTML = "";

    const card = document.createElement("div");
    card.className = "asg-legal-banner-card";

    const title = document.createElement("h2");
    title.className = "asg-legal-banner-title";
    title.textContent = t("bannerTitle");

    const body = document.createElement("p");
    body.className = "asg-legal-banner-body";
    body.textContent = t("bannerBody");

    const links = document.createElement("div");
    links.className = "asg-legal-link-row";
    links.append(
      createAnchor(t("privacy"), PRIVACY_URL),
      createAnchor(t("cookies"), COOKIES_URL)
    );

    const actions = document.createElement("div");
    actions.className = "asg-legal-banner-actions";

    const acceptButton = createButton(t("accept"), "asg-legal-banner-btn asg-legal-banner-btn-primary");
    const necessaryButton = createButton(t("necessary"), "asg-legal-banner-btn asg-legal-banner-btn-secondary");

    acceptButton.addEventListener("click", () => applyConsent(true));
    necessaryButton.addEventListener("click", () => applyConsent(false));

    actions.append(acceptButton, necessaryButton);
    card.append(title, body, links, actions);
    banner.append(card);

    banner.hidden = !shouldShow;
    banner.classList.toggle("is-visible", shouldShow);
  }

  function hideBanner() {
    const banner = getBanner();
    banner.hidden = true;
    banner.classList.remove("is-visible");
  }

  function applyConsent(analytics) {
    const previous = readConsent();
    const hadAnalytics = Boolean(previous?.analytics);

    saveConsent(analytics);

    if (analytics) {
      initMetrika();
      hideBanner();
      return;
    }

    clearMetrikaStorage();
    hideBanner();

    if (hadAnalytics) {
      window.location.reload();
    }
  }

  function renderFooterLinks() {
    const footerLeft = document.querySelector(".footer-left");

    if (footerLeft) {
      let wrapper = footerLeft.querySelector(".asg-legal-footer-links");
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "asg-legal-footer-links";
        footerLeft.appendChild(wrapper);
      }

      wrapper.innerHTML = "";

      const row = document.createElement("div");
      row.className = "asg-legal-link-row";
      row.append(
        createAnchor(t("privacy"), PRIVACY_URL),
        createAnchor(t("cookies"), COOKIES_URL)
      );
      appendSettingsButton(row);

      const footerNote = t("footerNote");
      if (footerNote) {
        const note = document.createElement("div");
        note.className = "asg-legal-footer-note";
        note.textContent = footerNote;
        wrapper.append(note);
      }

      wrapper.append(row);
      return;
    }

    let miniFooter = document.querySelector(".asg-legal-mini-footer");
    if (!miniFooter) {
      miniFooter = document.createElement("footer");
      miniFooter.className = "asg-legal-mini-footer";
      miniFooter.innerHTML = `
        <div class="asg-legal-mini-footer-inner">
          <div class="asg-legal-mini-footer-copy">
            <div class="asg-legal-mini-footer-title"></div>
            <div class="asg-legal-mini-footer-note"></div>
          </div>
          <div class="asg-legal-mini-footer-links"></div>
        </div>
      `;

      const mountPoint = document.querySelector("main") || document.querySelector(".container");
      if (mountPoint?.parentElement) {
        mountPoint.parentElement.insertBefore(miniFooter, mountPoint.nextSibling);
      } else {
        document.body.appendChild(miniFooter);
      }
    }

    const titleText = t("miniFooterTitle");
    const noteText = t("miniFooterNote");
    const copy = miniFooter.querySelector(".asg-legal-mini-footer-copy");
    const title = miniFooter.querySelector(".asg-legal-mini-footer-title");
    const note = miniFooter.querySelector(".asg-legal-mini-footer-note");

    title.textContent = titleText;
    note.textContent = noteText;
    copy.hidden = !titleText && !noteText;

    const links = miniFooter.querySelector(".asg-legal-mini-footer-links");
    links.innerHTML = "";
    links.append(
      createAnchor(t("privacy"), PRIVACY_URL),
      createAnchor(t("cookies"), COOKIES_URL)
    );
    appendSettingsButton(links);
  }

  function rerenderUi() {
    renderLegalPageChrome();
    renderFooterLinks();
    showBanner(Boolean(document.querySelector(".asg-legal-banner.is-visible")));
  }

  function init() {
    renderLegalPageChrome();
    renderFooterLinks();

    const consent = readConsent();
    if (consent) {
      if (consent.analytics) initMetrika();
      showBanner(false);
    } else {
      showBanner(true);
    }

    const htmlObserver = new MutationObserver(() => rerenderUi());
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"]
    });

    window.addEventListener("storage", event => {
      if (event.key === "asgLang") {
        rerenderUi();
      }
    });
  }

  window.ASGLegal = {
    getUrls() {
      return {
        privacy: PRIVACY_URL,
        cookies: COOKIES_URL
      };
    },
    openSettings() {
      showBanner(true);
    },
    hasAnalyticsConsent() {
      return Boolean(readConsent()?.analytics);
    }
  };

  init();
})();

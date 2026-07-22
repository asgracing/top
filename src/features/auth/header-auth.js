const DEFAULT_AUTH_BASE_URL = "https://auth.asgracing.ru";
const AVATAR_HOSTS = new Set(["steamcdn-a.akamaihd.net"]);

const COPY = Object.freeze({
  en: {
    login: "Sign in with Steam",
    loginShort: "Steam",
    loading: "Checking sign-in",
    unavailable: "Sign-in unavailable",
    retry: "Retry",
    elo: "ELO",
    sr: "SR",
    profile: "Driver profile",
    logout: "Sign out",
    unlinked: "Driver profile not found yet",
    account: "ASG Racing account",
    menu: "Open account menu",
    avatar: "Steam avatar",
    logoutFailed: "Could not sign out. Try again."
  },
  ru: {
    login: "Войти через Steam",
    loginShort: "Steam",
    loading: "Проверяем вход",
    unavailable: "Авторизация недоступна",
    retry: "Повторить",
    elo: "ELO",
    sr: "SR",
    profile: "Профиль пилота",
    logout: "Выйти",
    unlinked: "Профиль пилота пока не найден",
    account: "Кабинет ASG Racing",
    menu: "Открыть меню кабинета",
    avatar: "Аватар Steam",
    logoutFailed: "Не удалось выйти. Попробуйте ещё раз."
  }
});

function safeText(value, maxLength = 160) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safeMetric(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function safeAvatarUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.port || url.username || url.password) return null;
    if (!AVATAR_HOSTS.has(host) && !host.endsWith(".steamstatic.com")) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function safeDriverProfileUrl(value) {
  const raw = safeText(value, 512);
  if (!raw.startsWith("/driver/?id=")) return null;
  try {
    const url = new URL(raw, "https://asgracing.ru");
    if (url.origin !== "https://asgracing.ru" || url.pathname !== "/driver/") return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function normalizeAuthPayload(payload) {
  if (!payload || payload.authenticated !== true) return { authenticated: false };
  const rawDriver = payload.linked === true && payload.driver && typeof payload.driver === "object"
    ? {
        publicId: safeText(payload.driver.public_id, 160),
        displayName: safeText(payload.driver.display_name, 160),
        profileUrl: safeDriverProfileUrl(payload.driver.profile_url),
        elo: safeMetric(payload.driver.elo),
        sr: safeMetric(payload.driver.sr)
      }
    : null;
  const driver = rawDriver?.publicId && rawDriver.displayName && rawDriver.profileUrl ? rawDriver : null;
  const steam = payload.steam && typeof payload.steam === "object"
    ? {
        personaName: safeText(payload.steam.persona_name, 128),
        avatarUrl: safeAvatarUrl(payload.steam.avatar_url)
      }
    : { personaName: "", avatarUrl: null };
  return {
    authenticated: true,
    linked: Boolean(driver),
    driver,
    steam,
    csrfToken: safeText(payload.csrf_token, 256)
  };
}

export function buildAuthReturnPath(locationRef = globalThis.location) {
  const pathname = String(locationRef?.pathname || "/");
  const search = String(locationRef?.search || "");
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.includes("\\")) return "/";
  const value = `${pathname}${search}`;
  return value.length <= 1800 ? value : pathname.slice(0, 1800) || "/";
}

function currentLanguage(documentRef, windowRef) {
  const active = documentRef.querySelector(".lang-btn.active[data-lang]")?.dataset.lang;
  if (active === "ru" || active === "en") return active;
  const htmlLanguage = String(documentRef.documentElement?.lang || "").toLowerCase();
  if (htmlLanguage.startsWith("ru")) return "ru";
  try {
    const stored = windowRef.localStorage?.getItem("asgLang");
    if (stored === "ru" || stored === "en") return stored;
  } catch {}
  return "en";
}

function metricLabel(value, digits = 0) {
  if (value === null) return "—";
  return digits ? value.toFixed(digits).replace(/\.0$/, "") : String(Math.round(value));
}

function makeElement(documentRef, tag, className, text = "") {
  const element = documentRef.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function ensureStylesheet(documentRef) {
  if (documentRef.querySelector("link[data-asg-auth-header-style]")) return;
  const link = documentRef.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("../../../styles/components/auth-header.css", import.meta.url).href;
  link.dataset.asgAuthHeaderStyle = "true";
  documentRef.head.appendChild(link);
}

export function createAuthHeaderController({
  documentRef = document,
  windowRef = window,
  fetchImpl = globalThis.fetch,
  authBaseUrl = DEFAULT_AUTH_BASE_URL
} = {}) {
  const actions = documentRef.querySelector(".top-nav-actions");
  if (!actions || typeof fetchImpl !== "function") return null;
  if (actions.querySelector(".auth-header")) return null;
  const baseUrl = String(authBaseUrl).replace(/\/+$/, "");
  let state = { status: "loading", auth: { authenticated: false }, message: "" };
  let destroyed = false;
  let requestController = null;

  ensureStylesheet(documentRef);
  const root = makeElement(documentRef, "div", "auth-header");
  root.dataset.authState = "loading";
  actions.appendChild(root);

  const closeMenu = () => {
    const menu = root.querySelector(".auth-header-menu");
    const toggle = root.querySelector(".auth-header-account");
    if (menu) menu.hidden = true;
    toggle?.setAttribute("aria-expanded", "false");
  };

  const translate = key => COPY[currentLanguage(documentRef, windowRef)]?.[key] || COPY.en[key] || key;

  function renderAvatar(auth, name) {
    const shell = makeElement(documentRef, "span", "auth-header-avatar");
    if (auth.steam?.avatarUrl) {
      const image = makeElement(documentRef, "img", "auth-header-avatar-image");
      image.src = auth.steam.avatarUrl;
      image.alt = translate("avatar");
      image.referrerPolicy = "no-referrer";
      shell.appendChild(image);
    } else {
      const initial = [...(name || "A")][0]?.toUpperCase() || "A";
      shell.textContent = initial;
      shell.setAttribute("aria-hidden", "true");
    }
    return shell;
  }

  function renderAnonymous() {
    const link = makeElement(documentRef, "a", "auth-header-login");
    const returnPath = buildAuthReturnPath(windowRef.location);
    link.href = `${baseUrl}/v1/auth/steam/start?return_path=${encodeURIComponent(returnPath)}`;
    link.setAttribute("aria-label", translate("login"));
    const icon = makeElement(documentRef, "span", "auth-header-steam-icon", "S");
    icon.setAttribute("aria-hidden", "true");
    link.append(icon, makeElement(documentRef, "span", "auth-header-login-label", translate("login")));
    root.appendChild(link);
  }

  function renderAccount(auth) {
    const name = auth.driver?.displayName || auth.steam?.personaName || translate("account");
    const toggle = makeElement(documentRef, "button", "auth-header-account");
    toggle.type = "button";
    toggle.setAttribute("aria-haspopup", "menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", translate("menu"));
    const copy = makeElement(documentRef, "span", "auth-header-account-copy");
    copy.appendChild(makeElement(documentRef, "span", "auth-header-name", name));
    const metrics = makeElement(documentRef, "span", "auth-header-metrics");
    metrics.append(
      makeElement(documentRef, "span", "auth-header-metric", `${translate("elo")} ${metricLabel(auth.driver?.elo ?? null)}`),
      makeElement(documentRef, "span", "auth-header-metric", `${translate("sr")} ${metricLabel(auth.driver?.sr ?? null, 2)}`)
    );
    copy.appendChild(metrics);
    toggle.append(renderAvatar(auth, name), copy, makeElement(documentRef, "span", "auth-header-caret", "▾"));

    const menu = makeElement(documentRef, "div", "auth-header-menu");
    menu.hidden = true;
    menu.setAttribute("role", "menu");
    if (auth.driver?.profileUrl) {
      const profile = makeElement(documentRef, "a", "auth-header-menu-item", translate("profile"));
      profile.href = auth.driver.profileUrl;
      profile.setAttribute("role", "menuitem");
      menu.appendChild(profile);
    } else {
      const note = makeElement(documentRef, "div", "auth-header-unlinked", translate("unlinked"));
      menu.appendChild(note);
    }
    const logout = makeElement(documentRef, "button", "auth-header-menu-item auth-header-logout", translate("logout"));
    logout.type = "button";
    logout.setAttribute("role", "menuitem");
    logout.addEventListener("click", () => void signOut(auth.csrfToken, logout));
    menu.appendChild(logout);
    toggle.addEventListener("click", event => {
      event.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", event => event.stopPropagation());
    root.append(toggle, menu);
  }

  function render() {
    closeMenu();
    root.replaceChildren();
    root.dataset.authState = state.status;
    if (state.status === "loading") {
      const loading = makeElement(documentRef, "span", "auth-header-loading", translate("loading"));
      loading.setAttribute("role", "status");
      root.appendChild(loading);
      return;
    }
    if (state.status === "error") {
      const retry = makeElement(documentRef, "button", "auth-header-login auth-header-retry", translate("retry"));
      retry.type = "button";
      retry.title = translate("unavailable");
      retry.addEventListener("click", () => void refresh());
      root.appendChild(retry);
      return;
    }
    if (state.auth.authenticated) renderAccount(state.auth);
    else renderAnonymous();
  }

  async function refresh() {
    requestController?.abort();
    requestController = new AbortController();
    state = { status: "loading", auth: { authenticated: false }, message: "" };
    render();
    try {
      const response = await fetchImpl(`${baseUrl}/v1/me`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: requestController.signal
      });
      if (!response.ok) throw new Error(`auth_me_http_${response.status}`);
      const auth = normalizeAuthPayload(await response.json());
      if (!destroyed) {
        state = { status: "ready", auth, message: "" };
        render();
      }
    } catch (error) {
      if (!destroyed && error?.name !== "AbortError") {
        state = { status: "error", auth: { authenticated: false }, message: String(error) };
        render();
      }
    }
  }

  async function signOut(csrfToken, button) {
    if (!csrfToken || button.disabled) return;
    button.disabled = true;
    try {
      const response = await fetchImpl(`${baseUrl}/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "X-CSRF-Token": csrfToken }
      });
      if (!response.ok) throw new Error(`auth_logout_http_${response.status}`);
      state = { status: "ready", auth: { authenticated: false }, message: "" };
      render();
    } catch {
      button.disabled = false;
      button.title = translate("logoutFailed");
    }
  }

  const onDocumentClick = event => {
    if (!root.contains(event.target)) closeMenu();
  };
  const onKeydown = event => {
    if (event.key === "Escape") closeMenu();
  };
  const onLanguageClick = event => {
    if (event.target.closest?.(".lang-btn[data-lang]")) windowRef.setTimeout(render, 0);
  };
  documentRef.addEventListener("click", onDocumentClick);
  documentRef.addEventListener("keydown", onKeydown);
  documentRef.addEventListener("click", onLanguageClick);
  void refresh();

  return {
    refresh,
    destroy() {
      destroyed = true;
      requestController?.abort();
      documentRef.removeEventListener("click", onDocumentClick);
      documentRef.removeEventListener("keydown", onKeydown);
      documentRef.removeEventListener("click", onLanguageClick);
      root.remove();
    }
  };
}

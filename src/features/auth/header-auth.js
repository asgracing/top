const DEFAULT_AUTH_BASE_URL = "https://auth.asgracing.ru";
const AVATAR_HOSTS = new Set(["steamcdn-a.akamaihd.net"]);

const COPY = Object.freeze({
  en: {
    login: "Sign in with Steam",
    loginShort: "Steam",
    loading: "Checking sign-in",
    unavailable: "Sign-in unavailable",
    retry: "Retry",
    rank: "Rank",
    elo: "ELO",
    sr: "SR",
    profile: "Driver profile",
    discord: "Discord",
    discordLink: "Link Discord",
    discordLinked: "Discord linked",
    discordPending: "Role update pending",
    discordSynced: "Roles are up to date",
    discordError: "Role update needs attention",
    discordUnlinkPending: "Removing rating roles",
    discordSync: "Retry role update",
    discordUnlink: "Unlink Discord",
    discordLinkFailed: "Could not start Discord linking. Try again.",
    discordUnlinkFailed: "Could not unlink Discord. Try again.",
    logout: "Sign out",
    unlinked: "Driver profile not found yet",
    account: "ASG Racing account",
    menu: "Open account menu",
    avatar: "Steam avatar",
    logoutFailed: "Could not sign out. Try again."
  },
  ru: {
    rank: "Rank",
    login: "Войти через Steam",
    loginShort: "Steam",
    loading: "Проверяем вход",
    unavailable: "Авторизация недоступна",
    retry: "Повторить",
    elo: "ELO",
    sr: "SR",
    profile: "Профиль пилота",
    discord: "Discord",
    discordLink: "Привязать Discord",
    discordLinked: "Discord привязан",
    discordPending: "Обновление ролей ожидается",
    discordSynced: "Роли актуальны",
    discordError: "Нужно обновить роли",
    discordUnlinkPending: "Удаляем рейтинговые роли",
    discordSync: "Повторить обновление ролей",
    discordUnlink: "Отвязать Discord",
    discordLinkFailed: "Не удалось начать привязку Discord. Попробуйте ещё раз.",
    discordUnlinkFailed: "Не удалось отвязать Discord. Попробуйте ещё раз.",
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

export function eloCategoryId(value) {
  const rating = safeMetric(value);
  if (rating === null) return null;
  if (rating >= 1350) return 1;
  if (rating >= 1250) return 2;
  if (rating >= 1150) return 3;
  if (rating >= 1050) return 4;
  if (rating >= 950) return 5;
  return 6;
}

export function srCategory(value, explicit = "") {
  const normalized = safeText(explicit, 1).toUpperCase();
  if (["A", "B", "C"].includes(normalized)) return normalized;
  const rating = safeMetric(value);
  if (rating === null) return null;
  if (rating >= 5) return "A";
  if (rating >= 2.5) return "B";
  return "C";
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

export function safeDiscordAuthorizationUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (
      url.protocol !== "https:"
      || url.hostname !== "discord.com"
      || url.port
      || url.username
      || url.password
      || url.pathname !== "/oauth2/authorize"
    ) return null;
    return url.href;
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
        rank: safeMetric(payload.driver.rank),
        elo: safeMetric(payload.driver.elo),
        sr: safeMetric(payload.driver.sr),
        srCategory: srCategory(payload.driver.sr, payload.driver.sr_category)
      }
    : null;
  const driver = rawDriver?.publicId && rawDriver.displayName && rawDriver.profileUrl ? rawDriver : null;
  const steam = payload.steam && typeof payload.steam === "object"
    ? {
        personaName: safeText(payload.steam.persona_name, 128),
        avatarUrl: safeAvatarUrl(payload.steam.avatar_url)
      }
    : { personaName: "", avatarUrl: null };
  const rawDiscord = payload.discord && typeof payload.discord === "object"
    ? payload.discord
    : null;
  const syncStatus = ["pending", "synced", "error", "unlink_pending"].includes(rawDiscord?.sync_status)
    ? rawDiscord.sync_status
    : null;
  const discord = {
    linked: rawDiscord?.linked === true,
    syncStatus
  };
  return {
    authenticated: true,
    linked: Boolean(driver),
    driver,
    steam,
    discord,
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
  link.href = new URL("../../../styles/components/auth-header.css?v=20260722discord3", import.meta.url).href;
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
    const shell = makeElement(documentRef, "span", "auth-header-avatar pilot-profile-avatar");
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
    const toggle = makeElement(documentRef, "button", "auth-header-account pilot-profile-trigger");
    const categoryId = eloCategoryId(auth.driver?.elo);
    const safetyCategory = auth.driver?.srCategory || null;
    if (categoryId) root.classList.add(`elo-cat-${categoryId}`);
    if (safetyCategory) root.classList.add(`sr-cat-${safetyCategory}`);
    toggle.type = "button";
    toggle.setAttribute("aria-haspopup", "menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", translate("menu"));
    toggle.title = name;
    const copy = makeElement(documentRef, "span", "auth-header-account-copy pilot-profile-content");
    copy.appendChild(makeElement(documentRef, "span", "auth-header-name pilot-profile-name", name));
    const metrics = makeElement(documentRef, "span", "auth-header-metrics pilot-profile-ratings");
    const makeMetricBadge = (modifier, label) => {
      const badge = makeElement(
        documentRef,
        "span",
        `auth-header-metric pilot-rating-badge pilot-rating-badge--${modifier}`
      );
      badge.appendChild(makeElement(documentRef, "span", "pilot-rating-badge-text", label));
      return badge;
    };
    const rank = auth.driver?.rank;
    const rankMetric = makeMetricBadge(
      "rank",
      `${translate("rank")} ${rank === null ? "—" : `#${metricLabel(rank)}`}`
    );
    const eloMetric = makeMetricBadge("elo", `${translate("elo")} ${metricLabel(auth.driver?.elo ?? null)}`);
    const safetyMetric = makeMetricBadge("sr", `${translate("sr")} ${metricLabel(auth.driver?.sr ?? null, 2)}`);
    metrics.append(rankMetric, eloMetric, safetyMetric);
    copy.appendChild(metrics);
    toggle.append(
      renderAvatar(auth, name),
      copy,
      makeElement(documentRef, "span", "auth-header-caret pilot-profile-chevron", "▾")
    );

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
    if (auth.linked) {
      const discordSection = makeElement(documentRef, "div", "auth-header-discord");
      const discordHeading = makeElement(
        documentRef,
        "div",
        "auth-header-discord-heading",
        translate("discord")
      );
      discordSection.appendChild(discordHeading);
      if (auth.discord?.linked) {
        const statusKey = {
          synced: "discordSynced",
          error: "discordError",
          unlink_pending: "discordUnlinkPending"
        }[auth.discord.syncStatus] || "discordPending";
        const status = makeElement(
          documentRef,
          "div",
          `auth-header-discord-status auth-header-discord-status--${auth.discord.syncStatus || "pending"}`,
          translate(statusKey)
        );
        discordSection.appendChild(status);
        if (auth.discord.syncStatus !== "unlink_pending") {
          if (auth.discord.syncStatus === "error") {
            const sync = makeElement(
              documentRef,
              "button",
              "auth-header-menu-item auth-header-discord-sync",
              translate("discordSync")
            );
            sync.type = "button";
            sync.setAttribute("role", "menuitem");
            sync.addEventListener("click", () => void syncDiscord(auth.csrfToken, sync));
            discordSection.appendChild(sync);
          }
          const unlink = makeElement(
            documentRef,
            "button",
            "auth-header-menu-item auth-header-discord-unlink",
            translate("discordUnlink")
          );
          unlink.type = "button";
          unlink.setAttribute("role", "menuitem");
          unlink.addEventListener("click", () => void unlinkDiscord(auth.csrfToken, unlink));
          discordSection.appendChild(unlink);
        }
      } else {
        const link = makeElement(
          documentRef,
          "button",
          "auth-header-menu-item auth-header-discord-link",
          translate("discordLink")
        );
        link.type = "button";
        link.setAttribute("role", "menuitem");
        link.addEventListener("click", () => void linkDiscord(auth.csrfToken, link));
        discordSection.appendChild(link);
      }
      menu.appendChild(discordSection);
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
    root.classList.remove(
      "elo-cat-1", "elo-cat-2", "elo-cat-3", "elo-cat-4", "elo-cat-5", "elo-cat-6",
      "sr-cat-A", "sr-cat-B", "sr-cat-C"
    );
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

  async function linkDiscord(csrfToken, button) {
    if (!csrfToken || button.disabled) return;
    button.disabled = true;
    try {
      const returnPath = buildAuthReturnPath(windowRef.location);
      const response = await fetchImpl(
        `${baseUrl}/v1/auth/discord/start?return_path=${encodeURIComponent(returnPath)}`,
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json", "X-CSRF-Token": csrfToken }
        }
      );
      if (!response.ok) throw new Error(`auth_discord_start_http_${response.status}`);
      const authorizationUrl = safeDiscordAuthorizationUrl(
        (await response.json())?.authorization_url
      );
      if (!authorizationUrl) throw new Error("auth_discord_authorization_url_invalid");
      windowRef.location.assign(authorizationUrl);
    } catch {
      button.disabled = false;
      button.title = translate("discordLinkFailed");
    }
  }

  async function unlinkDiscord(csrfToken, button) {
    if (!csrfToken || button.disabled) return;
    button.disabled = true;
    try {
      const response = await fetchImpl(`${baseUrl}/v1/auth/discord/unlink`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "X-CSRF-Token": csrfToken }
      });
      if (!response.ok) throw new Error(`auth_discord_unlink_http_${response.status}`);
      await refresh();
    } catch {
      button.disabled = false;
      button.title = translate("discordUnlinkFailed");
    }
  }

  async function syncDiscord(csrfToken, button) {
    if (!csrfToken || button.disabled) return;
    button.disabled = true;
    try {
      const response = await fetchImpl(`${baseUrl}/v1/auth/discord/sync`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "X-CSRF-Token": csrfToken }
      });
      if (!response.ok) throw new Error(`auth_discord_sync_http_${response.status}`);
      await refresh();
    } catch {
      button.disabled = false;
      button.title = translate("discordLinkFailed");
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

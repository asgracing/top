const DEFAULT_SETTINGS = Object.freeze({ showAvatar: true, showRaceNumber: true });

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function safeDriverOverlayUrl(value, siteOrigin = "https://asgracing.ru") {
  try {
    const url = new URL(String(value || ""));
    if (url.origin !== siteOrigin || url.pathname !== "/overlay/driver/" || url.search) return null;
    if (!/^#token=v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(url.hash)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function normalizeDriverOverlayState(payload) {
  const settings = payload?.settings && typeof payload.settings === "object"
    ? payload.settings
    : {};
  const enabled = payload?.enabled === true;
  return {
    available: payload?.available !== false,
    enabled,
    url: enabled ? safeDriverOverlayUrl(payload?.url) : null,
    settings: {
      showAvatar: settings.show_avatar !== false,
      showRaceNumber: settings.show_race_number !== false
    }
  };
}

async function readJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof payload?.detail === "string" ? payload.detail : `http_${response.status}`);
    error.code = typeof payload?.detail === "string" ? payload.detail : `http_${response.status}`;
    throw error;
  }
  return payload;
}

export function mountDriverOverlayManager({
  button,
  panel,
  authBaseUrl,
  csrfToken,
  copy,
  confirmFn = message => window.confirm(message)
}) {
  if (!button || !panel || !csrfToken) return () => {};
  let state = { available: true, enabled: false, url: null, settings: DEFAULT_SETTINGS };
  let loading = false;
  let opened = false;

  const request = async (path, options = {}) => readJson(await fetch(`${authBaseUrl}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.method === "POST" ? { "X-CSRF-Token": csrfToken } : {}),
      ...(options.headers || {})
    }
  }));

  const status = (message, kind = "") => {
    const output = panel.querySelector("[data-overlay-status]");
    if (!output) return;
    output.textContent = message;
    output.dataset.kind = kind;
  };

  const render = () => {
    button.setAttribute("aria-expanded", String(opened));
    panel.hidden = !opened;
    if (!opened) return;
    if (loading) {
      panel.innerHTML = `<p class="account-muted">${escapeHtml(copy.loading)}</p>`;
      return;
    }
    if (!state.available) {
      panel.innerHTML = `<p class="account-muted">${escapeHtml(copy.unavailable)}</p>`;
      return;
    }
    panel.innerHTML = `
      <div class="account-overlay-heading">
        <div><h2>${escapeHtml(copy.title)}</h2><p class="account-muted">${escapeHtml(copy.help)}</p></div>
        <span class="account-overlay-state" data-enabled="${state.enabled}">${escapeHtml(state.enabled ? copy.active : copy.inactive)}</span>
      </div>
      ${state.enabled && state.url ? `
        <label class="account-overlay-url-label" for="driver-overlay-url">${escapeHtml(copy.urlLabel)}</label>
        <div class="account-overlay-url-row">
          <input id="driver-overlay-url" type="text" readonly value="${escapeHtml(state.url)}" spellcheck="false">
          <button class="account-action account-action--primary" type="button" data-overlay-copy>${escapeHtml(copy.copy)}</button>
        </div>
        <p class="account-overlay-secret">${escapeHtml(copy.secret)}</p>
        <fieldset class="account-overlay-options">
          <legend>${escapeHtml(copy.options)}</legend>
          <label><input type="checkbox" data-overlay-avatar${state.settings.showAvatar ? " checked" : ""}> <span>${escapeHtml(copy.showAvatar)}</span></label>
          <label><input type="checkbox" data-overlay-number${state.settings.showRaceNumber ? " checked" : ""}> <span>${escapeHtml(copy.showRaceNumber)}</span></label>
        </fieldset>
        <div class="account-actions account-overlay-actions">
          <button class="account-action" type="button" data-overlay-save>${escapeHtml(copy.save)}</button>
          <button class="account-action" type="button" data-overlay-rotate>${escapeHtml(copy.rotate)}</button>
          <button class="account-action account-action--danger" type="button" data-overlay-revoke>${escapeHtml(copy.revoke)}</button>
        </div>
      ` : `<button class="account-action account-action--primary" type="button" data-overlay-enable>${escapeHtml(copy.enable)}</button>`}
      <div class="account-message account-overlay-message" data-overlay-status role="status" aria-live="polite"></div>`;
    bindPanel();
  };

  const mutate = async (path, body) => {
    panel.querySelectorAll("button, input").forEach(control => { control.disabled = true; });
    try {
      state = normalizeDriverOverlayState(await request(path, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body)
      }));
      render();
      status(copy.saved, "success");
    } catch {
      panel.querySelectorAll("button, input").forEach(control => { control.disabled = false; });
      status(copy.failed, "error");
    }
  };

  function bindPanel() {
    panel.querySelector("[data-overlay-enable]")?.addEventListener("click", () => {
      void mutate("/v1/me/driver-overlay/enable");
    });
    panel.querySelector("[data-overlay-copy]")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(state.url);
        status(copy.copied, "success");
      } catch {
        panel.querySelector("#driver-overlay-url")?.select();
        status(copy.copyFailed, "error");
      }
    });
    panel.querySelector("[data-overlay-save]")?.addEventListener("click", () => {
      void mutate("/v1/me/driver-overlay/settings", {
        show_avatar: panel.querySelector("[data-overlay-avatar]")?.checked === true,
        show_race_number: panel.querySelector("[data-overlay-number]")?.checked === true
      });
    });
    panel.querySelector("[data-overlay-rotate]")?.addEventListener("click", () => {
      if (confirmFn(copy.rotateConfirm)) void mutate("/v1/me/driver-overlay/rotate");
    });
    panel.querySelector("[data-overlay-revoke]")?.addEventListener("click", () => {
      if (confirmFn(copy.revokeConfirm)) void mutate("/v1/me/driver-overlay/revoke");
    });
  }

  const open = async () => {
    opened = !opened;
    if (!opened) {
      render();
      return;
    }
    loading = true;
    render();
    try {
      state = normalizeDriverOverlayState(await request("/v1/me/driver-overlay"));
    } catch {
      state = { available: false, enabled: false, url: null, settings: DEFAULT_SETTINGS };
    } finally {
      loading = false;
      render();
    }
  };
  button.addEventListener("click", open);
  return () => button.removeEventListener("click", open);
}

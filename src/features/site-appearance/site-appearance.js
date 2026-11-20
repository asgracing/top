const authOrigin = "https://auth.asgracing.ru";
const refreshDelay = 60_000;
const previewAttribute = "data-asg-new-year-preview";
const assetVersion = "20261120wintercanvas1";
let activeTheme;
let themeRequest;
let wanted = false;

function setAppearance(enabled) {
  wanted = enabled;
  if (!enabled) {
    activeTheme?.destroy();
    activeTheme = undefined;
    return;
  }
  themeRequest ??= import(`./new-year.js?v=${assetVersion}`).catch(error => {
    themeRequest = undefined;
    throw error;
  });
  void themeRequest.then(async ({ mountNewYear }) => {
    if (!wanted || activeTheme) return;
    const theme = mountNewYear(`/src/features/site-appearance/new-year.css?v=${assetVersion}`);
    activeTheme = theme;
    try {
      await theme.ready;
    } catch {
      if (activeTheme === theme) activeTheme = undefined;
    }
  }).catch(() => {});
}

const preview = window.frameElement;
if (preview?.hasAttribute(previewAttribute)) {
  document.body.inert = true;
  const updatePreview = () => setAppearance(preview.getAttribute(previewAttribute) === "on");
  new MutationObserver(updatePreview).observe(preview, { attributeFilter: [previewAttribute] });
  updatePreview();
} else {
  let checkedAt = 0;
  let ticket = 0;
  async function refresh(force = false) {
    if (document.hidden || (!force && Date.now() - checkedAt < refreshDelay)) return;
    checkedAt = Date.now();
    const request = ++ticket;
    let enabled = false;
    try {
      const response = await fetch(`${authOrigin}/v1/public/site-appearance`, {
        credentials: "omit",
        cache: force ? "reload" : "default",
        signal: AbortSignal.timeout(5000)
      });
      enabled = response.ok && (await response.json()).new_year_enabled === true;
    } catch {
      // An unavailable or invalid configuration falls back to the base site.
    }
    if (request === ticket) setAppearance(enabled);
  }

  window.addEventListener("asg-appearance-refresh", () => void refresh(true));
  window.addEventListener("pageshow", () => void refresh());
  document.addEventListener("visibilitychange", () => void refresh());
  window.setInterval(refresh, refreshDelay);
  void refresh();
}

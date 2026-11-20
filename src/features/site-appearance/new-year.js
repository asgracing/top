import { mountGarland } from "./new-year-garland.js?v=20261120winterhover1";

function decoration(className) {
  const element = document.createElement("div");
  element.className = className;
  element.setAttribute("aria-hidden", "true");
  return element;
}

const flakeCount = 36;

function makeSnow() {
  const snow = decoration("asg-new-year-snow");
  for (let index = 0; index < flakeCount; index++) {
    const flake = document.createElement("span");
    const depth = index % 5;
    const distant = depth < 2;
    const duration = 28 - depth * 3 + Math.random() * 7;
    const sway = (16 + Math.random() * 20) * (index % 2 === 0 ? 1 : -1);
    flake.style.setProperty("--x", `${(index + Math.random()) / flakeCount * 100}%`);
    flake.style.setProperty("--size", `${distant ? 2 + depth + Math.random() * 2 : 5 + depth * 3 + Math.random() * 4}px`);
    flake.style.setProperty("--alpha", String(0.24 + depth * 0.09 + Math.random() * 0.15));
    flake.style.setProperty("--fall", `${duration}s`);
    flake.style.setProperty("--fall-phase", `-${Math.random() * duration}s`);
    flake.style.setProperty("--sway", `${sway}px`);
    // The old stylesheet still uses this property and the inner sprite on cached pages.
    flake.style.setProperty("--wind", "0px");
    flake.style.setProperty("--crystal", `${index % 3 * 50}%`);
    if (distant) flake.className = "asg-new-year-grain";
    flake.append(document.createElement("i"));
    snow.append(flake);
  }
  return snow;
}

export function mountNewYear(stylesheetUrl) {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = stylesheetUrl;
  const root = document.documentElement;
  let snow;
  let frost;
  let removeGarland;
  let disposed = false;

  const syncVisibility = () => {
    root.toggleAttribute("data-asg-new-year-paused", document.hidden);
  };

  const ready = new Promise((resolve, reject) => {
    stylesheet.onload = () => {
      if (!disposed) {
        const header = document.querySelector("#v2-site-shell > header, header:not([hidden]), .top-nav");
        const footer = document.querySelector("#v2-site-shell > footer, footer:not([hidden])");
        removeGarland = mountGarland(header || document.body);
        frost = decoration("asg-new-year-frost");
        (footer || document.body).append(frost);
        root.setAttribute("data-asg-new-year", "");
        snow = makeSnow();
        document.body.append(snow);
        document.addEventListener("visibilitychange", syncVisibility);
        syncVisibility();
      }
      resolve();
    };
    stylesheet.onerror = () => {
      stylesheet.remove();
      reject(new Error("New Year stylesheet unavailable"));
    };
  });
  document.head.append(stylesheet);

  return {
    ready,
    destroy() {
      disposed = true;
      document.removeEventListener("visibilitychange", syncVisibility);
      snow?.remove();
      frost?.remove();
      removeGarland?.();
      root.removeAttribute("data-asg-new-year");
      root.removeAttribute("data-asg-new-year-paused");
      stylesheet.remove();
    }
  };
}

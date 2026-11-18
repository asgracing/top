import { mountGarland } from "./new-year-garland.js?v=20261118newyear7";

function decoration(className) {
  const element = document.createElement("div");
  element.className = className;
  element.setAttribute("aria-hidden", "true");
  return element;
}

function makeSnow() {
  const snow = decoration("asg-new-year-snow");
  for (let index = 0; index < 36; index++) {
    const flake = document.createElement("span");
    const surface = document.createElement("i");
    const depth = index % 5;
    const distant = depth < 2;
    const duration = 28 - depth * 3 + Math.random() * 7;
    const swayPeriod = 4.4 + Math.random() * 5.4;
    const sway = (10 + depth * 4 + Math.random() * 10) * (index % 2 === 0 ? 1 : -1);
    flake.style.setProperty("--x", `${(index + Math.random()) / 36 * 100}%`);
    flake.style.setProperty("--size", `${distant ? 2 + depth + Math.random() * 2 : 5 + depth * 3 + Math.random() * 4}px`);
    flake.style.setProperty("--alpha", String(0.24 + depth * 0.09 + Math.random() * 0.15));
    flake.style.setProperty("--fall", `${duration}s`);
    flake.style.setProperty("--fall-phase", `-${Math.random() * duration}s`);
    flake.style.setProperty("--wind", `${-34 + Math.random() * 86}px`);
    flake.style.setProperty("--sway", `${sway}px`);
    flake.style.setProperty("--sway-period", `${swayPeriod}s`);
    flake.style.setProperty("--sway-phase", `-${Math.random() * swayPeriod}s`);
    flake.style.setProperty("--crystal", `${index % 3 * 50}%`);
    if (distant) flake.className = "asg-new-year-grain";
    flake.append(surface);
    snow.append(flake);
  }
  return snow;
}

export function mountNewYear(stylesheetUrl) {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = stylesheetUrl;
  const root = document.documentElement;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let snow;
  let frost;
  let removeGarland;
  let disposed = false;

  const syncMotion = () => {
    root.toggleAttribute("data-asg-new-year-paused", document.hidden);
    if (motion.matches) {
      snow?.remove();
      snow = undefined;
    } else if (!snow && !document.hidden) {
      snow = makeSnow();
      document.body.append(snow);
    }
  };

  const ready = new Promise((resolve, reject) => {
    stylesheet.onload = () => {
      if (!disposed) {
        const header = document.querySelector("#v2-site-shell > header, header:not([hidden]), .top-nav");
        const footer = document.querySelector("#v2-site-shell > footer, footer:not([hidden])");
        removeGarland = mountGarland(header || document.body, motion);
        frost = decoration("asg-new-year-frost");
        (footer || document.body).append(frost);
        root.setAttribute("data-asg-new-year", "");
        motion.addEventListener("change", syncMotion);
        document.addEventListener("visibilitychange", syncMotion);
        syncMotion();
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
      motion.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncMotion);
      snow?.remove();
      frost?.remove();
      removeGarland?.();
      root.removeAttribute("data-asg-new-year");
      root.removeAttribute("data-asg-new-year-paused");
      stylesheet.remove();
    }
  };
}

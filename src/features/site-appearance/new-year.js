import { mountGarland } from "./new-year-garland.js?v=20261120winterhover1";

function decoration(className) {
  const element = document.createElement("div");
  element.className = className;
  element.setAttribute("aria-hidden", "true");
  return element;
}

export function mountNewYear(stylesheetUrl) {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = stylesheetUrl;
  const root = document.documentElement;
  let removeSnow;
  let frost;
  let removeGarland;
  let disposed = false;

  const ready = new Promise((resolve, reject) => {
    stylesheet.onload = () => {
      if (!disposed) {
        const header = document.querySelector("#v2-site-shell > header, header:not([hidden]), .top-nav");
        const footer = document.querySelector("#v2-site-shell > footer, footer:not([hidden])");
        removeGarland = mountGarland(header || document.body);
        frost = decoration("asg-new-year-frost");
        (footer || document.body).append(frost);
        root.setAttribute("data-asg-new-year", "");
        import("./new-year-snow.js?v=20261120wintercanvas1").then(({ mountSnow }) => {
          if (!disposed) removeSnow = mountSnow(stylesheet.href);
        }).catch(() => {});
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
      removeSnow?.();
      frost?.remove();
      removeGarland?.();
      root.removeAttribute("data-asg-new-year");
      stylesheet.remove();
    }
  };
}

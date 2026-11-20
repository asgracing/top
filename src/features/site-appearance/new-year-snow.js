const flakeCount = 25;
const frameInterval = 1000 / 30;
const pixelBudget = 1048576;
const cellSize = 21;

function createFlake(index) {
  const depth = index % 5;
  return {
    x: (index + Math.random()) / flakeCount,
    size: (depth < 2 ? 2 + depth : 5 + depth * 3) + Math.random() * (depth < 2 ? 2 : 4),
    alpha: .24 + depth * .09 + Math.random() * .15,
    duration: (28 - depth * 3 + Math.random() * 7) * 1000,
    phase: Math.random(),
    sway: (16 + Math.random() * 20) * (index % 2 === 0 ? 1 : -1),
    crystal: depth < 2 ? -1 : index % 3,
    atlasX: index * cellSize
  };
}

function prepareAtlas(atlas, image, flakes, scale) {
  atlas.width = cellSize * flakeCount;
  atlas.height = cellSize;
  const context = atlas.getContext("2d");
  const sourceWidth = image.naturalWidth / 3;
  for (const flake of flakes) {
    const { atlasX, crystal, alpha } = flake;
    const pixels = Math.max(1, Math.round(flake.size * scale));
    flake.pixels = pixels;
    context.globalAlpha = alpha;
    if (crystal >= 0) {
      context.drawImage(image, sourceWidth * crystal, 0, sourceWidth, image.naturalHeight,
        atlasX, 0, pixels, pixels);
    } else {
      const x = atlasX + pixels / 2;
      const y = pixels / 2;
      const gradient = context.createRadialGradient(x, y, 0, x, y, pixels / 2);
      gradient.addColorStop(0, "#f8fcff");
      gradient.addColorStop(.72, "transparent");
      context.fillStyle = gradient;
      context.fillRect(atlasX, 0, pixels, pixels);
    }
  }
}

export function mountSnow(stylesheetUrl) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return () => {};
  canvas.className = "asg-new-year-snow";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);

  const controller = new AbortController();
  const { signal } = controller;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const flakes = Array.from({ length: flakeCount }, (_, index) => createFlake(index));
  const atlas = document.createElement("canvas");
  const image = new Image();
  let activeFlakes = flakes;
  let scale = 1;
  let clock = 0;
  let last = 0;
  let timer;

  function stop() {
    clearTimeout(timer);
    last = 0;
  }

  function draw() {
    if (document.hidden || motion.matches) return;
    const now = performance.now();
    clock += last ? now - last : 0;
    last = now;

    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const { x, duration, phase, sway, atlasX, pixels } of activeFlakes) {
      const progress = (phase + clock / duration) % 1;
      const side = progress < 1 / 3 ? progress * 3
        : progress < 2 / 3 ? 3 - progress * 6 : progress * 3 - 3;
      const left = Math.round(x * canvas.width + side * sway * scale);
      const top = Math.round(progress * (canvas.height + 50 * scale) - 24 * scale);
      context.drawImage(atlas, atlasX, 0, pixels, pixels, left, top, pixels, pixels);
    }
    timer = setTimeout(draw, frameInterval);
  }

  function sync() {
    stop();
    if (!image.naturalWidth || document.hidden || motion.matches) return;
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    scale = Math.min(1, Math.sqrt(pixelBudget / (width * height)));
    canvas.width = Math.max(1, Math.floor(width * scale));
    canvas.height = Math.max(1, Math.floor(height * scale));
    activeFlakes = width <= 640 ? flakes.filter((_, index) => index % 2 === 0) : flakes;
    prepareAtlas(atlas, image, activeFlakes, scale);
    draw();
  }

  const dimensions = new ResizeObserver(sync);
  dimensions.observe(canvas);
  document.addEventListener("visibilitychange", sync, { signal });
  image.addEventListener("load", sync, { once: true, signal });
  const css = getComputedStyle(canvas).getPropertyValue("--asg-new-year-crystals").trim();
  const path = css.match(/^url\(["']?(.*?)["']?\)$/)?.[1] || "./assets/crystals.webp";
  image.src = new URL(path, stylesheetUrl).href;
  return () => {
    stop();
    controller.abort();
    dimensions.disconnect();
    canvas.remove();
  };
}

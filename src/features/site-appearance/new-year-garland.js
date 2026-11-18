const imageWidth = 1500;
const imageHeight = 107;
const colors = { ivory: "#fff0c7", amber: "#ffbf75", red: "#ff806b", green: "#daf5b6" };
// A soft pitched ring under a short, inharmonic metal strike.
const bellPartials = [
  [1, .022, .014, .63],
  [2.01, .011, .008, .42],
  [2.74, .007, .004, .23],
  [4.08, .004, .003, .11]
];
// Glass crops and their socket pivots, measured on garland.webp.
const lamps = [
  [29, 33, 80, 84, 60, "ivory", 79], [108, 48, 170, 104, 145, "amber", 83],
  [210, 48, 275, 107, 242, "red", 86], [309, 38, 370, 90, 335, "ivory", 88],
  [391, 23, 452, 79, 431, "green", 86], [479, 47, 543, 99, 515, "amber", 83],
  [579, 53, 638, 107, 609, "ivory", 81], [667, 42, 729, 94, 695, "red", 79],
  [758, 31, 821, 84, 793, "amber", 81], [846, 48, 908, 103, 877, "ivory", 83],
  [942, 53, 1004, 107, 971, "green", 86], [1031, 37, 1091, 92, 1059, "amber", 88],
  [1128, 38, 1191, 91, 1160, "ivory", 91], [1214, 48, 1278, 107, 1248, "red", 88],
  [1320, 47, 1385, 107, 1347, "green", 86], [1410, 33, 1481, 92, 1435, "ivory", 79]
].map(([left, top, right, bottom, pivot, color, note]) => ({ left, top, right, bottom, pivot, color, note }));

const percent = (part, whole) => `${part / whole * 100}%`;
const wireCuts = [...lamps].reverse().flatMap(({ left, right, top, bottom }) => {
  const from = percent(left, imageWidth);
  const to = percent(right, imageWidth);
  const upper = percent(top + 1, imageHeight);
  const lower = percent(bottom, imageHeight);
  // Double back from the bottom edge to cut a closed hole around each bulb.
  return [`${to} 100%`, `${to} ${lower}`, `${to} ${upper}`, `${from} ${upper}`,
    `${from} ${lower}`, `${to} ${lower}`, `${to} 100%`];
});
const wireMask = `polygon(evenodd, 0 0, 100% 0, 100% 100%, ${wireCuts.join(", ")}, 0 100%)`;

function makeBulb(lamp, group, index) {
  const holder = document.createElement("span");
  holder.className = "asg-new-year-bulb";
  const glass = document.createElement("i");
  glass.className = "asg-new-year-bulb-glass";
  const { left, top, right, bottom, pivot, color } = lamp;
  const width = right - left;
  const height = bottom - top;
  holder.style.left = percent(left, imageWidth);
  holder.style.top = percent(top, imageHeight);
  holder.style.width = percent(width, imageWidth);
  holder.style.height = percent(height, imageHeight);
  glass.style.backgroundSize = `${percent(imageWidth, width)} ${percent(imageHeight, height)}`;
  glass.style.backgroundPosition = `${percent(left, imageWidth - width)} ${percent(top, imageHeight - height)}`;
  glass.style.transformOrigin = `${percent(pivot - left, width)} 0`;
  glass.style.setProperty("--bulb-color", colors[color]);
  glass.style.setProperty("--bulb-period", `${4.2 + index % 8 * .67}s`);
  glass.style.setProperty("--bulb-phase", `-${index * .58 + group * 1.7}s`);
  holder.append(glass);
  return { holder, glass };
}

function createChime(signal) {
  let audio;
  let nextNote = 0;
  let pendingHover;
  let resumeRequest;

  async function unlock() {
    if (signal.aborted || typeof AudioContext !== "function") return;
    audio ??= new AudioContext();
    if (audio.state !== "running") await audio.resume();
  }

  const activate = () => {
    // A user gesture unlocks future notes, without replaying an earlier hover.
    pendingHover = undefined;
    void unlock().catch(() => {});
  };
  window.addEventListener("pointerdown", activate, { capture: true, signal });
  window.addEventListener("keydown", activate, { capture: true, signal });
  signal.addEventListener("abort", () => void audio?.close().catch(() => {}), { once: true });

  function ring(note) {
    if (signal.aborted || document.hidden || audio?.state !== "running") return;
    const start = audio.currentTime + .002;
    if (start < nextNote) return;
    nextNote = start + .032;
    const frequency = 440 * 2 ** ((note - 69) / 12);
    for (const [ratio, volume, attack, duration] of bellPartials) {
      const oscillator = audio.createOscillator();
      const envelope = audio.createGain();
      oscillator.frequency.value = frequency * ratio;
      envelope.gain.setValueAtTime(.0001, start);
      envelope.gain.exponentialRampToValueAtTime(volume, start + attack);
      envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
      oscillator.connect(envelope).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + .01);
    }
  }

  return note => {
    pendingHover = undefined;
    if (note === undefined) return;
    if (audio?.state === "running") {
      ring(note);
      return;
    }
    pendingHover = { note, time: performance.now() };
    // A browser can leave resume pending until the first trusted gesture.
    resumeRequest ??= unlock()
      .then(() => {
        if (pendingHover && performance.now() - pendingHover.time < 150) ring(pendingHover.note);
      })
      .catch(() => {})
      .finally(() => {
        pendingHover = undefined;
        resumeRequest = undefined;
      });
  };
}

export function mountGarland(host, motion) {
  const lights = document.createElement("div");
  lights.className = "asg-new-year-lights";
  lights.setAttribute("aria-hidden", "true");
  lights.style.setProperty("--wire-mask", wireMask);
  const segments = Array.from({ length: 4 }, (_, group) => {
    const wire = document.createElement("span");
    wire.className = "asg-new-year-wire";
    const bulbs = lamps.map((lamp, index) => makeBulb(lamp, group, index));
    wire.append(...bulbs.map(({ holder }) => holder));
    lights.append(wire);
    return bulbs;
  });
  host.prepend(lights);

  const controller = new AbortController();
  const { signal } = controller;
  const chime = createChime(signal);
  const swings = new WeakMap();
  let hovered;
  let previousX = 0;

  function leave() {
    hovered = undefined;
    chime();
  }

  function hover(event) {
    if (event.pointerType !== "mouse" || event.buttons || document.hidden) return;
    const { clientX, clientY } = event;
    const bounds = lights.getBoundingClientRect();
    const x = clientX - bounds.left;
    const y = clientY - bounds.top;
    if (x < 0 || x >= bounds.width || y < 0 || y >= bounds.height) {
      if (hovered) leave();
      previousX = clientX;
      return;
    }
    const segmentWidth = lights.firstElementChild.getBoundingClientRect().width;
    const segment = Math.floor(x / segmentWidth);
    const artX = (x % segmentWidth) / segmentWidth * imageWidth;
    const artY = y / bounds.height * imageHeight;
    const index = lamps.findIndex(({ left, top, right, bottom }) =>
      artX >= left && artX < right && artY >= top && artY < bottom);
    const glass = segments[segment]?.[index]?.glass;
    const direction = clientX < previousX ? -1 : 1;
    previousX = clientX;
    if (glass === hovered) return;
    hovered = glass;
    if (!glass) {
      chime();
      return;
    }
    if (!motion.matches && swings.get(glass)?.playState !== "running") {
      swings.set(glass, glass.animate([0, 20, -12, 7, -3, 0].map(angle => ({
        transform: `rotate(${angle * direction}deg)`, easing: "ease-in-out"
      })), { duration: 980 }));
    }
    chime(lamps[index].note);
  }

  window.addEventListener("pointermove", hover, { passive: true, signal });
  document.documentElement.addEventListener("pointerleave", leave, { signal });
  motion.addEventListener("change", () => {
    if (!motion.matches) return;
    for (const { glass } of segments.flat()) swings.get(glass)?.cancel();
  }, { signal });
  return () => {
    controller.abort();
    lights.remove();
  };
}

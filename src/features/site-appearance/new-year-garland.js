const imageWidth = 1500;
const imageHeight = 107;
const colors = { ivory: "#fff0c7", amber: "#ffbf75", red: "#ff806b", green: "#daf5b6" };

// Bulb bounds and notes in the original garland artwork.
const lamps = [
  [29, 33, 80, 84, "ivory", 79], [108, 48, 170, 104, "amber", 83],
  [210, 48, 275, 107, "red", 86], [309, 38, 370, 90, "ivory", 88],
  [391, 23, 452, 79, "green", 86], [479, 47, 543, 99, "amber", 83],
  [579, 53, 638, 107, "ivory", 81], [667, 42, 729, 94, "red", 79],
  [758, 31, 821, 84, "amber", 81], [846, 48, 908, 103, "ivory", 83],
  [942, 53, 1004, 107, "green", 86], [1031, 37, 1091, 92, "amber", 88],
  [1128, 38, 1191, 91, "ivory", 91], [1214, 48, 1278, 107, "red", 88],
  [1320, 47, 1385, 107, "green", 86], [1410, 33, 1481, 92, "ivory", 79]
].map(([left, top, right, bottom, color, note]) => ({ left, top, right, bottom, color, note }));

const bellPartials = [
  [1, .022, .014, .63],
  [2.01, .011, .008, .42],
  [2.74, .007, .004, .23],
  [4.08, .004, .003, .11]
];

function createChime(signal) {
  let audio;
  let suspendTimer;
  let suspending;
  let requested = 0;
  let nextNote = 0;
  signal.addEventListener("abort", () => {
    window.clearTimeout(suspendTimer);
    void audio?.close().catch(() => {});
  }, { once: true });

  return async note => {
    const ticket = ++requested;
    if (note === undefined || typeof AudioContext !== "function" ||
        navigator.userActivation?.hasBeenActive === false) return;
    try {
      audio ??= new AudioContext();
      if (suspending) await suspending;
      if (ticket !== requested || signal.aborted) return;
      if (audio.state !== "running") await audio.resume();
    } catch {
      return;
    }
    if (signal.aborted || audio.state !== "running") return;
    window.clearTimeout(suspendTimer);
    // Release the audio output once the longest partial has finished.
    suspendTimer = window.setTimeout(() => {
      suspending = audio.suspend().catch(() => {}).finally(() => { suspending = undefined; });
    }, 800);
    if (ticket !== requested || document.hidden) return;
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
  };
}

export function mountGarland(host) {
  const lights = document.createElement("div");
  lights.className = "asg-new-year-lights";
  lights.setAttribute("aria-hidden", "true");
  for (let index = 0; index < 4; index++) {
    const wire = document.createElement("span");
    wire.className = "asg-new-year-wire";
    lights.append(wire);
  }
  const glow = document.createElement("span");
  glow.className = "asg-new-year-bulb-glow";
  glow.style.position = "absolute";
  glow.style.background = "radial-gradient(ellipse, var(--bulb-color) 10%, transparent 70%)";
  glow.hidden = true;
  lights.append(glow);
  host.prepend(lights);

  const controller = new AbortController();
  const { signal } = controller;
  const chime = createChime(signal);
  let hovered = -1;

  function leave() {
    if (hovered === -1) return;
    hovered = -1;
    glow.hidden = true;
    void chime();
  }

  function hover(event) {
    if (event.pointerType !== "mouse" || event.buttons || document.hidden) {
      leave();
      return;
    }
    const bounds = lights.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    if (x < 0 || x >= bounds.width || y < 0 || y >= bounds.height) {
      leave();
      return;
    }
    const wireWidth = lights.firstElementChild.getBoundingClientRect().width;
    if (!wireWidth) return;
    const segment = Math.floor(x / wireWidth);
    const scaleX = wireWidth / imageWidth;
    const scaleY = bounds.height / imageHeight;
    const artX = (x - segment * wireWidth) / scaleX;
    const artY = y / scaleY;
    const index = lamps.findIndex(({ left, top, right, bottom }) =>
      artX >= left && artX < right && artY >= top && artY < bottom);
    if (index === -1) {
      leave();
      return;
    }
    const bulb = segment * lamps.length + index;
    if (bulb === hovered) return;
    hovered = bulb;
    const { left, top, right, bottom, color, note } = lamps[index];
    glow.style.left = `${segment * wireWidth + left * scaleX}px`;
    glow.style.top = `${top * scaleY}px`;
    glow.style.width = `${(right - left) * scaleX}px`;
    glow.style.height = `${(bottom - top) * scaleY}px`;
    glow.style.setProperty("--bulb-color", colors[color]);
    glow.hidden = false;
    void chime(note);
  }

  host.addEventListener("pointermove", hover, { passive: true, signal });
  host.addEventListener("pointerleave", leave, { signal });
  window.addEventListener("resize", leave, { signal });
  document.addEventListener("visibilitychange", leave, { signal });
  return () => {
    controller.abort();
    lights.remove();
  };
}

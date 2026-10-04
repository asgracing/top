// Public read models only. Commands and authorization stay in the API runtime.
const latest = new Map();
export function emitPreviewView(name, detail) {
  latest.set(name, detail);
  window.dispatchEvent(new CustomEvent(`asg:preview:${name}`, {detail}));
}
export function subscribePreviewView(name, render) {
  const listener = event => render(event.detail);
  window.addEventListener(`asg:preview:${name}`, listener);
  if (latest.has(name)) render(latest.get(name));
  return () => window.removeEventListener(`asg:preview:${name}`, listener);
}

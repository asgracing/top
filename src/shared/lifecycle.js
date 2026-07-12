export function createLifecycle() {
  const disposables = new Set();
  let destroyed = false;
  const add = dispose => {
    if (destroyed) { dispose(); return () => {}; }
    disposables.add(dispose);
    return () => { if (disposables.delete(dispose)) dispose(); };
  };
  return {
    add,
    listen(target, type, handler, options) { target.addEventListener(type, handler, options); return add(() => target.removeEventListener(type, handler, options)); },
    timer(id, clear = clearTimeout) { return add(() => clear(id)); },
    observe(observer) { return add(() => observer.disconnect()); },
    abort(controller = new AbortController()) { add(() => controller.abort()); return controller; },
    destroy() { if (destroyed) return; destroyed = true; for (const dispose of [...disposables].reverse()) dispose(); disposables.clear(); },
    get size() { return disposables.size; },
    get destroyed() { return destroyed; }
  };
}

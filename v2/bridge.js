// A presentation bridge, never an authorization or persistence layer.
let latest = null, runtime = null;
const listeners = new Set();
export function publish(model) { latest = model; for (const listener of listeners) listener(model); }
export function subscribe(listener) { listeners.add(listener); if(latest) listener(latest); return ()=>listeners.delete(listener); }
export function installRuntime(controller) { runtime = controller; }
export function getRuntime() { if(!runtime) throw Error('V2 controllers are still loading'); return runtime; }

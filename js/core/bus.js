// Tiny event bus for one-shot moments (sale → particles, achievement → toast).
// Sim/actions emit; UI listens. UI never emits gameplay events — it calls actions.

const listeners = new Map();

export const bus = {
  on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
    return () => listeners.get(type)?.delete(fn);
  },
  emit(type, payload) {
    const set = listeners.get(type);
    if (!set) return;
    for (const fn of set) fn(payload);
  },
  clear() {
    listeners.clear();
  },
};

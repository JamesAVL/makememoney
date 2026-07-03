// Dirty-flag render dispatcher. Panels register {update}; anything that
// mutates state marks the panel dirty; the rAF loop flushes only dirty
// panels. A few panels opt into every-frame updates (header ticker, meters).

const panels = new Map();
const dirty = new Set();
const everyFrame = new Set();

export function registerPanel(id, panel, opts = {}) {
  panels.set(id, panel);
  if (opts.everyFrame) everyFrame.add(id);
  dirty.add(id);
}

export function markDirty(id) {
  dirty.add(id);
}

export function markAllDirty() {
  for (const id of panels.keys()) dirty.add(id);
}

export function flush(state, now) {
  for (const id of everyFrame) {
    panels.get(id).update(state, now);
  }
  for (const id of dirty) {
    if (everyFrame.has(id)) continue;
    const p = panels.get(id);
    if (p) p.update(state, now);
  }
  dirty.clear();
}

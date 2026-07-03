// Count-up engine: numbers never snap, they roll. Framerate-independent lerp
// with a settle-snap; DOM writes only when the formatted string changes.

const tickers = [];

export function createTicker(el, getTarget, format) {
  const t = { el, getTarget, format, disp: getTarget(), lastStr: '' };
  tickers.push(t);
  return t;
}

let last = 0;
export function tickersFrame(now) {
  if (!last) last = now;
  const dt = Math.min(now - last, 100);
  last = now;
  const k = 1 - Math.exp(-dt * 0.008); // ~120ms settle
  for (const t of tickers) {
    const target = t.getTarget();
    if (!Number.isFinite(t.disp)) t.disp = target;
    t.disp += (target - t.disp) * k;
    if (Math.abs(target - t.disp) < Math.max(Math.abs(target) * 1e-4, 0.005)) t.disp = target;
    const s = t.format(t.disp);
    if (s !== t.lastStr) {
      t.el.textContent = s;
      t.lastStr = s;
    }
  }
}

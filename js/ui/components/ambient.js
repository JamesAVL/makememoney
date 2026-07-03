// Wealth-tier ambient tint: the room slowly turns gold as the empire grows.
// A 3s CSS opacity transition on the fourth aurora blob makes it subliminal.

const TIERS = [1e3, 1e6, 1e9, 1e12];
let last = -1;
let lastCheck = 0;

export function ambientFrame(state, now) {
  if (now - lastCheck < 2000) return;
  lastCheck = now;
  const w = TIERS.filter((t) => state.acct.lifetimeAllTime >= t).length;
  if (w !== last) {
    document.documentElement.dataset.wealth = String(w);
    last = w;
  }
}

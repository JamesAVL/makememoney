// Next Goal breadcrumb — the anti-boredom connective tissue. Always shows the
// single nearest meaningful milestone with a live progress bar, plus one
// horizon goal (the two-carrot rule).

import { PRODUCTS } from '../../data/products.js';
import { nextMilestone, exitPreview, unitCost, getDerived } from '../../core/balance.js';
import { fmtCash, fmtInt } from '../fmt.js';

const els = [];

export function mount(root, state) {
  const el = document.createElement('div');
  el.className = 'goal-card';
  el.innerHTML = `
    <div class="g-label">Next goal</div>
    <div class="g-text"></div>
    <div class="bar"><div class="bar-fill"></div></div>
    <div class="g-far"></div>`;
  root.appendChild(el);
  els.push(el);
}

function computeGoal(state) {
  const r = state.run;
  const d = getDerived(state);

  // 1. Tab unlocks (cash-gated FTUE beats)
  if (!state.ftue.unlocks.products) return { text: 'Something unlocks at $10 seen', num: r.lifetimeCash, den: 10 };
  if (!state.ftue.unlocks.adstudio) return { text: 'Something big unlocks at $50 seen', num: r.lifetimeCash, den: 50 };
  if (!state.ftue.unlocks.upgrades) return { text: 'Upgrades unlock at $250 seen', num: r.lifetimeCash, den: 250 };

  // 2. Next locked product (the ladder is the tutorial)
  for (const p of PRODUCTS) {
    if (r.unlocked[p.id]) continue;
    const u = p.unlock;
    if (u.followers) {
      return {
        text: `🔒 ${p.name}: ${fmtInt(u.followers)} followers — go post something`,
        num: r.followers, den: u.followers,
      };
    }
    if (u.cashSeen) {
      return { text: `🔒 ${p.name}: ${fmtCash(u.cashSeen)} seen`, num: r.lifetimeCash, den: u.cashSeen };
    }
    if (u.level) {
      return { text: `🔒 ${p.name}: Hustler Lv ${u.level}`, num: state.acct.level, den: u.level };
    }
  }

  // 3. Exit readiness
  if (state.acct.level >= 10) {
    const p = exitPreview(state);
    if (p.ratio < 2) {
      return { text: `Grow your exit offer to ×2 (now ×${p.ratio.toFixed(2)})`, num: p.ratio, den: 2 };
    }
    return { text: `🧘 Exit ready: ×${p.ratio.toFixed(2)} — Guru Mode awaits`, num: 1, den: 1 };
  }

  // 4. Next product milestone
  let best = null;
  for (const p of PRODUCTS) {
    const c = r.products[p.id] || 0;
    if (!c) continue;
    const m = nextMilestone(c);
    if (m && (!best || m - c < best.m - best.c)) best = { p, c, m };
  }
  if (best) {
    return { text: `${best.p.icon} ${best.p.name}: ${best.c}/${best.m} → ×2 income`, num: best.c, den: best.m };
  }
  return { text: 'Buy your first product', num: 0, den: 1 };
}

function farGoal(state) {
  if (state.acct.level < 10) return `Someday: 🧘 Guru Mode (Lv 10 — you're Lv ${state.acct.level})`;
  if (!state.acct.exits) return 'Someday: 🚪 your first Exit';
  if (state.acct.exits < 5) return 'Someday: 📚 Serial Entrepreneur (5 exits)';
  return 'Someday: 🌌 $1aa lifetime. Post-economic.';
}

let lastCheck = 0;
export function update(state, now) {
  if (now - lastCheck < 500) return;
  lastCheck = now;
  const g = computeGoal(state);
  const pct = Math.min(100, (g.num / g.den) * 100);
  const far = farGoal(state);
  for (const el of els) {
    const textEl = el.querySelector('.g-text');
    if (textEl.textContent !== g.text) textEl.textContent = g.text;
    el.querySelector('.bar-fill').style.width = pct + '%';
    el.classList.toggle('near', pct >= 85);
    const farEl = el.querySelector('.g-far');
    if (farEl.textContent !== far) farEl.textContent = far;
  }
}

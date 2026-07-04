// Live order feed. Entries are generated UI-side from income (the sim stays
// pure); DOM nodes are recycled, capped at 40, max 3 inserts/sec with
// roll-up rows for overflow. Goes into flood mode after viral hits.

import { totalCps } from '../../core/balance.js';
import { fmtCash } from '../fmt.js';
import { bus } from '../../core/bus.js';
import { PRODUCTS } from '../../data/products.js';
import { CUSTOMER_NAMES, REVIEWS } from '../../data/flavor.js';
import { sChaChing } from '../../audio/synth.js';

const CAP = 40;
let root_ = null;
let state_ = null;
let lastEntry = 0;
let floodUntil = 0;
let pendingRollup = 0;
let rateEl = null;
let lastChaChing = 0;

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Story moment: Chase reframes a bad review as reach — flood a few in.
export function injectReviews(n) {
  for (let i = 0; i < n; i++) addEntry(pick(REVIEWS), 'review');
}

export function mount(root, state) {
  root_ = root;
  state_ = state;
  rateEl = document.getElementById('feed-rate');
  root.setAttribute('aria-hidden', 'true');

  bus.on('launch', (r) => {
    if (r.outcome.id === 'viral' || r.outcome.id === 'mega') {
      floodUntil = performance.now() + 20000;
    }
  });
  bus.on('moment:reward', (r) => {
    if (r.kind === 'whale') {
      addEntry(`🐋 <span class="who">${pick(CUSTOMER_NAMES)}</span> placed a WHALE ORDER — <span class="amt">${fmtCash(r.cash)}</span>`, 'hot');
    }
  });

  root.innerHTML = '<div class="feed-entry muted" id="feed-empty">No orders yet. Have you tried grinding?</div>';
}

function ownedProductNames(state) {
  const owned = [];
  for (const p of PRODUCTS) if ((state.run.products[p.id] || 0) > 0) owned.push(p);
  return owned;
}

function addEntry(html, cls = '') {
  const empty = root_.querySelector('#feed-empty');
  if (empty) empty.remove();
  let el;
  if (root_.children.length >= CAP) {
    el = root_.lastElementChild; // recycle oldest
  } else {
    el = document.createElement('div');
  }
  el.className = `feed-entry ${cls}`;
  el.innerHTML = html;
  root_.prepend(el);
  const peek = document.getElementById('drawer-latest');
  if (peek) peek.textContent = el.textContent;
}

export function update(state, now) {
  const cps = totalCps(state);
  const owned = ownedProductNames(state);
  if (!owned.length && !state.acct.stats.totalClicks) return;

  // Order cadence scales with log income; flood mode runs 3×. (Noise diet:
  // floor raised 450→900ms.)
  const flood = now < floodUntil;
  let interval = cps <= 0 ? Infinity : Math.max(900, 4200 - Math.log10(cps + 1) * 560);
  if (flood) interval /= 3;

  if (rateEl) {
    const str = cps > 0 ? `${Math.min(99, (1000 / interval)).toFixed(1)}/s` : '';
    if (rateEl.textContent !== str) rateEl.textContent = str;
  }

  if (now - lastEntry < Math.max(interval, 333)) return; // 3/sec display cap
  if (interval < 333) pendingRollup += Math.floor(333 / interval);
  lastEntry = now;
  if (!owned.length) return;

  if (pendingRollup > 3) {
    addEntry(`+ ${pendingRollup * (1 + Math.floor(Math.random() * 40))} more orders 🔥`, 'rollup');
    pendingRollup = 0;
    return;
  }

  const p = pick(owned);
  const qty = 1 + Math.floor(Math.random() * 3);
  const price = p.baseCost * 2.5 * qty * (0.9 + Math.random() * 0.2);
  // Reviews get more visible once Chase has made his point about them.
  const isReview = Math.random() < (state.story.acked.lesson_review ? 0.12 : 0.08);
  if (isReview) {
    addEntry(pick(REVIEWS), 'review');
  } else {
    addEntry(
      `<span class="who">${pick(CUSTOMER_NAMES)}</span> bought ${p.icon} ${p.name} ×${qty} — <span class="amt">${fmtCash(price)}</span>`,
      flood ? 'hot' : '',
    );
    // Noise diet: cha-ching only after the Ad Studio lesson, ≤1 per 4s.
    if (state.settings && !state.settings.muted
      && state.story.unlocks.adstudio && now - lastChaChing >= 4000) {
      lastChaChing = now;
      sChaChing(false);
    }
  }
}

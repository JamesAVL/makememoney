// Product catalog: the 12-rung generator ladder. Locked cards show their
// requirement (the gate IS the tutorial); buy buttons show live prices with
// affordability underline; milestone progress on every card.

import { PRODUCTS } from '../../data/products.js';
import {
  getDerived, unitCost, bulkCost, maxAffordable, milestonesHit, nextMilestone,
} from '../../core/balance.js';
import { buyProduct } from '../../core/actions.js';
import { fmt, fmtCash, fmtInt } from '../fmt.js';
import { bus } from '../../core/bus.js';
import { burst, SPR } from '../components/particles.js';
import { sBuy } from '../../audio/synth.js';
import { markDirty } from '../render.js';

let state_ = null;
let qty = 1; // 1 | 10 | 'max'
let cards = {};
let rootEl = null;

export function mount(root, state) {
  state_ = state;
  rootEl = root;
  root.innerHTML = `
    <div class="panel">
      <div class="panel-title">
        <span>📦 Product Catalog — Fulfillment Center: find yours</span>
        <span class="qty-toggle" id="p-qty">
          <button data-q="1" class="active">×1</button>
          <button data-q="10">×10</button>
          <button data-q="max">MAX</button>
        </span>
      </div>
      <div class="card-grid" id="p-grid"></div>
    </div>`;

  root.querySelector('#p-qty').addEventListener('click', (e) => {
    const q = e.target.dataset.q;
    if (!q) return;
    qty = q === 'max' ? 'max' : Number(q);
    root.querySelectorAll('#p-qty button').forEach((b) => b.classList.toggle('active', b.dataset.q === q));
    markDirty('products');
  });

  const grid = root.querySelector('#p-grid');
  for (const p of PRODUCTS) {
    const card = document.createElement('div');
    card.className = 'card locked hidden';
    card.dataset.pid = p.id;
    card.innerHTML = `
      <div class="card-title"><span style="font-size:19px">${p.icon}</span> <span class="p-name">${p.name}</span></div>
      <div class="card-sub p-desc"></div>
      <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:6px">
        <span class="muted">Owned <b class="p-count num" style="color:var(--text-hi)">0</b></span>
        <span class="money num p-cps"></span>
      </div>
      <div class="bar" style="height:5px;margin-bottom:8px" title="Next ×2 milestone"><div class="bar-fill p-mile"></div></div>
      <button class="btn p-buy" style="width:100%">
        <span class="p-buylabel">Buy</span>&nbsp;<span class="price num p-price"></span>
        <span class="price-under p-under"></span>
      </button>`;
    card.querySelector('.p-buy').addEventListener('click', (e) => {
      const n = qty;
      if (buyProduct(state_, p.id, n)) {
        sBuy();
        const r = e.currentTarget.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top, 6, SPR.MONEY, 110);
        card.classList.remove('pop');
        void card.offsetWidth;
        card.classList.add('pop');
        markDirty('products');
        markDirty('upgrades');
      }
    });
    grid.appendChild(card);
    cards[p.id] = card;
  }

  bus.on('milestone', ({ id }) => {
    const card = cards[id];
    if (card) {
      card.classList.add('r-uncommon');
      setTimeout(() => card.classList.remove('r-uncommon'), 1500);
    }
  });
}

let lastUpdate = 0;
export function update(state, now) {
  if (now && now - lastUpdate < 200) return;
  lastUpdate = now || 0;
  const d = getDerived(state);
  let prevUnlocked = true;

  for (const p of PRODUCTS) {
    const card = cards[p.id];
    const count = state.run.products[p.id] || 0;
    const unlocked = !!state.run.unlocked[p.id];

    // Visibility: unlocked products + the next locked one (teaser with its gate)
    if (!unlocked && !prevUnlocked) {
      card.classList.add('hidden');
      continue;
    }
    card.classList.remove('hidden');

    if (!unlocked) {
      prevUnlocked = false;
      card.classList.add('locked');
      const u = p.unlock;
      let req = '';
      if (u.followers) req = `🔒 Requires ${fmtInt(u.followers)} followers — go post something.`;
      else if (u.cashSeen) req = `🔒 Requires ${fmtCash(u.cashSeen)} total earned.`;
      if (u.level) req += ` (+ Hustler Lv ${u.level})`;
      setText(card, '.p-desc', req);
      setText(card, '.p-cps', '');
      setText(card, '.p-price', '');
      card.querySelector('.p-buy').disabled = true;
      continue;
    }

    card.classList.remove('locked');
    const hits = milestonesHit(count);
    setText(card, '.p-desc', hits >= 4 ? `${p.desc} ${p.milestoneName ? '· “' + p.milestoneName + '”' : ''}` : p.desc);
    setText(card, '.p-count', fmtInt(count));
    setText(card, '.p-cps', count ? `$${fmt(d.productCps[p.id] * d.staticGlobal)}/s` : '');

    const m = nextMilestone(count);
    const prevM = hits ? [10, 25, 50, 100, 150, 200, 250, 300, 400, 500][hits - 1] : 0;
    card.querySelector('.p-mile').style.width = m ? `${((count - prevM) / (m - prevM)) * 100}%` : '100%';

    const n = qty === 'max' ? Math.max(1, maxAffordable(p, count, state.run.cash, d)) : qty;
    const cost = bulkCost(p, count, n, d);
    const afford = state.run.cash >= cost;
    const buyBtn = card.querySelector('.p-buy');
    buyBtn.disabled = !afford;
    buyBtn.classList.toggle('btn-ready', afford && count === 0);
    setText(card, '.p-buylabel', `Buy ×${qty === 'max' ? n : qty}`);
    setText(card, '.p-price', fmtCash(cost));
    card.querySelector('.p-under').style.width = `${Math.min(100, (state.run.cash / cost) * 100)}%`;
  }
}

function setText(card, sel, text) {
  const el = card.querySelector(sel);
  if (el && el.textContent !== text) el.textContent = text;
}

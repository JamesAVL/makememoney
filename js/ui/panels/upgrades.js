// Upgrade shop: guru-speak cards grouped by category, purchased ones collapse
// into an owned ledger. Disabled buttons show the price and fill an
// affordability underline — the strongest "one more minute" trick there is.

import { UPGRADES } from '../../data/upgrades.js';
import { buyUpgrade, upgradeAvailable } from '../../core/actions.js';
import { fmtCash } from '../fmt.js';
import { sBuy } from '../../audio/synth.js';
import { toast } from '../components/toast.js';
import { markDirty } from '../render.js';

const CATS = [
  ['products', '📦 Product Ops'],
  ['store', '🏪 Storefront'],
  ['ads', '🎬 Content Machine'],
  ['grindset', '🧠 Grindset'],
];

let state_ = null;
let grid = null;
let ownedEl = null;
let built = {};

export function mount(root, state) {
  state_ = state;
  root.innerHTML = `
    <div class="panel">
      <div class="panel-title"><span>⬆️ Upgrades — invest in yourself (and fake countdown timers)</span></div>
      <div class="card-grid" id="u-grid"></div>
    </div>
    <div class="panel">
      <div class="panel-title"><span>Owned</span><span class="muted" id="u-count">0</span></div>
      <div id="u-owned" style="display:flex;flex-wrap:wrap;gap:6px"></div>
    </div>`;
  grid = root.querySelector('#u-grid');
  ownedEl = root.querySelector('#u-owned');
}

let lastUpdate = 0;
export function update(state, now) {
  if (now && now - lastUpdate < 300) return;
  lastUpdate = now || 0;

  // Visible: available, not owned, and within aspirational reach (≤50× cash)
  const visible = UPGRADES
    .filter((u) => !state.run.upgrades[u.id]
      && upgradeAvailable(state, u)
      && u.cost <= Math.max(state.run.cash, state.run.lifetimeCash) * 50)
    .sort((a, b) => a.cost - b.cost)
    .slice(0, 12);

  const visIds = new Set(visible.map((u) => u.id));
  for (const id in built) {
    if (!visIds.has(id)) {
      built[id].remove();
      delete built[id];
    }
  }

  for (const u of visible) {
    let card = built[u.id];
    if (!card) {
      card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-title">${u.name}</div>
        <div class="card-sub">${u.desc}</div>
        <button class="btn u-buy" style="width:100%">
          <span class="price num u-price"></span>
          <span class="price-under u-under"></span>
        </button>`;
      card.querySelector('.u-buy').addEventListener('click', () => {
        if (buyUpgrade(state_, u.id)) {
          sBuy();
          toast({ icon: '⬆️', name: u.name, sub: u.desc, tone: '' });
          markDirty('upgrades');
          markDirty('products');
        }
      });
      built[u.id] = card;
    }
    grid.appendChild(card); // keeps sort order
    const afford = state.run.cash >= u.cost;
    const btn = card.querySelector('.u-buy');
    btn.disabled = !afford;
    btn.classList.toggle('btn-ready', afford);
    const priceEl = card.querySelector('.u-price');
    const priceStr = fmtCash(u.cost);
    if (priceEl.textContent !== priceStr) priceEl.textContent = priceStr;
    card.querySelector('.u-under').style.width = `${Math.min(100, (state.run.cash / u.cost) * 100)}%`;
  }

  if (!visible.length && !grid.querySelector('.muted')) {
    grid.innerHTML = '<div class="muted" style="padding:10px">Nothing on the shelf yet. Earn more, want more.</div>';
  } else if (visible.length) {
    const m = grid.querySelector('.muted');
    if (m) m.remove();
  }

  // Owned ledger
  const owned = Object.keys(state.run.upgrades);
  const countEl = document.getElementById('u-count');
  if (countEl && countEl.textContent !== String(owned.length)) {
    countEl.textContent = String(owned.length);
    ownedEl.innerHTML = owned
      .map((id) => {
        const u = UPGRADES.find((x) => x.id === id);
        return u ? `<span class="chip" title="${u.desc}">${u.name}</span>` : '';
      })
      .join('');
  }
}

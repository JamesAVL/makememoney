// Upgrade shop: guru-speak names with a scannable effect line (the joke is
// the title, the mechanics are the .fx-line), grouped into sections, staged
// shelf (6 cards pre-first-exit, 12 after). Purchased ones collapse into an
// owned ledger. Affordability underline stays — strongest "one more minute"
// trick there is.

import { UPGRADES, effectLabel } from '../../data/upgrades.js';
import { buyUpgrade, upgradeAvailable } from '../../core/actions.js';
import { fmtCash } from '../fmt.js';
import { sBuy } from '../../audio/synth.js';
import { toast } from '../components/toast.js';
import { markDirty } from '../render.js';
import { icon as phIcon } from '../icons.js';

const CATS = [
  ['products', '📦 Product Ops'],
  ['store', '🏪 Store Lies'],
  ['ads', '🎬 Content Rig'],
  ['grindset', '🧠 Grindset'],
];

let state_ = null;
let sections = {};
let ownedEl = null;
let built = {};

export function mount(root, state) {
  state_ = state;
  root.innerHTML = `
    <div class="panel">
      <div class="panel-title"><span>${phIcon('arrow-fat-lines-up', { size: 16 })} Conversion Tools — invest in yourself (and fake countdown timers)</span></div>
      <div id="u-sections"></div>
    </div>
    <div class="panel">
      <div class="panel-title"><span>Owned</span><span class="muted" id="u-count">0</span></div>
      <div id="u-owned" style="display:flex;flex-wrap:wrap;gap:6px"></div>
    </div>`;
  const wrap = root.querySelector('#u-sections');
  sections = {};
  built = {};
  for (const [id, label] of CATS) {
    const sec = document.createElement('div');
    sec.className = 'u-section hidden';
    sec.innerHTML = `<div class="u-sec-title muted">${label}</div><div class="card-grid"></div>`;
    wrap.appendChild(sec);
    sections[id] = { el: sec, grid: sec.querySelector('.card-grid') };
  }
  const empty = document.createElement('div');
  empty.className = 'muted u-empty';
  empty.style.padding = '10px';
  empty.textContent = 'Nothing on the shelf yet. Earn more, want more.';
  wrap.appendChild(empty);
  ownedEl = root.querySelector('#u-owned');
}

let lastUpdate = 0;
export function update(state, now) {
  if (now && now - lastUpdate < 300) return;
  lastUpdate = now || 0;

  // Staged shelf: a handful of legible choices early, the catalogue later.
  const shelfCap = state.acct.exits === 0 ? 6 : 12;
  const reach = Math.max(state.run.cash, state.run.lifetimeCash) * 8;
  const visible = UPGRADES
    .filter((u) => !state.run.upgrades[u.id] && upgradeAvailable(state, u) && u.cost <= reach)
    .sort((a, b) => a.cost - b.cost)
    .slice(0, shelfCap);

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
        <div class="fx-line">${effectLabel(u)}</div>
        <div class="card-sub u-flavor">${u.desc}</div>
        <button class="btn u-buy" style="width:100%">
          <span class="price num u-price"></span>
          <span class="price-under u-under"></span>
        </button>`;
      card.querySelector('.u-buy').addEventListener('click', () => {
        if (buyUpgrade(state_, u.id)) {
          sBuy();
          toast({ icon: phIcon('arrow-fat-lines-up', { size: 24 }), name: u.name, sub: effectLabel(u), tone: '' });
          markDirty('upgrades');
          markDirty('products');
        }
      });
      built[u.id] = card;
    }
    sections[u.category]?.grid.appendChild(card); // keeps cost order per section
    const afford = state.run.cash >= u.cost;
    const btn = card.querySelector('.u-buy');
    btn.disabled = !afford;
    btn.classList.toggle('btn-ready', afford);
    const priceEl = card.querySelector('.u-price');
    const priceStr = fmtCash(u.cost);
    if (priceEl.textContent !== priceStr) priceEl.textContent = priceStr;
    card.querySelector('.u-under').style.width = `${Math.min(100, (state.run.cash / u.cost) * 100)}%`;
  }

  // Empty sections collapse; whole-shelf empty state.
  for (const [id] of CATS) {
    sections[id].el.classList.toggle('hidden', !sections[id].grid.children.length);
  }
  const emptyEl = document.querySelector('.u-empty');
  if (emptyEl) emptyEl.classList.toggle('hidden', visible.length > 0);

  // Owned ledger
  const owned = Object.keys(state.run.upgrades);
  const countEl = document.getElementById('u-count');
  if (countEl && countEl.textContent !== String(owned.length)) {
    countEl.textContent = String(owned.length);
    ownedEl.innerHTML = owned
      .map((id) => {
        const u = UPGRADES.find((x) => x.id === id);
        return u ? `<span class="chip" title="${effectLabel(u)} — ${u.desc}">${u.name}</span>` : '';
      })
      .join('');
  }
}

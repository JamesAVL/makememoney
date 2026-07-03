// Nav rail: tab switching, lock/teaser logic (max 2 locked teasers visible),
// honest badge dots (only when an action is actually affordable).

import { getDerived, unitCost, adFee, exitPreview } from '../../core/balance.js';
import { UPGRADES } from '../../data/upgrades.js';
import { upgradeAvailable } from '../../core/actions.js';
import { PRODUCTS } from '../../data/products.js';
import { GURU_TREE } from '../../data/prestige.js';
import { markAllDirty } from '../render.js';

export const TABS = [
  { id: 'dashboard', ico: '📊', label: 'Dashboard', always: true },
  { id: 'products', ico: '📦', label: 'Products' },
  { id: 'adstudio', ico: '🎬', label: 'Ad Studio' },
  { id: 'upgrades', ico: '⬆️', label: 'Upgrades' },
  { id: 'trends', ico: '📈', label: 'Trends' },
  { id: 'guru', ico: '🧘', label: 'Guru Mode' },
  { id: 'flexes', ico: '🏆', label: 'Flexes' },
  { id: 'settings', ico: '⚙️', label: 'Settings', always: true },
];

let root_ = null;
let state_ = null;
let active = 'dashboard';
let btns = {};

export function currentTab() { return active; }

export function switchTab(id) {
  if (!btns[id] || btns[id].classList.contains('locked')) return;
  active = id;
  for (const t of TABS) {
    btns[t.id]?.classList.toggle('active', t.id === id);
    document.getElementById(`panel-${t.id}`)?.classList.toggle('active', t.id === id);
  }
  markAllDirty();
}

export function mount(root, state) {
  root_ = root;
  state_ = state;
  root.innerHTML = '';
  for (const t of TABS) {
    const b = document.createElement('button');
    b.className = 'nav-btn';
    b.dataset.tab = t.id;
    b.innerHTML = `<span class="ico">${t.ico}</span><span class="lbl">${t.label}</span>`;
    b.addEventListener('click', () => switchTab(t.id));
    root.appendChild(b);
    btns[t.id] = b;
  }
  switchTab('dashboard');
}

function isUnlocked(state, id) {
  const t = TABS.find((x) => x.id === id);
  return t.always || state.ftue.unlocks[id];
}

export function update(state) {
  let teasers = 0;
  for (const t of TABS) {
    const b = btns[t.id];
    const unlocked = isUnlocked(state, t.id);
    if (unlocked) {
      b.classList.remove('locked', 'hidden');
      const ico = b.querySelector('.ico');
      if (ico.textContent !== t.ico) ico.textContent = t.ico;
      const lbl = b.querySelector('.lbl');
      if (lbl.textContent !== t.label) lbl.textContent = t.label;
      updateBadge(state, t.id, b);
    } else if (teasers < 2) {
      teasers++;
      b.classList.add('locked');
      b.classList.remove('hidden');
      b.querySelector('.ico').textContent = '🔒';
      b.querySelector('.lbl').textContent = '???';
      setBadge(b, false);
    } else {
      b.classList.add('hidden');
    }
  }
}

function setBadge(b, on) {
  let dot = b.querySelector('.badge-dot');
  if (on && !dot) {
    dot = document.createElement('span');
    dot.className = 'badge-dot';
    b.appendChild(dot);
  } else if (!on && dot) {
    dot.remove();
  }
}

let lastBadgeCheck = 0;
function updateBadge(state, id, b) {
  // Badge checks are cheap but run at most 2×/sec across the rail.
  const now = performance.now();
  if (id === 'dashboard' || id === 'settings' || id === active) { setBadge(b, false); return; }
  if (now - lastBadgeCheck < 500 && b.dataset.badgeKnown) {
    return;
  }
  b.dataset.badgeKnown = '1';
  lastBadgeCheck = now;
  const d = getDerived(state);
  let on = false;
  if (id === 'products') {
    for (const p of PRODUCTS) {
      if (state.run.unlocked[p.id] && state.run.cash >= unitCost(p, state.run.products[p.id] || 0, d)) { on = true; break; }
    }
  } else if (id === 'upgrades') {
    for (const u of UPGRADES) {
      if (!state.run.upgrades[u.id] && upgradeAvailable(state, u) && state.run.cash >= u.cost) { on = true; break; }
    }
  } else if (id === 'adstudio') {
    on = state.run.energy >= 1 && state.run.cash >= adFee(state) && !state.run.pendingAd;
  } else if (id === 'guru') {
    const p = exitPreview(state);
    on = (state.acct.level >= 10 && p.ratio >= 2)
      || GURU_TREE.some((n) => !state.acct.guru[n.id] && state.acct.investors >= n.cost);
  }
  setBadge(b, on);
}

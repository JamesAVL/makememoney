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
let indicator = null;

export function currentTab() { return active; }

function moveIndicator(btn) {
  if (!indicator || !btn || btn.classList.contains('hidden')) return;
  const mobile = matchMedia('(max-width: 900px)').matches;
  if (mobile) {
    indicator.style.width = `${btn.offsetWidth}px`;
    indicator.style.height = '';
    indicator.style.transform = `translateX(${btn.offsetLeft}px)`;
    indicator.style.left = '0';
    indicator.style.top = '';
  } else {
    indicator.style.width = 'calc(100% - 16px)';
    indicator.style.height = `${btn.offsetHeight}px`;
    indicator.style.transform = `translateY(${btn.offsetTop}px)`;
    indicator.style.left = '8px';
    indicator.style.top = '0';
  }
}

export function switchTab(id) {
  // Hidden tabs are as unreachable as locked ones (?tab= deep links degrade).
  if (!btns[id] || btns[id].classList.contains('locked') || btns[id].classList.contains('hidden')) return;
  const oldIdx = TABS.findIndex((t) => t.id === active);
  const newIdx = TABS.findIndex((t) => t.id === id);
  const stage = document.getElementById('stage');
  stage.style.setProperty('--axis', newIdx >= oldIdx ? '1' : '-1');
  // Direction-aware exit: keep the old panel alive briefly
  const incoming = document.getElementById(`panel-${id}`);
  incoming?.classList.remove('leaving');
  const oldPanel = document.getElementById(`panel-${active}`);
  if (oldPanel && active !== id && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    oldPanel.classList.add('leaving');
    oldPanel.addEventListener('animationend', () => oldPanel.classList.remove('leaving'), { once: true });
  }
  active = id;
  for (const t of TABS) {
    btns[t.id]?.classList.toggle('active', t.id === id);
    const panel = document.getElementById(`panel-${t.id}`);
    if (panel && !panel.classList.contains('leaving')) {
      panel.classList.toggle('active', t.id === id);
    } else if (panel) {
      panel.classList.toggle('active', t.id === id);
    }
  }
  moveIndicator(btns[id]);
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
  indicator = document.createElement('span');
  indicator.className = 'nav-ind';
  indicator.setAttribute('aria-hidden', 'true');
  root.prepend(indicator);
  window.addEventListener('resize', () => moveIndicator(btns[active]));
  switchTab('dashboard');
}

function isUnlocked(state, id) {
  const t = TABS.find((x) => x.id === id);
  if (t.always) return true;
  // Chase's DMs grant tabs; the guru tab rides the 'exit' lesson flag.
  return !!state.story.unlocks[id === 'guru' ? 'exit' : id];
}

let visSig = '';
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
  // Button offsets shift when tabs lock/unlock/hide — keep the pill honest.
  const sig = TABS.map((t) => btns[t.id].className).join('|');
  if (sig !== visSig) {
    visSig = sig;
    moveIndicator(btns[active]);
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
  // Silent until Chase introduces Conversion Tools (noise diet).
  const now = performance.now();
  if (!state.story.unlocks.upgrades) { setBadge(b, false); return; }
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

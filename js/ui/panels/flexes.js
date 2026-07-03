// Flexes: the achievement grid (+1% income each — mechanically real) and the
// Hall of Fame of MEGA-VIRAL ads.

import { ACHIEVEMENTS } from '../../data/achievements.js';
import { fmtDur } from '../fmt.js';

let els = {};

export function mount(root, state) {
  root.innerHTML = `
    <div class="panel">
      <div class="panel-title">
        <span>🏆 Flexes — each one is a permanent +1% income</span>
        <span class="money num" id="fx-count"></span>
      </div>
      <div class="card-grid" id="fx-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))"></div>
    </div>
    <div class="panel">
      <div class="panel-title"><span>🌋 Hall of Fame — MEGA-VIRAL ads</span></div>
      <table class="mini-table" id="fx-hof"></table>
    </div>`;
  els = {
    count: root.querySelector('#fx-count'),
    grid: root.querySelector('#fx-grid'),
    hof: root.querySelector('#fx-hof'),
  };
}

let lastKey = '';
export function update(state) {
  const unlocked = Object.keys(state.acct.achievements).length;
  const key = `${unlocked}|${state.acct.hallOfFame.length}`;
  if (key === lastKey) return;
  lastKey = key;

  els.count.textContent = `${unlocked}/${ACHIEVEMENTS.length} (+${unlocked}% income)`;

  let grid = '';
  for (const a of ACHIEVEMENTS) {
    const got = !!state.acct.achievements[a.id];
    if (!got && a.secret) {
      grid += `<div class="card locked"><div class="card-title">❓ ???</div>
        <div class="card-sub">Secret. Suspiciously secret.</div></div>`;
      continue;
    }
    grid += `<div class="card ${got ? 'r-uncommon' : 'locked'}">
      <div class="card-title">${got ? a.icon : '🔒'} ${a.name}</div>
      <div class="card-sub">${a.desc}</div>
    </div>`;
  }
  els.grid.innerHTML = grid;

  let hof = '';
  for (const h of [...state.acct.hallOfFame].reverse()) {
    hof += `<tr><td>🌋 “${h.title}”</td><td>${h.views}</td></tr>`;
  }
  if (!hof) hof = '<tr><td class="muted">No MEGA-VIRALs yet. The 1% awaits.</td><td></td></tr>';
  els.hof.innerHTML = hof;
}

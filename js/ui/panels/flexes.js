// Flexes: the achievement grid (+1% income each — mechanically real) and the
// Hall of Fame of MEGA-VIRAL ads.

import { ACHIEVEMENTS, ACH_ICONS } from '../../data/achievements.js';
import { fmtDur } from '../fmt.js';
import { shareText } from '../../native/device.js';
import { icon } from '../icons.js';
import { stampArt } from '../art.js';

let els = {};
let hofData = [];

export function mount(root, state) {
  root.innerHTML = `
    <div class="panel">
      <div class="panel-title">
        <span>${icon('trophy', { size: 16 })} Flexes — each one is a permanent +1% income</span>
        <span class="money num" id="fx-count"></span>
      </div>
      <div class="card-grid" id="fx-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))"></div>
    </div>
    <div class="panel">
      <div class="panel-title"><span>${icon('volcano', { size: 16 })} Hall of Fame — MEGA-VIRAL ads</span></div>
      <table class="mini-table" id="fx-hof"></table>
    </div>`;
  els = {
    count: root.querySelector('#fx-count'),
    grid: root.querySelector('#fx-grid'),
    hof: root.querySelector('#fx-hof'),
  };
  // Delegated so it survives innerHTML rebuilds.
  els.hof.addEventListener('click', (e) => {
    const btn = e.target.closest('.hof-share');
    if (!btn) return;
    const h = hofData[Number(btn.dataset.i)];
    if (h) shareText(`My ad "${h.title}" went MEGA-VIRAL (${h.views}) in Ship Happens 🌋 Sell everything. Learn nothing.`);
  });
}

let lastKey = '';
export function update(state) {
  const unlocked = Object.keys(state.acct.achievements).length;
  const key = `${unlocked}|${state.acct.hallOfFame.length}`;
  if (key === lastKey) return;
  lastKey = key;

  els.count.textContent = `${unlocked}/${ACHIEVEMENTS.length} (+${unlocked}% income)`;

  let grid = '';
  const medal = (a, got) => {
    const name = !got ? 'lock-simple' : (ACH_ICONS[a.id] || 'medal');
    return `<span class="medal-chip${got ? ' got' : ''}">${icon(name, { size: 18 })}</span>`;
  };
  for (const a of ACHIEVEMENTS) {
    const got = !!state.acct.achievements[a.id];
    if (!got && a.secret) {
      grid += `<div class="card locked"><div class="card-title"><span class="medal-chip">${icon('question', { size: 18 })}</span> ???</div>
        <div class="card-sub">Secret. Suspiciously secret.</div></div>`;
      continue;
    }
    grid += `<div class="card ${got ? 'r-uncommon' : 'locked'}">
      <div class="card-title">${medal(a, got)} ${a.name}</div>
      <div class="card-sub">${a.desc}</div>
    </div>`;
  }
  els.grid.innerHTML = grid;

  let hof = '';
  hofData = [...state.acct.hallOfFame].reverse();
  hofData.forEach((h, i) => {
    hof += `<tr><td><span style="line-height:0;vertical-align:-4px">${stampArt('mega', 46)}</span> “${h.title}”</td><td>${h.views} <button class="icon-btn hof-share" data-i="${i}" title="Share this flex">${icon('share-network', { size: 14 })}</button></td></tr>`;
  });
  if (!hof) hof = '<tr><td class="muted">No MEGA-VIRALs yet. The 1% awaits.</td><td></td></tr>';
  els.hof.innerHTML = hof;
}

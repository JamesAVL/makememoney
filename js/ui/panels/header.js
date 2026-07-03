// KPI bar: hero cash ticker, rate chip, followers, hype meter, XP/level,
// investors, sound/save indicators. Updates every frame (cheap string-diffs).

import { totalCps, tempMult, getDerived, hypeMult, xpToNext, BAL } from '../../core/balance.js';
import { fmt, fmtCash, fmtInt } from '../fmt.js';
import { createTicker } from '../components/ticker.js';
import { createOdometer } from '../components/odometer.js';
import { bus } from '../../core/bus.js';
import { slam } from '../components/celebrate.js';
import { setMuted } from '../../audio/synth.js';
import { saveToStorage } from '../../core/save.js';
import { applyTheme } from '../theme.js';

let els = {};
let state_ = null;
let lastHypeTier = 0;
let saveFlashUntil = 0;

const HYPE_TIERS = [
  [95, 'SIGMA GRINDSET'],
  [70, 'FLOW STATE'],
  [40, 'LOCKED IN'],
];

export function mount(root, state) {
  state_ = state;
  root.innerHTML = `
    <div class="kpi-logo" id="logo" title="HustleOS™ — definitely checking for updates">
      <span class="brand">HustleOS™</span>
      <span class="ver">v4.2.0 “Sigma”</span>
    </div>
    <div class="kpi-cash">
      <span class="val num" id="k-cash">$0</span>
      <span class="rate-chip num" id="k-rate">+$0/sec</span>
    </div>
    <div class="kpi-stat" id="k-followers-wrap">
      <span class="label">👁 Followers</span>
      <span class="val" id="k-followers">0</span>
    </div>
    <div class="kpi-stat kpi-hype">
      <span class="label">⚡ Hype <span id="k-hypemult" class="hype-c num"></span></span>
      <div class="bar bar-hype" id="k-hypebar"><div class="bar-fill" id="k-hypefill"></div></div>
    </div>
    <div class="kpi-stat kpi-xp">
      <span class="label">Hustler <b id="k-level" class="data-c">Lv 1</b></span>
      <div class="bar"><div class="bar-fill" id="k-xpfill" style="background:var(--data)"></div></div>
    </div>
    <div class="kpi-right">
      <span class="kpi-invest num hidden" id="k-invest" title="Unspent investors: +4% income each">👤 0</span>
      <button class="icon-btn" id="k-theme" title="Light/dark mode">🌙</button>
      <button class="icon-btn" id="k-mute" title="Sound on/off">🔊</button>
      <div class="save-dot" id="k-save" title="Autosaved locally"></div>
    </div>`;

  els = {
    cash: root.querySelector('#k-cash'),
    rate: root.querySelector('#k-rate'),
    followersWrap: root.querySelector('#k-followers-wrap'),
    followers: root.querySelector('#k-followers'),
    hypefill: root.querySelector('#k-hypefill'),
    hypebar: root.querySelector('#k-hypebar'),
    hypemult: root.querySelector('#k-hypemult'),
    level: root.querySelector('#k-level'),
    xpfill: root.querySelector('#k-xpfill'),
    invest: root.querySelector('#k-invest'),
    mute: root.querySelector('#k-mute'),
    save: root.querySelector('#k-save'),
  };

  createOdometer(els.cash, () => state_.run.cash, fmtCash);
  createTicker(els.followers, () => state_.run.followers, (n) => fmtInt(n));

  root.querySelector('#logo').addEventListener('click', () => {
    state_.acct.stats.logoClicks++;
  });
  const themeBtn = root.querySelector('#k-theme');
  const themeIcon = () => { themeBtn.textContent = state_.settings.theme === 'light' ? '☀️' : '🌙'; };
  themeBtn.addEventListener('click', () => {
    state_.settings.theme = state_.settings.theme === 'light' ? 'dark' : 'light';
    applyTheme(state_.settings.theme);
    themeIcon();
    saveToStorage(state_, Date.now());
  });
  themeIcon();
  els.mute.addEventListener('click', () => {
    state_.settings.muted = !state_.settings.muted;
    setMuted(state_.settings.muted);
    els.mute.textContent = state_.settings.muted ? '🔇' : '🔊';
    saveToStorage(state_, Date.now());
  });
  els.mute.textContent = state_.settings.muted ? '🔇' : '🔊';

  bus.on('saved', () => { saveFlashUntil = performance.now() + 900; });
}

export function update(state, now) {
  const cps = totalCps(state);
  const temp = tempMult(state);
  const rateStr = temp.capped
    ? '⚠ ALGORITHM SATURATED — ×40 MAX'
    : `+${fmt(cps)}/sec`;
  if (els.rate.textContent !== rateStr) {
    els.rate.textContent = rateStr;
    els.rate.classList.toggle('saturated', temp.capped);
  }

  const d = getDerived(state);
  const hypePct = Math.min(100, (state.run.hype / d.hypeMax) * 100);
  els.hypefill.style.width = hypePct + '%';
  els.hypebar.classList.toggle('shimmer', hypePct > 80);
  const hm = hypeMult(state);
  const hmStr = hm > 1.01 ? `×${hm.toFixed(2)}` : '';
  if (els.hypemult.textContent !== hmStr) els.hypemult.textContent = hmStr;

  // Hype tier slams
  let tier = 0;
  for (const [threshold, name] of HYPE_TIERS) {
    if (state.run.hype >= threshold) { tier = threshold; break; }
  }
  if (tier > lastHypeTier) {
    const name = HYPE_TIERS.find(([t]) => t === tier)[1];
    slam(name);
  }
  lastHypeTier = tier;

  const lvlStr = `Lv ${state.acct.level}`;
  if (els.level.textContent !== lvlStr) els.level.textContent = lvlStr;
  els.xpfill.style.width = Math.min(100, (state.acct.xp / xpToNext(state.acct.level)) * 100) + '%';

  const showF = state.acct.level >= 2 || state.run.followers > 0;
  els.followersWrap.classList.toggle('hidden', !showF);

  const inv = state.acct.investors;
  els.invest.classList.toggle('hidden', !inv && !state.acct.exits);
  const invStr = `👤 ${fmtInt(inv)}`;
  if (els.invest.textContent !== invStr) els.invest.textContent = invStr;

  els.save.classList.toggle('pulse', performance.now() < saveFlashUntil);
}

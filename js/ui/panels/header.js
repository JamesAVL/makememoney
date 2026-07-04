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
import { openInbox, unreadStory } from '../components/dm.js';
import { isModalOpen } from '../components/modal.js';
import { icon } from '../icons.js';
import { brandArt } from '../art.js';

let els = {};
let state_ = null;
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
      <span class="brand"><span class="brand-mark">${brandArt('hustleos-mark', 20)}</span>HustleOS™</span>
      <span class="ver">v5.0.0 “Mentorship”</span>
    </div>
    <div class="kpi-cash">
      <span class="val num" id="k-cash">$0</span>
      <span class="rate-chip num" id="k-rate">+$0/sec</span>
    </div>
    <div class="kpi-stat" id="k-followers-wrap">
      <span class="label">${icon('eye', { size: 13 })} Followers</span>
      <span class="val" id="k-followers">0</span>
    </div>
    <div class="kpi-stat kpi-hype">
      <span class="label">${icon('lightning', { size: 13 })} Hype <span id="k-hypemult" class="hype-c num"></span></span>
      <div class="bar bar-hype" id="k-hypebar"><div class="bar-fill" id="k-hypefill"></div></div>
    </div>
    <div class="kpi-stat kpi-xp">
      <span class="label">Hustler <b id="k-level" class="data-c">Lv 1</b></span>
      <div class="bar"><div class="bar-fill" id="k-xpfill" style="background:var(--data)"></div></div>
    </div>
    <div class="kpi-right">
      <span class="kpi-invest num hidden" id="k-invest" title="Unspent investors: +4% income each">${icon('users-three', { size: 14 })} <span id="k-invest-n">0</span></span>
      <button class="icon-btn" id="k-inbox" title="Mentorship inbox (i)">${icon('envelope-open', { size: 17 })}<span class="inbox-count hidden" id="k-unread"></span></button>
      <button class="icon-btn" id="k-theme" title="Light/dark mode"></button>
      <button class="icon-btn" id="k-mute" title="Sound on/off"></button>
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
    investN: root.querySelector('#k-invest-n'),
    mute: root.querySelector('#k-mute'),
    save: root.querySelector('#k-save'),
    unread: root.querySelector('#k-unread'),
    hypeWrap: root.querySelector('.kpi-hype'),
    xpWrap: root.querySelector('.kpi-xp'),
  };

  root.querySelector('#k-inbox').addEventListener('click', () => {
    if (!isModalOpen()) openInbox();
  });

  createOdometer(els.cash, () => state_.run.cash, fmtCash);
  createTicker(els.followers, () => state_.run.followers, (n) => fmtInt(n));

  root.querySelector('#logo').addEventListener('click', () => {
    state_.acct.stats.logoClicks++;
  });
  const themeBtn = root.querySelector('#k-theme');
  const themeIcon = () => { themeBtn.innerHTML = icon(state_.settings.theme === 'light' ? 'sun' : 'moon', { size: 17 }); };
  themeBtn.addEventListener('click', () => {
    state_.settings.theme = state_.settings.theme === 'light' ? 'dark' : 'light';
    applyTheme(state_.settings.theme);
    themeIcon();
    saveToStorage(state_, Date.now());
  });
  themeIcon();
  const muteIcon = () => { els.mute.innerHTML = icon(state_.settings.muted ? 'speaker-slash' : 'speaker-high', { size: 17 }); };
  els.mute.addEventListener('click', () => {
    state_.settings.muted = !state_.settings.muted;
    setMuted(state_.settings.muted);
    muteIcon();
    saveToStorage(state_, Date.now());
  });
  muteIcon();

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

  // Meters stay hidden until Chase introduces their systems.
  els.hypeWrap.classList.toggle('hidden', !state.story.unlocks.hype);
  els.xpWrap.classList.toggle('hidden', !state.story.unlocks.levels);

  const d = getDerived(state);
  const hypePct = Math.min(100, (state.run.hype / d.hypeMax) * 100);
  els.hypefill.style.width = hypePct + '%';
  els.hypebar.classList.toggle('shimmer', hypePct > 80);
  const hm = hypeMult(state);
  const hmStr = hm > 1.01 ? `×${hm.toFixed(2)}` : '';
  if (els.hypemult.textContent !== hmStr) els.hypemult.textContent = hmStr;

  // Hype tier slams — once per account each (noise diet).
  for (const [threshold, name] of HYPE_TIERS) {
    if (state.run.hype >= threshold) {
      if (!state.ftue.seenHypeTier[threshold]) {
        state.ftue.seenHypeTier[threshold] = true;
        slam(name);
      }
      break;
    }
  }

  const lvlStr = `Lv ${state.acct.level}`;
  if (els.level.textContent !== lvlStr) els.level.textContent = lvlStr;
  els.xpfill.style.width = Math.min(100, (state.acct.xp / xpToNext(state.acct.level)) * 100) + '%';

  const showF = state.story.unlocks.postad || state.run.followers > 0;
  els.followersWrap.classList.toggle('hidden', !showF);

  const unread = unreadStory(state);
  const unreadStr = unread ? String(unread) : '';
  if (els.unread.textContent !== unreadStr) {
    els.unread.textContent = unreadStr;
    els.unread.classList.toggle('hidden', !unread);
  }

  const inv = state.acct.investors;
  els.invest.classList.toggle('hidden', !inv && !state.acct.exits);
  const invStr = fmtInt(inv);
  if (els.investN.textContent !== invStr) els.investN.textContent = invStr;

  els.save.classList.toggle('pulse', performance.now() < saveFlashUntil);
}

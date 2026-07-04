// Celebration orchestrator, v5: unlocks are granted by Chase's DMs
// (js/core/story.js is the only unlock writer) — this file just listens and
// celebrates, on a strict noise diet. No text box ever blocks input.

import { bus } from '../../core/bus.js';
import { celebrateUnlock, celebrateConfetti, celebrate, slam } from '../components/celebrate.js';
import { toast } from '../components/toast.js';
import { deliverDM } from '../components/dm.js';
import { sUnlock, sToast, sLevelUp, sWave, sHit } from '../../audio/synth.js';
import { TAGS_BY_ID } from '../../data/ads.js';
import { PRODUCTS_BY_ID } from '../../data/products.js';
import { LEVEL_UNLOCKS } from '../../data/prestige.js';
import { BEATS_BY_ID } from '../../data/story.js';
import { injectReviews } from './feed.js';

let state_ = null;

// What each gating beat reveals, for the post-ACK celebration toast.
const UNLOCK_CELEBRATIONS = {
  products: { icon: '📦', name: 'Products', sub: 'Buy stuff to sell stuff. The stuff is bad. The margins are beautiful.' },
  adstudio: { icon: '🎬', name: 'Ad Studio', sub: 'Spin up a viral video. What could go wrong (statistically, a lot).', big: true },
  upgrades: { icon: '⬆️', name: 'Upgrades', sub: 'Conversion Tools. Fake countdown timers. Real money.' },
  postad: { icon: '📣', name: 'POST AD', sub: 'Followers are pre-customers. Start posting.' },
  instaglam: { icon: '📸', name: 'Instaglam', sub: 'Pays followers, not cash. Post pretty, harvest later.' },
  hype: { icon: '🔥', name: 'Hype', sub: 'Performed enthusiasm, monetized. It decays when you rest.' },
  trends: { icon: '📈', name: 'Trends', sub: 'The algorithm has weather. Sell the weather.' },
  facespace: { icon: '👴', name: 'FaceSpace', sub: 'One eternal ad slot. Nana trusts you.' },
  flexes: { icon: '🏆', name: 'Flexes', sub: 'Each one pays +1% income. Flexing is fiscal policy.' },
  levels: { icon: '⬆️', name: 'Hustler Levels', sub: 'The grind now has a number. It only goes up.' },
  standup: { icon: '🌅', name: 'Daily Standup', sub: 'Show up daily: streak bonus + a guaranteed HIT.' },
  exit: { icon: '🧘', name: 'Guru Mode', sub: 'Blandrock Capital has entered the chat.', big: true },
};

// Noise rule 4: $1K/$100K parties demoted to plain toasts; big three halved.
const CASH_CONFETTI = [
  [1e3, 0, '$1K! Technically an entrepreneur.'],
  [1e5, 0, '$100K! Six figures (real ones).'],
  [1e6, 90, '$1M! The garage is now “HQ”.'],
  [1e9, 120, '$1B! Unicorn-adjacent.'],
  [1e12, 140, '$1T! Nations return your calls.'],
];

export function init(state) {
  state_ = state;
  if (!state.ftue.cashParty) state.ftue.cashParty = {};

  // --- Story: deliveries surface as DMs; grants celebrate on ACK ---
  bus.on('story:beat', ({ id }) => {
    deliverDM(id, toast);
  });
  bus.on('story:ack', ({ id }) => {
    const beat = BEATS_BY_ID[id];
    if (!beat) return;
    if (beat.unlocks && UNLOCK_CELEBRATIONS[beat.unlocks]) {
      const c = UNLOCK_CELEBRATIONS[beat.unlocks];
      celebrateUnlock({ ...c, big: beat.celebrate === 'big' });
      sUnlock();
    }
    if (id === 'flexes_intro') {
      const n = Object.keys(state_.acct.achievements).length;
      if (n) toast({ icon: '🏆', name: `${n} Flexes already banked`, sub: 'Chase kept receipts. +1% income each.', tone: 'gold' });
    }
    if (id === 'lesson_review') injectReviews(3);
  });

  // Noise rule 12: achievements accrue silently until Chase reveals Flexes.
  bus.on('achievement', (a) => {
    if (!state_.story.unlocks.flexes) return;
    sToast();
    toast({ icon: a.icon, name: a.name, sub: `${a.desc} (+1% income)`, tone: 'gold' });
  });

  // Noise rule 6: level toasts only after levels_intro, and only for levels
  // that unlock something (or every 5th). The XP bar pulse covers the rest.
  bus.on('level:up', ({ level }) => {
    if (!state_.story.unlocks.levels) return;
    const unlock = LEVEL_UNLOCKS[level];
    if (!unlock && level % 5 !== 0) return;
    sLevelUp();
    toast({
      icon: '🆙',
      name: `Hustler Level ${level}`,
      sub: unlock ? `UNLOCKED: ${unlock.label} — ${unlock.desc}` : '+1% income, +1 perk point',
      tone: 'data',
    });
    if (unlock) celebrateConfetti(24);
  });

  // Noise rule 13: product unlocks flow through the celebration queue.
  bus.on('product:unlock', ({ id }) => {
    const p = PRODUCTS_BY_ID[id];
    celebrate(() => {
      sUnlock();
      toast({ icon: p.icon, name: `New product: ${p.name}`, sub: p.desc });
    });
  });

  // Noise rule 11: only the first two milestones per product get a toast.
  bus.on('milestone', ({ id, count, hits }) => {
    if (hits > 2) return;
    const p = PRODUCTS_BY_ID[id];
    toast({ icon: p.icon, name: `${p.name} ×2`, sub: `${count} owned — income doubled. “${p.milestoneName}”` });
    sHit();
  });

  bus.on('wave:start', ({ tag, endMs }) => {
    sWave();
    showWaveBanner(tag, endMs);
  });
  bus.on('wave:end', ({ ridden }) => {
    removeWaveBanner();
    if (ridden) toast({ icon: '🏄', name: 'Surfed it.', sub: '+20 Hype. The algorithm nods approvingly.' });
  });

  bus.on('upgrade', () => sToast());
}

// 1 Hz-ish check driven from the render loop.
let lastCheck = 0;
export function update(state, now) {
  if (now - lastCheck < 500) return;
  lastCheck = now;

  for (const [threshold, count, msg] of CASH_CONFETTI) {
    const key = String(threshold);
    if (!state.ftue.cashParty[key] && state.acct.lifetimeAllTime >= threshold) {
      state.ftue.cashParty[key] = true;
      if (count) {
        celebrateConfetti(count, threshold >= 1e6);
        slam(`💰 ${msg}`);
      } else {
        toast({ icon: '💰', name: msg, tone: 'gold' });
      }
    }
  }

  updateWaveCountdown(state);
}

// --- Wave banner ---
let waveBanner = null;
function showWaveBanner(tag, endMs) {
  removeWaveBanner();
  const label = TAGS_BY_ID[tag]?.label || tag;
  waveBanner = document.createElement('div');
  waveBanner.className = 'banner';
  waveBanner.style.position = 'relative';
  waveBanner.innerHTML = `
    <span style="font-size:19px">🌊</span>
    <span><b>${label} IS SURGING</b> — matching products ×3, matching ads +12% odds</span>
    <span class="num muted b-count" style="font-size:11px"></span>
    <div class="countdown" style="width:100%"></div>`;
  document.getElementById('banners').appendChild(waveBanner);
  waveBanner.dataset.endMs = endMs;
}

function updateWaveCountdown(state) {
  if (!waveBanner) return;
  const remain = Math.max(0, Number(waveBanner.dataset.endMs) - state.sim.timeMs);
  const total = 90000;
  waveBanner.querySelector('.b-count').textContent = `${Math.ceil(remain / 1000)}s`;
  waveBanner.querySelector('.countdown').style.width = `${Math.min(100, (remain / total) * 100)}%`;
}

function removeWaveBanner() {
  if (waveBanner) {
    const b = waveBanner;
    waveBanner = null;
    b.classList.add('out');
    setTimeout(() => b.remove(), 320);
  }
}

// Progressive-disclosure orchestrator: tab unlocks (every unlock is a
// celebration, each introduces exactly one mechanic), wave banners,
// achievement/level toasts, confetti thresholds. No text box ever blocks input.

import { bus } from '../../core/bus.js';
import { celebrateUnlock, celebrateConfetti, slam } from '../components/celebrate.js';
import { toast } from '../components/toast.js';
import { sUnlock, sToast, sLevelUp, sWave, sHit } from '../../audio/synth.js';
import { TAGS_BY_ID } from '../../data/ads.js';
import { PRODUCTS_BY_ID } from '../../data/products.js';
import { LEVEL_UNLOCKS } from '../../data/prestige.js';
import { fmtCash } from '../fmt.js';

let state_ = null;

const TAB_UNLOCKS = [
  { id: 'products', gate: (s) => s.run.lifetimeCash >= 10, icon: '📦', name: 'Products', sub: 'Buy stuff to sell stuff. The stuff is bad. The margins are beautiful.' },
  { id: 'adstudio', gate: (s) => s.run.lifetimeCash >= 50, icon: '🎬', name: 'Ad Studio', sub: 'Spin up a viral video. What could go wrong (statistically, a lot).', big: true },
  { id: 'upgrades', gate: (s) => s.run.lifetimeCash >= 250, icon: '⬆️', name: 'Upgrades', sub: 'Fake countdown timers. Real money.' },
  { id: 'trends', gate: (s) => s.run.lifetimeCash >= 1500 || s.acct.stats.totalLaunches >= 3, icon: '📈', name: 'Trends', sub: 'Read the algorithm. Ride the wave.' },
  { id: 'guru', gate: (s) => s.acct.level >= 10, icon: '🧘', name: 'Guru Mode', sub: 'Blandrock Capital has entered the chat.', big: true },
  { id: 'flexes', gate: (s) => Object.keys(s.acct.achievements).length >= 1, icon: '🏆', name: 'Flexes', sub: 'Achievements. Each one pays +1% income. Flexing is fiscal policy.' },
];

const CASH_CONFETTI = [
  [1e3, 60, '$1K! Technically an entrepreneur.'],
  [1e5, 100, '$100K! Six figures (real ones).'],
  [1e6, 180, '$1M! The garage is now “HQ”.'],
  [1e9, 220, '$1B! Unicorn-adjacent.'],
  [1e12, 250, '$1T! Nations return your calls.'],
];

export function init(state) {
  state_ = state;
  if (!state.ftue.cashParty) state.ftue.cashParty = {};

  bus.on('achievement', (a) => {
    sToast();
    toast({ icon: a.icon, name: a.name, sub: `${a.desc} (+1% income)`, tone: 'gold' });
  });

  bus.on('level:up', ({ level }) => {
    // Levels 1–5 are silent (the XP bar is enough) — the level SYSTEM gets
    // its reveal at 6. After that, toast every level; big ones celebrate.
    if (level < 6) return;
    sLevelUp();
    const unlock = LEVEL_UNLOCKS[level];
    toast({
      icon: '🆙',
      name: `Hustler Level ${level}`,
      sub: unlock ? `UNLOCKED: ${unlock.label} — ${unlock.desc}` : '+1% income, +1 perk point',
      tone: 'data',
    });
    if (unlock) celebrateConfetti(40);
  });

  bus.on('product:unlock', ({ id }) => {
    const p = PRODUCTS_BY_ID[id];
    sUnlock();
    toast({ icon: p.icon, name: `New product: ${p.name}`, sub: p.desc });
  });

  bus.on('milestone', ({ id, count }) => {
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

  for (const t of TAB_UNLOCKS) {
    if (state.ftue.unlocks[t.id] || !t.gate(state)) continue;
    state.ftue.unlocks[t.id] = true;
    celebrateUnlock({ icon: t.icon, name: t.name, sub: t.sub, big: t.big });
    sUnlock();
  }

  for (const [threshold, count, msg] of CASH_CONFETTI) {
    const key = String(threshold);
    if (!state.ftue.cashParty[key] && state.acct.lifetimeAllTime >= threshold) {
      state.ftue.cashParty[key] = true;
      celebrateConfetti(count, threshold >= 1e6);
      slam(`💰 ${msg}`);
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

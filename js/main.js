// Bootstrap: load save → offline reveal → mount panels → start loop.

import { createInitialState } from './core/state.js';
import { loadFromStorage, saveToStorage, computeOffline, applyOffline, onSessionStart } from './core/save.js';
import { startLoop } from './core/loop.js';
import { getDerived, totalCps } from './core/balance.js';
import { bus } from './core/bus.js';
import { registerPanel, flush } from './ui/render.js';
import { setNotation, fmtCash, fmtInt, fmtDur } from './ui/fmt.js';
import { initParticles, particlesFrame, setParticlesEnabled } from './ui/components/particles.js';
import { tickersFrame } from './ui/components/ticker.js';
import { setShakeEnabled } from './ui/components/celebrate.js';
import { showModal } from './ui/components/modal.js';
import { unlockAudio, sChaChing } from './audio/synth.js';
import { OFFLINE_LINES, OFFLINE_FOOTNOTES } from './data/flavor.js';

import * as header from './ui/panels/header.js';
import * as nav from './ui/panels/nav.js';
import * as dashboard from './ui/panels/dashboard.js';
import * as products from './ui/panels/products.js';
import * as adstudio from './ui/panels/adstudio.js';
import * as upgrades from './ui/panels/upgrades.js';
import * as trends from './ui/panels/trends.js';
import * as guru from './ui/panels/guru.js';
import * as flexes from './ui/panels/flexes.js';
import * as settings from './ui/panels/settings.js';
import * as feed from './ui/panels/feed.js';
import * as goal from './ui/panels/goal.js';
import * as tickerbar from './ui/panels/tickerbar.js';
import * as moments from './ui/panels/moments.js';
import * as onboard from './ui/panels/onboard.js';

const now = Date.now();

// --- Multi-tab guard: one grind at a time ---
const TAB_ID = Math.random().toString(36).slice(2);
const HB_KEY = 'shiphappens.heartbeat';
function heartbeat() {
  try { localStorage.setItem(HB_KEY, JSON.stringify({ id: TAB_ID, t: Date.now() })); } catch { /* private mode */ }
}
function otherTabActive() {
  try {
    const hb = JSON.parse(localStorage.getItem(HB_KEY) || 'null');
    return hb && hb.id !== TAB_ID && Date.now() - hb.t < 5000;
  } catch { return false; }
}
// Release the heartbeat on the way out so a same-tab reload isn't mistaken
// for a second tab.
window.addEventListener('pagehide', () => {
  try {
    const hb = JSON.parse(localStorage.getItem(HB_KEY) || 'null');
    if (hb && hb.id === TAB_ID) localStorage.removeItem(HB_KEY);
  } catch { /* nothing to release */ }
});

function boot() {
  // --- Load or create ---
  const loaded = loadFromStorage(now);
  const state = loaded ? loaded.state : createInitialState(now);
  const isFresh = !loaded;
  const awayMs = loaded ? Math.max(0, now - (loaded.savedAt || state.meta.lastSeen)) : 0;

  setNotation(state.settings.notation);
  setParticlesEnabled(state.settings.particles);
  setShakeEnabled(state.settings.shake);
  unlockAudio(state.settings);
  initParticles();

  // --- Offline progress (computed before schedulers re-arm) ---
  let offlineReport = null;
  if (loaded && awayMs > 5 * 60 * 1000) {
    offlineReport = computeOffline(state, awayMs);
  }
  onSessionStart(state, awayMs);

  // --- Mount panels ---
  header.mount(document.getElementById('kpi'), state);
  nav.mount(document.getElementById('nav'), state);
  dashboard.mount(document.getElementById('panel-dashboard'), state);
  products.mount(document.getElementById('panel-products'), state);
  adstudio.mount(document.getElementById('panel-adstudio'), state);
  upgrades.mount(document.getElementById('panel-upgrades'), state);
  trends.mount(document.getElementById('panel-trends'), state);
  guru.mount(document.getElementById('panel-guru'), state);
  flexes.mount(document.getElementById('panel-flexes'), state);
  settings.mount(document.getElementById('panel-settings'), state);
  feed.mount(document.getElementById('feed'), state);
  goal.mount(document.getElementById('next-goal'), state);
  tickerbar.mount(document.getElementById('ticker'), state);
  moments.mount(null, state);
  onboard.init(state);

  // All panels self-throttle; run them every frame for simplicity + liveness.
  registerPanel('header', header, { everyFrame: true });
  registerPanel('nav', nav, { everyFrame: true });
  registerPanel('dashboard', dashboard, { everyFrame: true });
  registerPanel('products', products, { everyFrame: true });
  registerPanel('adstudio', adstudio, { everyFrame: true });
  registerPanel('upgrades', upgrades, { everyFrame: true });
  registerPanel('trends', trends, { everyFrame: true });
  registerPanel('guru', guru, { everyFrame: true });
  registerPanel('flexes', flexes, { everyFrame: true });
  registerPanel('settings', settings, { everyFrame: true });

  // --- Render flush wiring ---
  const renderFlush = (s, frameNow) => {
    flush(s, frameNow);
    goal.update(s, frameNow);
    feed.update(s, frameNow);
    onboard.update(s, frameNow);
    tickersFrame(frameNow);
    particlesFrame(frameNow);
  };

  // --- Keyboard shortcuts ---
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === ' ') {
      e.preventDefault();
      document.getElementById('d-pack')?.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true,
      }));
    } else if (e.key === 'e' || e.key === 'E') {
      document.getElementById('a-spin')?.click();
    } else if (e.key >= '1' && e.key <= '8') {
      const tabs = nav.TABS;
      const t = tabs[Number(e.key) - 1];
      if (t) nav.switchTab(t.id);
    }
  });

  // --- Welcome back / first boot ---
  if (offlineReport && offlineReport.cash > 0) {
    const line = OFFLINE_LINES[Math.floor(Math.random() * OFFLINE_LINES.length)];
    const foot = OFFLINE_FOOTNOTES[Math.floor(Math.random() * OFFLINE_FOOTNOTES.length)];
    const orders = Math.floor(offlineReport.cash / 12);
    showModal({
      title: line,
      body: `<div class="offline-report">
        <div>⏰ Away: <b>${fmtDur(offlineReport.awayMs)}</b>${offlineReport.cappedMs < offlineReport.awayMs ? ' <span class="muted">(capped)</span>' : ''}</div>
        <div>📦 Orders shipped: <b>${fmtInt(orders)}</b></div>
        ${offlineReport.followers > 0 ? `<div>👁 Followers gained: <b>+${fmtInt(offlineReport.followers)}</b></div>` : ''}
        <div class="o-big">💰 +${fmtCash(offlineReport.cash)}</div>
        <div class="muted" style="font-size:11.5px">Offline rate: ${Math.round(offlineReport.rate * 100)}% · ${foot}</div>
      </div>`,
      dismissible: false,
      actions: [
        {
          label: 'BACK TO THE GRIND',
          onClick: () => { applyOffline(state, offlineReport, false); sChaChing(true); },
        },
        {
          label: '📺 Watch “sponsor ad” to DOUBLE it',
          class: 'btn-gold',
          onClick: () => {
            // The sponsor ad is 4 seconds of nothing. It always was.
            showModal({
              title: 'A word from our sponsor',
              body: '<div style="text-align:center;padding:26px 8px"><div style="font-size:40px" id="spon">📺</div><div class="muted" style="font-size:12px">BUY. CONSUME. ENGAGE.<br>(this ad is fake, the doubling is real)</div></div>',
              dismissible: false,
              actions: [],
            });
            setTimeout(() => {
              applyOffline(state, offlineReport, true);
              sChaChing(true);
              showModal({
                title: 'DOUBLED.',
                body: `<div class="offline-report"><div class="o-big">💰 +${fmtCash(offlineReport.cash * 2)}</div><div class="muted">Thanks for watching. The sponsor was us.</div></div>`,
                actions: [{ label: 'BACK TO THE GRIND' }],
              });
            }, 4000);
          },
        },
      ],
    });
  }

  // --- Start ---
  heartbeat();
  setInterval(heartbeat, 2000);
  startLoop(state, renderFlush);
  if (isFresh) saveToStorage(state, Date.now());

  // Dev handles (?dev=1): headless-style pokes from the console.
  if (location.search.includes('dev=1')) {
    window.dev = {
      state,
      give: (n) => { state.run.cash += n; state.run.lifetimeCash += n; state.acct.lifetimeAllTime += n; },
      cps: () => totalCps(state),
      derived: () => getDerived(state),
      wave: () => { state.sim.nextWaveMs = state.sim.timeMs + 1000; },
      moment: () => { state.sim.nextMomentMs = state.sim.timeMs; },
      energy: () => { state.run.energy = 6; },
      bus,
    };
  }
}

// Multi-tab: if another tab has a fresh heartbeat, require takeover.
if (otherTabActive()) {
  showModal({
    title: 'HustleOS is open in another tab',
    body: '<div class="muted">One grind at a time. Running two dashboards would double-count your delusions (and corrupt your save).</div>',
    dismissible: false,
    actions: [{ label: 'Grind HERE instead', onClick: () => { heartbeat(); boot(); } }],
  });
} else {
  boot();
}

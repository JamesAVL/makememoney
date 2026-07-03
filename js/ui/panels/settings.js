// Settings: sound, notation, particles/shake, save export/import, hard reset
// (double confirm + auto-export), stats, and the keyboard cheat-sheet.

import { setVolume, setMuted } from '../../audio/synth.js';
import { setNotation, fmtCash, fmtDur, fmtInt } from '../fmt.js';
import { exportSave, importSave, hardReset, saveToStorage } from '../../core/save.js';
import { setParticlesEnabled } from '../components/particles.js';
import { setShakeEnabled } from '../components/celebrate.js';
import { showModal } from '../components/modal.js';
import { applyTheme } from '../theme.js';
import { toast } from '../components/toast.js';
import {
  hapticsSupported, setHapticsEnabled, wakeLockSupported, setWakeLock,
  fullscreenSupported, toggleFullscreen, storageStatus, requestPersistence,
} from '../../native/device.js';
import { canInstall, promptInstall, isStandalone, isIOS } from '../../native/pwa.js';

let state_ = null;
let statsEl = null;

export function mount(root, state) {
  state_ = state;
  root.innerHTML = `
    <div class="panel">
      <div class="panel-title"><span>⚙️ Settings — HustleOS™ Control Panel</span></div>
      <div style="display:grid;gap:14px;max-width:460px">
        <label style="display:flex;justify-content:space-between;align-items:center">
          <span>🌙 Theme</span>
          <span class="qty-toggle">
            <button id="s-dark">Dark</button>
            <button id="s-light">Light</button>
          </span>
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <span>🔊 Volume</span>
          <input type="range" id="s-vol" min="0" max="1" step="0.05" style="flex:1;max-width:200px">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center">
          <span>🔇 Mute</span><input type="checkbox" id="s-mute">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center">
          <span>🔢 Scientific notation</span><input type="checkbox" id="s-sci">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center">
          <span>✨ Particles &amp; ambient FX</span><input type="checkbox" id="s-part">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center">
          <span>📳 Screen shake</span><input type="checkbox" id="s-shake">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center" id="s-haptics-row">
          <span>🫨 Haptics</span><input type="checkbox" id="s-haptics">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center" id="s-wake-row">
          <span>☕ Keep screen awake <span class="muted">(“Grind Mode”)</span></span><input type="checkbox" id="s-wake">
        </label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn hidden" id="s-fullscreen">⛶ Fullscreen</button>
          <button class="btn hidden" id="s-install">📲 Install HustleOS</button>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title"><span>💾 Save management — “Synced to Cloud™ (your browser)”</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <button class="btn" id="s-export">📤 Export save</button>
        <button class="btn" id="s-import">📥 Import save</button>
        <button class="btn" id="s-reset" style="border-color:var(--danger);color:var(--danger)">💥 Hard reset</button>
      </div>
      <textarea id="s-io" rows="3" style="width:100%;background:var(--bg-raised);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);font-family:var(--font-num);font-size:11px;padding:8px" placeholder="Exported saves appear here. Paste one and hit Import to restore."></textarea>
      <div class="muted" style="font-size:11px;margin-top:6px">
        Saves live in this browser's localStorage. Export before switching devices —
        browsers sometimes evict storage after long absences.
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:11.5px">
        <span id="s-storage" class="muted"></span>
        <button class="btn btn-ghost hidden" id="s-pin" style="min-height:28px;padding:3px 10px;font-size:11.5px">🛡 Pin my save</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title"><span>📊 Lifetime stats</span></div>
      <table class="mini-table" id="s-stats"></table>
    </div>

    <div class="panel">
      <div class="panel-title"><span>⌨️ Shortcuts</span></div>
      <table class="mini-table">
        <tr><td>Space</td><td>Pack Order</td></tr>
        <tr><td>E</td><td>Spin the ad reels</td></tr>
        <tr><td>1–8</td><td>Switch tabs</td></tr>
      </table>
      <div class="muted" style="font-size:11px;margin-top:10px">
        Ship Happens v1.0 — “Sell everything. Learn nothing.”<br>
        Patch notes: we fixed nothing. Everything is intentional, especially the bugs that pay you.
      </div>
    </div>`;

  const vol = root.querySelector('#s-vol');
  const mute = root.querySelector('#s-mute');
  const sci = root.querySelector('#s-sci');
  const part = root.querySelector('#s-part');
  const shake = root.querySelector('#s-shake');
  statsEl = root.querySelector('#s-stats');

  const darkBtn = root.querySelector('#s-dark');
  const lightBtn = root.querySelector('#s-light');
  const syncTheme = () => {
    darkBtn.classList.toggle('active', state_.settings.theme !== 'light');
    lightBtn.classList.toggle('active', state_.settings.theme === 'light');
  };
  const setTheme = (t) => {
    state_.settings.theme = t;
    applyTheme(t);
    syncTheme();
  };
  darkBtn.addEventListener('click', () => setTheme('dark'));
  lightBtn.addEventListener('click', () => setTheme('light'));
  syncTheme();

  vol.value = state.settings.volume;
  mute.checked = state.settings.muted;
  sci.checked = state.settings.notation === 'sci';
  part.checked = state.settings.particles;
  shake.checked = state.settings.shake;

  vol.addEventListener('input', () => {
    state_.settings.volume = Number(vol.value);
    setVolume(state_.settings.volume);
  });
  mute.addEventListener('change', () => {
    state_.settings.muted = mute.checked;
    setMuted(mute.checked);
  });
  sci.addEventListener('change', () => {
    state_.settings.notation = sci.checked ? 'sci' : 'short';
    setNotation(state_.settings.notation);
  });
  part.addEventListener('change', () => {
    state_.settings.particles = part.checked;
    setParticlesEnabled(part.checked);
    document.body.classList.toggle('fx-off', !part.checked);
  });
  shake.addEventListener('change', () => {
    state_.settings.shake = shake.checked;
    setShakeEnabled(shake.checked);
  });

  // --- Native rows (feature-detected) ---
  const hapticsRow = root.querySelector('#s-haptics-row');
  const haptics = root.querySelector('#s-haptics');
  if (hapticsSupported()) {
    haptics.checked = state.settings.haptics !== false;
    haptics.addEventListener('change', () => {
      state_.settings.haptics = haptics.checked;
      setHapticsEnabled(haptics.checked);
      if (haptics.checked) navigator.vibrate?.(15);
    });
  } else {
    hapticsRow.classList.add('hidden');
  }

  const wakeRow = root.querySelector('#s-wake-row');
  const wake = root.querySelector('#s-wake');
  if (wakeLockSupported()) {
    wake.checked = !!state.settings.wakeLock;
    wake.addEventListener('change', () => {
      state_.settings.wakeLock = wake.checked;
      setWakeLock(wake.checked);
    });
  } else {
    wakeRow.classList.add('hidden');
  }

  const fs = root.querySelector('#s-fullscreen');
  if (fullscreenSupported() && !isStandalone()) {
    fs.classList.remove('hidden');
    fs.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', () => {
      fs.textContent = document.fullscreenElement ? '⛶ Exit fullscreen' : '⛶ Fullscreen';
    });
  }

  const install = root.querySelector('#s-install');
  const refreshInstall = () => {
    install.classList.toggle('hidden', isStandalone() || (!canInstall() && !isIOS()));
  };
  refreshInstall();
  document.addEventListener('sh:installable', refreshInstall);
  document.addEventListener('sh:installed', refreshInstall);
  install.addEventListener('click', async () => {
    if (canInstall()) {
      await promptInstall();
    } else if (isIOS()) {
      showModal({
        title: 'Install on iPhone/iPad',
        body: '<div class="muted">In Safari: tap <b>Share</b> ▸ <b>Add to Home Screen</b>.<br><br>'
          + '⚠️ The installed app keeps its <b>own save</b>. 📤 Export here first, then 📥 Import inside the app. '
          + 'Silver lining: the installed app is exempt from Safari’s storage eviction — installing IS the save-durability upgrade.</div>',
        actions: [{ label: 'Got it' }],
      });
    }
  });

  const storageEl = root.querySelector('#s-storage');
  const pin = root.querySelector('#s-pin');
  storageStatus().then((persisted) => {
    if (persisted === null) return;
    if (persisted) {
      storageEl.textContent = '🛡 Storage: PERSISTENT — the browser pinky-promised not to evict your empire.';
    } else {
      storageEl.textContent = 'Storage: best-effort — export regularly, or:';
      pin.classList.remove('hidden');
      pin.addEventListener('click', async () => {
        const ok = await requestPersistence();
        if (ok) {
          storageEl.textContent = '🛡 Storage: PERSISTENT — empire pinned.';
          pin.classList.add('hidden');
        } else {
          toast({ icon: '🤝', name: 'Not yet', sub: 'The browser wants more “engagement” first. Keep grinding (or install the app).' });
        }
      });
    }
  });

  const io = root.querySelector('#s-io');
  root.querySelector('#s-export').addEventListener('click', () => {
    io.value = exportSave(state_, Date.now());
    io.select();
    navigator.clipboard?.writeText(io.value).catch(() => { /* clipboard optional */ });
    toast({ icon: '📤', name: 'Save exported', sub: 'Copied to clipboard (and the box below)' });
  });
  root.querySelector('#s-import').addEventListener('click', () => {
    try {
      const { state: imported } = importSave(io.value, Date.now());
      showModal({
        title: 'Import this empire?',
        body: `<div class="muted">Lifetime earnings: <b class="money">${fmtCash(imported.acct.lifetimeAllTime)}</b><br>
          Exits: ${imported.acct.exits} · Level ${imported.acct.level}<br><br>
          Your current save will be overwritten (a backup slot is kept).</div>`,
        actions: [
          {
            label: 'Import & reload',
            onClick: () => {
              saveToStorage(imported, Date.now());
              location.reload();
            },
          },
          { label: 'Cancel', class: 'btn-ghost' },
        ],
      });
    } catch (e) {
      toast({ icon: '❌', name: 'Import failed', sub: String(e.message || e), tone: 'gold' });
    }
  });
  root.querySelector('#s-reset').addEventListener('click', () => {
    showModal({
      title: 'Hard reset — delete EVERYTHING?',
      body: '<div class="muted">Levels, exits, investors, achievements: all of it, gone. This is not an Exit. There is no prestige bonus. There is only the void (and a fresh Banana Slicer).</div>',
      actions: [
        {
          label: 'Yes, delete it all',
          class: 'btn',
          onClick: () => {
            const backup = exportSave(state_, Date.now());
            showModal({
              title: 'Absolutely sure?',
              body: `<div class="muted">Last chance. A backup export of your save:<br>
                <textarea rows="2" style="width:100%;font-size:10px;background:var(--bg-raised);color:var(--text-lo);border:1px solid var(--border);border-radius:6px">${backup}</textarea></div>`,
              actions: [
                {
                  label: 'DELETE. THE. EMPIRE.',
                  onClick: () => {
                    hardReset();
                    location.reload();
                  },
                },
                { label: 'Keep my empire', class: 'btn-ghost' },
              ],
            });
          },
        },
        { label: 'Never mind', class: 'btn-primary' },
      ],
    });
  });
}

let lastStats = 0;
export function update(state, now) {
  if (now && now - lastStats < 1000) return;
  lastStats = now || 0;
  const st = state.acct.stats;
  const rows = [
    ['Lifetime earnings (all runs)', fmtCash(state.acct.lifetimeAllTime)],
    ['Total playtime', fmtDur(state.meta.playtimeMs)],
    ['Orders packed by hand', fmtInt(st.totalClicks)],
    ['Ads launched', fmtInt(st.totalLaunches)],
    ['Viral hits', `${fmtInt(st.viralHits)} (${fmtInt(st.megaVirals)} mega)`],
    ['Waves ridden', fmtInt(st.wavesRidden)],
    ['Companies sold', fmtInt(state.acct.exits)],
    ['Peak income', fmtCash(st.bestCps) + '/s'],
  ]
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join('');
  if (statsEl.innerHTML !== rows) statsEl.innerHTML = rows;
}

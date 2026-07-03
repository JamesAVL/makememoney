// Settings: sound, notation, particles/shake, save export/import, hard reset
// (double confirm + auto-export), stats, and the keyboard cheat-sheet.

import { setVolume, setMuted } from '../../audio/synth.js';
import { setNotation, fmtCash, fmtDur, fmtInt } from '../fmt.js';
import { exportSave, importSave, hardReset, saveToStorage } from '../../core/save.js';
import { setParticlesEnabled } from '../components/particles.js';
import { setShakeEnabled } from '../components/celebrate.js';
import { showModal } from '../components/modal.js';
import { toast } from '../components/toast.js';

let state_ = null;
let statsEl = null;

export function mount(root, state) {
  state_ = state;
  root.innerHTML = `
    <div class="panel">
      <div class="panel-title"><span>⚙️ Settings — HustleOS™ Control Panel</span></div>
      <div style="display:grid;gap:14px;max-width:460px">
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
          <span>✨ Particles</span><input type="checkbox" id="s-part">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center">
          <span>📳 Screen shake</span><input type="checkbox" id="s-shake">
        </label>
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
  });
  shake.addEventListener('change', () => {
    state_.settings.shake = shake.checked;
    setShakeEnabled(shake.checked);
  });

  const io = root.querySelector('#s-io');
  root.querySelector('#s-export').addEventListener('click', () => {
    io.value = exportSave(state_, Date.now());
    io.select();
    try { navigator.clipboard?.writeText(io.value); } catch { /* clipboard optional */ }
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

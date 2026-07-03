// Dashboard: revenue chart, the PACK ORDER / POST AD buttons, live stat
// tiles, and active-effect chips. The opening act of the whole game.

import { totalCps, clickValue, tempMult, comebackMult, BAL } from '../../core/balance.js';
import { packOrder, postAd } from '../../core/actions.js';
import { fmt, fmtCash, fmtInt } from '../fmt.js';
import { createChart } from '../components/chart.js';
import { floatNum, shake } from '../components/celebrate.js';
import { burst, SPR } from '../components/particles.js';
import { bus } from '../../core/bus.js';
import { sClick, sChaChing } from '../../audio/synth.js';
import { TAGS_BY_ID } from '../../data/ads.js';

let state_ = null;
let els = {};
let chart = null;

export function mount(root, state) {
  state_ = state;
  root.innerHTML = `
    <div id="d-goal-mobile" class="goal-mobile"></div>
    <div class="panel" style="padding-bottom:8px">
      <div class="panel-title">
        <span>Revenue — <span id="d-company"></span></span>
        <span class="chart-pills">
          <span class="qty-toggle" id="d-pills">
            <button data-w="60s" class="active">60s</button>
            <button data-w="10m">10m</button>
            <button data-w="ALL">ALL</button>
          </span>
        </span>
      </div>
      <canvas id="d-chart" style="width:100%;height:190px;display:block"></canvas>
    </div>

    <div style="display:flex;gap:14px;align-items:stretch;flex-wrap:wrap">
      <div class="panel" style="flex:1;min-width:280px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:22px">
        <div class="pack-wrap">
          <div class="pack-rim" aria-hidden="true"></div>
          <button class="pack-btn" id="d-pack">📦 PACK ORDER<span class="sub" id="d-packval">+$1.00</span></button>
          <div class="pack-ring" id="d-ring"></div>
        </div>
        <button class="btn hidden" id="d-post" title="+followers, +hype">
          📣 POST AD <span class="muted num" id="d-postval"></span>
        </button>
        <div id="d-hint" class="muted" style="font-size:12px;text-align:center">
          Step 1: fulfill orders. Step 2: ??? Step 3: profit.
        </div>
      </div>

      <div class="panel" style="flex:1.2;min-width:280px">
        <div class="panel-title">Vitals</div>
        <div class="stat-tiles">
          <div class="stat-tile"><div class="s-label">Income</div><div class="s-val money" id="d-cps">$0/s</div></div>
          <div class="stat-tile"><div class="s-label">Orders/min</div><div class="s-val" id="d-opm">0</div></div>
          <div class="stat-tile"><div class="s-label">Conversion</div><div class="s-val" id="d-conv">3.2%</div></div>
          <div class="stat-tile"><div class="s-label">Vibes</div><div class="s-val" id="d-vibes">—</div></div>
        </div>
        <div id="d-buffs" style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px"></div>
        <div id="d-team" class="hidden" style="margin-top:12px">
          <div class="panel-title" style="margin-bottom:6px">Your Team (unpaid)</div>
          <div id="d-team-list" style="font-size:11.5px;line-height:1.9;color:var(--text-lo)"></div>
        </div>
      </div>
    </div>`;

  els = {
    company: root.querySelector('#d-company'),
    pack: root.querySelector('#d-pack'),
    packval: root.querySelector('#d-packval'),
    ring: root.querySelector('#d-ring'),
    post: root.querySelector('#d-post'),
    postval: root.querySelector('#d-postval'),
    hint: root.querySelector('#d-hint'),
    cps: root.querySelector('#d-cps'),
    opm: root.querySelector('#d-opm'),
    conv: root.querySelector('#d-conv'),
    vibes: root.querySelector('#d-vibes'),
    buffs: root.querySelector('#d-buffs'),
    team: root.querySelector('#d-team'),
    teamList: root.querySelector('#d-team-list'),
  };

  chart = createChart(root.querySelector('#d-chart'));
  root.querySelector('#d-pills').addEventListener('click', (e) => {
    const w = e.target.dataset.w;
    if (!w) return;
    chart.setWindow(w);
    root.querySelectorAll('#d-pills button').forEach((b) => b.classList.toggle('active', b.dataset.w === w));
  });

  els.pack.addEventListener('pointerdown', (e) => {
    const r = packOrder(state_);
    floatNum(e.clientX, e.clientY, `+${fmtCash(r.value)}`, r.crit);
    burst(e.clientX, e.clientY, r.crit ? 12 : 5, r.crit ? SPR.GOLD : SPR.BOX, r.crit ? 190 : 130);
    els.ring.classList.remove('fire');
    void els.ring.offsetWidth;
    els.ring.classList.add('fire');
    sClick(state_.run.hype / 100);
    if (r.crit) {
      shake(1);
      sChaChing(true);
      floatNum(e.clientX, e.clientY - 34, 'BULK ORDER!!', true);
    }
  });

  els.post.addEventListener('pointerdown', (e) => {
    const gained = postAd(state_);
    if (gained != null) {
      floatNum(e.clientX, e.clientY, `+${fmtInt(Math.max(1, gained))} 👁`, false);
      sClick(0.4);
    }
  });

  bus.on('launch', (r) => {
    if (r.outcome.id === 'viral') chart.addPin(state_.sim.timeMs, '🚀');
    if (r.outcome.id === 'mega') chart.addPin(state_.sim.timeMs, '🌋');
  });
  bus.on('wave:start', () => chart.addPin(state_.sim.timeMs, '🌊'));
  bus.on('moment:reward', (r) => { if (r.kind === 'whale') chart.addPin(state_.sim.timeMs, '🐋'); });
}

let lastSlow = 0;
export function update(state, now) {
  const cps = totalCps(state);
  chart.draw(state, now, cps);

  if (now - lastSlow < 250) return;
  lastSlow = now;

  const cName = state.run.companyName;
  if (els.company.textContent !== cName) els.company.textContent = cName;

  const cv = clickValue(state);
  const pv = `+${fmtCash(cv)}`;
  if (els.packval.textContent !== pv) els.packval.textContent = pv;

  const showPost = state.acct.level >= 2;
  els.post.classList.toggle('hidden', !showPost);
  if (showPost) {
    const gain = 1 + BAL.POST_F_COEF * state.run.followers;
    const s = `+${fmtInt(Math.max(1, gain))}`;
    if (els.postval.textContent !== s) els.postval.textContent = s;
  }
  if (state.acct.stats.totalClicks > 12 && els.hint.textContent.startsWith('Step 1')) {
    els.hint.textContent = 'The button loves you back.';
  }

  const cpsStr = `$${fmt(cps)}/s`;
  if (els.cps.textContent !== cpsStr) els.cps.textContent = cpsStr;
  const opm = Math.floor(Math.min(cps * 4.1, 9.9e15));
  els.opm.textContent = fmtInt(opm);
  els.conv.textContent = (2.4 + Math.min(4, Math.log10(cps + 1) * 0.35)).toFixed(1) + '%';

  // "Vibes" — the joke stat that is secretly the combined multiplier
  const temp = tempMult(state);
  const vibe = temp.value * comebackMult(state);
  els.vibes.textContent = vibe > 1.05 ? `×${vibe.toFixed(1)} 🔥` : 'immaculate';

  // Active effect chips
  let chips = '';
  const t = state.sim.timeMs;
  for (const c of state.run.campaigns) {
    const secs = Math.max(0, Math.ceil((c.endMs - t) / 1000));
    chips += `<span class="chip hot">🎬 ${c.outcome.toUpperCase()} ${secs}s</span>`;
  }
  if (state.run.fbSlot) chips += `<span class="chip warm">👴 FaceSpace ×${state.run.fbSlot.mult}</span>`;
  if (state.sim.buffEndMs > t) {
    chips += `<span class="chip hot">✨ ${state.sim.buffLabel} ${Math.ceil((state.sim.buffEndMs - t) / 1000)}s</span>`;
  }
  if (state.sim.comebackEndMs > t) {
    chips += `<span class="chip warm">💚 The algorithm missed you ×2</span>`;
  }
  if (state.sim.waveTag) {
    chips += `<span class="chip hot">🌊 ${TAGS_BY_ID[state.sim.waveTag].label} surging</span>`;
  }
  if (temp.capped) chips += `<span class="chip hot">⚠ ALGORITHM SATURATED</span>`;
  if (els.buffs.innerHTML !== chips) els.buffs.innerHTML = chips;

  // VA roster — the sim runs these from Lv 8/12/18/25; show the "team"
  const lv = state.acct.level;
  els.team.classList.toggle('hidden', lv < 8);
  if (lv >= 8) {
    const spin = ['…', '…', '…', ''][Math.floor(now / 500) % 4];
    let team = `🤖 <b>Brayden</b> (Auto-Packer) — packing 2 orders/sec${spin}`;
    if (lv >= 12) team += `<br>🧢 <b>The Intern</b> — posting an ad every 5s. Morale: "content"${spin}`;
    else team += `<br class="muted"><span class="muted">🔒 Lv 12: an intern appears</span>`;
    if (lv >= 18) team += `<br>📋 <b>Campaign Manager</b> — auto-launching at 60% power when you're idle${spin}`;
    else if (lv >= 12) team += `<br><span class="muted">🔒 Lv 18: a campaign manager appears</span>`;
    if (lv >= 25) team += `<br>📡 <b>Trend Watcher</b> — catching Viral Moments at 50% value${spin}`;
    else if (lv >= 18) team += `<br><span class="muted">🔒 Lv 25: a trend watcher appears</span>`;
    if (els.teamList.innerHTML !== team) els.teamList.innerHTML = team;
  }
}

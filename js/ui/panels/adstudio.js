// The Ad Studio — "ClipForge™ AI Ad Generator (beta)". Three reels, a live
// odds bar, a decelerating outcome reveal, pity meter, Creative Energy,
// platform picker, and the campaign rack. This is the star mechanic.

import {
  BAL, getDerived, adFee, computeOdds, totalCps, rackSlots,
} from '../../core/balance.js';
import { spinReels, launchAd, platformUnlocked, ownedHooks } from '../../core/actions.js';
import { PLATFORMS, TAGS_BY_ID, HOOKS_BY_ID, OUTCOMES, RARITY } from '../../data/ads.js';
import { PRODUCTS_BY_ID, PRODUCTS } from '../../data/products.js';
import { fmt, fmtCash, fmtInt } from '../fmt.js';
import { bus } from '../../core/bus.js';
import { markDirty } from '../render.js';
import { confetti, goldRain, burst, SPR } from '../components/particles.js';
import { shake, flash, slam } from '../components/celebrate.js';
import { sReelTick, sHit, sFlop, sViral, sClick } from '../../audio/synth.js';

const BAND_COLORS = { flop: '#5c6675', mid: '#98a2b4', hit: '#f97316', viral: '#f5b93e', mega: '#d946ef' };

let state_ = null;
let els = {};
let selectedPlatform = 'clikclok';
let boost = false;
let locks = {}; // reel -> locked value
let spinning = false;
let revealing = false;
let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mount(root, state) {
  state_ = state;
  root.innerHTML = `
    <div class="panel" style="max-width:820px;margin:0 auto 14px">
      <div class="panel-title">
        <span>🎬 ClipForge™ — AI Ad Generator <span class="chip">beta</span></span>
        <span id="a-energy" style="display:flex;gap:5px;align-items:center"></span>
      </div>

      <div id="a-reels" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px"></div>

      <div id="a-title" class="muted" style="text-align:center;min-height:2.6em;font-size:13px;font-style:italic;padding:0 8px"></div>

      <div style="margin:8px 0 4px;display:flex;justify-content:space-between;align-items:baseline">
        <span class="panel-title" style="margin:0">Virality odds</span>
        <span id="a-shifts" class="muted" style="font-size:10.5px"></span>
      </div>
      <div id="a-odds" style="display:flex;height:22px;border-radius:8px;overflow:hidden;border:1px solid var(--border)"></div>
      <div id="a-oddslabels" style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-lo);margin-top:3px"></div>

      <div style="display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap">
        <button class="btn btn-hype" id="a-spin" style="flex:1;min-width:130px;font-size:15px;padding:11px">
          🎰 SPIN <span class="muted" style="font-size:11px">(1 ⚡)</span>
        </button>
        <button class="btn" id="a-boost" title="Spend 30 Hype: +5% VIRAL odds">⚡ Boost <span id="a-boostcost" class="num">30 Hype</span></button>
      </div>

      <div id="a-pity" style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:11px;color:var(--text-lo)">
        <span title="Algorithm Favor: +1.5% VIRAL per non-viral launch">🧠 Algorithm Favor</span>
        <div class="bar" style="flex:1;height:5px"><div class="bar-fill" id="a-pityfill" style="background:var(--hype)"></div></div>
        <span class="num" id="a-pityval">+0%</span>
      </div>
    </div>

    <div class="panel" style="max-width:820px;margin:0 auto 14px">
      <div class="panel-title"><span>Publish to</span><span class="num muted" id="a-fee"></span></div>
      <div id="a-platforms" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px"></div>
      <button class="btn btn-primary" id="a-launch" style="width:100%;font-size:15px;padding:12px" disabled>
        🚀 LAUNCH CAMPAIGN <span class="price num" id="a-launchfee"></span>
      </button>
      <div id="a-wheel" class="hidden" style="margin-top:12px"></div>
    </div>

    <div class="panel" style="max-width:820px;margin:0 auto">
      <div class="panel-title"><span>Campaign Rack</span><span class="muted" id="a-rackcount"></span></div>
      <div id="a-rack" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px"></div>
    </div>`;

  els = {
    energy: root.querySelector('#a-energy'),
    reels: root.querySelector('#a-reels'),
    title: root.querySelector('#a-title'),
    odds: root.querySelector('#a-odds'),
    oddsLabels: root.querySelector('#a-oddslabels'),
    shifts: root.querySelector('#a-shifts'),
    spin: root.querySelector('#a-spin'),
    boost: root.querySelector('#a-boost'),
    pityFill: root.querySelector('#a-pityfill'),
    pityVal: root.querySelector('#a-pityval'),
    platforms: root.querySelector('#a-platforms'),
    fee: root.querySelector('#a-fee'),
    launch: root.querySelector('#a-launch'),
    launchFee: root.querySelector('#a-launchfee'),
    wheel: root.querySelector('#a-wheel'),
    rack: root.querySelector('#a-rack'),
    rackCount: root.querySelector('#a-rackcount'),
  };

  // Reels
  const reelDefs = [
    { key: 'hookId', label: 'HOOK' },
    { key: 'productId', label: 'PRODUCT' },
    { key: 'tagId', label: 'TREND' },
  ];
  for (const rd of reelDefs) {
    const reel = document.createElement('div');
    reel.className = 'card';
    reel.style.cssText = 'text-align:center;padding:10px 8px;min-height:96px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer';
    reel.dataset.reel = rd.key;
    reel.innerHTML = `
      <div class="panel-title" style="margin:0;justify-content:center">${rd.label} <span class="a-lock"></span></div>
      <div class="a-reelval" style="font-weight:700;font-size:13px;min-height:2.8em;display:grid;place-items:center">—</div>
      <div class="a-reelsub muted" style="font-size:10px;min-height:1.2em"></div>`;
    reel.addEventListener('click', () => toggleLock(rd.key, reel));
    reel.title = 'Lock this reel (needs a Reel Lock upgrade)';
    els.reels.appendChild(reel);
  }

  // Platforms
  for (const p of PLATFORMS) {
    const b = document.createElement('button');
    b.className = 'btn';
    b.style.cssText = 'flex-direction:column;padding:9px 6px;gap:2px';
    b.dataset.pid = p.id;
    b.innerHTML = `<span style="font-size:17px">${p.icon}</span><b style="font-size:12px">${p.name}</b><span class="muted a-pdesc" style="font-size:9.8px;font-weight:400"></span>`;
    b.addEventListener('click', () => {
      if (b.disabled) return;
      selectedPlatform = p.id;
      updatePlatformStyles();
      sClick(0.2);
    });
    els.platforms.appendChild(b);
  }

  els.spin.addEventListener('click', doSpin);
  els.launch.addEventListener('click', doLaunch);
  els.boost.addEventListener('click', () => {
    boost = !boost;
    els.boost.classList.toggle('btn-hype', boost);
    refreshOdds();
  });

  bus.on('campaign:end', () => markDirty('adstudio'));
  updatePlatformStyles();
}

function toggleLock(key, reelEl) {
  const d = getDerived(state_);
  const ad = state_.run.pendingAd;
  if (!ad) return;
  if (locks[key]) {
    delete locks[key];
  } else {
    if (Object.keys(locks).length >= d.reelLocks) {
      shakeEl(reelEl);
      return;
    }
    locks[key] = ad[key];
  }
  updateReelLocks();
}

function shakeEl(el) {
  el.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }],
    { duration: 180 },
  );
}

function updateReelLocks() {
  for (const reel of els.reels.children) {
    const key = reel.dataset.reel;
    const lockEl = reel.querySelector('.a-lock');
    lockEl.textContent = locks[key] ? '🔒' : '';
    reel.style.borderColor = locks[key] ? 'var(--gold)' : '';
  }
}

function reelDisplay(key, ad) {
  if (!ad) return ['—', ''];
  if (key === 'hookId') {
    const h = HOOKS_BY_ID[ad.hookId];
    return [`“${h.text.replace('{p}', '…')}”`, RARITY[h.rarity].label];
  }
  if (key === 'productId') {
    const p = PRODUCTS_BY_ID[ad.productId];
    return [`${p.icon} ${p.name}`, p.tags.map((t) => TAGS_BY_ID[t]?.label).join(' ')];
  }
  const tg = TAGS_BY_ID[ad.tagId];
  let sub = '';
  if (state_.sim.waveTag === ad.tagId) sub = '🌊 SURGING NOW';
  else if (state_.sim.warmTag === ad.tagId) sub = '📈 warm';
  return [tg.label, sub];
}

function doSpin() {
  if (spinning || revealing) return;
  if (state_.run.energy < 1) { shakeEl(els.spin); return; }
  const result = spinReels(state_, locks);
  if (!result) { shakeEl(els.spin); return; }
  spinning = true;
  els.title.textContent = '';

  // Animated reel scramble, settling left → right
  const reels = [...els.reels.children];
  const pools = {
    hookId: ownedHooks(state_).map((h) => `“${h.text.replace('{p}', '…')}”`),
    productId: PRODUCTS.filter((p) => (state_.run.products[p.id] || 0) > 0).map((p) => `${p.icon} ${p.name}`),
    tagId: Object.values(TAGS_BY_ID).map((t) => t.label),
  };
  reels.forEach((reel, i) => {
    const key = reel.dataset.reel;
    const valEl = reel.querySelector('.a-reelval');
    const subEl = reel.querySelector('.a-reelsub');
    if (locks[key] || reduced) {
      const [v, sub] = reelDisplay(key, result);
      valEl.textContent = v;
      subEl.textContent = sub;
      return;
    }
    subEl.textContent = '';
    const stopAt = performance.now() + 420 + i * 380;
    const interval = setInterval(() => {
      if (performance.now() >= stopAt) {
        clearInterval(interval);
        const [v, sub] = reelDisplay(key, result);
        valEl.textContent = v;
        subEl.textContent = sub;
        reel.classList.add('pop');
        setTimeout(() => reel.classList.remove('pop'), 260);
        sReelTick();
        if (i === reels.length - 1) finishSpin(result);
        return;
      }
      const pool = pools[key];
      valEl.textContent = pool[Math.floor(Math.random() * pool.length)] || '—';
      sReelTick();
    }, 65);
  });
  if (reduced) finishSpin(result);
}

function finishSpin(result) {
  spinning = false;
  els.title.textContent = `🎞 “${result.title}”`;
  refreshOdds();
  markDirty('adstudio');
}

function refreshOdds() {
  const ad = state_.run.pendingAd;
  if (!ad) {
    els.odds.innerHTML = '<div style="flex:1;display:grid;place-items:center;font-size:10.5px;color:var(--text-dim)">spin to generate an ad</div>';
    els.oddsLabels.innerHTML = '';
    els.shifts.textContent = '';
    return;
  }
  const canBoost = state_.run.hype >= BAL.BOOST_HYPE_COST;
  if (boost && !canBoost) boost = false;
  els.boost.classList.toggle('btn-hype', boost);
  els.boost.disabled = !canBoost;

  const { bands, chaos, shifts } = computeOdds(state_, ad, boost);
  els.odds.innerHTML = bands
    .map((b) => `<div style="width:${b.pct}%;background:${BAND_COLORS[b.id]};display:grid;place-items:center;font-size:10px;font-weight:700;color:#0b0e14;transition:width .35s" title="${b.label} ×${b.mult}">${b.pct >= 7 ? b.emoji : ''}</div>`)
    .join('');
  els.oddsLabels.innerHTML = bands
    .map((b) => `<span>${b.emoji} ${b.pct.toFixed(1)}%</span>`)
    .join('');

  const parts = [];
  if (shifts.wave) parts.push(`🌊 wave +${shifts.wave.toFixed(0)}%`);
  if (shifts.warm) parts.push(`📈 warm +${shifts.warm.toFixed(0)}%`);
  if (shifts.product) parts.push('🎯 tag match');
  if (shifts.rarity) parts.push(`💎 rare hook +${shifts.rarity.toFixed(0)}%`);
  if (shifts.boost) parts.push('⚡ boosted');
  if (shifts.pity) parts.push(`🧠 favor +${shifts.pity.toFixed(1)}%`);
  if (chaos) parts.push('🎲 total mismatch: 5% chaos jackpot');
  els.shifts.textContent = parts.join(' · ');
}

function doLaunch() {
  if (revealing || spinning || !state_.run.pendingAd) return;
  const result = launchAd(state_, selectedPlatform, boost);
  if (!result) { shakeEl(els.launch); return; }
  boost = false;
  els.boost.classList.remove('btn-hype');
  revealing = true;
  revealOutcome(result);
}

// The decelerating outcome reveal: a marker sweeps the odds bar and lands on
// the rolled outcome. Reduced motion: instant text result.
function revealOutcome(result) {
  const wheel = els.wheel;
  wheel.classList.remove('hidden');

  if (reduced) {
    finishReveal(result);
    return;
  }

  const seq = ['flop', 'mid', 'hit', 'viral', 'mega'];
  const targetIdx = seq.indexOf(result.outcome.id);
  const totalSteps = 14 + targetIdx + Math.floor(Math.random() * 5) * 5;
  let step = 0;
  wheel.innerHTML = `<div style="display:flex;gap:6px;justify-content:center">${OUTCOMES
    .map((o) => `<div class="a-band" data-o="${o.id}" style="flex:1;max-width:110px;text-align:center;padding:10px 4px;border-radius:10px;border:1px solid var(--border);background:var(--bg-raised);font-weight:700;font-size:12px;transition:all .1s">${o.emoji}<br>${o.label}</div>`)
    .join('')}</div>`;
  const bandEls = [...wheel.querySelectorAll('.a-band')];

  const tick = () => {
    const idx = step % 5;
    bandEls.forEach((b, i) => {
      b.style.background = i === idx ? BAND_COLORS[seq[i]] : 'var(--bg-raised)';
      b.style.color = i === idx ? '#0b0e14' : '';
      b.style.transform = i === idx ? 'scale(1.06)' : '';
    });
    sReelTick();
    step++;
    if (step >= totalSteps && idx === targetIdx) {
      setTimeout(() => finishReveal(result), 250); // the anticipation gap
      return;
    }
    // decelerate: delay grows as we approach the end
    const remaining = totalSteps - step;
    const delay = remaining > 12 ? 70 : 70 + (12 - remaining) * 34;
    setTimeout(tick, delay);
  };
  tick();
}

function finishReveal(result) {
  revealing = false;
  const o = result.outcome;
  const wheel = els.wheel;

  let detail = '';
  if (result.platform === 'instaglam') detail = `+${fmtInt(result.followersGained)} followers`;
  else if (result.platform === 'facespace') detail = `FaceSpace slot: ×${state_.run.fbSlot?.mult ?? 1} income (persistent)`;
  else if (o.mult > 0) detail = `income boost for 90s`;
  if (result.lump) detail += ` · +${fmtCash(result.lump)} lump sum`;
  if (result.chaos) detail = `THE CHAOS ALGORITHM PROVIDES. ${detail}`;

  wheel.innerHTML = `<div style="text-align:center;padding:8px">
    <div style="font-size:26px;font-weight:800">${o.emoji} ${o.label}</div>
    <div class="muted" style="font-size:12px">${detail}</div>
  </div>`;
  setTimeout(() => { wheel.classList.add('hidden'); wheel.innerHTML = ''; }, 2600);

  if (o.id === 'flop') {
    sFlop();
  } else if (o.id === 'hit') {
    sHit();
    confetti(24);
  } else if (o.id === 'viral') {
    sViral();
    flash();
    shake(4);
    slam('🚀 GONE VIRAL', true);
    confetti(150);
  } else if (o.id === 'mega') {
    sViral();
    flash();
    shake(6);
    slam('🌋 MEGA-VIRAL', true);
    confetti(200);
    goldRain(80);
  }
  markDirty('adstudio');
  markDirty('dashboard');
}

function updatePlatformStyles() {
  for (const b of els.platforms.children) {
    b.classList.toggle('btn-primary', b.dataset.pid === selectedPlatform && !b.disabled);
  }
}

let lastUpdate = 0;
export function update(state, now) {
  if (now && now - lastUpdate < 200) return;
  lastUpdate = now || 0;
  const d = getDerived(state);

  // Energy pips
  const pipsMax = d.energyMax;
  const whole = Math.floor(state.run.energy);
  const frac = state.run.energy - whole;
  let pips = '';
  for (let i = 0; i < pipsMax; i++) {
    let fill = 0;
    if (i < whole) fill = 100;
    else if (i === whole) fill = frac * 100;
    pips += `<div style="width:20px;height:12px;border-radius:4px;border:1px solid var(--border);overflow:hidden;background:var(--bg-raised)"><div style="width:${fill}%;height:100%;background:var(--hype);transition:width .3s"></div></div>`;
  }
  pips += `<span class="muted num" style="font-size:10px">⚡ ${state.run.energy.toFixed(1)}/${pipsMax}</span>`;
  if (els.energy.innerHTML !== pips) els.energy.innerHTML = pips;

  els.spin.disabled = state.run.energy < 1 || spinning || revealing;

  // Pity
  const pityPct = Math.min(100, (state.run.pity * BAL.PITY_VIRAL / 30) * 100);
  els.pityFill.style.width = pityPct + '%';
  const pv = `+${(state.run.pity * BAL.PITY_VIRAL).toFixed(1)}%`;
  if (els.pityVal.textContent !== pv) els.pityVal.textContent = pv;

  // Platforms + fee
  const fee = adFee(state);
  els.fee.textContent = `launch fee: ${fmtCash(fee)} (60s of income)`;
  for (const b of els.platforms.children) {
    const p = PLATFORMS.find((x) => x.id === b.dataset.pid);
    const unlocked = platformUnlocked(state, p);
    b.disabled = !unlocked;
    const desc = b.querySelector('.a-pdesc');
    if (!unlocked) {
      desc.textContent = `🔒 ${fmtCash(p.unlock.cashSeen)} seen`;
      if (selectedPlatform === p.id) selectedPlatform = 'clikclok';
    } else {
      desc.textContent = p.blurb.split('.')[0];
    }
  }
  updatePlatformStyles();

  const canLaunch = !!state.run.pendingAd && !spinning && !revealing
    && state.run.cash >= fee
    && !(selectedPlatform === 'clikclok' && state.run.campaigns.length >= rackSlots(state));
  els.launch.disabled = !canLaunch;
  els.launchFee.textContent = fmtCash(fee);

  if (!spinning && !state.run.pendingAd) {
    for (const reel of els.reels.children) {
      const key = reel.dataset.reel;
      if (!locks[key]) {
        reel.querySelector('.a-reelval').textContent = '—';
        reel.querySelector('.a-reelsub').textContent = '';
      }
    }
    refreshOdds();
  } else if (!spinning && state.run.pendingAd) {
    refreshOdds();
  }

  // Campaign rack
  const t = state.sim.timeMs;
  let rack = '';
  for (const c of state.run.campaigns) {
    const o = OUTCOMES.find((x) => x.id === c.outcome);
    const remain = Math.max(0, c.endMs - t);
    const pct = (remain / 90000) * 100;
    rack += `<div class="card" style="padding:8px">
      <div style="font-size:11px;font-weight:700">${o.emoji} ${o.label}</div>
      <div class="muted" style="font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${c.title}">${c.title}</div>
      <div class="bar" style="height:4px;margin-top:5px"><div class="bar-fill" style="width:${pct}%;background:${BAND_COLORS[c.outcome]}"></div></div>
    </div>`;
  }
  if (state.run.fbSlot) {
    rack += `<div class="card" style="padding:8px;border-color:rgba(56,189,248,.4)">
      <div style="font-size:11px;font-weight:700">👴 FaceSpace ×${state.run.fbSlot.mult}</div>
      <div class="muted" style="font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${state.run.fbSlot.title}</div>
      <div class="muted" style="font-size:9.5px;margin-top:4px">shared to 14 family groups — never decays</div>
    </div>`;
  }
  if (!rack) rack = '<div class="muted" style="font-size:12px">No campaigns running. The content must flow.</div>';
  if (els.rack.innerHTML !== rack) els.rack.innerHTML = rack;
  els.rackCount.textContent = `${state.run.campaigns.length}/${rackSlots(state)} slots (more at Lv 14/20/26) + FaceSpace`;
}

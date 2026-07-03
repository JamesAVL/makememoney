// Guru Mode: the Blandrock Capital acquisition inbox (prestige), the Guru
// Grindset investor tree, the niche picker, and the run log. Includes the
// full Exit ceremony: signature → power-down → tally → comedy boot → niche.

import { exitPreview, BAL, investorsFromLifetime } from '../../core/balance.js';
import { doExit, buyGuru, canExit, pickNiche, skipNiche, buyPerk } from '../../core/actions.js';
import { GURU_TREE, PERKS, exitFlavor, EXIT_MIN_LEVEL } from '../../data/prestige.js';
import { NICHES, NICHES_BY_ID } from '../../data/niches.js';
import { BOOT_LINES } from '../../data/flavor.js';
import { fmt, fmtCash, fmtInt, fmtDur } from '../fmt.js';
import { sPrestige, sUnlock, sBuy } from '../../audio/synth.js';
import { confetti } from '../components/particles.js';
import { saveToStorage } from '../../core/save.js';
import { markAllDirty } from '../render.js';
import { switchTab } from './nav.js';

let state_ = null;
let els = {};

export function mount(root, state) {
  state_ = state;
  root.innerHTML = `
    <div id="g-niche" class="panel hidden">
      <div class="panel-title"><span>🎯 PICK YOUR NICHE — this run's identity</span></div>
      <div class="muted" style="font-size:12px;margin-bottom:10px">
        +75% income on matching products · matching trends surge twice as often · one anti-tag at −25%.
      </div>
      <div class="card-grid" id="g-nichecards"></div>
      <button class="btn btn-ghost" id="g-nicheskip" style="margin-top:10px">No niche (coward's route)</button>
    </div>

    <div class="panel" id="g-offer">
      <div class="panel-title"><span>📬 Acquisition Inbox — Blandrock Capital</span></div>
      <div id="g-offerbody"></div>
    </div>

    <div class="panel">
      <div class="panel-title">
        <span>🧘 Guru Grindset Tree</span>
        <span class="gold num" id="g-investors"></span>
      </div>
      <div class="muted" style="font-size:11.5px;margin-bottom:10px">
        Each <b>unspent</b> investor pays +4% income. Spending them buys permanent power — and shrinks
        your passive pool. This is the whole game, spiritually.
      </div>
      <div class="card-grid" id="g-tree"></div>
    </div>

    <div class="panel">
      <div class="panel-title"><span>🎖 Hustler Perks</span><span class="data-c num" id="g-pp"></span></div>
      <div class="card-grid" id="g-perks"></div>
    </div>

    <div class="panel">
      <div class="panel-title"><span>📜 Exit history</span></div>
      <table class="mini-table" id="g-runlog"></table>
    </div>`;

  els = {
    niche: root.querySelector('#g-niche'),
    nicheCards: root.querySelector('#g-nichecards'),
    offerBody: root.querySelector('#g-offerbody'),
    investors: root.querySelector('#g-investors'),
    tree: root.querySelector('#g-tree'),
    perks: root.querySelector('#g-perks'),
    pp: root.querySelector('#g-pp'),
    runlog: root.querySelector('#g-runlog'),
  };

  root.querySelector('#g-nicheskip').addEventListener('click', () => {
    skipNiche(state_);
    markAllDirty();
  });
}

function renderOffer(state) {
  const p = exitPreview(state);
  const level = state.acct.level;
  if (level < EXIT_MIN_LEVEL) {
    return `<div class="muted">A person in an incredible vest viewed your dashboard ${3 + level} times.
      <br>Blandrock Capital acquires founders at <b>Hustler Level ${EXIT_MIN_LEVEL}</b>. Keep grinding.</div>`;
  }
  if (p.gained < 1) {
    return `<div class="muted">Your metrics are… “pre-revenue-adjacent.” Earn more before anyone returns your calls.
      <br>Next investor at ${fmtCash(Math.pow(state.acct.investorsEarnedTotal + 1, 2) * BAL.INVESTOR_DIVISOR)} lifetime.</div>`;
  }
  const good = p.ratio >= 2;
  return `
    <div style="border:1px solid var(--border);border-radius:10px;padding:14px;background:var(--bg-raised)">
      <div style="font-size:11px;color:var(--text-lo)">FROM: Blandrock Capital — Strategic Synergies Division</div>
      <div style="font-weight:800;font-size:16px;margin:6px 0">RE: Acquisition of ${state.run.companyName}</div>
      <div style="font-size:12.5px;line-height:1.7">
        Our analysts loved your vibes. We hereby offer to acquire your company, its brand,
        its ${fmtInt(state.run.followers)} followers, and its outstanding lawsuits (waived).<br>
        <table class="mini-table" style="margin:8px 0">
          <tr><td>Valuation (this run)</td><td>${fmtCash(state.run.lifetimeCash)}</td></tr>
          <tr><td>Investors joining you</td><td class="gold">👤 +${fmtInt(p.gained)}</td></tr>
          <tr><td>Income multiplier after exit</td><td class="money">×${p.ratio.toFixed(2)}</td></tr>
        </table>
        <span class="muted" style="font-size:11px">Resets: cash, products, followers, upgrades. Keeps: levels, perks,
        achievements, investors, guru tree. ${good ? '' : '<b class="danger-c">Advisors suggest waiting for ×2.</b>'}</span>
      </div>
      <div class="sig-line" id="g-sig">
        <canvas></canvas>
        <span class="sig-hint">✍️ drag across the line to sign</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="muted" style="font-size:10.5px">sign here to accept</span>
        <button class="btn btn-gold" id="g-accept" disabled>ACCEPT ACQUISITION OFFER</button>
      </div>
    </div>`;
}

function wireSignature(state) {
  const sig = document.getElementById('g-sig');
  const accept = document.getElementById('g-accept');
  if (!sig || !accept) return;
  const canvas = sig.querySelector('canvas');
  const rect = sig.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#e6eaf2';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  let drawing = false;
  let inkDistance = 0;
  let last = null;

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  sig.addEventListener('pointerdown', (e) => {
    drawing = true;
    last = pos(e);
    sig.setPointerCapture(e.pointerId);
  });
  sig.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last[0], last[1]);
    // wobble makes any drag look like a real signature
    ctx.quadraticCurveTo(
      (last[0] + p[0]) / 2 + (Math.random() - 0.5) * 8,
      (last[1] + p[1]) / 2 + (Math.random() - 0.5) * 14,
      p[0], p[1],
    );
    ctx.stroke();
    inkDistance += Math.hypot(p[0] - last[0], p[1] - last[1]);
    last = p;
    if (inkDistance > 120) {
      accept.disabled = false;
      sig.querySelector('.sig-hint').textContent = '';
    }
  });
  sig.addEventListener('pointerup', () => { drawing = false; });

  accept.addEventListener('click', () => runExitCeremony(state));
}

// --- The Exit ceremony (~12s, skippable) ---
function runExitCeremony(state) {
  if (!canExit(state)) return;
  const result = doExit(state);
  if (!result) return;
  saveToStorage(state, Date.now());
  sPrestige();

  const root = document.getElementById('ceremony-root');
  const overlay = document.createElement('div');
  overlay.className = 'ceremony';
  overlay.innerHTML = `
    <div class="tally" id="c-tally"></div>
    <div class="skip-hint">click anywhere to skip</div>`;
  root.appendChild(overlay);

  const lines = [
    `Company sold: <b>${fmtCash(result.soldFor)}</b>`,
    `Followers cashed out: <b>${fmtInt(state.acct.stats.maxFollowers)}</b>`,
    `Lawsuits pending: <b>${1 + (state.acct.exits % 5)} (waived)</b>`,
    `<span class="big">INVESTORS ACQUIRED: +${fmtInt(result.gained)} 👤</span>`,
    `<i class="muted">${exitFlavor(state.acct.exits)}</i>`,
  ];
  const tally = overlay.querySelector('#c-tally');
  tally.innerHTML = lines.map((l) => `<div class="line">${l}</div>`).join('');
  const lineEls = [...tally.children];

  let step = 0;
  let finished = false;
  const timers = [];
  lineEls.forEach((el, i) => {
    timers.push(setTimeout(() => {
      el.classList.add('show');
      if (i === 3) confetti(120);
    }, 700 + i * 850));
  });

  timers.push(setTimeout(bootPhase, 700 + lines.length * 850 + 1200));

  function bootPhase() {
    if (finished) return;
    tally.innerHTML = `
      <div style="text-align:center">
        <div style="font-size:19px;font-weight:800;margin-bottom:14px">
          HustleOS™ is setting up your new venture…
        </div>
        <div style="font-weight:700;font-size:15px;color:var(--money);margin-bottom:14px">${state.run.companyName}</div>
        <div class="boot-line" id="c-boot"></div>
        <div class="bar" style="width:260px;margin:14px auto 0"><div class="bar-fill" id="c-bar"></div></div>
      </div>`;
    const bootEl = tally.querySelector('#c-boot');
    const barEl = tally.querySelector('#c-bar');
    const picks = [...BOOT_LINES].sort(() => Math.random() - 0.5).slice(0, 5);
    picks.forEach((line, i) => {
      timers.push(setTimeout(() => {
        bootEl.textContent = line;
        barEl.style.width = `${((i + 1) / picks.length) * 100}%`;
      }, i * 550));
    });
    timers.push(setTimeout(finish, picks.length * 550 + 600));
  }

  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    overlay.remove();
    sUnlock();
    markAllDirty();
    switchTab('guru'); // niche picker renders here
  }

  overlay.addEventListener('click', () => {
    if (!finished) finish();
  });
}

function renderNichePicker(state) {
  els.nicheCards.innerHTML = '';
  for (const id of state.run.nicheChoices) {
    const n = NICHES_BY_ID[id];
    const card = document.createElement('div');
    card.className = 'card r-rare';
    card.style.cursor = 'pointer';
    card.innerHTML = `
      <div class="card-title"><span style="font-size:20px">${n.icon}</span> ${n.name}</div>
      <div class="card-sub">${n.blurb}</div>
      <div style="font-size:11px" class="muted">
        <span class="money">+75%</span> on <b>#${n.tag}</b> products ·
        <span class="danger-c">−25%</span> on <b>#${n.antiTag}</b>
      </div>`;
    card.addEventListener('click', () => {
      pickNiche(state_, id);
      sUnlock();
      confetti(60);
      markAllDirty();
    });
    els.nicheCards.appendChild(card);
  }
}

let lastUpdate = 0;
let lastOfferKey = '';
export function update(state, now) {
  if (now && now - lastUpdate < 400) return;
  lastUpdate = now || 0;

  // Niche picker takes over when pending
  const picking = !!state.run.nicheChoices;
  els.niche.classList.toggle('hidden', !picking);
  if (picking && !els.nicheCards.children.length) renderNichePicker(state);
  if (!picking && els.nicheCards.children.length) els.nicheCards.innerHTML = '';

  // Offer (re-render only when its numbers meaningfully change)
  const p = exitPreview(state);
  const offerKey = `${state.acct.level >= EXIT_MIN_LEVEL}|${p.gained}|${p.ratio.toFixed(2)}`;
  if (offerKey !== lastOfferKey) {
    lastOfferKey = offerKey;
    els.offerBody.innerHTML = renderOffer(state);
    wireSignature(state);
  }

  els.investors.textContent = `👤 ${fmtInt(state.acct.investors)} unspent (+${(state.acct.investors * 4).toFixed(0)}%)`;

  // Guru tree
  let tree = '';
  for (const n of GURU_TREE) {
    const owned = state.acct.guru[n.id];
    const afford = state.acct.investors >= n.cost;
    tree += `<div class="card ${owned ? 'r-legendary' : ''}" data-guru="${n.id}">
      <div class="card-title">${n.icon} ${n.name}</div>
      <div class="card-sub">${n.desc}<br><i style="opacity:.75">${n.flavor}</i></div>
      ${owned
        ? '<div class="gold" style="font-size:12px;font-weight:700">OWNED</div>'
        : `<button class="btn g-buy" ${afford ? '' : 'disabled'} style="width:100%">👤 ${fmtInt(n.cost)} investors</button>`}
    </div>`;
  }
  if (els.tree.dataset.html !== tree) {
    els.tree.dataset.html = tree;
    els.tree.innerHTML = tree;
    els.tree.querySelectorAll('[data-guru]').forEach((card) => {
      const btn = card.querySelector('.g-buy');
      if (btn) {
        btn.addEventListener('click', () => {
          if (buyGuru(state_, card.dataset.guru)) {
            sBuy();
            confetti(40);
            lastOfferKey = '';
            markAllDirty();
          }
        });
      }
    });
  }

  // Perks
  els.pp.textContent = `${state.acct.perkPoints} perk points`;
  let perks = '';
  for (const pk of PERKS) {
    const rank = state.acct.perks[pk.id] || 0;
    const maxed = rank >= pk.maxRank;
    const cost = maxed ? 0 : pk.costs[rank];
    perks += `<div class="card" data-perk="${pk.id}">
      <div class="card-title">${pk.icon} ${pk.name} <span class="chip">${rank}/${pk.maxRank}</span></div>
      <div class="card-sub">${pk.desc}</div>
      ${maxed
        ? '<div class="data-c" style="font-size:12px;font-weight:700">MAXED</div>'
        : `<button class="btn pk-buy" ${state.acct.perkPoints >= cost ? '' : 'disabled'} style="width:100%">${cost} point${cost > 1 ? 's' : ''}</button>`}
    </div>`;
  }
  if (els.perks.dataset.html !== perks) {
    els.perks.dataset.html = perks;
    els.perks.innerHTML = perks;
    els.perks.querySelectorAll('[data-perk]').forEach((card) => {
      const btn = card.querySelector('.pk-buy');
      if (btn) {
        btn.addEventListener('click', () => {
          if (buyPerk(state_, card.dataset.perk)) sBuy();
        });
      }
    });
  }

  // Run log
  let log = '';
  const runs = [...state.acct.runLog].reverse().slice(0, 12);
  runs.forEach((r, i) => {
    log += `<tr><td>Venture #${state.acct.runLog.length - i}: ${r.name}</td>
      <td>sold ${fmtCash(r.soldFor)} · 👤 +${fmtInt(r.investors)} · ${fmtDur(r.ms)}</td></tr>`;
  });
  if (!log) log = '<tr><td class="muted">No exits yet. Blandrock waits.</td><td></td></tr>';
  if (els.runlog.innerHTML !== log) els.runlog.innerHTML = log;
}

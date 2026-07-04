// Balance regression suite. Run after every tuning change:
//   node js/dev/balance-check.mjs
// Prints the pacing table that IS the balance spec and exits non-zero if a
// target regresses. v5 targets: substantially slower, story-staged. Bots ack
// DMs instantly and play optimally — human pace ≈ 2× bot time, so the
// "first exit 60–90 bot-min" band is the design's 2–3 hour human target.

import { freshState, fastForward, bots, snapshot } from './headless.js';
import { offlineCps, totalCps, BAL, invalidate } from '../core/balance.js';
import { serialize, deserialize, rehydrate, computeOffline, onSessionStart } from '../core/save.js';
import { bus } from '../core/bus.js';

bus.clear(); // no UI listeners in headless

let failures = 0;
function check(name, cond, detail = '') {
  const ok = !!cond;
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}
const f = (n) => (n >= 1e6 ? n.toExponential(2) : Math.round(n).toLocaleString('en-US'));
const mins = (ms) => (ms == null ? null : ms / 60000);

console.log('\n=== SHIP HAPPENS — balance check (v5 "Mentorship" pacing) ===\n');

// ---------------------------------------------------------------- active run
console.log('ACTIVE PLAYER (greedy bot, 3 clicks/s, campaigns, exits at ×2.5):');
{
  const state = freshState();
  const marks = {};
  const events = { firstExitAt: null, secondExitAt: null, tier7At: null, lv10At: null };
  let waveBeforeIntro = false;
  let momentBeforeIntro = false;
  fastForward(state, 3, (s) => {
    bots.greedy(s);
    if (s.sim.waveTag && !s.story.acked.trends_intro) waveBeforeIntro = true;
    if (s.sim.momentActive && !s.story.acked.moments_intro) momentBeforeIntro = true;
    if (!events.lv10At && s.acct.level >= 10) events.lv10At = s.sim.timeMs / 60000;
    if (!events.firstExitAt && s.acct.exits >= 1) events.firstExitAt = s.sim.timeMs / 60000;
    if (!events.secondExitAt && s.acct.exits >= 2) events.secondExitAt = s.sim.timeMs / 60000;
    if (!events.tier7At && s.run.unlocked.bracelets) events.tier7At = s.sim.timeMs / 60000;
  }, (s, min) => {
    if ([1, 5, 10, 15, 20, 30, 45, 60, 90, 120, 150, 180].includes(min)) marks[min] = snapshot(s);
  });

  console.log('  min | cash        | $/s        | followers | Lv | tier | exits | ads | upg | beats');
  for (const [min, m] of Object.entries(marks)) {
    console.log(`  ${String(min).padStart(3)} | ${f(m.cash).padStart(11)} | ${f(m.cps).padStart(10)} | ${f(m.followers).padStart(9)} | ${String(m.level).padStart(2)} | ${String(m.maxTier).padStart(4)} | ${String(m.exits).padStart(5)} | ${String(m.launches).padStart(3)} | ${String(m.upgradesOwned).padStart(3)} | ${m.beatsAcked}`);
  }
  const ackAt = (id) => mins(state.story.acked[id]);
  console.log(`  beats: products@${ackAt('products_intro')?.toFixed(1)}m adstudio@${ackAt('adstudio_intro')?.toFixed(1)}m upgrades@${ackAt('upgrades_intro')?.toFixed(1)}m trends@${ackAt('trends_intro')?.toFixed(1)}m moments@${ackAt('moments_intro')?.toFixed(1)}m exit@${ackAt('exit_intro')?.toFixed(1) ?? '—'}m`);
  console.log(`  events: Lv10@${events.lv10At?.toFixed(1) ?? '—'}m, Tier7@${events.tier7At?.toFixed(1) ?? '—'}m, firstExit@${events.firstExitAt?.toFixed(1) ?? '—'}m, secondExit@${events.secondExitAt?.toFixed(1) ?? '—'}m\n`);

  const adstudioAt = ackAt('adstudio_intro');
  const upgradesAt = ackAt('upgrades_intro');
  const trendsAt = ackAt('trends_intro');
  check('Ad Studio lesson lands 5–7 bot-min', adstudioAt !== null && adstudioAt >= 5 && adstudioAt <= 7, `${adstudioAt?.toFixed(1) ?? '—'}m`);
  check('Upgrades lesson lands 7–12 bot-min', upgradesAt !== null && upgradesAt >= 7 && upgradesAt <= 12, `${upgradesAt?.toFixed(1) ?? '—'}m`);
  check('Trends lesson lands 13–21 bot-min', trendsAt !== null && trendsAt >= 13 && trendsAt <= 21, `${trendsAt?.toFixed(1) ?? '—'}m`);
  check('No wave ever before trends_intro', !waveBeforeIntro);
  check('No golden moment before moments_intro', !momentBeforeIntro);
  check('Exit gate (Lv10) lands 25–45 bot-min', events.lv10At !== null && events.lv10At >= 25 && events.lv10At <= 45, `${events.lv10At?.toFixed(1) ?? '—'}m`);
  check('First exit lands 60–90 bot-min', events.firstExitAt !== null && events.firstExitAt >= 60 && events.firstExitAt <= 90, `${events.firstExitAt?.toFixed(1) ?? '—'}m`);
  check('Tier-7 wall bites after min 30 (bot-time)', events.tier7At === null || events.tier7At >= 30, `${events.tier7At?.toFixed(1) ?? 'not reached'}m`);
  // sqrt-investor prestige: each exit needs ~4× the previous total lifetime,
  // so "comparable length for much bigger numbers" is the healthy shape —
  // run 2 must not DRAG (guru spend + startCash keep it moving).
  check('Second exit by 150m, run 2 ≤1.15× run-1 length', events.secondExitAt !== null && events.secondExitAt <= 150
    && (events.secondExitAt - events.firstExitAt) <= 1.15 * events.firstExitAt,
  `run1 ${events.firstExitAt?.toFixed(0)}m, run2 +${events.secondExitAt && events.firstExitAt ? (events.secondExitAt - events.firstExitAt).toFixed(0) : '—'}m`);
  check('Ads actually used (≥20 launches by 90m)', (marks[90]?.launches ?? 0) >= 20, `${marks[90]?.launches} launches @90m`);
}

// ---------------------------------------------------------------- idle run
console.log('\nIDLE PLAYER (no clicks after bootstrap, no campaigns, buys only):');
{
  const state = freshState();
  let firstExitAt = null;
  const marks = {};
  fastForward(state, 9.5, (s) => {
    bots.idle(s);
    if (!firstExitAt && s.acct.exits >= 1) firstExitAt = s.sim.timeMs / 60000;
  }, (s, min) => {
    if ([60, 120, 180, 240, 300, 360, 420, 480, 540].includes(min)) marks[min] = snapshot(s);
  });
  console.log('  min | cash        | $/s        | Lv | tier | exits | beats');
  for (const [min, m] of Object.entries(marks)) {
    console.log(`  ${String(min).padStart(3)} | ${f(m.cash).padStart(11)} | ${f(m.cps).padStart(10)} | ${String(m.level).padStart(2)} | ${String(m.maxTier).padStart(4)} | ${String(m.exits).padStart(5)} | ${m.beatsAcked}`);
  }
  console.log(`  first exit: ${firstExitAt ? firstExitAt.toFixed(0) + 'm' : 'none in 9.5h'}\n`);
  check('Idle first exit within 300–570 min (bot-time)', firstExitAt !== null && firstExitAt >= 300 && firstExitAt <= 570, `${firstExitAt?.toFixed(0) ?? '>570'}m`);
  check('Idle is slower than active but alive', (marks[120]?.cps ?? 0) > 100, `$${f(marks[120]?.cps ?? 0)}/s @2h`);
  check('Idle reaches the exit lesson (fallback triggers work)', !!state.story.acked.exit_intro,
    `${Object.keys(state.story.acked).length} beats acked`);
}

// ------------------------------------------------------- offline consistency
console.log('\nOFFLINE ≈ ONLINE-IDLE PARITY:');
{
  const state = freshState();
  fastForward(state, 0.5, bots.idle); // an economy with products, no exit yet
  // Kill temp state so both paths measure steady income
  state.run.campaigns.length = 0;
  state.run.hype = 0;
  state.sim.buffEndMs = 0; state.sim.buffMult = 1;
  state.sim.waveTag = null;
  state.sim.comebackEndMs = 0;
  invalidate();

  const offline = computeOffline(state, 3600 * 1000);
  const idleHourRate = offlineCps(state) * 3600; // what an hour of pure no-touch play yields
  const expected = idleHourRate * BAL.OFFLINE_RATE;
  const delta = Math.abs(offline.cash - expected) / expected;
  check('offline(1h) == idleCps × 1h × rate (±1%)', delta < 0.01, `Δ ${(delta * 100).toFixed(3)}%`);
  check('offline respects the cap', computeOffline(state, 100 * 3600 * 1000).cappedMs <= 24 * 3600 * 1000);
}

// ------------------------------------------------------------- save round-trip
console.log('\nSAVE ROUND-TRIP & WIPE PATH:');
{
  const state = freshState();
  fastForward(state, 0.2, bots.greedy);
  const before = snapshot(state);
  const payload = serialize(state, 1700000100000);
  const { save } = deserialize(payload);
  const revived = rehydrate(save, 1700000100000);
  const after = snapshot(revived);
  check('lifetime cash survives', Math.abs(after.lifetimeAll - before.lifetimeAll) < 1e-6 * Math.max(1, before.lifetimeAll));
  check('level/xp survives', after.level === before.level);
  check('achievements survive', after.achievements === before.achievements);
  check('story progress survives', after.beatsAcked === before.beatsAcked, `${after.beatsAcked} beats`);
  check('corrupt save rejected', (() => {
    try { deserialize(payload.slice(0, payload.length - 40) + '}'); return false; } catch { return true; }
  })());
  check('v1 (HustleOS 4.x) save rejected → wipe path', (() => {
    const v1 = JSON.stringify({ v: 1, t: 0, s: JSON.stringify({ v: 1, run: {}, acct: {} }) });
    try { deserialize(v1); return false; } catch (e) { return /4\.x/.test(e.message); }
  })());

  // A pre-moments_intro state must stay dormant through session-start clamps
  // (Math.min against null would fire a moment instantly on load).
  const dormant = freshState();
  fastForward(dormant, 0.05, bots.none);
  const rt = rehydrate(deserialize(serialize(dormant, 1700000100000)).save, 1700000100000);
  onSessionStart(rt, 3600 * 1000);
  check('dormant schedulers survive onSessionStart', rt.sim.nextMomentMs === null && rt.sim.nextWaveMs === null,
    `moment=${rt.sim.nextMomentMs}, wave=${rt.sim.nextWaveMs}`);
}

// ------------------------------------------------------------------- summary
console.log(`\n${failures === 0 ? '🎉 ALL CHECKS PASSED' : `💥 ${failures} CHECK(S) FAILED`}\n`);
process.exit(failures ? 1 : 0);

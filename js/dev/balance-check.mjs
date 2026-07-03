// Balance regression suite. Run after every tuning change:
//   node js/dev/balance-check.mjs
// Prints the pacing table that IS the balance spec and exits non-zero if a
// target regresses.

import { freshState, fastForward, bots, snapshot } from './headless.js';
import { offlineCps, totalCps, BAL, invalidate } from '../core/balance.js';
import { serialize, deserialize, rehydrate, computeOffline } from '../core/save.js';
import { bus } from '../core/bus.js';

bus.clear(); // no UI listeners in headless

let failures = 0;
function check(name, cond, detail = '') {
  const ok = !!cond;
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}
const f = (n) => (n >= 1e6 ? n.toExponential(2) : Math.round(n).toLocaleString('en-US'));

console.log('\n=== SHIP HAPPENS — balance check ===\n');

// ---------------------------------------------------------------- active run
console.log('ACTIVE PLAYER (greedy bot, 3 clicks/s, campaigns, exits at ×2.5):');
{
  const state = freshState();
  const marks = {};
  const events = { adStudioAt: null, firstExitAt: null, tier7At: null };
  fastForward(state, 1.25, (s) => {
    bots.greedy(s);
    if (!events.adStudioAt && s.run.lifetimeCash >= 50) events.adStudioAt = s.sim.timeMs / 60000;
    if (!events.firstExitAt && s.acct.exits >= 1) events.firstExitAt = s.sim.timeMs / 60000;
    if (!events.tier7At && s.run.unlocked.bracelets) events.tier7At = s.sim.timeMs / 60000;
  }, (s, min) => {
    if ([1, 3, 5, 10, 15, 20, 30, 45, 60, 75].includes(min)) marks[min] = snapshot(s);
  });

  console.log('  min | cash        | $/s        | followers | Lv | tier | exits');
  for (const [min, m] of Object.entries(marks)) {
    console.log(`  ${String(min).padStart(3)} | ${f(m.cash).padStart(11)} | ${f(m.cps).padStart(10)} | ${f(m.followers).padStart(9)} | ${String(m.level).padStart(2)} | ${String(m.maxTier).padStart(4)} | ${m.exits}`);
  }
  const end = snapshot(state);
  console.log(`  events: AdStudio@${events.adStudioAt?.toFixed(1)}m, Tier7@${events.tier7At?.toFixed(1) ?? '—'}m, firstExit@${events.firstExitAt?.toFixed(1) ?? '—'}m\n`);

  check('Ad Studio affordable inside 2 min', events.adStudioAt !== null && events.adStudioAt <= 2, `${events.adStudioAt?.toFixed(1)}m`);
  check('Exit gate (Lv10) before minute 20', marks[20] && marks[20].level >= 10, `Lv ${marks[20]?.level} @20m`);
  // Bot is superhuman (optimal buys every 5s); human pace ≈ 2× bot time,
  // so bot 15–25 min ≈ the design's 30–50 min human first exit.
  check('First exit lands 10–30 min (bot-time)', events.firstExitAt !== null && events.firstExitAt >= 10 && events.firstExitAt <= 30, `${events.firstExitAt?.toFixed(1)}m`);
  check('Tier-7 wall bites after min 15 (bot-time)', events.tier7At === null || events.tier7At >= 15, `${events.tier7At?.toFixed(1) ?? 'not reached'}m`);
  check('Run 2 meaningfully faster (≥1 more exit by 75m)', end.exits >= 2, `${end.exits} exits @75m`);
  check('Ads actually used', end.launches >= 15, `${end.launches} launches`);
}

// ---------------------------------------------------------------- idle run
console.log('\nIDLE PLAYER (no clicks, no campaigns, buys only):');
{
  const state = freshState();
  let firstExitAt = null;
  const marks = {};
  fastForward(state, 3, (s) => {
    bots.idle(s);
    if (!firstExitAt && s.acct.exits >= 1) firstExitAt = s.sim.timeMs / 60000;
  }, (s, min) => {
    if ([10, 30, 60, 90, 120, 150, 180].includes(min)) marks[min] = snapshot(s);
  });
  console.log('  min | cash        | $/s        | Lv | tier | exits');
  for (const [min, m] of Object.entries(marks)) {
    console.log(`  ${String(min).padStart(3)} | ${f(m.cash).padStart(11)} | ${f(m.cps).padStart(10)} | ${String(m.level).padStart(2)} | ${String(m.maxTier).padStart(4)} | ${m.exits}`);
  }
  console.log(`  first exit: ${firstExitAt ? firstExitAt.toFixed(0) + 'm' : 'none in 3h'}\n`);
  check('Idle first exit within 45–180 min (bot-time)', firstExitAt !== null && firstExitAt >= 45, `${firstExitAt?.toFixed(0) ?? '>180'}m`);
  check('Idle is slower than active but alive', (marks[60]?.cps ?? 0) > 100, `$${f(marks[60]?.cps ?? 0)}/s @1h`);
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
console.log('\nSAVE ROUND-TRIP:');
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
  check('corrupt save rejected', (() => {
    try { deserialize(payload.slice(0, payload.length - 40) + '}'); return false; } catch { return true; }
  })());
}

// ------------------------------------------------------------------- summary
console.log(`\n${failures === 0 ? '🎉 ALL CHECKS PASSED' : `💥 ${failures} CHECK(S) FAILED`}\n`);
process.exit(failures ? 1 : 0);

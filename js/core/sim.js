// simTick(state, dt) — the game rules. Pure with respect to the environment:
// no DOM, no Date.now, no Math.random (rng cursor lives in state). Everything
// timed compares against state.sim.timeMs.

import { BAL, getDerived, invalidate, totalCps, clickValue, hypeMult, xpToNext, rackSlots } from './balance.js';
import { rand, randRange, pick } from './rng.js';
import { bus } from './bus.js';
import { PRODUCTS } from '../data/products.js';
import { TREND_TAGS } from '../data/ads.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { NICHES_BY_ID } from '../data/niches.js';
import { autoLaunch, postAdInternal, applyMomentReward } from './actions.js';

export function simTick(state, dt) {
  const s = state.sim;
  s.timeMs += dt;
  state.meta.playtimeMs += dt;
  const t = s.timeMs;
  const d = getDerived(state);
  const sec = dt / 1000;

  // --- Energy regen ---
  if (state.run.energy < d.energyMax) {
    state.run.energy = Math.min(d.energyMax, state.run.energy + dt / d.energyRegenMs);
  }

  // --- Hype decay ---
  if (state.run.hype > 0) {
    state.run.hype = Math.max(0, state.run.hype - d.hypeDecay * sec);
  }

  // --- Organic follower drip ---
  if (state.run.followers >= 1) {
    state.run.followers += BAL.DRIP_COEF * Math.sqrt(state.run.followers) * sec * d.followerGainMult;
  }

  // --- Campaign expiry ---
  if (state.run.campaigns.length) {
    for (let i = state.run.campaigns.length - 1; i >= 0; i--) {
      const c = state.run.campaigns[i];
      if (t >= c.endMs) {
        state.run.campaigns.splice(i, 1);
        bus.emit('campaign:end', c);
      }
    }
  }

  // --- Moment buff expiry ---
  if (s.buffEndMs && t >= s.buffEndMs) {
    s.buffEndMs = 0;
    s.buffMult = 1;
    s.buffLabel = '';
    bus.emit('buff:end');
  }

  // --- Trend wave machine ---
  if (!s.waveTag) {
    if (!s.waveForeshadowed && t >= s.nextWaveMs - BAL.WAVE_FORESHADOW_MS) {
      s.waveForeshadowed = true;
      s.pendingWaveTag = pickWaveTag(state);
      bus.emit('wave:foreshadow', { tag: s.pendingWaveTag });
    }
    if (t >= s.nextWaveMs) {
      s.waveTag = s.pendingWaveTag || pickWaveTag(state);
      s.pendingWaveTag = null;
      s.waveEndMs = t + randRange(state, BAL.WAVE_DUR_MIN, BAL.WAVE_DUR_MAX);
      s.waveRidden = false;
      invalidate();
      bus.emit('wave:start', { tag: s.waveTag, endMs: s.waveEndMs });
    }
  } else if (t >= s.waveEndMs) {
    const ridden = s.waveRidden;
    const tag = s.waveTag;
    s.waveTag = null;
    s.waveForeshadowed = false;
    s.nextWaveMs = t + randRange(state, BAL.WAVE_GAP_MIN, BAL.WAVE_GAP_MAX);
    s.warmTag = pickWaveTag(state);
    invalidate();
    if (ridden) {
      state.run.hype = Math.min(d.hypeMax, state.run.hype + BAL.WAVE_RIDE_HYPE);
    }
    bus.emit('wave:end', { tag, ridden, warmTag: s.warmTag });
  }

  // --- Viral moments (golden cookies). Only spawn for visible sessions;
  //     loop.js suppresses ticks while hidden beyond the catch-up window. ---
  if (!s.momentActive && t >= s.nextMomentMs) {
    s.momentActive = true;
    s.momentExpireMs = t + BAL.MOMENT_DUR_MS + d.momentExtraMs;
    bus.emit('moment:spawn', { expireMs: s.momentExpireMs });
  }
  if (s.momentActive && t >= s.momentExpireMs) {
    s.momentActive = false;
    // Trend Watcher VA (Lv25): auto-catch at 50% value as it slips away.
    if (state.acct.level >= 25) {
      applyMomentReward(state, BAL.TRENDWATCH_VALUE, true);
    }
    s.nextMomentMs = t + randRange(state, BAL.MOMENT_GAP_MIN, BAL.MOMENT_GAP_MAX);
    bus.emit('moment:expire');
  }

  // --- Guru: Post-Economic auto-moment ---
  if (d.autoMomentMs) {
    if (!s.autoMomentMs) s.autoMomentMs = t + d.autoMomentMs;
    if (t >= s.autoMomentMs) {
      s.autoMomentMs = t + d.autoMomentMs;
      applyMomentReward(state, 1, true);
    }
  }

  // --- VAs ---
  if (state.acct.level >= 8) {
    // Auto-Packer: 2 clicks/sec, no crits, no hype
    state.run.cash += clickValue(state) * BAL.AUTOPACK_CPS * sec;
  }
  if (state.acct.level >= 12 && t - s.lastPostMs >= BAL.INTERN_POST_MS) {
    s.lastPostMs = t;
    postAdInternal(state, 1, false);
  }
  if (state.acct.level >= 18) {
    // Campaign Manager: when energy is full and the rack has room, auto-spin
    // and launch at 60% power. Keeps idle players near parity.
    if (state.run.energy >= d.energyMax - 0.001
      && state.run.campaigns.length < rackSlots(state)
      && t - s.lastAutoLaunchMs > 10000) {
      s.lastAutoLaunchMs = t;
      autoLaunch(state, BAL.CMGR_POWER);
    }
  }

  // --- Income accrual ---
  const cps = totalCps(state);
  const gain = cps * sec;
  addCash(state, gain);

  // Items-sold fiction for stats/achievements: each unit ships 0.1 orders/sec.
  let units = 0;
  for (const p of PRODUCTS) units += (state.run.products[p.id] || 0);
  state.acct.stats.itemsSold += units * 0.1 * sec;

  // --- 1 Hz housekeeping: unlock gates, achievements, stat maxes ---
  if (t - s.lastAchCheckMs >= 1000) {
    s.lastAchCheckMs = t;
    checkUnlocks(state);
    checkAchievements(state);
    const st = state.acct.stats;
    if (state.run.followers > st.maxFollowers) st.maxFollowers = state.run.followers;
    if (state.run.hype > st.maxHype) st.maxHype = state.run.hype;
    if (cps > st.bestCps) st.bestCps = cps;
  }

  // --- History sampling for the chart (every 2s) ---
  if (t - s.lastHistoryMs >= 2000) {
    s.lastHistoryMs = t;
    state.history.push([t, cps]);
    if (state.history.length > 450) state.history.splice(0, state.history.length - 450);
  }
}

export function addCash(state, amount) {
  state.run.cash += amount;
  state.run.lifetimeCash += amount;
  state.acct.lifetimeAllTime += amount;
}

export function addXp(state, amount) {
  const a = state.acct;
  a.xp += amount;
  let leveled = false;
  while (a.xp >= xpToNext(a.level)) {
    a.xp -= xpToNext(a.level);
    a.level++;
    a.perkPoints++;
    leveled = true;
    bus.emit('level:up', { level: a.level });
  }
  if (leveled) invalidate();
}

export function addFollowers(state, amount) {
  const d = getDerived(state);
  state.run.followers += amount * d.followerGainMult;
}

export function addHype(state, amount) {
  const d = getDerived(state);
  state.run.hype = Math.min(d.hypeMax, state.run.hype + amount);
}

function pickWaveTag(state) {
  // Niche tag counts double; the current warm tag is excluded so waves feel fresh.
  const niche = state.run.niche ? NICHES_BY_ID[state.run.niche] : null;
  const pool = [];
  for (const tg of TREND_TAGS) {
    if (tg.id === state.sim.warmTag) continue;
    pool.push(tg.id);
    if (niche && tg.id === niche.tag) pool.push(tg.id);
  }
  return pick(state, pool);
}

function checkUnlocks(state) {
  for (const p of PRODUCTS) {
    if (state.run.unlocked[p.id]) continue;
    const u = p.unlock;
    if ((u.cashSeen && state.run.lifetimeCash < u.cashSeen)
      || (u.followers && state.run.followers < u.followers)
      || (u.level && state.acct.level < u.level)) continue;
    state.run.unlocked[p.id] = true;
    if (p.tier > state.acct.stats.maxTierUnlocked) state.acct.stats.maxTierUnlocked = p.tier;
    bus.emit('product:unlock', { id: p.id });
  }
}

function getPath(obj, path) {
  let v = obj;
  for (const k of path.split('.')) v = v?.[k];
  return v;
}

function checkAchievements(state) {
  for (const a of ACHIEVEMENTS) {
    if (state.acct.achievements[a.id]) continue;
    let ok = false;
    if (a.check) ok = (getPath(state, a.check.stat) || 0) >= a.check.gte;
    else if (a.checkFn) ok = a.checkFn(state);
    if (ok) {
      state.acct.achievements[a.id] = 1;
      invalidate(); // +1% global each
      bus.emit('achievement', a);
    }
  }
}

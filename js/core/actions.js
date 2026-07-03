// Player verbs. UI event handlers call these; they are the only mutations
// besides simTick. Every action is also usable headlessly (balance bots).

import {
  BAL, getDerived, invalidate, totalCps, clickValue, adFee, bulkCost,
  maxAffordable, computeOdds, milestonesHit, exitPreview, offlineCps, rackSlots,
} from './balance.js';
import { addCash, addXp, addFollowers, addHype } from './sim.js';
import { rand, pick, pickWeighted, randInt } from './rng.js';
import { bus } from './bus.js';
import { PRODUCTS_BY_ID, PRODUCTS } from '../data/products.js';
import { UPGRADES_BY_ID } from '../data/upgrades.js';
import { HOOKS, HOOKS_BY_ID, TREND_TAGS, PLATFORMS_BY_ID, OUTCOMES, FACESPACE_MULT } from '../data/ads.js';
import { GURU_BY_ID, PERKS_BY_ID, EXIT_MIN_LEVEL } from '../data/prestige.js';
import { NICHES } from '../data/niches.js';
import { AD_PAYOFFS, COMPANY_PREFIX, COMPANY_SUFFIX, COMPANY_LEGAL, HALL_OF_FAME_VIEWS } from '../data/flavor.js';

// --- Clicking ---------------------------------------------------------------

export function packOrder(state) {
  const crit = rand(state) < BAL.CRIT_CHANCE
    // Click #6 of a fresh account is a scripted crit (first-taste rule).
    || (state.ftue.clicks === 5 && state.acct.exits === 0);
  let value = clickValue(state);
  if (crit) value *= BAL.CRIT_MULT;
  addCash(state, value);
  addHype(state, BAL.CLICK_HYPE);
  addXp(state, BAL.XP_CLICK);
  state.acct.stats.totalClicks++;
  if (crit) state.acct.stats.crits++;
  state.ftue.clicks++;
  bus.emit('click', { value, crit });
  return { value, crit };
}

export function postAd(state) {
  const t = state.sim.timeMs;
  if (t - (state.sim.lastManualPostMs || 0) < BAL.POST_MIN_GAP_MS) return null;
  state.sim.lastManualPostMs = t;
  const gained = postAdInternal(state, 1, true);
  addHype(state, BAL.POST_HYPE);
  bus.emit('post', { gained });
  return gained;
}

export function postAdInternal(state, power, manual) {
  const gained = (1 + BAL.POST_F_COEF * state.run.followers) * power;
  addFollowers(state, gained);
  return gained;
}

// --- Buying -----------------------------------------------------------------

export function buyProduct(state, id, qty) {
  const p = PRODUCTS_BY_ID[id];
  if (!p || !state.run.unlocked[id]) return false;
  const d = getDerived(state);
  const count = state.run.products[id] || 0;
  let n = qty === 'max' ? maxAffordable(p, count, state.run.cash, d) : qty;
  if (n < 1) return false;
  const cost = bulkCost(p, count, n, d);
  if (cost > state.run.cash) return false;
  state.run.cash -= cost;
  const before = milestonesHit(count);
  state.run.products[id] = count + n;
  const after = milestonesHit(count + n);
  addXp(state, BAL.XP_BUY_PER_TIER * p.tier * n);
  if (after > before) {
    addXp(state, BAL.XP_MILESTONE_PER_TIER * p.tier * (after - before));
    bus.emit('milestone', { id, count: count + n, hits: after });
  }
  if (count + n > state.acct.stats.maxOneProduct) {
    state.acct.stats.maxOneProduct = count + n;
  }
  invalidate();
  bus.emit('buy', { id, n, cost });
  return true;
}

export function buyUpgrade(state, id) {
  const u = UPGRADES_BY_ID[id];
  if (!u || state.run.upgrades[id]) return false;
  if (!upgradeAvailable(state, u)) return false;
  if (state.run.cash < u.cost) return false;
  state.run.cash -= u.cost;
  state.run.upgrades[id] = true;
  invalidate();
  bus.emit('upgrade', u);
  return true;
}

export function upgradeAvailable(state, u) {
  const r = u.requires;
  if (!r) return true;
  if (r.level && state.acct.level < r.level) return false;
  if (r.product) {
    const [pid, cnt] = r.product;
    if ((state.run.products[pid] || 0) < cnt) return false;
  }
  return true;
}

// --- Ad Studio ---------------------------------------------------------------

export function ownedHooks(state) {
  return HOOKS.filter((h) => {
    const u = h.unlock;
    if (u.level && state.acct.level < u.level) return false;
    if (u.exits && state.acct.exits < u.exits) return false;
    return true;
  });
}

function weightedTag(state, tags) {
  // Wave tag, warm tag and niche tag are twice as likely to roll.
  const s = state.sim;
  const nicheTag = state.run.niche ? nicheTagOf(state.run.niche) : null;
  return pickWeighted(state, tags, (tg) => {
    let w = 1;
    if (tg.id === s.waveTag || tg.id === s.warmTag) w *= 2;
    if (nicheTag && tg.id === nicheTag) w *= 2;
    return w;
  });
}

function nicheTagOf(nicheId) {
  const n = NICHES.find((x) => x.id === nicheId);
  return n ? n.tag : null;
}

export function spinReels(state, locks = {}) {
  if (state.run.energy < 1) return null;
  const d = getDerived(state);
  const hooks = ownedHooks(state);
  const ownedProducts = PRODUCTS.filter((p) => (state.run.products[p.id] || 0) > 0);
  if (!ownedProducts.length) return null;

  // Enforce earned lock slots.
  const allowed = d.reelLocks;
  const lockList = ['hookId', 'productId', 'tagId'].filter((k) => locks[k]);
  if (lockList.length > allowed) return null;

  state.run.energy -= 1;
  state.run.spins++;

  const nicheTag = state.run.niche ? nicheTagOf(state.run.niche) : null;
  const hook = locks.hookId
    ? HOOKS_BY_ID[locks.hookId]
    : pickWeighted(state, hooks, (h) => (nicheTag && h.tags.includes(nicheTag) ? 2 : 1));
  const product = locks.productId
    ? PRODUCTS_BY_ID[locks.productId]
    : pick(state, ownedProducts);
  const tag = locks.tagId
    ? TREND_TAGS.find((t) => t.id === locks.tagId)
    : weightedTag(state, TREND_TAGS);

  const title = `${hook.text.replace('{p}', product.name)} — ${product.name} ${pick(state, AD_PAYOFFS)}`;
  state.run.pendingAd = {
    hookId: hook.id, productId: product.id, tagId: tag.id,
    title, locked: { ...locks },
  };
  bus.emit('spin', state.run.pendingAd);
  return state.run.pendingAd;
}

// Roll the outcome wheel for the pending ad and publish it on a platform.
export function launchAd(state, platformId, boost = false) {
  const ad = state.run.pendingAd;
  const platform = PLATFORMS_BY_ID[platformId];
  if (!ad || !platform) return null;
  if (!platformUnlocked(state, platform)) return null;
  if (platform.kind === 'burst' && state.run.campaigns.length >= rackSlots(state)) return null;

  const fee = adFee(state);
  if (state.run.cash < fee) return null;
  if (boost && state.run.hype < BAL.BOOST_HYPE_COST) boost = false;
  state.run.cash -= fee;
  if (boost) {
    state.run.hype -= BAL.BOOST_HYPE_COST;
    state.acct.stats.boostedLaunches++;
  }

  const odds = computeOdds(state, ad, boost);
  let outcome = rollOutcome(state, odds.bands);
  let chaos = false;
  // First launch ever is rigged to land HIT or better (first-taste rule).
  if (!state.ftue.riggedSpinDone) {
    state.ftue.riggedSpinDone = true;
    if (outcome.id === 'flop' || outcome.id === 'mid') outcome = OUTCOMES[2];
  }
  // Daily Standup: the first ad of the day is guaranteed HIT+.
  if (state.acct.standup?.guaranteed) {
    state.acct.standup.guaranteed = false;
    if (outcome.id === 'flop' || outcome.id === 'mid') outcome = OUTCOMES[2];
  }
  if (odds.chaos && outcome.id !== 'mega' && rand(state) < BAL.CHAOS_CHANCE) {
    outcome = OUTCOMES[4]; // MEGA-VIRAL, because that is how the internet works
    chaos = true;
    state.acct.stats.chaosJackpots++;
  }

  // Pity bookkeeping
  const wasViral = outcome.id === 'viral' || outcome.id === 'mega';
  if (wasViral) {
    if (state.run.pity * BAL.PITY_VIRAL >= 20) state.acct.stats.pityVirals++;
    state.run.pity = 0;
    state.acct.stats.viralHits++;
  } else {
    state.run.pity++;
    if (outcome.id === 'flop') state.acct.stats.flops++;
  }

  // Riding the wave?
  if (state.sim.waveTag && ad.tagId === state.sim.waveTag && !state.sim.waveRidden) {
    state.sim.waveRidden = true;
    state.acct.stats.wavesRidden++;
    addXp(state, BAL.XP_WAVE);
  }

  const result = {
    ad, platform: platform.id, outcome, chaos, boost, fee,
    followersGained: 0, lump: 0,
  };

  applyPlatformEffect(state, platform, outcome, ad, result);

  if (outcome.id === 'mega') {
    state.acct.stats.megaVirals++;
    result.lump += totalCps(state) * BAL.MEGA_LUMP_SECONDS;
    addCash(state, totalCps(state) * BAL.MEGA_LUMP_SECONDS);
    state.acct.hallOfFame.push({
      title: ad.title,
      views: pick(state, HALL_OF_FAME_VIEWS),
      at: state.sim.timeMs,
    });
    if (state.acct.hallOfFame.length > 30) state.acct.hallOfFame.shift();
  }

  // FLOPs still feed the meter — failure moves a bar up.
  addHype(state, outcome.id === 'flop' ? 8 : 15);
  addXp(state, BAL.XP_LAUNCH);
  state.acct.stats.totalLaunches++;
  state.run.pendingAd = null;
  bus.emit('launch', result);
  return result;
}

function rollOutcome(state, bands) {
  const total = bands.reduce((a, b) => a + b.pct, 0);
  let roll = rand(state) * total;
  for (const b of bands) {
    roll -= b.pct;
    if (roll <= 0) return OUTCOMES.find((o) => o.id === b.id);
  }
  return OUTCOMES[1];
}

function applyPlatformEffect(state, platform, outcome, ad, result) {
  const t = state.sim.timeMs;
  if (platform.kind === 'burst') {
    if (outcome.mult > 0) {
      state.run.campaigns.push({
        outcome: outcome.id,
        mult: outcome.id === 'mega' ? 10 : outcome.mult, // MEGA rate = VIRAL; excess paid as lump
        startMs: t,
        endMs: t + platform.durationMs,
        title: ad.title,
        tag: ad.tagId,
      });
    }
  } else if (platform.kind === 'followers') {
    const factor = { flop: 0.25, mid: 0.75, hit: 1.5, viral: 3, mega: 6 }[outcome.id];
    const gained = Math.max(BAL.INSTAGLAM_MIN,
      BAL.INSTAGLAM_F_COEF * Math.sqrt(state.run.followers) * factor);
    addFollowers(state, gained);
    addHype(state, BAL.INSTAGLAM_HYPE);
    result.followersGained = gained;
  } else if (platform.kind === 'slot') {
    state.run.fbSlot = { outcome: outcome.id, mult: FACESPACE_MULT[outcome.id], title: ad.title };
    invalidate();
  }
}

export function platformUnlocked(state, platform) {
  const u = platform.unlock;
  if (u.cashSeen && state.run.lifetimeCash < u.cashSeen) return false;
  return true;
}

// Campaign Manager VA: spin (free — the VA brings their own energy? no:
// consumes real energy, launches on ClikClok at reduced power).
export function autoLaunch(state, power) {
  if (state.run.energy < 1 || state.run.pendingAd) return;
  const spun = spinReels(state, {});
  if (!spun) return;
  const fee = adFee(state);
  if (state.run.cash < fee * 2) { state.run.pendingAd = null; return; }
  const result = launchAd(state, 'clikclok', false);
  if (result && result.outcome.mult > 1) {
    // Reduce the resulting campaign's power to CMGR_POWER
    const c = state.run.campaigns[state.run.campaigns.length - 1];
    if (c) c.mult *= power;
  }
}

// --- Viral moments ------------------------------------------------------------

export function clickMoment(state) {
  if (!state.sim.momentActive) return null;
  state.sim.momentActive = false;
  state.sim.nextMomentMs = state.sim.timeMs
    + BAL.MOMENT_GAP_MIN + rand(state) * (BAL.MOMENT_GAP_MAX - BAL.MOMENT_GAP_MIN);
  state.acct.stats.momentsClicked++;
  addXp(state, BAL.XP_MOMENT);
  return applyMomentReward(state, 1, false);
}

export function applyMomentReward(state, valueFactor, auto) {
  const roll = rand(state);
  const s = state.sim;
  let reward;
  if (roll < 0.6) {
    s.buffMult = 1 + (BAL.FRENZY_MULT - 1) * valueFactor;
    s.buffEndMs = s.timeMs + BAL.FRENZY_MS;
    s.buffLabel = 'SALES FRENZY';
    reward = { kind: 'frenzy', mult: s.buffMult, ms: BAL.FRENZY_MS };
  } else if (roll < 0.85) {
    const gained = (state.run.followers * BAL.STORM_PCT + BAL.STORM_FLAT) * valueFactor;
    addFollowers(state, gained);
    reward = { kind: 'storm', followers: gained };
  } else if (roll < 0.95) {
    const lump = totalCps(state) * BAL.WHALE_SECONDS * valueFactor;
    addCash(state, lump);
    state.acct.stats.whaleOrders++;
    reward = { kind: 'whale', cash: lump };
  } else {
    s.buffMult = 1 + (BAL.MEGA_MOMENT_MULT - 1) * valueFactor;
    s.buffEndMs = s.timeMs + BAL.MEGA_MOMENT_MS;
    s.buffLabel = 'MEGA-VIRAL MOMENT';
    reward = { kind: 'mega', mult: s.buffMult, ms: BAL.MEGA_MOMENT_MS };
  }
  reward.auto = auto;
  bus.emit('moment:reward', reward);
  return reward;
}

// --- Perks & Guru ---------------------------------------------------------------

export function buyPerk(state, id) {
  const perk = PERKS_BY_ID[id];
  if (!perk) return false;
  const rank = state.acct.perks[id] || 0;
  if (rank >= perk.maxRank) return false;
  const cost = perk.costs[rank];
  if (state.acct.perkPoints < cost) return false;
  state.acct.perkPoints -= cost;
  state.acct.perks[id] = rank + 1;
  invalidate();
  bus.emit('perk', { id, rank: rank + 1 });
  return true;
}

export function buyGuru(state, id) {
  const node = GURU_BY_ID[id];
  if (!node || state.acct.guru[id]) return false;
  if (state.acct.investors < node.cost) return false;
  state.acct.investors -= node.cost;
  state.acct.guru[id] = true;
  invalidate();
  bus.emit('guru', node);
  return true;
}

// --- Prestige: The Exit ----------------------------------------------------------

export function canExit(state) {
  return state.acct.level >= EXIT_MIN_LEVEL && exitPreview(state).gained >= 1;
}

export function doExit(state) {
  if (!canExit(state)) return null;
  const preview = exitPreview(state);
  const runMs = state.sim.timeMs - state.run.startMs;
  const soldFor = state.run.lifetimeCash;

  state.acct.lastRunAvgCps = runMs > 1000 ? state.run.lifetimeCash / (runMs / 1000) : 0;
  state.acct.investorsEarnedTotal += preview.gained;
  state.acct.investors += preview.gained;
  state.acct.exits++;
  state.acct.runLog.push({
    name: state.run.companyName, soldFor, investors: preview.gained, ms: runMs,
  });
  if (state.acct.runLog.length > 50) state.acct.runLog.shift();
  addXp(state, BAL.XP_EXIT);

  // Reset run scope
  const d = getDerived(state);
  const startCash = d.startCashSeconds * state.acct.lastRunAvgCps;
  state.run = {
    number: state.run.number + 1,
    companyName: generateCompanyName(state),
    niche: null,
    nicheChoices: rollNicheChoices(state),
    cash: 0,
    lifetimeCash: 0,
    followers: 0,
    hype: 0,
    energy: 3,
    products: {},
    unlocked: { banana: true },
    upgrades: {},
    pendingAd: null,
    campaigns: [],
    fbSlot: null,
    pity: 0,
    startMs: state.sim.timeMs,
    spins: 0,
  };
  if (startCash > 0) addCash(state, startCash);
  // addCash bumps lifetimeAllTime; seed money isn't earnings — undo that.
  state.acct.lifetimeAllTime -= startCash;

  state.sim.buffEndMs = 0; state.sim.buffMult = 1;
  state.history.length = 0;
  invalidate();
  bus.emit('exit', { gained: preview.gained, soldFor, exits: state.acct.exits });
  return { gained: preview.gained, soldFor };
}

export function rollNicheChoices(state) {
  const pool = [...NICHES];
  const out = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const idx = randInt(state, 0, pool.length - 1);
    out.push(pool.splice(idx, 1)[0].id);
  }
  return out;
}

export function pickNiche(state, id) {
  if (!state.run.nicheChoices || !state.run.nicheChoices.includes(id)) return false;
  state.run.niche = id;
  state.run.nicheChoices = null;
  invalidate();
  bus.emit('niche', { id });
  return true;
}

export function skipNiche(state) {
  state.run.nicheChoices = null;
  bus.emit('niche', { id: null });
}

export function generateCompanyName(state) {
  return `${pick(state, COMPANY_PREFIX)}${pick(state, COMPANY_SUFFIX)} ${pick(state, COMPANY_LEGAL)}`;
}

// --- Daily Standup -----------------------------------------------------------
// Called once at boot with today's date string. Consecutive days grow the
// Consistency streak (+2%/day, cap +20%); missing a day PAUSES it — never
// resets. No countdown timers, no guilt. The bonus rewards showing up.

export function dailyStandup(state, today, consecutive) {
  const su = state.acct.standup;
  if (!su || su.day === today) return null;
  const firstEver = !su.day;
  su.day = today;
  su.guaranteed = true;
  let paused = false;
  if (firstEver || consecutive) su.streak = Math.min(10, su.streak + 1);
  else paused = true;
  invalidate();
  return { streak: su.streak, paused, firstEver };
}

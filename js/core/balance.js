// Every formula and tuning constant in the game. The headless balance
// harness and the live sim both run through this file — there is exactly one
// implementation of the economy.

import { PRODUCTS, PRODUCTS_BY_ID, MILESTONES } from '../data/products.js';
import { UPGRADES_BY_ID } from '../data/upgrades.js';
import { GURU_BY_ID, PERKS_BY_ID, INVESTOR_DIVISOR, INVESTOR_INCOME } from '../data/prestige.js';
import { ACH_INCOME_BONUS } from '../data/achievements.js';
import { HOOKS_BY_ID, OUTCOMES } from '../data/ads.js';
import { NICHES_BY_ID, NICHE_INCOME_BONUS, NICHE_ANTI_PENALTY } from '../data/niches.js';

export const BAL = Object.freeze({
  SIM_DT: 100,                       // ms per sim tick

  // Clicking
  CLICK_BASE: 1,
  CLICK_T1_COUPLING: 0.5,            // click = $1 + 0.5× tier-1 effective $/s
  CLICK_HYPE: 0.5,
  CRIT_CHANCE: 0.05,
  CRIT_MULT: 10,
  POST_HYPE: 4,
  POST_F_COEF: 0.001,                // post = (1 + 0.001·F) followers
  POST_MIN_GAP_MS: 200,              // ≤5 posts/sec
  DRIP_COEF: 0.01,                   // organic dF/dt = 0.01·√F

  // Hype
  HYPE_MAX: 100,
  HYPE_DECAY: 1.2,                   // per second
  HYPE_SLOPE: 1.0,                   // mult = 1 + H/100 × 1.0

  // Followers → income
  REACH_DIV: 1000,
  REACH_EXP: 0.4,

  // Leveling
  XP_BASE: 90,
  XP_GROWTH: 1.35,
  LEVEL_INCOME: 0.01,
  XP_CLICK: 0.04,
  XP_BUY_PER_TIER: 0.5,
  XP_MILESTONE_PER_TIER: 60,
  XP_LAUNCH: 10,
  XP_WAVE: 40,
  XP_MOMENT: 40,
  XP_EXIT: 2000,

  // Ad Studio
  ENERGY_MAX: 3,
  ENERGY_REGEN_MS: 75000,
  AD_FEE_SECONDS: 60,
  AD_FEE_MIN: 20,
  CLIKCLOK_BONUS: 0.25,              // campaign adds outcomeMult × bonus × decay(t)
  CAMPAIGN_DECAY_HI: 1.4,            // decay factor 1.4 → 0.6 over the duration
  CAMPAIGN_DECAY_LO: 0.6,
  MAX_RACK: 4,                       // absolute ceiling; slots unlock by level
  RACK_LEVELS: [1, 14, 20, 26],      // slot i unlocks at RACK_LEVELS[i]
  INSTAGLAM_F_COEF: 60,              // +60·√F × outcome factor followers
  INSTAGLAM_HYPE: 25,
  INSTAGLAM_MIN: 50,
  MEGA_LUMP_SECONDS: 1800,           // MEGA pays 30 min of income as a lump sum
  TEMP_CAP: 40,                      // campaigns × moment buffs hard cap

  // Odds bar (percentage points of probability mass)
  WAVE_SHIFT: 12,
  WARM_SHIFT: 6,
  PRODUCT_MATCH_SHIFT: 4,
  RARITY_VIRAL: 2,
  BOOST_VIRAL: 5,
  BOOST_HYPE_COST: 30,
  PITY_VIRAL: 1.5,
  CHAOS_CHANCE: 0.05,

  // Trend waves (dormant until the trends_intro beat arms the scheduler)
  WAVE_GAP_MIN: 420000, WAVE_GAP_MAX: 780000,
  WAVE_DUR_MIN: 60000, WAVE_DUR_MAX: 120000,
  WAVE_FORESHADOW_MS: 30000,
  WAVE_FIRST_DELAY_MS: 60000,
  WAVE_PRODUCT_MULT: 3,
  WAVE_RIDE_HYPE: 20,

  // Viral moments (dormant until moments_intro arms the scheduler)
  MOMENT_GAP_MIN: 360000, MOMENT_GAP_MAX: 720000,
  MOMENT_DUR_MS: 22000,
  MOMENT_SESSION_PITY_MS: 300000,
  MOMENT_FIRST_DELAY_MS: 90000,
  FRENZY_MULT: 5, FRENZY_MS: 25000,
  STORM_PCT: 0.15, STORM_FLAT: 500,
  WHALE_SECONDS: 300,
  MEGA_MOMENT_MULT: 12, MEGA_MOMENT_MS: 12000,

  // Offline & comeback
  OFFLINE_RATE: 0.5,
  OFFLINE_CAP_MS: 8 * 3600 * 1000,
  COMEBACK_AWAY_MS: 8 * 3600 * 1000,
  COMEBACK_MULT: 2,
  COMEBACK_MS: 600000,

  // VAs (level unlocks)
  AUTOPACK_CPS: 2,                   // clicks/sec at Lv8
  INTERN_POST_MS: 5000,              // Lv12
  CMGR_POWER: 0.6,                   // Lv18 auto-campaign power
  TRENDWATCH_VALUE: 0.5,             // Lv25 auto-moment value

  // Prestige
  EXIT_MIN_LEVEL: 10,
  INVESTOR_DIVISOR,
  INVESTOR_INCOME,

  // Milestones
  MILESTONE_BASE: 2,
});

const fin = (x) => (Number.isFinite(x) ? x : Number.MAX_VALUE);

// ---------------------------------------------------------------------------
// Effect accumulator: folds owned upgrades + guru nodes + perks into one
// object. Recomputed only when `invalidate()` is called (buys, prestige,
// wave transitions, level-ups, achievement unlocks).
// ---------------------------------------------------------------------------

let derived = null;
let dirty = true;

export function invalidate() { dirty = true; }

export function getDerived(state) {
  if (dirty || !derived) {
    derived = compute(state);
    dirty = false;
  }
  return derived;
}

function foldEffects(state) {
  const eff = {
    productMult: {},          // productId -> mult
    globalMult: 1,
    clickMult: 1,
    energyMaxAdd: 0,
    energyRegenMult: 1,
    followerGainMult: 1,
    viralChanceAdd: 0,
    reelLocks: 0,
    offlineRateAdd: 0,
    offlineCapMs: BAL.OFFLINE_CAP_MS,
    costMult: 1,
    reachExp: BAL.REACH_EXP,
    milestoneBase: BAL.MILESTONE_BASE,
    startCashSeconds: 0,
    offlineFollowers: false,
    autoMomentMs: 0,
  };
  const apply = (effects) => {
    for (const e of effects) {
      switch (e.type) {
        case 'productMult':
          eff.productMult[e.target] = (eff.productMult[e.target] || 1) * e.value;
          break;
        case 'globalMult': eff.globalMult *= e.value; break;
        case 'clickMult': eff.clickMult *= e.value; break;
        case 'energyMaxAdd': eff.energyMaxAdd += e.value; break;
        case 'energyRegenMult': eff.energyRegenMult *= e.value; break;
        case 'followerGainMult': eff.followerGainMult *= e.value; break;
        case 'viralChanceAdd': eff.viralChanceAdd += e.value; break;
        case 'reelLockAdd': eff.reelLocks += e.value; break;
        case 'offlineRateAdd': eff.offlineRateAdd += e.value; break;
        case 'offlineCapMs': eff.offlineCapMs = Math.max(eff.offlineCapMs, e.value); break;
        case 'costMult': eff.costMult *= e.value; break;
        case 'reachExp': eff.reachExp = Math.max(eff.reachExp, e.value); break;
        case 'milestoneBase': eff.milestoneBase = Math.max(eff.milestoneBase, e.value); break;
        case 'startCash': eff.startCashSeconds += e.value; break;
        case 'offlineFollowers': eff.offlineFollowers = true; break;
        case 'autoMoment': eff.autoMomentMs = e.value; break;
      }
    }
  };
  for (const id in state.run.upgrades) {
    const u = UPGRADES_BY_ID[id];
    if (u) apply(u.effects);
  }
  for (const id in state.acct.guru) {
    const g = GURU_BY_ID[id];
    if (g) apply(g.effects);
  }
  return eff;
}

function compute(state) {
  const eff = foldEffects(state);
  const niche = state.run.niche ? NICHES_BY_ID[state.run.niche] : null;

  // Per-product effective $/s (before global multipliers)
  const productCps = {};
  let baseCps = 0;
  for (const p of PRODUCTS) {
    const count = state.run.products[p.id] || 0;
    if (!count) { productCps[p.id] = 0; continue; }
    let mult = Math.pow(eff.milestoneBase, milestonesHit(count));
    mult *= eff.productMult[p.id] || 1;
    if (niche) {
      if (p.tags.includes(niche.tag)) mult *= 1 + NICHE_INCOME_BONUS;
      if (p.tags.includes(niche.antiTag)) mult *= 1 - NICHE_ANTI_PENALTY;
    }
    if (state.sim.waveTag && p.tags.includes(state.sim.waveTag)) {
      mult *= BAL.WAVE_PRODUCT_MULT;
    }
    const cps = count * p.baseIncome * mult;
    productCps[p.id] = cps;
    baseCps += cps;
  }

  // Static global multiplier (everything that doesn't change every tick)
  const invMult = 1 + BAL.INVESTOR_INCOME * state.acct.investors;
  const levelMult = 1 + BAL.LEVEL_INCOME * (state.acct.level - 1);
  const achMult = 1 + ACH_INCOME_BONUS * Object.keys(state.acct.achievements).length;
  const fbMult = state.run.fbSlot ? state.run.fbSlot.mult : 1;
  const standupMult = 1 + 0.02 * Math.min(10, state.acct.standup?.streak || 0);
  const staticGlobal = eff.globalMult * invMult * levelMult * achMult * fbMult * standupMult;

  const perk = (id) => state.acct.perks[id] || 0;

  return {
    eff,
    productCps,
    baseCps,
    staticGlobal,
    hypeMax: BAL.HYPE_MAX + 10 * perk('pk_hypecap'),
    hypeDecay: BAL.HYPE_DECAY * (1 - 0.1 * perk('pk_hypedecay')),
    clickMult: eff.clickMult * (1 + 0.25 * perk('pk_click')),
    energyMax: BAL.ENERGY_MAX + eff.energyMaxAdd,
    energyRegenMs: BAL.ENERGY_REGEN_MS * eff.energyRegenMult * (1 - 0.08 * perk('pk_energy')),
    offlineRate: BAL.OFFLINE_RATE + eff.offlineRateAdd + 0.05 * perk('pk_offline'),
    offlineCapMs: eff.offlineCapMs,
    momentExtraMs: 3000 * perk('pk_moments'),
    reelLocks: eff.reelLocks,
    viralChanceAdd: eff.viralChanceAdd,
    followerGainMult: eff.followerGainMult,
    costMult: eff.costMult,
    reachExp: eff.reachExp,
    startCashSeconds: eff.startCashSeconds,
    offlineFollowers: eff.offlineFollowers,
    autoMomentMs: eff.autoMomentMs,
  };
}

// ---------------------------------------------------------------------------
// Income pipeline
// ---------------------------------------------------------------------------

export function milestonesHit(count) {
  let n = 0;
  for (const m of MILESTONES) if (count >= m) n++;
  return n;
}

export function nextMilestone(count) {
  for (const m of MILESTONES) if (count < m) return m;
  return null;
}

export function reachMult(state, d = getDerived(state)) {
  return Math.pow(1 + state.run.followers / BAL.REACH_DIV, d.reachExp);
}

export function hypeMult(state) {
  return 1 + (state.run.hype / 100) * BAL.HYPE_SLOPE;
}

// Campaign rate bonus with front-loaded decay (1.6 → 0.6 across the run).
function campaignBonus(c, t) {
  const T = c.endMs - c.startMs;
  const frac = Math.min(1, Math.max(0, (t - c.startMs) / T));
  const decay = BAL.CAMPAIGN_DECAY_HI - (BAL.CAMPAIGN_DECAY_HI - BAL.CAMPAIGN_DECAY_LO) * frac;
  return c.mult * BAL.CLIKCLOK_BONUS * decay;
}

export function campaignsMult(state) {
  let bonus = 0;
  for (const c of state.run.campaigns) bonus += campaignBonus(c, state.sim.timeMs);
  return 1 + bonus;
}

// Temp multiplier (campaigns × moment buffs), hard-capped. Returns
// { value, capped } so the UI can show "ALGORITHM SATURATED".
export function tempMult(state) {
  const raw = campaignsMult(state) * (state.sim.buffEndMs > state.sim.timeMs ? state.sim.buffMult : 1);
  return { value: Math.min(raw, BAL.TEMP_CAP), capped: raw > BAL.TEMP_CAP };
}

export function comebackMult(state) {
  return state.sim.comebackEndMs > state.sim.timeMs ? BAL.COMEBACK_MULT : 1;
}

// Campaign rack slots unlock with Hustler Level (1 → 4).
export function rackSlots(state) {
  let slots = 0;
  for (const lv of BAL.RACK_LEVELS) if (state.acct.level >= lv) slots++;
  return slots;
}

// Full effective $/s.
export function totalCps(state) {
  const d = getDerived(state);
  return fin(d.baseCps * d.staticGlobal * reachMult(state, d) * hypeMult(state)
    * tempMult(state).value * comebackMult(state));
}

// Offline snapshot: no hype, no campaigns, no moment buffs, no wave.
// (Waves are part of productCps; we recompute per-product without the wave.)
export function offlineCps(state) {
  const d = getDerived(state);
  let base = d.baseCps;
  if (state.sim.waveTag) {
    base = 0;
    for (const p of PRODUCTS) {
      let cps = d.productCps[p.id];
      if (cps && p.tags.includes(state.sim.waveTag)) cps /= BAL.WAVE_PRODUCT_MULT;
      base += cps;
    }
  }
  return fin(base * d.staticGlobal * reachMult(state, d));
}

// ---------------------------------------------------------------------------
// Clicking
// ---------------------------------------------------------------------------

export function clickValue(state) {
  const d = getDerived(state);
  const t1 = (d.productCps.banana || 0) * d.staticGlobal * reachMult(state, d);
  return fin((BAL.CLICK_BASE + BAL.CLICK_T1_COUPLING * t1) * d.clickMult * hypeMult(state));
}

// ---------------------------------------------------------------------------
// Product costs (closed forms — no loops)
// ---------------------------------------------------------------------------

export function unitCost(p, count, d) {
  return p.baseCost * Math.pow(p.growth, count) * (d ? d.costMult : 1);
}

export function bulkCost(p, count, n, d) {
  const g = p.growth;
  return fin(p.baseCost * Math.pow(g, count) * (Math.pow(g, n) - 1) / (g - 1) * (d ? d.costMult : 1));
}

export function maxAffordable(p, count, cash, d) {
  const g = p.growth;
  const base = p.baseCost * Math.pow(g, count) * (d ? d.costMult : 1);
  if (cash < base) return 0;
  return Math.floor(Math.log((cash * (g - 1)) / base + 1) / Math.log(g));
}

// ---------------------------------------------------------------------------
// Ad economics
// ---------------------------------------------------------------------------

export function adFee(state) {
  return Math.max(BAL.AD_FEE_MIN, totalCps(state) * BAL.AD_FEE_SECONDS);
}

// Compute the odds bar for a pending ad. Returns
// { bands: [{id,label,emoji,pct,mult}], chaos, shifts: {wave,warm,product,rarity,boost,pity,upgrades} }
export function computeOdds(state, ad, boost) {
  const d = getDerived(state);
  const bands = OUTCOMES.map((o) => ({ ...o, pct: o.base }));
  const [flop, mid, hit, viral] = bands; // mega = bands[4]
  const hook = HOOKS_BY_ID[ad.hookId];
  const product = PRODUCTS_BY_ID[ad.productId];

  // Move `amt` points into `to`, drawn from FLOP then MID (with floors).
  const shift = (amt, to) => {
    const fromFlop = Math.min(amt, Math.max(0, flop.pct - 2));
    flop.pct -= fromFlop;
    const rest = amt - fromFlop;
    const fromMid = Math.min(rest, Math.max(0, mid.pct - 5));
    mid.pct -= fromMid;
    to.pct += fromFlop + fromMid;
    return fromFlop + fromMid;
  };

  const shifts = { wave: 0, warm: 0, product: 0, rarity: 0, boost: 0, pity: 0, upgrades: 0 };
  if (state.sim.waveTag && ad.tagId === state.sim.waveTag) {
    shifts.wave = shift(BAL.WAVE_SHIFT * (2 / 3), hit) + shift(BAL.WAVE_SHIFT / 3, viral);
  } else if (ad.tagId === state.sim.warmTag && state.story.unlocks.trends) {
    // No unexplained odds modifiers before the Trends desk exists.
    shifts.warm = shift(BAL.WARM_SHIFT * (2 / 3), hit) + shift(BAL.WARM_SHIFT / 3, viral);
  }
  if (product.tags.includes(ad.tagId)) {
    shifts.product = shift(BAL.PRODUCT_MATCH_SHIFT, hit);
  }
  const rarityRank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }[hook.rarity] || 0;
  if (rarityRank) shifts.rarity = shift(BAL.RARITY_VIRAL * rarityRank, viral);
  if (boost) shifts.boost = shift(BAL.BOOST_VIRAL, viral);
  if (d.viralChanceAdd) shifts.upgrades = shift(d.viralChanceAdd, viral);
  if (state.run.pity) shifts.pity = shift(BAL.PITY_VIRAL * state.run.pity, viral);

  // Total mismatch → eligible for the 5% chaos jackpot.
  const chaos = !product.tags.includes(ad.tagId)
    && !hook.tags.includes(ad.tagId)
    && !hook.tags.some((t) => product.tags.includes(t));

  return { bands, chaos, shifts };
}

// ---------------------------------------------------------------------------
// Leveling & prestige math
// ---------------------------------------------------------------------------

export function xpToNext(level) {
  return BAL.XP_BASE * Math.pow(BAL.XP_GROWTH, level - 1);
}

export function investorsFromLifetime(lifetime) {
  return Math.floor(Math.sqrt(lifetime / BAL.INVESTOR_DIVISOR));
}

// Preview of an exit right now: investors gained and the income multiplier
// ratio it produces (used for the "Exit now for ×2.84" line).
export function exitPreview(state) {
  const total = investorsFromLifetime(state.acct.lifetimeAllTime);
  const gained = Math.max(0, total - state.acct.investorsEarnedTotal);
  const now = 1 + BAL.INVESTOR_INCOME * state.acct.investors;
  const after = 1 + BAL.INVESTOR_INCOME * (state.acct.investors + gained);
  return { gained, ratio: after / now };
}

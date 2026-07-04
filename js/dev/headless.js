// Headless fast-forward harness. core/ + data/ never touch the DOM, Date.now
// or Math.random, so the whole game runs in Node. Bots act through the real
// actions.js verbs — the same code paths as a human player.

import { createInitialState } from '../core/state.js';
import { simTick } from '../core/sim.js';
import {
  BAL, getDerived, invalidate, totalCps, unitCost, bulkCost, exitPreview, rackSlots, adFee,
} from '../core/balance.js';
import {
  packOrder, postAd, buyProduct, buyUpgrade, upgradeAvailable, spinReels, launchAd,
  clickMoment, doExit, canExit, pickNiche, buyPerk, buyGuru,
} from '../core/actions.js';
import { ackAllStory } from '../core/story.js';
import { PRODUCTS } from '../data/products.js';
import { UPGRADES } from '../data/upgrades.js';
import { GURU_TREE } from '../data/prestige.js';

export function freshState() {
  const s = createInitialState(1700000000000);
  invalidate();
  return s;
}

// Buys the best-payback affordable product; buys upgrades; used by both bots.
// `reserve` models a human saving up the launch fee instead of compounding
// every cent into products (without it the bot wedges: a pending ad it can
// never afford, cash drained every cycle).
function buyPhase(state, reserve = 0) {
  const d = getDerived(state);
  const spendable = () => state.run.cash - reserve;
  // upgrades first (they're always high-value)
  for (const u of UPGRADES) {
    if (!state.run.upgrades[u.id] && upgradeAvailable(state, u) && spendable() >= u.cost) {
      buyUpgrade(state, u.id);
    }
  }
  // best marginal payback product, buy while affordable (few passes)
  for (let pass = 0; pass < 6; pass++) {
    let best = null;
    for (const p of PRODUCTS) {
      if (!state.run.unlocked[p.id]) continue;
      const count = state.run.products[p.id] || 0;
      const cost = unitCost(p, count, d);
      if (cost > spendable()) continue;
      const payback = cost / p.baseIncome; // rough: milestone mults help lower tiers anyway
      if (!best || payback < best.payback) best = { p, payback };
    }
    if (!best) break;
    if (!buyProduct(state, best.p.id, 1)) break;
  }
}

export const bots = {
  // Active player: ~3 clicks/sec, launches campaigns, catches moments, exits at ×2.5
  greedy(state) {
    ackAllStory(state); // bots read their DMs instantly (humans are ~2× slower overall)
    for (let i = 0; i < 15; i++) packOrder(state); // 15 clicks per 5s window
    if (state.story.unlocks.postad) postAd(state); // ~1 post per 5s window
    if (state.sim.momentActive) clickMoment(state);
    // campaigns BEFORE buys so the launch fee is still affordable
    if (state.run.energy >= 1 && !state.run.pendingAd) {
      spinReels(state, {});
    }
    if (state.run.pendingAd) {
      const un = state.story.unlocks;
      let platform = 'clikclok';
      const nextLocked = PRODUCTS.find((p) => !state.run.unlocked[p.id]);
      if (un.instaglam && nextLocked?.unlock?.followers && state.run.lifetimeCash >= 1000) platform = 'instaglam';
      if (platform === 'clikclok' && state.run.campaigns.length >= rackSlots(state)) {
        platform = un.facespace ? 'facespace' : null;
      }
      if (platform) launchAd(state, platform, state.run.hype >= 80);
    }
    // Save toward the next launch fee while an ad is staged or energy waits.
    const reserve = (state.run.pendingAd || state.run.energy >= 1) && state.story.unlocks.adstudio
      ? adFee(state) : 0;
    buyPhase(state, reserve);
    // perks: dump points into click power then energy
    if (state.acct.perkPoints > 0) {
      buyPerk(state, 'pk_click') || buyPerk(state, 'pk_energy') || buyPerk(state, 'pk_hypecap');
    }
    if (canExit(state) && exitPreview(state).ratio >= 2.5) {
      doExit(state);
      if (state.run.nicheChoices) pickNiche(state, state.run.nicheChoices[0]);
      // Spend investors on the tree the way players do: cheapest-first.
      for (const node of GURU_TREE) buyGuru(state, node.id);
    }
  },

  // Idle player: bootstraps with a few clicks (everyone clicks the big green
  // button at least once), then never clicks or launches again. Reads DMs —
  // every gating trigger must be reachable this way (idle-reachability rule).
  // Exits at a lower ratio than the greedy bot: slow progress makes any
  // meaningful multiplier worth taking.
  idle(state) {
    ackAllStory(state);
    if ((state.run.products.banana || 0) < 10) {
      for (let i = 0; i < 10; i++) packOrder(state);
    }
    buyPhase(state);
    if (canExit(state) && exitPreview(state).ratio >= 1.3) {
      doExit(state);
      if (state.run.nicheChoices) pickNiche(state, state.run.nicheChoices[0]);
      for (const node of GURU_TREE) buyGuru(state, node.id);
    }
  },

  none() {},
};

// Fast-forward `hours` of sim time; bot acts every 5 sim-seconds.
// onSample(state, minutes) is called once per sim-minute for reporting.
export function fastForward(state, hours, bot = bots.greedy, onSample = null) {
  const ticks = Math.round((hours * 3600 * 1000) / BAL.SIM_DT);
  const ticksPerBot = 5000 / BAL.SIM_DT;
  const ticksPerMin = 60000 / BAL.SIM_DT;
  for (let i = 0; i < ticks; i++) {
    simTick(state, BAL.SIM_DT);
    if (i % ticksPerBot === 0) bot(state);
    if (onSample && i % ticksPerMin === 0) onSample(state, i / ticksPerMin);
  }
  return snapshot(state);
}

export function snapshot(state) {
  return {
    minutes: state.sim.timeMs / 60000,
    cash: state.run.cash,
    lifetimeRun: state.run.lifetimeCash,
    lifetimeAll: state.acct.lifetimeAllTime,
    cps: totalCps(state),
    followers: state.run.followers,
    level: state.acct.level,
    exits: state.acct.exits,
    investors: state.acct.investors,
    maxTier: state.acct.stats.maxTierUnlocked,
    launches: state.acct.stats.totalLaunches,
    virals: state.acct.stats.viralHits,
    achievements: Object.keys(state.acct.achievements).length,
    upgradesOwned: Object.keys(state.run.upgrades).length,
    beatsAcked: Object.keys(state.story.acked).length,
  };
}
